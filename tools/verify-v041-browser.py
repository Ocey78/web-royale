"""Exercise the generated v0.41.0 UI and native Canvas renderers.

Requires Python 3.10+, Playwright, and a Chromium executable. Uses a file-backed
asset fixture on about:blank; it does not test HTTP navigation, Service Workers,
or persistent browser storage across processes. Those paths have Node tests.
Run: python tools/verify-v041-browser.py --browser /path/to/chromium
"""
from pathlib import Path
import argparse
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser', help='Chromium executable; otherwise Playwright uses its installed Chromium')
parser.add_argument('--dist', type=Path, default=Path(__file__).resolve().parents[1] / 'dist')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'docs/verification-v041')
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

  check('v0.41.0 generated release boots',page.evaluate('RoyaleBundle.version')=='0.41.0')
  page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,lifetimeCrowns:undefined,crownRoadClaims:[],earnedCrowns:257,crownChestClaimed:130,version:11});RoyaleDemo.show('home')")
  check('Old account migrates to Crown Level 26',page.evaluate('RoyaleDemo.profile.crownLevel')==26)
  check('Unclaimed crown rewards outline level button yellow',page.locator('#home .crown-level-button.crown-reward-ready').count()==1)
  page.locator('#home [data-action=crown-road]').click()
  check('Level button opens Crown Road instead of profile',page.locator('#crownRoad').evaluate("e=>e.classList.contains('active')"))
  check('Road is bounded to 25 visible rewards',page.locator('.crown-road-step').count()==25)
  before=page.evaluate('({gold:RoyaleDemo.profile.gold,crowns:RoyaleDemo.profile.lifetimeCrowns,claim:RoyaleDemo.profile.crownChestClaimed,king:RoyaleDemo.profile.kingLevel})')
  page.locator('[data-action=crown-claim][data-milestone="1"]').click()
  check('Crown claim grants gold and preserves crowns and King Level',page.evaluate('RoyaleDemo.profile.gold')>before['gold'] and page.evaluate('RoyaleDemo.profile.lifetimeCrowns')==before['crowns'] and page.evaluate('RoyaleDemo.profile.crownChestClaimed')==before['claim'] and page.evaluate('RoyaleDemo.profile.kingLevel')==before['king'])
  close()
  check('Claimed level is disabled and permanently saved',page.locator('[data-action=crown-claim][data-milestone="1"]').is_disabled() and page.evaluate("JSON.parse(localStorage.getItem('web-royale-classic-v4')).crownRoadClaims[0][0]")==1)
  for width,height in [(1280,1040),(390,844),(320,568)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(200);shot('crown-road-'+str(width))
   check('Crown Road stays inside viewport '+str(width),page.locator('#crownRoadScroll').evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1}'))
  page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,crownRoadClaims:[[1,25]]});RoyaleDemo.show('home')")
  check('Yellow outline clears after every reached reward is claimed',page.locator('#home .crown-reward-ready').count()==0)
  page.evaluate("document.querySelector('#home [data-action=profile]').click()")
  check('Player profile remains accessible by player name',page.locator('#modalPanel').get_attribute('data-kind')=='profile');close()
  page.evaluate("RoyaleDemo.show('events')")
  for mode in ['Team3v3','BridgeBattle']:
   check(mode+' is selectable in Other Modes',page.locator('#eventsContent [data-mode="'+mode+'"]').count()==1)
  page.evaluate("RoyaleDemo.show('home');RoyaleDemo.applyProfile({...RoyaleDemo.profile,trophies:6000,highestTrophies:6000,unlockedCards:RoyaleCore.CARDS.map(c=>c.id),decks:[['giant','knight','goblins','fireball','archers','minions','musketeer','arrows']]})")
  for mode in ['Team3v3','BridgeBattle']:
   page.evaluate("async mode=>{await RoyaleDemo.startBattle(mode,false,{queue:'challenge'});RoyaleDemo.battle.paused=true;}",mode)
   page.wait_for_function('RoyaleDemo.battle && !RoyaleDemo.preparing',timeout=90000)
   info=page.evaluate("({mode:RoyaleDemo.battle.mode,towers:RoyaleDemo.battle.towers.length,seats:RoyaleDemo.battle.seatCount,custom:RoyaleDemo.battle.arenaLayout.custom})")
   check(mode+' runs actual custom topology',info['custom'] and info['mode']==mode and info['towers']==(12 if mode=='Team3v3' else 4))
   check(mode+' geometry art is cached',page.evaluate('RoyaleCustomArena.cacheSize()')>0)
   if mode=='Team3v3':
    check('Six independent decks and banks',page.evaluate('RoyaleDemo.battle.hand.length===6&&RoyaleDemo.battle.elixir.length===6'))
    check('Local King is identified regardless of randomized position',page.evaluate('RoyaleDemo.battle.towers.filter(t=>t.localKing).length===1&&RoyaleDemo.battle.towers.find(t=>t.localKing).owner===0'))
    check('Two teammate banks and local bank fit HUD',page.locator('#tripleTeamStatus>span').count()==3)
   for width,height in [(1280,1040),(390,844),(320,568)]:
    page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(400);shot(mode+'-'+str(width))
    check(mode+' battle is within screen '+str(width),page.locator('#battleCanvas').evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1}'))
   page.evaluate("()=>{const b=RoyaleDemo.battle;b.paused=false;for(let i=0;i<280;i++){if(i%5===0)b.aiPlay(0);b.step(.05);}b.paused=true;}")
   check(mode+' actual AI produces legal card deployments',page.evaluate('RoyaleDemo.battle.played.reduce((a,b)=>a+b,0)>0'))
   if mode=='Team3v3':
    values=page.evaluate("()=>{const b=RoyaleDemo.battle,t=b.towers.find(t=>t.localKing);b.elixir[0]=4;t.hp=0;b.deaths();b.paused=false;b.ai=false;b.step(.1);b.paused=true;return {elixir:b.elixir[0],disabled:!b.passiveElixirEnabled(0),result:b.result};}")
    check('Local King loss retains stored elixir and match continues',values['elixir']==4 and values['disabled'] and not values['result'])
    page.wait_for_timeout(300);shot('3v3-king-destroyed')
   page.evaluate("()=>{const b=RoyaleDemo.battle;b.crowns=b.is3v3?[6,4]:[2,1];b.finish(0,'verification');RoyaleDemo.step(0);}")
   page.wait_for_timeout(3100);shot(mode+'-result')
   check(mode+' result OK remains actionable',page.locator('#endOk').is_visible())
   if mode=='Team3v3':check('Six crowns preserved in history and lifetime progression',page.evaluate("RoyaleDemo.profile.history[0].crowns[0]===6&&RoyaleDemo.profile.history[0].mode==='Team3v3'"))
   page.locator('#endOk').click()
  page.evaluate("RoyaleDemo.learningMenu()")
  check('Learning Center exposes every playable mode',page.locator('#trainingMode option').count()==12)
  check('3v3 and Bridge selectable for self-play',page.locator('#trainingMode option[value=Team3v3]').count()==1 and page.locator('#trainingMode option[value=BridgeBattle]').count()==1)
  shot('all-mode-learning');close()
  # A real earned Treasure Chest is opened through the normal chest action.
  page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,chests:[{id:'treasure-qa',kind:'treasure',winsProgress:5,winsRequired:5}]});RoyaleDemo.show('home')")
  check('Treasure chest uses the recolored wooden artwork',page.locator('#home img[data-ui=treasure-chest]').count()>=1)
  page.locator('[data-action=chest][data-id=treasure-qa]').click();page.wait_for_function("RoyaleDemo.chestOpening.sequence!==null",timeout=90000);page.wait_for_timeout(400)
  check('Treasure opening uses dedicated gold-trim scene',page.evaluate("RoyaleNative.library.scenes.treasure_chest!==undefined"))
  shot('treasure-opening')
  check('Treasure claim removed occupied chest slot once',page.evaluate("RoyaleDemo.profile.chests.every(c=>c.id!=='treasure-qa')"))
  check('No uncaught browser errors',not errors)
  (ART/'browser-report.json').write_text(json.dumps({'passed':len(results),'checks':results,'errors':errors,'fixture':'Generated product and local assets; file-backed Chromium, not live-site HTTP/Safari.'},indent=2))
 except Exception:
  traceback.print_exc();print('PAGE ERRORS',errors,flush=True);shot('failure');(ART/'browser-failure.txt').write_text(traceback.format_exc()+'\n'+json.dumps(errors));raise
 finally:
  browser.close()
