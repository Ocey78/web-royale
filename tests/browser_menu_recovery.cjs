'use strict';
/* Current menu regression: the former Clan surface is intentionally retired and
   replaced by Online Play — Coming Soon. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.MENU_QA_OUT||path.join(root,'docs/qa/menu-recovery'));
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:960}}),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!(r.status()===404&&new URL(r.url()).pathname==='/__webroyale_ai__/capabilities'))missing.push(r.url());});
  await page.goto(process.env.WEB_ROYALE_URL||'http://127.0.0.1:8087');
  await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:60000});
  const checks=[];
  for(const size of [{width:1200,height:960},{width:390,height:844}]){
   await page.setViewportSize(size);
   await page.evaluate(()=>RoyaleDemo.show('online'));
   await page.waitForTimeout(100);
   assert.equal(await page.locator('#viewport').evaluate(e=>e.clientHeight),960);
   assert.equal(await page.locator('#viewport').evaluate(e=>e.clientWidth),540);
   assert(await page.locator('#online').isVisible(),'Online Play screen must be visible');
   assert.equal(await page.locator('#clan').count(),0,'Legacy Clan screen must not exist');
   assert.equal(await page.locator('#clanChat').count(),0,'Legacy Clan Chat screen must not exist');
   const text=await page.locator('#online').innerText();
   assert.match(text,/Online Play/i);assert.match(text,/Coming Soon/i);
   // Old programmatic clan navigation must safely land on the new Online surface.
   await page.evaluate(()=>RoyaleDemo.show('clan'));
   await page.waitForTimeout(50);
   assert(await page.locator('#online').isVisible(),'Old Clan navigation aliases to Online Play');
   const overflow=await page.locator('#online').evaluate(e=>e.scrollWidth>e.clientWidth+1);
   assert.equal(overflow,false,'Online Play page must not overflow horizontally');
   if(size.width===1200)await page.locator('#viewport').screenshot({path:path.join(out,'online-coming-soon.png')});
   checks.push({viewport:size,online:true});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({checks,errors,missing},null,2));
  console.log('Online Play replacement checks passed at desktop and phone sizes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
