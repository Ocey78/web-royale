const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/core.js');
const Replay=require('../src/replay.js');
const Boat=require('../src/boat-battle.js');

const advance=(b,seconds,dt=.05)=>{for(let elapsed=0;elapsed+1e-8<seconds;elapsed+=dt)b.step(Math.min(dt,seconds-elapsed));};
function atTiebreak(options={}){
 const b=new C.Battle({ai:false,...options});
 b.towers.forEach(t=>{t.hp=1000;});
 b.towers.find(t=>t.team===1&&!t.king).hp=100;
 b.time=300;b.overtime=true;b.checkResult();
 return b;
}

test('decisive overtime expiry starts one visible phase before granting the result',()=>{
 const b=atTiebreak();
 assert.equal(b.result,null);
 assert.ok(b.tiebreaker);
 assert.equal(b.secondsLeft,0);
 assert.equal(b.recorder.closed,false);
 b.checkResult();b.checkResult();
 assert.equal(b.events.filter(e=>e.type==='tiebreaker').length,1);
 assert.deepEqual(b.crowns,[0,0]);
 advance(b,1);
 assert.equal(b.towers.find(t=>t.team===1&&!t.king).hp,100);
 assert.equal(b.result,null);
});

test('freezing the board removes queued ally previews and stops interpolation at current positions',()=>{
 const b=new C.Battle({ai:false,mode:'TeamVsTeam'}),u=b.spawn('Knight',0,9*C.SX,18*C.SY,{wait:0});
 u.previousX=u.x-10;u.previousY=u.y-20;
 b.bots[2].intent={at:301,action:{card:'knight',slot:0,x:80,y:420}};
 b.towers.find(t=>t.team===1&&!t.king).hp=100;
 b.time=300;b.overtime=true;b.checkResult();
 assert.equal(b.bots[2].intent,null);
 assert.equal(u.previousX,u.x);assert.equal(u.previousY,u.y);
});

test('drain subtracts equal absolute HP, freezes combat and rejects every seat deployment',()=>{
 const b=atTiebreak({mode:'TeamVsTeam'});
 const unit=b.spawn('Knight',0,9*C.SX,18*C.SY,{wait:0});
 b.schedule({type:'impact',name:'FireballSpell',team:0,x:3.5*C.SX,y:6.5*C.SY,level:9,due:300.5});
 const units=JSON.stringify(b.units),pending=JSON.stringify(b.pending),elixir=[...b.elixir],metrics=JSON.stringify(b.metrics),random=b.random.state();
 for(const seat of b.seats)assert.equal(b.deploy(seat,0,80,420).ok,false);
 b.ai=true;b.aiPlay(0);b.legacyAIPlay(1);
 advance(b,2.5);
 assert.equal(b.result,null);
 const lowest=b.towers.find(t=>t.team===1&&!t.king);
 assert.ok(Math.abs(lowest.hp-50)<1e-7);
 assert.ok(b.towers.filter(t=>t!==lowest).every(t=>Math.abs(t.hp-950)<1e-7));
 assert.equal(JSON.stringify(b.units),units);
 assert.equal(JSON.stringify(b.pending),pending);
 assert.deepEqual(b.elixir,elixir);
 assert.equal(JSON.stringify(b.metrics),metrics);
 assert.equal(b.random.state(),random);
 assert.ok(unit.hp>0);
});

test('lowest surviving raw HP determines the drain winner and awards one crown once',()=>{
 const b=new C.Battle({ai:false}),loser=b.towers.find(t=>t.team===1&&!t.king);
 b.towers.forEach(t=>{t.hp=1000;});loser.hp=100;
 // Blue has a lower percentage and lower combined HP but the higher minimum.
 for(const t of b.towers.filter(t=>t.team===0)){t.hp=150;t.maxHp=9000;}
 b.time=300;b.overtime=true;b.checkResult();
 advance(b,4);
 assert.deepEqual(b.result,{winner:0,reason:'Tiebreaker',time:304});
 assert.equal(loser.hp,0);assert.equal(loser.destroyed,true);
 assert.deepEqual(b.crowns,[1,0]);
 assert.deepEqual(b.metrics.towerDamage,[0,0]);
 assert.ok(b.effects.some(e=>e.kind==='crownAward'&&e.team===0));
 assert.equal(b.recorder.closed,true);
 const result=b.result,updates=b.brain.state.updates;
 advance(b,1);b.checkResult();
 assert.equal(b.result,result);assert.equal(b.brain.state.updates,updates);
 assert.equal(b.events.filter(e=>e.type==='result').length,1);
 assert.equal(b.events.filter(e=>e.type==='crown').length,1);
});

