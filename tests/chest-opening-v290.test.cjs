'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Opening=require('../src/chest-opening'),C=require('../src/core'),E=require('../src/economy'),scene=require('../assets/chests/scene.json');
test('chest reveals summarize actual rewards without changing the supplied receipt',()=>{
 const reward={gold:50,gems:2,cards:[{id:'knight',count:3},{id:'knight',count:2},{id:'princess',count:1}]},before=JSON.stringify(reward);
 const s=new Opening.Sequence(reward,{scene,kind:'wood',owned:['knight']});
 assert.equal(JSON.stringify(reward),before);assert.equal(s.entries.length,4);
 assert.deepEqual(s.entries.filter(x=>x.kind==='card').map(x=>[x.id,x.count,x.isNew]),[['knight',5,false],['princess',1,true]]);
 assert.equal(s.stage,'arriving');s.advance(5);assert.equal(s.stage,'closed');s.tap();assert.equal(s.stage,'opening');s.advance(2);assert.equal(s.stage,'revealing');
 s.advance(3);assert.equal(s.stage,'shown');assert.equal(s.index,0);s.tap();assert.equal(s.index,1);
 s.skip();assert.equal(s.stage,'summary');s.tap();assert.equal(s.stage,'done');s.tap();assert.equal(s.stage,'done');
});
test('opening and legendary reveal timing comes from original frame labels',()=>{
 const s=new Opening.Sequence({cards:[{id:'princess',count:1}]},{scene,kind:'legendary'});
 assert.equal(s.openingExport,'chest_open_legendary');assert.equal(s.openingRange.start,0);assert.equal(s.openingRange.play,35);assert.equal(s.openingRange.end,52);
 s.advance(5);s.tap();s.advance(52/30);assert.equal(s.stage,'revealing');
 assert.equal(s.revealExport,'card_rotate_legendary_extended');s.advance(2);assert.equal(s.stage,'revealing');
 s.advance(4);assert.equal(s.stage,'shown');s.tap();assert.equal(s.stage,'summary');
});
test('closing or skipping an opening cannot grant or claim a chest twice',()=>{
 const p=C.normalizeProfile({chests:[{id:'receipt-chest',kind:'silver',winsProgress:1}]});
 const result=E.openChest(p,'receipt-chest');assert.equal(result.ok,true);
 const saved=JSON.stringify(result.profile),s=new Opening.Sequence(result.reward,{scene,kind:'silver'});
 for(let i=0;i<20;i++){s.tap();s.advance(.25);}s.skip();s.tap();
 assert.equal(JSON.stringify(result.profile),saved);assert.equal(E.openChest(result.profile,'receipt-chest').ok,false);
});
test('every supported chest uses an existing original opening export',()=>{
 for(const kind of require('../src/chest-rules').kinds){const s=new Opening.Sequence({gold:1},{scene,kind});assert.ok(scene.exports[s.openingExport],kind);}
});
