"""Verify v0.48 five-tier graphics and Safari first-launch defaults in generated build."""
from pathlib import Path
import argparse,base64,json,mimetypes,re
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--browser',default='/usr/bin/chromium')
parser.add_argument('--dist',type=Path,default=Path(__file__).resolve().parents[1]/'dist')
parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'docs/verification-v048/browser')
args=parser.parse_args();ROOT=args.dist.resolve();ART=args.output.resolve();ART.mkdir(parents=True,exist_ok=True)
release=json.loads((ROOT/'release.json').read_text())
SAFARI='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
CHROME='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

def local_asset(url):
 path=unquote(urlparse(url).path).lstrip('/');path=path[3:] if path.startswith('qa/') else path
 f=(ROOT/path).resolve()
 if not f.is_relative_to(ROOT) or not f.is_file():return {'status':404,'data':'','type':'text/plain'}
 return {'status':200,'data':base64.b64encode(f.read_bytes()).decode(),'type':mimetypes.guess_type(f.name)[0] or 'application/octet-stream'}

def fixture_html():
 html=(ROOT/'index.html').read_text();html=re.sub(r'<script\b[^>]*>.*?</script>','',html,flags=re.S);html=re.sub(r'<link\b[^>]*rel="stylesheet"[^>]*>','',html);return html.replace('<head>','<head><base href="http://localhost/qa/">')

def boot(browser,ua):
 context=browser.new_context(viewport={'width':390,'height':844},user_agent=ua,device_scale_factor=1)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.expose_function('__localAsset',local_asset);page.set_content(fixture_html())
 page.evaluate('''() => {
 const nativeFetch=window.fetch, blobs=new Map();window.__assetBlob=async value=>{if(value.startsWith('data:')||value.startsWith('blob:'))return value;const url=new URL(value,document.baseURI).href;if(!blobs.has(url))blobs.set(url,(async()=>{const r=await __localAsset(url);if(r.status!==200)throw Error('Missing '+url);const bytes=Uint8Array.from(atob(r.data),c=>c.charCodeAt(0));return URL.createObjectURL(new Blob([bytes],{type:r.type}));})());return blobs.get(url);};
 window.fetch=async(input,options)=>{const url=new URL(String(input),document.baseURI).href;if(url.startsWith('blob:')||url.startsWith('data:'))return nativeFetch(input,options);const r=await __localAsset(url);return new Response(Uint8Array.from(atob(r.data),c=>c.charCodeAt(0)),{status:r.status,headers:{'Content-Type':r.type}});};
 const src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{get:src.get,set(value){const token=this.__fixtureToken=(this.__fixtureToken||0)+1;if(String(value).startsWith('blob:')||String(value).startsWith('data:')){src.set.call(this,value);return;}__assetBlob(String(value)).then(url=>{if(this.__fixtureToken===token)src.set.call(this,url);}).catch(()=>this.onerror?.());}});
 const values=new Map();window.__savedProfileValues=values;Object.defineProperty(window,'localStorage',{value:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),clear:()=>values.clear()}});
 }''')
 css=(ROOT/release['styles']).read_text()
 for match in set(re.findall(r'url\([\'\"]?([^\)\'\"]+)',css)):
  if match.startswith(('data:','blob:','var(')):continue
  a=local_asset('http://localhost/qa/'+match)
  if a['status']==200:css=css.replace(match,'data:'+a['type']+';base64,'+a['data'])
 page.add_style_tag(content=css)
 runtime=json.loads((ROOT/release['runtime']).read_text());runtime.pop('preload',None)
 page.evaluate('(data)=>{window.RoyaleBundle=data;window.RoyaleGameData=data.game;}',runtime)
 page.evaluate("""()=>{const px='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';for(const map of [RoyaleBundle.uiImages,RoyaleBundle.art])for(const key of Object.keys(map||{}))map[key]=px;}""")
 page.add_script_tag(content=(ROOT/release['app']).read_text())
 page.wait_for_function("window.RoyaleDemo && document.getElementById('loading').classList.contains('hidden')",timeout=180000)
 return context,page,errors

checks=[]
def check(name,condition):
 assert condition,name;checks.append(name);print('PASS',name,flush=True)

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=args.browser,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  ctx,page,errors=boot(browser,SAFARI)
  check('generated release boots as v0.48.0',page.evaluate('RoyaleBundle.version')=='0.48.0')
  check('Safari first launch uses all Medium tiers',page.evaluate("JSON.stringify(RoyaleDemo.profile.graphics)==JSON.stringify({textures:'med',animations:'med',particles:'med',arenaBackgrounds:'med'})"))
  check('Safari defaults are persisted immediately',page.evaluate("JSON.parse(__savedProfileValues.get('web-royale-classic-v4')).graphics.textures")=='med')
  page.evaluate("RoyaleDemo.show('home');document.querySelector('#home [data-action=menu]').click()")
  page.locator('[data-action=settings]').click();page.wait_for_timeout(200)
  labels=page.locator('select[data-graphics] option').all_inner_texts()
  for label in ['Good','High (4×)','Max (8×)']:
   check('settings exposes '+label,label in labels)
  # Generated product JavaScript must expose the real High/Max policies.
  check('High texture policy is 4x',page.evaluate("RoyaleGraphics.policy({textures:'high'}).textureScale")==4)
  check('Max texture policy is 8x',page.evaluate("RoyaleGraphics.policy({textures:'max'}).textureScale")==8)
  check('High arena policy is 4x',page.evaluate("RoyaleGraphics.policy({arenaBackgrounds:'high'}).arenaScale")==4)
  check('Max arena policy is 8x',page.evaluate("RoyaleGraphics.policy({arenaBackgrounds:'max'}).arenaScale")==8)
  check('Safari page has no uncaught errors',not errors);ctx.close()

  ctx,page,errors=boot(browser,CHROME)
  check('non-Safari fresh launch defaults to Good tiers',page.evaluate("JSON.stringify(RoyaleDemo.profile.graphics)==JSON.stringify({textures:'good',animations:'good',particles:'good',arenaBackgrounds:'good'})"))
  check('Chromium is not misdetected as Safari',page.evaluate('RoyaleGraphics.isSafari(navigator.userAgent)')==False)
  check('Chrome page has no uncaught errors',not errors);ctx.close()
 finally:
  (ART/'report.json').write_text(json.dumps({'version':release['version'],'passed':len(checks),'checks':checks},indent=2))
  browser.close()
