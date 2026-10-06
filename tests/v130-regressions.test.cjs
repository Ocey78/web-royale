'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const P=require('../src/profile.js'), C=require('../src/core.js');
const L=require('../src/learning.js'), T=require('../src/training-scheduler.js');
const fs=require('node:fs'),path=require('node:path');

test('v130 always-ten-elixir cheat normalizes and never spends player elixir',()=>{
  const profile=P.normalizeProfile({cheats:{elixir:true}});
  A.equal(profile.cheats.elixir,true);
  const b=new C.Battle({ai:false,profile,deck:['knight','archers','giant','mini-pekka','musketeer','bomber','fireball','arrows']});
  A.equal(b.elixir[0],10);
  const r=b.deploy(0,0,9*C.SX,24*C.SY);
  A.equal(r.ok,true);
  A.equal(b.elixir[0],10);
  for(let i=0;i<120;i++)b.step(1/60);
  A.equal(b.elixir[0],10);
});

test('v130 reward learning is always enabled for legal matches',()=>{
  const p=P.normalizeProfile({learningEnabled:false});
  A.equal(p.learningEnabled,true);
  const brain=new L.SharedBrain();
  const b=new C.Battle({ai:true,profile:p,brain,learning:false});
  A.equal(b.learningEnabled,true);
});

test('v130 2v2 king firing positions are spread wider than v120',()=>{
  const b=new C.Battle({ai:false,mode:'TeamVsTeam'});
  const king=b.towers.find(t=>t.team===0&&t.king);
  A.equal(king.duoKing,true);
  A.ok(king.cannonOffset>=1.5*C.SX,`offset ${king.cannonOffset/C.SX} tiles`);
});

test('v130 self-play scheduler supports loop mode in its public plan',()=>{
  const plan=T.plan(25,8,4,{loop:true});
  A.equal(plan.loop,true);
  A.equal(plan.count,25);
});

test('v130 training worker generates varied decks beyond fixed presets',()=>{
  const text=fs.readFileSync(path.join(__dirname,'../src/training-worker.js'),'utf8');
  A.match(text,/RoyaleTrainingModes\.create/);const M=require('../src/training-modes');A.notDeepEqual(M.create('Default',{seed:123}).initialDecks,M.create('Default',{seed:124}).initialDecks);
  A.doesNotMatch(text,/deck:decks\[ix%decks\.length\]/);
});

test('v130 cog menu only contains four requested actions',()=>{
  const text=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
  const m=text.match(/function menu\(\)\{panel\('menu','Menu',`([\s\S]*?)`\);\}/);
  A.ok(m,'menu function found');
  for(const action of ['settings','log','profile','learning-center']) A.match(m[1],new RegExp("'"+action+"'"));
  for(const action of ['road','road-inventory','team-battle','training']) A.doesNotMatch(m[1],new RegExp("'"+action+"'"));
});

test('v130 Learning Center exposes loop as a real toggle button',()=>{
  const text=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
  A.match(text,/data-action="training-loop-toggle"/);
  A.match(text,/id="trainingLoop"[^>]*aria-pressed/);
  A.doesNotMatch(text,/id="trainingLoop" type="checkbox"/);
});

// Training/live clock equivalence is exercised through the actual worker in
// simulation-v053.test.cjs; the historical 50ms source-text assertion is obsolete.
