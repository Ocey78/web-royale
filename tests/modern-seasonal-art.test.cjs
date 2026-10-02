const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),native=JSON.parse(fs.readFileSync(path.join(root,'assets/native/data.json'))),skins=JSON.parse(fs.readFileSync(path.join(root,'assets/tower-skins/seasonal.json'))).skins;
test('seasonal skins retain complete original blue/red bases, tops, turrets, and King activation frames',()=>{
 assert.deepEqual(skins.map(s=>s.name),['Shark Tank','Sandcastle','Fortress']);
 for(const skin of skins){const scene=native.scenes[skin.scene];assert.equal(scene.source.packageVersion,'16.402.2');for(const name of Object.values(skin.exports).flat()){assert.notEqual(scene.exports[name],undefined,skin.id+' / '+name);}for(const name of skin.exports.king){const clip=scene.clips[scene.exports[name]];assert.equal(clip.frames.length,98);assert.ok(clip.childrenNames.includes('turret'));assert.ok(clip.childrenNames.includes('king_dummy'));assert.ok(clip.frames[0].length&&clip.frames[97].length);}for(const t of scene.textures)assert.ok(fs.existsSync(path.join(root,'assets/native',t.file)));}
});
