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

test('v046 Touchdown camera exposes the official-style stadium sidelines around the field',()=>{
 const V=require('../src/battle-view.js'),L=require('../src/arena-layout.js');
 for(const id of ['Touchdown','Touchdown3v3']){
  V.configure({compact:true,arenaId:id});const l=L.get(id),c=V.camera;
  const left=c.x+l.left*480/18*c.scale,right=c.x+l.right*480/18*c.scale;
  a.ok(left>=70,id+' left stadium margin');a.ok(right<=470,id+' right stadium margin');
 }
});
