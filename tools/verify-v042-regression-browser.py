"""Exercise the generated v0.42.0 UI and native Canvas renderers.

Requires Python 3.10+, Playwright, and a Chromium executable. Uses a file-backed
asset fixture on about:blank; it does not test HTTP navigation, Service Workers,
or persistent browser storage across processes. Those paths have Node tests.
Run: python tools/verify-v042-regression-browser.py --browser /path/to/chromium
"""
from pathlib import Path
import argparse
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser', help='Chromium executable; otherwise Playwright uses its installed Chromium')
parser.add_argument('--dist', type=Path, default=Path(__file__).resolve().parents[1] / 'dist')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'docs/verification-v042/regression')
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
  check('Generated build version is 0.42.0',page.evaluate('RoyaleBundle.version')=='0.42.0')
  # Same eight cards as the supplied clipping screenshot; keep baseline for comparison.
  page.evaluate("""()=>{const deck=['balloon','baby-dragon','inferno-tower','skeleton-army','wizard','zap','lumberjack','arrows'];RoyaleDemo.applyProfile({...RoyaleDemo.profile,trophies:6000,highestTrophies:6000,unlockedCards:RoyaleCore.CARDS.map(c=>c.id),decks:[deck],cardLevels:{balloon:6,'baby-dragon':7,'inferno-tower':5,'skeleton-army':6,wizard:3,zap:6,lumberjack:9,arrows:5},copies:{balloon:1,'baby-dragon':0,'inferno-tower':10,'skeleton-army':2,wizard:5,zap:82,lumberjack:1,arrows:11}});RoyaleDemo.show('cards');RoyaleDemo.cardSection('decks');}""")
  page.wait_for_timeout(350)
  for width,height in [(1280,1040),(390,844)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(200)
   shot('deck-'+str(width))
   check('Deck cards fit horizontally at '+str(width),page.evaluate("[...document.querySelectorAll('#deckGrid .card-tile')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})"))
   check('Deck frame and portrait share native aspect at '+str(width),page.evaluate("[...document.querySelectorAll('#deckGrid .card-visual')].every(e=>{const r=e.getBoundingClientRect(),im=e.querySelector('.card-frame');return Math.abs(r.width/r.height-im.naturalWidth/im.naturalHeight)<.003})"))
   check('Level labels remain inside their frames at '+str(width),page.evaluate("[...document.querySelectorAll('#deckGrid .card-level')].every(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return r.left>=p.left&&r.right<=p.right+1&&r.top>=p.top&&r.bottom<=p.bottom+1})"))

  page.evaluate("RoyaleDemo.librarySection('cards')");page.wait_for_timeout(250)
  check('All collection cards share their frame aspect',page.evaluate("[...document.querySelectorAll('#collectionGrid .card-visual')].every(e=>{const r=e.getBoundingClientRect(),im=e.querySelector('.card-frame');return Math.abs(r.width/r.height-im.naturalWidth/im.naturalHeight)<.003})"))
  shot('collection-mobile')
  page.evaluate("RoyaleDemo.show('trophyRoad')")
  # The actual home Trophy Road action renders the road; simply show() alone doesn't.
  page.evaluate("RoyaleDemo.show('home');document.querySelector('[data-action=road]').click()")
  check('Trophy Road has no wild-card inventory shortcut',page.locator('#trophyRoad [data-action="road-inventory"]').count()==0)
  check('Trophy Road still has claimable reward tiles',page.locator('#trophyRoad [data-action="road-reward"]').count()>0)
  shot('trophy-road-mobile')
  page.evaluate("RoyaleDemo.show('home')")
  # Current release economy is exercised through real shop buttons and saved state.
  page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,gems:10000,gold:20000,gemShop:{rotation:7,arenaNumber:14,purchased:[]}});RoyaleDemo.show('shop')")
  check('Runtime emote metadata and purchase catalogue both use 50 gems',page.evaluate("RoyaleBundle.emotes.entries.filter(e=>!e.free).every(e=>e.cost===50)&&RoyaleCosmetics.emotes.filter(e=>!e.free).every(e=>e.cost===50)"))
  check('Six gem offers and two-purchase counter retained',page.locator('#gemShop .shop-offer').count()==6 and page.locator('#gemShopProgress').inner_text()=='0 / 2')
  check('Gem Shop shows exact rolled quantity and price in each slot',page.evaluate("()=>{const offers=RoyaleEconomy.gemOffers(RoyaleDemo.profile);return [...document.querySelectorAll('#gemShop .shop-offer')].every((e,i)=>e.querySelector('.offer-portrait b').textContent==='×'+offers[i].quantity&&e.querySelector('.offer-price strong').textContent===String(offers[i].price))}"))
  check('All rolled Gem Shop bundles match the larger requested ranges',page.evaluate("RoyaleEconomy.gemOffers(RoyaleDemo.profile).every(o=>{const r={Common:[150,500],Rare:[50,100],Epic:[10,15],Legendary:[2,3]}[o.rarity];return o.quantity>=r[0]&&o.quantity<=r[1]})"))
  page.locator('#gemShop').scroll_into_view_if_needed();shot('gem-shop-mobile')
  initial=page.evaluate('({profile:JSON.parse(JSON.stringify(RoyaleDemo.profile)),offers:RoyaleEconomy.gemOffers(RoyaleDemo.profile)})')
  first,second=initial['offers'][:2]
  page.locator('#gemShop [data-action="buy-gem-card"][data-index="0"]').click();close()
  check('Gem purchase one grants advertised quantity and price',page.evaluate('(id)=>RoyaleDemo.profile.copies[id]',first['id'])==initial['profile']['copies'][first['id']]+first['quantity'] and page.evaluate('RoyaleDemo.profile.gems')==initial['profile']['gems']-first['price'])
  page.evaluate("RoyaleDemo.applyProfile(JSON.parse(localStorage.getItem('web-royale-classic-v4')));RoyaleDemo.renderShop()")
  check('Reload keeps quantities and 1 / 2 purchase progress',page.evaluate('RoyaleEconomy.gemOffers(RoyaleDemo.profile)')==initial['offers'] and page.locator('#gemShopProgress').inner_text()=='1 / 2')
  page.locator('#gemShop [data-action="buy-gem-card"][data-index="1"]').click();close()
  check('Gem purchase two grants old rolled bundle before refreshing',page.evaluate('(id)=>RoyaleDemo.profile.copies[id]',second['id'])==initial['profile']['copies'][second['id']]+second['quantity'] and page.evaluate('RoyaleDemo.profile.gemShop.rotation')==8 and page.locator('#gemShopProgress').inner_text()=='0 / 2')
  check('Unrelated timed shop quantities are unchanged',page.evaluate("RoyaleEconomy.dailyOffers(Date.now(),RoyaleDemo.profile).slice(3).every(o=>o.quantity===({Common:100,Rare:25,Epic:5,Legendary:5})[o.rarity])&&RoyaleEconomy.offers(Date.now(),RoyaleDemo.profile).length===12&&RoyaleEconomy.lightningOffers(Date.now(),RoyaleDemo.profile).length===3"))
  page.locator('[data-action="gem-shop-info"]').click()
  check('Gem Shop information explains the updated bundle ranges','150–500' in page.locator('#modalPanel').inner_text() and '2–3' in page.locator('#modalPanel').inner_text());close()

  # Shop and detail views must agree with actual cosmetic charges.
  page.locator('#emoteShop').scroll_into_view_if_needed()
  check('Every offered emote shows 50 gems',page.locator('#emoteShop .offer-price strong').all_text_contents()==['50']*3)
  emote=page.locator('#emoteShop [data-action="emote-preview"]').first.get_attribute('data-id')
  page.locator('#emoteShop [data-action="emote-preview"]').first.click()
  check('Emote preview purchase button shows 50','50' in page.locator('#modalPanel [data-action="buy-emote"]').inner_text())
  before=page.evaluate('RoyaleDemo.profile.gems');page.locator('#modalPanel [data-action="buy-emote"]').click()
  check('Emote UI deducts 50 and saves ownership',page.evaluate('RoyaleDemo.profile.gems')==before-50 and page.evaluate('(id)=>RoyaleDemo.profile.ownedEmotes.includes(id)',emote))
  check('Purchased emote cannot be bought twice',page.locator('#emoteShop [data-action="buy-emote"][data-id="'+emote+'"]').is_disabled())
  page.locator('#emoteShop').scroll_into_view_if_needed();shot('emote-shop-mobile')
  page.locator('#towerSkinShop').scroll_into_view_if_needed()
  check('Every offered tower skin shows 100 gems',page.locator('#towerSkinShop .offer-price strong').all_text_contents()==['100']*3)
  skin=page.locator('#towerSkinShop [data-action="tower-skin-preview"]').first.get_attribute('data-id')
  page.locator('#towerSkinShop [data-action="tower-skin-preview"]').first.click()
  check('Tower detail purchase button shows 100','100' in page.locator('#modalPanel [data-action="buy-tower-skin"]').inner_text())
  before=page.evaluate('RoyaleDemo.profile.gems');page.locator('#modalPanel [data-action="buy-tower-skin"]').click()
  check('Tower skin UI deducts 100 and saves ownership',page.evaluate('RoyaleDemo.profile.gems')==before-100 and page.evaluate('(id)=>RoyaleDemo.profile.ownedTowerSkins.includes(id)',skin))
  check('Purchased tower skin cannot be bought twice',page.locator('#towerSkinShop [data-action="buy-tower-skin"][data-id="'+skin+'"]').is_disabled())
  page.locator('#towerSkinShop').scroll_into_view_if_needed();shot('tower-skins-mobile')

  check('Treasure Chests renders all six kinds and correct prices',page.locator('.shop-chest-section [data-action="buy-chest"]').evaluate_all('(es)=>es.map(e=>[e.dataset.kind,Number(e.querySelector("strong").textContent)])')==[['silver',15],['gold',35],['magic',50],['giant',65],['epic',80],['legendary',100]])
  for width,height in [(1280,1040),(390,844),(320,568)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(200);page.locator('.shop-chest-section').scroll_into_view_if_needed()
   check('Chest grid fits horizontally at '+str(width),page.locator('.shop-chest-section .chest-offer').evaluate_all('(es)=>es.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})'))
   check('All six chest images decode at '+str(width),page.locator('.shop-chest-section .chest-offer>img').evaluate_all('(es)=>es.every(e=>e.complete&&e.naturalWidth>0)'))
   shot('chest-shop-'+str(width))
  page.set_viewport_size({'width':390,'height':844})
  for kind,price,opening in [('magic',50,'chest_open_magical'),('giant',65,'chest_open_giant'),('epic',80,'chest_open_epic'),('legendary',100,'chest_open_legendary')]:
   before=page.evaluate('({gems:RoyaleDemo.profile.gems,copies:{...RoyaleDemo.profile.copies},chests:JSON.stringify(RoyaleDemo.profile.chests),gemShop:JSON.stringify(RoyaleDemo.profile.gemShop)})')
   page.locator('.shop-chest-section [data-action="buy-chest"][data-kind="'+kind+'"]').click()
   page.wait_for_function("RoyaleDemo.chestOpening.sequence?.stage==='closed'",timeout=90000)
   check(kind+': purchase deducted the advertised gems',page.evaluate('RoyaleDemo.profile.gems')==before['gems']-price)
   check(kind+': opening uses its original chest model',page.evaluate('RoyaleDemo.chestOpening.sequence.openingExport')==opening)
   check(kind+': opening has actual card rewards',page.evaluate("RoyaleDemo.chestOpening.sequence.entries.some(e=>e.kind==='card'&&e.count>0)"))
   check(kind+': shop chest does not take a battle chest slot',page.evaluate('JSON.stringify(RoyaleDemo.profile.chests)')==before['chests'])
   check(kind+': buying a chest does not advance the Gem Shop counter',page.evaluate('JSON.stringify(RoyaleDemo.profile.gemShop)')==before['gemShop'])
   page.wait_for_timeout(120);shot('chest-'+kind+'-closed-mobile')
   page.locator('.chest-skip').click()
   check(kind+': skip shows the already credited summary',page.locator('.chest-summary').is_visible())
   awarded=page.evaluate('JSON.stringify({gems:RoyaleDemo.profile.gems,copies:RoyaleDemo.profile.copies})')
   page.locator('.chest-tap').click()
   check(kind+': closing cannot grant the chest a second time',page.evaluate('JSON.stringify({gems:RoyaleDemo.profile.gems,copies:RoyaleDemo.profile.copies})')==awarded)
  saved=page.evaluate('JSON.stringify(RoyaleDemo.profile)')
  page.evaluate('RoyaleDemo.applyProfile({...RoyaleDemo.profile,trophies:0,highestTrophies:0});RoyaleDemo.show("shop")')
  check('Early-arena Legendary chest is locked rather than empty',page.locator('.shop-chest-section [data-kind="legendary"]').is_disabled())
  page.evaluate('(saved)=>{RoyaleDemo.applyProfile(JSON.parse(saved));RoyaleDemo.show("home")}',saved)

  # Every case settles through the real application path, not an injected reward.
  cases=[('both',14,0,'trophy-road',False),('gold',2,0,'trophy-road',False),('gems',4,0,'trophy-road',False),('between-tiers',16,0,'trophy-road',False),('high-tier',59,0,'trophy-road',False),('ordinary',0,0,'trophy-road',False),('full-slots',14,0,'trophy-road',True),('loss',14,1,'trophy-road',False),('draw',14,-1,'trophy-road',False),('nonranked',14,0,'challenge',False),('practice',14,0,'friendly',False)]
  for name,streak,winner,queue,full in cases:
   page.evaluate("RoyaleDemo.show('home')")
   page.evaluate("""([streak,full])=>{const p=RoyaleDemo.profile;RoyaleDemo.applyProfile({...p,winStreak:streak,winStreakBonus:0,gold:1000,gems:100,chests:full?Array.from({length:4},(_,i)=>({id:'older-'+i,kind:'silver',winsProgress:0})):[]});}""",[streak,full])
   before=page.evaluate('({gold:RoyaleDemo.profile.gold,gems:RoyaleDemo.profile.gems})')
   page.evaluate("""async queue=>{await RoyaleDemo.startBattle('Default',false,{queue});RoyaleDemo.battle.paused=true;}""",queue)
   page.wait_for_function("RoyaleDemo.battle && !RoyaleDemo.preparing",timeout=90000)
   page.evaluate("""winner=>{const b=RoyaleDemo.battle;b.crowns=winner===0?[3,1]:winner===1?[0,3]:[0,0];b.finish(winner,'verification');RoyaleDemo.step(0);}""",winner)
   page.wait_for_timeout(3000)
   after=page.evaluate('({gold:RoyaleDemo.profile.gold,gems:RoyaleDemo.profile.gems,record:RoyaleDemo.profile.history[0]})')
   gold=after['gold']-before['gold'];gems=after['gems']-before['gems']
   panel=page.locator('#endBattleReward')
   if queue=='friendly':
    check('Practice has no normal reward panel',panel.is_hidden() and gold==0 and gems==0)
    page.locator('#endOk').click();continue
   check(name+': credited gold equals saved receipt',after['record']['goldEarned']==gold)
   check(name+': gold box shows exact credited total',page.locator('[data-reward-kind="gold"]').get_attribute('data-amount')==str(gold))
   if gems>0:
    check(name+': gem box shows exact credited gems',page.locator('[data-reward-kind="gems"]').get_attribute('data-amount')==str(gems))
   else:check(name+': zero-gem box omitted',page.locator('[data-reward-kind="gems"]').count()==0)
   check(name+': chest box reflects actual chest drop',page.locator('[data-reward-kind="chest"]').count()==(1 if winner==0 and not full else 0))
   if queue=='trophy-road' and winner==0:
    check(name+': correct gold threshold',50+100*((streak+1)//3)<=gold<=50+300*((streak+1)//3))
    check(name+': correct gem threshold',(streak+1)//5<=gems<=10*((streak+1)//5))
   else:check(name+': no ineligible streak currency',gold==(50 if winner==0 else 10 if winner==1 else 20) and gems==0)
   check(name+': no extra streak sentence in reward panel','streak' not in panel.inner_text().lower())
   balance=page.evaluate('JSON.stringify({gold:RoyaleDemo.profile.gold,gems:RoyaleDemo.profile.gems})')
   page.evaluate('RoyaleDemo.beginEndFlow();RoyaleDemo.beginEndFlow()');page.wait_for_timeout(2900)
   check(name+': repeated result drawing cannot recredit',page.evaluate('JSON.stringify({gold:RoyaleDemo.profile.gold,gems:RoyaleDemo.profile.gems})')==balance)
   for width,height in ([(1280,1040),(390,844),(320,568)] if name in ['both','high-tier'] else [(390,844)]):
    page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(250)
    check(name+': boxes fit screen at '+str(width),page.evaluate("""()=>{const panel=document.getElementById('endBattleReward').getBoundingClientRect(),boxes=[...document.querySelectorAll('.end-reward-box')].map(e=>e.getBoundingClientRect()),ok=document.getElementById('endOk').getBoundingClientRect();return panel.left>=0&&panel.right<=innerWidth+1&&panel.bottom<ok.top&&boxes.every((r,i)=>r.left>=panel.left&&r.right<=panel.right&&r.top>=panel.top&&r.bottom<=panel.bottom&&(i===0||r.left>=boxes[i-1].right))}"""))
    check(name+': all reward icons decoded at '+str(width),page.locator('.end-reward-box img').evaluate_all('(es)=>es.every(e=>e.complete&&e.naturalWidth>0)'))
    shot('result-'+name+'-'+str(width))
   check(name+': OK enabled',page.locator('#endOk').is_visible())
   page.locator('#endOk').click()
   check(name+': OK returns home',page.evaluate('RoyaleDemo.screen')=='home')
  check('No uncaught application errors',errors==[])
  (ART/'browser-report.json').write_text(json.dumps({'checks':results,'count':len(results),'errors':errors,'transport':'File-backed generated release on about:blank; no live HTTP/Safari/worker upgrade test'},indent=2))
 finally:
  (ART/'browser-progress.json').write_text(json.dumps({'checks':results,'count':len(results),'errors':errors},indent=2))
  browser.close()
