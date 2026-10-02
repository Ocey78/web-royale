'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../src/core');
function battle(card){const deck=[card,'archers','giant','musketeer','bomber','fireball','arrows','zap'];const b=new C.Battle({ai:false,deck});b.towers=[];return b;}
test('Mortar placement forecast excludes its blind spot but includes a legal farther target',()=>{
 const b=battle('mortar'),close=b.spawn('Knight',1,9.5*C.SX,24*C.SY,{wait:0}),far=b.spawn('Knight',1,9.5*C.SX,19*C.SY,{wait:0});
 const f=b.placementPreview(0,0,9.5*C.SX,25.5*C.SY);assert.equal(f.ok,true);assert.equal(f.minRange,3.5);
 assert(!f.targets.some(t=>t.id===close.id));assert(!f.affected.some(t=>t.id===close.id));assert(f.targets.some(t=>t.id===far.id));
});
test('a troop placed in enemy Mortar blind spot is not forecast as immediately attackable',()=>{
 const b=battle('knight'),m=b.spawn('Mortar',1,9.5*C.SX,25.5*C.SY,{wait:0});
 const close=b.placementPreview(0,0,9.5*C.SX,24*C.SY);assert(close.ok);assert(!close.attackers.some(t=>t.id===m.id&&t.immediate));assert(!close.retargeting.some(t=>t.id===m.id));
 const far=b.placementPreview(0,0,9.5*C.SX,20*C.SY);assert(far.ok);assert(far.attackers.some(t=>t.id===m.id&&t.immediate));assert(far.retargeting.some(t=>t.id===m.id));
});
