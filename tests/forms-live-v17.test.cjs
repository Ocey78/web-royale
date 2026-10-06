'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../src/core'),A=require('../src/modern-actions'),Forms=require('../src/form-state');
const D=C.DATA;
function battle(){const b=new C.Battle({queue:'challenge',ai:false,seed:170403});for(const t of b.towers)t.nextAttackAt=999;return b;}
function unit(b,name,team,x,y,level=11){const u=b.spawn(name,team,x*C.SX,y*C.SY,{wait:0,level});u.def={...u.def,speedTiles:0};u.nextAttackAt=999;return u;}
function step(b,n){for(let i=0;i<n;i++)b.step(.05);}
function hero(b){const u=unit(b,'ElectroWizardHero',0,9,24);Forms.attach(b,u,{source:{LinkedChampionCharacter:'ElectroWizardHero'},form:{id:'ElectroWizard_hero',ability:D.abilities.ElectroWizardHero_Ability}});b.elixir[0]=10;return u;}

test('live Electro Giant Evolution emits a growing single-hit pulse after its authored startup delay',()=>{
 const b=battle(),giant=unit(b,'ElectroGiant_EV1',0,9,24),near=unit(b,'Knight',1,9,25.5),far=unit(b,'Knight',1,9,29.5);
 step(b,54);assert.equal(b.areas.length,0);step(b,1);assert.equal(b.areas.filter(a=>a.name==='ElectroGiant_EV1_Pulse_AEO').length,1);assert.equal(near.level,11);assert.equal(far.level,11);
 step(b,3);assert.equal(near.level,10);assert.equal(far.level,11);step(b,8);assert.equal(far.level,10);assert.equal(near.level,10,'one hit per target prevents repeated delevel within the pulse');
 assert.equal(b.events.some(e=>e.type==='modern-action-unsupported'),false);assert.equal(giant.modernUnsupported,undefined);
});
test('live source pulse stacks one level reduction per application and restores exactly its recorded reductions',()=>{
 const b=battle(),giant=unit(b,'ElectroGiant_EV1',0,9,24),enemy=unit(b,'Knight',1,9,22);
 const c={unit:enemy,instigator:giant,team:0,owner:0,level:11};assert.equal(A.executeAction(b,'ElectroGiant_EV_Apply_Pulse_Debuff',c).ok,true);step(b,2);assert.equal(enemy.level,10);
 assert.equal(A.executeAction(b,'ElectroGiant_EV_Apply_Pulse_Debuff',c).ok,true);step(b,2);assert.equal(enemy.level,9);assert.equal(enemy.modernActions.variables.ElectroGiant_EV1_Delevel_Counter,2);
 for(const key of Object.keys(enemy.buffs))delete enemy.buffs[key];step(b,1);assert.equal(enemy.level,11);assert.equal(enemy.modernActions.variables.ElectroGiant_EV1_Delevel_Counter,0);step(b,1);assert.equal(enemy.level,11);
});
test('live source pulse never delevels a crown tower or accumulates reductions below level one',()=>{
 const b=battle(),giant=unit(b,'ElectroGiant_EV1',0,9,24),enemy=unit(b,'Knight',1,9,22,1),tower=unit(b,'PrincessTower',1,9,22);
 tower.king=false;for(const u of [enemy,tower])assert.equal(A.executeAction(b,'ElectroGiant_EV_Apply_Pulse_Debuff',{unit:u,instigator:giant,team:0,level:11}).ok,true);step(b,2);assert.equal(enemy.level,1);assert.equal(tower.level,11);
 for(const key of Object.keys(enemy.buffs))delete enemy.buffs[key];step(b,1);assert.equal(enemy.level,1);
});
test('live Hero Electro Wizard spends two elixir once, triggers at 250ms, and recovers for 500ms after a three-second surge',()=>{
 const b=battle(),u=hero(b),target=unit(b,'Knight',1,9,22);u.targetId=target.id;assert.equal(b.activateAbility(0,u.id).ok,true);assert.equal(b.elixir[0],8);assert.equal(u.abilityState.charges,0);assert.equal(b.activateAbility(0,u.id).ok,false);
 step(b,4);assert.equal(u.attackSequenceIndex,0);step(b,1);assert.equal(u.attackSequenceIndex,1);assert.equal(A.rates(b,u).attack,3.6);assert.equal(u.abilityState.castingUntil,.45);
 step(b,59);assert.equal(A.rates(b,u).attack,3.6);step(b,1);assert.equal(A.rates(b,u).attack,0);assert.equal(A.rates(b,u).speed,0);step(b,9);assert.equal(A.rates(b,u).attack,0);step(b,1);assert.equal(A.rates(b,u).attack,1);assert.equal(A.rates(b,u).speed,1);assert.equal(u.attackSequenceIndex,0);
});
test('live Hero Electro Wizard sequence overrides hit two targets and select the no-spin sequence after the surge release',()=>{
 const b=battle(),u=hero(b),a=unit(b,'Knight',1,9,22),z=unit(b,'Knight',1,10,22);const hp=[a.hp,z.hp];b.strike(u,a);assert.equal(hp[0]-a.hp,117);assert.equal(hp[1]-z.hp,117);
 assert.equal(b.activateAbility(0,u.id).ok,true);step(b,5);const surgeHp=[a.hp,z.hp];b.strike(u,a);assert.equal(surgeHp[0]-a.hp,128);assert.equal(surgeHp[1]-z.hp,128);assert.equal(u.modernActions.variables.ElectroWizardHero_Spin_Animation_Done,1);
 b.startAttack(u,a);assert.equal(u.attackSequenceIndex,2);assert.equal(b.events.some(e=>e.type==='modern-action-unsupported'),false);
});
test('spawn pathfind morph dependencies reject the native Evo Drill relocation before deployment',()=>{
 const data={...D,entities:{...D.entities,Ghost:{SpawnPathfindMorph:'Arrival'},Arrival:{OnStartingAction:'Relocate'}},actions:{...D.actions,Relocate:{ClassType:'ActionGoblinDrillEvoRelocate'},SpawnGhost:{ClassType:'ActionSpawn',SpawnType:'CharacterType',SpawnData:'Ghost'}}};
 const p=A.canDeployCard(null,{source:{SummonCharacter:'Ghost'}},{data});assert.equal(p.ok,false);assert.match(p.reason,/ActionGoblinDrillEvoRelocate/);assert.equal(A.canExecuteAction(null,'SpawnGhost',{data}).ok,false);
});
test('live Golden Knight reacquires the nearest target edge inside its five-tile dash reach',()=>{
 const b=battle(),u=unit(b,'GoldenKnight',0,9,24),near=unit(b,'Knight',1,14.5,24),far=unit(b,'Knight',1,17,24),hp=[near.hp,far.hp];u.def={...u.def,source:{...u.def.source,DashCount:1,DashPushBack:0}};
 assert.equal(A.executeAction(b,'GoldenKnight_Execute_Charge',{unit:u,targetId:far.id}).ok,true);step(b,25);assert.ok(near.hp<hp[0]);assert.equal(far.hp,hp[1]);
});
test('live Golden Knight cannot acquire a target whose collision edge exceeds five tiles',()=>{
 const b=battle(),u=unit(b,'GoldenKnight',0,9,24),far=unit(b,'Knight',1,14.51,24),hp=far.hp;
 assert.equal(A.executeAction(b,'GoldenKnight_Execute_Charge',{unit:u}).ok,true);step(b,25);assert.equal(far.hp,hp);assert.equal(u.modernDash,undefined);
});
test('resolved native filter inheritance metadata does not block a supported area graph',()=>{
 const b=battle(),u=unit(b,'ElectroGiant_EV1',0,9,24);const p=A.canExecuteAction(b,'ElectroGiant_EV1_Starting_Action',{unit:u});assert.equal(p.ok,true,p.reason);
});
test('new form capability reports expose native semantics that remain unverified for exact training',()=>{
 for(const id of ['ElectroGiant_EV1','ElectroWizard_hero']){const form=D.forms.find(f=>f.id===id),p=A.canDeployCard(null,{source:form.source,form});assert.equal(p.ok,true,p.reason);assert.equal(p.exactReady,false);assert.ok(p.interpretationLimits.length>0);}
});

