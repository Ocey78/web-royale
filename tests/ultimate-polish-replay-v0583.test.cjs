'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core'),R=require('../src/replay');
const S=C.SX,T=C.SY;
function start(mode,seats,owner,id){
 const deck=[id,'ultimate-heal-spell','ultimate-harvest','ultimate-royale-recall','ultimate-mirror','ultimate-dark-pact','ultimate-builder','ultimate-frostbite'];
 const levels=Array.from({length:seats},()=>({[id]:16,'ultimate-mirror':9}));
 const b=new C.Battle({mode,ai:false,headless:true,seed:58300+seats,decks:Array.from({length:seats},()=>deck),seatLevels:levels,kingLevels:Array(seats).fill(16)});
 R.captureInitial(b);assert.equal(b.hand[owner][0],id);assert.equal(b.queue[owner][0],'ultimate-mirror');return b;
}
function ready(b,owner){for(let ticks=0;(b.elixir[owner]+1e-7<b.card(owner,0).cost||b.slotReady[owner][0]>b.time+1e-7)&&ticks<12000;ticks++){assert.equal(b.result,null,'battle must remain live until the next paid play');b.step(1/60);}assert.ok(b.elixir[owner]+1e-7>=b.card(owner,0).cost);}
function deploy(b,owner,x,y){ready(b,owner);const result=b.deploy(owner,0,x*S,y*T);assert.equal(result.ok,true,result.reason);}
function advance(b,seconds){for(let i=0;i<Math.round(seconds*60);i++)b.step(1/60);}
function replay(b,owner,id){
 const record=R.pack(b);assert.equal(record.commands.length,2);assert.equal(record.commands[0].card,id);assert.equal(record.commands[1].card,'ultimate-mirror');
 const session=new R.Session(record);session.seek(record.duration);assert.equal(session.error,null);assert.deepEqual(R.digest(session.battle),record.expected);
 assert.deepEqual(session.battle.lastCard[owner],{id,level:16,cost:id==='ultimate-royale-escort'?20:7});
 session.seek(Math.max(0,record.commands[1].time-.5));session.seek(record.duration);assert.equal(session.error,null);assert.deepEqual(R.digest(session.battle),record.expected);return session.battle;
}
for(const [mode,seats,owner]of [['UltimateClash',2,0],['UltimateClash2v2',4,2],['UltimateClash3v3',6,4]]){
 test(mode+' replays a twenty-elixir Mirror at level19 through its actual slot cycle',()=>{
  const id='ultimate-royale-escort',b=start(mode,seats,owner,id);deploy(b,owner,9,23);assert.equal(b.hand[owner][0],'ultimate-mirror');assert.equal(b.card(owner,0).cost,20);
  deploy(b,owner,9,22);assert.equal(b.metrics.spent[owner],40);assert.equal(b.card(owner,0).id,'ultimate-dark-pact');
  const event=b.recorder.commands[1];assert.equal(event.playedCard,'ultimate-mirror');assert.equal(event.card,id);assert.equal(event.cost,20);advance(b,3);
  const copied=b.units.filter(u=>u.card===id&&u.level===19);assert.equal(copied.length,6);assert.ok(copied.every(u=>u.owner===owner&&u.team===0));
  const again=replay(b,owner,id),restored=again.units.filter(u=>u.card===id&&u.level===19);assert.equal(restored.length,6);assert.ok(restored.every(u=>u.owner===owner&&u.team===0));assert.equal(again.metrics.spent[owner],40);
 });
 test(mode+' replays boosted delayed Mirror spirit pairs with their original seat owner',()=>{
  const id='ultimate-spirit-festival',b=start(mode,seats,owner,id);deploy(b,owner,9,23);deploy(b,owner,9,22);assert.equal(b.metrics.spent[owner],15);assert.equal(b.recorder.commands[1].cost,8);
  const queued=b.pending.filter(p=>p.ultimate==='festival-pair'&&p.level===19);assert.equal(queued.length,8);assert.ok(queued.every(p=>p.owner===owner&&p.team===0));
  advance(b,2.1);const copied=b.units.filter(u=>u.card===id&&u.level===19);assert.equal(copied.length,4);assert.ok(copied.every(u=>u.owner===owner&&u.team===0));
  const again=replay(b,owner,id),restored=again.units.filter(u=>u.card===id&&u.level===19),remaining=again.pending.filter(p=>p.ultimate==='festival-pair'&&p.level===19);
  assert.equal(restored.length,4);assert.ok(restored.every(u=>u.owner===owner&&u.team===0));assert.equal(remaining.length,6);assert.ok(remaining.every(p=>p.owner===owner&&p.team===0));
 });
}
