'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../src/core'),Sandbox=require('../src/sandbox'),Boat=require('../src/boat-battle');
const make=()=>new C.Battle({ai:false,seed:71,headless:true});
const wy=(team,y)=>team?32-y:y;
const spawn=(b,name,team,x,y)=>b.spawn(name,team,x*C.SX,wy(team,y)*C.SY,{wait:0});
function tick(b,seconds){for(let i=0;i<Math.round(seconds*60);i++)b.step(1/60);}
function advanceToTower(b,u,seconds=30){
 const points=[];let attack=null;
 for(let i=0;i<seconds*60&&!b.result&&u.hp>0;i++){
  const before={x:u.x/C.SX,y:u.y/C.SY,intent:b.targetDecision(u)};b.step(1/60);points.push({...before,toX:u.x/C.SX,toY:u.y/C.SY});
  const target=b.getEntity(u.targetId);if(target?.king!==undefined&&u.windup){attack=target;break;}
 }
 return{points,attack};
}
for(const team of [0,1])for(const lane of [0,1]){
 const center=lane?14.5:3.5,label=`team ${team} lane ${lane}`;
 test(`${label}: rear Baby Dragon advances in its fallen lane toward King without crossing to the other Princess`,()=>{
  const b=make(),princess=b.towers.find(t=>t.team!==team&&!t.king&&(t.x>9*C.SX?1:0)===lane),king=b.towers.find(t=>t.team!==team&&t.king);princess.hp=0;
  const u=spawn(b,'BabyDragon',team,center,25);assert.equal(b.chooseTarget(u)?.id,king.id);
  const run=advanceToTower(b,u);assert.equal(run.attack?.id,king.id);assert(run.points.filter(p=>p.intent.kind==='advance').length>60);
  for(const p of run.points){assert(lane?p.toX>=9:p.toX<=9,'Must not cross to the surviving opposite lane');if(p.intent.kind==='advance')assert((p.toY-p.y)*(team?1:-1)>=-1e-7,'Advance makes forward progress toward its selected Crown');}
 });
 test(`${label}: after a real defense finishes, Baby Dragon resumes its fallen lane`,()=>{
  const b=make(),princess=b.towers.find(t=>t.team!==team&&!t.king&&(t.x>9*C.SX?1:0)===lane);princess.hp=0;
  const u=spawn(b,'BabyDragon',team,center,25),enemy=b.spawn('Knight',1-team,center*C.SX,wy(team,21.5)*C.SY,{wait:0});
  assert.equal(b.chooseTarget(u)?.id,enemy.id);const run=advanceToTower(b,u);assert(enemy.hp<=0);assert(run.attack?.king);assert.equal(run.attack.team,1-team);
  assert(run.points.some(p=>p.intent.kind==='advance'));for(const p of run.points.filter(p=>p.intent.kind==='advance'))assert(lane?p.toX>=9:p.toX<=9,'Resume the correct Crown approach after the distraction dies');
 });
 test(`${label}: off-lane Baby Dragon advances diagonally to its living Princess`,()=>{
  const b=make(),x=lane?11:7,u=spawn(b,'BabyDragon',team,x,23),startY=u.y;
  tick(b,1);assert((u.y-startY)*(team?1:-1)>.5*C.SY,'Forward progress begins immediately');assert((u.x/C.SX-x)*(lane?1:-1)>0);
  assert(Math.abs(Math.hypot(u.x/C.SX-x,(u.y-startY)/C.SY)-1.5)<1e-6,'Source movement speed is preserved');
  const run=advanceToTower(b,u);assert(run.attack&&!run.attack.king);assert.equal(run.attack.x/C.SX,center);assert(Math.abs(u.x/C.SX-center)<Math.abs(x-center));
 });
}
for(const team of [0,1]){
 test(`team ${team}: nearby enemy pursuit keeps free flight across the river`,()=>{
  const b=make(),u=spawn(b,'BabyDragon',team,9,17.5),target=b.spawn('Knight',1-team,9*C.SX,wy(team,11.5)*C.SY,{wait:0});b.addBuff(target,'Freeze',30,team);
  assert.equal(b.targetDecision(u).kind,'chase');tick(b,1);assert.equal(u.targetId,target.id);assert(Math.abs(u.x/C.SX-9)<1e-6);assert(u.y/C.SY>15&&u.y/C.SY<17,'Pursuit can enter water away from either bridge');assert.equal(b.targetDecision(u).kind,'engage');
 });
 test(`team ${team}: source FlyDirectPaths Skeleton Barrel keeps diagonal default flight`,()=>{
  const b=make(),u=spawn(b,'SkeletonBalloon',team,7,23),before={x:u.x,y:u.y};assert.equal(u.def.source.FlyDirectPaths,true);tick(b,.5);
  assert(u.x<before.x);assert(team?u.y>before.y:u.y<before.y);assert.equal(b.targetDecision(u).kind,'advance');
 });
 test(`team ${team}: losing a chased enemy uses current-side lane, not permanent spawn ownership`,()=>{
  const b=make(),u=spawn(b,'BabyDragon',team,8.5,21),enemy=b.spawn('Knight',1-team,14.5*C.SX,wy(team,21)*C.SY,{wait:0});b.addBuff(enemy,'Freeze',30,team);
  tick(b,1.2);assert(u.x>9*C.SX);enemy.hp=0;b.step(1/60);const decision=b.targetDecision(u);assert.equal(decision.kind,'advance');assert.equal(decision.lane,1);assert.equal(decision.target.x/C.SX,14.5);
 });
}
test('default-target queries are pure and the chooseTarget compatibility wrapper agrees',()=>{
 const b=make(),u=spawn(b,'BabyDragon',0,7,25),before=JSON.stringify({u,effects:b.effects,events:b.events,nav:b.navigator});
 const decision=b.targetDecision(u);assert.equal(decision.kind,'advance');assert.equal(b.chooseTarget(u)?.id,decision.target.id);assert.equal(JSON.stringify({u,effects:b.effects,events:b.events,nav:b.navigator}),before);
});
test('near-center spawning and tiny centerline offsets cannot overshoot or jitter between lanes',()=>{
 const b=make(),u=spawn(b,'BabyDragon',0,9,23),startY=u.y;tick(b,1);assert(u.y<startY);assert(u.x<9*C.SX,'Exact-center tie remains deterministic');
 const v=spawn(b,'BabyDragon',0,3.500001,21);tick(b,1);assert(Math.abs(v.x/C.SX-3.500001)<1e-5);assert(v.y<21*C.SY);
});
test('a default advance already past the enemy Princess row pursues its Crown without stalling or backtracking',()=>{
 const b=make();for(const t of b.towers.filter(t=>t.team===1&&!t.king))t.hp=0;
 const u=spawn(b,'BabyDragon',0,3.5,6),intent=b.targetDecision(u,[]),before=C.edge(u,intent.target);assert.equal(intent.kind,'advance');
 for(let i=0;i<30;i++){b.time+=1/60;b.move(u,intent.target,1/60,1,intent);}assert(C.edge(u,intent.target)<before);assert(u.y<=6*C.SY,'Never return backward to an already passed anchor');
});
test('ground default advance still routes around buildings rather than stalling on its alignment guide',()=>{
 const b=make(),u=spawn(b,'Knight',0,7,23),wall=spawn(b,'Cannon',0,5.5,23);tick(b,6);
 assert(u.y<22*C.SY,'Obstacle avoidance must continue toward the enemy');assert(C.dist(u,wall)>=u.def.radiusTiles+wall.def.radiusTiles-.05);
});

