'use strict';
const test=require('node:test'),a=require('node:assert/strict'),C=require('../src/core'),Q=require('../src/source-resolvers');
const battle=()=>new C.Battle({queue:'challenge',ai:false,seed:525299});
test('source buff checks distinguish two casters on the same team',()=>{
 const b=battle(),one=b.spawn('IceWizardHero',0,8*C.SX,20*C.SY,{wait:0}),two=b.spawn('IceWizardHero',0,10*C.SX,20*C.SY,{wait:0}),target=b.spawn('Knight',1,9*C.SX,19*C.SY,{wait:0});
 b.addBuff(target,'IceWizardHeroCold',2,0,11,one.id);a.equal(target.buffs.IceWizardHeroCold.sourceId,one.id);
 a.equal(Q.matchesFilter(C.DATA,'IceWizardHero_resolver_filter',one,target,b.time),true);a.equal(Q.matchesFilter(C.DATA,'IceWizardHero_resolver_filter',two,target,b.time),false);
});
test('source rectangle areas include the field extent instead of a zero-radius point',()=>{
 const b=battle();b.towers=[];const inside=b.spawn('Knight',1,13.3*C.SX,20*C.SY,{wait:0}),outside=b.spawn('Knight',1,9*C.SX,24.2*C.SY,{wait:0}),field=b.createArea('BabyDragon_EV1_wind_aeo',0,9*C.SX,20*C.SY,11);field.heading=0;
 a.ok(b.areaTargets(field).includes(inside));a.equal(b.areaTargets(field).includes(outside),false);
});
test('source lifetime-end effects execute once after their area expires',()=>{
 const b=battle();b.towers=[];const field=b.createArea('DarkMagicAOE',0,9*C.SX,20*C.SY,11);field.applied=true;b.time=4.51;b.tickAreas();
 a.equal(field.modernEnded,true);a.equal(b.effects.filter(x=>x.sourceEffect==='PaoloFirstEffectEverOutro').length,1);b.tickAreas();a.equal(b.effects.filter(x=>x.sourceEffect==='PaoloFirstEffectEverOutro').length,1);
});
test('an area-end callback retains a newly spawned follow-up area',()=>{
 const b=battle(),original=b.modernActions;b.towers=[];const field=b.createArea('DarkMagicAOE',0,9*C.SX,20*C.SY,11);field.applied=true;b.modernActions={...original,onAreaEnd(b,a){original.onAreaEnd(b,a);b.createArea('Freeze',a.team,a.x,a.y,a.level);}};b.time=4.51;b.tickAreas();
 a.equal(b.areas.filter(x=>x.name==='Freeze').length,1);b.tickAreas();a.equal(b.areas.filter(x=>x.name==='Freeze').length,1);
});
test('source array buff immunities reject curse effects without suppressing ordinary buffs',()=>{
 const b=battle(),cart=b.spawn('MovingCannon',0,9*C.SX,20*C.SY,{wait:0});b.addBuff(cart,'GoblinCurse',2,1,11);a.equal(cart.buffs.GoblinCurse,undefined);b.addBuff(cart,'Freeze',2,1,11);a.ok(cart.buffs.Freeze);
});
test('controller projectile launch overrides retain their authored source height',()=>{
 const b=battle(),u=b.spawn('GoblinMachine',0,9*C.SX,20*C.SY,{wait:0}),p=b.fireProjectile('GoblinMachineRocketProjectile',u,null,{x:9*C.SX,y:18*C.SY,startZ:5000});a.ok(p);a.equal(p.launchHeight,5*C.SY);
});
test('modern source death elixir retains the recorded thousandth-elixir amount',()=>{const b=battle();b.elixir.fill(0);const u=b.spawn('ElixirGolem4',0,9*C.SX,20*C.SY,{wait:0});u.hp=0;b.deaths();a.equal(b.elixir[1],C.DATA.entities.ElixirGolem4.ManaOnDeathForOpponent/1000);a.equal(b.elixir[0],0);});
test('source Ice Wizard attachment is a noncombat controller with the parent lifetime',()=>{
 const b=battle(),u=b.spawn('IceWizardHero',0,9*C.SX,20*C.SY,{wait:0});b.tickEntity(u,1/60);const children=b.attachedControllers(u);a.equal(children.length,1);const child=children[0];a.equal(child.entity,'IceWizardHeroFloatingCube');a.equal(child.controllerOnly,true);a.equal(child.owner,u.owner);a.equal(child.level,u.level);a.equal(child.effectCarrier,true);a.equal(child.expires,Infinity);a.equal(b.canTarget(b.towers.find(t=>t.team===1),child),false);u.x+=C.SX;b.tickEntity(child,1/60);a.equal(child.x,u.x);u.hp=0;b.deaths();a.equal(b.units.includes(child),false);
});
test('explicit projectile muzzle origins do not overwrite null-target destinations',()=>{
 const b=battle(),u=b.spawn('GoblinMachine',0,9*C.SX,20*C.SY,{wait:0}),target=b.spawn('Knight',1,9*C.SX,17*C.SY,{wait:0}),x=u.x-C.SX,y=u.y+C.SY,p=b.fireProjectile('GoblinMachineRocketProjectile',u,target,{originX:x,originY:y,startZ:5000});a.equal(p.x,x);a.equal(p.y,y);a.equal(p.startX,x);a.equal(p.startY,y);a.equal(p.tx,target.x);a.equal(p.ty,target.y);a.equal(p.launchDistance,C.dist({x,y},target));const goal={x:8*C.SX,y:16*C.SY},q=b.fireProjectile('GoblinMachineRocketProjectile',u,null,{...goal,originX:x,originY:y});a.equal(q.tx,goal.x);a.equal(q.ty,goal.y);a.equal(q.startX,x);
});
test('source Rage spawns its companion damage area at the same owner and position',()=>{const b=battle();b.towers=[];const u=b.spawn('Knight',1,9*C.SX,20*C.SY,{wait:0});u.hp=u.maxHp=10000;const r=b.createArea('Rage',0,u.x,u.y,11);b.tickAreas();const child=b.areas.find(x=>x.name==='RageDamage');a.ok(child);a.equal(child.owner,r.owner);a.equal(child.x,r.x);a.equal(child.y,r.y);a.equal(10000-u.hp,C.scaled(C.DATA.areas.RageDamage.Damage,C.DATA.areas.RageDamage.Rarity,11));b.tickAreas();a.equal(b.areas.filter(x=>x.name==='RageDamage').length,1);});
test('all123 current cards execute supported source graphs or reject unsupported graphs atomically',()=>{
 const M=require('../src/modern-actions');a.equal(C.CARDS.length,123);let supported=0,blocked=0;for(const sourceCard of C.CARDS){const deck=[sourceCard.id,...C.DEFAULT_DECK.filter(id=>id!==sourceCard.id)].slice(0,8),b=new C.Battle({queue:'challenge',deck,enemyDeck:C.DEFAULT_DECK,ai:false,seed:520123});b.elixir[0]=10;b.hand[0][0]=sourceCard.id;if(sourceCard.id==='mirror')b.lastCard[0]={id:'knight',level:11,cost:3};const card=b.card(0,0),cap=M.canDeployCard(b,card),before={hand:[...b.hand[0]],queue:[...b.queue[0]],elixir:b.elixir[0],cycles:[...b.formState.cycles[0]]},result=b.deploy(0,0,90,420);a.equal(result.ok,cap.ok,sourceCard.id+': '+result.reason);if(!cap.ok){blocked++;a.ok(cap.reason);a.equal(result.reason,cap.reason);a.deepEqual({hand:b.hand[0],queue:b.queue[0],elixir:b.elixir[0],cycles:b.formState.cycles[0]},before);a.equal(b.units.length,0);}else{supported++;for(let i=0;i<180;i++)b.step(1/60);for(const u of b.active)a.ok(Number.isFinite(u.hp)&&Number.isFinite(u.x)&&Number.isFinite(u.y),sourceCard.id+' '+u.entity);}}
 a.ok(supported>=120,supported+' cards supported');a.equal(supported+blocked,123);
});

