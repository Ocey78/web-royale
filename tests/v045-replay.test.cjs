'use strict';
const t=require('node:test'),a=require('node:assert/strict'),C=require('../src/core.js'),R=require('../src/replay.js'),Old44=require('../src/legacy-core-v044.js');

t('v045 current FFA replays preserve four-team state',()=>{
  a.equal(R.ENGINE,'0.45');
  const b=new C.Battle({mode:'FreeForAll',seed:4501,queue:'ffa',ai:false});
  R.captureInitial(b);
  for(let n=0;n<90;n++)b.step(1/60);
  const r=R.pack(b),s=new R.Session(r); s.seek(b.time);
  a.equal(s.error,null); a.equal(s.battle.teamCount,4); a.equal(s.battle.seatCount,4);
  a.deepEqual(R.digest(s.battle),R.digest(b));
});

t('v045 current 3v3 touchdown replay validates six seats',()=>{
  const b=new C.Battle({mode:'Touchdown3v3',seed:4502,queue:'touchdown',ai:false});
  R.captureInitial(b); for(let n=0;n<60;n++)b.step(1/60);
  const r=R.pack(b); a.doesNotThrow(()=>R.validate(r));
  const s=new R.Session(r); s.seek(b.time); a.equal(s.error,null); a.equal(s.battle.seatCount,6);
});

t('v045 historical 0.44 Rumble replays use the frozen v044 engine',()=>{
  const b=new Old44.Battle({mode:'TeamRumble',seed:4503,queue:'5v5',ai:false});
  R.captureInitial(b); for(let n=0;n<90;n++)b.step(1/60);
  const r={...R.pack(b),engine:'0.44'},s=new R.Session(r); s.seek(b.time);
  a.equal(s.error,null); a.deepEqual(R.digest(s.battle),R.digest(b));
  a.deepEqual(s.battle.timeline.SectionLength,[300,300]);
});

t('v045 historical 0.44 cannot claim support for expansion-only modes',()=>{
  const b=new C.Battle({mode:'Touchdown',seed:4504,queue:'touchdown',ai:false});
  R.captureInitial(b); const r={...R.pack(b),engine:'0.44'};
  a.throws(()=>R.validate(r),/Expansion mode requires current simulation/);
});
