'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const FX=require('../src/fx'),N=require('../src/native'),C=require('../src/core');
const fx=require('../assets/game/fx-data.json');
test('modern spells resolve visible source components for both teams',()=>{
 for(const name of ['vines_spell_radius','PaoloFirstEffectEver','PaoloFirstEffectEverStrong','spell_goblin_curse'])for(const team of [0,1]){
  const rows=FX.effectComponents(fx,name,team);
  assert.ok(rows.some(r=>r.Type==='SWF'&&r.ExportName||r.Type==='ParticleEmitter'&&fx.emitters[r.ParticleEmitterName]?.length),`${name} team ${team} has no source visuals`);
 }
});
test('modern spell preparation includes the source scene closure before the first cast',()=>{
 const native=JSON.parse(fs.readFileSync(require.resolve('../assets/native/data.json')));
 const scenes=N.sceneDependencies(native,C.DATA,[['vines','void','goblin-curse']],'royal');
 assert.ok(scenes.some(n=>n.includes('spell_vine')),'Vines scene is never prepared');
 for(const name of ['vines_spell_radius','PaoloFirstEffectEver','spell_goblin_curse'])for(const team of [0,1])for(const r of FX.effectComponents(fx,name,team)){
  const sprites=r.Type==='SWF'?[[r.FileName,r.ExportName]]:r.Type==='ParticleEmitter'?(fx.emitters[r.ParticleEmitterName]||[]).map(e=>[e.ParticleResource,e.ParticleExportName]):[];
  for(const [file,exp]of sprites){if(!file||!exp)continue;const key=file.split('/').pop().replace(/\.sc$/,'');assert.ok(scenes.includes(key),`${key} not preloaded`);assert.ok(native.scenes[key]?.exports[exp]!==undefined,`${key}#${exp} missing`);}
 }
});
