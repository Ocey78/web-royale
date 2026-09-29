"""Exercise the generated v0.37.0 UI and native Canvas renderers.

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
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'docs/verification-v037')
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
 results=[]
 def check(name,condition):
  assert condition,name
  results.append(name);print('PASS',name,flush=True)
 def shot(name):page.screenshot(path=str(ART/(name+'.png')))
 def close():page.keyboard.press('Escape')
 try:
  page.wait_for_function("window.RoyaleDemo && document.getElementById('loading').classList.contains('hidden')",timeout=180000)
  check('Generated release is v0.37.0',page.evaluate('RoyaleBundle.version')=='0.37.0')
  check('Sandbox removed from home',page.locator('#home [data-action="sandbox"]').count()==0)
  page.evaluate("RoyaleDemo.show('events')")
  check('Sandbox moved into Other Modes',page.locator('#events [data-action="sandbox"]').count()==1)
  check('Four Card and Random Deck modes each have a Play button',page.locator('#events [data-action="four-card-builder"]').count()==1 and page.locator('#events [data-action="random-mode"]').count()==1)
  shot('other-modes-desktop')
  # Operate the real deck manager controls; source-level checks cover min/max and migration.
  page.evaluate("RoyaleDemo.show('cards');window.__originalDecks=JSON.stringify(RoyaleDemo.profile.decks)")
  original=page.evaluate('RoyaleDemo.profile.decks.length')
  page.locator('[data-action="add-deck"]').click()
  check('Add deck creates and selects a saved deck',page.evaluate('RoyaleDemo.profile.decks.length')==original+1 and page.evaluate('RoyaleDemo.profile.activeDeck')==original)
  page.locator('[data-action="deck-options"]').click();page.locator('[data-action="remove-deck"]').click()
  check('Removing deck requires confirmation',page.locator('[data-action="confirm-remove-deck"]').count()==1)
  page.locator('[data-action="confirm-remove-deck"]').click()
  check('Deletion preserves all existing decks',page.evaluate('JSON.stringify(RoyaleDemo.profile.decks)===window.__originalDecks'))
  for i in range(original,10):page.locator('[data-action="add-deck"]').click()
  check('Ten decks supported and add button disabled at ten',page.evaluate('RoyaleDemo.profile.decks.length')==10 and page.locator('[data-action="add-deck"]').is_disabled())
  check('Tenth deck is selectable',page.locator('[data-action="deck"][data-index="9"]').get_attribute('aria-pressed')=='true')
  check('Deck library written to existing save key',page.evaluate("JSON.parse(localStorage.getItem('web-royale-classic-v4')).decks.length===10"))
  shot('deck-management-desktop')
  # Settings remains four categories, with a fourth Full particle option.
  page.evaluate("RoyaleDemo.show('home');document.querySelector('[data-action=menu]').click()")
  page.locator('#modalPanel [data-action="settings"]').click()
  check('Four graphics categories retained',page.locator('[data-graphics]').count()==4)
  page.locator('[data-graphics="particles"]').select_option('full')
  check('Full particles applies full frame budget immediately',page.evaluate("RoyaleGraphics.current.particles==='full' && RoyaleGraphics.current.frameParticles===850"))
  check('Full particles persists in saved profile',page.evaluate("JSON.parse(localStorage.getItem('web-royale-classic-v4')).graphics.particles==='full'"))
  page.locator('.graphics-settings').scroll_into_view_if_needed();shot('graphics-full-desktop');close()
  # Three free offers, six paid offers, separate lightning/hour shops.
  page.evaluate("RoyaleDemo.show('shop')")
  check('Daily Shop exactly nine slots',page.locator('#dailyShop .shop-offer').count()==9)
  check('Daily Shop top three are free',page.locator('#dailyShop [data-free-slot]').count()==3 and all(x=='Free' for x in page.locator('#dailyShop [data-free-slot] button').all_text_contents()))
  check('Daily Shop bottom six are paid cards',page.locator('#dailyShop .offer-price').count()==6)
  check('Hour Shop still has twelve slots',page.locator('.shop-deals-section').nth(1).locator('.shop-offer').count()==12)
  check('Lightning Shop still has three slots',page.locator('#lightningShop .shop-offer').count()==3)
  shot('daily-shop-desktop')
  gold=page.evaluate('RoyaleDemo.profile.gold')
  page.locator('#dailyShop [data-index="0"][data-action="daily-shop-offer"]').click()
  page.wait_for_function("RoyaleDemo.chestOpening.sequence?.stage==='closed'",timeout=90000)
  gained=page.evaluate('RoyaleDemo.profile.gold')-gold
  check('Free Gold Chest grants 100–10000 gold in increments of ten',100<=gained<=10000 and gained%10==0)
  page.locator('.chest-skip').click();check('Gold chest uses actual reward summary',page.locator('.chest-summary').is_visible())
  page.locator('.chest-tap').click();page.evaluate('RoyaleDemo.renderShop()')
  check('Collected free Gold Chest cannot be claimed again',page.locator('#dailyShop [data-index="0"][data-action="daily-shop-offer"]').is_disabled())
  gems=page.evaluate('RoyaleDemo.profile.gems')
  page.locator('#dailyShop [data-index="1"][data-action="daily-shop-offer"]').click()
  page.wait_for_function("RoyaleDemo.chestOpening.sequence?.stage==='closed'",timeout=90000)
  gained=page.evaluate('RoyaleDemo.profile.gems')-gems
  check('Free Gem Chest grants 5–250 gems in increments of five',5<=gained<=250 and gained%5==0)
  check('Gem Chest uses dedicated recolored native scene',page.evaluate("RoyaleDemo.native.scenes.gem_chest.data.textures[0].file.includes('gem-chest-opening')"))
  shot('gem-chest-closed-desktop')
  page.locator('.chest-tap').click();page.wait_for_timeout(450);shot('gem-chest-opening-desktop')
  page.locator('.chest-skip').click();check('Gem reward card amount matches credited balance',str(gained) in page.locator('.chest-summary').inner_text())
  page.locator('.chest-tap').click();page.evaluate('RoyaleDemo.renderShop()')
  before=page.evaluate('JSON.stringify(RoyaleDemo.profile.wildcards)')
  page.locator('#dailyShop [data-index="2"][data-action="daily-shop-offer"]').click()
  check('Free Wild Cards credited to profile',page.evaluate('JSON.stringify(RoyaleDemo.profile.wildcards)')!=before)
  close();page.evaluate('RoyaleDemo.renderShop()')
  check('All three free claims stay collected',page.locator('#dailyShop [data-free-slot] button:disabled').count()==3)
  check('Claim receipts stored with saved profile',page.evaluate("Object.keys(JSON.parse(localStorage.getItem('web-royale-classic-v4')).dailyPurchases).length===3"))
  # Phone shop geometry and persistent dedicated deck editor.
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(250);shot('daily-shop-mobile')
  check('Daily Shop columns remain inside phone viewport',page.evaluate("[...document.querySelectorAll('#dailyShop .shop-offer')].every(e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1})"))
  page.evaluate("RoyaleDemo.show('events')");page.locator('[data-action="four-card-builder"]').click()
  check('Four-card builder has exactly four slots',page.locator('.four-card-slot').count()==4)
  page.locator('.four-card-slot[data-index="0"]').click();page.locator('[data-action="four-card-pick"][data-id="musketeer"]').click()
  check('Four-card selection updates saved deck',page.evaluate("RoyaleDemo.profile.fourCardDeck[0]==='musketeer'"))
  check('Four-card builder leaves normal deck library alone',page.evaluate('RoyaleDemo.profile.decks.length===10 && RoyaleDemo.profile.decks.every(d=>d.length===8)'))
  selected=page.evaluate('JSON.stringify(RoyaleDemo.profile.fourCardDeck)');close();page.locator('[data-action="four-card-builder"]').click()
  check('Four-card builder remembers last selection when reopened',page.evaluate('JSON.stringify(RoyaleDemo.profile.fourCardDeck)')==selected)
  check('Four-card choice persisted under original save key',page.evaluate("JSON.stringify(JSON.parse(localStorage.getItem('web-royale-classic-v4')).fourCardDeck)")==selected)
  shot('four-card-builder-mobile');page.set_viewport_size({'width':1280,'height':1040});page.wait_for_timeout(200);shot('four-card-builder-desktop')
  page.locator('[data-action="four-card-play"]').click()
  page.wait_for_function("RoyaleDemo.battle?.mode==='FourCardDeck' && !RoyaleDemo.preparing",timeout=90000)
  page.evaluate('RoyaleDemo.battle.paused=true')
  check('Both combatants receive four cards and no next-card queues',page.evaluate('RoyaleDemo.battle.initialDecks.every(d=>d.length===4)&&RoyaleDemo.battle.queue.every(d=>d.length===0)'))
  check('Hand no longer contains level labels',page.locator('#hand .hand-level').count()==0)
  check('Four-card mode hides Next preview',page.locator('.next-card').is_hidden())
  check('Four-card mode is level nine and non-ranked',page.evaluate("RoyaleDemo.battle.queueType==='challenge' && RoyaleDemo.battle.kingLevels.every(x=>x===9)"))
  check('Playing four-card mode retains its four-card hand',page.evaluate("()=>{const b=RoyaleDemo.battle,id=b.hand[0][0];b.paused=false;b.elixir[0]=10;const r=b.deploy(0,0,240,480);return r.ok&&b.hand[0][0]===id&&b.queue[0].length===0}"))
  page.evaluate('RoyaleDemo.battle.paused=false;RoyaleDemo.step(15);RoyaleDemo.battle.paused=true')
  check('AI handles four-card matches without undefined cards',page.evaluate("RoyaleDemo.battle.hand.flat().every(id=>!!RoyaleCore.CARD_BY_ID[id]) && RoyaleDemo.battle.units.some(u=>u.team===1)"))
  page.wait_for_timeout(300);shot('four-card-battle-desktop')
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300);shot('four-card-battle-mobile')
  # Real match result path and its award receipt; all health widgets are rendered here.
  trophies=page.evaluate('RoyaleDemo.profile.trophies')
  page.evaluate("RoyaleDemo.battle.crowns=[3,1];RoyaleDemo.battle.finish(0,'qa');RoyaleDemo.step(0)")
  page.wait_for_timeout(2950)
  check('Faster OK visible shortly after 2.65 seconds',page.locator('#endOk').is_visible() and float(page.locator('#endOk').evaluate('(e)=>getComputedStyle(e).opacity'))>.9)
  check('Non-ranked win leaves trophies unchanged',page.evaluate('RoyaleDemo.profile.trophies')==trophies)
  check('Result rewards reflect actual chest and gold',page.locator('#endBattleReward').is_visible() and '+50' in page.locator('#endBattleReward').inner_text())
  shot('result-win-mobile');page.set_viewport_size({'width':1280,'height':1040});page.wait_for_timeout(200);shot('result-win-desktop')
  page.locator('#endOk').click();check('OK returns to home',page.evaluate('RoyaleDemo.screen')=='home')
  # Generate Random Deck twice with different seeds and leave saved decks untouched.
  page.evaluate("window.__decksBeforeRandom=JSON.stringify(RoyaleDemo.profile.decks)")
  page.evaluate("async()=>{await RoyaleDemo.startBattle('RandomDeck',false,{queue:'challenge',seed:931});RoyaleDemo.battle.paused=true;}")
  check('Random Deck creates eight unique cards on both sides',page.evaluate('RoyaleDemo.battle.initialDecks.every(d=>d.length===8&&new Set(d).size===8)'))
  check('Random Deck restores normal Next preview',page.locator('.next-card').is_visible())
  deck=page.evaluate('JSON.stringify(RoyaleDemo.battle.initialDecks[0])')
  page.evaluate("RoyaleDemo.show('home')")
  page.evaluate("async()=>{await RoyaleDemo.startBattle('RandomDeck',false,{queue:'challenge',seed:1831});RoyaleDemo.battle.paused=true;}")
  check('Random Deck rerolls for next match',page.evaluate('JSON.stringify(RoyaleDemo.battle.initialDecks[0])')!=deck)
  check('Random Deck never overwrites saved decks',page.evaluate('JSON.stringify(RoyaleDemo.profile.decks)===window.__decksBeforeRandom'))
  page.evaluate("RoyaleDemo.battle.crowns=[0,3];RoyaleDemo.battle.finish(1,'qa');RoyaleDemo.step(0)");page.wait_for_timeout(2900);shot('result-loss-desktop')
  page.locator('#endOk').click()
  # Normal ranked mode retained, including troop levels/Princess HP versus hidden King level.
  page.evaluate('async()=>{await RoyaleDemo.startBattle();RoyaleDemo.battle.paused=true;}')
  page.wait_for_timeout(1200);shot('normal-battle-health-desktop')
  check('Normal battle remains eight cards with four next cards',page.evaluate('RoyaleDemo.battle.initialDecks.every(d=>d.length===8)&&RoyaleDemo.battle.queue.every(d=>d.length===4)'))
  page.evaluate("RoyaleDemo.battle.crowns=[1,0];RoyaleDemo.battle.finish(0,'qa');RoyaleDemo.step(0)");page.wait_for_timeout(2900)
  check('Ranked result shows trophy gain without extra streak sentence',page.locator('#endTrophyReward').is_visible() and 'streak' not in page.locator('#endTrophyReward').inner_text().lower())
  shot('result-ranked-desktop')
  page.locator('#endOk').click()
  page.evaluate('async()=>{await RoyaleDemo.startBattle();RoyaleDemo.battle.paused=true;}')
  page.evaluate("RoyaleDemo.battle.crowns=[0,0];RoyaleDemo.battle.finish(-1,'qa');RoyaleDemo.step(0)");page.wait_for_timeout(2900);shot('result-draw-desktop')
  check('Draw has a visible label and working OK',page.locator('#endWinnerDraw').is_visible() and page.locator('#endOk').is_visible())
  check('No uncaught application errors',not errors)
  (ART/'browser-report.json').write_text(json.dumps({'passed':len(results),'checks':results,'errors':errors,'environment':'Chromium desktop and 390×844 viewport; file-backed Canvas/DOM fixture; HTTP navigation blocked by environment policy; not physical iPhone testing'},indent=2))
  print('ALL PASSED',len(results),flush=True)
 except Exception as e:
  (ART/'browser-report.json').write_text(json.dumps({'passed':len(results),'checks':results,'errors':errors,'failure':str(e)},indent=2));print('FAIL',str(e),errors,flush=True)
  try:shot('qa-error')
  except Exception:pass
  raise
 finally:browser.close()
