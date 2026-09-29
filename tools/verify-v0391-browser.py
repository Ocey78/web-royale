"""Exercise the generated v0.39.1 UI and native Canvas renderers.

Requires Python 3.10+, Playwright, and a Chromium executable. Uses a file-backed
asset fixture on about:blank; it does not test HTTP navigation, Service Workers,
or persistent browser storage across processes. Those paths have Node tests.
Run: python tools/verify-v0391-browser.py --browser /path/to/chromium
"""
from pathlib import Path
import argparse
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser', help='Chromium executable; otherwise Playwright uses its installed Chromium')
parser.add_argument('--dist', type=Path, default=Path(__file__).resolve().parents[1] / 'dist')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'docs/verification-v0391')
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
  check('Generated build version is 0.39.1',page.evaluate('RoyaleBundle.version')=='0.39.1')
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
  # Every case settles through the real application path, not an injected reward.
  cases=[('both',14,0,'trophy-road',False),('gold',2,0,'trophy-road',False),('gems',4,0,'trophy-road',False),('ordinary',0,0,'trophy-road',False),('full-slots',14,0,'trophy-road',True),('loss',14,1,'trophy-road',False),('draw',14,-1,'trophy-road',False),('nonranked',14,0,'challenge',False),('practice',14,0,'friendly',False)]
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
    check(name+': correct gold threshold',150<=gold<=350 if (streak+1)%3==0 else gold==50)
    check(name+': correct gem threshold',1<=gems<=10 if (streak+1)%5==0 else gems==0)
   else:check(name+': no ineligible streak currency',gold==(50 if winner==0 else 10 if winner==1 else 20) and gems==0)
   check(name+': no extra streak sentence in reward panel','streak' not in panel.inner_text().lower())
   balance=page.evaluate('JSON.stringify({gold:RoyaleDemo.profile.gold,gems:RoyaleDemo.profile.gems})')
   page.evaluate('RoyaleDemo.beginEndFlow();RoyaleDemo.beginEndFlow()');page.wait_for_timeout(2900)
   check(name+': repeated result drawing cannot recredit',page.evaluate('JSON.stringify({gold:RoyaleDemo.profile.gold,gems:RoyaleDemo.profile.gems})')==balance)
   for width,height in ([(1280,1040),(390,844),(320,568)] if name=='both' else [(390,844)]):
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