for(const team of [0,1])for(const lane of [0,1])for(const name of ['Knight','HogRider'])test(`${name} team ${team} lane ${lane}: a ground detour cannot be undone by premature lane realignment`,()=>{
 const b=make(),mirror=x=>lane?18-x:x,u=spawn(b,name,team,mirror(7),23);
 spawn(b,'Cannon',team,mirror(5.5),23);spawn(b,'Cannon',team,mirror(3.5),20.5);
 let attack=null;
 // Keep the obstacles alive: their normal lifetime must not conceal a loop.
 for(let i=0;i<60*60&&!attack;i++){
  b.time+=1/60;b.tickEntity(u,1/60);const target=b.getEntity(u.targetId);if(u.windup&&target?.king!==undefined)attack=target;
 }
 assert(attack,'The troop must complete its detour and reach a Crown before 60 seconds');assert.equal(attack.team,1-team);
});
test('a tower-free sandbox idles and a locked local enemy still outranks default advance',()=>{
 const off={blue:{left:false,right:false,king:false},red:{left:false,right:false,king:false}},b=new Sandbox.Session({towers:off}).battle,u=spawn(b,'BabyDragon',0,7,23);
 tick(b,1);assert.equal(b.targetDecision(u).kind,'idle');assert.equal(u.x,7*C.SX);assert.equal(u.y,23*C.SY);
 const primary=spawn(b,'Knight',1,7,12),closer=spawn(b,'Knight',1,8,9);primary.y=21*C.SY;closer.y=23*C.SY;u.targetId=primary.id;b.startAttack(u,primary);
 const intent=b.targetDecision(u);assert.equal(intent.kind,'engage');assert.equal(intent.target.id,primary.id);
});
test('boat defense targets keep their custom geometry and receive no normal Crown lane guide',()=>{
 const b=make(),cards=Array.from({length:3},()=>['knight','archers','goblins','minions']);Boat.configure(b,{hp:[1000,1000,1000],cards});
 const u=spawn(b,'BabyDragon',0,7,23),intent=b.targetDecision(u),before={x:u.x,y:u.y};assert.equal(intent.target.boatPart,'defender');assert.equal(intent.lane,null);tick(b,.5);assert(u.x>before.x&&u.y<before.y);
});
