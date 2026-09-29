'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Current=require('../src/core'),Legacy=require('../src/legacy-core-v027'),Replay=require('../src/replay');
const deck=['giant-skeleton','sparky','knight','archers','giant','musketeer','fireball','arrows'];
for(const version of ['0.26','0.27'])test(`${version} records retain the historical simulation and reproduce bridge movement`,()=>{
 const b=new Legacy.Battle({ai:false,seed:983,deck,tiebreaker:version==='0.27'});
 Replay.captureInitial(b);assert.equal(b.deploy(0,0,123,430).ok,true);
 for(let n=0;n<1200;n++)b.step(1/60);
 const record=Replay.pack(b);record.engine=version;if(version==='0.26')delete record.initial.tiebreaker;
 const session=new Replay.Session(record);assert.ok(session.battle instanceof Legacy.Battle);assert.equal(session.battle instanceof Current.Battle,false);
 session.seek(record.duration);assert.equal(session.error,null);assert.deepEqual(Replay.digest(session.battle),record.expected);
 session.seek(5);session.seek(record.duration);assert.deepEqual(Replay.digest(session.battle),record.expected);
});
test('new matches record0.41 and use the current simulation',()=>{
 const b=new Current.Battle({ai:false,seed:122,deck});Replay.captureInitial(b);
 assert.equal(b.deploy(0,0,123,430).ok,true);for(let n=0;n<1200;n++)b.step(1/60);
 const record=Replay.pack(b);assert.equal(record.engine,'0.44');
 const session=new Replay.Session(record);assert.ok(session.battle instanceof Current.Battle);
 session.seek(record.duration);assert.equal(session.error,null);assert.deepEqual(Replay.digest(session.battle),record.expected);
});
