'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const N=require('../src/native.js');

test('v180 bundles the original ui_battle_end scene for the match result board',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/native/data.json'),'utf8'));
 A.ok(data.scenes.ui_battle_end,'ui_battle_end source scene is bundled');
 const exports=data.scenes.ui_battle_end.exports||{};
 A.ok(exports.pvp_battle_end_new!==undefined,'PvP battle end export is available');
});

test('v180 result timeline matches recorded Match Over -> board -> crowns -> winner cadence',()=>{
 const s=N.battleEndState(0,3,0,1);A.equal(s.phase,'match-over');
 const board=N.battleEndState(1.15,3,0,1);A.equal(board.phase,'board');A.ok(board.boardProgress>0);
 const mid=N.battleEndState(2.4,3,0,1);A.equal(mid.enemyCrownsVisible,2);A.equal(mid.playerCrownsVisible,0);
 const final=N.battleEndState(4.05,3,0,1);A.equal(final.enemyCrownsVisible,3);A.equal(final.winnerVisible,true);A.equal(final.okVisible,true);
});

test('v180 original crown-award sound cues are packaged',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/audio/manifest.json'),'utf8'));
 for(const key of ['crown1','crown2','crown3','crownAppear'])A.ok(manifest[key]?.file,key+' cue');
});


test('v180 native library exposes battle-end renderer and battle dependencies include the source scene',()=>{
 A.equal(typeof N.Library.prototype.drawBattleEnd,'function');
 const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/native/data.json'),'utf8'));
 const game=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/game/data.json'),'utf8'));
 const decks=[['knight','archers','giant','mini-pekka','musketeer','bomber','fireball','arrows']];
 A.ok(N.sceneDependencies(data,game,decks,'goblin').includes('ui_battle_end'));
});
