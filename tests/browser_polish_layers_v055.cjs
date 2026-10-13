'use strict';
const fs=require('node:fs'),path=require('node:path'),A=require('node:assert/strict');
const {chromium}=require('C:/Users/Oceyi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),compare=process.argv.includes('--compare'),out=path.resolve(process.env.POLISH_QA_OUT||path.join(root,'docs/qa/v055/layers')),url=process.env.WEB_ROYALE_URL||'http://127.0.0.1:8087/';
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),page=await browser.newPage({viewport:{width:1080,height:1920},serviceWorkers:'block'}),report={mode:compare?'built-baseline-and-source-preview':'built-release',errors:[],screenshots:[]};page.on('pageerror',e=>report.errors.push(e.message));
try{
 await page.goto(url);await page.waitForFunction(()=>window.RoyaleDemo&&document.querySelector('#loading.hidden'),null,{timeout:180000});report.version=await page.evaluate(()=>RoyaleBundle.project.version);
 const capture=async name=>{await page.locator('#viewport').screenshot({path:path.join(out,name+'.png')});report.screenshots.push(name+'.png');};
 await page.evaluate(()=>RoyaleDemo.show('home'));await capture(compare?'home-before':'home');
 if(compare){await page.addStyleTag({path:path.join(root,'src/v550.css')});await capture('home-after');}
 for(const size of [{width:390,height:844},{width:1440,height:900}]){await page.setViewportSize(size);report['layout'+size.width]=await page.evaluate(()=>{const h=document.querySelector('#home'),r=h.getBoundingClientRect(),nav=h.querySelector('.bottom-nav').getBoundingClientRect(),battle=h.querySelector('.home-battle').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth+1,navInside:nav.top>=r.top&&nav.bottom<=r.bottom+1,battleInside:battle.left>=r.left&&battle.right<=r.right+1};});A.ok(Object.values(report['layout'+size.width]).every((v,i)=>i===0?!v:v));await capture('home-'+size.width);}
 await page.setViewportSize({width:1080,height:1920});
 const setup=await page.evaluate(async()=>{
  const C=RoyaleCore,lib=RoyaleDemo.native,deck=['knight','giant','baby-dragon','musketeer','skeletons','golem','fireball','arrows'],b=new C.Battle({deck,enemyDeck:deck,ai:false,seed:550,arenaId:'royal'});lib.setArena('royal');await lib.prepareBattle(b,C.DATA);window.polishBattle=b;
  for(const team of [0,1]){const y=team?240:440;for(const [id,x,dy]of [['Knight',150,0],['Giant',155,25],['Musketeer',260,0],['BabyDragon',265,25],['Skeleton',350,0],['Golem',355,22]]){const u=b.spawn(id,team,x,y+dy,{wait:0,level:11});u.hp=Math.floor(u.maxHp*.65);u.lastDamagedAt=-10;u.visualState='idle';u.visualTime=.6;}}
  if(RoyaleBundle.project.version==='0.55.0'){
   const modern=['KnightHero','BowlerHero'];RoyaleModern3D.beginFrame(modern);await RoyaleModern3D.prepareActors(modern);
   for(const team of[0,1])for(const [i,id]of modern.entries()){const u=b.spawn(id,team,200+i*100,team?335:535,{wait:0,level:11});u.hp=Math.floor(u.maxHp*.65);u.lastDamagedAt=-10;u.visualState='idle';u.visualTime=.6;}
  }
  b.visualTime=.6;return{digest:JSON.stringify(RoyaleReplay.digest(b)),actors:b.units.map(u=>u.entity)};
 });report.actors=setup.actors;
 const arena=async name=>{const result=await page.evaluate(()=>{const cv=document.createElement('canvas');cv.width=1080;cv.height=1920;const c=cv.getContext('2d');c.scale(2,2);RoyaleDraw.battle(c,polishBattle,.6,null,null);return{png:cv.toDataURL().split(',')[1],digest:JSON.stringify(RoyaleReplay.digest(polishBattle))};});A.equal(result.digest,setup.digest,'presentation cannot alter replay state');fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(result.png,'base64'));report.screenshots.push(name+'.png');};
 await arena(compare?'battle-before':'battle');
 if(compare){await page.evaluate(fs.readFileSync(path.join(root,'src/draw.js'),'utf8'));await arena('battle-after');}
 A.deepEqual(report.errors,[]);report.passed=true;
}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}console.log(JSON.stringify(report,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
