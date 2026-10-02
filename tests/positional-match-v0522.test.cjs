'use strict';
const test=require('node:test'),a=require('node:assert/strict'),K=require('../src/catalog'),C=require('../src/core'),F=require('../src/card-forms'),R=require('../src/replay');
const saved=require('./fixtures/virtual-forms-v0521.json');
const deck=['knight','archers','giant','musketeer','bomber','mini-pekka','arrows','fireball'];
function registry(){return F.createRegistry({forms:[
 {id:'position-knight-evo',baseCardId:'knight',kind:'evolution',cycles:1,requiredShards:6,source:{...K.CARD_BY_ID.knight.source,SummonCharacter:'MiniPekka'}},
 {id:'position-archer-hero',baseCardId:'archers',kind:'hero',requiredShards:200,source:{...K.CARD_BY_ID.archers.source},ability:{id:'position-guard',ManaCost:1,CastTime:100,TriggerDelay:50,MaxCharges:1,Buff:'Rage',BuffTime:1000}},
 {id:'position-giant-champion',baseCardId:'giant',kind:'champion',source:{...K.CARD_BY_ID.giant.source},ability:{id:'position-champion',ManaCost:1,CastTime:100,TriggerDelay:50,MaxCharges:1,Buff:'Rage',BuffTime:1000}}
 ],loadouts:{slots:[{kind:'evolution',unlockArena:3},{kind:'hero',unlockArena:5},{kind:'wild',unlockArena:10}],casualSlots:true}});}
const equipped=['position-knight-evo','position-archer-hero',null,null,null,null,null,null];
function battle(extra={}){return new C.Battle({seed:52206,deck,enemyDeck:deck,ai:false,formRegistry:registry(),seatForms:[equipped,[]],formContext:{arena:10,casual:true,positionalSlots:true,unlockedForms:equipped.filter(Boolean)},...extra});}
test('old 0.52 virtual-slot replay reproduces its recorded result with its exact registry fingerprint',()=>{
 a.equal(F.defaultRegistry.fingerprint,saved.initial.formRegistryFingerprint);
 a.notEqual(saved.initial.formContext.positionalSlots,true);
 const s=new R.Session(saved);s.seek(saved.duration);a.equal(s.error,null);a.deepEqual(R.digest(s.battle),saved.expected);
});
test('generated opponent Champion is positioned before hand shuffle without changing its roster',()=>{
 const other=['knight','archers','musketeer','bomber','mini-pekka','giant','arrows','fireball'];
 const b=battle({enemyDeck:other,seatForms:[equipped],shuffleDeck:true});
 a.deepEqual([...b.initialDecks[1]].sort(),[...other].sort());
 const index=b.seatForms[1].indexOf('position-giant-champion');a.ok([1,2].includes(index));
 a.equal(b.formRegistry.qualify(b.initialDecks[1],b.seatForms[1],b.formContext).ok,true);
 for(let seat=0;seat<2;seat++)for(const [j,index]of [...b.handSlots[seat],...b.queueSlots[seat]].entries())a.equal(b.initialDecks[seat][index],[...b.hand[seat],...b.queue[seat]][j]);
});
test('explicit recorded opponent forms are validated in place and never silently rearranged',()=>{
 const other=['knight','archers','musketeer','bomber','mini-pekka','giant','arrows','fireball'];
 a.throws(()=>battle({enemyDeck:other,seatForms:[equipped,[null,null,null,null,null,'position-giant-champion']]}),/Invalid form loadout/);
});
test('generated production opponents obey positional form rules across battle modes and arena gates',()=>{
 const Decks=require('../src/training-decks');
 for(const mode of ['Default','SixCardDeck','FourCardDeck','TwelveCardDeck','Team3v3','Touchdown3v3'])for(const arena of [2,3,5,10]){
  const primary=Decks.forMode(52208,arena,mode),casual=mode!=='Default';
  const moved=F.defaultRegistry.migrateDeck(primary,[],{arena,casual,positionalSlots:true});a.deepEqual(moved.errors,[]);
  const b=new C.Battle({mode,seed:52208,deck:moved.deck,forms:moved.forms,ai:false,queue:casual?'challenge':'trophy-road',arenaNumber:arena,formContext:{arena,casual,positionalSlots:true,unlockedForms:[]}});
  for(let seat=0;seat<b.seatCount;seat++)a.equal(F.defaultRegistry.qualify(b.initialDecks[seat],b.seatForms[seat],{arena,casual,positionalSlots:true,unlockedForms:seat===0?[]:undefined}).ok,true,mode+' arena '+arena+' seat '+seat);
 }
});
test('new physical-slot replay retains slot context, Hero activation and Evolution cycles',()=>{
 const b=battle();R.captureInitial(b);
 for(let n=0;n<300;n++){
  if(n===3){a.equal(b.deploy(0,1,220,440).ok,true);a.equal(b.deploy(0,0,260,440).ok,true);}
  if(n===220){const u=b.units.find(u=>u.abilityState&&u.owner===0);a.equal(b.activateAbility(0,u.id).ok,true);}
  b.step(1/60);
 }
 const record=R.pack(b);a.equal(record.initial.formContext.positionalSlots,true);a.equal(record.commands.filter(c=>c.type==='ability').length,1);
 // Elixir changes must come from recorded simulation inputs, not a fixture edit.
 // Both deployments fit the initial six elixir; the activation follows natural regeneration.
 const s=new R.Session(record,{formRegistry:registry()});s.seek(record.duration);a.equal(s.error,null);a.deepEqual(R.digest(s.battle),record.expected);
});
