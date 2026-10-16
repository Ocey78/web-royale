'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Training=require('../src/training-modes');

test('Learning Center advertises Ultimate Clash by its mode name',()=>{
 assert.equal(Training.name('UltimateClash'),'Ultimate Clash');
 assert.ok(Training.modes.some(m=>m.id==='UltimateClash'));
});

test('headless Ultimate training uses exclusive tournament decks and supports its forms',()=>{
 const b=Training.create('UltimateClash',{seed:58111,ai:false});
 assert.equal(b.mode,'UltimateClash');assert.equal(b.maxElixir,20);
 for(const [seat,deck] of b.initialDecks.entries())for(const id of deck){assert.ok(id.startsWith('ultimate-'));assert.equal(b.seatLevels[seat][id],11);}
 assert.equal(b.headless,true);
 assert.ok(b.formContext.unlockedForms.includes('ultimate-frostbite-hero'));
});
