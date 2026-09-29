"""Exercise the generated v0.42.0 UI and native Canvas renderers.

Requires Python 3.10+, Playwright, and a Chromium executable. Uses a file-backed
asset fixture on about:blank; it does not test HTTP navigation, Service Workers,
or persistent browser storage across processes. Those paths have Node tests.
Run: python tools/verify-v042-browser.py --browser /path/to/chromium
"""
from pathlib import Path
import argparse
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser', help='Chromium executable; otherwise Playwright uses its installed Chromium')
parser.add_argument('--dist', type=Path, default=Path(__file__).resolve().parents[1] / 'dist')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'docs/verification-v042/touch')
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
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
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
 results=[]
 def check(name,condition):
  assert condition,name
  results.append(name);print('PASS',name,flush=True)
 def shot(name):page.screenshot(path=str(ART/(name+'.png')))
 def close():page.keyboard.press('Escape')


 try:
  page.wait_for_function("window.RoyaleDemo && document.getElementById('loading').classList.contains('hidden')",timeout=180000)
  page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,highestTrophies:9000,trophies:9000,unlockedCards:RoyaleCore.CARDS.map(c=>c.id),sandboxMap:'Team3v3'})")
  page.evaluate("async()=>{await RoyaleDemo.startSandbox();RoyaleDemo.battle.paused=true;}")
  page.wait_for_function('RoyaleDemo.sandboxUI.ready',timeout=90000)
  check('Touch phone uses the actual compact battle composition',page.evaluate("RoyaleBattleView.mode==='compact'"))
  for mode in ['Team3v3','BridgeBattle','frozen']:
   if page.locator('#sandboxMap').input_value()!=mode:
    page.locator('#sandboxMap').select_option(mode)
    page.wait_for_function("!document.getElementById('sandboxMap').disabled&&RoyaleDemo.sandboxUI.ready",timeout=90000)
   for width,height in [(390,844),(320,568)]:
    page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(250)
    check(mode+' compact layout stays inside screen '+str(width),page.locator('#battleCanvas').evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1}'))
    check(mode+' map selector remains visible '+str(width),page.locator('#sandboxMap').is_visible())
    shot(mode+'-touch-'+str(width))
   before=page.evaluate('RoyaleDemo.battle.units.length')
   position=page.evaluate("()=>{const p=RoyaleBattleView.toScreen({x:RoyaleDemo.battle.mode==='BridgeBattle'?240:3.5*RoyaleCore.SX,y:22*RoyaleCore.SY}),v=document.getElementById('viewport').getBoundingClientRect();return{x:v.left+p.x*v.width/540,y:v.top+p.y*v.width/540}}")
   page.touchscreen.tap(position['x'],position['y']);page.wait_for_timeout(100)
   check(mode+' touch deployment follows the displayed custom camera',page.evaluate('RoyaleDemo.battle.units.length')>before)
  page.locator('[data-action=sandbox-exit]').click()
  page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,graphics:{...RoyaleDemo.profile.graphics,potato:true}})")
  page.evaluate("async()=>{await RoyaleDemo.startBattle('TwentyElixir',false,{queue:'challenge'});RoyaleDemo.battle.paused=true;RoyaleDemo.battle.elixir[0]=18;RoyaleDemo.refreshHand(true);}")
  check('Compact Potato battle still uses twenty-cap elixir',page.locator('.elixir-max').inner_text().strip()=='Max 20' and page.locator('#elixirFill').evaluate('e=>e.style.width')=='90%')
  page.wait_for_timeout(1800);shot('potato-touch-320')
  check('No uncaught touch-browser errors',not errors)
  (ART/'browser-report.json').write_text(json.dumps({'passed':len(results),'checks':results,'errors':errors,'fixture':'Touch-enabled headless Chromium with file-backed assets; not physical iPhone/Safari.'},indent=2))
 except Exception:
  traceback.print_exc();print('PAGE ERRORS',errors,flush=True);shot('failure');(ART/'browser-failure.txt').write_text(traceback.format_exc()+'\n'+json.dumps(errors));raise
 finally:
  browser.close()
