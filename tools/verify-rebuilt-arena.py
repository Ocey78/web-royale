"""Compare re-created arena renderer with retained v0.40.0. File-backed Chromium fixture."""
from pathlib import Path
import json, base64, mimetypes, argparse
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops, ImageStat
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/verification-v0401-rebuilt/arenas';OUT.mkdir(exist_ok=True,parents=True)
DIST=ROOT/'dist';release=json.loads((DIST/'release.json').read_text());runtime=json.loads((DIST/release['runtime']).read_text())
BASE=(ROOT/'docs/verification-v0401-rebuilt/native-v0400-baseline.js').read_text()
NEW=(ROOT/'src/native.js').read_text()
def asset(url):
    p=(DIST/unquote(urlparse(url).path).lstrip('/')).resolve()
    if not p.is_relative_to(DIST) or not p.is_file():raise RuntimeError('Missing asset '+url)
    return {'data':base64.b64encode(p.read_bytes()).decode(),'type':mimetypes.guess_type(p.name)[0] or 'application/octet-stream'}
setup='''() => {
 const f=window.fetch,blobs=new Map();window.__blob=async value=>{const u=new URL(value,document.baseURI).href;if(!blobs.has(u))blobs.set(u,(async()=>{const r=await __asset(u);return URL.createObjectURL(new Blob([Uint8Array.from(atob(r.data),x=>x.charCodeAt(0))],{type:r.type}));})());return blobs.get(u)};
 window.fetch=async input=>{const r=await __asset(new URL(String(input),document.baseURI).href);return new Response(Uint8Array.from(atob(r.data),x=>x.charCodeAt(0)),{headers:{'Content-Type':r.type}})};
 const p=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{get:p.get,set(value){if(String(value).startsWith('blob:'))p.set.call(this,value);else __blob(value).then(v=>p.set.call(this,v));}});
}'''
results=[];errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for a in runtime['native']['arenas']:
        page=browser.new_page(viewport={'width':720,'height':984},device_scale_factor=1)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.expose_function('__asset',asset)
        page.set_content('<html><head><base href="http://localhost/"></head><body style="margin:0"><canvas id="arena" width="720" height="984"></canvas></body></html>')
        page.evaluate(setup)
        page.add_script_tag(content=BASE+';window.NativeBefore=window.RoyaleNative;')
        page.add_script_tag(content=NEW)
        page.evaluate('''async([data,id])=>{
          window.before=new NativeBefore.Library(data.native,data.images);window.after=new RoyaleNative.Library(data.native,data.images);
          for(const lib of [before,after]){lib.setArena(id);await lib.load();const a=lib.arena;await lib.ensureScenes([...new Set([a.scene,...a.objects.map(o=>o.scene||a.scene)])]);}
          window.paint=(which,time,ot=false)=>{const cv=document.getElementById('arena'),c=cv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv.width,cv.height);c.save();c.translate(120,147);const ok=window[which].drawArena(c,time,ot);c.restore();return ok;};
        }''',[{'native':runtime['native'],'images':runtime['images']},a['id']])
        cases=[(0,False),(3.2,False),(3.2,True)]
        if a['id']=='hog':cases.extend([(8.1,False),(15.9,True)])
        for time,ot in cases:
            key=f"{a['id']}-{time}-{int(ot)}";shots=[]
            for which in ['before','after']:
                assert page.evaluate('([k,t,o])=>paint(k,t,o)',[which,time,ot])
                path=OUT/f'{key}-{which}.png';page.locator('#arena').screenshot(path=str(path));shots.append(path)
            im1=Image.open(shots[0]).convert('RGB');im2=Image.open(shots[1]).convert('RGB');diff=ImageChops.difference(im1,im2)
            mean=sum(ImageStat.Stat(diff).mean)/3
            # Resampling shifts a few antialiased pixels; large layout/content loss must fail.
            assert mean<5.0,(key,mean)
            results.append({'case':key,'meanAbsoluteChannelDifference':round(mean,4),'passed':True})
        if a['id']=='hog':
            perf=page.evaluate('''()=>{const out={};for(const key of ['before','after']){const cv=document.getElementById('arena'),c=cv.getContext('2d');for(let i=0;i<5;i++)paint(key,i/60);const samples=[];let draws=0;const orig=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args){draws++;return orig.apply(this,args)};try{for(let i=0;i<30;i++){const t=performance.now();paint(key,i/60);c.getImageData(0,0,1,1);samples.push(performance.now()-t);}}finally{CanvasRenderingContext2D.prototype.drawImage=orig;}out[key]={meanMilliseconds:samples.reduce((a,b)=>a+b,0)/samples.length,drawCallsPerFrame:draws/samples.length,shapeCacheBytes:Object.values(window[key].scenes).reduce((sum,s)=>sum+[...s.cache.values()].reduce((n,x)=>n+x.image.width*x.image.height*4,0),0)};}return out;}''')
            (OUT.parent/'hog-performance.json').write_text(json.dumps(perf,indent=2))
            print('HOG PERFORMANCE',json.dumps(perf),flush=True)
        print('PASS',a['id'],len(cases),'visual comparisons',flush=True)
        page.close()
    browser.close()
report={'comparisons':len(results),'arenas':len(runtime['native']['arenas']),'results':results,'errors':errors,'environment':'headless Chromium, file-backed original assets, not physical iPhone or production deployment'}
(OUT.parent/'arena-comparisons.json').write_text(json.dumps(report,indent=2))
assert not errors,errors
print('PASS',len(results),'comparisons, no browser errors',flush=True)
