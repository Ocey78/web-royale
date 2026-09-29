'use strict';
const test=require('node:test'),A=require('node:assert/strict'),K=require('../src/catalog.js');
const D=require('../src/training-decks.js');

test('v130 self-play decks are varied and tactically complete',()=>{
 const signatures=new Set();
 for(let seed=1;seed<=120;seed++){
  const deck=D.build(seed);A.equal(deck.length,8);A.equal(new Set(deck).size,8);signatures.add(deck.join(','));
  const cards=deck.map(id=>K.CARD_BY_ID[id]);
  A.ok(cards.some(c=>D.WIN_CONDITIONS.has(c.id)),`seed ${seed} needs win condition`);
  A.ok(cards.some(c=>c.kind==='Spell'),`seed ${seed} needs spell`);
  A.ok(cards.some(c=>c.entity&&K.entityDef(c.entity,9).targetsAir),`seed ${seed} needs anti-air`);
  const avg=cards.reduce((n,c)=>n+c.cost,0)/8;A.ok(avg>=2.1&&avg<=5.2,`seed ${seed} avg ${avg}`);
 }
 A.ok(signatures.size>110,`only ${signatures.size} unique decks`);
});