test('a lowest King tower awards three crowns and keeps the tiebreak result reason',()=>{
 const b=new C.Battle({ai:false});
 b.towers.find(t=>t.team===0&&t.king).hp=20;
 b.time=300;b.overtime=true;b.checkResult();advance(b,4);
 assert.equal(b.result.winner,1);assert.equal(b.result.reason,'Tiebreaker');
 assert.deepEqual(b.crowns,[0,3]);
});

test('already destroyed towers are excluded and near-equal surviving minima remain draws',()=>{
 const b=new C.Battle({ai:false});
 for(const team of [0,1])b.towers.find(t=>t.team===team&&!t.king).hp=0;
 b.deaths();
 for(const t of b.towers.filter(t=>t.hp>0))t.hp=500;
 b.towers.find(t=>t.team===0&&t.king).hp=100;
 b.towers.find(t=>t.team===1&&t.king).hp=100.4;
 b.time=300;b.overtime=true;b.checkResult();
 assert.equal(b.result.winner,-1);assert.equal(b.tiebreaker,null);
 assert.deepEqual(b.crowns,[1,1]);
});

test('pausing the drain freezes health and elapsed time; headless stepping has the same outcome',()=>{
 const b=atTiebreak(),headless=atTiebreak({headless:true,recording:'compact'});
 advance(b,2);b.paused=true;
 assert.equal(b.result,null);assert.ok(b.time>301);
 const hp=b.towers.map(t=>t.hp),time=b.time;
 advance(b,1);assert.deepEqual(b.towers.map(t=>t.hp),hp);assert.equal(b.time,time);
 b.paused=false;advance(b,2,1/60);advance(headless,4,.1);
 assert.deepEqual(b.result,headless.result);assert.deepEqual(b.crowns,headless.crowns);
 assert.deepEqual(b.towers.map(t=>t.hp),headless.towers.map(t=>t.hp));
 assert.equal(headless.effects.length,0);
});

test('troops still deploying at expiry cannot appear or increase terminal board rewards during drain',()=>{
 const b=new C.Battle({ai:false});b.time=300;b.overtime=true;
 const delayed=b.spawn('Giant',0,9*C.SX,18*C.SY,{wait:2,appearsIn:2});
 b.towers.find(t=>t.team===1&&!t.king).hp=100;b.checkResult();
 assert.equal(b.isPresent(delayed),false);
 const board=b.rewardFrame(0).boardFor;
 advance(b,4);
 assert.equal(b.isPresent(delayed),false);
 assert.equal(b.rewardFrame(0).boardFor,board);
 assert.equal(b.recorder.finish().snapshots.at(-1).units.some(u=>u[0]===delayed.id),false);
});

test('boat battles preserve their own timeout without a crown-tower tiebreak phase',()=>{
 const b=new C.Battle({ai:false});
 Boat.configure(b,{hp:[1000,1000,1000],cards:Array.from({length:3},()=>['knight','archers','giant','musketeer'])});
 b.time=120;b.checkResult();
 assert.equal(b.result.reason,'Boat attack timed out');assert.equal(b.tiebreaker,null);
});

test('new replay records reproduce the drain while older records preserve their immediate result',()=>{
 for(const legacy of [false,true]){
  const b=new C.Battle({ai:false,seed:89,deck:['fireball','knight','archers','giant','musketeer','arrows','minions','cannon'],...(legacy?{tiebreaker:false}:{})});
  Replay.captureInitial(b);
  const target=b.towers.find(t=>t.team===1&&!t.king);
  assert.equal(b.deploy(0,0,target.x,target.y).ok,true);
  advance(b,305,1/60);
  assert.ok(b.result);
  const packed=Replay.pack(b);
  assert.equal(packed.engine,'0.46');
  if(legacy){packed.engine='0.26';delete packed.initial.tiebreaker;}
  const session=new Replay.Session(packed);session.seek(packed.duration);
  assert.equal(session.error,null);
  assert.deepEqual(Replay.digest(session.battle),packed.expected);
  assert.equal(!!session.battle.tiebreaker,!legacy);
  assert.equal(session.battle.learningEnabled,false);
 }
});

test('replay validation rejects unknown engines and malformed tiebreak rules',()=>{
 const b=new C.Battle({ai:false});Replay.captureInitial(b);const packed=Replay.pack(b);
 assert.throws(()=>Replay.validate({...packed,engine:'0.99'}),/different simulation version/);
 packed.initial.tiebreaker='true';
 assert.throws(()=>Replay.validate(packed),/Invalid replay/);
});
