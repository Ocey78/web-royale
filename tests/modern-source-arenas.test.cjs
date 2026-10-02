const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),native=JSON.parse(fs.readFileSync(path.join(root,'assets/native/data.json'))),game=JSON.parse(fs.readFileSync(path.join(root,'assets/game/data.json')));
test('every modern Trophy Road arena resolves its original complete field export and decoration layers',()=>{
 assert.equal(game.modernProgression.arenas.length,32);
 for(const expected of game.modernProgression.arenas){const a=native.arenas.find(a=>a.id===expected.id);assert.ok(a,expected.id+' has its own original arena');assert.match(a.sourceLocation,/^locations\//);assert.ok(native.scenes[a.scene].exports[a.export]!==undefined);for(const o of a.objects){assert.ok(Number.isFinite(o.x)&&Number.isFinite(o.y));assert.ok(native.scenes[o.scene].exports[o.name]!==undefined,a.id+' / '+o.name);assert.ok(o.layer&&o.visibility);}}
 assert.ok(native.arenas.some(a=>a.id==='training'));
});
test('Knight source atlas fallback uses the same actual nose-facing convention as live meshes',()=>{assert.ok(Math.abs(native.units.KnightHero.headingOffset-Math.PI)<1e-10);});
