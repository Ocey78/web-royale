'use strict';
const t=require('node:test'),a=require('node:assert/strict'),C=require('../src/core.js'),R=require('../src/replay.js'),Old44=require('../src/legacy-core-v044.js'),Old45=require('../src/legacy-core-v045.js');
const clone=v=>JSON.parse(JSON.stringify(v));
function legacyRecord(b,id='legacy45'){
 const initial={seed:b.seed,mode:b.mode,arenaId:b.arenaId,seatSlots:b.seatSlots?[...b.seatSlots]:null,tiebreaker:b.tiebreakerEnabled,queueType:b.queueType,hand:clone(b.hand),queue:clone(b.queue),decks:clone(b.initialDecks),seatLevels:clone(b.seatLevels),kingLevels:[...b.kingLevels],randomState:b.random.state(),profile:{version:9,trophies:b.profile.trophies,highestTrophies:b.profile.highestTrophies,cardLevels:clone(b.seatLevels[0]),unlockedCards:Old45.CARDS.map(c=>c.id),selectedTowerSkin:b.profile.selectedTowerSkin,cheats:{...b.cheats}},opponent:null,boat:null};
 return {schema:1,engine:'0.45',id,createdAt:0,initial,duration:0,commands:[],result:null,status:'abandoned',expected:null};
}

t('v045 historical FFA replays preserve four-team state through frozen engine',()=>{
 a.equal(R.ENGINE,'0.53');
 const b=new Old45.Battle({mode:'FreeForAll',seed:4501,queue:'ffa',ai:false});
 const s=new R.Session(legacyRecord(b));
 a.equal(s.error,null);a.equal(s.battle.mode,'FreeForAll');a.equal(s.battle.teamCount,4);a.equal(s.battle.seatCount,4);
});

t('v045 historical 3v3 touchdown replay validates six seats',()=>{
 const b=new Old45.Battle({mode:'Touchdown3v3',seed:4502,queue:'touchdown',ai:false});
 const r=legacyRecord(b,'legacy-td');a.doesNotThrow(()=>R.validate(r));
 const s=new R.Session(r);a.equal(s.error,null);a.equal(s.battle.seatCount,6);a.equal(s.battle.mode,'Touchdown3v3');
});

t('v045 historical 0.44 Rumble replays use the frozen v044 engine',()=>{
 const b=new Old44.Battle({mode:'TeamRumble',seed:4503,queue:'5v5',ai:false});
 R.captureInitial(b);for(let n=0;n<90;n++)b.step(1/60);
 const r={...R.pack(b),engine:'0.44'},s=new R.Session(r);s.seek(b.time);
 a.equal(s.error,null);a.deepEqual(R.digest(s.battle),R.digest(b));a.deepEqual(s.battle.timeline.SectionLength,[300,300]);
});

t('v045 historical 0.44 cannot claim support for Touchdown',()=>{
 const b=new Old45.Battle({mode:'Touchdown',seed:4504,queue:'touchdown',ai:false});
 const r={...legacyRecord(b,'bad-old-touchdown'),engine:'0.44'};
 a.throws(()=>R.validate(r),/Touchdown mode requires compatible simulation/);
});
