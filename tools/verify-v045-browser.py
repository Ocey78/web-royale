"""Exercise the generated v0.44.1 UI and native Canvas renderers.

Requires Python 3.10+, Playwright, and a Chromium executable. Uses a file-backed
asset fixture on about:blank; it does not test HTTP navigation, Service Workers,
or persistent browser storage across processes. Those paths have Node tests.
Run: python tools/verify-v045-browser.py --browser /path/to/chromium
"""
from pathlib import Path
import argparse
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser', help='Chromium executable; otherwise Playwright uses its installed Chromium')
parser.add_argument('--dist', type=Path, default=Path(__file__).resolve().parents[1] / 'dist')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'docs/verification-v045/browser')
parser.add_argument('--phase',choices=['ui','combat','repeat','all'],default='all')
args = parser.parse_args()
import base64,json,mimetypes,re,time,traceback
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
ROOT=args.dist.resolve()
release=json.loads((ROOT/'release.json').read_text())
ART=args.output.resolve();ART.mkdir(exist_ok=True,parents=True)


def local_asset(url):
 path=unquote(urlparse(url).path).lstrip('/')
 if path.startswith('qa/'): path=path[3:]
 file=(ROOT/path).resolve()
 if not file.is_relative_to(ROOT) or not file.is_file():return {'status':404,'data':'','type':'text/plain'}
 return {'status':200,'data':base64.b64encode(file.read_bytes()).decode(),'type':mimetypes.guess_type(file.name)[0] or 'application/octet-stream'}

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=args.browser,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1280,'height':1040},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)+'\n'+(e.stack or '')))
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
 results=[]
 def check(name,condition):
  assert condition,name
  results.append(name);print('PASS',name,flush=True)
 def shot(name):page.screenshot(path=str(ART/(name+'.png')))
 def close():page.keyboard.press('Escape')

 def layout_shots(prefix,selector):
  for width,height in [(1280,1040),(390,844),(320,568)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(350);shot(prefix+'-'+str(width))
   check(prefix+' remains within screen '+str(width),page.locator(selector).evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1}'))
 def settings():
  if not page.locator('[data-action=potato-toggle]').is_visible():
   page.evaluate("RoyaleDemo.show('home');document.querySelector('#home [data-action=menu]').click()")
   page.locator('[data-action=settings]').click()
 def run_mode(mode):
  page.evaluate("async mode=>{await RoyaleDemo.startBattle(mode,false,{queue:'challenge',seed:7371});if(RoyaleDemo.battle)RoyaleDemo.battle.paused=true;}",mode)
  page.wait_for_function('RoyaleDemo.battle && !RoyaleDemo.preparing',timeout=90000)
  check(mode+' loaded real battle',page.evaluate('RoyaleDemo.battle.mode')==mode)
  page.wait_for_timeout(2000)
  print('MEMORY',mode,page.context.new_cdp_session(page).send('Runtime.getHeapUsage'),flush=True)

 try:
  page.wait_for_function("window.RoyaleDemo && document.getElementById('loading').classList.contains('hidden')",timeout=180000)
  check('v0.45.0 boot',page.evaluate('RoyaleBundle.version')=='0.45.0')
  page.evaluate("()=>{const C=RoyaleCore,p=RoyaleDemo.profile;p.trophies=p.highestTrophies=6500;p.unlockedCards=C.CARDS.map(c=>c.id);p.gold=100000;p.gems=20000;RoyaleDemo.applyProfile(p)}")
  page.set_viewport_size({'width':390,'height':844})
  page.evaluate("RoyaleDemo.show('events')");page.wait_for_timeout(350);shot('custom-modes-390')
  check('Custom Modes grouped into sections',page.locator('.mode-group').count()>=4)
  cases=[
   ('TeamRumble','TeamRumbleArcReverse','rumble-reverse'),
   ('TeamRumble','TeamRumbleRiverLine','rumble-four-bridges'),
   ('Team3v3','Team3v3Jungle','3v3-jungle'),
   ('Team3v3','Team3v3Volcano','3v3-volcano'),
   ('BridgeBattle','BridgeBattleLava','bridge-lava'),
   ('BridgeBattle','BridgeBattleGarden','bridge-garden'),
   ('Touchdown','Touchdown','touchdown'),
   ('Touchdown3v3','Touchdown3v3','touchdown-3v3'),
   ('FreeForAll','FreeForAll','ffa')]
  if args.phase=='ui':cases=cases[:4]
  elif args.phase=='combat':cases=cases[4:8]
  elif args.phase=='repeat':cases=cases[8:]
  for mode,arena,name in cases:
   page.evaluate("async ([mode,arena])=>{await RoyaleDemo.startBattle(mode,false,{queue:'challenge',seed:45045,arenaId:arena});if(RoyaleDemo.battle)RoyaleDemo.battle.paused=true;}",[mode,arena])
   page.wait_for_function("()=>RoyaleDemo.battle && !RoyaleDemo.preparing",timeout=90000)
   check(name+' uses requested geometry',page.evaluate('RoyaleDemo.battle.arenaLayout.id')==arena)
   page.wait_for_timeout(300)
   shot(name+'-390')
   check(name+' canvas fits phone',page.locator('#battleCanvas').evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1}'))
  if args.phase in ('repeat','all'):
   page.evaluate("RoyaleDemo.show('home');RoyaleDemo.profile.trophies=6500;RoyaleDemo.profile.highestTrophies=6500;RoyaleDemo.applyProfile(RoyaleDemo.profile)")
   page.locator('#home [data-action=road]').first.click();page.wait_for_timeout(250)
   check('Trophy Road shows league after Serenity Peak',page.locator('#roadProgress').inner_text().find('Challenger')>=0)
  check('No browser exceptions',not errors)
 finally:
  (ART/'report.json').write_text(json.dumps({'version':release['version'],'passed':len(results),'checks':results,'errors':errors},indent=2))
  browser.close()
