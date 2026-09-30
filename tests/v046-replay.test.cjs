'use strict';
const test=require('node:test'),a=require('node:assert/strict'),C=require('../src/core.js'),R=require('../src/replay.js'),L45=require('../src/legacy-core-v045.js');

test('v046 records use simulation tag 0.46 and preserve six-card cycles',()=>{
 const deck=['knight','archers','giant','mini-pekka','musketeer','bomber'];
 const b=new C.Battle({mode:'SixCardDeck',deck,enemyDeck:deck,ai:false,seed:4601});
 R.captureInitial(b);const record=R.pack(b);
 a.equal(record.engine,'0.46');
 a.equal(record.initial.decks[0].length,6);
 const s=new R.Session(record);s.seek(0);a.equal(s.error,null);a.equal(s.battle.initialDecks[0].length,6);
});

test('v046 loads v045 FFA replays through the frozen legacy engine after FFA removal',()=>{
 const b=new L45.Battle({mode:'FreeForAll',seed:45011,queue:'ffa',ai:false});
 // Build a v045 record directly from the legacy state shape.
 b.replayInitial={seed:b.seed,mode:b.mode,arenaId:b.arenaId,seatSlots:b.seatSlots?[...b.seatSlots]:null,tiebreaker:b.tiebreakerEnabled,queueType:b.queueType,hand:JSON.parse(JSON.stringify(b.hand)),queue:JSON.parse(JSON.stringify(b.queue)),decks:JSON.parse(JSON.stringify(b.initialDecks)),seatLevels:JSON.parse(JSON.stringify(b.seatLevels)),kingLevels:[...b.kingLevels],randomState:b.random.state(),profile:{version:9,trophies:b.profile.trophies,highestTrophies:b.profile.highestTrophies,cardLevels:JSON.parse(JSON.stringify(b.seatLevels[0])),unlockedCards:L45.CARDS.map(c=>c.id),selectedTowerSkin:b.profile.selectedTowerSkin,cheats:{...b.cheats}},opponent:null,boat:null};
 const record={schema:1,engine:'0.45',id:'legacy-ffa',createdAt:0,initial:b.replayInitial,duration:0,commands:[],result:null,status:'abandoned',expected:null};
 const s=new R.Session(record);
 a.equal(s.battle.mode,'FreeForAll');
 a.equal(s.battle.seatCount,4);
});
