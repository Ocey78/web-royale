const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Cos=require('../src/cosmetics.js'),V=require('../src/battle-view.js');
test('polish retains all 206 source animations instead of reverting to nine icons',()=>{A.equal(Cos.emotes.length,206);A.ok(Cos.emotes.every(e=>e.scene&&e.animation&&e.iconExport));});
test('v250 camera preserves uniform asset scale and an independently sized battle frame',()=>{A.ok(Math.abs(V.camera.scale-1.1418504387711865)<1e-9);A.equal(V.layout.height,1172);});
test('each imported emote has original paired scene clips and an existing texture',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/emotes/catalog.json')));
 A.equal(manifest.entries.length,206);A.equal(Object.keys(manifest.scenes).length,97);
 for(const e of manifest.entries){const d=JSON.parse(fs.readFileSync(path.join(__dirname,'..',manifest.scenes[e.scene])));A.ok(d.clips[d.exports[e.animation]].frames.length>1);A.ok(d.exports[e.iconExport]!==undefined);for(const t of d.textures)A.ok(fs.existsSync(path.join(__dirname,'..',t.file)));}
});
