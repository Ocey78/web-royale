"""Original Trophy Road emote icons, resolved by the two source CSV indices."""
import json,zipfile,base64,argparse
from pathlib import Path
from io import BytesIO
from PIL import Image
from playwright.sync_api import sync_playwright
from sc_codec import unpack,parse,textures
from extract_game_assets import trim
R=Path(__file__).resolve().parents[1]
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--graphics',required=True);args=ap.parse_args()
 choices={'Emote58':('emotes_crl_01_dl','icon3'),'Emote71':('emotes_royal_ghost_01_dl','icon4')};manifest=json.loads((R/'assets/ui/manifest.json').read_text())
 with zipfile.ZipFile(args.graphics) as z,sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page();page.set_content('<html><body></body></html>');page.add_script_tag(path=str(R/'src/native.js'))
  for key,(name,export) in choices.items():
   raw=z.read('CR-3.5.0-Graphics/sc/'+name+'.sc');d=parse(unpack(raw),pixels=True);d=trim(d,{export});imgs=[]
   for t in d['textures']:
    im=Image.fromarray(t.pop('pixels'));out=BytesIO();im.save(out,'PNG');imgs.append('data:image/png;base64,'+base64.b64encode(out.getvalue()).decode())
   result=page.evaluate('''async([data,urls,exp])=>{const images=await Promise.all(urls.map(src=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=no;im.src=src})));const sc=new RoyaleNative.Scene(data,images),r=sc.bounds(exp),scale=2,c=document.createElement('canvas');c.width=Math.ceil(r.width*scale)+4;c.height=Math.ceil(r.height*scale)+4;const x=c.getContext('2d');x.scale(scale,scale);x.translate(-r.x+1,-r.y+1);sc.draw(x,exp,0,{frame:0});return c.toDataURL('image/png')}''',[d,imgs,export])
   im=Image.open(BytesIO(base64.b64decode(result.split(',')[1]))).convert('RGBA');box=im.getbbox()
   if not box:raise ValueError('Empty emote '+key)
   im=im.crop(box);file='assets/ui/emote-'+key+'.webp';im.save(R/file,'WEBP',lossless=True)
   manifest['emote-'+key]={'file':file,'source':'sc/'+name+'.sc#'+export,'width':im.width,'height':im.height};print(key,im.size)
  browser.close()
 (R/'assets/ui/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
if __name__=='__main__':main()
