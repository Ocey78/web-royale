"""Import original chest timelines from a supplied APK; never download replacements."""
from pathlib import Path
import argparse, hashlib, json, zipfile
from PIL import Image
from sc_codec import unpack, parse, textures
from extract_game_assets import trim

ROOT = Path(__file__).resolve().parents[1]
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apk', type=Path, required=True)
    args = parser.parse_args()
    with zipfile.ZipFile(args.apk) as archive:
        raw = archive.read('assets/sc/ui_chest.sc')
        texraw = archive.read('assets/sc/ui_chest_tex.sc')
    data = parse(unpack(raw))
    keep = [n for n in data['exports'] if n.startswith(('chest_open_', 'card_rotate_', 'card_reveal_'))]
    keep += ['chest_gold_open','chest_iron_open','chest_magical_open','chest_legendary_open','chest_epic_open','chest_giant_open','Chest_wood','chest_star_closed','Chest_gold','Chest_iron','Chest_magical','chest_legendary_closed','chest_epic_closed','chest_giant_closed']
    data = trim(data, keep)
    data['textures'] = textures(unpack(texraw))
    for i, tex in enumerate(data['textures']):
        name = f'chest-opening-{i}.webp'
        Image.fromarray(tex.pop('pixels')).save(ROOT/'assets/native'/name,lossless=True,method=6)
        tex['file'] = name
    data['source'] = {'scene':'assets/sc/ui_chest.sc','sha256':hashlib.sha256(raw).hexdigest(),'texture':'assets/sc/ui_chest_tex.sc','textureSha256':hashlib.sha256(texraw).hexdigest()}
    dest=ROOT/'assets/chests';dest.mkdir(exist_ok=True)
    (dest/'scene.json').write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
    report={**data['source'],'exports':{n:{'frames':len(data['clips'][str(i)]['frames']),'fps':data['clips'][str(i)]['fps'],'labels':{v:k for k,v in enumerate(data['clips'][str(i)]['labels']) if v}} for n,i in data['exports'].items()},'textures':[t['file'] for t in data['textures']]}
    (dest/'provenance.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(f"Imported {len(data['exports'])} original chest/reveal exports, {len(data['textures'])} textures.")
if __name__=='__main__':main()
