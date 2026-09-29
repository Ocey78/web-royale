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
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'docs/verification-v042/browser')
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

 def layout_shots(prefix,selector):
  for width,height in [(1280,1040),(390,844),(320,568)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(350);shot(prefix+'-'+str(width))
   check(prefix+' remains within screen '+str(width),page.locator(selector).evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1}'))
 def settings():
  if not page.locator('[data-action=potato-toggle]').is_visible():
   page.evaluate("RoyaleDemo.show('home');document.querySelector('#home [data-action=menu]').click()")
   page.locator('[data-action=settings]').click()
 def run_mode(mode):
  page.evaluate("async mode=>{await RoyaleDemo.startBattle(mode,false,{queue:'challenge'});if(RoyaleDemo.battle)RoyaleDemo.battle.paused=true;}",mode)
  page.wait_for_function('RoyaleDemo.battle && !RoyaleDemo.preparing',timeout=90000)
  check(mode+' loaded real battle',page.evaluate('RoyaleDemo.battle.mode')==mode)
  page.wait_for_timeout(2000)
 try:
  page.wait_for_function("window.RoyaleDemo && document.getElementById('loading').classList.contains('hidden')",timeout=180000)
  check('v0.42.0 generated release boots',page.evaluate('RoyaleBundle.version')=='0.42.0')
  page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,earnedCrowns:257,lifetimeCrowns:257,crownRoadClaims:[],experience:120});RoyaleDemo.show('home')")
  check('Menu badge shows King Level not Crown Level',page.locator('#home .xp-badge').inner_text().strip()==str(page.evaluate('RoyaleDemo.profile.kingLevel')) and page.evaluate('RoyaleDemo.profile.kingLevel!==RoyaleDemo.profile.crownLevel'))
  check('Badge retains Crown Road reward highlight',page.locator('#home .crown-level-button.crown-reward-ready').count()==1)
  page.locator('#home [data-action=crown-road]').click()
  check('King Level button opens Crown Road',page.evaluate('RoyaleDemo.screen')=='crownRoad')
  check('Crown Level remains inside the road',page.locator('#crownRoadLevel').inner_text().strip()=='Level 26')
  page.evaluate("RoyaleDemo.show('events')")
  for mode in ['TwelveCardDeck','TwentyElixir','OneShot']:
   check(mode+' listed in Other Modes',page.locator('#eventsContent [data-mode="'+mode+'"]').count()==1)
  page.locator('[data-action=special-deck-builder][data-mode=TwelveCardDeck]').click()
  check('Starter collection sees incomplete twelve-slot deck',page.locator('.mode-deck-slot').count()==12 and page.locator('[data-action=special-deck-play]').is_disabled())
  check('No locked cards silently granted',page.locator('.mode-deck-lock').count()==1 and page.evaluate('RoyaleDemo.profile.unlockedCards.length')==8)
  layout_shots('twelve-locked','#modalPanel');close()
  page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,trophies:9000,highestTrophies:9000,unlockedCards:RoyaleCore.CARDS.map(c=>c.id)});RoyaleDemo.show('events')")
  normal_decks=page.evaluate('JSON.stringify(RoyaleDemo.profile.decks)')
  page.locator('[data-action=special-deck-builder][data-mode=TwelveCardDeck]').click()
  check('Unlocked twelve-slot builder can play',page.locator('.mode-deck-slot').count()==12 and page.locator('[data-action=special-deck-play]').is_enabled())
  page.locator('[data-action=special-deck-slot][data-index="0"]').click()
  page.locator('#specialDeckSearch').fill('Hog Rider')
  page.locator('[data-action=special-deck-pick][data-id=hog-rider]').click()
  check('Twelve-card deck edit saves in separate array',page.evaluate("RoyaleDemo.profile.twelveCardDeck[0]==='hog-rider'&&JSON.parse(localStorage.getItem('web-royale-classic-v4')).twelveCardDeck[0]==='hog-rider'"))
  page.locator('#specialDeckSearch').fill('')
  layout_shots('twelve-builder','#modalPanel')
  check('Twelve builder play and search remain inside panel',page.locator('[data-action=special-deck-play]').evaluate("e=>{const r=e.getBoundingClientRect(),p=e.closest('#modalPanel').getBoundingClientRect();return r.bottom<p.bottom&&r.top>p.top}"))
  page.locator('[data-action=special-deck-play]').click()
  page.wait_for_function("RoyaleDemo.battle?.mode==='TwelveCardDeck'&&!RoyaleDemo.preparing",timeout=90000)
  page.evaluate('RoyaleDemo.battle.paused=true')
  check('Actual twelve-card battle has four hand and eight queue',page.evaluate('RoyaleDemo.battle.hand[0].length===4&&RoyaleDemo.battle.queue[0].length===8'))
  check('Twelve-card hand has no card level labels',page.locator('#hand .card-level').count()==0)
  shot('twelve-battle')
  page.evaluate("RoyaleDemo.show('events')")
  page.locator('[data-action=special-deck-builder][data-mode=OneShot]').click()
  check('One Shot has eight separate slots',page.locator('.mode-deck-slot').count()==8)
  check('One Shot pool excludes all spells and Mortar/X-Bow',page.locator('.mode-deck-pick').evaluate_all("es=>es.every(e=>RoyaleCore.allowedInMode(e.dataset.id,'OneShot'))"))
  page.locator('[data-action=special-deck-slot][data-index="0"]').click()
  page.locator('#specialDeckSearch').fill('Giant')
  page.locator('[data-action=special-deck-pick][data-id=giant]').click()
  check('One Shot changes do not overwrite twelve or regular decks',page.evaluate("RoyaleDemo.profile.oneShotDeck[0]==='giant'&&RoyaleDemo.profile.twelveCardDeck[0]==='hog-rider'") and page.evaluate('JSON.stringify(RoyaleDemo.profile.decks)')==normal_decks)
  page.locator('#specialDeckSearch').fill('')
  layout_shots('oneshot-builder','#modalPanel')
  page.locator('[data-action=special-deck-play]').click()
  page.wait_for_function("RoyaleDemo.battle?.mode==='OneShot'&&!RoyaleDemo.preparing",timeout=90000)
  page.evaluate('RoyaleDemo.battle.paused=true;RoyaleDemo.refreshHand(true)')
  check('Actual One Shot towers all have 1 HP with sudden death active',page.evaluate('RoyaleDemo.battle.towers.every(t=>t.hp===1&&t.maxHp===1)&&RoyaleDemo.battle.overtime'))
  check('Actual One Shot bot deck has no restricted cards',page.evaluate("RoyaleDemo.battle.initialDecks[1].every(id=>RoyaleCore.allowedInMode(id,'OneShot'))"))
  shot('oneshot-battle')
  page.evaluate("()=>{const b=RoyaleDemo.battle,t=b.towers.find(t=>!t.king&&t.team===1);b.damage(t,1,0);b.deaths();b.checkResult();RoyaleDemo.step(0)}")
  page.wait_for_timeout(3000)
  check('First tower ends One Shot and displays results',page.evaluate('RoyaleDemo.battle.result.winner')==0 and page.locator('#endOk').is_visible())
  page.locator('#endOk').click()
  run_mode('TwentyElixir')
  page.evaluate('RoyaleDemo.battle.elixir[0]=18;RoyaleDemo.refreshHand(true)')
  check('20 Elixir visible maximum label is Max 20',page.locator('.elixir-max').inner_text().strip()=='Max 20')
  check('20 Elixir HUD has capacity twenty',page.locator('#elixirMeter').get_attribute('aria-valuemax')=='20')
  check('18 elixir fills 90 percent rather than overflowing',page.locator('#elixirFill').evaluate("e=>e.style.width")=='90%')
  check('20 Elixir accessible meter shows real current value',page.locator('#elixirMeter').get_attribute('aria-valuenow')=='18.00')
  layout_shots('twenty-elixir','#battleCanvas')
  # Cosmetic map is recorded so playback displays the same arena.
  check('Casual arena selected from standard pool and stored in replay',page.evaluate("RoyaleArenaSelection.standard.some(a=>a.id===RoyaleDemo.battle.arenaId)&&RoyaleDemo.battle.replayInitial.arenaId===RoyaleDemo.battle.arenaId"))
  run_mode('Team3v3')
  check('3v3 starts with a five-minute clock',page.locator('#timer').inner_text().strip()=='5:00')
  for elapsed,clock,mult in [(120,'3:00','1.5'),(240,'1:00','2'),(300,'2:00','2')]:
   page.evaluate('(t)=>{RoyaleDemo.battle.time=t;RoyaleDemo.refreshHand(true)}',elapsed)
   check('3v3 real phase at '+clock+' elapsed '+str(elapsed),page.locator('#timer').inner_text().strip()==clock and page.locator('#multiplier').inner_text().strip().startswith(mult+'×'))
  page.evaluate('RoyaleDemo.battle.time=0;RoyaleDemo.refreshHand(true)');page.wait_for_timeout(4200)
  check('3v3 custom arena uses cached background and foreground surfaces',page.evaluate("(()=>{const cv=RoyaleCustomArena.prepare(RoyaleDemo.battle,RoyaleNative.library);return !!cv.foreground&&cv.layers.length===3})()"))
  layout_shots('3v3-polished','#battleCanvas')
  run_mode('BridgeBattle')
  check('Bridge retains single-route geometry',page.evaluate('RoyaleDemo.battle.arenaLayout.bridges.length')==1)
  layout_shots('bridge-polished','#battleCanvas')
  page.evaluate('RoyaleDemo.battle.paused=false;RoyaleDemo.step(4);RoyaleDemo.battle.paused=true')
  page.wait_for_timeout(200);shot('bridge-active')
  page.evaluate("RoyaleDemo.show('home')")
  page.evaluate('async()=>{await RoyaleDemo.startSandbox();RoyaleDemo.battle.paused=true;}')
  page.wait_for_function('RoyaleDemo.sandboxUI.ready',timeout=90000)
  check('Sandbox selector contains fifteen standard and two custom maps',page.locator('#sandboxMap option').count()==17)
  for mapid,towers in [('BridgeBattle',4),('Team3v3',12),('hog',6)]:
   page.evaluate("RoyaleDemo.session.spawn({card:'knight',team:0,x:240,y:480})")
   page.locator('#sandboxMap').select_option(mapid)
   page.wait_for_function("!document.getElementById('sandboxMap').disabled&&RoyaleDemo.sandboxUI.ready",timeout=90000)
   check('Sandbox map switch resets into '+mapid,page.evaluate('RoyaleDemo.battle.arenaId')==mapid and page.evaluate('RoyaleDemo.battle.towers.length')==towers and page.evaluate('RoyaleDemo.battle.units.length')==0)
   check('Sandbox switch keeps pause and persists '+mapid,page.evaluate('RoyaleDemo.battle.paused') and page.evaluate('RoyaleDemo.profile.sandboxMap')==mapid)
   shot('sandbox-'+mapid)
  page.locator('[data-action=sandbox-exit]').click()
  page.evaluate("RoyaleDemo.show('shop')")
  check('Daily free chest ranges removed from visible descriptions',page.locator('.daily-free-offer').nth(0).locator('p').count()==0 and page.locator('.daily-free-offer').nth(1).locator('p').count()==0)
  check('Daily Wild Card amount description remains',page.locator('.daily-free-offer').nth(2).locator('p').count()==1)
  layout_shots('daily-clean','#shopContent')
  settings()
  saved=page.evaluate('JSON.stringify(RoyaleDemo.profile.graphics)')
  page.locator('[data-action=potato-toggle]').click()
  page.wait_for_function('RoyaleGraphics.current.potato===true&&!RoyaleDemo.preparing',timeout=90000)
  check('Potato switch saved and enabled',page.evaluate("JSON.parse(localStorage.getItem('web-royale-classic-v4')).graphics.potato===true") and page.locator('[data-action=potato-toggle]').get_attribute('aria-checked')=='true')
  check('Potato bypasses decorative particle budgets',page.evaluate("RoyaleGraphics.current.renderMode==='primitive'&&RoyaleGraphics.current.frameParticles===0"))
  shot('potato-settings');close()
  page.evaluate("RoyaleDemo.show('cards')")
  page.wait_for_function("[...document.querySelectorAll('#cards img[data-card-image]')].some(i=>i.naturalWidth===40&&i.dataset.textureQuality==='potato')",timeout=90000)
  check('Potato card portraits are actually reduced to 40-pixel texture width',page.evaluate("[...document.querySelectorAll('#cards img[data-card-image]')].filter(i=>i.offsetWidth>0).every(i=>i.naturalWidth===40)"))
  shot('potato-menu')
  run_mode('Team3v3')
  page.evaluate("()=>{window.__nativeRenderCalls=0;window.__savedDraw={};for(const k of ['drawArena','drawUnit','drawTower'])if(typeof RoyaleDemo.native[k]==='function'){__savedDraw[k]=RoyaleDemo.native[k];RoyaleDemo.native[k]=function(...args){__nativeRenderCalls++;return __savedDraw[k].apply(this,args)}}const b=RoyaleDemo.battle;for(const [entity,team,x,y]of [['Knight',0,220,460],['BabyDragon',0,280,440],['Goblin',1,215,400],['DarkPrince',1,280,330]])b.spawn(entity,team,x,y,9);}")
  page.wait_for_timeout(350)
  check('Potato battle does not render native arena/troop/tower sprites',page.evaluate('__nativeRenderCalls')==0)
  layout_shots('potato-3v3','#battleCanvas')
  page.evaluate('()=>{for(const [k,f]of Object.entries(__savedDraw))RoyaleDemo.native[k]=f;}')
  page.evaluate("RoyaleDemo.show('home')")
  settings();page.locator('[data-action=potato-toggle]').click()
  page.wait_for_function('!RoyaleGraphics.current.potato&&!RoyaleDemo.preparing',timeout=90000)
  check('Switching Potato off restores all prior quality selections',page.evaluate('JSON.stringify(RoyaleDemo.profile.graphics)')==saved)
  close();run_mode('BridgeBattle')
  check('Normal native assets restored after Potato is disabled',page.evaluate("RoyaleGraphics.current.renderMode==='native'&&RoyaleCustomArena.cacheSize()>0"))
  shot('bridge-restored')
  page.evaluate("RoyaleDemo.show('home');RoyaleDemo.learningMenu()")
  check('Learning Center lists all fifteen match modes',page.locator('#trainingMode option').count()==15)
  for mode in ['TwelveCardDeck','TwentyElixir','OneShot']:
   check(mode+' available to train',page.locator('#trainingMode option[value='+mode+']').count()==1)
  shot('learning-fifteen')
  check('No uncaught browser errors',not errors)
  (ART/'browser-report.json').write_text(json.dumps({'passed':len(results),'checks':results,'errors':errors,'fixture':'Generated JavaScript/CSS/native assets through file-backed Chromium; no real iPhone, HTTP or service worker upgrade test.'},indent=2))
 except Exception:
  traceback.print_exc();print('PAGE ERRORS',errors,flush=True);shot('failure');(ART/'browser-failure.txt').write_text(traceback.format_exc()+'\n'+json.dumps(errors));raise
 finally:
  browser.close()
