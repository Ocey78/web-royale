'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/catalog'),P=require('../src/profile'),D=require('../src/deck-manager'),TD=require('../src/training-decks'),TM=require('../src/training-modes');
const modes=['UltimateClash','UltimateClash2v2','UltimateClash3v3'];

test('all Ultimate builders accept the same exclusive cards and reject normal cards',()=>{
 for(const mode of modes){const state=D.modeState({},mode);assert.ok(state,mode+' builder exists');assert.equal(state.eligibleCount,20);assert.equal(state.size,8);assert.ok(state.valid);
  assert.equal(K.isUltimateMode(mode),true);assert.ok(state.eligible.every(id=>id.startsWith('ultimate-')));
  assert.equal(D.setModeCard({},mode,0,'knight').ok,false);assert.equal(D.setModeCard({},mode,7,'ultimate-code-red').ok,true);
 }
 for(const mode of ['Default','TeamVsTeam','Team3v3','UltimateClashUnknown']){assert.equal(K.isUltimateMode(mode),false);assert.ok(K.cardsForMode(mode).every(c=>!c.exclusiveMode));}
});

test('Ultimate team deck libraries and selected forms persist independently',()=>{
 let p=P.normalizeProfile({});const original=JSON.stringify(p.modeDeckSets.UltimateClash),ranked=JSON.stringify(p.decks);
 for(const [mode,id] of [['UltimateClash2v2','ultimate-frostbite'],['UltimateClash3v3','ultimate-mega-minion-horde']]){
  let r=D.setModeCard(p,mode,1,id,{positionalSlots:true});assert.ok(r.ok,r.reason);p=r.profile;
  r=D.setForm(p,{mode,slot:1,formId:id+'-hero',positionalSlots:true});assert.ok(r.ok,r.reason);p=r.profile;
  r=D.modeAdd(p,mode);assert.ok(r.ok,r.reason);p=r.profile;
  r=D.modeRename(p,mode,1,mode+' deck');assert.ok(r.ok,r.reason);p=r.profile;
 }
 p=P.normalizeProfile(JSON.parse(JSON.stringify(p)),{positionalSlots:true});
 assert.equal(JSON.stringify(p.modeDeckSets.UltimateClash),original);assert.equal(JSON.stringify(p.decks),ranked);
 for(const [mode,id,key] of [['UltimateClash2v2','ultimate-frostbite','ultimateClash2v2Deck'],['UltimateClash3v3','ultimate-mega-minion-horde','ultimateClash3v3Deck']]){
  assert.equal(p.modeDeckSets[mode].active,1);assert.equal(p.modeDeckSets[mode].decks.length,2);assert.equal(p[key][1],id);assert.equal(p.deckForms.modes[mode][1][1],id+'-hero');
  assert.equal(p.modeDeckSets[mode].names[1],mode+' deck');
 }
});

test('Ultimate team opponents use reproducible exclusive decks at every arena',()=>{
 for(const mode of modes)for(const arena of [1,27])for(const seed of [1,58201]){const deck=TD.forMode(seed,arena,mode);assert.equal(deck.length,8);assert.equal(new Set(deck).size,8);assert.ok(deck.every(id=>id.startsWith('ultimate-')));assert.ok(deck.some(id=>K.CARD_BY_ID[id].kind==='Troop'));assert.ok(deck.some(id=>K.CARD_BY_ID[id].kind==='Spell'));assert.deepEqual(TD.forMode(seed,arena,mode),deck);}
});

test('Ultimate team self-play uses tournament decks and free forms for all seats',()=>{
 for(const [mode,count] of [['UltimateClash2v2',4],['UltimateClash3v3',6]]){assert.ok(TM.modes.some(m=>m.id===mode));assert.equal(TM.countFor(mode),count);const b=TM.create(mode,{seed:59001,ai:false});assert.equal(b.mode,mode);assert.equal(b.initialDecks.length,count);assert.equal(b.maxElixir,20);
  for(const [seat,deck] of b.initialDecks.entries())for(const id of deck){assert.ok(id.startsWith('ultimate-'));assert.equal(b.seatLevels[seat][id],11);}
  for(const id of ['ultimate-frostbite-hero','ultimate-mega-minion-horde-hero','ultimate-royale-escort-evolution'])assert.ok(b.formContext.unlockedForms.includes(id));
 }
});

test('profile history keeps the full Ultimate team duration and six-crown result',()=>{
 const p=P.normalizeProfile({history:[{mode:'UltimateClash3v3',winner:0,crowns:[6,4],duration:660},{mode:'UltimateClash2v2',winner:1,crowns:[2,3],duration:540}]});
 assert.deepEqual(p.history.map(h=>[h.mode,h.duration,h.crowns]),[['UltimateClash3v3',660,[6,4]],['UltimateClash2v2',540,[2,3]]]);
 assert.ok(p.history.every(h=>h.deck.every(id=>id.startsWith('ultimate-'))));
});

