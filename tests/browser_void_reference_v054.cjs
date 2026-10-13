'use strict';
// Runs only the delivered bundle and original assets. No routed responses,
// injected modules, substituted renderers, or mocked textures. Fixture HP and
// movement keep the requested target counts stable; one deliberate position
// shift tests following independently of birth coordinates.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{chromium}=require('playwright');
const url=process.env.WEB_ROYALE_URL||'http://127.0.0.1:8087';
const out=path.resolve(process.env.VOID_QA_OUT||path.join(__dirname,'../docs/qa/v054/void-built'));
const cases=[{name:'bowler',entity:'Bowler',count:1},{name:'knights',entity:'Knight',count:3},{name:'barbarians',entity:'Barbarian',count:5},{name:'air-tier-change',entity:'Knight',count:1,air:true},{name:'empty',entity:'Knight',count:0}];
async function inspect(page,spec,team){return page.evaluate(async({spec,team})=>{
 const C=RoyaleCore,lib=RoyaleDemo.native,fx=lib.fx,V=RoyaleBattleView,dt=1/60,eps=1e-6;
 const deck=['void','bowler','knight','barbarians','baby-dragon','archers','giant','musketeer'];
 const b=new C.Battle({ai:false,seed:541,deck,enemyDeck:deck,arenaId:'royal'});
 lib.retainScenes([]);fx.componentCache.clear();fx.missing.clear();lib.setArena('royal');await lib.prepareBattle(b,C.DATA);
 V.configure({arenaId:'royal',compact:false});
 const deps=RoyaleNative.sceneDependencies(lib.data,C.DATA,[deck],'royal'),absent=deps.filter(name=>!lib.scenes[name]);
 const x=240,y=team?365:275,units=[],initial=[],seen=new Map(),frames=[],pending=[],checks=[];
 const check=(ok,message)=>{checks.push({ok:!!ok,message});};
 function spawn(entity,px,py){const u=b.spawn(entity,1-team,px,py,{wait:0,level:11});if(!u)throw Error('Missing fixture entity '+entity);u.hp=u.maxHp=10000;u.def={...u.def,speedTiles:0};initial.push({id:u.id,entity,position:{x:u.x,y:u.y}});return u;}
 for(let i=0;i<spec.count;i++)units.push(spawn(spec.entity,x+(i-(spec.count-1)/2)*19-12,y+(i%2?10:-10)));
 const air=spec.air?spawn('BabyDragon',x+200,y):null;
 b.cast(C.cardAt('void',11),team,x,y);
 // Normal cast scheduling includes the deployment delay; do not bypass it by
 // creating an area directly or pretend the area starts at the input time.
 let area;while(!(area=b.areas.find(a=>a.name==='DarkMagicAOE'))&&b.time<1.5)b.step(dt);
 if(!area)throw Error('Void cast did not create its source area');
 const births=[],damages=[],poolCounts=[],anchorChecks=[],filterChecks=[];
 let pool=null,laser=null,shifted=false,airEntered=false,airLeft=false,outro=null;
 const schedule=(label,time,extra={})=>pending.push({label,time,...extra});
 const active=e=>b.time>=e.born+(e.delay||0)-eps&&b.time<e.born+e.ttl-eps;
 const beamNames=new Set(['Paolo_zap_effect3','Paolo_zap_effect2','Paolo_zap_effect']);
 function discover(){
  for(const e of b.effects){if(seen.has(e.fxId))continue;seen.set(e.fxId,e);
   if(e.sourceEffect?.startsWith('Paolo'))births.push({name:e.sourceEffect,id:e.fxId,born:e.born,ttl:e.ttl,follow:e.follow??null,x:e.x,y:e.y});
   if(e.sourceEffect==='PaoloFirstEffectEverIntro'){schedule('intro',e.born+.1);schedule('intro-plus-0.9',e.born+.9);}
   if(e.sourceEffect==='PaoloFirstEffectEver'&&!pool){pool=e;laser=area.modernLaser.record;for(let i=0;i<3;i++)schedule('pre-strike-'+(i+1),area.modernLaser.nextAt+i*laser.HitFrequency/1000-dt);}
   if(beamNames.has(e.sourceEffect)&&!pending.some(p=>p.label==='strike-'+(births.filter(v=>beamNames.has(v.name)).map(v=>v.born).filter((v,i,a)=>a.indexOf(v)===i).indexOf(e.born)+1))){
    const pulse=[...new Set(births.filter(v=>beamNames.has(v.name)).map(v=>v.born))].indexOf(e.born)+1;
    schedule('strike-'+pulse,e.born+2*dt,{beamBorn:e.born,pulse});
    schedule('post-hit-'+pulse,e.born+.1+3*dt,{beamBorn:e.born,pulse});
   }
   if(e.sourceEffect==='PaoloFirstEffectEverOutro'){outro=e;schedule('outro',e.born+.1);const components=fx.components(e.sourceEffect,team),duration=Math.max(...components.filter(r=>r.Type==='SWF').map(r=>lib.scenes[r.FileName.split('/').pop().replace('.sc','')].duration(r.ExportName)));schedule('after-outro',e.born+Math.max(duration,1.5)+.2);}
  }
 }
 function capture(request){
  const digest=JSON.stringify(RoyaleReplay.digest(b)),drawCalls=[],original=fx.effect;
  // Transparent tracing: every call still reaches the shipped renderer.
  fx.effect=function(ctx,name,px,py,time,t,opt){if(name.startsWith('Paolo')&&opt?.phase==='above')drawCalls.push({name,x:px,y:py,age:time,height:opt.height||0,seed:opt.seed});return original.apply(this,arguments);};
  const cv=document.createElement('canvas');cv.width=1080;cv.height=V.layout.height*2;const ctx=cv.getContext('2d');ctx.scale(2,2);
  try{RoyaleDraw.battle(ctx,b,b.time);}finally{fx.effect=original;}
  check(JSON.stringify(RoyaleReplay.digest(b))===digest,request.label+': draw preserves replay digest');
  const activeBeams=b.effects.filter(e=>beamNames.has(e.sourceEffect)&&active(e));
  for(const e of activeBeams){const u=b.getEntity(e.follow),call=drawCalls.find(v=>v.seed===(e.fxId??e.id??e.sourceEffect));if(!u)continue;const good=!!call&&Math.abs(call.x-u.x)<eps&&Math.abs(call.y-u.y)<eps&&Math.abs(call.height-RoyaleNative.entityElevation(u))<eps;anchorChecks.push({label:request.label,id:e.follow,name:e.sourceEffect,birth:{x:e.x,y:e.y},target:{x:u.x,y:u.y},actual:call,ok:good});check(good,request.label+': beam follows target '+e.follow+' including elevation');}
  const filters=[...units,...(air?[air]:[])].map(u=>({id:u.id,name:fx.unitFilter(u)?.name||null,elevation:RoyaleNative.entityElevation(u)}));
  if(request.label.startsWith('post-hit-')){const pulse=request.pulse,count=spec.air?(pulse===2?2:1):spec.count,want=count===1?'filter_sauron_eye_red':count<=4?'filter_sauron_eye_orange':'filter_sauron_eye_yellow';for(const u of units){const actual=filters.find(f=>f.id===u.id)?.name;filterChecks.push({pulse,id:u.id,expected:want,actual});check(actual===want,request.label+': target tier filter '+want);}if(spec.air&&pulse===2)check(filters.find(f=>f.id===air.id)?.name===want,'air target receives second-pulse filter');}
  // Sample the delivered empty field on actual terrain. Four interior patches
  // avoid its pink center glow, team1 blue inner ring, and bright outer rim. The old direct SC blend
  // was brown (substantial green); the isolated source sprite is burgundy.
  const poolPixels=[];
  if(spec.count===0&&['intro-plus-0.9','pre-strike-1'].includes(request.label))for(const dx of [-32,32])for(const dy of [-8,8]){const point=V.toScreen({x:x+dx,y:y+dy}),sample=ctx.getImageData(Math.round(point.x*2)-1,Math.round(point.y*2)-1,3,3).data,rgb=[0,0,0];for(let i=0;i<sample.length;i+=4)for(let k=0;k<3;k++)rgb[k]+=sample[i+k]/9;poolPixels.push({worldOffset:{x:dx,y:dy},rgb});}
  if(poolPixels.length){const rgb=[0,1,2].map(k=>poolPixels.reduce((sum,p)=>sum+p.rgb[k],0)/poolPixels.length);check(rgb[0]>2*Math.max(1,rgb[1])&&rgb[0]<140&&rgb[1]<40,request.label+': dark burgundy pool stays red-dominant on green terrain');}
  const pixels=ctx.getImageData(0,0,cv.width,cv.height).data;let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])painted++;
  frames.push({...request,time:b.time,poolCount:b.effects.filter(e=>e.sourceEffect==='PaoloFirstEffectEver'&&active(e)).length,filters,drawCalls,poolPixels,painted,png:cv.toDataURL('image/png').split(',')[1]});
 }
 discover();
 while(b.time<6.5&&!b.result){
  b.step(dt);discover();
  const beams=b.effects.filter(e=>beamNames.has(e.sourceEffect));
  if(!shifted&&beams.length){for(const u of units){u.x+=8;u.y+=team?-4:4;}shifted=true;}
  if(air&&pool){const first=pool.born+laser.FirstHitDelay/1000;if(!airEntered&&b.time>=first+.4){air.x=x+24;airEntered=true;}if(!airLeft&&b.time>=first+laser.HitFrequency/1000+.4){air.x=x+200;airLeft=true;}}
  if(pool&&b.time<area.ends-eps)poolCounts.push(b.effects.filter(e=>e.sourceEffect==='PaoloFirstEffectEver'&&active(e)).length);
  for(const request of pending.filter(r=>!r.done&&b.time+eps>=r.time)){request.done=true;capture(request);}
 }
 for(const e of b.events)if(e.type==='damage'&&initial.some(u=>u.id===e.target))damages.push({time:e.time,target:e.target,amount:e.amount});
 check(!!pool,'one persistent pool is born even for empty cast');check(poolCounts.length>0&&poolCounts.every(n=>n===1),'exactly one persistent pool throughout its lifetime');
 check(births.filter(e=>e.name==='PaoloFirstEffectEver').length===1,'damage pulses do not create additional pools');
 check(!!outro,'source outro is emitted');check(pending.every(r=>r.done),'all event-derived capture times are reached');
 const pulses=[...new Set(births.filter(e=>beamNames.has(e.name)).map(e=>e.born))];
 check(pulses.length===(spec.count?3:0),'exactly three target-beam pulses, or none for empty cast');
 for(let i=1;i<pulses.length;i++)check(Math.abs(pulses[i]-pulses[i-1]-1)<=dt+eps,'current one-second pulse interval '+i);
 for(const u of units){const hits=damages.filter(e=>e.target===u.id);check(hits.length===3,'three damage hits on '+u.id);for(let i=1;i<hits.length;i++)check(Math.abs(hits[i].time-hits[i-1].time-1)<=dt+eps,'one-second damage interval '+u.id+':'+i);}
 if(air)check(damages.filter(e=>e.target===air.id).length===1,'air target enters only the second pulse');
 for(const [i,born]of pulses.entries()){const selected=births.filter(e=>beamNames.has(e.name)&&Math.abs(e.born-born)<eps),count=spec.air?(i===1?2:1):spec.count;check(selected.length===count,'pulse '+(i+1)+' has one beam per selected target');check(selected.every(e=>e.follow!==null),'damage beams follow targets, never the center');}
 check(frames.some(f=>f.label==='intro-plus-0.9'&&f.poolCount===1),'pool is visible before target strikes');
 check(absent.length===0,'cold source scene closure');check(fx.missing.size===0,'all original source exports resolve');
 const after=frames.find(f=>f.label==='after-outro');check(!!after&&after.poolCount===0&&after.filters.every(f=>f.name===null),'pool and target filters expire after outro');
 return{scenario:spec.name,team,fixture:{highHP:10000,movementSpeed:0,shiftAfterFirstBeam:{x:8,y:team?-4:4}},cast:{x,y},initial,absent,missing:[...fx.missing],pool:{born:pool?.born,ttl:pool?.ttl,ends:area.ends},pulses,births,damages,anchorChecks,filterChecks,checks,frames};
 },{spec,team});}
