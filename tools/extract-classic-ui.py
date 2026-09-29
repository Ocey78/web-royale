"""Rasterize original classic navigation, road and loading symbols. No font binaries distributed."""
from pathlib import Path
import sys,json,base64,hashlib,copy
from PIL import Image,ImageDraw
from playwright.sync_api import sync_playwright
from sc_codec import parse,unpack,textures
from extract_game_assets import trim
ROOT=Path(__file__).resolve().parents[1];SRC=Path(sys.argv[1]);OUT=ROOT/'assets/ui';OUT.mkdir(exist_ok=True)
choices={'classic-xp':('ui','xp_icon_anim'), 'classic-wood-chest':('ui','icon_chests_wooden_small'), 'classic-crown-chest':('ui','icon_chests_kings_small'), 'classic-crown':('ui','icon_crowns'), 'classic-tv':('ui','icon_menu_royaltv'), 'classic-team':('ui','icon_menu_team'), 'classic-road':('ui_trophy_road','tr_ribbon'), 'classic-arena-title':('ui_trophy_road','arena_title'), 'classic-loading':('loading','loading_bg'), 'classic-loading-bar':('loading','loading_bar_bloe'), 'classic-road-player':('ui_trophy_road','player_info'), 'classic-road-lock':('ui_trophy_road','icons_stats_lock')}
ids=['training','goblin','bone','barbarian','pekka','spell','builder','royal','frozen','jungle','hog','electro','spooky','rascals','serenity']
exports=[f'arena_{i:02}' for i in range(10)]+['arena_legendary','arena_electric','arena_spooky','arena_season','arena_lunar_season']
for k,e in zip(ids,exports):choices['classic-arena-'+k]=('ui_arena_icon_season_10','arena_heist_season') if k=='rascals' else ('ui_arena',e)
for i in range(1,11):choices['classic-league-'+str(i)]=('ui_arena',f'league_badge_{i:03}')
for i in range(1,5):choices['classic-road-'+str(i)]=('ui_trophy_road_milestones',f'__probe_{i}')
if '--minor' in sys.argv:choices={k:v for k,v in choices.items() if k=='classic-loading' or k.startswith('classic-arena-')}
manifest=json.loads((OUT/'manifest.json').read_text());report=[];scenes={}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page();page.set_content('<html><body></body></html>');page.add_script_tag(path=str(ROOT/'src/native.js'));page.evaluate('window.sc={}')
 for name in sorted({v[0] for v in choices.values()}):
  path=SRC/'sc'/(name+'.sc');data=parse(unpack(path.read_bytes()),pixels=True)
  if name=='ui_trophy_road_milestones':
   print('MILESTONE EXPORTS',list(data['exports']),flush=True)
   candidates=[e for e in data['exports'] if not any(k in e for k in ['shine','friend','lock','claim','glow'])]
   for i,e in enumerate(candidates): choices['classic-platform-'+str(i)]=(name,e)
  if name=='ui':
   if 'icon_menu_team' not in data['exports']: choices.pop('classic-team');print('No team export; retain existing friends artwork',flush=True)
  keep={v[1] for v in choices.values() if v[0]==name and v[1] in data['exports']}
  data=trim(data,keep)
  tp=path;ts=data['textures']
  if 26 in data['flags']:
   tp=next(p for suffix in ['_highres_tex','_tex','_lowres_tex'] if (p:=SRC/'sc'/(name+suffix+'.sc')).exists());ts=textures(unpack(tp.read_bytes()))
  used=sorted({ch['texture'] for shapes in data['shapes'].values() for ch in shapes});urls=[];texmeta=[];mapping={n:i for i,n in enumerate(used)}
  for shapes in data['shapes'].values():
   for ch in shapes:ch['texture']=mapping[ch['texture']]
  for n in used:
   t=ts[n];im=Image.fromarray(t.pop('pixels'));import io
   bio=io.BytesIO();im.save(bio,'WEBP',lossless=True,method=4);urls.append('data:image/webp;base64,'+base64.b64encode(bio.getvalue()).decode());texmeta.append({k:v for k,v in t.items() if k!='pixels'})
  data['textures']=texmeta
  if name in ['ui_arena','ui_arena_icon_season_10']:
   base=ROOT/'assets/presentation';base.mkdir(exist_ok=True)
   for i,(t,url) in enumerate(zip(data['textures'],urls)):
    file=f'home-{name}-{i}.webp';(base/file).write_bytes(base64.b64decode(url.split(',')[1]));t['file']='assets/presentation/'+file
   (base/(name+'-home.json')).write_text(json.dumps(data,separators=(',',':')))
  page.evaluate('''async ([name,data,urls])=>{const images=await Promise.all(urls.map(src=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=no;im.src=src})));sc[name]=new RoyaleNative.Scene(data,images)}''',[name,data,urls])
  scenes[name]=data
  for key,(sn,ex) in list(choices.items()):
   if sn!=name or ex not in data['exports']:continue
   result=page.evaluate('''([scene,name])=>{const s=sc[scene],r=s.bounds(name,0),scale=Math.min(2,1600/Math.max(1,r.width),1800/Math.max(1,r.height));const cv=document.createElement('canvas');cv.width=Math.ceil(r.width*scale)+4;cv.height=Math.ceil(r.height*scale)+4;const c=cv.getContext('2d');c.translate(2-r.x*scale,2-r.y*scale);c.scale(scale,scale);s.draw(c,name,0,{frame:0,instances:name==='loading_bg'?Object.fromEntries(['logo_KR','logo_JP','logo_CN_Traditional','logo_CN_Simplied'].map(k=>[k,{visible:false}])):{}});return {uri:cv.toDataURL('image/png'),bounds:r,width:cv.width,height:cv.height,scale}}''',[name,ex])
   raw=base64.b64decode(result.pop('uri').split(',')[1]);im=Image.open(__import__('io').BytesIO(raw));file=key+'.webp';im.save(OUT/file,'WEBP',lossless=True,method=4)
   manifest[key]={'file':'assets/ui/'+file,'source':f'sc/{name}.sc#{ex}',**result};report.append({'key':key,'source':manifest[key]['source'],'width':im.width,'height':im.height});print(key,im.size,flush=True)
 browser.close()
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2));(ROOT/'docs/qa/v090/classic-ui-extraction.json').write_text(json.dumps(report,indent=2))
keys=[r['key'] for r in report];sheet=Image.new('RGB',(1000,((len(keys)+4)//5)*180),'#445267');dr=ImageDraw.Draw(sheet)
for i,k in enumerate(keys):
 im=Image.open(ROOT/manifest[k]['file']).convert('RGBA');im.thumbnail((190,150));x=(i%5)*200+(200-im.width)//2;y=(i//5)*180;sheet.paste(im,(x,y),im);dr.text(((i%5)*200+3,y+152),k,fill='white')
sheet.save('/mnt/data/qa-v090/classic-assets.jpg')
print('COMPLETE',len(report),flush=True)
