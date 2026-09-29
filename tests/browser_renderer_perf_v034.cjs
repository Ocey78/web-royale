'use strict';
const{chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(process.env.RENDER_PERF_OUT||'docs/qa/v034/render-baseline');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'}),reports=[];
 try{for(const profile of[{name:'desktop-dpr1',width:1200,height:1000,dpr:1},{name:'desktop-dpr2',width:1200,height:1000,dpr:2},{name:'phone-dpr3',width:390,height:844,dpr:3}].filter(p=>!process.env.RENDER_PROFILE||p.name===process.env.RENDER_PROFILE)){
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:profile.dpr,isMobile:profile.name.startsWith('phone'),hasTouch:profile.name.startsWith('phone')}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.WEB_ROYALE_URL||'http://127.0.0.1:8091');await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:180000});
  if(process.env.RENDER_CACHE_MODE==='off')await page.evaluate(()=>{RoyalePresentation.hud.drawStill=function(c,name,opts){return this.draw(c,name,0,opts);};});
  if(process.env.RENDER_MIN_DENSITY)await page.evaluate(floor=>{const prepare=RoyaleUI.prepareCanvas;RoyaleUI.prepareBattleCanvas=(cv,w,h,cap=3)=>prepare(cv,w,h,Math.max(floor,Math.min(cap,devicePixelRatio*RoyaleUI.scale)));},Number(process.env.RENDER_MIN_DENSITY));
  await page.evaluate(async()=>{await RoyaleDemo.startBattle();RoyaleDemo.battle.ai=false;RoyaleDemo.battle.paused=true;const cards=['knight','giant','baby-dragon','archers','minions','skeletons'];await RoyaleDemo.native.ensureScenes(RoyaleNative.sceneDependencies(RoyaleDemo.native.data,RoyaleCore.DATA,[cards],RoyaleDemo.native.arenaId));});
  const workloads=[];
  for(const workload of[{crowded:false},{crowded:true},...(process.env.RENDER_COMPARE_CACHE==='1'?[{crowded:true,cacheOff:true}]:[])]){const{crowded,cacheOff}=workload;
   if(cacheOff)await page.evaluate(()=>{RoyalePresentation.hud.drawStill=function(c,name,opts){return this.draw(c,name,0,opts);};});
   await page.evaluate(crowded=>{const b=RoyaleDemo.battle;b.units=[];b.effects=[];b.projectiles=[];b.areas=[];b.time=5;b.visualTime=5;if(crowded){const entities=['Knight','Giant','BabyDragon','Archer','Minion','Skeleton'];for(let i=0;i<48;i++){const u=b.spawn(entities[i%entities.length],i%2,(2+i%8*2)*RoyaleCore.SX,(7+Math.floor(i/8)*3)*RoyaleCore.SY,{wait:0});u.visualState='run';u.walk=.1+i*.013;u.visualTime=.3;u.animationTime=.3;u.visualStarted=0;u.hp=Math.floor(u.hp*.75);}}},crowded);
   await page.waitForTimeout(500);
   const result=await page.evaluate(async()=>{
    const lib=RoyaleDemo.native,b=RoyaleDemo.battle,cv=document.getElementById('battleCanvas'),ctx=cv.getContext('2d'),stats={},wrappers=[];
    const summary=a=>{const s=[...a].sort((a,b)=>a-b),p=f=>s[Math.min(s.length-1,Math.floor(s.length*f))]||0;return{n:a.length,mean:a.reduce((x,y)=>x+y,0)/Math.max(1,a.length),p50:p(.5),p95:p(.95),max:p(1)};};
    function wrap(object,name,key){const original=object[name];if(typeof original!=='function')return;stats[key]=[];object[name]=function(...args){const at=performance.now();try{return original.apply(this,args);}finally{stats[key].push(performance.now()-at);}};wrappers.push(()=>object[name]=original);}
    wrap(RoyaleDraw,'battle','battle');for(const name of['drawArena','drawTower','drawTowerShadow','unit'])wrap(lib,name,name);for(const name of['health','filtered','timer'])wrap(RoyalePresentation,name,'presentation.'+name);wrap(RoyaleUI,'hydrate','ui.hydrate');
    const frames=[];let previous=performance.now();await new Promise(resolve=>{const until=previous+2500;function collect(now){frames.push(now-previous);previous=now;if(now<until)requestAnimationFrame(collect);else resolve();}requestAnimationFrame(collect);});for(const restore of wrappers)restore();
    const costs=[];for(let i=0;i<24;i++){const start=performance.now();RoyaleDraw.battle(ctx,b,5,null,null,1);ctx.getImageData(0,0,1,1);costs.push(performance.now()-start);}
    const rect=cv.getBoundingClientRect(),shapeCanvases=Object.values(lib.scenes).flatMap(s=>[...s.cache.values()]).map(x=>x.image).filter(Boolean);
    return{canvas:{width:cv.width,height:cv.height,cssWidth:rect.width,cssHeight:rect.height,density:Number(cv.dataset.density),devicePixelRatio,viewportScale:RoyaleUI.scale,pixels:cv.width*cv.height},frames:summary(frames),timings:Object.fromEntries(Object.entries(stats).map(([k,v])=>[k,summary(v)])),flushedDraw:summary(costs),native:lib.summary(),shapePixels:shapeCanvases.reduce((sum,c)=>sum+c.width*c.height,0),units:b.units.length};
   });workloads.push({crowded,cacheOff:!!cacheOff,...result});
   await page.locator('#viewport').screenshot({path:path.join(out,profile.name+'-'+(crowded?'crowded':'empty')+(cacheOff?'-cache-off':'')+'.png')});
  }
  reports.push({profile,version:await page.evaluate(()=>RoyaleBundle.version),errors,workloads});await context.close();
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({method:'Headless Edge,2500ms live RAF instrumentation plus24 flushed Canvas draws; synthetic48-source-unit scene; timings are local comparisons, not promised device FPS.',reports},null,2)+'\n');
 console.log(JSON.stringify(reports.map(r=>({profile:r.profile.name,errors:r.errors,workloads:r.workloads.map(w=>({crowded:w.crowded,canvas:w.canvas,frame:w.frames.p50,p95:w.frames.p95,draw:w.timings.battle.mean,flushed:w.flushedDraw.p50,top:Object.entries(w.timings).filter(x=>x[0]!=='battle').sort((a,b)=>b[1].mean*b[1].n-a[1].mean*a[1].n).slice(0,4)}))})),null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
