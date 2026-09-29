'use strict';
// Run against a freshly built localhost server, using an isolated temporary profile.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const url=process.env.WEB_ROYALE_URL||'http://127.0.0.1:8087';
const output=path.resolve(process.env.WEB_ROYALE_QA||'docs/qa/v027/browser');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{})});
 const context=await browser.newContext({viewport:{width:1200,height:960}}),page=await context.newPage(),errors=[],missing=[],passed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/__webroyale_ai__/'))missing.push(r.status()+' '+r.url());});
 page.setDefaultTimeout(60000);
 async function check(name,fn){await fn();passed.push(name);console.log('PASS '+name);}
 try{
  await page.goto(url);await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'));
  await check('original catalog and custom collection remain available',async()=>{
   const r=await page.evaluate(()=>({cards:RoyaleCore.CARDS.length,emotes:RoyaleBundle.emotes.entries.length,friends:RoyaleDemo.profile.world.friends.length}));
   assert.deepEqual(r,{cards:102,emotes:206,friends:0});
  });
  await check('Hour Shop keeps twelve rarity slots and no currency purchase controls',async()=>{
   await page.evaluate(()=>{RoyaleDemo.applyProfile({...RoyaleCore.normalizeProfile(),trophies:5300,highestTrophies:5300,gold:999999});RoyaleDemo.show('shop');});
   assert.deepEqual(await page.locator('.shop-deals-section .shop-offer').evaluateAll(els=>els.map(e=>e.dataset.rarity)),['Common','Common','Common','Rare','Rare','Rare','Epic','Epic','Epic','Legendary','Legendary','Legendary']);
   assert.match(await page.locator('#shopRefresh').innerText(),/^\d{2}:\d{2}:\d{2}$/);
   assert.equal(await page.locator('#shopContent #currencySection,#shopContent .gem-packs,.resource .plus').count(),0);
  });
  await page.evaluate(async()=>{await RoyaleDemo.startBattle('Default',true);RoyaleDemo.battle.ai=false;RoyaleDemo.battle.paused=true;});
  await check('accepted battle frame and reference river location stay intact',async()=>{
   for(const size of [{width:1200,height:960},{width:390,height:844},{width:360,height:640}]){
    await page.setViewportSize(size);await page.waitForFunction(()=>{const r=document.getElementById('viewport').getBoundingClientRect();return Math.abs(r.height/r.width-1172/540)<0.0001&&r.x>=-0.1&&r.y>=-0.1&&r.right<=innerWidth+0.1&&r.bottom<=innerHeight+0.1;});
    const box=await page.locator('#viewport').boundingBox();assert.ok(box.x>=-0.1&&box.y>=-0.1&&box.x+box.width<=size.width+0.1&&box.y+box.height<=size.height+0.1);
   }
   assert.ok(Math.abs(await page.evaluate(()=>RoyaleBattleView.toScreen({x:240,y:320}).y)-536.0817563389831)<0.0001);
   await page.setViewportSize({width:1200,height:960});
  });
  await check('tiebreak clears selected card and disables deployment controls',async()=>{
   await page.evaluate(()=>{const b=RoyaleDemo.battle;b.paused=false;RoyaleDemo.select(0);b.paused=true;b.tiebreaker={duration:4};RoyaleDemo.refreshHand(true);});
   assert.equal(await page.evaluate(()=>RoyaleDemo.selected),null);
   assert.equal(await page.locator('#hand button:disabled').count(),4);
   await page.evaluate(()=>{RoyaleDemo.battle.paused=false;RoyaleDemo.select(1);RoyaleDemo.battle.paused=true;});
   assert.equal(await page.evaluate(()=>RoyaleDemo.selected),null);
   await page.waitForFunction(()=>document.getElementById('battleAnnouncementMain').textContent==='Tiebreaker');
   assert.equal(await page.locator('#multiplier').isVisible(),false);
  });
  await page.evaluate(()=>{RoyaleDemo.battle.tiebreaker=null;RoyaleDemo.show('home');});
  await check('real overtime expiry drains towers and produces one crown/result',async()=>{
   await page.evaluate(async()=>{await RoyaleDemo.startBattle('Default',true);const b=RoyaleDemo.battle;b.ai=false;b.paused=true;b.time=300;b.overtime=true;for(const t of b.towers)t.hp=1000;b.towers.find(t=>t.team===1&&!t.king).hp=100;b.checkResult();});
   assert.equal(await page.evaluate(()=>RoyaleDemo.battle.result),null);
   await page.evaluate(()=>{const b=RoyaleDemo.battle;b.paused=false;for(let i=0;i<150;i++)b.step(1/60);b.paused=true;RoyaleDemo.refreshHand(true);});
   const middle=await page.evaluate(()=>({health:RoyaleDemo.battle.towers.find(t=>t.team===1&&!t.king).hp,remaining:RoyaleDemo.battle.secondsLeft,result:RoyaleDemo.battle.result}));
   assert.ok(middle.health>49&&middle.health<51);assert.equal(middle.remaining,0);assert.equal(middle.result,null);
   await page.waitForFunction(()=>document.getElementById('battleAnnouncementMain').textContent==='Tiebreaker');
   await page.locator('#battleAnnouncement').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));
   await page.locator('#viewport').screenshot({path:path.join(output,'tiebreaker.png')});
   await page.evaluate(()=>{const b=RoyaleDemo.battle;b.paused=false;for(let i=0;i<100;i++)b.step(1/60);b.paused=true;RoyaleDemo.refreshHand(true);});
   const end=await page.evaluate(()=>({result:RoyaleDemo.battle.result,crowns:RoyaleDemo.battle.crowns,events:RoyaleDemo.battle.events.filter(e=>e.type==='result').length}));
   assert.equal(end.result.winner,0);assert.equal(end.result.reason,'Tiebreaker');assert.deepEqual(end.crowns,[1,0]);assert.equal(end.events,1);
   await page.waitForFunction(()=>!document.getElementById('endOk').hidden);await page.locator('#endOk').click();
  });
  await check('all fifteen original arenas load in regulation and overtime',async()=>{
   await page.evaluate(async()=>{await RoyaleDemo.startBattle('Default',true);RoyaleDemo.battle.ai=false;RoyaleDemo.battle.paused=true;});
   const rows=await page.evaluate(async()=>{const l=RoyaleDemo.native,rows=[];for(const a of l.data.arenas){l.setArena(a.id);await l.prepareBattle(RoyaleDemo.battle,RoyaleCore.DATA);for(const ot of [false,true]){const c=document.createElement('canvas');c.width=540;c.height=1172;const x=c.getContext('2d');x.translate(RoyaleBattleView.camera.x,RoyaleBattleView.camera.y);x.scale(RoyaleBattleView.camera.scale,RoyaleBattleView.camera.scale);const ok=l.drawArena(x,3,ot),pixels=c.getContext('2d').getImageData(0,0,540,1172).data;let visible=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])visible++;rows.push({id:a.id,ot,ok,visible});}}return rows;});
   assert.equal(rows.length,30);assert.ok(rows.every(r=>r.ok&&r.visible>390000));fs.writeFileSync(path.join(output,'arena-audit.json'),JSON.stringify(rows,null,2));
   await page.evaluate(()=>RoyaleDemo.show('home'));
  });
  await check('profile survives a real localhost reload',async()=>{
   const before=await page.evaluate(()=>RoyaleDemo.profile.trophies);await page.reload();await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'));
   assert.equal(await page.evaluate(()=>RoyaleDemo.profile.trophies),before);
  });
  await check('no uncaught script errors or missing game files',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);});
 }finally{
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed,errors,missing},null,2));
  await page.screenshot({path:path.join(output,'last-screen.png')}).catch(()=>{});await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
