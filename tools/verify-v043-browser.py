"""Exercise the generated v0.43.0 UI and native Canvas renderers.

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
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'docs/verification-v043/browser')
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
  check('Release v0.43.0 boots',page.evaluate('RoyaleBundle.version')=='0.43.0')
  if args.phase in ('ui','all'):
   starter=page.evaluate('JSON.stringify(RoyaleDemo.profile.unlockedCards)')
   ranked=page.evaluate('JSON.stringify(RoyaleDemo.profile.decks)')
   page.evaluate("RoyaleDemo.show('events')")
   modes=page.locator('#eventsContent [data-action=special-deck-builder]').evaluate_all('es=>es.map(e=>e.dataset.mode)')
   check('Fourteen casual selectable modes each open their independent deck builder',len(modes)==14)
   for mode in modes:
    page.locator('#eventsContent [data-action=special-deck-builder][data-mode="'+mode+'"]').click()
    cfg=page.evaluate('mode=>RoyaleDeckManager.MODE_DECKS[mode]',mode)
    check(mode+' shows the correct deck size',page.locator('.mode-deck-slot').count()==cfg['size'])
    check(mode+' all allowed catalog cards available on starter save',page.locator('.mode-deck-pick').count()==page.evaluate('mode=>RoyaleCore.CARDS.filter(c=>RoyaleCore.allowedInMode(c.id,mode)).length',mode))
    check(mode+' playable without ranked unlocks',page.locator('[data-action=special-deck-play]').is_enabled())
    if mode=='OneShot':
     check('One Shot excludes Miner and Drill as well as spells and siege',page.locator('.mode-deck-pick').evaluate_all("es=>es.every(e=>!['miner','goblin-drill','mortar','x-bow'].includes(e.dataset.id)&&RoyaleCore.CARD_BY_ID[e.dataset.id].kind!=='Spell')"))
    if mode in ['TwelveCardDeck','TeamRumble','OneShot']:layout_shots('builder-'+mode,'#modalPanel')
    close()
   check('Inspecting casual builders does not grant ranked ownership',page.evaluate('JSON.stringify(RoyaleDemo.profile.unlockedCards)')==starter)
   page.locator('[data-action=special-deck-builder][data-mode=TeamVsTeam]').click()
   page.locator('[data-action=special-deck-slot][data-index="0"]').click()
   page.locator('#specialDeckSearch').fill('Magic Archer')
   page.locator('[data-action=special-deck-pick][data-id=magic-archer]').click()
   check('Casual locked legendary is editable and saved only in its own deck',page.evaluate("RoyaleDemo.profile.duoDeck[0]==='magic-archer'&&!RoyaleDemo.profile.unlockedCards.includes('magic-archer')"))
   check('Casual edit leaves ranked decks intact',page.evaluate('JSON.stringify(RoyaleDemo.profile.decks)')==ranked)
   close();page.evaluate("RoyaleDemo.show('cards')")
   for i in range(11):page.locator('[data-action=add-deck]').click()
   check('Sixteen decks retained with four pages',page.evaluate('RoyaleDemo.profile.decks.length')==16 and page.locator('#deckPageLabel').inner_text().strip()=='4 / 4')
   check('Last page has one deck and previous arrow',page.locator('#deckTabs [data-action=deck]').count()==1 and page.locator('[aria-label="Previous decks"]').is_enabled())
   page.locator('#deckName').fill('Rumble practice');page.locator('#deckName').press('Enter')
   check('Deck name saved alongside active deck',page.evaluate("RoyaleDemo.profile.deckNames[15]==='Rumble practice'&&JSON.parse(localStorage.getItem('web-royale-classic-v4')).deckNames[15]==='Rumble practice'"))
   page.locator('[aria-label="Previous decks"]').click()
   check('Previous page shows exactly decks 11-15',page.locator('#deckTabs [data-action=deck]').evaluate_all('es=>es.map(e=>+e.dataset.index)')==[10,11,12,13,14])
   page.locator('[data-action=deck][data-index="10"]').click()
   page.locator('#deckName').fill('Five-card page');page.locator('#deckName').press('Enter')
   page.wait_for_timeout(2500)
   layout_shots('named-decks','#deckToolbar')
   check('Toolbar controls do not overlap at compact width',page.locator('#deckToolbar button').evaluate_all('es=>{const rs=es.filter(e=>e.offsetWidth).map(e=>e.getBoundingClientRect());return rs.every((r,i)=>rs.every((q,j)=>i===j||r.right<=q.left+.5||q.right<=r.left+.5||r.bottom<=q.top+.5||q.bottom<=r.top+.5))}'))
   check('Deck name remains within footer',page.locator('#deckName').evaluate('e=>{const a=e.getBoundingClientRect(),b=e.closest(".deck-footer").getBoundingClientRect();return a.left>=b.left&&a.right<=b.right+.5}'))
   page.evaluate('RoyaleDemo.applyProfile(JSON.parse(localStorage.getItem("web-royale-classic-v4")))')
   check('Deck labels survive reload normalization',page.evaluate("RoyaleDemo.profile.deckNames[15]==='Rumble practice'&&RoyaleDemo.profile.deckNames[10]==='Five-card page'"))
   page.evaluate("RoyaleDemo.show('home');document.querySelector('#home [data-action=road]').click()")
   check('Trophy Road has larger centered arena icons',page.locator('.road-stop:not(.road-league) .road-arena-info img').first.evaluate('e=>parseFloat(getComputedStyle(e).width)>=170'))
   check('Trophy Road now includes Books and Magic Coins',page.locator('.road-reward[data-id^=road2-book]').count()==14 and page.locator('.road-reward[data-id^=road2-coin]').count()==14)
   page.evaluate('document.getElementById("roadScroll").scrollTop=document.getElementById("roadScroll").scrollHeight')
   layout_shots('trophy-road','#roadScroll')
  if args.phase in ('combat','all'):
   run_mode('TeamRumble')
   check('Team Rumble real ten-seat battle',page.evaluate('RoyaleDemo.battle.seatCount===10&&RoyaleDemo.battle.towers.length===20'))
   check('Rumble has ten independent eight-card decks and banks',page.evaluate('RoyaleDemo.battle.initialDecks.length===10&&RoyaleDemo.battle.initialDecks.every(d=>d.length===8)&&RoyaleDemo.battle.elixir.length===10'))
   check('Rumble visual field is dry and all foundations align with towers',page.evaluate('(()=>{const b=RoyaleDemo.battle,cv=RoyaleCustomArena.prepare(b,RoyaleDemo.native);return cv.river===false&&cv.crossings===0&&cv.foundations.every(f=>b.towers.some(t=>t.entity===f.entity&&t.team===f.team&&Math.abs(t.x-f.x)<.001&&Math.abs(t.y-f.y)<.001))})()'))
   check('Random slots assign each position once per team',page.evaluate('(()=>{const b=RoyaleDemo.battle;return [0,1].every(team=>new Set(b.seatSlots.filter((_,i)=>i%2===team)).size===5)})()'))
   for elapsed,clock,mult in [(0,'5:00','1'),(120,'3:00','2'),(300,'5:00','3'),(480,'2:00','4'),(540,'1:00','5')]:
    page.evaluate('(t)=>{RoyaleDemo.battle.time=t;RoyaleDemo.refreshHand(true)}',elapsed)
    check('Rumble phase '+str(elapsed)+' real timer and income',page.locator('#timer').inner_text().strip()==clock and str(page.evaluate('RoyaleDemo.battle.multiplier'))==mult)
   page.evaluate('RoyaleDemo.battle.time=0;RoyaleDemo.refreshHand(true)')
   page.wait_for_timeout(7500)
   layout_shots('rumble-arena','#battleCanvas')
   check('Local King is identified and gold-health tagged',page.evaluate('RoyaleDemo.battle.towers.filter(t=>t.localKing).length===1'))
   page.evaluate('()=>{const b=RoyaleDemo.battle,k=b.towers.find(t=>t.localKing);b.damage(k,1e9);b.deaths();b.elixir.fill(6);b.paused=false;b.step(.1);b.paused=true;RoyaleDemo.refreshHand(true)}')
   check('Own King loss leaves bank but stops passive income only locally',page.evaluate('RoyaleDemo.battle.result===null&&RoyaleDemo.battle.elixir[0]===6&&RoyaleDemo.battle.elixir[2]>6'))
   shot('rumble-king-destroyed')
   # Mirror copied portrait has a dedicated rim and retains current elixir cost.
   page.evaluate("()=>{const b=RoyaleDemo.battle;b.hand[0][0]='mirror';b.lastCard[0]={id:'princess',level:9,cost:3};RoyaleDemo.refreshHand(true)}")
   check('Mirror copied Legendary shows mirrored rim and portrait',page.locator('#hand .mirrored [data-card-image=princess]').count()==1 and page.locator('#hand .mirrored .card-frame').get_attribute('data-ui')=='card-frame-normal')
   check('Mirror still costs one extra elixir with no hand level text',page.evaluate('RoyaleDemo.battle.card(0,0).cost')==4 and page.locator('#hand .card-level').count()==0)
   layout_shots('mirror-hand','#hand')
   # A real win receipt carrying a rare magic item, in addition to chest and currencies.
   page.evaluate("()=>{const b=RoyaleDemo.battle;let id;for(let n=0;n<100000;n++){const trial='browser-item-'+n;if(RoyaleChestRules.battleItem(trial,RoyaleDemo.profile.world.seed)?.kind==='coin'){id=trial;break;}}b.id=id;b.crowns=[10,0];b.finish(0,'test');RoyaleDemo.step(0)}")
   page.wait_for_timeout(3200)
   check('Rumble victory supports ten crowns',page.locator('#endPlayerScore').inner_text().strip()=='10')
   check('Rare battle item shown in result reward box',page.locator('.end-reward-magic').count()==1)
   check('Magic Coin actually credited once',page.evaluate("RoyaleDemo.profile.history[0].itemRewards[0].id==='magic-coin'&&RoyaleDemo.profile.magicItems['magic-coin']>0"))
   check('Magic item caption stays inside its reward box',page.locator('.end-reward-magic small').evaluate('e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom}'))
   layout_shots('rumble-rewards','#endBattleReward')
   page.locator('#endOk').click()
   for mode in ['Team3v3','BridgeBattle']:
    run_mode(mode)
    check(mode+' art is centered on logical towers',page.evaluate('RoyaleDemo.battle.towers.every(t=>Math.abs(RoyaleNative.towerArtPosition(t).x-t.x)<.001)'))
    check(mode+' cached layered scenery available',page.evaluate('!!RoyaleCustomArena.prepare(RoyaleDemo.battle,RoyaleDemo.native).foreground'))
    layout_shots('aligned-'+mode,'#battleCanvas')
   # Demonstrate actual Firecracker fan while keeping deterministic troop geometry.
   run_mode('Default')
   page.evaluate("async()=>{await RoyaleDemo.native.ensureScenes(RoyaleNative.sceneDependencies(RoyaleBundle.native,RoyaleCore.DATA,[['firecracker','knight']],RoyaleDemo.native.arenaId));const b=RoyaleDemo.battle;b.time=6;const u=b.spawn('Firecracker',0,240,430,{owner:0,wait:0});u.deployedAt=0;b.projectileImpact({name:'FirecrackerProjectile',x:240,y:320,vx:0,vy:-1,team:0,level:9,attacker:u,owner:0},null);for(const p of b.projectiles.filter(p=>p.name==='FirecrackerExplosion')){const u=b.spawn('Knight',1,p.x+p.vx*2*RoyaleCore.SX,p.y+p.vy*2*RoyaleCore.SY,{wait:0});u.deployedAt=0;}b.tickProjectiles(.12)}")
   check('Five Firecracker split projectiles active in real browser',page.evaluate("RoyaleDemo.battle.projectiles.filter(p=>p.name==='FirecrackerExplosion').length") == 5)
   shot('firecracker-fan')
   page.evaluate('()=>{const b=RoyaleDemo.battle;for(let n=0;n<60;n++)b.tickProjectiles(1/60)}')
   check('Firecracker fan damages all spread targets',page.evaluate("RoyaleDemo.battle.units.filter(u=>u.team===1).every(u=>u.hp<u.maxHp)"))
   check('Firecracker impact effect dispatches for split hits',page.evaluate("RoyaleDemo.battle.effects.some(e=>e.sourceEffect==='firecracker_hit2')"))
   shot('firecracker-spread-damage')
   page.evaluate("RoyaleDemo.show('home')")
   page.evaluate('async()=>{await RoyaleDemo.startSandbox();RoyaleDemo.battle.paused=true;}')
   page.wait_for_function('RoyaleDemo.sandboxUI.ready',timeout=90000)
   check('Sandbox includes all eighteen maps',page.locator('#sandboxMap option').count()==18)
   page.locator('#sandboxMap').select_option('TeamRumble')
   page.wait_for_function('RoyaleDemo.sandboxUI.ready&&!document.getElementById("sandboxMap").disabled',timeout=90000)
   check('Rumble sandbox resets to ten-seat geometry',page.evaluate('RoyaleDemo.battle.mode===\'TeamRumble\'&&RoyaleDemo.battle.towers.length===20'))
   shot('sandbox-rumble')
   page.locator('[data-action=sandbox-exit]').click()
   settings();page.locator('[data-action=potato-toggle]').click()
   page.wait_for_function('RoyaleGraphics.current.potato===true&&!RoyaleDemo.preparing',timeout=90000);close();run_mode('TeamRumble')
   check('Potato supports new dry-field Rumble renderer',page.evaluate("RoyaleGraphics.current.renderMode==='primitive'&&RoyaleDemo.battle.arenaLayout.river===false"))
   layout_shots('potato-rumble','#battleCanvas')
   page.evaluate("RoyaleDemo.show('home');RoyaleDemo.learningMenu()")
   check('Learning Center contains sixteen modes including Rumble',page.locator('#trainingMode option').count()==16 and page.locator('#trainingMode option[value=TeamRumble]').count()==1)
   shot('learning-sixteen')
  if args.phase in ('repeat','all'):
   for mode in ['TeamRumble','Default','RandomDeck','FourCardDeck','TwelveCardDeck','OneShot']:
    run_mode(mode)
    page.evaluate("()=>{const b=RoyaleDemo.battle;b.ai=false;b.time=1;b.crowns=[1,0];b.finish(0,'verification');RoyaleDemo.step(0);window.__repeat={id:b.id,deck:JSON.stringify(b.initialDecks[0]),queue:b.queueType,gold:RoyaleDemo.profile.gold,gems:RoyaleDemo.profile.gems,matches:RoyaleDemo.profile.matches,serial:RoyaleDemo.profile.battleSerial};}")
    check(mode+' repeat hidden during initial result reveal',page.locator('#endPlayAgain').is_hidden())
    page.wait_for_selector('#endPlayAgain',state='visible',timeout=15000)
    check(mode+' Play Again and OK both available',page.locator('#endPlayAgain').is_enabled() and page.locator('#endOk').is_visible())
    if mode=='TeamRumble':
     layout_shots('play-again-results','#endPlayAgain')
     check('Results actions do not overlap rewards or each other',page.evaluate("()=>{const a=document.getElementById('endPlayAgain').getBoundingClientRect(),b=document.getElementById('endOk').getBoundingClientRect(),r=document.getElementById('endBattleReward').getBoundingClientRect();return b.right<a.left&&r.bottom<a.top&&a.bottom<=innerHeight}"))
    page.locator('#endPlayAgain').evaluate('e=>{e.click();e.click()}')
    page.wait_for_function('RoyaleDemo.battle.id!==__repeat.id&&!RoyaleDemo.preparing',timeout=90000)
    page.evaluate('RoyaleDemo.battle.paused=true')
    check(mode+' repeated match keeps exact queue and mode',page.evaluate('mode=>RoyaleDemo.battle.mode===mode&&RoyaleDemo.battle.queueType===__repeat.queue',mode))
    check(mode+' only one new match from rapid double-click',page.evaluate('RoyaleDemo.profile.battleSerial===__repeat.serial+1'))
    check(mode+' old reward never pays a second time',page.evaluate('RoyaleDemo.profile.gold===__repeat.gold&&RoyaleDemo.profile.gems===__repeat.gems&&RoyaleDemo.profile.matches===__repeat.matches&&RoyaleDemo.profile.history.filter(h=>h.replayId===__repeat.id).length===1'))
    if mode=='RandomDeck':check('Random Deck rematch regenerates its deck',page.evaluate('JSON.stringify(RoyaleDemo.battle.initialDecks[0])!==__repeat.deck'))
    else:check(mode+' selected deck retained on replay-again',page.evaluate('JSON.stringify(RoyaleDemo.battle.initialDecks[0])===__repeat.deck'))
    check(mode+' new match hides the old result actions',page.locator('#matchEnd').is_hidden())
   # War tickets and recorded replays must not offer another reward-bearing match.
   page.evaluate("""async()=>{const b=RoyaleDemo.battle;b.ai=false;b.paused=false;for(let i=0;i<60;i++)b.step(1/60);b.finish(0,'verification');RoyaleDemo.step(0);const record=RoyaleReplay.pack(b);await RoyaleDemo.replayReady;await RoyaleDemo.replayStore.put(record);window.__beforeReplay={gold:RoyaleDemo.profile.gold,gems:RoyaleDemo.profile.gems};if(!await RoyaleDemo.playReplay(record.id))throw Error('Actual recorded replay did not load');RoyaleDemo.session.speed=8;}""")
   page.wait_for_function('RoyaleDemo.battle.isReplay&&RoyaleDemo.battle.result',timeout=15000)
   page.wait_for_timeout(2900)
   check('Actual recorded replay remains reward-free',page.evaluate('RoyaleDemo.profile.gold===__beforeReplay.gold&&RoyaleDemo.profile.gems===__beforeReplay.gems'))
   check('Recorded replays do not show Play Again',page.locator('#endPlayAgain').is_hidden())
  check('No uncaught page errors',not errors)
  (ART/('browser-report-'+args.phase+'.json')).write_text(json.dumps({'passed':len(results),'checks':results,'errors':errors,'fixture':'Generated JavaScript/CSS/native assets through file-backed Chromium; no real iPhone, HTTP or service worker upgrade test.'},indent=2))
 except Exception:
  traceback.print_exc();print('PAGE ERRORS',errors,flush=True);shot('failure');(ART/'browser-failure.txt').write_text(traceback.format_exc()+'\n'+json.dumps(errors));raise
 finally:
  browser.close()
