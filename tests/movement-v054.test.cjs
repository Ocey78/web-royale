'use strict';
const test=require('node:test'),a=require('node:assert/strict'),C=require('../src/core');
const advance=(b,seconds)=>{for(let i=0;i<Math.round(seconds*60);i++)b.step(1/60);};
const quiet=()=>{const b=new C.Battle({ai:false,headless:true,seed:54});b.towers=[];return b;};

test('native digging forms preserve explicit zero collision radius',()=>{
 for(const name of ['GoblinDrillDig','GoblinDrill_EV1_Dig']){const d=C.entityDef(name,11);a.equal(d.source.CollisionRadius,0);a.equal(d.radiusTiles,0);a.equal(d.radius,0);}
});

test('Drill arrival morph initializes the building lifecycle without a death or duplicate spawn effect',()=>{
 const b=new C.Battle({ai:false,seed:54});b.towers.forEach(t=>t.nextAttackAt=Infinity);const card=C.cardAt('goblin-drill',11),x=9*C.SX,y=10*C.SY;
 b.cast(card,0,x,y);const u=b.units[0],id=u.id,arrival=C.dist({x:9*C.SX,y:29*C.SY},{x,y})/(u.def.source.SpawnPathfindSpeed/60),target=C.entityDef('GoblinDrill',11);
 advance(b,arrival-1/60);a.equal(u.entity,'GoblinDrillDig');a.equal(b.isPresent(u),false);a.equal(b.areas.length,0);
 advance(b,1/60);a.equal(b.getEntity(id),u);a.equal(u.entity,'GoblinDrill');a.equal(u.building,true);a.equal(u.hp,target.hp);a.equal(u.maxHp,target.hp);a.equal(u.owner,0);a.equal(u.card,'goblin-drill');a.equal(u.level,11);
 a.ok(Math.abs(u.readyAt-(arrival+target.deploy))<1e-8);a.ok(Math.abs(u.nextSpawnAt-(arrival+target.deploy+C.sec(target.source.SpawnStartTime)))<1e-8);a.ok(Math.abs(u.expires-(arrival+target.deploy+target.life))<1e-8);
 a.equal(b.areas.filter(v=>v.name==='GoblinDrillDamageArea').length,1);a.equal(b.events.filter(e=>e.type==='death').length,0);a.equal(b.units.filter(v=>v.entity==='Goblin').length,0);
 a.equal(b.effects.filter(e=>e.sourceEffect==='goblin_drill_deploy').length,1);
 advance(b,target.deploy+C.sec(target.source.SpawnStartTime));a.equal(u.entity,'GoblinDrill');a.equal(u.x,x);a.equal(u.y,y);a.ok(b.units.some(v=>v.entity==='Goblin'));a.equal(u.spawned,1);
 advance(b,4);a.ok(u.spawned>=2);a.equal(b.units.filter(v=>v.entity==='GoblinDrillDig').length,0);
});

test('Drill morph preserves custom card delay and does not restart travel',()=>{
 const b=new C.Battle({ai:false,headless:true,seed:54}),base=C.cardAt('goblin-drill',11),card={...base,source:{...base.source,CustomDeployTime:400}},x=9*C.SX,y=10*C.SY;b.towers.forEach(t=>t.nextAttackAt=Infinity);b.cast(card,0,x,y);
 const u=b.units[0],arrival=u.appearsAt,ready=arrival+C.entityDef('GoblinDrill',11).deploy+.4;advance(b,arrival);a.equal(u.entity,'GoblinDrill');a.ok(Math.abs(u.readyAt-ready)<1e-8);a.equal(u.appearsAt,arrival);a.equal(u.walk,0);
});

test('source custom range is the same movement destination and attack threshold',()=>{
 const b=quiet(),u=b.spawn('AngryBarbarian_EV1',0,9*C.SX,23*C.SY,{wait:0}),t=b.spawn('Knight',1,9*C.SX,16*C.SY,{wait:0});u.attackSequenceIndex=1;
 const range=b.attackRange(u);a.equal(range,u.def.source.AttackSequenceList[1].CustomRange/1000);const waypoint=b.navigator.next(b,u,t);
 a.ok(waypoint);a.ok(Math.abs(C.dist({x:waypoint.x*C.SX,y:waypoint.y*C.SY},t)-(range+u.def.radiusTiles+t.def.radiusTiles-.015))<1e-8);
 u.x=waypoint.x*C.SX;u.y=waypoint.y*C.SY;a.equal(b.navigator.next(b,u,t),null);const before={x:u.x,y:u.y};b.move(u,t,1/60);a.deepEqual({x:u.x,y:u.y},before);b.tickEntity(u,1/60);a.ok(u.windup||b.projectiles.length);
});

test('Drill arrival runs its source starting action once and death spawns source Goblins',()=>{
 const b=new C.Battle({ai:false,headless:true,seed:54});b.towers.forEach(t=>t.nextAttackAt=Infinity);const x=9*C.SX,y=10*C.SY,foe=b.spawn('Knight',1,x,y-C.SY,{wait:100}),hp=foe.hp;
 b.cast(C.cardAt('goblin-drill',11),0,x,y);const u=b.units.find(v=>v.entity==='GoblinDrillDig'),arrival=u.appearsAt;advance(b,arrival);
 a.equal(hp-foe.hp,C.scaled(C.DATA.areas.GoblinDrillDamageArea.Damage,C.DATA.areas.GoblinDrillDamageArea.Rarity,11));advance(b,1/60);a.equal(hp-foe.hp,C.scaled(C.DATA.areas.GoblinDrillDamageArea.Damage,C.DATA.areas.GoblinDrillDamageArea.Rarity,11));
 const deathCount=u.def.source.DeathSpawnCount;u.hp=0;b.deaths();a.equal(b.events.filter(e=>e.type==='death'&&e.entity==='GoblinDrill').length,1);a.equal(b.units.filter(v=>v.entity==='Goblin').length,deathCount);a.ok(b.units.filter(v=>v.entity==='Goblin').every(v=>v.owner===0&&v.readyAt===b.time+C.sec(C.DATA.entities.GoblinDrill.DeathSpawnDeployTime)));
});

test('Hero Electro Wizard uses the authored attack-sequence start delay',()=>{
 const b=quiet(),u=b.spawn('ElectroWizardHero',0,9*C.SX,23*C.SY,{wait:0,level:11}),t=b.spawn('Knight',1,9*C.SX,21*C.SY,{wait:100});
 b.addBuff(u,'ElectroWizardHero_Ability_Buff',5,u.team,u.level);b.startAttack(u,t);
 a.equal(u.attackSequenceIndex,1);a.equal(u.windup.remaining,u.def.source.AttackSequenceList[1].AttackStartDelay/1000);
});
