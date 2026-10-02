'use strict';
const test=require('node:test'),a=require('node:assert/strict');
const K=require('../src/catalog.js'),C=require('../src/core.js'),Rules=require('../src/match-rules.js'),TM=require('../src/training-modes.js'),Sel=require('../src/arena-selection.js');
function levels(){return Object.fromEntries(C.CARDS.map(c=>[c.id,9]));}
function profile(){return C.normalizeProfile({trophies:5000,highestTrophies:5000,unlockedCards:C.CARDS.map(c=>c.id),cardLevels:levels(),copies:Object.fromEntries(C.CARDS.map(c=>[c.id,100]))});}

test('v046 six-card mode has a six-card saved cycle with four-card hand',()=>{
 a.equal(K.modeDeckSize('SixCardDeck'),6);a.equal(K.MODE_DECKS.SixCardDeck.size,6);
 const deck=C.CARDS.slice(0,6).map(c=>c.id),b=new C.Battle({mode:'SixCardDeck',queue:'challenge',profile:profile(),deck,enemyDeck:deck,ai:false,shuffleDeck:false});
 a.equal(b.deckSize,6);a.equal(b.hand[0].length,4);a.equal(b.queue[0].length,2);
});

test('v046 uncapped elixir stores beyond ten with normal generation timing',()=>{
 const p=profile(),b=new C.Battle({mode:'UncappedElixir',queue:'challenge',profile:p,deck:p.uncappedElixirDeck||p.challengeDeck,ai:false});
 a.equal(b.maxElixir,Infinity);const start=b.elixir[0];for(let i=0;i<60*180;i++)b.step(1/60);a.ok(b.elixir[0]>10,'uncapped mode should store more than ten');a.ok(b.elixir[0]>start);
});

test('v046 removes FFA from current mode registries while keeping touchdown modes',()=>{
 a.equal(K.MODE_DECKS.FreeForAll,undefined);a.ok(!Rules.CUSTOM_MODES.includes('FreeForAll'));a.ok(!TM.modes.some(m=>m.id==='FreeForAll'));a.ok(!Sel.groups.FreeForAll);
 for(const mode of ['Touchdown','Touchdown2v2','Touchdown3v3'])a.ok(TM.modes.some(m=>m.id===mode));
});

test('v046 training supports Six Card and Uncapped Elixir',()=>{
 for(const mode of ['SixCardDeck','UncappedElixir']){a.ok(TM.modes.some(m=>m.id===mode));const b=TM.create(mode,{seed:20260930,ai:false});a.equal(b.mode,mode);}
});

test('Touchdown camera prioritizes the complete playable field above the hand in both compositions',()=>{
 const V=require('../src/battle-view.js'),L=require('../src/arena-layout.js');
 try{for(const compact of [true,false])for(const id of ['Touchdown','Touchdown3v3']){
  V.configure({compact,arenaId:id});const l=L.get(id),c=V.camera,left=V.toScreen({x:l.left*480/18,y:l.top*20}),right=V.toScreen({x:l.right*480/18,y:l.bottom*20});
  a.ok(right.x-left.x>=V.viewport.width*.88,id+' uses most of the frame for playable turf');
  a.ok(left.x>=0&&right.x<=V.viewport.width,id+' keeps both field edges visible');
  a.ok(left.y>=0&&right.y<V.layout.handTop,id+' keeps all playable turf above the hand');
  for(const y of [l.goalTop*20,l.goalBottom*20]){const p={x:240,y},screen=V.toScreen(p);a.ok(V.onBoard(screen));const restored=V.toWorld(screen);a.ok(Math.hypot(restored.x-p.x,restored.y-p.y)<1e-8,id+' pointer and score geometry remain aligned');}
 }}finally{V.configure({compact:false});}
});
