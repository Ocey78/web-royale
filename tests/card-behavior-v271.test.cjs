'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../src/core.js');
const {SX,SY}=C;
const Nav=require('../src/navigation.js');
const make=()=>new C.Battle({ai:false});
const troop=(b,name,team,x=5,y=20,opt={})=>b.spawn(name,team,x*SX,y*SY,{wait:0,...opt});
function tickOnly(b,u,seconds){for(let left=seconds;left>1e-8;){const dt=Math.min(.05,left);b.time+=dt;b.tickEntity(u,dt);left-=dt;}}

test('spawn groups preserve legal source spread and settle whole bodies inside arena walls',()=>{
 const b=make(),valid=b.spawnGroup('Golemite',2,0,9*SX,20*SY,9,{radius:1.5});
 assert.deepEqual(valid.map(u=>[u.x/SX,u.y/SY]),[[7.5,20],[10.5,20]]);
 for(const [x,y]of [[.25,20],[17.75,20],[9,.4],[9,31.6]]){
  const children=b.spawnGroup('Golemite',2,0,x*SX,y*SY,9,{radius:1.5});
  assert.equal(children.length,2);
  for(const u of children)assert.ok(Nav.pointClear({x:u.x/SX,y:u.y/SY},u.def.radiusTiles,[]),`${x},${y}: ${u.x/SX},${u.y/SY}`);
 }
});

test('spawn settling retains airborne and source hover permissions over water',()=>{
 const b=make();
 for(const name of ['Minion','Ghost']){
  const children=b.spawnGroup(name,2,0,9*SX,16*SY,9,{radius:1.5});
  assert.deepEqual(children.map(u=>[u.x/SX,u.y/SY]),[[7.5,16],[10.5,16]],name);
 }
});

test('river death payloads retain their origin while later mobile children settle on land',()=>{
 for(const [name,payload]of [['Balloon','BalloonBomb'],['SkeletonBalloon','SkeletonContainer'],['RageBarbarian','RageBarbarianBottle']]){
  const b=make();b.towers=[];
  const parent=troop(b,name,0,9,16),victim=troop(b,'Giant',1,9,19.2);
  parent.hp=0;b.deaths();
  const carrier=b.units.find(u=>u.entity===payload);assert.ok(carrier,payload);
  assert.equal(carrier.x,9*SX,payload+' x origin');assert.equal(carrier.y,16*SY,payload+' y origin');
  b.time=3.1;b.tickEntity(carrier,.1);b.deaths();
  if(name==='Balloon')assert.equal(victim.maxHp-victim.hp,199,'death bomb must damage at its actual death origin');
  if(name==='RageBarbarian')assert.ok(b.areas.some(a=>a.name==='BarbarianRage'&&a.x===9*SX&&a.y===16*SY));
  if(name==='SkeletonBalloon'){
   const children=b.units.filter(u=>u.entity==='Skeleton');assert.ok(children.length>0);
   for(const u of children)assert.ok(Nav.pointClear({x:u.x/SX,y:u.y/SY},u.def.radiusTiles,[]));
  }
 }
});

test('ground spawn settlement chooses a nearby bank despite fractional-radius tangency',()=>{
 const b=make();
 for(const name of ['Skeleton','Golemite','Goblin','Barbarian','MiniPekka','IceGolemite']){
  const [u]=b.spawnGroup(name,1,0,9*SX,16*SY,9);
  assert.ok(Nav.pointClear({x:u.x/SX,y:u.y/SY},u.def.radiusTiles,[]),name);
  assert.equal(u.x,9*SX,name+' should use the nearby bank rather than a distant bridge');
  assert.ok(Math.abs(u.y/SY-16)<=1+u.def.radiusTiles+1e-5,name);
 }
});

test('Mother Witch curse is applied by impact, never by an unarrived projectile',()=>{
 const b=make(),witch=troop(b,'WitchMother',0),target=troop(b,'Giant',1,8);
 b.strike(witch,target);
 assert.equal(target.buffs.VoodooCurse,undefined);
 assert.equal(target.hp,target.maxHp);
 b.damage(target,999999);b.deaths();
 assert.equal(b.units.some(u=>u.entity==='VoodooHog'),false,'a different killer before impact must not grant a cursed hog');
});

