const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function presentation(){
 const source=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8'),start=source.indexOf('// Deck form presentation'),end=source.indexOf('// End deck form presentation',start);
 assert.ok(start>=0&&end>start,'The deck must present physical form slots and inventory actions');
 const box={};vm.runInNewContext(source.slice(start,end)+'\nglobalThis.result=FormUI;',box);return box.result;
}
test('locked Hero slot explains its arena gate without disabling the base card',()=>{
 const ui=presentation(),s=ui.slot({index:1,kind:'hero',available:false,status:'locked',unlockArena:5},'Knight');
 assert.match(s.label,/Hero.*Arena 5.*Knight/);assert.match(s.markup,/Arena 5/);assert.match(s.className,/slot-locked/);assert.doesNotMatch(s.markup,/disabled/);
});
test('Wild slot identifies the equipped form rather than implying an empty form',()=>{
 const ui=presentation(),s=ui.slot({index:2,kind:'wild',available:true,status:'active',selectedFormId:'Knight_EV1'},'Knight',{name:'Knight Evolution',kind:'evolution'});
 assert.match(s.label,/Wild.*Knight Evolution/);assert.match(s.markup,/Evolution/);assert.match(s.className,/slot-active/);
});
test('available special slot with a standard card advertises the eligible form kind',()=>{
 const ui=presentation(),s=ui.slot({index:0,kind:'evolution',available:true,status:'standard'},'Archers');
 assert.match(s.label,/Evolution.*Archers.*no form selected/);assert.match(s.markup,/Evolution/);assert.match(s.className,/slot-standard/);
});
test('Evolution inventory applies exactly one Wild Shard to partial progress',()=>{
 const ui=presentation(),a=ui.inventory({kind:'evolution',id:'Knight_EV1'},{owned:false,amount:4,required:6,canApplyWild:true,canUnlock:false},true);
 assert.equal(a.action,'apply-form-shard');assert.equal(a.disabled,false);assert.match(a.label,/1 Wild Shard/);assert.match(a.progress,/4.*6/);
});
test('Hero choice requires the quoted full cost and never spends on an unavailable form',()=>{
 const ui=presentation(),f={kind:'hero',id:'Knight_hero'};
 assert.equal(ui.inventory(f,{owned:false,amount:199,required:200,canUnlock:false},true).disabled,true);
 const ready=ui.inventory(f,{owned:false,amount:200,required:200,canUnlock:true},true);assert.equal(ready.action,'choose-hero');assert.equal(ready.disabled,false);assert.match(ready.label,/200/);
 assert.equal(ui.inventory(f,{owned:false,amount:200,required:200,canUnlock:true},false).disabled,true);
});
test('owned Evolution replaces the spending action with its unlocked state',()=>{
 const ui=presentation(),a=ui.inventory({kind:'evolution'},{owned:true,amount:6,required:6,canApplyWild:false,canUnlock:false},true);
 assert.equal(a.disabled,true);assert.equal(a.label,'Unlocked');assert.match(a.progress,/Unlocked/);
});
test('inventory click handlers spend Hero Coins once and apply only one shard per click',()=>{
 const K=require('../src/catalog'),Forms=require('../src/card-forms'),MR=require('../src/modern-rewards'),source=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
 const registry=Forms.createRegistry({forms:[{id:'ui-evo',baseCardId:'knight',kind:'evolution',cycles:1,requiredShards:6,source:{...K.CARD_BY_ID.knight.source}},{id:'ui-hero',baseCardId:'knight',kind:'hero',requiredShards:200,source:{...K.CARD_BY_ID.knight.source}}]});
 const start=source.indexOf("case 'deck-forms':"),end=source.indexOf("case 'magic-item':",start);assert.ok(start>=0&&end>start);
 const state={MR,F:registry,profile:{heroCoins:240,evoWildShards:2,formShards:{'ui-evo':4},unlockedForms:[]},save(){},header(){},renderCards(){},formInventory(){},toast(){}};
 vm.createContext(state);vm.runInContext('function click(a,id){switch(a){'+source.slice(start,end)+'}}',state);
 state.click('choose-hero','ui-hero');assert.equal(state.profile.heroCoins,40);assert.deepEqual(Array.from(state.profile.unlockedForms),['ui-hero']);
 state.click('choose-hero','ui-hero');assert.equal(state.profile.heroCoins,40);
 state.click('apply-form-shard','ui-evo');assert.equal(state.profile.formShards['ui-evo'],5);assert.equal(state.profile.evoWildShards,1);assert.equal(state.profile.unlockedForms.includes('ui-evo'),false);
 state.click('apply-form-shard','ui-evo');assert.equal(state.profile.formShards['ui-evo'],6);assert.equal(state.profile.evoWildShards,0);assert.equal(state.profile.unlockedForms.includes('ui-evo'),true);
});
test('generated RandomDeck remains playable with Champions at source-eligible physical positions',()=>{
 const C=require('../src/core'),F=require('../src/card-forms').defaultRegistry,Actions=require('../src/modern-actions'),source=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8'),start=source.indexOf('// Generated RandomDeck loadout'),end=source.indexOf('// End generated RandomDeck loadout',start);
 assert.ok(start>=0&&end>start,'Generated RandomDeck must enforce the special-slot rules before opening battle');
 const box={C,F,RoyaleModernActions:Actions,RoyaleCardForms:require('../src/card-forms')};vm.createContext(box);vm.runInContext(source.slice(start,end),box);
 const context={arena:1,casual:true,positionalSlots:true,unlockedForms:[]};
 for(const seed of [3,17,...Array.from({length:100},(_,i)=>i+1)]){
  const generated=box.generatedRandomLoadout(seed,context);assert.equal(generated.ok,true,'seed '+seed);assert.equal(generated.deck.length,8);assert.equal(new Set(generated.deck).size,8);
  assert.equal(F.qualify(generated.deck,generated.forms,context).ok,true);assert.ok(generated.deck.every(id=>Actions.canDeployCard(null,C.CARD_BY_ID[id]).ok));
  const champions=generated.forms.flatMap((id,i)=>F.get(id)?.kind==='champion'?[i]:[]);assert.ok(champions.length<=2);assert.ok(champions.every(i=>[1,2].includes(i)));
  assert.deepEqual([...generated.originalDeck].sort(),[...generated.deck].sort(),'slot migration retains the generated roster');
 }
 const generated=box.generatedRandomLoadout(17,context),b=new C.Battle({mode:'RandomDeck',queue:'challenge',ai:false,seed:17,deck:Array.from(generated.deck),forms:Array.from(generated.forms),formContext:context});assert.deepEqual(b.initialDecks[0],Array.from(generated.deck));
});
