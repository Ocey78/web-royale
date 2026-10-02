'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const K=require('../src/catalog.js'),B=require('../src/battle.js'),Pathing=require('../src/pathing.js');
let F;try{F=require('../src/formations.js');}catch(_){F={};}
const deckFor=id=>[id,'knight','giant','musketeer','bomber','fireball','arrows','cannon'];
const near=(a,b,e=.04)=>Math.abs(a-b)<=e;

test('v170 formations module exposes source-driven cardMembers',()=>{A.equal(typeof F.cardMembers,'function');});

test('Archers preview and live deploy show both horizontal members with source stagger',()=>{
 const c=K.cardAt('archers',9),members=F.cardMembers(c,9*K.SX,24*K.SY,0);
 A.equal(members.length,2);A.equal(members[0].entity,'Archer');A.equal(members[1].entity,'Archer');A.ok(near(members[0].y,members[1].y));A.ok(Math.abs(members[0].x-members[1].x)>=.75*K.SX);A.equal(members[1].delay-members[0].delay,.1);
 const b=new B.Battle({ai:false,deck:deckFor('archers')}),p=b.placementPreview(0,0,9*K.SX,24*K.SY);A.equal(p.members.length,2);A.equal(b.deploy(0,0,p.x,p.y).ok,true);const live=b.units.filter(u=>u.card==='archers');A.equal(live.length,2);for(let i=0;i<2;i++){A.ok(near(live[i].x,p.members[i].x,2));A.ok(near(live[i].y,p.members[i].y,2));}
});

test('Skeletons and Goblins retain their authored member count and mirror each formation',()=>{
 for(const id of ['skeletons','goblins','spear-goblins']){const c=K.cardAt(id,9),blue=F.cardMembers(c,9*K.SX,24*K.SY,0),red=F.cardMembers(c,9*K.SX,8*K.SY,1),count=c.source.SummonNumber;A.equal(blue.length,count,id);A.equal(new Set(blue.map(m=>Math.round(m.x)+','+Math.round(m.y))).size,count,id);A.ok(Math.min(...blue.map(m=>m.y))<Math.max(...blue.map(m=>m.y)),id);const by=blue.map(m=>m.y-24*K.SY).sort((a,b)=>a-b),ry=red.map(m=>m.y-8*K.SY).sort((a,b)=>a-b);for(let i=0;i<count;i++)A.ok(Math.abs(by[i]+ry[count-1-i])<3,id+' mirror');}
});

test('Barbarians form a five-point source-radius star and Recruits span the arena',()=>{
 const bs=F.cardMembers(K.cardAt('barbarians',9),9*K.SX,24*K.SY,0);A.equal(bs.length,5);const radii=bs.map(m=>Math.hypot((m.x-9*K.SX)/K.SX,(m.y-24*K.SY)/K.SY));A.ok(radii.every(r=>r>.55&&r<.85));
 const rr=F.cardMembers(K.cardAt('royal-recruits',9),9*K.SX,24*K.SY,0);A.equal(rr.length,6);A.ok((Math.max(...rr.map(m=>m.x))-Math.min(...rr.map(m=>m.x)))/K.SX>12.5);A.ok(rr.every(m=>near(m.y,24*K.SY)));
});

test('Skeleton Army scatters across multiple radii rather than one ring',()=>{const ms=F.cardMembers(K.cardAt('skeleton-army',9),9*K.SX,24*K.SY,0);A.equal(ms.length,15);const bins=new Set(ms.map(m=>Math.round(Math.hypot((m.x-9*K.SX)/K.SX,(m.y-24*K.SY)/K.SY)*10)));A.ok(bins.size>=3);});

test('Goblin Gang and Rascals preview every primary and secondary troop in the real front/back roles',()=>{
 const gang=F.cardMembers(K.cardAt('goblin-gang',9),9*K.SX,24*K.SY,0);A.equal(gang.length,5);A.deepEqual(gang.map(x=>x.entity).sort(),['Goblin_Stab','Goblin_Stab','Goblin_Stab','SpearGoblin','SpearGoblin'].sort());const gy=gang.filter(x=>x.entity==='Goblin_Stab').reduce((n,x)=>n+x.y,0)/3,sy=gang.filter(x=>x.entity==='SpearGoblin').reduce((n,x)=>n+x.y,0)/2;A.ok(gy<sy);
 const ras=F.cardMembers(K.cardAt('rascals',9),9*K.SX,24*K.SY,0);A.equal(ras.length,3);const boy=ras.find(x=>x.entity==='RascalBoy'),girls=ras.filter(x=>x.entity==='RascalGirl');A.ok(boy&&girls.length===2);A.ok(boy.y<Math.min(...girls.map(x=>x.y)));
});

test('ground troops are soft bodies during movement but buildings remain hard obstacles',()=>{
 const b=new B.Battle({ai:false}),a=b.makeEntity('Knight',0,9*K.SX,21*K.SY,{level:9,wait:0}),d=b.makeEntity('Knight',1,9*K.SX,19*K.SY,{level:9,wait:0});b.units.push(a,d);for(let i=0;i<100;i++){b.move(a,{id:-1,x:9*K.SX,y:14*K.SY,def:{radiusTiles:0}},.05);b.move(d,{id:-2,x:9*K.SX,y:26*K.SY,def:{radiusTiles:0}},.05);b.separate();}A.ok(a.y<19*K.SY&&d.y>21*K.SY,`a=${a.y/K.SY} d=${d.y/K.SY}`);
 const wall=b.makeEntity('Cannon',1,9*K.SX,18*K.SY,{level:9,wait:0});wall.building=true;b.units.push(wall);const runner=b.makeEntity('Knight',0,9*K.SX,20*K.SY,{level:9,wait:0});b.units.push(runner);for(let i=0;i<30;i++)b.move(runner,{id:-3,x:9*K.SX,y:15*K.SY,def:{radiusTiles:0}},.05);const gap=Math.hypot((runner.x-wall.x)/K.SX,(runner.y-wall.y)/K.SY);A.ok(gap+1e-5>=runner.def.radiusTiles+wall.def.radiusTiles-.08,`gap ${gap}`);
});

test('visible deploying troops participate in spawn push while future stagger members do not',()=>{
 const b=new B.Battle({ai:false}),old=b.makeEntity('Knight',1,9*K.SX,20*K.SY,{level:9,wait:0}),deploying=b.makeEntity('Knight',0,9*K.SX,20*K.SY,{level:9,wait:1}),future=b.makeEntity('Skeleton',0,9*K.SX,20*K.SY,{level:9,wait:1,appearsIn:.5});b.units.push(old,deploying,future);const before=Math.hypot((old.x-deploying.x)/K.SX,(old.y-deploying.y)/K.SY);b.separate();const after=Math.hypot((old.x-deploying.x)/K.SX,(old.y-deploying.y)/K.SY);A.ok(after>before+.01,`spawn push ${before}->${after}`);A.equal(future.x,9*K.SX);A.equal(future.y,20*K.SY);
});
