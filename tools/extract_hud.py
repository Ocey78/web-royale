"""Rasterize original frame / HUD symbols only; never extract or distribute fonts."""
import sys,json,base64,zipfile,io,hashlib,argparse
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
from sc_codec import unpack,parse,textures
from extract_game_assets import trim
R=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser();p.add_argument('--apk',type=Path,required=True);a=p.parse_args()
 choices={'card-frame-normal':('5318',0),'card-frame-legendary':('5326',0),'card-frame-collection':('6644',0),'card-frame-selected':('5318',1),'battle-panel-blue':('panel_ingame_blue',1),'elixir-icon':('867',0),'hp-player-tower':('hp_player_tower_withNumber',0),'hp-enemy-tower':('hp_enemy_tower_withNumber',0),'hp-player-fill':('9736',0),'hp-enemy-fill':('9743',0),'level-crown':('9739',0),'emote-icon':('icon_emote',0)}
 with zipfile.ZipFile(a.apk) as z:
  raw=z.read('assets/sc/ui.sc');s=parse(unpack(raw));tex=textures(unpack(z.read('assets/sc/ui_tex.sc')))
  for symbol,frame in choices.values():
   if symbol.isdigit():s['exports'][symbol]=int(symbol)
  s=trim(s,set(x[0] for x in choices.values()));urls=[]
  for t in tex:
   im=Image.fromarray(t.pop('pixels'));out=io.BytesIO();im.save(out,'PNG');urls.append('data:image/png;base64,'+base64.b64encode(out.getvalue()).decode())
  s['textures']=[{k:v for k,v in t.items() if k!='pixels'} for t in tex]
 m=json.loads((R/'assets/ui/manifest.json').read_text())
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();page.set_content('<html><body></body></html>');page.add_script_tag(path=str(R/'src/native.js'))
  page.evaluate('''async ([s,urls])=>{const images=await Promise.all(urls.map(src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src})));window.sc=new RoyaleNative.Scene(s,images);}''',[s,urls])
  for k,(name,frame) in choices.items():
   res=page.evaluate('''([name,frame])=>{const fps=sc.clip(name)?.fps||60,t=frame/fps,r=sc.bounds(name,t),scale=2,cv=document.createElement('canvas');cv.width=Math.ceil(r.width*scale)+4;cv.height=Math.ceil(r.height*scale)+4;const c=cv.getContext('2d');c.translate(2-r.x*scale,2-r.y*scale);c.scale(scale,scale);sc.draw(c,name,t,{frame});return {png:cv.toDataURL(),bounds:r,width:cv.width,height:cv.height,frame,scale};}''',[name,frame])
   (R/'assets/ui'/f'{k}.png').write_bytes(base64.b64decode(res.pop('png').split(',')[1]));m[k]={'file':f'assets/ui/{k}.png','source':f'ui.sc#{name}','sourceSha256':hashlib.sha256(raw).hexdigest(),**res};print(k,res['width'],res['height'])
  b.close()
 (R/'assets/ui/manifest.json').write_text(json.dumps(m,indent=2))
if __name__=='__main__':main()
