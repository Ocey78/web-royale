'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),FX=require('../src/fx'),source=require('../assets/game/fx-data.json');

function record(data){
 const renderer=new FX.Renderer(data,{scenes:{}}),sprites=[],shadows=[];
 renderer.sprite=(...args)=>{sprites.push({time:args[3],x:args[4],y:args[5],rotation:args[8]});return true;};
 const context={globalAlpha:1,save(){},restore(){},beginPath(){},ellipse(x,y){shadows.push({x,y});},fill(){}};
 return {renderer,context,sprites,shadows};
}

test('Knight Evolution protection stays on its authored body anchor despite a source shadow offset',()=>{
 const r=record(source);
 r.renderer.effect(r.context,'vfx_knight_evo_shield',100,200,.1,0,{phase:'all',seed:'knight-hit'});
 assert.equal(r.sprites.length,1);
 assert.equal(r.sprites[0].x,100);
 assert.equal(r.sprites[0].y,200,'ShadowYShift must not translate the visible violet protection shell');
 assert.equal(r.sprites[0].rotation,0,'a direction-frame clip must not also rotate around its foot anchor');
});

test('a raised particle shadow receives its source Y offset once without shifting the particle',()=>{
 const data={coordinateScale:.6,effects:{Fixture:[{Type:'ParticleEmitter',ParticleEmitterName:'Fixture',Layer:'Base'}]},emitters:{Fixture:[{ParticleCount:1,ParticleResource:'sc/effects.sc',ParticleExportName:'spark',ParticleMinLife:1000,ParticleMaxLife:1000,ParticleStartZ:10,Shadow:true,ShadowYShift:-68}]}};
 const r=record(data);
 r.renderer.effect(r.context,'Fixture',100,200,.1,0,{phase:'all',seed:'shadow-placement'});
 assert.equal(r.sprites.length,1);assert.equal(r.shadows.length,1);
 assert.equal(r.sprites[0].y,194);
 assert.equal(r.shadows[0].y,159.2);
});

test('direction-frame particle art samples its own clip duration without a second bitmap rotation',()=>{
 const data={effects:{Fixture:[{Type:'ParticleEmitter',ParticleEmitterName:'Fixture'}]},emitters:{Fixture:[{ParticleCount:1,ParticleResource:'sc/effects.sc',ParticleExportName:'directional-axe',ParticleMinLife:1000,ParticleMaxLife:1000,ParticleMinAngle:90,ParticleMaxAngle:90,RotateToDirection:true,FrameFromAngle:true}]}};
 const r=record(data);r.renderer.library.scenes.effects={duration:()=>.25};
 r.renderer.effect(r.context,'Fixture',100,200,.1,0,{phase:'all',seed:'direction-frame'});
 assert.equal(r.sprites.length,1);assert.equal(r.sprites[0].time,.0625);assert.equal(r.sprites[0].rotation,0);
});

test('source action effects are presented before unit filters without mutating battle records',()=>{
 const saved=globalThis.RoyaleModern3D,calls=[],effects=[{sourcePrefab:'sc3d/fx/fixture.prefab',born:1,ttl:2}];
 try{
  globalThis.RoyaleModern3D={setActionEffects:(events,time)=>calls.push({events,time})};
  const r=record({effects:{},emitters:{}});r.renderer.prepareUnitFilters({effects,time:1.5,visualTime:1.75});
  assert.equal(calls.length,1);assert.equal(calls[0].events,effects);assert.equal(calls[0].time,1.75);
  assert.deepEqual(effects,[{sourcePrefab:'sc3d/fx/fixture.prefab',born:1,ttl:2}]);
 }finally{globalThis.RoyaleModern3D=saved;}
});