test('missing integer source context honors its sentinel and explicit fallback',()=>{
 const b=battle(),u=unit(b,'IceWizardHero',0,9,24),c={unit:u,context:{}};assert.equal(A.evaluate('as_int(#HasValidTarget)',b,c),-1);assert.equal(A.evaluate('as_int(#PosX, 0)',b,c),0);c.context.HasValidTarget=27;assert.equal(A.evaluate('as_int(#HasValidTarget)',b,c),27);
});
test('live Electro Giant Evolution keeps the inherited reflection and lets an emitted pulse finish after death',()=>{
 const b=battle(),u=unit(b,'ElectroGiant_EV1',0,9,24),target=unit(b,'Knight',1,9,25.5),hp=target.hp;b.damage(u,1,target,{melee:true});assert.equal(hp-target.hp,192);assert.ok(Object.values(target.buffs).some(v=>v.name==='ZapFreeze'));
 assert.equal(A.executeAction(b,'ElectroGiant_EV1_Spawn_Pulse_AEO',{unit:u}).ok,true);u.hp=0;b.deaths();step(b,3);assert.equal(target.level,10);step(b,9);assert.equal(b.areas.some(a=>a.name==='ElectroGiant_EV1_Pulse_AEO'),false);
});
test('live pulse level reduction and restoration preserve clone one-point health and unbroken shields',()=>{
 const b=battle(),giant=unit(b,'ElectroGiant_EV1',0,9,24),clones=['Knight','DarkPrince'].map((name,i)=>{
  const u=b.spawn(name,1,(9+i)*C.SX,22*C.SY,{wait:0,level:11,cloned:true});u.def={...u.def,speedTiles:0};u.nextAttackAt=999;return u;
 });
 for(const [i,u]of clones.entries()){
  assert.equal(u.hp,1);assert.equal(u.shield,i);assert.equal(A.executeAction(b,'ElectroGiant_EV_Apply_Pulse_Debuff',{unit:u,instigator:giant,team:0,level:11}).ok,true);
  assert.equal(u.level,10);assert.equal(u.hp,1);assert.equal(u.maxHp,1);assert.equal(u.shield,i);
 }
 step(b,2);for(const [i,u]of clones.entries()){
  for(const key of Object.keys(u.buffs))delete u.buffs[key];
 }
 step(b,1);for(const [i,u]of clones.entries()){assert.equal(u.level,11);assert.equal(u.hp,1);assert.equal(u.maxHp,1);assert.equal(u.shield,i);}
 b.damage(clones[1],1,giant,{melee:true});assert.equal(clones[1].shield,0);assert.equal(clones[1].hp,1);
 assert.equal(A.executeAction(b,'ElectroGiant_EV_Apply_Pulse_Debuff',{unit:clones[1],instigator:giant,team:0,level:11}).ok,true);step(b,2);for(const key of Object.keys(clones[1].buffs))delete clones[1].buffs[key];step(b,1);assert.equal(clones[1].level,11);assert.equal(clones[1].hp,1);assert.equal(clones[1].shield,0,'level restoration cannot regenerate a destroyed clone shield');
});