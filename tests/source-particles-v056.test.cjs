'use strict';
const test=require('node:test'),a=require('node:assert/strict'),P=require('../src/source-particles');
const fixtures=require('./fixtures/source-particles-v056.json');
const fixture=ending=>structuredClone(Object.entries(fixtures).find(([path])=>path.endsWith(ending))[1].record);
const close=(got,want,epsilon=1e-6)=>a.ok(Math.abs(got-want)<epsilon,`${got} should equal ${want}`);

test('source packed scalar keys retain the authored endpoints and intermediate peak',()=>{
 const leaf=fixture('ps_babydragon_def_buff_leaf'),spark=fixture('ps_berserker_hero_ingame_transform_sparks');
 close(P.sourceCurve(leaf.render.scale,0),.05);close(P.sourceCurve(leaf.render.scale,.30099744),.2);close(P.sourceCurve(leaf.render.scale,1),.06);
 close(P.sourceCurve(spark.render.alpha,0),1);close(P.sourceCurve(spark.render.alpha,1),0);
 // Flat handles on both ends give the exact midpoint of this source segment.
 close(P.sourceCurve(leaf.render.scale,(.30099744+1)/2),.13);
 a.equal(P.sourceCurve({_b0:[0,1,2]},.5),null,'malformed packed records are not invented');
});

test('packed source color stops are sampled as RGB rather than scalar intervals',()=>{
 const curve=fixture('ps_dartgoblin_def_atk_debuff_skeleton').render.color;
 a.deepEqual(P.sourceCurve(curve,0),[1,.9462429,.8586956]);
 a.deepEqual(P.sourceCurve(curve,.803918),[.20888467,.3695652,0]);
 const c=P.sourceCurve(curve,(.08595124+.24055766)/2);close(c[0],1);close(c[1],.90902645);close(c[2],.76086955);
});

test('Berserker source sparks survive their packed alpha and distinct timed bursts',()=>{
 const record=fixture('ps_berserker_hero_ingame_transform_sparks');
 a.equal(P.sourceParticleSamples(record,.04,'berserker',24).length,3);
 const samples=P.sourceParticleSamples(record,.1,'berserker',24);a.equal(samples.length,5);
 a.ok(samples.every(p=>p.alpha>0&&p.alpha<=1&&p.scale>0&&p.color.length===3));
 a.deepEqual(samples.map(p=>Number(p.age.toFixed(3))),[.1,.1,.1,.025,.025]);
});

test('Dark Prince source cone smoke has bounded finite samples and axis deceleration',()=>{
 const record=fixture('ps_darkprince_hero_ingame_smoke');
 const samples=P.sourceParticleSamples(record,.4,'dark-prince',24);a.ok(samples.length>0,'cone/location/deceleration must not discard the emitter');
 a.ok(samples.every(p=>[p.x,p.y,p.z,p.rotation,p.scale,p.alpha,...p.color].every(Number.isFinite)));
 const cone=structuredClone(record);cone.emitter.components=[{__class:'SpawnBurst',bursts:[{c:1}]},...cone.emitter.components.filter(c=>c.__class==='SpawnCone')];cone.emitter.lifetimeJitter=0;
 Object.assign(cone.emitter.components[1],{directionJitterAngle:0,velocityJitter:0});
 const p=P.sourceParticleSamples(cone,.25,'direction',24)[0];close(p.x,0);close(p.y,.4999000299900035);close(p.z,.00999800059980007);
 cone.emitter.components.push({__class:'Deceleration',deceleration:[0,4,0]});const slowed=P.sourceParticleSamples(cone,.25,'direction',24)[0];
 close(slowed.y,.3749000299900035);close(slowed.z,p.z);
});

test('source delays and zero burst counts do not invent an early particle',()=>{
 const record=fixture('ps_musketeer_hero_muzzle_impact');record.emitter.emitterDelay=.2;record.emitter.components[0].bursts=[{c:0},{t:.1,c:1}];
 a.equal(P.sourceParticleSamples(record,.15,'delay',24).length,0);a.equal(P.sourceParticleSamples(record,.29,'delay',24).length,0);
 const samples=P.sourceParticleSamples(record,.32,'delay',24);a.equal(samples.length,1);close(samples[0].age,.02);
 a.equal(P.sourceParticleSamples(record,.6,'delay',24).length,0);
});

test('source render stretch and animation clock are exposed without replacing scalar size',()=>{
 const record=fixture('ps_musketeer_hero_muzzle_impact');record.render.stretch=[.75,1.5];record.render.orientToDirection=false;record.render.loopMovieClip=true;
 const sample=P.sourceParticleSamples(record,.05,'render',24)[0];close(sample.scale,.0225);close(sample.scaleX,.016875);close(sample.scaleY,.03375);close(sample.rotation,-Math.PI/2);a.equal(sample.loopMovieClip,true);
});

test('direction-oriented source sprites expose their velocity for the team and bone transform',()=>{
 const record=fixture('ps_musketeer_hero_muzzle_impact'),sample=P.sourceParticleSamples(record,.05,'facing',24)[0];
 a.equal(sample.orientToDirection,true);close(sample.velocity[0],0);close(sample.velocity[1],-.01);close(sample.velocity[2],0);close(sample.directionRotation,Math.PI/2);close(sample.rotation-sample.directionRotation,-Math.PI/2);
});

test('burst loops include the last authored burst and remain bounded on long absolute clocks',()=>{
 const record=fixture('ps_musketeer_hero_muzzle_impact');record.emitter.components=[{__class:'SpawnBurst',bursts:[{c:1},{t:.1,c:1}]}];record.emitter.lifetime=.2;record.emitter.emitterLoop=true;
 const samples=P.sourceParticleSamples(record,.325,'loop',24);a.equal(samples.length,1);close(samples[0].age,.025);
 const many=structuredClone(record);many.emitter.components[0].bursts[0].c=1e9;many.emitter.maxParticleCount=1e9;
 a.ok(P.sourceParticleSamples(many,1e7,'bounded',3).length<=3);a.equal(P.sourceParticleSamples(many,1e7,'bounded',0).length,0);
});

test('source particle lifetime includes delay, latest birth, curve maxima, and jitter',()=>{
 const record=fixture('ps_musketeer_hero_muzzle_impact');record.emitter.emitterDelay=.2;record.emitter.components=[{__class:'SpawnBurst',bursts:[{t:.1,c:1}]}];record.emitter.lifetime=fixture('ps_babydragon_def_buff_leaf').render.scale;record.emitter.lifetimeJitter=.05;
 a.equal(typeof P.particleLifetime,'function');close(P.particleLifetime(record),.55);
});

test('sampling preserves source records and presentation clocks without consuming global randomness',()=>{
 const record=fixture('ps_darkprince_hero_ingame_smoke'),before=JSON.stringify(record),random=Math.random;
 try{Math.random=()=>{throw Error('simulation RNG touched');};const first=P.sourceParticleSamples(record,.4,'stable',7);P.sourceParticleSamples(record,1e6,'stable',7);a.deepEqual(P.sourceParticleSamples(record,.4,'stable',7),first);a.ok(first.length<=7);a.notDeepEqual(P.sourceParticleSamples(record,.4,'other',7),first);a.equal(JSON.stringify(record),before);}finally{Math.random=random;}
});
