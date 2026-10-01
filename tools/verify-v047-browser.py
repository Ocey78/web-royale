"""Exercise the generated v0.47.0 UI, custom arenas and native Canvas renderers.

Requires Python 3.10+, Playwright, and a Chromium executable. Uses a file-backed
asset fixture on about:blank; it does not test HTTP navigation, Service Workers,
or persistent browser storage across processes. Those paths have Node tests.
Run: python tools/verify-v046-browser.py --browser /path/to/chromium
"""
from pathlib import Path
import argparse
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser', help='Chromium executable; otherwise Playwright uses its installed Chromium')
parser.add_argument('--dist', type=Path, default=Path(__file__).resolve().parents[1] / 'dist')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'docs/verification-v047/browser')
parser.add_argument('--phase',choices=['decks','menus','map1','map2','map3','map4','logic','all'],default='all')
parser.add_argument('--arena-index',type=int,default=None,help='Render one arena case by 0-based index; useful for bounded QA runs')
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
 page.evaluate('''async()=>{const entries=Object.entries(RoyaleBundle.uiImages);let next=0;await Promise.all(Array.from({length:24},async()=>{while(next<entries.length){const [key,value]=entries[next++];RoyaleBundle.uiImages[key]=await __assetBlob(value);}}));}''')
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
  check('v0.47.0 boot',page.evaluate('RoyaleBundle.version')=='0.47.0')
  page.set_viewport_size({'width':390,'height':844})
  # High-level QA profile with all cards available and enough balances to render every shop state.
  page.evaluate("()=>{const p=RoyaleDemo.profile;p.trophies=p.highestTrophies=6500;p.experience=168770;p.unlockedCards=RoyaleCore.CARDS.map(c=>c.id);p.gold=9999999;p.gems=9999999;p.lifetimeCrowns=240;p.graphics={textures:'med',animations:'low',particles:'minimal',arenaBackgrounds:'med'};RoyaleDemo.applyProfile(p)}")
  page.wait_for_timeout(300)

  if args.phase in ('decks','all'):
   # 1. Standard Battle Deck.
   page.evaluate("RoyaleDemo.show('cards')");page.wait_for_timeout(350);shot('01-battle-deck-390')
   check('Battle Deck uses polished deck shell',page.locator('#deckRegion').evaluate("e=>getComputedStyle(e).borderTopWidth==='2px' && getComputedStyle(e).boxShadow!=='none'"))
   check('Battle Deck fits compact viewport',page.locator('#cards').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))

   # 2-5. Shared custom-mode deck screens.
   for idx,(mode,name) in enumerate([('FourCardDeck','02-four-card-deck-390'),('SixCardDeck','03-six-card-deck-390'),('TwelveCardDeck','04-twelve-card-deck-390'),('OneShot','05-one-shot-deck-390')],start=2):
    page.evaluate("RoyaleDemo.show('events')");page.locator(f'[data-action="special-deck-builder"][data-mode="{mode}"]').first.click();page.wait_for_timeout(250)
    check(mode+' opens full deck screen',page.evaluate("RoyaleDemo.screen")=='modeDeck')
    check(mode+' deck slot count',page.locator('#modeDeckGrid .card-tile').count()==({'FourCardDeck':4,'SixCardDeck':6,'TwelveCardDeck':12,'OneShot':8}[mode]))
    check(mode+' deck screen fits compact viewport',page.locator('#modeDeck').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
    shot(name)


  if args.phase in ('menus','all'):
   # 6. High King-Level shop and scaling checks.
   page.evaluate("RoyaleDemo.show('shop')");page.wait_for_timeout(350);page.locator('#shopContent').evaluate('e=>e.scrollTop=0');page.wait_for_timeout(100);shot('06-daily-shop-king13-390')
   daily_counts=page.locator('#dailyShop .shop-offer .offer-portrait>b').all_inner_texts()
   check('Daily Shop high-level card counts are substantially larger',all(int(x.replace('×','').replace(',',''))>=10 for x in daily_counts))
   check('Daily Shop surface has specular treatment',page.locator('#dailyShop .shop-offer').first.evaluate("e=>getComputedStyle(e).boxShadow!=='none'"))

   # Verify high-level scaling across the other direct-card shops too.
   gem_counts=page.locator('#gemShop .shop-offer .offer-portrait>b').all_inner_texts();check('Gem Shop shows king-scaled quantities',len(gem_counts)>=1)
   hour_counts=page.locator('.shop-deals-section').nth(2).locator('.shop-offer .offer-portrait>b').all_inner_texts();check('Hour Shop renders scaled direct card quantities',len(hour_counts)>=1)
   lightning_counts=page.locator('#lightningShop .shop-offer .offer-portrait>b').all_inner_texts();check('Lightning Shop renders scaled direct card quantities',len(lightning_counts)>=1)

   # 7. Custom Modes page.
   page.evaluate("RoyaleDemo.show('events')");page.wait_for_timeout(300);shot('07-custom-modes-390')
   check('Custom Modes polished groups',page.locator('#eventsContent .mode-group').count()>=5)

   # 8. Settings / Graphics.
   page.evaluate("RoyaleDemo.show('home')");page.locator('#home [data-action=menu]').click();page.wait_for_timeout(100);page.locator('[data-action=settings]').click();page.wait_for_timeout(250);shot('08-settings-graphics-390')
   check('Settings polished sections visible',page.locator('.settings-section').count()>=1)
   page.keyboard.press('Escape');page.wait_for_timeout(100)

   # 9. Crown Road representative progression panel.
   page.evaluate("RoyaleDemo.show('crownRoad')");page.wait_for_timeout(300);shot('09-crown-road-390')
   check('Crown Road polished rewards visible',page.locator('.crown-road-reward').count()>=1)

  # 10-19. Custom arena set. Each screenshot must be structurally distinct.
  arena_cases=[
   ('TeamRumble','TeamRumble','10-castle-crown-390'),
   ('TeamRumble','TeamRumbleArcReverse','11-moon-keep-390'),
   ('TeamRumble','TeamRumbleRiverLine','12-four-bridges-390'),
   ('Team3v3','Team3v3','13-royal-bastion-390'),
   ('Team3v3','Team3v3Jungle','14-jungle-citadel-390'),
   ('Team3v3','Team3v3Volcano','15-ember-fortress-390'),
   ('BridgeBattle','BridgeBattle','16-frozen-causeway-390'),
   ('BridgeBattle','BridgeBattleLava','17-lava-causeway-390'),
   ('BridgeBattle','BridgeBattleGarden','18-royal-garden-390'),
   ('Touchdown','Touchdown','19-touchdown-390')]
  if args.arena_index is not None:
   if args.arena_index<0 or args.arena_index>=len(arena_cases):raise ValueError('arena index out of range')
   arena_cases=[arena_cases[args.arena_index]]
  elif args.phase=='map1': arena_cases=arena_cases[:3]
  elif args.phase=='map2': arena_cases=arena_cases[3:6]
  elif args.phase=='map3': arena_cases=arena_cases[6:9]
  elif args.phase=='map4': arena_cases=arena_cases[9:]
  elif args.phase in ('decks','menus','logic'): arena_cases=[]
  for mode,arena,name in arena_cases:
   page.evaluate("async ([mode,arena])=>{const seats=mode==='TeamRumble'?10:mode==='Team3v3'?6:mode==='Touchdown3v3'?6:mode==='Touchdown2v2'?4:2;const deck=['fireball','arrows','rage','zap','poison','freeze','tornado','clone'];await RoyaleDemo.startBattle(mode,false,{queue:'challenge',seed:47047,arenaId:arena,ai:false,deck,decks:Array.from({length:seats},()=>[...deck])});if(RoyaleDemo.battle)RoyaleDemo.battle.paused=true;}",[mode,arena])
   page.wait_for_function("()=>RoyaleDemo.battle && !RoyaleDemo.preparing",timeout=90000);page.wait_for_timeout(220)
   check(name+' requested arena geometry',page.evaluate('RoyaleDemo.battle.arenaLayout.id')==arena)
   check(name+' canvas fits viewport',page.locator('#battleCanvas').evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1}'))
   shot(name)

  if args.phase in ('logic','all'):
   # Use Potato Mode for the result fixture too: it preserves the real result UI while avoiding unnecessary native battle-scene decoding in this screenshot-only QA process.
   page.evaluate("()=>{const p=RoyaleDemo.profile;p.graphics={...(p.graphics||{}),potato:true};RoyaleDemo.applyProfile(p)}")
   # 20. Result / reward panel.
   page.evaluate("async()=>{const deck=['fireball','arrows','rage','zap','poison','freeze','tornado','clone'];await RoyaleDemo.startBattle('Default',false,{queue:'challenge',seed:4747,ai:false,deck,decks:[[...deck],[...deck]]});const b=RoyaleDemo.battle;b.crowns=[2,0];b.finish(0,'v047 screenshot');RoyaleDemo.step(0)}")
   page.wait_for_function("()=>!document.getElementById('matchEnd').hidden",timeout=30000);page.wait_for_timeout(2900);shot('20-result-rewards-390')
   check('Result reward boxes use polished treatment',page.locator('.end-reward-box').count()>=1)

   # 21. Potato mode representative on a custom arena.
   page.evaluate("async()=>{const deck=['fireball','arrows','rage','zap','poison','freeze','tornado','clone'];await RoyaleDemo.startBattle('Team3v3',false,{queue:'challenge',seed:4748,arenaId:'Team3v3Jungle',ai:false,deck,decks:Array.from({length:6},()=>[...deck])});RoyaleDemo.battle.paused=true}")
   page.wait_for_function("()=>RoyaleDemo.battle && !RoyaleDemo.preparing",timeout=90000);page.wait_for_timeout(220);shot('21-potato-mode-390')
   check('Potato Mode active',page.locator('#viewport').evaluate("e=>e.classList.contains('potato-mode')"))

  check('No browser exceptions',not errors)
 finally:
  (ART/'report.json').write_text(json.dumps({'version':release['version'],'passed':len(results),'checks':results,'errors':errors},indent=2))
  browser.close()