test('source spawn pushback clears existing ground bodies while retaining radial spawn positions',()=>{
 const make=flag=>{const b=battle();b.towers=[];const x=9*C.SX,y=20*C.SY,one=b.spawn('Knight',1,x,y-1.48*C.SY,{wait:0}),air=b.spawn('Minion',1,x,y-1.48*C.SY,{wait:0}),ghost=b.spawn('Knight',1,x+Math.cos(Math.PI/6)*1.48*C.SX,y+.74*C.SY,{wait:0});ghost.modernActions={tags:[{tags:['NO_CHECKCOLLISIONS'],until:Infinity}]};const before=[one,air,ghost].map(u=>({x:u.x,y:u.y})),children=b.spawnGroup('Skeleton',3,0,x,y,11,{formation:'barrel',radius:1.48,wait:.5,spawnPushback:flag,spawnConstPriority:true});return{b,one,air,ghost,before,children};};
 const normal=make(false),pushed=make(true);a.deepEqual(pushed.children.map(u=>({x:u.x,y:u.y})),normal.children.map(u=>({x:u.x,y:u.y})));a.deepEqual({x:normal.one.x,y:normal.one.y},normal.before[0]);a.ok(pushed.children.every(child=>C.dist(pushed.one,child)>=pushed.one.def.radiusTiles+child.def.radiusTiles),'existing troop must yield enough to fit each source child');a.deepEqual({x:pushed.air.x,y:pushed.air.y},pushed.before[1]);a.deepEqual({x:pushed.ghost.x,y:pushed.ghost.y},pushed.before[2]);
});
