'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core.js'),N=require('../src/native.js'),FX=require('../src/fx.js');
const native=require('../assets/native/data.json'),fxData=require('../assets/game/fx-data.json');
globalThis.RoyaleCore=C;globalThis.RoyaleNative=N;
const make=()=>{const b=new C.Battle({ai:false});b.towers=[];return b;};
const spawn=(b,name,team,x=5,y=20)=>b.spawn(name,team,x*C.SX,y*C.SY,{wait:0});
const context={save(){},restore(){},translate(){},scale(){}};
function sample(u,state=u.visualState){
 const lib=new N.Library(native,{}),cfg=native.units[u.entity],sc=new N.Scene(native.scenes[cfg.scene],[]),calls=[];
 sc.draw=(c,name,time,options)=>{calls.push({name,time,options,clip:sc.clip(name)});return true;};lib.scenes[cfg.scene]=sc;
 lib.unit(context,u.entity,u.x,u.y,u.team,0,state,u.heading,0,1,{elapsed:u.animationTime,idleTime:u.visualTime,attackDuration:u.visualDuration,entity:u});
 return calls[0];
}
for(const name of ['Knight','Giant','Musketeer','Witch','Hunter','BrokenCannon'])test(name+' source action_frame coincides with actual damage or projectile release',()=>{
 const b=make(),u=spawn(b,name,0),target=spawn(b,name==='Giant'?'Cannon':'Giant',1,5,18.5);
 u.targetId=target.id;b.startAttack(u,target);const initial=sample(u),marker=initial.clip.labels.indexOf('action_frame');assert.ok(marker>0,name);
 let released=false;
 for(let i=0;i<120;i++){
  const before=sample(u);assert.ok(N.frameAt(before.time,before.clip.fps,before.clip.frames.length,false)<marker,'no visual hit before release');
  b.time+=.05;b.tickEntity(u,.05);
  if(b.projectiles.length||target.hp<target.maxHp){released=true;break;}
 }
 assert.ok(released,name+' did not strike');const at=sample(u);
 assert.equal(N.frameAt(at.time,at.clip.fps,at.clip.frames.length,false),marker,'visible hit marker must match actual hit');
});

test('Sparky firing clip recovers at source speed rather than stretching over its four-second reload',()=>{
 const b=make(),u=spawn(b,'ZapMachine',0),target=spawn(b,'Giant',1,5,18.5);u.precharge=u.def.interval;
 b.startAttack(u,target);b.strike(u,target);
 assert.equal(sample(u).clip.labels[N.frameAt(sample(u).time,sample(u).clip.fps,sample(u).clip.frames.length,false)],'action_frame');
 u.animationTime+=.5;assert.match(sample(u).name,/_idle/);
});

test('stun cancels an uncommitted visible attack without playing its hit frame on thaw',()=>{
 const b=make(),u=spawn(b,'Knight',0),target=spawn(b,'Giant',1,5,18.5);b.startAttack(u,target);
 b.time+=.1;b.tickEntity(u,.1);b.addBuff(u,'ZapFreeze',.5,1);
 assert.match(sample(u).name,/_idle/);assert.equal(u.visualAttack,null);assert.equal(target.hp,target.maxHp);
});

test('Giant walk cycle follows its actual slow displacement and blocked movement cannot advance feet',()=>{
 const b=make(),u=spawn(b,'Giant',0,3.5,23),goal={id:-1,x:u.x,y:3*C.SY,def:{radiusTiles:0}};
 b.move(u,goal,.8);u.animationTime=.8;
 assert.ok(Math.abs(u.walk-.6)<1e-8);assert.ok(Math.abs(sample(u,'run').time-.6)<1e-8);
 const at=u.walk;u.animationTime=9;assert.equal(sample(u,'run').time,at);
});

test('source walk tweak multiplies the displacement clock while airborne wingbeats stay time based',()=>{
 const b=make(),pekka=spawn(b,'Pekka',0),dragon=spawn(b,'BabyDragon',0);
 pekka.walk=.75;pekka.animationTime=1;assert.ok(Math.abs(sample(pekka,'run').time-.9)<1e-8);
 dragon.walk=1.5;dragon.animationTime=1;assert.equal(sample(dragon,'run').time,1);
});

for(const name of ['Witch','DarkWitch'])test(name+' dispatches its source child-spawn effect at each child appearance',()=>{
 const b=make(),u=spawn(b,name,0),r=u.def.source;b.effects=[];b.time=u.nextSpawnAt;b.tickEntity(u,.05);
 const children=b.units.filter(v=>v.entity===r.SpawnCharacter),fx=b.effects.filter(e=>e.sourceEffect===r.SpawnCharacterEffect);
 assert.equal(fx.length,children.length);assert.ok(fx.length>0);
 for(const child of children)assert.ok(fx.some(e=>e.x===child.x&&e.y===child.y&&Math.abs((e.delay||0)-(child.appearsAt-b.time))<1e-8));
});

test('Prince charge and Bandit dash emit their authored effect once when the special motion begins',()=>{
 const b=make(),prince=spawn(b,'Prince',0,3.5,23),target=spawn(b,'Giant',1,3.5,18);
 prince.chargeDistance=prince.def.source.ChargeRange/100-.01;b.effects=[];b.move(prince,target,.1);b.move(prince,target,.1);
 assert.equal(b.effects.filter(e=>e.sourceEffect===prince.def.source.ChargeEffect).length,1);
 const bandit=spawn(b,'Assassin',0,10,23),victim=spawn(b,'Giant',1,10,19);b.startDash(bandit,victim);b.time=bandit.dash.windup;
 b.tickDash(bandit,.01);b.tickDash(bandit,.01);
 assert.equal(b.effects.filter(e=>e.sourceEffect===bandit.def.source.DashEffect).length,1);
});

