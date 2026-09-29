'use strict';
const test=require('node:test'), A=require('node:assert/strict');
const C=require('../src/core'), N=require('../src/native');
function advance(b,t){for(let n=0;n<Math.round(t*60);n++)b.step(1/60);}
function battle(mode='Default',other={}){return new C.Battle({ai:false,learning:false,mode,seed:91,...other});}
test('v120: Lumberjack rage bottle resolves after source deploy time without an enemy hit',()=>{
 const b=battle(),p=b.spawn('RageBarbarian',0,230,440,{wait:0});p.hp=0;b.deaths();
 const bottle=b.units.find(x=>x.entity==='RageBarbarianBottle');A.ok(bottle);
 advance(b,.6);A.ok(b.areas.some(x=>x.name==='BarbarianRage'));
 A.ok(!b.units.some(x=>x.entity==='RageBarbarianBottle'));
});
test('v120: zero-health effect carriers cannot be targeted or counted as combat kills',()=>{
 const b=battle(),bottle=b.spawn('RageBarbarianBottle',0,210,390),enemy=b.spawn('Knight',1,210,380,{wait:0});
 A.equal(b.canTarget(enemy,bottle),false);A.equal(bottle.effectCarrier,true);
 const kills=b.metrics.kills.slice();advance(b,.6);A.deepEqual(b.metrics.kills,kills);
});
test('v120: Rage area buffs both teammates after deployment and never spawns a targetable bottle',()=>{
 const b=battle('TeamVsTeam');const a=b.spawn('Knight',0,180,460,{owner:0,wait:0}), ally=b.spawn('Knight',0,240,460,{owner:2,wait:0});
 b.cast(C.cardAt('rage'),0,210,450,2);advance(b,.7);
 A.ok(b.areas.some(x=>x.name==='Rage'&&x.owner===2));A.ok(a.buffs.Rage&&ally.buffs.Rage);
 A.ok(b.units.every(x=>!x.entity.includes('Bottle')));
});
test('v120: direction-controlled Cannon samples a fixed original pose, never a wall-clock spin',()=>{
 const drawn=[],fakeScene={data:{exports:{building_cannon:1}},duration:()=>19/30,clip:()=>({fps:30,frames:Array.from({length:19},()=>[])}),draw:(ctx,name,time,opts)=>drawn.push({name,time,opts}),id:()=>1};
 const lib=new N.Library({arenas:[{id:'test'}],units:{Cannon:{scene:'cannon',prefix:['building_cannon','building_cannon'],building:true,scale:1}},scenes:{}},{});lib.scenes.cannon=fakeScene;
 const ctx={save(){},restore(){},translate(){},scale(){}};
 for(const time of [.1,1,7.25])lib.unit(ctx,'Cannon',0,0,0,time,'idle',0,0,1,{entity:{def:C.entityDef('Cannon')}});
 A.ok(drawn.every(x=>x.time===drawn[0].time));A.ok(drawn.every(x=>x.opts.loop===false));
 A.equal(drawn[0].opts.frame,9);
});
test('v120: turret angle pose mapping has symmetric north/south/east/west and no NaN',()=>{
 A.equal(typeof N.rotationPose,'function');A.deepEqual(N.rotationPose(-Math.PI/2,19),{frame:0,flip:false});
 A.equal(N.rotationPose(Math.PI/2,19).frame,18);A.equal(N.rotationPose(0,19).frame,9);
 A.equal(N.rotationPose(Math.PI,19).flip,true);A.equal(N.rotationPose(NaN,19).frame,0);
});
test('v120: source party 2v2 mode resolves its own timeline and four players',()=>{
 const b=battle('TeamVsTeamLadder');A.equal(b.seatCount,4);A.equal(b.mode,'TeamVsTeamLadder');A.equal(b.timeline.Name,'TeamVsTeam');
});
test('v120: each seat has independent collection levels including Mirror',()=>{
 const base=Object.fromEntries(C.CARDS.map(x=>[x.id,9]));const levels=[{...base,knight:13,mirror:12},{...base,knight:10},{...base,knight:11},{...base,knight:12}];
 const b=battle('TeamVsTeam',{seatLevels:levels});for(let s=0;s<4;s++){b.hand[s][0]='knight';A.equal(b.card(s,0).level,levels[s].knight);}
 b.elixir.fill(10);b.hand[2][1]='mirror';b.deploy(2,0,200,450);A.equal(b.units.find(x=>x.owner===2).level,11);
});
test('v120: shared king cannons use distinct left and right firing centers',()=>{
 const b=battle('TeamVsTeam'),k=b.towers.find(t=>t.king&&t.team===0);k.active=true;
 b.spawn('Giant',1,k.x-70,k.y-75,{wait:0});const shots=[];b.fireProjectile=(name,source,target)=>{if(source.id===k.id)shots.push(source.x);};
 advance(b,1.2);A.ok(shots.some(x=>x<k.x));A.ok(shots.some(x=>x>k.x));
});
test('v120: both king cannons reset a charge when their particular target is lost',()=>{
 const b=battle('TeamVsTeam'),k=b.towers.find(t=>t.king&&t.team===0);k.active=true;A.equal(typeof b.tickKingCannons,'function');
 const t=b.spawn('Giant',1,k.x+60,k.y-60,{wait:0});advance(b,.1);t.hp=0;b.deaths();advance(b,.15);
 A.equal(k.cannons[0].targetId,null);A.equal(k.cannons[1].targetId,null);
});

test('2v2 king barrels preserve the source one-second firing cadence and report shots',()=>{
 const b=new C.Battle({mode:'TeamVsTeam',ai:false});const king=b.towers.find(u=>u.king&&u.team===0);king.active=true;
 const target=b.spawn('Giant',1,king.x,king.y-80,{wait:0});target.hp=target.maxHp=100000;target.def={...target.def,speed:0,speedTiles:0};
 const times=[];const fire=b.fireProjectile.bind(b);b.fireProjectile=(n,s,t,o)=>{if(n==='KingProjectile'&&s.team===0)times.push([b.time,s.x]);return fire(n,s,t,o);};
 for(let i=0;i<180;i++)b.step(1/60);
 const left=times.filter(e=>e[1]<king.x);A.ok(left.length>=3);A.ok(Math.abs(left[1][0]-left[0][0]-1)<.04);A.ok(b.kingShots>=6);
});
