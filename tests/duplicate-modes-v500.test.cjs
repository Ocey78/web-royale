'use strict';
const test=require('node:test'),A=require('node:assert/strict'),C=require('../src/core.js'),D=require('../src/deck-manager.js'),P=require('../src/platform.js');
const modes=[['Default',8],['TeamVsTeam',8],['Team3v3',8],['TeamRumble',8],['BridgeBattle',8],['FourCardDeck',4],['SixCardDeck',6],['TwelveCardDeck',12],['TwentyElixir',8],['UncappedElixir',8],['OneShot',8],['DoubleElixir',8],['TripleElixir',8],['RampUp',8],['SuddenDeath',8],['7xElixir',8],['ClanWar_BoatBattle',8],['Touchdown',8],['Touchdown2v2',8],['Touchdown3v3',8]];
const repeated=size=>Array(size).fill('knight');

test('duplicate practice decks retain every slot in all mode save keys and deck libraries',()=>{
 const raw={cheats:{duplicates:true},modeDeckSets:{}};
 for(const [mode,size]of modes){const deck=repeated(size),key=C.MODE_DECKS[mode].key;raw[key]=deck;raw.modeDeckSets[mode]={active:1,decks:[deck,[...deck]],names:['First','Repeated']};}
 const p=C.normalizeProfile(raw);
 for(const [mode,size]of modes){const key=C.MODE_DECKS[mode].key,state=D.modeState(p,mode);A.deepEqual(p[key],repeated(size),mode);A.deepEqual(state.decks,[repeated(size),repeated(size)],mode);A.equal(state.valid,true,mode);}
 const storage=new Map(),repository=()=>new P.ProfileRepository({storage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},normalize:C.normalizeProfile});repository().save(p);
 const saved=repository().load();for(const [mode,size]of modes)A.deepEqual(saved[C.MODE_DECKS[mode].key],repeated(size),mode);
});

test('mode editors place a second and third copy when duplicates are enabled instead of swapping the first copy',()=>{
 for(const [mode]of modes){let p=C.normalizeProfile({cheats:{duplicates:true}});for(const slot of [1,2]){const r=D.setModeCard(p,mode,slot,'knight');A.equal(r.ok,true,mode);p=r.profile;}
  const state=D.modeState(p,mode);A.deepEqual(state.deck.slice(0,3),['knight','knight','knight'],mode);A.equal(state.valid,true,mode);
  const added=D.modeAdd(p,mode);A.equal(added.ok,true);A.deepEqual(D.modeState(added.profile,mode).deck.slice(0,3),['knight','knight','knight'],mode);
 }
});

test('normal mode editors still swap existing cards and keep all slots unique',()=>{
 for(const [mode,size]of modes){const p=C.normalizeProfile(),old=D.modeState(p,mode).deck,chosen=old[0],r=D.setModeCard(p,mode,1,chosen);A.equal(r.ok,true);const deck=D.modeState(r.profile,mode).deck;A.equal(deck[0],old[1],mode);A.equal(deck[1],chosen,mode);A.equal(new Set(deck).size,size,mode);}
});

test('switching duplicate practice off repairs all active and inactive mode decks while preserving mode restrictions',()=>{
 const raw={cheats:{duplicates:true},modeDeckSets:{}};for(const [mode,size]of modes)raw.modeDeckSets[mode]={active:0,decks:[repeated(size),repeated(size)],names:['One','Two']};
 const enabled=C.normalizeProfile(raw),disabled=C.normalizeProfile({...enabled,cheats:{duplicates:false}});
 for(const [mode,size]of modes){const state=D.modeState(disabled,mode);A.equal(state.valid,true,mode);for(const deck of state.decks){A.equal(new Set(deck).size,size,mode);A.ok(deck.every(id=>C.allowedInMode(id,mode)),mode);}}
 const p=C.normalizeProfile({cheats:{duplicates:true}});for(const id of ['fireball','miner','mortar','x-bow','goblin-drill'])A.equal(D.setModeCard(p,'OneShot',0,id).ok,false,id);
 const imported=C.normalizeProfile({cheats:{duplicates:true},oneShotDeck:Array(8).fill('fireball')});A.ok(imported.oneShotDeck.every(id=>C.allowedInMode(id,'OneShot')));
});

test('all mode battles keep the saved duplicate multiset in their opening hand and cycle and remain practice',()=>{
 for(const [mode,size]of modes){const key=C.MODE_DECKS[mode].key,deck=repeated(size),p=C.normalizeProfile({cheats:{duplicates:true},[key]:deck});
  const b=new C.Battle({mode,queue:'challenge',profile:p,ai:false,shuffleDeck:true,seed:500});A.equal(b.mode,mode);A.deepEqual(b.initialDecks[0],deck,mode);A.deepEqual(b.hand[0],['knight','knight','knight','knight'],mode);A.deepEqual(b.queue[0],repeated(size-4),mode);A.equal(b.practice,true,mode);
  for(const enemy of b.initialDecks.slice(1))A.equal(new Set(enemy).size,size,mode+' bot deck');
 }
});

test('duplicate four, six and twelve card cycles keep every copy after a deployment',()=>{
 for(const [mode,size]of [['FourCardDeck',4],['SixCardDeck',6],['TwelveCardDeck',12]]){const key=C.MODE_DECKS[mode].key,b=new C.Battle({mode,queue:'challenge',profile:{cheats:{duplicates:true},[key]:repeated(size)},ai:false});
  const r=b.deploy(0,0,100,440);A.equal(r.ok,true,mode);A.deepEqual([...b.hand[0],...b.queue[0]],repeated(size),mode);
 }
});