async function main(){
 fs.mkdirSync(out,{recursive:true});const report={url,actualBundleOnly:true,reference:'https://www.youtube.com/watch?v=AMr1cJDkvaw',referenceNote:'BaleGG Aug9 card preview provides geometry/color comparison. Current balance uses one-second pulses; its older1.2s timing is not copied.',errors:[],failedRequests:[],httpErrors:[],optionalCapabilities:[],cases:[]};
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 try{const page=await browser.newPage({viewport:{width:1280,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400){const item={url:r.url(),status:r.status()};if(r.status()===404&&new URL(r.url()).pathname==='/__webroyale_ai__/capabilities')report.optionalCapabilities.push(item);else report.httpErrors.push(item);}});
  await page.goto(url);await page.waitForFunction(()=>window.RoyaleDemo&&document.querySelector('#loading.hidden'),null,{timeout:120000});
  report.identity=await page.evaluate(()=>({version:RoyaleBundle.project.version,scripts:[...document.scripts].map(s=>s.src).filter(Boolean)}));
  const releaseResponse=await page.request.get(new URL('release.json',url).href);assert.ok(releaseResponse.ok());report.release=await releaseResponse.json();
  const app=await page.request.get(new URL(report.release.app,url).href);assert.ok(app.ok());report.observedAppSHA256=crypto.createHash('sha256').update(await app.body()).digest('hex');assert.equal(report.observedAppSHA256,report.release.files[report.release.app],'delivered app hash matches release');
  if(process.env.EXPECTED_VERSION)assert.equal(report.identity.version,process.env.EXPECTED_VERSION);
  for(const spec of cases)for(const team of [0,1]){const result=await inspect(page,spec,team);for(const frame of result.frames){frame.file=spec.name+'-team'+team+'-'+frame.label+'-'+frame.time.toFixed(3)+'.png';fs.writeFileSync(path.join(out,frame.file),Buffer.from(frame.png,'base64'));delete frame.png;}report.cases.push(result);console.log(spec.name+' team '+team+': '+result.checks.filter(c=>c.ok).length+'/'+result.checks.length+' checks');}
  assert.deepEqual(report.errors,[],'browser JavaScript errors');assert.deepEqual(report.failedRequests,[],'failed asset requests');assert.deepEqual(report.httpErrors,[],'HTTP asset errors');
  const failed=report.cases.flatMap(r=>r.checks.filter(c=>!c.ok).map(c=>r.scenario+' team '+r.team+': '+c.message));assert.deepEqual(failed,[],'Void visual contract');
  report.passed=true;
 }catch(error){report.failure=error.stack;throw error;}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
