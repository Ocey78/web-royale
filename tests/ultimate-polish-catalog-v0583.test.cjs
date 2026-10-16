'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),K=require('../src/catalog'),U=require('../src/ultimate-clash'),D=require('../src/deck-manager');
test('Mirror and eighteen-elixir Bandit Squad join every Ultimate builder without entering ordinary pools',()=>{
 assert.equal(U.CARDS.length,33);
 for(const mode of U.MODES)for(const id of ['ultimate-mirror','ultimate-bandit-squad']){assert.ok(D.modeState({},mode).eligible.includes(id));assert.equal(D.setModeCard({},mode,7,id).ok,true);assert.equal(K.allowedInMode(id,'Default'),false);}
 assert.equal(K.CARD_BY_ID['ultimate-bandit-squad'].cost,18);assert.deepEqual(K.CARD_BY_ID['ultimate-bandit-squad'].source.SummonCharactersList,['Assassin','Assassin','BossBandit','Assassin','Assassin']);assert.equal(K.CARD_BY_ID['ultimate-mirror'].source.Mirror,true);
 assert.equal(K.CARDS.length,123);
});
test('Kitchen Chef uses original Royal Chef appearance while retaining its melee gameplay',()=>{
 const chef=K.DATA.entities.UltimateChef,native=K.DATA.entities.Chef;
 for(const key of ['FileName','BlueExportName','RedExportName','Scale'])assert.equal(chef[key],native[key]);assert.equal(chef.NativeActor,'Chef');assert.equal(chef.Damage,65);assert.equal(chef.Hitpoints,380);assert.equal(chef.Projectile||'', '');assert.equal(chef.Range,1200);
});
test('Builder and Mirror descriptions expose the actual changed rules',()=>{
 assert.match(K.CARD_BY_ID['ultimate-builder'].description,/three Builders/i);assert.match(K.CARD_BY_ID['ultimate-builder'].description,/1\.5%/);assert.match(K.CARD_BY_ID['ultimate-builder'].description,/3%/);
 assert.match(K.CARD_BY_ID['ultimate-mirror']?.description||'',/3 levels/);assert.match(K.CARD_BY_ID['ultimate-mirror']?.description||'',/20 elixir/);
});
