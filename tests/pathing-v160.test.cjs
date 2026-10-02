'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const Pathing=require('../src/pathing.js'),B=require('../src/battle.js'),K=require('../src/catalog.js');

test('route crosses the river only inside a bridge corridor',()=>{
 const path=Pathing.route({x:9*K.SX,y:22*K.SY},{x:9*K.SX,y:10*K.SY},.75,[]);A.ok(path.length>0);const river=path.filter(p=>p.y/K.SY>=15&&p.y/K.SY<17);A.ok(river.length>0);A.ok(river.every(p=>{const x=p.x/K.SX;return (x>=2.5&&x<=5.5)||(x>=12.5&&x<=15.5);}));
});
test('two opposing ground bodies cannot tunnel through each other on a large step',()=>{
 const b=new B.Battle({ai:false}),a=b.makeEntity('Knight',0,9*K.SX,20*K.SY,{level:9,wait:0}),d=b.makeEntity('Knight',1,9*K.SX,18*K.SY,{level:9,wait:0});b.units.push(a,d);const s=Pathing.sweptStep(a,0,-3*K.SY,[d]);A.ok(Math.hypot((s.x-d.x)/K.SX,(s.y-d.y)/K.SY)+1e-6>=a.def.radiusTiles+d.def.radiusTiles);
});
test('edgeDistance uses source collision radii',()=>{const b=new B.Battle({ai:false}),a=b.makeEntity('Knight',0,9*K.SX,20*K.SY,{level:9,wait:0}),d=b.makeEntity('Knight',1,9*K.SX,18*K.SY,{level:9,wait:0});const expected=Math.max(0,2-a.def.radiusTiles-d.def.radiusTiles);A.ok(Math.abs(Pathing.edgeDistance(a,d)-expected)<1e-7);});
test('present waiting troop can be targeted and damaged before activation',()=>{
 const b=new B.Battle({ai:false}),waiting=b.makeEntity('Knight',0,9*K.SX,20*K.SY,{level:9,wait:2}),enemy=b.makeEntity('Musketeer',1,9*K.SX,17*K.SY,{level:9,wait:0});b.units.push(waiting,enemy);A.equal(b.canTarget(enemy,waiting),true);const hp=waiting.hp;b.damage(waiting,50,enemy);A.ok(waiting.hp<hp);A.ok(waiting.wait>0);
});
test('not-yet-appeared entity remains unavailable',()=>{const b=new B.Battle({ai:false}),hidden=b.makeEntity('Miner',0,9*K.SX,20*K.SY,{level:9,wait:0,appearsIn:2}),enemy=b.makeEntity('Knight',1,9*K.SX,18*K.SY,{level:9,wait:0});b.units.push(hidden,enemy);A.equal(b.canTarget(enemy,hidden),false);});
test('Battle.move treats troop bodies as soft contacts rather than hard path obstacles',()=>{
 const b=new B.Battle({ai:false}),a=b.makeEntity('Knight',0,9*K.SX,20*K.SY,{level:9,wait:0}),d=b.makeEntity('Knight',1,9*K.SX,19.1*K.SY,{level:9,wait:0});b.units.push(a,d);const before=a.y;b.move(a,{id:-1,x:9*K.SX,y:15*K.SY,def:{radiusTiles:0}},.25,1);A.ok(a.y<before-.05*K.SY,`before=${before/K.SY} after=${a.y/K.SY}`);
});
