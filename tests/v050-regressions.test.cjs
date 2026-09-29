const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core'),N=require('../src/native');
const {SX,SY}=C;
function step(b,seconds){for(let i=0;i<Math.ceil(seconds*60);i++)b.step(1/60);}
test('v050: attack animation survives the damage frame',()=>{
 const b=new C.Battle({ai:false}),a=b.spawn('Knight',0,240,365,{wait:0}),t=b.spawn('Giant',1,240,340,{wait:0});t.hp=t.maxHp=100000;
 step(b,.57);assert.ok(t.hp<100000);assert.equal(a.visualState,'attack');
});
test('v050: a walking tower target does not block a closer defender',()=>{
 const b=new C.Battle({ai:false}),a=b.spawn('Knight',0,3.5*SX,13*SY,{wait:0}),tower=b.towers.find(t=>t.team===1&&!t.king);
 a.targetId=tower.id;const defender=b.spawn('Skeleton',1,4*SX,13*SY,{wait:0});
 assert.equal(b.chooseTarget(a).id,defender.id);
});
test('v050: an attacker already hitting a tower keeps that target',()=>{
 const b=new C.Battle({ai:false}),tower=b.towers.find(t=>t.team===1&&!t.king),a=b.spawn('Knight',0,tower.x,tower.y+2*SY,{wait:0});a.targetId=tower.id;
 b.spawn('Skeleton',1,a.x+SX*.5,a.y,{wait:0});assert.equal(b.chooseTarget(a).id,tower.id);
});
test('v050: Inferno ramp resets when the target leaves beam range',()=>{
 const b=new C.Battle({ai:false}),a=b.spawn('InfernoDragon',0,9*SX,20*SY,{wait:0}),t=b.spawn('Giant',1,9*SX,14*SY,{wait:0});
 a.targetId=t.id;a.lockTime=5;b.step(1/60);assert.equal(a.lockTime,0);
});
test('v050: placed Skeleton Army cannot spill into river',()=>{
 const b=new C.Battle({ai:false});b.cast(C.cardAt('skeleton-army',9),0,9*SX,17*SY);
 assert.equal(b.units.length,C.cardAt('skeleton-army',9).count);assert.ok(b.units.every(u=>u.y>=17*SY));
});
test('v050: original single-direction attack is reused before idle',()=>{
 const data=require('../assets/native/data.json'),cfg=data.units.balloon;
 assert.equal(typeof N.resolveAnimation,'function');
 assert.equal(N.resolveAnimation(cfg,data.scenes[cfg.scene],1,'attack',9),'balloon1_enemy_attack1_1');
 assert.equal(N.resolveAnimation(cfg,data.scenes[cfg.scene],0,'run',5),'balloon1_run1_1');
});
test('v050: airborne source height is separated from ground coordinates',()=>{
 assert.equal(typeof N.flightOffset,'function');assert.equal(N.flightOffset(C.entityDef('Balloon')),60);assert.equal(N.flightOffset(C.entityDef('Knight')),0);
});
test('v050: transient effect envelope ends transparent',()=>{
 assert.equal(typeof N.effectOpacity,'function');assert.ok(N.effectOpacity(.5,1)>0);assert.equal(N.effectOpacity(1,1),0);assert.equal(N.effectOpacity(1.1,1),0);
});
test('v050: visual animation clock freezes during Freeze',()=>{
 const b=new C.Battle({ai:false}),u=b.spawn('Knight',0,240,430,{wait:0});step(b,.1);const before=u.visualTime;
 assert.ok(Number.isFinite(before));b.addBuff(u,'Freeze',1,1);step(b,.2);assert.equal(u.visualTime,before);
});
