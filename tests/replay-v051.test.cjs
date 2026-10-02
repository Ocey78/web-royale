'use strict';
const test=require('node:test'),a=require('node:assert/strict'),C=require('../src/core.js'),R=require('../src/replay.js'),Old=require('../src/legacy-core-v046.js');
const oldRecord=require('./fixtures/replay-v046/3v3-rocket.json');
test('a genuine v0.50 replay retains the older 3v3 geometry and double-tower Rocket damage',()=>{
 const s=new R.Session(oldRecord);a.ok(s.battle instanceof Old.Battle);a.deepEqual(s.battle.towers.filter(t=>!t.king&&t.team===1).map(t=>t.x/C.SX),[3.5,9,14.5]);s.seek(oldRecord.duration);a.equal(s.error,null);a.deepEqual(R.digest(s.battle),oldRecord.expected);a.equal(s.battle.events.filter(e=>e.type==='damage'&&e.amount===369).length,2);
});
test('new replays use v0.51 and reproduce the outward Princess row',()=>{
 const b=new C.Battle({mode:'Team3v3',arenaId:'Team3v3Jungle',seed:5101,ai:false,queue:'challenge'});R.captureInitial(b);for(let i=0;i<180;i++)b.step(1/60);const record=R.pack(b);a.equal(record.engine,R.ENGINE);const s=new R.Session(record);a.ok(s.battle instanceof C.Battle);a.deepEqual(s.battle.towers.filter(t=>!t.king&&t.team===1).map(t=>t.x/C.SX),[1.5,9,16.5]);s.seek(record.duration);a.equal(s.error,null);a.deepEqual(R.digest(s.battle),record.expected);
});
for(const mode of ['SixCardDeck','UncappedElixir','Touchdown','Touchdown2v2','Touchdown3v3','TeamRumble','BridgeBattle'])test('v0.46 '+mode+' imports keep their historical simulator',()=>{
 const b=new Old.Battle({mode,seed:46051,ai:false,queue:'challenge'});R.captureInitial(b);const record={...R.pack(b),engine:'0.46'};const s=new R.Session(record);a.ok(s.battle instanceof Old.Battle);a.equal(s.battle.mode,mode);a.deepEqual(R.digest(s.battle),record.expected);
});

for(const [mode,arenaId,count]of [
 ['Team3v3','Team3v3Jungle',6],['Team3v3','Team3v3Volcano',6],
 ['BridgeBattle','BridgeBattleLava',2],['BridgeBattle','BridgeBattleGarden',2],
 ['TeamRumble','TeamRumbleArcReverse',10],['TeamRumble','TeamRumbleRiverLine',10]
])test('historical '+arenaId+' deployments and routes survive repeated replay seeks',()=>{
 const deck=['giant','knight','archers','musketeer','fireball','arrows','rocket','minions'];
 const b=new Old.Battle({mode,arenaId,seed:460513,ai:false,queue:'challenge',decks:Array.from({length:count},()=>deck)});
 R.captureInitial(b);
 for(let frame=0;frame<1200;frame++){
  if(frame===15||frame===500)for(const seat of b.seats){const x=b.arenaLayout.lanes[b.seatSlots[seat]],y=seat%2?12.5:19.5,result=b.deploy(seat,frame===15?0:1,x*C.SX,y*C.SY);a.equal(result.ok,true,arenaId+' seat '+seat+': '+result.reason);}
  b.step(1/60);
 }
 const record={...R.pack(b),engine:'0.46'},before=JSON.parse(JSON.stringify(record)),s=new R.Session(record);
 a.equal(record.commands.length,count*2);a.equal(s.battle.arenaLayout.id,arenaId);a.ok(s.battle instanceof Old.Battle);a.deepEqual(s.battle.arenaLayout,b.arenaLayout);
 for(const at of [record.duration,2,record.duration]){s.seek(at);a.equal(s.error,null);}
 a.deepEqual(R.digest(s.battle),record.expected);a.deepEqual(record,before);a.deepEqual(s.battle.seatSlots,b.seatSlots);
 if(mode==='Team3v3')a.deepEqual(s.battle.towers.filter(t=>!t.king&&t.team===1).map(t=>t.x/C.SX),[3.5,9,14.5]);
 a.ok(b.units.some(u=>u.entity==='Giant'&&Math.abs(u.y/C.SY-(u.team?12.5:19.5))>1),'record exercises troop movement');
});

test('v0.46 Boat replay uses its frozen adapter and preserves activated defender spawns through seeks',()=>{
 const liveBoat=require('../src/boat-battle'),deck=['rocket','giant','knight','archers','musketeer','arrows','fireball','mini-pekka'];
 const b=new Old.Battle({mode:'ClanWar_BoatBattle',deck,enemyDeck:deck,seed:460515,ai:false,queue:'challenge'});
 Old.BoatBattle.configure(b,{hp:[1000,1000,1000],cards:Array.from({length:3},()=>['knight','archers','goblins','musketeer'])});
 R.captureInitial(b);
 for(let frame=0;frame<1200;frame++){
  if(frame===15)a.equal(b.deploy(0,0,3.5*C.SX,6*C.SY).ok,true,'Rocket activates the left boat defense');
  b.step(1/60);
 }
 const record={...R.pack(b),engine:'0.46'},defenders=b.towers.filter(t=>t.boatPart==='defender');
 a.ok(defenders[0].active);a.ok(defenders[0].boatCycle>=2,'historical boat defense spawns several troops');a.equal(record.commands.length,1);
 const configure=liveBoat.configure;liveBoat.configure=()=>{throw Error('Live Boat adapter must not interpret historical playback');};
 try{
  const s=new R.Session(record);a.ok(s.battle instanceof Old.Battle);a.deepEqual(s.battle.boatConfiguration,record.initial.boat);
  for(const at of [record.duration,2,record.duration]){s.seek(at);a.equal(s.error,null);}
  a.deepEqual(R.digest(s.battle),record.expected);a.deepEqual(s.battle.boatHp(),b.boatHp());a.equal(s.battle.boatEnd,b.boatEnd);a.equal(s.battle.boatBonus,b.boatBonus);
  a.deepEqual(s.battle.towers.filter(t=>t.boatPart==='defender').map(t=>[t.active,t.boatCycle]),defenders.map(t=>[t.active,t.boatCycle]));
 }finally{liveBoat.configure=configure;}
});
