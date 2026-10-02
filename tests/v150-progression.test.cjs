// Historical Classic regression fixture. Modern source assertions are in modern-*-v052 tests.
'use strict';
const test=require('node:test');
const A=require('node:assert/strict');
const C=require('./fixtures/classic-v0501/src/core.js');
const P=require('./fixtures/classic-v0501/src/profile.js');
const R=require('./fixtures/classic-v0501/src/progression.js');
const E=require('./fixtures/classic-v0501/src/economy.js');
const D=require('./fixtures/classic-v0501/src/training-decks.js');

const starter=new Set(C.DEFAULT_DECK);
const legalFor=(id,arena)=>starter.has(id)||R.cardArenaNumber(C.CARD_BY_ID[id],C.DATA.arenas)<=arena;

test('[Classic 0.50.1] v150 player card use requires both reached arena and permanent ownership',()=>{
  const bats='bats', gate=R.cardArenaNumber(C.CARD_BY_ID[bats],C.DATA.arenas);
  A.equal(gate,5);
  let p=P.normalizeProfile();
  for(const id of C.DEFAULT_DECK) A.equal(P.canUseCard(p,id),true,id+' starter usable');
  A.equal(P.canUseCard(p,bats),false,'future arena is unusable');
  p=P.normalizeProfile({...p,trophies:R.ARENAS[gate-1].trophies,highestTrophies:R.ARENAS[gate-1].trophies});
  A.equal(P.canUseCard(p,bats),false,'reaching arena alone does not unlock');
  p=P.normalizeProfile({...p,unlockedCards:[...p.unlockedCards,bats]});
  A.equal(P.canUseCard(p,bats),true,'first obtained copy makes reached card usable');
});

test('[Classic 0.50.1] v150 illegal saved deck card is removed until both requirements are met',()=>{
  const bats='bats';
  const deck=[...C.DEFAULT_DECK];deck[0]=bats;
  const p=P.normalizeProfile({version:5,trophies:0,highestTrophies:0,unlockedCards:[...C.DEFAULT_DECK,bats],decks:[deck]});
  A.equal(p.decks[0].includes(bats),false);
  A.equal(p.decks[0].length,8);
});

test('[Classic 0.50.1] v150 old chest uses highest reached arena pool when opened, not earned arena',()=>{
  const gate=5,trophies=R.ARENAS[gate-1].trophies;
  const seen=new Set();
  for(let i=0;i<160;i++){
    const p=P.normalizeProfile({version:5,trophies,highestTrophies:trophies,unlockedCards:[...C.DEFAULT_DECK],chests:[{id:'old-'+i,kind:'silver',arenaNumber:1,unlockAt:1}]});
    const opened=E.openChest(p,'old-'+i,2);
    A.equal(opened.ok,true);
    for(const card of opened.reward.cards){seen.add(card.id);A.equal(opened.profile.unlockedCards.includes(card.id),true,'rewarded card becomes owned');}
  }
  A.ok([...seen].some(id=>R.cardArenaNumber(C.CARD_BY_ID[id],C.DATA.arenas)>1),'old chest expanded to newly reached arenas');
  A.ok([...seen].every(id=>legalFor(id,gate)),'pool never exceeds highest reached arena');
});

test('[Classic 0.50.1] v150 chest pool expands when highest arena increases even before opening',()=>{
  const old=P.normalizeProfile({version:5,trophies:0,highestTrophies:0,unlockedCards:[...C.DEFAULT_DECK]});
  const high=P.normalizeProfile({...old,trophies:R.ARENAS[4].trophies,highestTrophies:R.ARENAS[4].trophies});
  const oldPool=new Set(E.cardPool(old).map(c=>c.id));
  const highPool=new Set(E.cardPool(high).map(c=>c.id));
  A.ok(highPool.size>oldPool.size);
  A.ok([...highPool].some(id=>R.cardArenaNumber(C.CARD_BY_ID[id],C.DATA.arenas)===5));
});

test('[Classic 0.50.1] v150 normal bot decks are arena legal without chest ownership simulation',()=>{
  for(const arena of [1,2,5,10,14]){
    const trophies=R.ARENAS[arena-1].trophies;
    const p=P.normalizeProfile({version:5,trophies,highestTrophies:trophies,unlockedCards:[...C.DEFAULT_DECK]});
    for(let seed=1;seed<=20;seed++){
      const b=new C.Battle({profile:p,seed,ai:false});
      A.ok(b.initialDecks[1].every(id=>legalFor(id,arena)),`arena ${arena}: ${b.initialDecks[1].join(',')}`);
    }
  }
});

test('[Classic 0.50.1] v150 self-play deck generator accepts an arena limit',()=>{
  for(const arena of [1,3,7,14]) for(let seed=1;seed<=30;seed++){
    const deck=D.randomDeck(seed,arena);
    A.equal(deck.length,8);
    A.equal(new Set(deck).size,8);
    A.ok(deck.every(id=>legalFor(id,arena)),`arena ${arena}: ${deck.join(',')}`);
  }
});

test('[Classic 0.50.1] v190 any eligible first-copy grant discovers a card, not only chests',()=>{
  const trophies=R.ARENAS[4].trophies;
  const p=P.normalizeProfile({version:6,trophies,highestTrophies:trophies,unlockedCards:[...C.DEFAULT_DECK]});
  A.equal(P.canUseCard(p,'bats'),false);
  E.grant(p,{gold:0,cards:[{id:'bats',count:5}]});
  A.equal(p.copies.bats,5);
  A.equal(p.unlockedCards.includes('bats'),true);
  A.equal(P.canUseCard(p,'bats'),true);
  const saved=P.normalizeProfile(JSON.parse(JSON.stringify(p)));
  A.equal(saved.unlockedCards.includes('bats'),true,'eligible copies persist as ownership after save/reload');
  A.equal(P.canUseCard(saved,'bats'),true);
});


test('[Classic 0.50.1] v150 exact Bats example: arena reach makes Bats chest-eligible, first chest copy unlocks use',()=>{
  const trophies=R.ARENAS[4].trophies;
  const before=P.normalizeProfile({version:6,trophies,highestTrophies:trophies,unlockedCards:[...C.DEFAULT_DECK],chests:[{id:'bats-0',kind:'silver',arenaNumber:1,unlockAt:1}]});
  A.equal(P.canUseCard(before,'bats'),false);
  A.ok(E.cardPool(before).some(c=>c.id==='bats'));
  const opened=E.openChest(before,'bats-0',2);
  A.equal(opened.ok,true);
  A.ok(opened.reward.cards.some(c=>c.id==='bats'&&c.count>=1));
  A.equal(P.canUseCard(opened.profile,'bats'),true);
});
