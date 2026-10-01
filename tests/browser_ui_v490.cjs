'use strict';
const A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const out=path.resolve(process.env.UI_QA_OUT||path.join(__dirname,'../docs/qa/v049/interface'));fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:process.env.BROWSER_CHANNEL||'msedge'})});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  async function ready(){try{await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:60000});if(process.env.UI_STYLE_PREVIEW==='1')await page.addStyleTag({path:path.join(__dirname,'../src/v490.css')});}catch(error){console.error('Startup:',await page.evaluate(()=>({demo:!!window.RoyaleDemo,loading:document.getElementById('loading')?.textContent})),errors);throw error;}}
  async function mainSettings(){await page.evaluate(()=>RoyaleDemo.show('home'));await page.locator('[data-action="menu"]').first().click();await page.locator('[data-action="settings"]').first().click();}
  await page.goto(process.env.WEB_ROYALE_URL||'http://127.0.0.1:8087');await ready();
  await page.evaluate(()=>RoyaleDemo.applyProfile(RoyaleCore.normalizeProfile()));await mainSettings();
  const compact=page.getByRole('switch',{name:'Compact swarm levels',exact:true});
  A.equal(await compact.getAttribute('aria-checked'),'true');
  A.equal(await page.locator('[data-graphics] option[value="ultra"]').count(),4);
  await compact.focus();await page.keyboard.press('Space');
  A.equal(await compact.getAttribute('aria-checked'),'false');A.equal(await page.evaluate(()=>RoyaleDemo.profile.compactSwarmLevels),false);
  await page.locator('[data-graphics="textures"]').selectOption('ultra');
  A.equal(await page.evaluate(()=>RoyaleDemo.profile.compactSwarmLevels),false);
  await page.reload();await ready();await mainSettings();A.equal(await compact.getAttribute('aria-checked'),'false');console.log('Main settings, keyboard toggle and reload persistence passed.');
  await page.locator('#modalPanel [data-action="close"]').first().click();
  await page.evaluate(()=>RoyaleDemo.startBattle('Default',true));await page.waitForFunction(()=>RoyaleDemo.battle&&!RoyaleDemo.preparing);
  await page.evaluate(()=>RoyaleDemo.pause());await page.locator('#modalPanel [data-action="settings"]').click();
  A.equal(await compact.getAttribute('aria-checked'),'false');await compact.click();
  A.equal(await page.evaluate(()=>RoyaleDemo.profile.compactSwarmLevels),true);console.log('Paused battle settings passed.');
  await page.locator('#modalPanel [data-action="close"]').first().click();
  await page.evaluate(()=>RoyaleDemo.show('home'));
  await page.evaluate(()=>RoyaleDemo.startSandbox());await page.waitForFunction(()=>RoyaleDemo.sandboxUI.ready);
  const drawChecks=await page.evaluate(async()=>{
   const b=RoyaleDemo.battle;b.paused=true;
   for(const [id,x,y]of [['bats',100,400],['minion-horde',220,400],['skeleton-army',350,450],['goblin-gang',180,530]])b.cast(RoyaleCore.cardAt(id),0,x,y);
   for(const u of b.units)u.wait=0;
   const expected=b.units.filter(u=>b.isPresent(u)&&RoyaleLevelLabels.visible(u)).length;
   const original=RoyaleLevelLabels.plan,checks=[];let resolveNext=null;
   RoyaleLevelLabels.plan=function(...args){const p=original(...args);if(resolveNext){const resolve=resolveNext;resolveNext=null;resolve({compact:args[2],individual:p.individual.size,groups:p.groups.length});}return p;};
   try{for(const compact of [false,true]){
    const next=new Promise(resolve=>resolveNext=resolve);RoyaleDemo.applyProfile({...RoyaleDemo.profile,compactSwarmLevels:compact});
    checks.push(await Promise.race([next,new Promise((_,reject)=>setTimeout(()=>reject(Error('No battle render after preference change')),2000))]));
   }}finally{RoyaleLevelLabels.plan=original;}
   return {expected,checks};
  });
  console.log('Renderer label plans:',JSON.stringify(drawChecks));
  A.ok(drawChecks.expected>10);A.equal(drawChecks.checks[0].individual,drawChecks.expected);A.equal(drawChecks.checks[0].groups,0);A.ok(drawChecks.checks[1].groups>0);A.ok(drawChecks.checks[1].individual<drawChecks.expected);
  await page.evaluate(()=>{RoyaleDemo.show('home');RoyaleDemo.applyProfile({...RoyaleCore.normalizeProfile(),highestTrophies:6000,trophies:6000,gold:500000,gems:8000,unlockedCards:RoyaleCore.CARDS.map(c=>c.id)});RoyaleDemo.show('shop');});
  const shopChecks=[];
  for(const size of [{width:1200,height:1000},{width:390,height:844}]){
   await page.setViewportSize(size);
   await page.locator('#shopContent').evaluate(e=>e.scrollTop=0);
   await page.waitForFunction(()=>[...document.querySelectorAll('.card-shop-offer .card-portrait')].every(e=>e.complete&&e.naturalWidth>0));
   const cards=await page.locator('.card-shop-offer').evaluateAll(items=>items.map(e=>{
    const r=e.getBoundingClientRect(),price=e.querySelector('.offer-price'),p=price?.getBoundingClientRect(),frame=e.querySelector('.card-frame');
    return {name:e.querySelector('.offer-title').textContent,quantity:e.querySelector('.offer-quantity').textContent,native:frame.dataset.ui,artLoaded:frame.complete&&frame.naturalWidth>0,contained:!p||(p.left>=r.left&&p.right<=r.right&&p.bottom<=r.bottom),portraitQuantity:e.querySelector('.offer-portrait>b')!==null};
   }));
   A.ok(cards.length>=20);for(const c of cards){A.ok(c.name&&/×/.test(c.quantity));A.ok(c.native==='card-frame-normal'||c.native==='card-frame-legendary');A.ok(c.artLoaded&&c.contained);A.equal(c.portraitQuantity,false);}
   A.ok(await page.locator('.daily-free-offer>.native-button').evaluateAll(buttons=>buttons.every(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return r.left>=p.left&&r.right<=p.right&&r.bottom<=p.bottom;})),'Every daily free reward button fits inside its offer');
   const freeOffsets=await page.locator('.daily-free-offer>.native-button').evaluateAll(buttons=>buttons.map(e=>e.parentElement.getBoundingClientRect().bottom-e.getBoundingClientRect().bottom));A.ok(Math.max(...freeOffsets)-Math.min(...freeOffsets)<2,'Daily reward buttons share the same bottom edge');
   A.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('#viewport').screenshot({path:path.join(out,`shop-${size.width}.png`)});shopChecks.push({viewport:size,cards:cards.length});
  }
  const buy=page.locator('#dailyShop .offer-price').first(),id=await buy.getAttribute('data-card'),old=await page.evaluate(id=>({copies:RoyaleDemo.profile.copies[id],gold:RoyaleDemo.profile.gold}),id);
  await buy.click();const after=await page.evaluate(id=>({copies:RoyaleDemo.profile.copies[id],gold:RoyaleDemo.profile.gold}),id);
  A.ok(after.copies>old.copies&&after.gold<old.gold);A.ok(await page.locator('#dailyShop .card-shop-offer.purchased .offer-collected').count()>0);
  A.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({drawChecks,shopChecks,settings:['main','paused battle','keyboard toggle','reload persistence','graphics independence'],purchase:true,errors},null,2)+'\n');
  console.log('UI v0.49 passed: saved swarm setting, both settings entry paths, individual renderer labels, Ultra choices, desktop/phone shop artwork, purchase.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
