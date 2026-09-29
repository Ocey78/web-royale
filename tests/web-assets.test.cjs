const test=require('node:test'),A=require('node:assert/strict'),N=require('../src/native'),I=require('../src/assets'),C=require('../src/core');
const data=require('../assets/native/data.json');
test('battle dependency planning does not require the full texture collection',()=>{
 A.equal(typeof N.sceneDependencies,'function');const scenes=N.sceneDependencies(data,C.DATA,[['balloon','lava-hound','clone','mirror','rage','knight','fireball','arrows']],'goblin');
 A.ok(scenes.includes('chr_balloon'));A.ok(scenes.includes(data.units.LavaPups.scene));A.ok(scenes.includes('building_tower'));A.ok(scenes.includes('level_goblin_arena'));A.ok(!scenes.includes('level_royal_arena'));A.ok(scenes.length<60);
});
test('local artwork URLs are allowed but other origins and executable URLs are not',()=>{
 A.equal(typeof I.checkImageSource,'function');A.doesNotThrow(()=>I.checkImageSource('assets/cards/knight.png','https://test.invalid/game/'));
 A.throws(()=>I.checkImageSource('https://evil.invalid/knight.png','https://test.invalid/game/'));A.throws(()=>I.checkImageSource('javascript:alert(1)','https://test.invalid/'));A.throws(()=>I.checkImageSource('data:text/html;base64,eA==','https://test.invalid/'));
});
test('streamed native loading has a battle preparation interface',()=>{A.equal(typeof N.Library.prototype.prepareBattle,'function');A.equal(typeof N.Library.prototype.ensureScenes,'function');});
test('unused scenes and their decoded textures can be released without evicting the current deck',()=>{
 const l=new N.Library({arenas:[{id:'a'}],scenes:{keep:{textures:[{file:'keep.png'}]},old:{textures:[{file:'old.png'}]}}},{});
 A.equal(typeof l.retainScenes,'function');let cleared=0;l.scenes={keep:{cache:new Map()},old:{cache:{clear(){cleared++}}}};l.textureImages.set('keep.png',{});l.textureImages.set('old.png',{});
 l.retainScenes(['keep']);A.ok(l.scenes.keep);A.equal(l.scenes.old,undefined);A.equal(cleared,1);A.equal(l.textureImages.has('old.png'),false);A.equal(l.textureImages.has('keep.png'),true);
});
test('arena rendering waits for all referenced scenes instead of caching an incomplete arena',()=>{
 const data={arenas:[{id:'a',scene:'main',objects:[{scene:'decoration',name:'tree'}]}],scenes:{}};
 const l=new N.Library(data,{});l.ready=true;l.scenes.main={};
 A.equal(l.drawArena({},0),false);A.equal(l.arenaCache.size,0);
});
