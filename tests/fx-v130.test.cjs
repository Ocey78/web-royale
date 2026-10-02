'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const FX=require('../src/fx.js');

test('v130 particle sampling preserves directional data for trails',()=>{
  const p=FX.particleAt({ParticleMinLife:1000,ParticleMaxLife:1000,ParticleMinSpeed:100,ParticleMaxSpeed:100,ParticleMinAngle:0,ParticleMaxAngle:0,ParticleMinRadius:0,ParticleMaxRadius:0,ParticleStartXYAreaRadius:0,StartScale:100,EndScale:100},'x',0,.5);
  A.ok(p); A.ok(Number.isFinite(p.theta)); A.ok(p.travel>0);
});

test('v130 renderer consumes source particle shadows and trail sprites',()=>{
  const text=fs.readFileSync(path.join(__dirname,'../src/fx.js'),'utf8');
  A.match(text,/TrailSWF/); A.match(text,/TrailExportName/); A.match(text,/\.Shadow/); A.match(text,/ParticleRadiusAspect/);
});

test('v130 start-area scatter uses an independent direction from travel',()=>{
  const r={ParticleMinLife:1000,ParticleMaxLife:1000,ParticleMinSpeed:0,ParticleMaxSpeed:0,ParticleMinAngle:0,ParticleMaxAngle:0,ParticleStartXYAreaRadius:100,StartScale:100,EndScale:100};
  const pts=Array.from({length:8},(_,i)=>FX.particleAt(r,'scatter',i,.1));
  A.ok(pts.some(p=>Math.abs(p.y)>1),'area scatter must not collapse onto the emission angle');
});

test('v130 parent-relative particle angle rotates with the source',()=>{
  const r={ParticleMinLife:1000,ParticleMaxLife:1000,ParticleMinSpeed:100,ParticleMaxSpeed:100,ParticleMinAngle:0,ParticleMaxAngle:0,ParticleAngleRelativeToParent:true,StartScale:100,EndScale:100};
  const p=FX.particleAt(r,'relative',0,.5,{angle:Math.PI/2});
  A.ok(Math.abs(p.x)<1);
  A.ok(p.y>40);
});

test('v130 angle-selected resources choose a deterministic directional sprite',()=>{
  A.equal(FX.directionalVariant(8,0),0);
  A.equal(FX.directionalVariant(8,Math.PI/2),2);
  A.equal(FX.directionalVariant(8,Math.PI),4);
  A.equal(FX.directionalVariant(8,-Math.PI/2),6);
});

test('v130 particle radius uses source coordinates without a tenfold expansion',()=>{
  const p=FX.particleAt({ParticleMinLife:1000,ParticleMaxLife:1000,ParticleMinRadius:10,ParticleMaxRadius:10,ParticleMinAngle:0,ParticleMaxAngle:0,StartScale:100,EndScale:100},'radius',0,.1);
  A.ok(p); A.ok(p.x>=9.9&&p.x<=10.1,`source radius should stay near 10, got ${p.x}`);
});

test('v130 relative emitter angle rotates source motion with its parent',()=>{
  const row={ParticleMinLife:1000,ParticleMaxLife:1000,ParticleMinSpeed:100,ParticleMaxSpeed:100,ParticleMinAngle:0,ParticleMaxAngle:0,ParticleAngleRelativeToParent:true,StartScale:100,EndScale:100};
  const p=FX.particleAt(row,'angle',0,.5,Math.PI/2);
  A.ok(p); A.ok(Math.abs(p.x)<1,`rotated x ${p.x}`); A.ok(p.y>45,`rotated y ${p.y}`);
});


test('v130 melee hits use source DamageEffect instead of generic slash when available',()=>{
  const C=require('../src/core.js'),b=new C.Battle({ai:false}),a=b.spawn('Knight',0,9*C.SX,18*C.SY,{wait:0}),t=b.spawn('Knight',1,9*C.SX,17*C.SY,{wait:0});
  b.strike(a,t);
  A.ok(b.effects.some(e=>e.sourceEffect==='knight_hit'));
  A.equal(b.effects.some(e=>e.kind==='slash'),false);
});
