'use strict';
/* Run against a served build: NODE_PATH=<playwright modules> node tests/browser_menu_recovery.cjs.
   MENU_CSS_PREVIEW=1 overlays the source stylesheet for pre-build visual review. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.MENU_QA_OUT||path.join(root,'docs/qa/menu-recovery'));
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:960}}),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!(r.status()===404&&new URL(r.url()).pathname==='/__webroyale_ai__/capabilities'))missing.push(r.url());});
  await page.goto(process.env.WEB_ROYALE_URL||'http://127.0.0.1:8087');
  await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:60000});
  if(process.env.MENU_CSS_PREVIEW==='1')await page.addStyleTag({path:path.join(root,'src/v260.css')});
  await page.evaluate(()=>RoyaleDemo.applyProfile({...RoyaleCore.normalizeProfile(),trophies:5300,highestTrophies:5300,gold:999999,gems:10000,experience:168770}));
  const checks=[];
  for(const size of [{width:1200,height:960},{width:390,height:844}]){
   await page.setViewportSize(size);await page.evaluate(()=>RoyaleDemo.show('clan'));await page.waitForTimeout(150);
   assert.equal(await page.locator('#viewport').evaluate(e=>e.clientHeight),960);
   assert.equal(await page.locator('#viewport').evaluate(e=>e.clientWidth),540);
   assert(await page.locator('#clan>.topbar').isVisible(),'Social hub resource bar must be visible');
   await page.evaluate(()=>RoyaleDemo.social.browse());await page.waitForTimeout(150);
   const scroll=page.locator('#clanContent'),box=await scroll.boundingBox();
   assert.equal(await scroll.evaluate(e=>getComputedStyle(e).overflowY),'auto');
   assert.equal(await page.locator('.clan-directory-row').count(),12);
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,4000);await page.waitForTimeout(250);
   assert(await scroll.evaluate(e=>e.scrollTop>200),'Clan search must scroll with normal wheel/touch scrolling');
   const last=await page.locator('.social-pagination').boundingBox();
   assert(last.y>=box.y-1&&last.y+last.height<=box.y+box.height+1,'Clan pagination must be reachable above navigation');
   if(size.width===1200)await page.locator('#viewport').screenshot({path:path.join(out,'clan-search.png')});
   await page.evaluate(()=>{const p=RoyaleDemo.profile;if(!p.world.currentClan){const c=RoyaleWorld.browseClans(p,{limit:12}).find(c=>c.type==='Open'&&c.count<50&&c.requiredTrophies<=p.trophies),r=RoyaleWorld.joinClan(p,c.id);if(!r.ok)throw Error(r.reason);RoyaleDemo.applyProfile(r.profile);}RoyaleDemo.show('clanChat');});
   await page.waitForTimeout(150);
   // Use a long real name to exercise the two-line heading, not just the short fixture name.
   await page.evaluate(()=>{const p=RoyaleDemo.profile,id=p.world.currentClan;p.world.clans[id]={...RoyaleWorld.clan(p,id),name:'Wide Crown Keepers United'};RoyaleDemo.applyProfile(p);RoyaleDemo.show('clanChat');});
   await page.waitForTimeout(100);
   const chat=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom};};
    return{header:rect(document.getElementById('clanChatHeader')),name:rect(document.querySelector('#clanChatHeader b')),war:rect(document.querySelector('#clanChatHeader>.native-button')),messages:rect(document.getElementById('clanChatContent')),actions:rect(document.getElementById('clanChatActions')),composer:rect(document.getElementById('ecoChatForm')),footer:rect(document.querySelector('#clanChat .done-tray')),buttons:[...document.querySelectorAll('#clanChatActions .native-button')].map(e=>({text:e.textContent,box:rect(e),children:[...e.children].filter(c=>!c.classList.contains('sr-only')).map(rect)}))};
   });
   assert(chat.header.bottom<=chat.messages.y+1);assert(chat.messages.bottom<=chat.actions.y+1);assert(chat.composer.bottom<=chat.footer.y+1);
   assert(chat.name.y>=chat.header.y&&chat.name.bottom<=chat.header.bottom,'Long clan name must stay inside the header');assert(chat.name.right<=chat.war.x,'Clan name must have a separate War button lane');
   for(const button of chat.buttons)for(const child of button.children){assert(child.x>=button.box.x-1&&child.right<=button.box.right+1,button.text+' must fit horizontally');assert(child.y>=button.box.y-1&&child.bottom<=button.box.bottom+1,button.text+' icon and caption must fit inside the visible button');}
   await page.locator('#ecoChatInput').fill('Menu layout verification');await page.locator('[data-action="soc-send"]').click();
   assert.match(await page.locator('#clanChatContent').innerText(),/Menu layout verification/);
   if(size.width===1200)await page.locator('#viewport').screenshot({path:path.join(out,'clan-chat.png')});
   await page.evaluate(()=>RoyaleDemo.social.war('river'));await page.waitForTimeout(150);
   const defenseSizes=await page.locator('.war-boat-row>.native-button .royale-label').evaluateAll(es=>es.map(e=>Number(e.dataset.fittedSize)));
   assert.equal(defenseSizes.length,4);assert(defenseSizes.every(n=>n>=12),'Boat-defense controls must use readable text');
   await page.locator('#modalPanel').evaluate(e=>e.scrollTop=e.scrollHeight);await page.waitForTimeout(100);
   assert(await page.locator('.war-tasks').isVisible());
   const over=await page.locator('#modalPanel').evaluate(e=>e.scrollWidth>e.clientWidth+1);assert(!over,'War panel must not overflow horizontally');
   if(size.width===1200)await page.locator('#viewport').screenshot({path:path.join(out,'clan-wars.png')});
   checks.push({viewport:size,defenseFontSizes:defenseSizes,chatButtons:chat.buttons.length});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({checks,errors,missing},null,2));
  console.log('Menu recovery checks passed at desktop and phone sizes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
