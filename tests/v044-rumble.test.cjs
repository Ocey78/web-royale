'use strict';
const test=require('node:test'),a=require('node:assert/strict');
const C=require('../src/core'),L=require('../src/arena-layout'),N=require('../src/navigation');
const battle=(mode='TeamRumble')=>new C.Battle({mode,queue:'challenge',seed:4481,ai:false,headless:true});
const kill=(b,t)=>{b.damage(t,1e9);b.deaths();b.checkResult();};
const king=(b,team,slot=0)=>b.towers.find(t=>t.king&&t.team===team&&t.crownSlot===slot);
const princess=(b,team,slot=0)=>b.towers.find(t=>!t.king&&t.team===team&&t.crownSlot===slot);

test('v044 Rumble has two spacious symmetric arches, each with five distinct owners',()=>{
 const b=battle(),l=b.arenaLayout;a.ok(l.right-l.left>=26);
 for(const isKing of [true,false]){const row=b.towers.filter(t=>t.king===isKing&&t.team===1).sort((a,b)=>a.x-b.x);a.equal(row.length,5);a.ok(row[0].x<2.8*C.SX&&row[4].x>15.2*C.SX,'wider than v043');
  a.ok(row[0].y>row[1].y&&row[1].y>row[2].y,'arch recedes toward central tower');
  for(let i=0;i<5;i++){a.ok(Math.abs(row[i].x+row[4-i].x-18*C.SX)<1e-6);a.equal(row[i].y,row[4-i].y);const mirror=b.towers.find(t=>t.king===isKing&&t.team===0&&t.crownSlot===row[i].crownSlot);a.equal(mirror.x,row[i].x);a.equal(mirror.y+row[i].y,32*C.SY);}
  for(let i=0;i<4;i++)a.ok(Math.hypot((row[i+1].x-row[i].x)/C.SX,(row[i+1].y-row[i].y)/C.SY)>row[i].def.radiusTiles+row[i+1].def.radiusTiles+2.05,'largest bodies fit between neighboring towers');
 }
 a.equal(new Set(b.towers.filter(t=>t.king).map(t=>t.owner)).size,10);
});
test('v044 Rumble multiplier boundaries match remaining regulation and overtime clock',()=>{
 const b=battle();a.deepEqual(b.timeline.SectionLength,[300,300]);
 for(const [t,m,left]of [[0,1,300],[119.99,1,181],[120,2,180],[239.99,2,61],[240,3,60],[299.99,3,1],[300,3,300],[419.99,3,181],[420,4,180],[539.99,4,61],[540,5,60],[599.9,5,1]]){b.time=t;a.equal(b.multiplier,m,'multiplier at '+t);a.equal(b.secondsLeft,left,'time at '+t);b.elixir.fill(0);b.step(.001);a.ok(Math.abs(b.elixir[0]-.001*m/2.8)<1e-8,'real income at '+t);}
});
test('v044 Princess losses neither score crowns nor decide Rumble regulation',()=>{
 const b=battle();for(let i=0;i<5;i++)kill(b,princess(b,1,i));a.equal(b.result,null);a.deepEqual(b.crowns,[0,0]);b.time=300;b.checkResult();a.equal(b.result,null);a.equal(b.overtime,true);
});
test('v044 only King advantage decides regulation even when Princess advantage is opposite',()=>{
 const b=battle();kill(b,king(b,1,0));for(let i=0;i<5;i++)kill(b,princess(b,0,i));a.equal(b.result,null);b.time=300;b.checkResult();a.equal(b.result.winner,0);a.deepEqual(b.crowns,[1,0]);
});
test('v044 tied Kings go to overtime despite uneven Princess losses and next King ends match',()=>{
 const b=battle();kill(b,king(b,0,0));kill(b,king(b,1,0));kill(b,princess(b,0,2));b.time=300;b.checkResult();a.equal(b.overtime,true);a.equal(b.result,null);kill(b,princess(b,1,3));a.equal(b.result,null);kill(b,king(b,1,1));a.equal(b.result.winner,0);
});
test('v044 all Kings lost can finish before regulation but Princess destruction in OT never wins',()=>{
 const b=battle();b.time=301;b.overtime=true;kill(b,princess(b,1,0));a.equal(b.result,null);
 const c=battle();for(let i=0;i<5;i++)kill(c,king(c,1,i));a.equal(c.result.winner,0);a.deepEqual(c.crowns,[5,0]);
});
test('v044 final tiebreak compares and drains Kings only',()=>{
 const b=battle();b.time=600;b.overtime=true;king(b,0,1).hp=300;king(b,1,3).hp=400;princess(b,1,0).hp=1;b.checkResult();a.ok(b.tiebreaker);a.equal(b.tiebreaker.winner,1);a.ok(b.tiebreaker.initialHp.every(t=>b.getEntity(t.id).king));b.tickTiebreaker(4);a.equal(b.result.winner,1);a.equal(princess(b,1,0).hp,1);
});
test('v044 a damaged King schedules all living allied Kings for the same activation time',()=>{
 const b=battle();b.damage(king(b,1,2),1);const allied=b.towers.filter(t=>t.king&&t.team===1);a.ok(allied.every(t=>Number.isFinite(t.activationAt)));a.equal(new Set(allied.map(t=>t.activationAt)).size,1);a.ok(b.towers.filter(t=>t.king&&t.team===0).every(t=>!t.active&&t.activationAt===Infinity));b.time=allied[0].activationAt; b.tickEntity(allied[2],.001);a.ok(allied.every(t=>t.active));a.equal(new Set(allied.map(t=>t.activatedAt)).size,1);
});
test('v044 losing a Princess activates the entire same-side King row, without resurrecting dead Kings',()=>{
 const b=battle();kill(b,king(b,0,0));kill(b,princess(b,0,4));const survivors=b.towers.filter(t=>t.king&&t.team===0&&t.hp>0);a.ok(survivors.every(t=>Number.isFinite(t.activationAt)));b.time=survivors[0].activationAt;b.tickEntity(survivors[0],.001);a.ok(survivors.every(t=>t.active));a.equal(king(b,0,0).hp,0);const owner=king(b,0,0).owner;b.elixir.fill(3);b.step(.01);a.equal(b.elixir[owner],3);a.ok(b.elixir[survivors[0].owner]>3);
});
test('v044 activation requests never delay an existing activation countdown',()=>{const b=battle();b.damage(king(b,1,0),1);const start=king(b,1,0).activationAt;b.time=1;b.damage(king(b,1,3),1);a.ok(b.towers.filter(t=>t.king&&t.team===1).every(t=>t.activationAt===start));});
test('v044 all-kings simultaneous destruction is a draw, not an order-dependent win',()=>{const b=battle();for(const k of b.towers.filter(t=>t.king))b.damage(k,1e9);b.deaths();b.checkResult();a.equal(b.result.winner,-1);a.deepEqual(b.crowns,[5,5]);});
test('v044 non-Rumble modes keep Princess scoring and independent 3v3 King activation',()=>{for(const mode of ['Default','Team3v3']){const b=battle(mode);kill(b,princess(b,1,0));a.equal(b.crowns[0],1);if(mode==='Team3v3')a.equal(b.towers.filter(t=>t.king&&t.team===1&&Number.isFinite(t.activationAt)).length,1);}});
test('v044 large-body rear starts and gap-to-midfield routes are all swept-clear',()=>{
 const b=battle(),l=b.arenaLayout,r=1,free={layout:l.id},obs=b.towers.map(t=>({id:t.id,x:t.x/C.SX,y:t.y/C.SY,radius:t.def.radiusTiles}));
 for(const t of b.towers){const start={x:t.x/C.SX,y:t.y/C.SY+(t.team?-1:1)*(t.def.radiusTiles+r+.1)},target={x:start.x,y:16,radius:0};a.ok(N.pointClear(start,r,obs,free),'legal rear '+t.id);const path=N.route(start,target,r,1.1,obs,free);a.ok(path.length);let p=start;for(const q of path){a.ok(N.segmentClear(p,q,r,obs,free),'swept path '+t.id);p=q;}a.ok(Math.hypot(p.x-target.x,p.y-target.y)<=1.11);}
 for(const x of [l.left+1.1,l.right-1.1])a.ok(N.segmentClear({x,y:l.top+1.1},{x,y:l.bottom-1.1},r,obs,free));
});
test('v044 Rumble AI can actually deploy toward both new outer arch lanes',()=>{const AI=require('../src/ai');for(const slot of [0,4]){const b=battle(),seat=0;b.time=10;b.elixir[seat]=10;b.hand[seat]=['hog-rider','giant','knight','archers'];princess(b,1,slot).hp=1;const bot=new AI.TacticalBot({seat,team:0,difficulty:'expert',seed:1});bot.choose(AI.observe(b,seat));a.ok(bot.lastCandidates.some(c=>c.reason.startsWith('pressure')&&(slot===0?c.x<0:c.x>18*C.SX)),'new outer lane '+slot);}});