test('Sparky displays the source ready sparks only while fully loaded and unstunned',()=>{
 const b=make(),u=spawn(b,'ZapMachine',0),fx=new FX.Renderer(fxData,{}),calls=[];fx.effect=(...a)=>{calls.push(a);return true;};
 u.precharge=u.def.interval;assert.equal(typeof fx.unitStates,'function');fx.unitStates({},b,'above');
 assert.ok(calls.some(a=>a[1]===u.def.source.LoadAttackEffectReady));
 b.addBuff(u,'ZapFreeze',.5,1);calls.length=0;fx.unitStates({},b,'above');assert.equal(calls.length,0);
});

test('Miner source travel particles follow underground travel and deploy particles wait for appearance',()=>{
 const b=make();b.cast(C.cardAt('miner'),0,3.5*C.SX,4*C.SY);
 const u=b.units.find(v=>v.entity==='Miner'),r=u.def.source;
 const travel=b.effects.find(e=>e.sourceEffect===r.SpawnPathfindEffect),deploy=b.effects.find(e=>e.sourceEffect===r.SpawnEffect);
 assert.ok(travel,'native underground travel effect');assert.equal(deploy.delay,u.appearsAt);assert.ok(deploy.ttl>u.appearsAt+1);
 b.visualTime=u.appearsAt/2;const calls=[],fx=new FX.Renderer(fxData,{});fx.effect=(...a)=>{calls.push(a);return true;};fx.events({},b,'above');
 const draw=calls.find(a=>a[1]===r.SpawnPathfindEffect);assert.ok(draw);
 assert.ok(Math.abs(draw[2]-(9+3.5)/2*C.SX)<1e-6);assert.ok(Math.abs(draw[3]-(29+4)/2*C.SY)<1e-6);
});

test('Fisherman hook uses authored loading, throw-hold, and pull frames instead of the fish melee animation',()=>{
 const b=make(),u=spawn(b,'Fisherman',0),target=spawn(b,'Giant',1,11,20);b.time=.05;b.tickEntity(u,.05);
 assert.ok(u.hook);assert.match(sample(u).name,/_loading1_/);
 for(let i=0;i<20;i++){b.time+=.05;b.tickEntity(u,.05);}
 const throwing=sample(u),frame=N.frameAt(throwing.time,throwing.clip.fps,throwing.clip.frames.length,false);
 assert.ok(frame>=throwing.clip.labels.indexOf('throw_start')&&frame<=throwing.clip.labels.indexOf('throw_end'));
 while(!b.projectiles.length){b.time+=.05;b.tickEntity(u,.05);}
 const hold=sample(u);assert.equal(N.frameAt(hold.time,hold.clip.fps,hold.clip.frames.length,false),hold.clip.labels.indexOf('throw_hold'));
 b.projectileImpact(b.projectiles[0],target);const pull=sample(u);
 assert.equal(N.frameAt(pull.time,pull.clip.fps,pull.clip.frames.length,false),pull.clip.labels.indexOf('pull_start'));
 assert.ok(b.effects.some(e=>e.sourceBeam===C.DATA.projectiles.FishermanProjectile.DragEffect));
});

test('stun interrupts the Fisherman loading animation as well as the hook operation',()=>{
 const b=make(),u=spawn(b,'Fisherman',0);spawn(b,'Giant',1,11,20);b.time=.05;b.tickEntity(u,.05);assert.ok(u.hook);
 b.addBuff(u,'ZapFreeze',.5,1);assert.equal(u.hook,null);assert.match(sample(u).name,/_idle/);
});

test('pausing during windup preserves its displayed frame and rendering never emits duplicate attacks',()=>{
 const b=make(),u=spawn(b,'Musketeer',0),target=spawn(b,'Giant',1,5,18.5);u.targetId=target.id;b.startAttack(u,target);
 b.time=.2;b.tickEntity(u,.2);const frame=sample(u),effects=b.effects.length;b.paused=true;
 for(let i=0;i<30;i++){b.step(1/60);assert.equal(sample(u).time,frame.time);}
 assert.equal(b.effects.length,effects);assert.equal(b.projectiles.length,0);
 b.paused=false;for(let i=0;i<20&&!b.projectiles.length;i++){b.time+=.05;b.tickEntity(u,.05);}
 const shots=b.effects.filter(e=>e.sourceEffect===u.def.source.ProjectileEffect).length;
 for(let i=0;i<30;i++)sample(u);assert.equal(b.effects.filter(e=>e.sourceEffect===u.def.source.ProjectileEffect).length,shots);assert.equal(shots,1);
});

test('a later Bandit dash landing clears stale interrupted-attack presentation and shows its hit pose',()=>{
 const b=make(),u=spawn(b,'Assassin',0),target=spawn(b,'Giant',1,5,16);
 u.visualAttackCancelled=true;u.visualAttack={windup:1,releasedAt:null};b.startDash(u,target);b.time=u.dash.windup;b.tickDash(u,1);
 assert.ok(target.hp<target.maxHp);const at=sample(u);assert.match(at.name,/_attack1_/);
 assert.equal(N.frameAt(at.time,at.clip.fps,at.clip.frames.length,false),at.clip.labels.indexOf('action_frame'));
});
