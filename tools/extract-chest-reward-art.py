"""Render transparent currency components from the supplied historical APK.

Requires Pillow, NumPy, Node and Playwright (NODE_PATH may identify the bundled
runtime). Original SC polygon UVs restore atlas orientation; no screenshot,
background removal, repainting or replacement illustration is used.
"""
from pathlib import Path
from zipfile import ZipFile
import argparse, base64, hashlib, json, os, shutil, subprocess, tempfile
from PIL import Image
from sc_codec import parse, unpack, textures
from extract_game_assets import trim

ROOT = Path(__file__).resolve().parents[1]
CHOICES = {
    "chest-reward-gold": {"scene": "ui_chest", "shape": 883,
        "sourceComponent": "war_win_pouch_open[1427]/clip[1426]/shape[883]",
        "scale": 5 / 7},
    "chest-reward-gems": {"scene": "ui", "export": "icon_gems",
        "sourceComponent": "icon_gems[448]/shape[403]", "scale": 2},
}
RENDER = r"""
const fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{const page=await browser.newPage();await page.addScriptTag({path:input.renderer});
const result=await page.evaluate(async input=>{
 const images=await Promise.all(input.images.map(src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;})));
 const scene=new RoyaleNative.Scene(input.scene,images),bounds=scene.bounds(input.export,0),scale=input.scale;
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(bounds.width*scale)+4;canvas.height=Math.ceil(bounds.height*scale)+4;
 const c=canvas.getContext('2d');c.translate(2-bounds.x*scale,2-bounds.y*scale);c.scale(scale,scale);scene.draw(c,input.export,0,{frame:0});
 return{uri:canvas.toDataURL('image/png'),bounds,width:canvas.width,height:canvas.height,scale};
},input);
fs.writeFileSync(input.output,Buffer.from(result.uri.split(',')[1],'base64'));delete result.uri;
process.stdout.write(JSON.stringify(result));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
"""

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    p = argparse.ArgumentParser()
    p.add_argument("apk", type=Path)
    args = p.parse_args()
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node runtime is required")
    output = ROOT / "assets/ui"
    manifest_path = output / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    report = {}
    with ZipFile(args.apk) as archive, tempfile.TemporaryDirectory(prefix="royale-currency-") as temp:
        temp = Path(temp)
        script = temp / "render.cjs"
        script.write_text(RENDER, encoding="utf-8")
        for key, choice in CHOICES.items():
            name = choice["scene"]
            source = f"assets/sc/{name}.sc"
            texture_source = f"assets/sc/{name}_tex.sc"
            source_bytes, texture_bytes = archive.read(source), archive.read(texture_source)
            scene = parse(unpack(source_bytes))
            export = choice.get("export", "__currency_component")
            if "shape" in choice:
                scene["exports"][export] = choice["shape"]
            scene = trim(scene, {export})
            used = sorted({shape["texture"] for shapes in scene["shapes"].values() for shape in shapes})
            original_textures = textures(unpack(texture_bytes))
            images, metadata = [], []
            for index in used:
                texture = original_textures[index]
                image_path = temp / f"{name}-{index}.png"
                Image.fromarray(texture["pixels"]).save(image_path)
                images.append("data:image/png;base64," + base64.b64encode(image_path.read_bytes()).decode())
                metadata.append({k: v for k, v in texture.items() if k != "pixels"})
            for shapes in scene["shapes"].values():
                for shape in shapes:
                    shape["texture"] = used.index(shape["texture"])
            scene["textures"] = metadata
            file = output / f"{key}.png"
            task = {"renderer": str(ROOT / "src/native.js"), "scene": scene, "images": images,
                    "export": export, "scale": choice["scale"], "output": str(file)}
            input_path = temp / "input.json"
            input_path.write_text(json.dumps(task), encoding="utf-8")
            rendered = json.loads(subprocess.check_output([node, str(script), str(input_path)], env=os.environ, text=True))
            im = Image.open(file).convert("RGBA")
            alpha = im.getchannel("A")
            if alpha.getextrema() != (0, 255):
                raise RuntimeError(f"{key}: expected opaque art and transparent canvas")
            record = {"file": f"assets/ui/{file.name}", "source": f"{source}#{choice['sourceComponent']}",
                      "sourceSha256": digest(source_bytes), "textureSource": texture_source,
                      "textureSha256": digest(texture_bytes), "sha256": digest(file.read_bytes()),
                      "sourceAtlasIndices": used, "render": "original polygon UVs and scene coordinates, transparent canvas", **rendered}
            manifest[key] = record
            report[key] = record
            print(f"{key}: {im.width}x{im.height}")
    manifest_path.write_text(json.dumps(manifest, separators=(",", ":")) + "\n", encoding="utf-8")
    (ROOT / "docs/recovery/chest-reward-art.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