test('Mother Witch lethal projectile curses before death and survives the caster dying',()=>{
 const b=make(),witch=troop(b,'WitchMother',0),target=troop(b,'Skeleton',1,8);
 b.strike(witch,target);b.damage(witch,999999);b.deaths();
 for(let i=0;i<120;i++){b.time+=1/60;b.tickProjectiles(1/60);b.deaths();}
 assert.equal(target.hp,0);
 assert.equal(b.units.filter(u=>u.entity==='VoodooHog'&&u.team===0).length,1);
});

test('Ram Rider spreads Bola Snare to an unsnared troop between attacks',()=>{
 const b=make(),rider=troop(b,'RamRider',0),old=troop(b,'Knight',1,7),fresh=troop(b,'Giant',1,8);
 rider.targetId=old.id;b.addBuff(old,'BolaSnare',2,0,9);
 assert.equal(b.chooseTarget(rider).id,fresh.id);
 rider.windup={target:old.id,remaining:.1};
 assert.equal(b.chooseTarget(rider).id,old.id,'a started hit still keeps its valid target');
 rider.windup=null;b.addBuff(fresh,'BolaSnare',2,0,9);
 assert.equal(b.chooseTarget(rider).id,old.id,'when all candidates are snared she still attacks');
 b.time=3;
 assert.equal(b.chooseTarget(rider).id,old.id,'expired snares must not affect target preference');
});

for(const insertion of ['near-first','far-first'])test('Hunter pellet hits the first blocker along its path: '+insertion,()=>{
 const b=make(),hunter=troop(b,'Hunter',0,2.1),targets={};
 for(const key of insertion==='near-first'?['near','far']:['far','near'])targets[key]=troop(b,'Skeleton',1,key==='near'?3:3.6);
 b.fireProjectile('HunterProjectile',hunter,targets.far);b.tickProjectiles(.1);
 assert.ok(targets.near.hp<targets.near.maxHp);
 assert.equal(targets.far.hp,targets.far.maxHp);
 assert.equal(b.projectiles.length,0);
});

test('Freeze suspends Elixir Collector production and its remaining production time',()=>{
 const b=make(),pump=troop(b,'ElixirCollector',0);b.elixir[0]=0;
 tickOnly(b,pump,8);b.addBuff(pump,'Freeze',2,1,9);
 tickOnly(b,pump,2.2);assert.equal(b.elixir[0],0);
 tickOnly(b,pump,.4);assert.equal(b.elixir[0],1);
});

test('Rage speeds the current Elixir Collector cycle when applied partway through it',()=>{
 const b=make(),pump=troop(b,'ElixirCollector',0);b.elixir[0]=0;
 tickOnly(b,pump,4);b.addBuff(pump,'Rage',10,0,9);
 tickOnly(b,pump,3.2);assert.equal(b.elixir[0],0);
 tickOnly(b,pump,.2);assert.equal(b.elixir[0],1);
});

for(const name of ['Witch','DarkWitch','GoblinHut','BarbarianHut','Tombstone','FirespiritHut'])test('Freeze suspends the remaining '+name+' spawn cycle',()=>{
 const b=make(),spawner=troop(b,name,0),half=spawner.nextSpawnAt/2;
 tickOnly(b,spawner,half);b.addBuff(spawner,'Freeze',2,1,9);
 tickOnly(b,spawner,2+Math.max(0,half-.15));
 assert.equal(b.units.filter(u=>u!==spawner).length,0);
 tickOnly(b,spawner,.3);
 assert.equal(b.units.filter(u=>u.entity===spawner.def.source.SpawnCharacter).length,spawner.def.source.SpawnNumber||1);
});

test('Cannon Cart becomes a building that pulls Giant after its moving stage is destroyed',()=>{
 const b=make(),giant=troop(b,'Giant',0,5),cart=troop(b,'MovingCannon',1,7);
 assert.notEqual(b.chooseTarget(giant).id,cart.id);
 b.damage(cart,999999);b.deaths();
 const broken=b.units.find(u=>u.entity==='BrokenCannon');assert.ok(broken);
 assert.equal(b.chooseTarget(giant).id,broken.id);
 assert.equal(broken.building,true);assert.equal(broken.def.speedTiles,0);
 b.createArea('Clone',1,broken.x,broken.y,9);b.tickAreas();
 assert.equal(b.units.some(u=>u.cloned&&u.entity==='BrokenCannon'),false);
});

