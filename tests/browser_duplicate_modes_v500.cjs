'use strict';
const A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const out=path.resolve(process.env.DUPLICATE_QA_OUT||path.join(__dirname,'../docs/qa/v050/duplicates'));fs.mkdirSync(out,{recursive:true});
const cases=[['FourCardDeck',4],['SixCardDeck',6],['TwelveCardDeck',12],['Default',8],['TeamVsTeam',8],['Touchdown',8],['Touchdown2v2',8]];
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:process.env.BROWSER_CHANNEL||'msedge'})});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
  // Optional source preview exercises edits against the existing asset build without rebuilding or modifying dist.
  if(process.env.UI_SOURCE_PREVIEW==='1'){
   const build=fs.readFileSync(path.join(__dirname,'../tools/build-web.js'),'utf8'),modules=JSON.parse(build.match(/const modules=(\[[^;]*\]);/)[1]);modules.unshift('preload');
   const source=modules.map(name=>fs.readFileSync(path.join(__dirname,'../src/'+name+'.js'),'utf8')).join('\n;\n');
   await page.route(/\/app\.[a-f0-9]+\.js(?:\?|$)/,route=>route.fulfill({contentType:'text/javascript',body:source}));
  }
  async function ready(){await page.waitForFunction(()=>window.RoyaleDemo&&document.querySelector('#loading.hidden'),null,{timeout:60000});}
  async function cheats(){await page.evaluate(()=>RoyaleDemo.show('home'));await page.locator('[data-action="menu"]').first().click();await page.locator('#modalPanel [data-action="settings"]').click();await page.locator('#modalPanel [data-action="cheats"]').click();}
  async function openMode(mode){await page.evaluate(()=>RoyaleDemo.show('events'));await page.locator(`[data-action="special-deck-builder"][data-mode="${mode}"]`).click();await page.locator('#modeDeck.active').waitFor();}
  await page.goto(process.env.WEB_ROYALE_URL||'http://127.0.0.1:8087');await ready();await page.evaluate(()=>RoyaleDemo.applyProfile(RoyaleCore.normalizeProfile()));
  await cheats();await page.getByRole('checkbox',{name:'Duplicate cards in decks',exact:true}).check();await page.locator('#modalPanel [data-action="close"]').first().click();
  for(const [mode,size]of cases){
   await openMode(mode);await page.locator('#modeDeckSearch').fill('Knight');
   for(let slot=0;slot<size;slot++){
    await page.locator(`[data-action="special-deck-slot"][data-index="${slot}"]`).click();await page.locator('[data-action="special-deck-pick"][data-id="knight"]').click();
   }
   A.equal(await page.locator('[data-action="special-deck-pick"][data-id="knight"]').evaluate(e=>e.classList.contains('in-deck')),false);
   A.match(await page.locator('#modeDeckCollectionNote').textContent(),/Duplicate cards enabled for practice/);
   A.equal(await page.locator('#modeDeckBattle').isEnabled(),true);
   const saved=await page.evaluate(mode=>RoyaleDemo.profile[RoyaleCore.MODE_DECKS[mode].key],mode);A.deepEqual(saved,Array(size).fill('knight'),mode);
   if(mode==='TwelveCardDeck')await page.locator('#viewport').screenshot({path:path.join(out,'twelve-card-editor.png')});
   await page.locator('#modeDeckBattle').click();await page.waitForFunction(()=>RoyaleDemo.battle&&!RoyaleDemo.preparing,null,{timeout:60000});
   const b=await page.evaluate(()=>{const b=RoyaleDemo.battle;b.paused=true;return{mode:b.mode,deck:b.initialDecks[0],hand:b.hand[0],queue:b.queue[0],practice:b.practice};});
   A.equal(b.mode,mode);A.deepEqual(b.deck,Array(size).fill('knight'));A.deepEqual(b.hand,['knight','knight','knight','knight']);A.deepEqual(b.queue,Array(size-4).fill('knight'));A.equal(b.practice,true);
   A.equal(await page.locator('#hand .hand-card').count(),4);A.equal(await page.locator('#hand .hand-card').filter({has:page.locator('[alt="Knight"]')}).count(),4);
   if(mode==='TwelveCardDeck')await page.locator('#viewport').screenshot({path:path.join(out,'twelve-card-hand.png')});
   checks.push({mode,size,saved,battle:b});console.log('Duplicate mode editor and real battle passed:',mode);
   await page.evaluate(()=>RoyaleDemo.show('home'));
  }
  await page.reload();await ready();for(const [mode,size]of cases)A.deepEqual(await page.evaluate(mode=>RoyaleDemo.profile[RoyaleCore.MODE_DECKS[mode].key],mode),Array(size).fill('knight'),mode+' reload');
  await openMode('OneShot');await page.locator('#modeDeckSearch').fill('');for(const id of ['fireball','miner','mortar','x-bow','goblin-drill'])A.equal(await page.locator(`[data-action="special-deck-pick"][data-id="${id}"]`).count(),0,id+' restricted');
  await cheats();await page.getByRole('checkbox',{name:'Duplicate cards in decks',exact:true}).uncheck();await page.locator('#modalPanel [data-action="close"]').first().click();
  const repaired=await page.evaluate(()=>Object.entries(RoyaleCore.MODE_DECKS).map(([mode,cfg])=>({mode,size:cfg.size,deck:RoyaleDemo.profile[cfg.key],libraries:RoyaleDemo.profile.modeDeckSets[mode].decks})));
  for(const item of repaired)for(const deck of [item.deck,...item.libraries]){A.equal(deck.length,item.size,item.mode);A.equal(new Set(deck).size,item.size,item.mode);}
  await openMode('SixCardDeck');const old=await page.evaluate(()=>RoyaleDemo.profile.sixCardDeck);await page.locator('[data-action="special-deck-slot"][data-index="1"]').click();await page.locator(`#modeDeckCollection [data-action="special-deck-pick"][data-id="${old[0]}"]`).click();
  const normal=await page.evaluate(()=>RoyaleDemo.profile.sixCardDeck);A.equal(normal[0],old[1]);A.equal(normal[1],old[0]);A.equal(new Set(normal).size,6);
  A.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sourcePreview:process.env.UI_SOURCE_PREVIEW==='1',checks,reloadPersistence:true,oneShotRestrictions:true,disabledRepair:repaired.length,normalEditorSwap:true,errors},null,2)+'\n');
  console.log('Duplicate modes browser QA passed: actual editors/battles, reload, mode restrictions and disable repair.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
