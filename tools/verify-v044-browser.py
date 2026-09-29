"""Exercise the generated v0.44.0 UI and native Canvas renderers.

Requires Python 3.10+, Playwright, and a Chromium executable. Uses a file-backed
asset fixture on about:blank; it does not test HTTP navigation, Service Workers,
or persistent browser storage across processes. Those paths have Node tests.
Run: python tools/verify-v043-browser.py --browser /path/to/chromium
"""
from pathlib import Path
import argparse
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser', help='Chromium executable; otherwise Playwright uses its installed Chromium')
parser.add_argument('--dist', type=Path, default=Path(__file__).resolve().parents[1] / 'dist')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'docs/verification-v044/browser')
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
  check('v0.44.0 boot',page.evaluate('RoyaleBundle.version')=='0.44.0')
  page.evaluate("()=>{const C=RoyaleCore,p=RoyaleDemo.profile;p.trophies=p.highestTrophies=6000;p.unlockedCards=C.CARDS.map(c=>c.id);p.gold=100000;p.gems=20000;RoyaleDemo.applyProfile(p)}")
  run_mode('TeamRumble')
  check('Native royal castle assets prepared',page.evaluate("!!RoyaleDemo.native.scenes.level_royal_arena"))
  check('20 towers on matched arched foundations',page.evaluate("()=>{const b=RoyaleDemo.battle,cv=RoyaleCustomArena.prepare(b,RoyaleDemo.native);return cv.theme==='castle'&&cv.foundations.length===20&&cv.foundations.every(f=>b.towers.some(t=>t.entity===f.entity&&t.team===f.team&&Math.abs(t.x-f.x)<1e-8&&Math.abs(t.y-f.y)<1e-8))}"))
  check('Five King and Princess positions recede into symmetric arches',page.evaluate("()=>{const b=RoyaleDemo.battle;return [true,false].every(k=>{const ts=b.towers.filter(t=>t.king===k&&t.team===1).sort((a,b)=>a.x-b.x);return ts[0].y>ts[1].y&&ts[1].y>ts[2].y&&ts.every((t,i)=>Math.abs(t.x+ts[4-i].x-480)<1e-7&&t.y===ts[4-i].y)})}"))
  layout_shots('castle-arena','#battleCanvas')
  # Check actual scaled pointer coordinates for legal rear/edge deployments.
  for width,height in [(390,844),(320,568)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
   check('Extended floor fits scaled input at '+str(width),page.evaluate("()=>{const V=RoyaleBattleView,b=RoyaleDemo.battle,l=b.arenaLayout;return [l.left+.1,l.right-.1].every(x=>[l.top+.1,l.bottom-.1].every(y=>{const pt={x:x*RoyaleCore.SX,y:y*RoyaleCore.SY},s=V.toScreen(pt),p=V.toWorld(s);return s.x>=0&&s.x<=V.layout.width&&s.y>=0&&s.y<V.layout.handTop&&V.onBoard(s)&&Math.abs(p.x-pt.x)<1e-7}))}"))
  for elapsed,clock,mult in [(0,'5:00',1),(120,'3:00',2),(240,'1:00',3),(300,'5:00',3),(420,'3:00',4),(540,'1:00',5)]:
   page.evaluate('(t)=>{const b=RoyaleDemo.battle;b.time=t;b.overtime=t>=300;RoyaleDemo.refreshHand(true)}',elapsed)
   check('Live clock/multiplier '+str(elapsed),page.locator('#timer').inner_text().strip()==clock and page.evaluate('RoyaleDemo.battle.multiplier')==mult)
  page.evaluate('RoyaleDemo.battle.time=0;RoyaleDemo.battle.overtime=false;RoyaleDemo.refreshHand(true)')
  # Force only the transport to loaded card art; gameplay uses the real hand renderer.
  for card,cost in [('knight',3),('princess',3),('fireball',4)]:
   page.evaluate("([card,cost])=>{const b=RoyaleDemo.battle;b.hand[0][0]='mirror';b.lastCard[0]={id:card,level:9,cost};b.elixir[0]=10;RoyaleDemo.refreshHand(true)}",[card,cost])
   page.wait_for_function("()=>{const i=document.querySelector('#hand .mirrored .card-portrait');return i&&i.complete&&i.naturalWidth>0}")
   check('Mirror real copied portrait '+card,page.locator('#hand .mirrored .card-portrait').get_attribute('data-card-image')==card)
   check('Mirror has transparent mask-independent center '+card,page.evaluate("()=>{const s=getComputedStyle(document.querySelector('#hand .mirrored'),'::after');return s.backgroundImage==='none'&&s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.maskImage==='none'}"))
   check('Mirror cost intact '+card,page.evaluate('RoyaleDemo.battle.card(0,0).cost')==cost+1)
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(200);shot('mirror-fireball')
  page.evaluate("()=>{const b=RoyaleDemo.battle;b.lastCard[0]={id:'princess',cost:3,level:9};RoyaleDemo.refreshHand(true)}");page.wait_for_timeout(300);shot('mirror-princess')
  # Elimination+activation exercise real damage/death and income paths.
  page.evaluate("()=>{const b=RoyaleDemo.battle,k=b.towers.find(t=>t.king&&t.owner===0);b.damage(k,1);window.__activationTime=k.activationAt;b.time=k.activationAt;b.tickEntity(k,.001);RoyaleDemo.refreshHand(true)}")
  check('All five allied Kings activate together',page.evaluate("RoyaleDemo.battle.towers.filter(t=>t.king&&t.team===0).every(t=>t.active)"))
  check('Enemy Kings stay inactive',page.evaluate("RoyaleDemo.battle.towers.filter(t=>t.king&&t.team===1).every(t=>!t.active)"))
  page.evaluate("()=>{const b=RoyaleDemo.battle,k=b.towers.find(t=>t.localKing);b.damage(k,1e9);b.deaths();b.elixir.fill(4);b.paused=false;b.step(.01);b.paused=true;RoyaleDemo.refreshHand(true)}")
  check('Eliminated player retains elixir without passive income',page.evaluate('RoyaleDemo.battle.elixir[0]===4&&RoyaleDemo.battle.elixir[2]>4'))
  shot('own-king-destroyed')
  # Reset, destroy only a Princess then advance to OT; should NOT finish.
  run_mode('TeamRumble')
  page.evaluate("()=>{const b=RoyaleDemo.battle,t=b.towers.find(t=>!t.king&&t.team===1);b.damage(t,1e9);b.deaths();b.time=300;b.checkResult();RoyaleDemo.refreshHand(true)}")
  check('Princess destruction scores zero and permits tied-King OT',page.evaluate('!RoyaleDemo.battle.result&&RoyaleDemo.battle.overtime&&RoyaleDemo.battle.crowns[0]===0'))
  page.wait_for_timeout(250);shot('king-only-overtime')
  page.evaluate("()=>{const b=RoyaleDemo.battle,t=b.towers.find(t=>t.king&&t.team===1);b.damage(t,1e9);b.deaths();b.checkResult();RoyaleDemo.step(0)}")
  check('King loss in OT ends real battle',page.evaluate('RoyaleDemo.battle.result.winner===0'))
  page.wait_for_selector('#endPlayAgain',state='visible',timeout=15000);shot('king-only-results')
  check('Result shows one King crown',page.locator('#endPlayerScore').inner_text().strip()=='1')
  page.evaluate('window.__oldMatch=RoyaleDemo.battle.id;window.__gold=RoyaleDemo.profile.gold')
  page.locator('#endPlayAgain').click();page.wait_for_function('RoyaleDemo.battle.id!==__oldMatch&&!RoyaleDemo.preparing',timeout=90000);page.evaluate('RoyaleDemo.battle.paused=true')
  check('Play Again preserves 5v5 and never pays twice',page.evaluate('RoyaleDemo.battle.is5v5&&RoyaleDemo.profile.gold===__gold'))
  # New castle render obeys existing potato settings; changing back restores detail.
  page.evaluate("RoyaleDemo.show('home')");settings();page.locator('[data-action=potato-toggle]').click();close();run_mode('TeamRumble')
  check('Potato retains same arches without native castle effects',page.evaluate("RoyaleGraphics.current.potato&&RoyaleDemo.battle.arenaLayout.kingYs.length===5"));shot('potato-castle')
  check('No browser exceptions',not errors)
 finally:
  (ART/'report.json').write_text(json.dumps({'version':release['version'],'passed':len(results),'checks':results,'errors':errors},indent=2))
  browser.close()
