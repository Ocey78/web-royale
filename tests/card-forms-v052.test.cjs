'use strict';
const test=require('node:test'),a=require('node:assert/strict'),K=require('../src/catalog'),C=require('../src/core'),F=require('../src/card-forms'),Platform=require('../src/platform'),Replay=require('../src/replay');
const forms=[
 {id:'test_knight_evo',baseCardId:'knight',kind:'evolution',cycles:2,requiredShards:6,source:{...K.CARD_BY_ID.knight.source,SummonCharacter:'MiniPekka'}},
 {id:'test_knight_hero',baseCardId:'knight',kind:'hero',requiredShards:200,source:{...K.CARD_BY_ID.knight.source},ability:{id:'test_knight_guard',ManaCost:2,CastTime:1200,TriggerDelay:150,MaxCharges:1,Buff:'Rage',BuffTime:5000}},
 {id:'test_archers_hero',baseCardId:'archers',kind:'hero',source:{...K.CARD_BY_ID.archers.source},ability:{id:'test_archer_guard',ManaCost:1,CastTime:200,TriggerDelay:50,Cooldown:500,Buff:'Rage',BuffTime:1000}},
 {id:'test_giant_champion',baseCardId:'giant',kind:'champion',source:{...K.CARD_BY_ID.giant.source},ability:{id:'test_giant_guard',ManaCost:1,CastTime:100,TriggerDelay:50,Cooldown:500,Buff:'Rage',BuffTime:1000}}
];
const loadouts={slots:[{kind:'evolution',unlockArena:3},{kind:'hero',unlockArena:5},{kind:'wild',unlockArena:10}],casualSlots:true};
const registry=()=>F.createRegistry({forms,loadouts});
const deck=['knight','archers','bomber','musketeer'];
function battle(selected=['test_knight_evo',null,null,null],extra={}){return new C.Battle({mode:'FourCardDeck',deck,enemyDeck:deck,ai:false,seed:52001,formRegistry:registry(),seatForms:[selected,[]],formContext:{arena:10,casual:true,unlockedForms:forms.map(f=>f.id)},...extra});}
function nextPlay(b){b.elixir[0]=10;for(let n=0;n<65;n++)b.step(1/60);}
test('registry rejects unknown base cards and conflicting IDs, and isolates caller mutations',()=>{
 const input=JSON.parse(JSON.stringify(forms)),r=F.createRegistry({forms:input,loadouts});input[0].cycles=99;input[0].source.SummonCharacter='Giant';
 a.equal(r.get('test_knight_evo').cycles,2);a.equal(r.get('test_knight_evo').source.SummonCharacter,'MiniPekka');a.ok(Object.isFrozen(r.get('test_knight_evo').source));
 a.throws(()=>F.createRegistry({forms:[{...forms[0],baseCardId:'missing'}],loadouts}),/base card/i);
 a.throws(()=>F.createRegistry({forms:[forms[0],forms[0]],loadouts}),/duplicate/i);
});
test('source arena gates and wild capacity include Champions',()=>{
 const r=registry(),d=['knight','archers','giant','musketeer'],s=['test_knight_evo','test_archers_hero',null,null];
 a.equal(r.qualify(d,s,{arena:2}).ok,false);a.equal(r.qualify(d,s,{arena:5}).ok,false,'Champion requires the second Hero or Wild slot');
 const valid=r.qualify(d,s,{arena:10});a.equal(valid.ok,true);a.deepEqual(valid.assignments.map(x=>x.kind),['evolution','hero','wild']);
 a.equal(r.qualify(d,s,{arena:1,casual:true}).ok,true);a.equal(r.qualify(d,['test_archers_hero'],{arena:10}).ok,false,'form belongs to another base card');
 a.equal(r.qualify(d,s,{arena:10,unlockedForms:[]}).ok,false,'selected variants require ownership');
});
test('evolution advances only on accepted deployments and resets after its evolved play',()=>{
 const b=battle();a.equal(b.card(0,0).entity,'Knight');a.equal(b.deploy(0,0,240,100).ok,false);a.equal(b.formState.cycles[0][0],0);
 for(const [entity,count]of [['Knight',1],['Knight',2],['MiniPekka',0]]){nextPlay(b);a.equal(b.card(0,0).entity,entity);a.equal(b.deploy(0,0,240,440).ok,true);a.equal(b.units.at(-1).entity,entity);a.equal(b.formState.cycles[0][0],count);}
 a.equal(b.card(0,0).entity,'Knight');
});
test('duplicate card copies keep independent form counters',()=>{
 const d=['knight','knight','bomber','musketeer'],b=battle(['test_knight_evo','test_knight_evo',null,null],{deck:d,enemyDeck:d,profile:{cheats:{duplicates:true}},formRegistry:F.createRegistry({forms,loadouts:{slots:[{kind:'evolution',unlockArena:0},{kind:'wild',unlockArena:0}]}})});
 nextPlay(b);a.equal(b.deploy(0,0,200,440).ok,true);a.deepEqual(b.formState.cycles[0],[1,0,0,0]);a.equal(b.card(0,1).entity,'Knight');
});
test('hero activation spends once, respects owner and deployment, and exhausts a one-charge unit',()=>{
 const b=battle(['test_knight_hero',null,null,null]);nextPlay(b);a.equal(b.deploy(0,0,240,440).ok,true);const u=b.units.at(-1),session=new Platform.LocalMatchSession(b);
 a.equal(b.activateAbility(1,u.id).ok,false);a.equal(b.activateAbility(0,u.id).ok,false,'deployment not ready');for(let n=0;n<61;n++)b.step(1/60);b.elixir[0]=10;
 const cmd={type:'ability',entityId:u.id,sequence:1};a.equal(session.command(cmd).ok,true);a.equal(b.elixir[0],8);a.equal(session.command(cmd).ok,true);a.equal(b.elixir[0],8,'retry has no extra spend');
 for(let n=0;n<10;n++)b.step(1/60);a.ok(u.buffs.Rage);for(let n=0;n<70;n++)b.step(1/60);a.equal(b.activateAbility(0,u.id).ok,false);a.equal(u.abilityState.charges,0);
 u.hp=0;b.deaths();a.equal(b.activateAbility(0,u.id).ok,false);
 nextPlay(b);a.equal(b.deploy(0,0,240,440).ok,true);a.equal(b.units.at(-1).abilityState.charges,1,'new deployment has its own charge');
});
test('hero input replays reproduce form counters, buffs, spend, and unit lifetime',()=>{
 const clean=battle(['test_knight_hero',null,null,null]);Replay.captureInitial(clean);for(let n=0;n<180;n++){if(n===5)a.equal(clean.deploy(0,0,240,440).ok,true);if(n===100)a.equal(clean.activateAbility(0,clean.units[0].id).ok,true);clean.step(1/60);}
 const record=Replay.pack(clean);a.equal(record.commands.filter(c=>c.type==='ability').length,1);const session=new Replay.Session(record,{formRegistry:registry()});
 for(const at of [record.duration,1,record.duration]){session.seek(at);a.equal(session.error,null);}a.deepEqual(Replay.digest(session.battle),record.expected);
});
test('profile migration retains known unlocks and slot forms without adding extension content',()=>{
 const P=require('../src/profile'),r=registry(),p=P.normalizeProfile({decks:[deck],deckForms:{ranked:[['test_knight_evo']]},unlockedForms:['test_knight_evo','missing'],formShards:{test_knight_evo:3,missing:999},heroCoins:500,evoWildShards:-3},{formRegistry:r});
 a.deepEqual(p.unlockedForms,['test_knight_evo']);a.equal(p.formShards.test_knight_evo,3);a.equal(p.heroCoins,200);a.equal(p.evoWildShards,0);a.deepEqual(p.deckForms.ranked[0],['test_knight_evo',null,'test_giant_champion',null,null,null,null,null]);
 const noContent=P.normalizeProfile(p,{formRegistry:F.createRegistry()});a.deepEqual(noContent.unlockedForms,[]);a.ok(noContent.deckForms.ranked.flat().every(id=>id===null));
});
test('deck copying, removal and card replacement preserve the corresponding form selections',()=>{
 const P=require('../src/profile'),D=require('../src/deck-manager'),r=registry(),opts={formRegistry:r},eight=['knight','archers','bomber','musketeer','giant','mini-pekka','arrows','fireball'];
 let p=P.normalizeProfile({decks:[eight],unlockedForms:['test_knight_evo'],deckForms:{ranked:[['test_knight_evo']]},trophies:10000,unlockedCards:eight},opts);
 p=D.add(p,opts).profile;a.equal(p.deckForms.ranked[1][0],'test_knight_evo');
 p=D.remove(p,0,opts).profile;a.equal(p.deckForms.ranked[0][0],'test_knight_evo');
 p=D.setCard(p,0,'archers',opts).profile;a.equal(p.decks[0][1],'knight');a.equal(p.deckForms.ranked[0][1],'test_knight_evo');a.equal(p.deckForms.ranked[0][0],null);
 const rejected=D.setForm(p,{slot:0,formId:'test_knight_evo',formRegistry:r,arena:10});a.equal(rejected.ok,false);a.deepEqual(rejected.profile.deckForms,p.deckForms);
});
test('a frozen caster delays its pending action and a dead caster never releases it',()=>{
 const b=battle(['test_knight_hero',null,null,null]);nextPlay(b);a.equal(b.deploy(0,0,240,440).ok,true);const u=b.units.at(-1);nextPlay(b);a.equal(b.activateAbility(0,u.id).ok,true);b.addBuff(u,'Freeze',.25,1,u.level);
 for(let i=0;i<15;i++)b.step(1/60);a.equal(u.buffs.Rage,undefined);for(let i=0;i<11;i++)b.step(1/60);a.ok(u.buffs.Rage,'action follows the stopped cast clock');
 const dead=battle(['test_knight_hero',null,null,null]);nextPlay(dead);a.equal(dead.deploy(0,0,240,440).ok,true);const d=dead.units.at(-1);nextPlay(dead);a.equal(dead.activateAbility(0,d.id).ok,true);d.hp=0;for(let i=0;i<20;i++)dead.step(1/60);a.equal(d.buffs.Rage,undefined);
});
test('an unsupported ability rejects before spending elixir or charges',()=>{
 const r=F.createRegistry({forms:[{...forms[1],ability:{...forms[1].ability,Buff:undefined,OnActivationAction:'missing_action'}}],loadouts}),b=battle(['test_knight_hero',null,null,null],{formRegistry:r});nextPlay(b);const spend=b.elixir[0],hand=[...b.hand[0]],cycles=[...b.formState.cycles[0]];a.equal(b.deploy(0,0,240,440).ok,false);a.equal(b.elixir[0],spend);a.deepEqual(b.hand[0],hand);a.deepEqual(b.formState.cycles[0],cycles);const u=b.spawn('Knight',0,240,440,{wait:0,formCard:r.resolve(K.cardAt('knight',9),'test_knight_hero')});const before=b.elixir[0];a.equal(b.activateAbility(0,u.id).ok,false);a.equal(b.elixir[0],before);a.equal(u.abilityState.charges,1);a.equal(u.abilityState.pending,false);
});
test('Spirit Empress resolves its three and six elixir source actors without an empty unaffordable preview',{skip:!K.CARD_BY_ID['spirit-empress']},()=>{
 const d=['spirit-empress','knight','archers','giant','mini-pekka','musketeer','arrows','fireball'],b=new C.Battle({queue:'challenge',deck:d,enemyDeck:K.DEFAULT_DECK,ai:false});
 for(const [mana,cost,entity]of [[2.9,3,'MergeMaiden_Normal'],[3,3,'MergeMaiden_Normal'],[5.999,3,'MergeMaiden_Normal'],[6,6,'MergeMaiden_Mounted']]){b.elixir[0]=mana;const c=b.card(0,0);a.equal(c.id,'spirit-empress');a.equal(c.cost,cost);a.equal(c.entity,entity);}
});
test('ability binding follows the authored carrier rather than every companion summon',()=>{
 const row={...forms[1],abilityCharacter:'Archer',source:{...forms[1].source,SummonCharactersList:['Knight','Archer']}},r=F.createRegistry({forms:[row],loadouts}),b=battle([row.id,null,null,null],{formRegistry:r});nextPlay(b);a.equal(b.deploy(0,0,240,440).ok,true);const knight=b.units.find(u=>u.entity==='Knight'),archer=b.units.find(u=>u.entity==='Archer');a.ok(knight&&archer);a.equal(knight.abilityState,undefined);a.ok(archer.abilityState);a.equal(archer.formId,row.id);
});
test('AI activates a ready affordable owned ability near a visible opponent deterministically',()=>{
 const b=battle(['test_knight_hero',null,null,null]),u=b.spawn('Knight',1,240,380,{wait:0,formId:'test_knight_hero'});b.towers=[];b.spawn('Giant',0,240,400,{wait:0});b.bots[1].tick=()=>({ok:false,reason:'fixture card play disabled'});b.elixir[1]=1;b.aiPlay(1);a.equal(u.abilityState.activation,0);b.elixir[1]=10;a.equal(b.aiPlay(1).ok,true);a.equal(b.elixir[1],8);a.equal(u.abilityState.activation,1);b.aiPlay(1);a.equal(u.abilityState.activation,1);
});
test('authored disabled states and ability tags gate activation and pause only a live cooldown',()=>{
 const b=battle(['test_knight_hero',null,null,null]),u=b.spawn('Knight',0,240,440,{wait:0,formId:'test_knight_hero'}),S=require('../src/form-state');b.elixir[0]=10;for(const state of ['Disabled','NoYetAvailable']){u.abilityState.sourceOverride={state};a.equal(b.activateAbility(0,u.id).ok,false);a.equal(b.elixir[0],10);}delete u.abilityState.sourceOverride;u.modernActions.tags.push({tags:['ABILITY_DISABLED'],until:Infinity});a.equal(b.abilityStatus(u.id).ready,false);u.modernActions.tags=[];u.abilityState.cooldownUntil=b.time+1;u.modernActions.tags.push({tags:['ABILITY_COOLDOWN_PAUSED'],until:Infinity});b.time+=.5;S.tickUnit(b,u,.5);a.equal(u.abilityState.cooldownUntil-b.time,1);u.modernActions.tags=[];b.time+=.99;a.equal(b.abilityStatus(u.id).ready,false);b.time+=.02;a.equal(b.abilityStatus(u.id).ready,true);u.abilityState.charges=0;u.abilityState.cooldownUntil=b.time+1;u.modernActions.tags.push({tags:['ABILITY_COOLDOWN_PAUSED'],until:Infinity});const deadline=u.abilityState.cooldownUntil;b.time+=.5;S.tickUnit(b,u,.5);a.equal(u.abilityState.cooldownUntil,deadline);
});

test('practice battles use casual source slots while ranked battles keep arena gates',()=>{
 const options={ai:false,arenaNumber:1,formRegistry:registry(),deck:C.DEFAULT_DECK,enemyDeck:C.DEFAULT_DECK};
 a.throws(()=>new C.Battle(options),/No eligible form slot/);
 const b=new C.Battle({...options,practice:true});a.equal(b.formContext.casual,true);a.ok(b.seatForms[0].includes('test_giant_champion'));a.ok(b.seatForms[1].includes('test_giant_champion'));
});
