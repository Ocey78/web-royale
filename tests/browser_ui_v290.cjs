'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.UI_QA_OUT||path.join(root,'docs/qa/v029/ui'));
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 try{const page=await browser.newPage({viewport:{width:1200,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(process.env.UI_SOURCE_PREVIEW==='1'){
   const modules=JSON.parse(fs.readFileSync(path.join(root,'tools/build-web.js'),'utf8').match(/const modules=(\[[^;]*\]);/)[1]);
   await page.route(/\/app\.[a-f0-9]+\.js$/,r=>r.fulfill({contentType:'application/javascript',body:modules.map(n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8')).join('\n;\n')}));
  }
  await page.goto(process.env.WEB_ROYALE_URL||'http://127.0.0.1:8091');
  await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:60000});
  if(process.env.UI_SOURCE_PREVIEW==='1')await page.addStyleTag({path:path.join(root,'src/v260.css')});
  await page.waitForTimeout(350);
  const checks=[];
  for(const size of [{width:1200,height:960},{width:390,height:844}]){
   await page.setViewportSize(size);await page.evaluate(()=>{RoyaleDemo.applyProfile({...RoyaleCore.normalizeProfile(),chests:[]});RoyaleDemo.show('home');});await page.waitForTimeout(200);
   const empty=page.locator('.chest-slot.empty');assert.equal(await empty.count(),4);
   for(const e of await empty.all()){assert.equal((await e.innerText()).trim(),'','Empty slot has no plus or caption');assert.equal(await e.getAttribute('aria-label'),'Empty chest slot');}
   await page.locator('#viewport').screenshot({path:path.join(out,`home-${size.width}.png`)});
   await page.evaluate(()=>{RoyaleDemo.show('cards');RoyaleDemo.cardSection('decks');});await page.waitForTimeout(200);
   const flag=await page.evaluate(()=>{const s=document.querySelector('#cardsScroll'),e=document.querySelector('.deck-tab.active'),r=e.getBoundingClientRect(),p=getComputedStyle(e,'::before'),scale=r.width/e.offsetWidth;return{top:r.top+(parseFloat(p.top)+parseFloat(getComputedStyle(e).borderTopWidth))*scale,clipTop:s.getBoundingClientRect().top,scale};});
   assert(flag.top>=flag.clipTop+2*flag.scale,'Selected deck flag top border remains below clipping edge');
   await page.locator('#viewport').screenshot({path:path.join(out,`deck-${size.width}.png`)});
   await page.evaluate(()=>RoyaleDemo.librarySection('magic-items'));await page.waitForTimeout(200);
   const angles={'magic-legendary-book':-90,'magic-book-of-books':90,'magic-chest-key':-90};
   for(const [key,angle]of Object.entries(angles)){
    const art=page.locator(`.magic-collection-tile>.magic-item-art[data-ui="${key}"]`);await art.scrollIntoViewIfNeeded();
    const a=await art.evaluate(e=>{const m=new DOMMatrix(getComputedStyle(e).transform),r=e.getBoundingClientRect(),t=e.parentElement.getBoundingClientRect();return{angle:Math.round(Math.atan2(m.b,m.a)*180/Math.PI),loaded:e.complete&&e.naturalWidth>0,contained:r.left>=t.left&&r.right<=t.right&&r.top>=t.top&&r.bottom<=t.bottom};});
    assert.equal(a.angle,angle);assert(a.loaded&&a.contained,'Rotated original item fits its tile');
    await art.click();await page.waitForTimeout(120);
    assert(await page.locator('.magic-item-hero').isVisible());assert.equal(await page.locator('.magic-item-hero>.magic-item-art').getAttribute('data-ui'),key);
    const m=await page.locator('.magic-item-hero>.magic-item-art').evaluate(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return{angle:Math.round(Math.atan2(new DOMMatrix(getComputedStyle(e).transform).b,new DOMMatrix(getComputedStyle(e).transform).a)*180/Math.PI),contained:r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom};});
    assert.equal(m.angle,angle);assert(m.contained,'Rotated original item fits its detail panel');
    if(size.width===1200)await page.locator('#viewport').screenshot({path:path.join(out,key+'.png')});
    await page.locator('[data-action="close"]').first().click();
   }
   await page.locator('#cardsScroll').evaluate(e=>e.scrollTop=0);await page.locator('#viewport').screenshot({path:path.join(out,`magic-${size.width}.png`)});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow');checks.push({viewport:size,flag,items:3,emptySlots:4});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');console.log('UI v0.29 browser checks passed: desktop and phone, original item rotation, flag visibility, empty slots.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});


