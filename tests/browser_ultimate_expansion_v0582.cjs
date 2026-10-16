'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),url=process.env.WEB_ROYALE_URL||'http://127.0.0.1:8095',out=path.resolve(process.env.ULTIMATE_QA_OUT||path.join(root,'docs/qa/v0582/local/expansion'));
const cards=require('../src/ultimate-clash').CARDS.slice(20,30),report={url,cards:[],errors:[],screenshots:[]};let server,browser;
async function main(){
 fs.mkdirSync(out,{recursive:true});
 if(!process.env.WEB_ROYALE_URL){server=spawn(process.execPath,['tools/serve.cjs','8095'],{cwd:root,stdio:['ignore','pipe','pipe'],windowsHide:true});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});}
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});const page=await browser.newPage({viewport:{width:1000,height:1080},serviceWorkers:process.env.WEB_ROYALE_URL?'allow':'block'});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.RoyaleDemo&&document.querySelector('#loading.hidden'),null,{timeout:240000});
 report.version=await page.evaluate(()=>RoyaleBundle.version);assert.equal(report.version,require('../project.json').version);
 const capture=async name=>{await page.locator('#viewport').screenshot({path:path.join(out,name+'.png')});report.screenshots.push(name+'.png');};
 await page.locator('button[data-action="nav-events"]:visible').first().click();await page.locator('[data-action="special-deck-builder"][data-mode="UltimateClash"]').click();
 assert.equal(await page.locator('#modeDeckCollection [data-action="special-deck-pick"]').count(),require('../src/ultimate-clash').CARDS.length);
 for(const c of cards){const node=page.locator('#modeDeckCollection [data-id="'+c.id+'"]');assert.equal(await node.locator('.cost').textContent(),String(c.cost));await node.scrollIntoViewIfNeeded();await node.locator('img.card-portrait').evaluate(async i=>{await i.decode();if(!i.naturalWidth)throw Error('Missing art');});}
 await capture('new-card-collection');
 await page.locator('#modeDeckBattle').click();await page.waitForFunction(()=>RoyaleDemo.battle?.mode==='UltimateClash'&&document.querySelector('#battle.active'),null,{timeout:240000});
 await page.evaluate(async ids=>{const b=RoyaleDemo.battle;b.ai=false;b.paused=true;b.initialDecks=[ids.slice(0,8),ids.slice(2)];await RoyaleNative.library.prepareBattle(b,RoyaleCore.DATA);window.expansionPaint=[];const lib=RoyaleNative.library,original=lib.unit;lib.unit=function(ctx,name,...args){const ok=original.call(this,ctx,name,...args);if(name.startsWith('Ultimate'))window.expansionPaint.push({name,ok});return ok;};},cards.map(c=>c.id));
 for(const c of cards){
  const state=await page.evaluate(slug=>{const b=RoyaleDemo.battle,K=RoyaleCore,S=K.SX,T=K.SY;b.units=[];b.projectiles=[];b.areas=[];b.pending=[];b.effects=[];b.time=5;b.visualTime=5;b.result=null;b.paused=false;for(const t of b.towers)t.readyAt=1e9;window.expansionPaint=[];
   const friend=b.spawn('Knight',0,8*S,(slug==='royale-recall'?9:22)*T,{wait:100});friend.hp*=.5;
   const enemy=b.spawn('Knight',1,(slug==='goblin-magnet'?12:9)*S,(slug==='goblin-magnet'?22:18)*T,{wait:100});
   b.cast(K.cardAt('ultimate-'+slug,11),0,9*S,(slug==='royale-recall'?9:22)*T,0);
   for(let i=0;i<(slug==='royale-recall'?12:80);i++)b.step(1/60);b.paused=true;b.visualTime=b.time;
   return{units:b.units.map(u=>({entity:u.entity,hp:u.hp,scale:u.def.source.UltimateVisualScale})),areas:b.areas.map(a=>a.name),pending:b.pending.length,projectiles:b.projectiles.map(p=>p.name)};
  },c.slug);
  await page.waitForTimeout(150);await capture(c.slug);
  const paint=await page.evaluate(()=>[...new Map(window.expansionPaint.map(x=>[x.name,x])).values()]);assert.ok(paint.every(x=>x.ok!==false),JSON.stringify(paint));
  if(['bowler-giant','dragon-king'].includes(c.slug)){
   const strike=await page.evaluate(slug=>{const b=RoyaleDemo.battle,u=b.units.find(u=>u.ultimate?.kind===slug),t=b.units.find(u=>u.team===1);b.strike(u,t);const state={projectiles:b.projectiles.filter(p=>p.source===u.id).map(p=>({name:p.name,hand:p.ultimate?.hand})),effects:b.effects.map(e=>e.kind)};b.paused=false;for(let i=0;i<12;i++)b.step(1/60);b.paused=true;b.visualTime=b.time;return state;},c.slug);
   if(c.slug==='bowler-giant')assert.equal(strike.projectiles.filter(p=>p.name==='UltimateBowlerGiantProjectile').length,2);else assert.ok(strike.effects.includes('ultimate-dragon-breath'));
   await page.waitForTimeout(150);await capture(c.slug+'-attack');state.strike=strike;
  }
  if(c.slug==='battle-kitchen'){await page.evaluate(()=>{const b=RoyaleDemo.battle;b.units.find(u=>u.entity==='UltimateBattleKitchen').hp=0;b.deaths();b.visualTime=b.time;});await page.waitForTimeout(100);await capture('kitchen-chef');assert.ok(await page.evaluate(()=>RoyaleDemo.battle.units.some(u=>u.entity==='UltimateChef')));}
  report.cards.push({id:c.id,cost:c.cost,paint,...state});
 }
 assert.deepEqual(report.errors,[]);assert.equal(report.cards.length,10);report.passed=true;
}
main().catch(e=>{report.failure=e.stack;console.error(e);process.exitCode=1;}).finally(async()=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'expansion-report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();server?.kill();console.log(JSON.stringify({passed:report.passed,version:report.version,cards:report.cards.length,errors:report.errors}));});
