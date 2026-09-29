'use strict';
const {webkit,devices}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await webkit.launch({headless:true}),context=await browser.newContext({...devices['iPhone 13']}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));const url=process.env.WEB_ROYALE_URL||'http://127.0.0.1:8093';
 try{
  let started=Date.now();await page.goto(url);await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:180000});
  const cold=await page.evaluate(()=>({preload:RoyaleDemo.assetPreloader.summary(),worker:RoyaleDemo.assetWorkerReady,controlled:!!navigator.serviceWorker.controller,decodedScenes:Object.keys(RoyaleDemo.native.scenes).length})),coldMs=Date.now()-started;
  assert.equal(cold.preload.status,'ready');assert.equal(cold.preload.cacheMode,'persistent');assert(cold.preload.total>1100);assert.equal(cold.preload.completed,cold.preload.total);assert(cold.worker&&cold.controlled);assert(cold.decodedScenes<15,'Full preloading must not decode all scenes into RAM');
  console.log(JSON.stringify({cold,coldMs}));
  // WebKit's emulated offline switch blocks even service-worker responses.
  // The server never emits X-Royale-SHA256: this proves every read hit our cache.
  const cachedReplay=await page.evaluate(async()=>{
   const cache=await caches.open(RoyalePreload.CACHE),keys=await cache.keys();let next=0,read=0,bytes=0;
   await Promise.all(Array.from({length:4},async()=>{while(next<keys.length){const key=keys[next++];try{const response=await fetch(key.url);if(!response.ok||! /^[a-f0-9]{64}$/.test(response.headers.get('X-Royale-SHA256')||''))throw Error('Cache read missed');bytes+=(await response.arrayBuffer()).byteLength;read++;}catch(error){throw Error(key.url+': '+error.message);}}}));return{read,bytes};
  });
  assert.equal(cachedReplay.read,cold.preload.total);assert.equal(cachedReplay.bytes,cold.preload.totalBytes);
  await page.locator('.sandbox-launch').tap();await page.waitForFunction(()=>RoyaleDemo.sandboxUI.ready,null,{timeout:30000});await page.locator('#sandboxPause').tap();
  await page.locator('#sandboxCard').selectOption('mother-witch');await page.waitForFunction(()=>RoyaleDemo.sandboxUI.ready,null,{timeout:30000});
  assert(await page.evaluate(()=>Object.keys(RoyaleDemo.native.scenes).length>0));
  started=Date.now();await page.reload();await page.waitForFunction(()=>RoyaleDemo.assetPreloader.summary().status==='ready'&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:120000});
  const warm=await page.evaluate(()=>RoyaleDemo.assetPreloader.summary()),warmMs=Date.now()-started;assert.equal(warm.downloaded,0);assert.equal(warm.fromCache,warm.total);assert.deepEqual(errors,[]);
  const report={browser:browser.version(),emulation:'iPhone 13, desktop WebKit',cold,coldMs,cachedReplay,warm,warmMs,errors};
  const out=path.resolve('docs/verification-v034');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,process.env.PRELOAD_REPORT||'preload-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
