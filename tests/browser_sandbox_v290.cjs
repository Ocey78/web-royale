'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.SANDBOX_QA_OUT||path.join(root,'docs/qa/v029/sandbox'));fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 try{const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(process.env.UI_SOURCE_PREVIEW==='1'){
   const modules=JSON.parse(fs.readFileSync(path.join(root,'tools/build-web.js'),'utf8').match(/const modules=(\[[^;]*\]);/)[1]);
   for(const name of ['sandbox','sandbox-ui'])if(!modules.includes(name))modules.splice(modules.indexOf('app'),0,name);
   await page.route(/\/app\.[a-f0-9]+\.js$/,r=>r.fulfill({contentType:'application/javascript',body:modules.map(n=>fs.readFileSync(path.join(root,'src',n+'.js'),'utf8')).join('\n;\n')}));
  }
  await page.goto(process.env.WEB_ROYALE_URL||'http://127.0.0.1:8091');await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:60000});
  if(process.env.UI_SOURCE_PREVIEW==='1')for(const file of ['v260.css','sandbox.css'])await page.addStyleTag({path:path.join(root,'src',file)});
  const before=await page.evaluate(()=>{const p=RoyaleDemo.profile;window.sandboxWrites={learning:0,replay:0};RoyaleDemo.learningStore.commit=async()=>{sandboxWrites.learning++};RoyaleDemo.replayStore.put=async()=>{sandboxWrites.replay++};return{gold:p.gold,gems:p.gems,trophies:p.trophies,battleSerial:p.battleSerial,levels:p.cardLevels,chests:p.chests};});
  assert(await page.locator('#home>.sandbox-launch').isVisible(),'Home has a real Sandbox shortcut');
  await page.locator('#home>.sandbox-launch').click();await page.waitForFunction(()=>RoyaleDemo.sandboxUI.ready);
  assert.equal(await page.locator('#sandboxCard option').count(),102);assert.equal(await page.locator('#viewport').evaluate(e=>e.clientHeight),1172);assert(!(await page.locator('.hand-panel').isVisible()));
  async function choose(id,level,team){await page.locator('#sandboxCard').selectOption(id);await page.waitForFunction(()=>RoyaleDemo.sandboxUI.ready);await page.locator('#sandboxLevel').fill(String(level));await page.locator('#sandboxLevel').dispatchEvent('change');await page.locator(`[data-sandbox-team="${team}"]`).click();}
  async function place(x,y){const p=await page.evaluate(({x,y})=>{const p=RoyaleBattleView.toScreen({x,y}),r=document.getElementById('viewport').getBoundingClientRect();return{x:r.x+p.x*r.width/540,y:r.y+p.y*r.height/1172};},{x,y});await page.mouse.click(p.x,p.y);}
  await page.locator('#sandboxPause').click();assert.equal(await page.evaluate(()=>RoyaleDemo.battle.paused),true);
  await choose('knight',0,0);await place(100,100);assert(await page.evaluate(()=>RoyaleDemo.battle.units.some(u=>u.team===0&&u.level===0&&u.y<150)),'Blue level0 can be placed on red side');
  await choose('guards',99,1);await place(400,500);assert(await page.evaluate(()=>RoyaleDemo.battle.units.some(u=>u.team===1&&u.level===99&&u.y>450)),'Red level99 can be placed on blue side');
  await choose('mirror',99,1);await place(400,440);assert.equal(await page.evaluate(()=>RoyaleDemo.battle.units.filter(u=>u.team===1&&u.level===99).length),6,'Mirror duplicates red Guards at99');
  await page.locator('[data-action="sandbox-clear"]').click();assert.equal(await page.evaluate(()=>RoyaleDemo.battle.units.length),0);
  await page.locator('[data-action="sandbox-towers"]').click();await page.locator('[data-action="sandbox-towers-off"]').click();await page.locator('#sandboxTowerLevel').fill('99');await page.locator('[data-action="sandbox-towers-apply"]').click();
  assert.equal(await page.evaluate(()=>RoyaleDemo.battle.towers.length),0);assert.equal(await page.evaluate(()=>RoyaleDemo.battle.sandboxLevel),99);assert.equal(await page.evaluate(()=>RoyaleDemo.battle.paused),true);
  await choose('baby-dragon',13,0);await place(240,400);await page.locator('#sandboxTargets').check();await page.locator('#sandboxPause').click();
  await page.evaluate(()=>{RoyaleDemo.battle.time=10000;for(let i=0;i<300;i++)RoyaleDemo.session.advance(1/60);});
  const idle=await page.evaluate(()=>{const b=RoyaleDemo.battle,u=b.units[0];return{time:b.time,result:b.result,tiebreaker:b.tiebreaker,target:u?.targetId,x:u?.x,y:u?.y};});
  assert(idle.time>10004&&!idle.result&&!idle.tiebreaker&&!idle.target&&Math.abs(idle.x-240)<.001&&Math.abs(idle.y-400)<.001,'No enemy means idle, without time/result cutoff: '+JSON.stringify(idle));
  await page.locator('#sandboxPause').click();await choose('fireball',99,1);await place(240,400);assert.equal(await page.evaluate(()=>RoyaleDemo.battle.projectiles.at(-1).level),99);
  for(const size of [{width:1200,height:1000},{width:390,height:844}]){
   await page.setViewportSize(size);await page.waitForTimeout(150);await page.locator('#viewport').screenshot({path:path.join(out,`sandbox-${size.width}.png`)});
   const containment=await page.evaluate(()=>{const panel=document.querySelector('.sandbox-controls').getBoundingClientRect();return[...document.querySelectorAll('.sandbox-controls button,.sandbox-controls select,.sandbox-controls input')].every(e=>{const r=e.getBoundingClientRect();return r.left>=panel.left&&r.right<=panel.right&&r.top>=panel.top&&r.bottom<=panel.bottom;});});assert(containment,'Every sandbox control fits the hand lane');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
   await page.locator('[data-action="sandbox-towers"]').click();await page.locator('#viewport').screenshot({path:path.join(out,`towers-${size.width}.png`)});
   const box=await page.locator('#sandboxTowers').boundingBox(),v=await page.locator('#viewport').boundingBox();assert(box.x>=v.x&&box.x+box.width<=v.x+v.width&&box.y+box.height<=v.y+v.height);
   await page.locator('[data-action="sandbox-towers-cancel"]').click();
  }
  await page.locator('[data-action="sandbox-towers"]').click();await page.locator('[name="red-left"]').check();await page.locator('#sandboxTowerLevel').fill('13');await page.locator('[data-action="sandbox-towers-apply"]').click();
  await choose('baby-dragon',13,0);await place(240,400);await page.locator('#sandboxPause').click();await page.evaluate(()=>{for(let i=0;i<180;i++)RoyaleDemo.session.advance(1/60);});await page.locator('#sandboxPause').click();
  assert(await page.evaluate(()=>{const b=RoyaleDemo.battle,u=b.units[0],t=b.getEntity(u.targetId);return t?.team===1&&t?.king===false;}),'Show targets has the actual selected enemy tower');
  await page.waitForTimeout(100);await page.locator('#viewport').screenshot({path:path.join(out,'target-lines-phone.png')});
  await page.locator('[data-action="sandbox-exit"]').click();assert.equal(await page.evaluate(()=>RoyaleDemo.screen),'home');assert.equal(await page.locator('#sandboxUI').count(),0);await page.evaluate(()=>RoyaleDemo.archivePending);
  for(const size of [{width:1200,height:1000},{width:390,height:844}]){
   await page.setViewportSize(size);await page.waitForTimeout(150);
   const shortcut=await page.locator('#home>.sandbox-launch').boundingBox(),main=await page.locator('#battleButton').boundingBox(),slots=await page.locator('#chestSlots').boundingBox(),v=await page.locator('#viewport').boundingBox();
   assert(shortcut.x>=main.x+main.width&&shortcut.x+shortcut.width<=v.x+v.width,'Sandbox fits beside Battle');assert(shortcut.y+shortcut.height<slots.y,'Sandbox remains clear of chest slots');
   await page.locator('#viewport').screenshot({path:path.join(out,`home-shortcut-${size.width}.png`)});
  }
  await page.locator('#home>.sandbox-launch').click();await page.waitForFunction(()=>RoyaleDemo.sandboxUI.ready);await page.locator('[data-action="sandbox-exit"]').click();await page.evaluate(()=>RoyaleDemo.archivePending);
  const after=await page.evaluate(()=>{const p=RoyaleDemo.profile;return{gold:p.gold,gems:p.gems,trophies:p.trophies,battleSerial:p.battleSerial,levels:p.cardLevels,chests:p.chests};});assert.deepEqual(after,before);assert.deepEqual(await page.evaluate(()=>sandboxWrites),{learning:0,replay:0});assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({viewports:['1200x1000','390x844'],cards:102,levels:[0,13,99],checks:['both teams anywhere','paused placement','Mirror99','tower removal','Baby Dragon idle','unlimited time','spell99','control containment','no save/learning/replay changes'],errors},null,2)+'\n');console.log('Sandbox browser checks passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
