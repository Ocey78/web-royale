"""Exercise the generated v0.36.0 UI and native Canvas renderers.

Requires Python 3.10+, Playwright, and a Chromium executable. Uses a file-backed
asset fixture on about:blank; it does not test HTTP navigation, Service Workers,
or persistent browser storage across processes. Those paths have Node tests.
Run: python tools/verify-v036-browser.py --browser /path/to/chromium
"""
from pathlib import Path
import argparse
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser', help='Chromium executable; otherwise Playwright uses its installed Chromium')
parser.add_argument('--dist', type=Path, default=Path(__file__).resolve().parents[1] / 'dist')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'docs/verification-v036')
args = parser.parse_args()
import base64,json,mimetypes,re,time,traceback
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
ROOT=args.dist.resolve()
release=json.loads((ROOT/'release.json').read_text())
ART=args.output.resolve();ART.mkdir(exist_ok=True,parents=True)
BASELINE=Path(__file__).resolve().parents[1] / 'tests/fixtures/v035'

def local_asset(url):
 path=unquote(urlparse(url).path).lstrip('/')
 if path.startswith('qa/'): path=path[3:]
 file=(ROOT/path).resolve()
 if not file.is_relative_to(ROOT) or not file.is_file():return {'status':404,'data':'','type':'text/plain'}
 return {'status':200,'data':base64.b64encode(file.read_bytes()).decode(),'type':mimetypes.guess_type(file.name)[0] or 'application/octet-stream'}

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=args.browser,headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1280,'height':1040},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.expose_function('__localAsset',local_asset)
 html=(ROOT/'index.html').read_text()
 html=re.sub(r'<script\b[^>]*>.*?</script>','',html,flags=re.S)
 html=re.sub(r'<link\b[^>]*rel="stylesheet"[^>]*>','',html)
 html=html.replace('<head>','<head><base href="http://localhost/qa/">')
 page.set_content(html)
 page.evaluate('''() => {
 const nativeFetch=window.fetch, blobs=new Map();window.__assetBlob=async value=>{if(value.startsWith('data:')||value.startsWith('blob:'))return value;const url=new URL(value,document.baseURI).href;if(!blobs.has(url))blobs.set(url,(async()=>{const r=await __localAsset(url);if(r.status!==200)throw Error('Missing local fixture asset: '+url);const bytes=Uint8Array.from(atob(r.data),c=>c.charCodeAt(0));return URL.createObjectURL(new Blob([bytes],{type:r.type}));})());return blobs.get(url);};
 window.fetch=async (input,options)=>{const url=new URL(String(input),document.baseURI).href;if(url.startsWith('blob:')||url.startsWith('data:'))return nativeFetch(input,options);const r=await __localAsset(url);return new Response(Uint8Array.from(atob(r.data),c=>c.charCodeAt(0)),{status:r.status,headers:{'Content-Type':r.type}});};
 const src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{get:src.get,set(value){const token=this.__fixtureToken=(this.__fixtureToken||0)+1;if(String(value).startsWith('blob:')||String(value).startsWith('data:')){src.set.call(this,value);return;}__assetBlob(String(value)).then(url=>{if(this.__fixtureToken===token)src.set.call(this,url);}).catch(()=>this.onerror?.());}});
 // Only the transport/origin is replaced in this offline DOM/Canvas fixture.
 // Product code, native artwork and simulation are the generated release files.
 const values=new Map();window.__savedProfileValues=values;Object.defineProperty(window,'localStorage',{value:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),clear:()=>values.clear()}});
 }''')
 css=(ROOT/release['styles']).read_text()
 # CSS references are local fixtures too. Most artwork uses the runtime UI map.
 for match in set(re.findall(r'url\([\'\"]?([^\)\'\"]+)',css)):
  if match.startswith(('data:','blob:','var(')):continue
  asset=local_asset('http://localhost/qa/'+match)
  if asset['status']==200:css=css.replace(match,'data:'+asset['type']+';base64,'+asset['data'])
 page.add_style_tag(content=css)
 runtime=json.loads((ROOT/release['runtime']).read_text());runtime.pop('preload',None)
 page.evaluate('(data)=>{window.RoyaleBundle=data;window.RoyaleGameData=data.game;}',runtime)
 print('runtime loaded',flush=True)
 page.evaluate('''async()=>{const entries=Object.entries(RoyaleBundle.uiImages);let next=0;await Promise.all(Array.from({length:8},async()=>{while(next<entries.length){const [key,value]=entries[next++];RoyaleBundle.uiImages[key]=await __assetBlob(value);}}));}''')
 print('UI artwork loaded',flush=True)
 page.add_script_tag(content=(ROOT/release['app']).read_text())
 try:
  page.wait_for_function("window.RoyaleDemo && document.getElementById('loading').classList.contains('hidden')",timeout=90000)
  print('home ready',flush=True)
  results=[]
  def check(name,condition):
   assert condition,name
   results.append(name);print('PASS',name,flush=True)
  check('release is v0.36.0',page.evaluate('RoyaleBundle.version')=='0.36.0')
  # View actual user interface after migrated/earned state.
  page.evaluate('RoyaleDemo.applyProfile({...RoyaleDemo.profile,winStreak:2,earnedCrowns:10,crownChestClaimed:0,crownChestAt:Date.now()+999999,freeChestAt:Date.now()+600000})')
  check('streak hidden at two wins',page.locator('#homeWinStreak').is_hidden())
  check('crown chest Ready! without cooldown',page.locator('#crownChestLabel').inner_text().strip()=='Ready!')
  page.evaluate('RoyaleDemo.applyProfile({...RoyaleDemo.profile,winStreak:3})')
  check('streak nested under trophies',page.locator('.home-trophies #homeWinStreak').count()==1 and page.locator('#homeWinStreak').is_visible())
  page.screenshot(path=str(ART/'home-desktop.png'))
  page.evaluate("document.querySelector('[data-action=\"settings\"]')?.click() || document.querySelector('[data-action=\"menu\"]')?.click()")
  if page.locator('[data-graphics]').count()!=4:
   page.locator('#modalPanel [data-action="settings"]').click()
  check('all four graphics selectors present',page.locator('[data-graphics]').count()==4)
  for key,val in [('textures','low'),('animations','med'),('particles','spells-only'),('arenaBackgrounds','low')]:page.locator('[data-graphics="'+key+'"]').select_option(val)
  check('selectors apply rendering policy immediately',page.evaluate("RoyaleGraphics.current.textures==='low' && RoyaleGraphics.current.particles==='spells-only' && !RoyaleGraphics.current.arenaAnimated"))
  check('graphics options saved in profile repository',page.evaluate("JSON.parse(localStorage.getItem('web-royale-classic-v4')).graphics.animations==='med'"))
  page.locator('.graphics-settings').scroll_into_view_if_needed();page.screenshot(path=str(ART/'settings-desktop.png'))
  page.keyboard.press('Escape')
  page.evaluate("RoyaleDemo.show('shop')")
  check('Hour Shop keeps twelve slots',page.locator('.shop-deals-section').first.locator('.shop-offer').count()==12)
  check('Lightning Shop has three slots',page.locator('#lightningShop .shop-offer').count()==3)
  check('Lightning Shop countdown includes seconds',bool(re.match(r'^\d{2}:\d{2}:\d{2}$',page.locator('#lightningRefresh').inner_text().strip())))
  page.locator('#lightningShop').scroll_into_view_if_needed();page.screenshot(path=str(ART/'lightning-shop-desktop.png'))
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(200)
  page.screenshot(path=str(ART/'lightning-shop-mobile.png'))
  check('three Lightning Shop columns remain within the viewport',page.evaluate("Array.from(document.querySelectorAll('#lightningShop .shop-offer')).every(el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1;})"))
  page.set_viewport_size({'width':1280,'height':1040});page.evaluate("RoyaleDemo.show('home');RoyaleDemo.applyProfile({...RoyaleDemo.profile,graphics:RoyaleGraphics.DEFAULTS})")
  print('starting battle',flush=True)
  page.evaluate('async()=>{await RoyaleDemo.startBattle();RoyaleDemo.battle.paused=true;RoyaleDemo.battle.ai=false;}')
  check('battle hand has four level labels',page.locator('#hand .hand-level').count()==4)
  # Two separate deployments, damage-one, then survivor fallback.
  result=page.evaluate('''async()=>{const b=RoyaleDemo.battle;await RoyaleDemo.native.ensureScenes(RoyaleNative.sceneDependencies(RoyaleBundle.native,RoyaleCore.DATA,[['goblins','skeletons','fireball']],RoyaleDemo.profile.arena));b.units=[];b.effects=[];b.projectiles=[];b.cast(RoyaleCore.cardAt('goblins'),0,160,420);b.cast(RoyaleCore.cardAt('goblins'),1,310,230);b.paused=false;for(let i=0;i<100;i++)b.step(1/60);b.paused=true;document.getElementById('opening').hidden=true;const plan=RoyaleLevelLabels.plan(b.units);return {groups:plan.groups.length,individual:plan.individual.size};}''')
  check('two separate untouched three-troop deployments have two group badges',result['groups']==2 and result['individual']==0)
  page.wait_for_timeout(250);page.screenshot(path=str(ART/'battle-groups-desktop.png'))
  result=page.evaluate('''()=>{const b=RoyaleDemo.battle,u=b.units[0];u.lastDamagedAt=b.time;u.hp-=10;let p=RoyaleLevelLabels.plan(b.units);const a=p.individual.has(u.id)&&p.groups.length===2; b.units[1].hp=0;p=RoyaleLevelLabels.plan(b.units);return {damage:a,lastTwo:p.individual.has(b.units[0].id)&&p.individual.has(b.units[2].id)};}''')
  check('damaged member gets its own level and two survivors are individual',result['damage'] and result['lastTwo'])
  page.wait_for_timeout(200);page.screenshot(path=str(ART/'battle-damaged-desktop.png'))
  # Real browser Canvas performance: identical original source effects and output size.
  performance_report=page.evaluate('''async args=>{
   const NewN=RoyaleNative,NewFX=RoyaleFX;eval(args.native);const OldN=RoyaleNative;globalThis.RoyaleNative=NewN;eval(args.fx);const OldFX=RoyaleFX;globalThis.RoyaleFX=NewFX;
   const original=CanvasRenderingContext2D.prototype.getImageData;let readbacks=0,pixels=0;CanvasRenderingContext2D.prototype.getImageData=function(x,y,w,h,...rest){readbacks++;pixels+=w*h;return original.call(this,x,y,w,h,...rest);};
   try{const records=[];
    for(const kind of ['baseline','updated-cold','updated-prewarmed']){const NN=kind==='baseline'?OldN:NewN,FF=kind==='baseline'?OldFX:NewFX,library={scenes:{}};for(const [name,scene] of Object.entries(RoyaleDemo.native.scenes))library.scenes[name]=new NN.Scene(scene.data,scene.images);
     const renderer=new FF.Renderer(RoyaleBundle.fx,library),cv=document.createElement('canvas');cv.width=1080;cv.height=1920;const c=cv.getContext('2d');c.scale(2,2);if(kind==='updated-prewarmed')await renderer.prewarmFireball();readbacks=0;pixels=0;const frames=[];
     for(let i=0;i<60;i++){c.clearRect(0,0,540,960);renderer.begin();const begin=performance.now();renderer.effect(c,'Fireball_explosion',240,350,i/30,0,{phase:'ground',seed:'qa-fireball',life:3});renderer.effect(c,'Fireball_explosion',240,350,i/30,0,{phase:'above',seed:'qa-fireball',life:3});original.call(c,0,0,1,1);frames.push(performance.now()-begin);}
     frames.sort((a,b)=>a-b);records.push({kind,readbacks,pixels,meanMs:frames.reduce((a,b)=>a+b,0)/60,p95Ms:frames[57],maxMs:frames[59],sprites:renderer.summary().sprites});
    }return {method:'Chromium software/headless Canvas 2D, 1080x1920, 60 single-Fireball impact frames at t=i/30. One pixel read flush per frame, excluded from readback counts. Rendering timings are an isolated workload, not whole-game FPS.',records};
   }finally{CanvasRenderingContext2D.prototype.getImageData=original;globalThis.RoyaleNative=NewN;globalThis.RoyaleFX=NewFX;}
  }''',{'native':(BASELINE/'native.cjs').read_text(),'fx':(BASELINE/'fx.cjs').read_text()})
  (ART/'fireball-performance.json').write_text(json.dumps(performance_report,indent=2));print(json.dumps(performance_report,indent=2),flush=True)
  check('Fireball pixel-readback work reduced',performance_report['records'][1]['readbacks']<performance_report['records'][0]['readbacks'])
  check('no uncaught page errors',not errors)
  report={'fixture':'Chromium DOM/Canvas with local file-backed assets on about:blank; HTTP transport and Service Worker tested separately. Desktop 1280x1040, emulated mobile viewport 390x844. Not a physical device/Windows run.','checks':results,'errors':errors}
  (ART/'browser-qa.json').write_text(json.dumps(report,indent=2))
  print(json.dumps(report,indent=2),flush=True)
 except Exception:
  print('ERRORS',errors,flush=True);print('PAGE',page.locator('#loadMessage').inner_text(),flush=True);page.screenshot(path=str(ART/'qa-failure.png'));traceback.print_exc();raise
 finally:browser.close()