test('Fisherman remains stationary while charging his source-timed hook',()=>{
 const b=make(),fisherman=troop(b,'Fisherman',0),target=troop(b,'Knight',1,10);
 const x=fisherman.x,y=fisherman.y;
 tickOnly(b,fisherman,.5);
 assert.equal(fisherman.x,x);assert.equal(fisherman.y,y);
 assert.equal(b.projectiles.length,0);
 tickOnly(b,fisherman,.8);assert.equal(b.projectiles.length,0);
 tickOnly(b,fisherman,.1);
 assert.equal(b.projectiles.filter(p=>p.name==='FishermanProjectile'&&p.target===target.id).length,1);
});

for(const interruption of ['stun','push','target gone'])test('Fisherman hook windup cancels on '+interruption,()=>{
 const b=make(),fisherman=troop(b,'Fisherman',0),target=troop(b,'Knight',1,10);
 tickOnly(b,fisherman,.4);
 if(interruption==='stun')b.addBuff(fisherman,'ZapFreeze',2,1,9);
 if(interruption==='push')b.push(fisherman,-SX,0,1,true);
 if(interruption==='target gone')target.hp=0;
 // No old delayed callback may launch after the attack was interrupted.
 b.time=1.5;b.tickPending();
 assert.equal(b.projectiles.length,0);
 if(interruption==='stun')b.tickEntity(fisherman,.05);
 else if(interruption==='target gone')b.tickEntity(fisherman,.05);
 assert.equal(b.projectiles.length,0);
});

test('Fisherman refuses to complete a charged hook on a newly invisible target',()=>{
 const b=make(),fisherman=troop(b,'Fisherman',0),target=troop(b,'Knight',1,10);
 tickOnly(b,fisherman,.4);target.invisible=true;
 tickOnly(b,fisherman,1.2);b.tickPending();
 assert.equal(b.projectiles.length,0);
});

test('Cannon Cart keeps its target through the source 150ms morph delay',()=>{
 const b=make(),cart=troop(b,'MovingCannon',0),old=troop(b,'Giant',1,9),closer=troop(b,'Knight',1,7);
 cart.targetId=old.id;cart.heading=.7;
 b.damage(cart,999999);b.deaths();
 const broken=b.units.find(u=>u.entity==='BrokenCannon');
 assert.equal(broken.targetId,old.id);assert.equal(broken.heading,.7);
 assert.ok(Math.abs(broken.readyAt-.15)<1e-8);
 tickOnly(b,broken,.1);assert.equal(broken.wait>0,true);
 tickOnly(b,broken,.1);assert.equal(broken.wait,0);
 assert.equal(broken.targetId,old.id);assert.notEqual(broken.targetId,closer.id);
});

test('Tornado pulls the same distance over equal time in visible and headless simulation steps',()=>{
 const positions=[];
 for(const dt of [1/60,.05,.1]){
  const b=make(),target=troop(b,'Giant',1,6);b.createArea('Tornado',0,10*SX,20*SY,9);
  for(let left=.5;left>1e-8;){const step=Math.min(dt,left);b.time+=step;b.tickAreas(step);left-=step;}
  positions.push(target.x);
 }
 assert.ok(positions[0]>6*SX);
 assert.ok(positions.every(x=>Math.abs(x-positions[0])<1e-6),positions.join(', '));
});

test('Tornado attraction does not repeatedly cancel an in-range attack',()=>{
 const b=make(),knight=troop(b,'Knight',1,5),target=troop(b,'Giant',0,6.5);
 b.createArea('Tornado',0,8*SX,20*SY,9);
 b.startAttack(knight,target);
 for(let i=0;i<36;i++){b.time+=1/60;b.tickAreas(1/60);b.tickEntity(knight,1/60);}
 assert.ok(target.hp<target.maxHp,'the pull must not behave like a continuous stun');
});
