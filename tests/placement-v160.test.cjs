'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const B=require('../src/battle.js'),K=require('../src/catalog.js'),P=require('../src/profile.js');
const deck=['cannon','knight','archers','giant','musketeer','bomber','fireball','arrows'];

test('Cannon snaps to a tile center and exposes source range',()=>{
 const b=new B.Battle({ai:false,deck});const f=b.placementPreview(0,0,7.13*K.SX,23.77*K.SY);
 A.equal(f.ok,true);A.equal(f.building,true);A.equal((f.x/K.SX)%1,.5);A.equal((f.y/K.SY)%1,.5);A.equal(f.range,K.entityDef('Cannon',f.level).range);
});
test('ground placement rejects water and tower overlap even with place-anywhere cheat',()=>{
 const profile=P.normalizeProfile({cheats:{placement:true},unlockedCards:K.CARDS.map(c=>c.id),decks:[deck,deck,deck,deck,deck]});
 const b=new B.Battle({ai:false,profile,deck});A.equal(b.placementPreview(0,1,9*K.SX,15.5*K.SY).ok,false);A.equal(b.placementPreview(0,0,3.5*K.SX,25.5*K.SY).ok,false);
});
test('The Log forecast is a swept line rather than radial-only',()=>{
 const d=['the-log','knight','archers','giant','musketeer','bomber','fireball','arrows'];const b=new B.Battle({ai:false,deck:d});const f=b.placementPreview(0,0,9*K.SX,23*K.SY);A.equal(f.shape.kind,'rolling');A.ok(f.shape.y2<f.shape.y);A.ok(f.shape.width>0);
});
test('spell forecast affected set matches live resolver predicate',()=>{
 const d=['fireball','knight','archers','giant','musketeer','bomber','zap','arrows'],b=new B.Battle({ai:false,deck:d});const inside=b.makeEntity('Knight',1,9*K.SX,12*K.SY,{level:9,wait:0}),outside=b.makeEntity('Knight',1,14*K.SX,12*K.SY,{level:9,wait:0});b.units.push(inside,outside);const f=b.placementPreview(0,0,9*K.SX,12*K.SY);A.ok(f.affected.some(x=>x.id===inside.id));A.equal(f.affected.some(x=>x.id===outside.id),false);
});
test('preview retarget warning agrees with live target after deploy',()=>{
 const b=new B.Battle({ai:false,deck:['knight','cannon','archers','giant','musketeer','bomber','fireball','arrows']});const enemy=b.makeEntity('Knight',1,9*K.SX,14*K.SY,{level:9,wait:0});b.units.push(enemy);const f=b.placementPreview(0,0,9*K.SX,18*K.SY);A.ok(f.retargeting.some(x=>x.id===enemy.id));const r=b.deploy(0,0,f.x,f.y);A.equal(r.ok,true);b.step(.05);const placed=b.units.filter(u=>u.team===0&&u.card==='knight').at(-1);A.equal(enemy.targetId,placed.id);
});
test('existing engaged target suppresses false retarget warning',()=>{
 const b=new B.Battle({ai:false,deck:['knight','cannon','archers','giant','musketeer','bomber','fireball','arrows']});const enemy=b.makeEntity('Knight',1,8*K.SX,20*K.SY,{level:9,wait:0}),old=b.makeEntity('Knight',0,8*K.SX,20.7*K.SY,{level:9,wait:0});b.units.push(enemy,old);enemy.targetId=old.id;const f=b.placementPreview(0,0,10*K.SX,21*K.SY);A.equal(f.retargeting.some(x=>x.id===enemy.id),false);A.ok(f.locked.some(x=>x.id===enemy.id));
});
