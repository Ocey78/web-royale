'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const C=require('../src/core.js'),P=require('../src/progression.js'),S=require('../src/arena-selection.js'),L=require('../src/arena-layout.js'),D=require('../src/deck-manager.js');

function rich(extra={}){return C.normalizeProfile({trophies:5200,highestTrophies:5200,unlockedCards:C.CARDS.map(c=>c.id),copies:Object.fromEntries(C.CARDS.map(c=>[c.id,100])),cardLevels:Object.fromEntries(C.CARDS.map(c=>[c.id,9])),...extra});}

test('v045 Trophy Road reports league progression past Serenity Peak',()=>{
 const p=rich({trophies:5200,highestTrophies:5200});
 const current=P.currentProgression(p);
 A.equal(current.name,'Challenger I');
 A.equal(current.trophies,5000);
});

test('v045 custom map families expose three 5v5, three 3v3 and three bridge geometries',()=>{
 A.equal(S.groups.TeamRumble.length,3);A.equal(S.groups.Team3v3.length,3);A.equal(S.groups.BridgeBattle.length,3);
 for(const id of [...S.groups.TeamRumble,...S.groups.Team3v3,...S.groups.BridgeBattle])A.equal(L.get(id).custom,true,id);
 const river=L.get('TeamRumbleRiverLine');
 A.equal(river.bridges.length,4);
 A.ok(river.bridges.every(b=>Math.abs((b.right-b.left)-2)<1e-9),'all four Rumble river bridges are exactly 2 tiles wide');
});

test('v045 custom map selection is deterministic and uses true geometry variants',()=>{
 for(const mode of ['TeamRumble','Team3v3','BridgeBattle']){
  const values=new Set();
  for(let seed=1;seed<80;seed++)values.add(S.choose({mode,queue:'challenge',seed}));
  A.deepEqual([...values].sort(),[...S.groups[mode]].sort(),mode);
 }
});

test('v045 custom modes have multiple named decks paged five at a time',()=>{
 let p=rich();
 for(let i=0;i<6;i++){const r=D.modeAdd(p,'Touchdown');A.ok(r.ok);p=r.profile;}
 let state=D.modeState(p,'Touchdown');A.equal(state.decks.length,7);A.equal(state.page,1);
 p=D.modeRename(p,'Touchdown',0,'Goal Rush').profile;
 A.equal(D.modeState(p,'Touchdown').names[0],'Goal Rush');
 const page=D.modePage(p,'Touchdown',1);A.equal(page.page,1);A.deepEqual(page.indices,[5,6]);
});

test('v045 touchdown modes use towerless purpose-built maps and team sizes',()=>{
 for(const [mode,count] of [['Touchdown',2],['Touchdown2v2',4],['Touchdown3v3',6]]){
  const b=new C.Battle({mode,queue:'touchdown',profile:rich(),ai:false,seed:11});
  A.equal(b.seatCount,count);A.equal(b.towers.length,0);A.equal(b.isTouchdown,true);
 }
 A.ok(L.get('Touchdown3v3').right-L.get('Touchdown3v3').left > L.get('Touchdown').right-L.get('Touchdown').left);
});

test('v045 touchdown scores when a troop crosses goal and ends at three',()=>{
 const b=new C.Battle({mode:'Touchdown',queue:'touchdown',profile:rich(),ai:false,seed:7});
 const def=C.entityDef('Knight',9);A.ok(def);
 for(let i=0;i<3;i++){const u=b.makeEntity('Knight',0,9*C.SX,(L.get('Touchdown').goalTop-.1)*C.SY,{level:9});b.units.push(u);b.checkTouchdowns();}
 A.equal(b.crowns[0],3);A.equal(b.result?.winner,0);
});

test('v045 FFA has four teams and only last King ends it before time',()=>{
 const b=new C.Battle({mode:'FreeForAll',queue:'ffa',profile:rich(),ai:false,seed:9});
 A.equal(b.seatCount,4);A.equal(b.teamCount,4);A.equal(b.towers.filter(t=>t.king).length,4);
 A.deepEqual(b.seats.map(s=>b.teamOf(s)),[0,1,2,3]);
 for(const team of [1,2]){const k=b.towers.find(t=>t.king&&t.team===team);k.hp=0;k.dead=true;}
 b.checkResult();A.equal(b.result,null);
 const k3=b.towers.find(t=>t.king&&t.team===3);k3.hp=0;k3.dead=true;b.checkResult();A.equal(b.result?.winner,0);
});

test('v045 FFA normal timer enters overtime instead of comparing only blue and red',()=>{
 const b=new C.Battle({mode:'FreeForAll',queue:'ffa',profile:rich(),ai:false,seed:10});
 const normal=b.timeline.SectionLength[0];b.time=normal+.01;b.checkResult();
 A.equal(b.result,null);A.equal(b.overtime,true);
});

test('v045 FFA losses remain losses and four-team receipts survive normalization',()=>{
 const p=rich({gold:0,wins:0,losses:0,draws:0});
 const b=new C.Battle({mode:'FreeForAll',queue:'ffa',profile:p,ai:false,seed:31});
 b.crowns=[0,0,0,0];b.result={winner:2,reason:'Last King standing'};b.time=90;
 const q=C.applyResult(p,b);A.equal(q.losses,1);A.equal(q.draws,0);A.equal(q.history[0].winner,2);A.equal(q.history[0].crowns.length,4);
 const round=C.normalizeProfile(JSON.parse(JSON.stringify(q)));A.equal(round.history[0].winner,2);A.equal(round.history[0].crowns.length,4);
});

test('v045 other-mode builders expose full catalog without unlocking ranked collection',()=>{
 const p=C.normalizeProfile({trophies:0,highestTrophies:0});
 A.ok(p.unlockedCards.length<C.CARDS.length);
 for(const mode of ['TeamVsTeam','Team3v3','TeamRumble','BridgeBattle','Touchdown','Touchdown2v2','Touchdown3v3','FreeForAll','DoubleElixir']){
  const state=D.modeState(p,mode);A.equal(state.eligible.length,C.CARDS.filter(c=>C.allowedInMode(c.id,mode)).length,mode);
 }
 const after=D.modeState(p,'TeamRumble');A.deepEqual(C.normalizeProfile(p).unlockedCards,p.unlockedCards);A.ok(after.eligible.length>p.unlockedCards.length);
});