test('Crown Road recovers all six crowns from Ultimate 3v3 history',()=>{
 const Crown=require('../src/crown-road'),history=[{mode:'UltimateClash3v3',queue:'3v3',winner:0,crowns:[6,0],practice:false},{mode:'Default',queue:'challenge',winner:0,crowns:[6,0],practice:false},{mode:'UltimateClash3v3',queue:'self-play',winner:0,crowns:[6,0],practice:true}];
 assert.equal(Crown.lifetime({history}),9);assert.equal(P.normalizeProfile({history}).lifetimeCrowns,9);
});

test('Learning Center preserves an eleven-minute Ultimate 3v3 result after reloading',()=>{
 const L=require('../src/learning'),model=L.normalizeModel({}),recent=[{id:'ultimate-team-3v3',mode:'UltimateClash3v3',status:'completed',winner:0,duration:660},{id:'ordinary',mode:'Default',status:'completed',winner:0,duration:900}];
 assert.deepEqual(L.normalizeModel({...model,recent}).recent.map(r=>r.duration),[660,650]);
});

test('Ultimate 3v3 history and learning retain the completed four-second tiebreaker',()=>{
 const C=require('../src/core'),L=require('../src/learning'),b=new C.Battle({mode:'UltimateClash3v3',queue:'3v3',ai:false,seed:58143});
 b.time=660;b.towers.find(t=>t.team===1&&!t.king).hp-=1;b.checkResult();assert.ok(b.tiebreaker);
 for(let frame=0;frame<40;frame++)b.step(.1);
 assert.ok(b.result);assert.equal(Math.round(b.result.time),664);
 const profile=P.applyResult({},b);assert.equal(P.normalizeProfile(JSON.parse(JSON.stringify(profile))).history[0].duration,664);
 const model=L.mergePacket(L.normalizeModel({}),b.recorder.packet());
 assert.equal(L.normalizeModel(JSON.parse(JSON.stringify(model))).recent[0].duration,664);
});

test('Events offers all Ultimate builders and describes the longer team timers',()=>{
 const source=fs.readFileSync(require.resolve('../src/app'),'utf8'),node={innerHTML:''},context={D,C:K,$:()=>node,icon:()=>'',word:x=>x,esc:x=>x,button:(text,action,style,attributes)=>'<button data-action="'+action+'" '+attributes+'>'+text+'</button>',hydrate(){}};
 vm.runInNewContext(source.slice(source.indexOf('function renderEvents(){'),source.indexOf('function modeDeckCard(')),context);context.renderEvents();
 for(const mode of modes)assert.match(node.innerHTML,new RegExp('data-action="special-deck-builder" data-mode="'+mode+'"'));
 assert.match(context.modeDeckRule('UltimateClash2v2',{name:'Ultimate Clash 2v2'}),/5 minutes \+ 4 minutes overtime/);
 assert.match(context.modeDeckRule('UltimateClash3v3',{name:'Ultimate Clash 3v3'}),/6 minutes \+ 5 minutes overtime/);
});

function runAction(action,context){const source=fs.readFileSync(require.resolve('../src/app'),'utf8'),start=source.indexOf("case '"+action+"':"),end=source.indexOf("case '",start+6);assert.ok(start>=0&&end>start);vm.runInNewContext("switch('"+action+"'){"+source.slice(start,end)+'}',context);}

test('team builder Play starts the matching casual team queue',()=>{
 for(const [mode,queue] of [['UltimateClash2v2','2v2'],['UltimateClash3v3','3v3']]){let started;runAction('special-deck-play',{D,profile:P.normalizeProfile({}),specialMode:mode,startBattle:(...args)=>started=args});assert.deepEqual(JSON.parse(JSON.stringify(started)),[mode,false,{queue}]);}
});

test('Ultimate card information adds a card to the open team builder only',()=>{
 for(const mode of ['UltimateClash2v2','UltimateClash3v3']){const profile=P.normalizeProfile({}),before=JSON.stringify(profile.modeDeckSets.UltimateClash),context={D,profile,specialMode:mode,specialSlot:7,el:{dataset:{id:'ultimate-code-red'}},save(){},closeModal(){},renderSpecialDeckScreen(){},toast:reason=>assert.fail(reason)};
  runAction('ultimate-card-use',context);assert.equal(context.profile.modeDeckSets[mode].decks[0][7],'ultimate-code-red');assert.equal(JSON.stringify(context.profile.modeDeckSets.UltimateClash),before);
 }
});
