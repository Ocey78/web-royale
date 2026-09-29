"""Render actual reward icons from the uploaded APK, never from screenshots.
Uses original selected SC exports and decoded source atlases; no font programs.
"""
import json,base64,zipfile,argparse
from pathlib import Path
from PIL import Image
from io import BytesIO
from playwright.sync_api import sync_playwright
from sc_codec import parse,unpack
from extract_game_assets import trim
R=Path(__file__).resolve().parents[1]
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--apk',required=True);args=ap.parse_args()
 m=json.loads((R/'assets/ui/manifest.json').read_text());native=json.loads((R/'assets/native/data.json').read_text())
 choices={}
 for rarity in ['common','rare','epic','legendary']:
  choices['road-token-'+rarity]=('ui','token_'+rarity)
  choices['road-wild-'+rarity]=('ui_spells','icon_consumable_wildcard_'+rarity+'_hires')
 for name in ['giant','epic','legendary','legendarykings','lightning']:
  choices['road-chest-'+name]=('ui','icon_chests_'+name+'_small')
 with zipfile.ZipFile(args.apk) as apk,sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page();page.set_content('<html><body></body></html>');page.add_script_tag(path=str(R/'src/native.js'));page.evaluate('window.rewardScenes={}')
  for name in ['ui','ui_spells']:
   data=parse(unpack(apk.read('assets/sc/'+name+'.sc')));data=trim(data,{export for scene,export in choices.values() if scene==name});data['textures']=native['scenes'][name]['textures']
   images=['data:image/webp;base64,'+base64.b64encode((R/'assets/native'/t['file']).read_bytes()).decode() for t in data['textures']]
   page.evaluate('''async ([name,data,urls])=>{const images=await Promise.all(urls.map(src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src})));rewardScenes[name]=new RoyaleNative.Scene(data,images)}''',[name,data,images])
  for key,(scene,export) in choices.items():
   result=page.evaluate('''([name,exportName])=>{const s=rewardScenes[name];if(s.id(exportName)===undefined)throw Error(exportName);const b=s.bounds(exportName),scale=Math.min(2,250/b.width,280/b.height),c=document.createElement('canvas');c.width=Math.ceil(b.width*scale)+8;c.height=Math.ceil(b.height*scale)+8;const ctx=c.getContext('2d');ctx.scale(scale,scale);ctx.translate(-b.x+4/scale,-b.y+4/scale);s.draw(ctx,exportName,0,{frame:0});return {png:c.toDataURL('image/png'),bounds:b}}''',[scene,export])
   im=Image.open(BytesIO(base64.b64decode(result['png'].split(',')[1]))).convert('RGBA');box=im.getchannel('A').point(lambda a:255 if a>25 else 0).getbbox()
   if not box:raise ValueError('Empty reward export: '+export)
   im=im.crop(box);file='assets/ui/'+key+'.webp';im.save(R/file,'WEBP',lossless=True)
   m[key]={'file':file,'source':'sc/'+scene+'.sc#'+export,'width':im.width,'height':im.height,'processing':'Original timeline frame 0, transparent export margin trimmed'}
   print(key,im.size,flush=True)
  browser.close()
 (R/'assets/ui/manifest.json').write_text(json.dumps(m,indent=2)+'\n')
if __name__=='__main__':main()
