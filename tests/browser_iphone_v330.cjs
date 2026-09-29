'use strict';
const {webkit,devices}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(process.env.IPHONE_QA_OUT||'docs/qa/v033/iphone');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await webkit.launch({headless:true}),context=await browser.newContext({...devices['iPhone 13']}),page=await context.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(process.env.WEB_ROYALE_URL||'http://127.0.0.1:8092');await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:60000});
  const meta=await page.evaluate(()=>({manifest:document.querySelector('link[rel="manifest"]')?.href,apple:document.querySelector('link[rel="apple-touch-icon"]')?.href,standalone:document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content}));
  assert(meta.manifest&&meta.apple,'Home Screen metadata must be present');assert.equal(meta.standalone,'yes');
  const manifestResponse=await context.request.get(meta.manifest);assert.equal(manifestResponse.status(),200);const manifest=await manifestResponse.json();assert.equal(manifest.display,'standalone');assert.equal(manifest.name,'Web Royale');
  for(const icon of [...manifest.icons,{src:meta.apple}])assert.equal((await context.request.get(new URL(icon.src,meta.manifest).href)).status(),200);
  checks.push('served Home Screen manifest and icons');
  const bounds=()=>page.evaluate(()=>{const s=document.getElementById('stage').getBoundingClientRect(),v=document.getElementById('viewport').getBoundingClientRect();return{stage:{left:s.left,top:s.top,right:s.right,bottom:s.bottom},view:{left:v.left,top:v.top,right:v.right,bottom:v.bottom},pageWidth:document.documentElement.scrollWidth,width:innerWidth,height:innerHeight};});
  function inside(g){assert(g.view.left>=g.stage.left-1&&g.view.top>=g.stage.top-1&&g.view.right<=g.stage.right+1&&g.view.bottom<=g.stage.bottom+1,'Entire game fits inside usable screen');assert(g.pageWidth<=g.width,'No horizontal page overflow');}
  inside(await bounds());await page.screenshot({path:path.join(out,'home.png')});
  // Model a notched phone's safe rectangle. Desktop WebKit has zero hardware insets.
  await page.evaluate(()=>{document.documentElement.style.setProperty('--app-safe-top','59px');document.documentElement.style.setProperty('--app-safe-bottom','34px');dispatchEvent(new Event('resize'));});
  let g=await bounds();inside(g);assert(Math.abs(g.stage.top-59)<1);assert(Math.abs(g.stage.bottom-(g.height-34))<1);checks.push('notch and home-indicator insets');
  await page.locator('.sandbox-launch').tap();await page.waitForFunction(()=>RoyaleDemo.sandboxUI.ready);await page.locator('#sandboxPause').tap();inside(await bounds());
  await page.locator('#sandboxCard').selectOption('baby-dragon');await page.waitForFunction(()=>RoyaleDemo.sandboxUI.ready);
  await page.locator('#sandboxLevel').fill('99');await page.locator('#sandboxLevel').dispatchEvent('change');
  const point=await page.evaluate(()=>{const q=RoyaleBattleView.toScreen({x:6*RoyaleCore.SX,y:22*RoyaleCore.SY}),r=document.getElementById('viewport').getBoundingClientRect();return{x:r.left+q.x*r.width/540,y:r.top+q.y*r.height/RoyaleBattleView.layout.height};});
  await page.touchscreen.tap(point.x,point.y);assert(await page.evaluate(()=>RoyaleDemo.battle.units.some(u=>u.entity==='BabyDragon'&&u.level===99)));checks.push('touch deployment remains aligned after safe-area fitting');
  await page.screenshot({path:path.join(out,'sandbox.png')});
  // Exercise Safari's separate visible viewport used while its keyboard is shown.
  await page.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:510});Object.defineProperty(visualViewport,'offsetTop',{configurable:true,value:20});visualViewport.dispatchEvent(new Event('resize'));});
  g=await bounds();inside(g);assert(Math.abs(g.stage.top-79)<1);assert(Math.abs(g.stage.bottom-496)<1);checks.push('visual viewport keyboard height and offset');
  await page.evaluate(()=>{delete visualViewport.height;delete visualViewport.offsetTop;document.documentElement.style.removeProperty('--app-safe-top');document.documentElement.style.removeProperty('--app-safe-bottom');visualViewport.dispatchEvent(new Event('resize'));});
  await page.setViewportSize({width:844,height:390});inside(await bounds());await page.setViewportSize({width:390,height:664});inside(await bounds());checks.push('rotation and changing Safari toolbar height');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({browser:browser.version(),emulation:'iPhone 13; desktop WebKit, not physical iOS',checks,errors},null,2));console.log('WebKit iPhone Home Screen assets, safe areas, touch placement and viewport resizing pass.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
