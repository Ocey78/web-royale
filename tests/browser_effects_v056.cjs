'use strict';
// Matched source/baseline GPU sampling, or --built URL for the delivered app.
// Baseline serves the immutable old renderer/manifest; built mode never injects
// runtime code. Individual full-size frames stay in EFFECTS_QA_RAW, outside git.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto');
let chromium;try{({chromium}=require('playwright'));}catch(_){({chromium}=require('C:/Users/Oceyi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.resolve(__dirname,'..'),mode=process.argv[2]==='--built'?'built':process.argv[2]==='--baseline'?'baseline':'source',ref=mode==='baseline'?(process.argv[3]||'68aa4a9'):null,url=mode==='built'?(process.argv[3]||'http://127.0.0.1:8087/'):null;
const out=path.resolve(process.env.EFFECTS_QA_OUT||path.join(root,'docs/qa/v056/effects',mode)),raw=path.resolve(process.env.EFFECTS_QA_RAW||'C:/Users/Oceyi/.codex/.chatgpt-projects/g-p-6ab30a4cba6481918c10cd093df5b570/work/effects-v056/'+mode);
const ids=process.env.EFFECTS_QA_ACTORS?.split(',')||['KnightHero','MiniPekkaHero','BerserkerHero','DarkPrinceHero','IceWizardHero','Ronin','WizardHero_air','BalloonHero'],times=[0,.15,.3,.45,.6,.9,1.2],states=process.env.EFFECTS_QA_STATES?.split(',')||['attack','ability'];
const diagnosticParticleScale=Number(process.env.EFFECTS_QA_PARTICLE_SCALE||1);assert.ok(Number.isFinite(diagnosticParticleScale)&&diagnosticParticleScale>0);assert.ok(mode==='source'||diagnosticParticleScale===1,'scale experiments are source-only, never delivered-bundle proof');
const movingAnchor=process.env.EFFECTS_QA_MOVING==='1';
const diagnosticFollowEmitter=process.env.EFFECTS_QA_FORCE_FOLLOW==='1';assert.ok(mode==='source'||!diagnosticFollowEmitter,'history experiments are source-only');
const baseline=ref?Object.fromEntries(['src/modern-3d.js','assets/modern-heroes/manifest.json'].map(file=>[file,execFileSync('git',['show',ref+':'+file],{cwd:root,maxBuffer:32*1024*1024})])):null;
let browser,server;const report={mode,baselineRef:ref,actualBundleOnly:mode==='built',diagnosticParticleScale,diagnosticFollowEmitter,movingAnchor,ids,times,states,rows:[],late:[],errors:[],console:[],httpErrors:[],contacts:[]};
async function main(){
 fs.mkdirSync(out,{recursive:true});fs.mkdirSync(raw,{recursive:true});
 if(mode!=='built'){
  server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(name==='/favicon.ico'){res.writeHead(204);return res.end();}
   if(name==='/harness'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Source effects GPU diagnostic</title><script src="/src/graphics.js"></script><script src="/src/native.js"></script>'+(mode==='baseline'?'':'<script src="/src/source-particles.js"></script><script src="/src/modern-fx-3d.js"></script>')+'<script src="/src/modern-3d.js"></script>');}
   if(name==='/qa-native.json'){const data=JSON.parse(fs.readFileSync(path.join(root,'assets/native/data.json')));res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({arenas:[{id:'classic'}],units:{},streamed:true,scenes:Object.fromEntries(Object.entries(data.scenes).filter(([key])=>key.startsWith('modernfx_')))}));}
   const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end();}
   res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'application/octet-stream');
   const original=baseline?.[name.slice(1)];if(original)return res.end(original);fs.createReadStream(file).pipe(res);
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 }
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),loadedScripts=new Map();
 page.on('response',r=>{if(r.request().resourceType()==='script')loadedScripts.set(r.url(),r.body().then(body=>createHash('sha256').update(body).digest('hex')).catch(()=>null));});
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(['error','warning'].includes(m.type()))report.console.push({type:m.type(),text:m.text(),url:m.location().url});});page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({status:r.status(),url:r.url()});});
 await page.goto(mode==='built'?url:'http://127.0.0.1:'+server.address().port+'/harness');report.url=page.url();
 if(mode==='built'){await page.waitForFunction(()=>window.RoyaleDemo?.native?.ready&&document.querySelector('#loading.hidden'),null,{timeout:180000});const release=await(await page.request.get(new URL('release.json',url).href)).json(),loadedAppUrl=new URL(release.app,url).href,loadedAppSha256=await loadedScripts.get(loadedAppUrl);assert.equal(loadedAppSha256,release.files[release.app],'the actual loaded app response must match its release hash');report.release={version:release.version,app:release.app,appSha256:release.files[release.app],loadedAppUrl,loadedAppSha256,verified:true};assert.equal(await page.evaluate(()=>RoyaleBundle.project.version),release.version);}
 report.prepared=await page.evaluate(async({ids,mode,states,diagnosticParticleScale,diagnosticFollowEmitter})=>{
  const M=RoyaleModern3D,base=new URL('.',document.baseURI),manifest=mode==='built'?RoyaleBundle.modernHeroes:await(await fetch(new URL('assets/modern-heroes/manifest.json',base))).json();
  for(const id of ids)if(!manifest.heroes[id])throw Error('Missing source actor '+id);
  if(diagnosticParticleScale!==1){const original=RoyaleSourceParticles.sourceParticleSamples;RoyaleSourceParticles.sourceParticleSamples=(...args)=>original(...args).map(p=>({...p,scale:p.scale*diagnosticParticleScale,scaleX:p.scaleX*diagnosticParticleScale,scaleY:p.scaleY*diagnosticParticleScale}));}
  if(diagnosticFollowEmitter){const proto=RoyaleSourceParticles.ParticleTransformHistory.prototype,original=proto.resolve;proto.resolve=function(key,time,age){return original.call(this,key,time,age,true);};}
  if(mode!=='built')await M.configure(manifest,new URL('assets/modern-heroes/',base).href,{vendorBase:new URL('assets/vendor/three/',base).href});
  RoyaleGraphics.apply({textures:'high',animations:'high',particles:'high',arenaBackgrounds:'high'});
  let library=RoyaleNative.library;
  if(mode!=='built'){const data=await(await fetch(new URL('qa-native.json',base))).json(),images={};for(const scene of Object.values(data.scenes))for(const texture of scene.textures)images[texture.file]=new URL('assets/native/'+texture.file,base).href;library=new RoyaleNative.Library(data,images);library.ready=true;library.fx={particlesUsed:0};RoyaleNative.library=library;}
  const references=new Set(),walk=x=>{if(Array.isArray(x))return x.forEach(walk);if(x&&typeof x==='object')for(const[k,v]of Object.entries(x)){if((k==='movieclip'||k==='MovieClip')&&v)for(const ref of Array.isArray(v)?v:[v])references.add(ref.split(' | ')[0]);else walk(v);}};walk(manifest.vfxAssets);
  const resolved=[...references].map(ref=>{const slash=ref.lastIndexOf('/'),stem=ref.slice(0,slash).split('/').pop();return{ref,scene:library.data.scenes['modernfx_'+stem]?'modernfx_'+stem:stem,name:ref.slice(slash+1)};});
  await library.ensureScenes([...new Set(resolved.map(x=>x.scene))]);for(const r of resolved){const sc=library.scenes[r.scene];if(sc.id(r.name)===undefined)throw Error('Missing original billboard '+r.ref);await sc.prewarm(r.name);}
  M.beginFrame(ids);const actors=await M.prepareActors(ids);if(actors.some(r=>!r.ready))throw Error(JSON.stringify(actors));
  const cv=document.createElement('canvas');cv.width=320;cv.height=380;const ctx=cv.getContext('2d',{willReadFrequently:true}),sheet=document.createElement('canvas');sheet.width=7*320;sheet.height=states.length*2*406+38;const sheetContext=sheet.getContext('2d');
  window.effectsQA={M,manifest,library,cv,ctx,sheet,sheetContext,unit:1000};
  return{actors,scenes:resolved,policy:RoyaleGraphics.current,initialSummary:M.summary()};
 },{ids,mode,states,diagnosticParticleScale,diagnosticFollowEmitter});
 for(const id of ids){
  await page.evaluate(({id,states})=>{const q=effectsQA,c=q.sheetContext;c.fillStyle='#142a29';c.fillRect(0,0,q.sheet.width,q.sheet.height);c.fillStyle='white';c.font='20px sans-serif';c.fillText(id+' | source camera / high quality / '+states.join(' + ')+' / blue + red',12,26);},{id,states});
  let rowIndex=0;
  for(const team of[0,1])for(const state of states){
   const unitId=1000+ids.indexOf(id)*states.length*2+team*states.length+states.indexOf(state);
   for(const[timeIndex,elapsed]of times.entries()){
    const sample=await page.evaluate(({id,team,state,elapsed,unitId,rowIndex,timeIndex,movingAnchor})=>{
     const q=effectsQA,M=q.M,c=q.ctx,source=q.manifest.heroes[id].sourceEntity,entity={id:unitId,entity:id,team,def:{source},visualState:state,visualTime:10+elapsed,visualStarted:10,walk:elapsed,shield:source.ShieldHitpoints||0};
     const beforeEntity=JSON.stringify(entity),before=M.summary();if(q.library.fx)q.library.fx.particlesUsed=0;c.clearRect(0,0,320,380);
     const anchor=[160+(movingAnchor?(team?-1:1)*elapsed*24:0),260],ok=M.draw(c,id,anchor[0],anchor[1],team,10+elapsed,state,team?Math.PI/2:-Math.PI/2,10,2.4,{entity,elapsed,idleTime:elapsed}),after=M.summary(),pixels=c.getImageData(0,0,320,380).data;
     let count=0,hash=2166136261,minX=320,minY=380,maxX=-1,maxY=-1;for(let i=0;i<pixels.length;i++){hash=Math.imul(hash^pixels[i],16777619);if(i%4===3&&pixels[i]>8){count++;const pixel=(i-3)/4,x=pixel%320,y=Math.floor(pixel/320);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
     const delta={};for(const[k,v]of Object.entries(after))if(typeof v==='number'&&typeof before[k]==='number')delta[k]=v-before[k];
     const d=q.sheetContext,x=timeIndex*320,y=38+rowIndex*406;for(let yy=0;yy<380;yy+=20)for(let xx=0;xx<320;xx+=20){d.fillStyle=((xx+yy)/20)%2?'#355f49':'#3a654e';d.fillRect(x+xx,y+yy,20,20);}d.drawImage(q.cv,x,y);d.fillStyle='#eaf1e8';d.font='15px sans-serif';d.fillText((team?'red':'blue')+' '+state+' '+elapsed.toFixed(2)+'s',x+10,y+400);
     return{id,team,state,elapsed,anchor,ok,pixels:count,bounds:{minX,minY,maxX,maxY},canvasEdge:minX===0||minY===0||maxX===319||maxY===379,hash:(hash>>>0).toString(16),delta,entityUnchanged:beforeEntity===JSON.stringify(entity),image:q.cv.toDataURL()};
    },{id,team,state,elapsed,unitId,rowIndex,timeIndex,movingAnchor});
    fs.writeFileSync(path.join(raw,`${id}-${team}-${state}-${String(timeIndex).padStart(2,'0')}.png`),Buffer.from(sample.image.split(',')[1],'base64'));delete sample.image;report.rows.push(sample);
   }
   const late=await page.evaluate(({id,team,state,unitId})=>{const q=effectsQA,source=q.manifest.heroes[id].sourceEntity,entity={id:unitId,def:{source},visualTime:18.5,visualStarted:10,shield:source.ShieldHitpoints||0},before=q.M.summary();if(q.library.fx)q.library.fx.particlesUsed=0;q.ctx.clearRect(0,0,320,380);q.M.draw(q.ctx,id,160,260,team,18.5,state,team?Math.PI/2:-Math.PI/2,10,2.4,{entity,elapsed:8.5,idleTime:8.5});const after=q.M.summary();return{id,team,state,elapsed:8.5,fxSprites:after.fxSprites-before.fxSprites,fxMeshes:numberDelta('fxMeshes'),fxHistoryEntries:after.fxHistoryEntries};function numberDelta(k){return typeof after[k]==='number'?after[k]-before[k]:null;}},{id,team,state,unitId});report.late.push(late);rowIndex++;
  }
  const contact=await page.evaluate(()=>effectsQA.sheet.toDataURL());const name=id+'-contact.png';fs.writeFileSync(path.join(out,name),Buffer.from(contact.split(',')[1],'base64'));report.contacts.push(name);
 }
 report.final=await page.evaluate(()=>{effectsQA.M.endFrame();return{modern:effectsQA.M.summary(),native:effectsQA.library.summary()};});
 assert.equal(report.rows.length,ids.length*2*states.length*times.length);assert.ok(report.rows.every(r=>r.ok&&r.pixels>0&&r.entityUnchanged),'each source actor paints and leaves entity data unchanged');assert.ok(report.rows.some(r=>r.delta.fxSprites>0),'prewarmed source billboard scenes must actually paint');assert.ok(report.late.every(r=>r.fxHistoryEntries===0),'finite source event particles finish by the late sample');assert.equal(report.final.modern.error,null);assert.equal(report.final.native.error,null);assert.deepEqual(report.errors,[]);
 const optional=mode==='built'?['__webroyale_ai__/capabilities','favicon.ico'].map(p=>new URL(p,url).href):[];report.optionalRequestExclusions=optional;assert.deepEqual(report.httpErrors.filter(r=>!optional.includes(r.url)),[],'all effect assets must resolve');assert.deepEqual(report.console.filter(m=>!optional.includes(m.url)),[],'GPU/shader console must be clean');
 if(mode!=='baseline')assert.ok(report.rows.some(r=>(r.delta.fxMeshes||0)>0),'source mesh effects must paint in the integrated renderer');
 report.passed=true;console.log(JSON.stringify({mode,samples:report.rows.length,contacts:report.contacts.length,billboardSamples:report.rows.filter(r=>r.delta.fxSprites>0).length,meshSamples:report.rows.filter(r=>(r.delta.fxMeshes||0)>0).length,errors:report.errors,console:report.console,out},null,2));
}
main().catch(error=>{report.failure=error.stack;console.error(error);process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(out,'gpu-check.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve());});
