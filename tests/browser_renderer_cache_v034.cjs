'use strict';
const{chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(process.env.RENDER_CACHE_OUT||'docs/qa/v034/render-cache');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),url=process.env.WEB_ROYALE_URL||'http://127.0.0.1:8093';
 if(process.env.RENDER_SOURCE_ONLY==='1'){
  await page.route('**/__qa_renderer_cache_v034',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><base href="'+url+'/"></head><body></body></html>'}));await page.goto(url+'/__qa_renderer_cache_v034');
  for(const file of['native.js','text.js','presentation.js'])await page.addScriptTag({content:fs.readFileSync(path.resolve('src',file),'utf8')});
  await page.evaluate(data=>RoyalePresentation.load(data),JSON.parse(fs.readFileSync(path.resolve('assets/presentation/data.json'),'utf8')));
 }else{await page.goto(url);await page.waitForFunction(()=>window.RoyaleDemo&&RoyalePresentation.ready&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:180000});}
 if(process.env.RENDER_SOURCE_OVERRIDE==='1'){
  await page.evaluate(()=>window.referenceSceneDraw=RoyalePresentation.hud.draw);
  await page.route('**/__qa_native_v034.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.resolve('src/native.js'),'utf8')}));
  await page.addScriptTag({url:'/__qa_native_v034.js'});await page.evaluate(()=>Object.setPrototypeOf(RoyalePresentation.hud,RoyaleNative.Scene.prototype));
 }
 const report=await page.evaluate(()=>{
  const hud=RoyalePresentation.hud,names=Object.keys(hud.data.exports).filter(n=>n.startsWith('hp_')),old=window.referenceSceneDraw||hud.draw,results=[];
  const cv=()=>{const c=document.createElement('canvas');c.width=640;c.height=400;return c;},a=cv(),b=cv(),ca=a.getContext('2d',{willReadFrequently:true}),cb=b.getContext('2d',{willReadFrequently:true});
  for(const name of names)for(const frame of[0,31])for(const progress of[0,.01,.35,.99,1])for(const alpha of[1,.58]){
   const options={frame,still:true,instances:{bar:{progress},prestige:{visible:false},buff:{visible:false},ammo:{visible:false},crown:{frame:0}},texts:{level:'99','hpNumber.txt':'123456',txt:'123456'}};
   const box=hud.bounds(name,frame/(hud.clip(name)?.fps||60));
   for(const c of[ca,cb]){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,640,400);c.setTransform(1.79,0,0,1.79,320.125-(box.x+box.width/2)*1.79,200.375-(box.y+box.height/2)*1.79);c.globalAlpha=alpha;}
   old.call(hud,ca,name,0,options);hud.drawStill(cb,name,options);
   const x=ca.getImageData(0,0,640,400).data,y=cb.getImageData(0,0,640,400).data;let pixels=0,max=0,total=0,visible=0;for(let i=0;i<x.length;i+=4){if(x[i+3])visible++;let changed=false;for(let k=0;k<4;k++){const d=Math.abs(x[i+k]-y[i+k]);if(d)changed=true;max=Math.max(max,d);total+=d;}if(changed)pixels++;}
   results.push({name,frame,progress,alpha,pixels,max,total,visible});
  }
  const bench=(cached)=>{const times=[];for(let round=0;round<12;round++){const start=performance.now();for(let i=0;i<500;i++){const opts={frame:0,still:true,instances:{bar:{frame:37},prestige:{visible:false},buff:{visible:false},ammo:{visible:false},crown:{frame:0}},texts:{level:String(i%14)}};if(cached)hud.drawStill(cb,'hp_player_medium',opts);else old.call(hud,ca,'hp_player_medium',0,opts);}times.push(performance.now()-start);}return times;};
  return{cases:results.length,exact:results.filter(x=>x.pixels===0).length,blank:results.filter(x=>x.visible===0).length,worst:results.reduce((s,x)=>Math.max(s,x.max),0),changed:results.filter(x=>x.pixels),plans:hud.stillPlans.size,bench:{ordinary:bench(false),cached:bench(true)}};
 });fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,changed:report.changed.slice(0,3)}));assert.equal(report.blank,0,'Comparisons must contain visible source pixels');assert.equal(report.exact,report.cases,'Cached source rendering must preserve pixels exactly');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
