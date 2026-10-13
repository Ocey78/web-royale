'use strict';
const test=require('node:test'),a=require('node:assert/strict'),P=require('../src/source-particles');
const fixtures=require('./fixtures/source-particles-v056.json');
const close=(got,want)=>a.ok(Math.abs(got-want)<1e-8,`${got} should equal ${want}`);
const pose=(x=0,angle=0)=>({position:[x,0,0],quaternion:[0,0,Math.sin(angle/2),Math.cos(angle/2)],scale:[1,1,1],origin:[x*32,40],factor:2});

test('actual non-following Dark Prince smoke retains its birth attachment after actor movement',()=>{
 const record=Object.entries(fixtures).find(([path])=>path.endsWith('ps_darkprince_hero_ingame_smoke'))?.[1].record;
 a.ok(record,'original smoke fixture exists');
 const particles=P.sourceParticleSamples(record,.15,'trail',24),particle=particles.find(p=>p.age>.1);
 a.ok(particle);a.equal(particle.followEmitter,false);
 const h=new P.ParticleTransformHistory();h.observe('unit7:smoke','charge1',0,pose(0));h.observe('unit7:smoke','charge1',.15,pose(3));
 const birth=h.resolve('unit7:smoke',.15,particle.age,particle.followEmitter);
 close(birth.position[0],(.15-particle.age)*20);close(birth.origin[0],birth.position[0]*32);
 h.observe('unit7:smoke','charge1',.3,pose(6));a.deepEqual(h.resolve('unit7:smoke',.3,particle.age+.15,false),birth);
 a.deepEqual(h.resolve('unit7:smoke',.3,particle.age+.15,true),pose(6));
});

test('between-frame births interpolate translation, shortest-arc rotation, size and canvas origin',()=>{
 const h=new P.ParticleTransformHistory(),end={...pose(10,Math.PI),scale:[3,5,7],origin:[100,80],factor:4};
 h.observe('emitter','attack1',0,pose());h.observe('emitter','attack1',1,end);
 const birth=h.sample('emitter',.5);a.deepEqual(birth.position,[5,0,0]);a.deepEqual(birth.scale,[2,3,4]);a.deepEqual(birth.origin,[50,60]);close(birth.factor,3);
 close(birth.quaternion[2],Math.SQRT1_2);close(birth.quaternion[3],Math.SQRT1_2);
 // q and -q encode the same orientation; their midpoint must not collapse.
 h.observe('same','a',0,pose());h.observe('same','a',1,{...pose(),quaternion:[0,0,0,-1]});a.deepEqual(h.sample('same',.5).quaternion,[0,0,0,1]);
});

test('history copies input and output snapshots and clamps unavailable past to earliest observation',()=>{
 const h=new P.ParticleTransformHistory(),input=pose(5),before=structuredClone(input);h.observe('emitter','a',1,input);a.deepEqual(input,before);
 input.position[0]=99;const result=h.sample('emitter',0);a.deepEqual(result,before);result.origin[0]=0;a.deepEqual(h.sample('emitter',5),before);
 a.equal(h.observe('emitter','a',2,{...pose(),position:[NaN,0,0]}),false);a.deepEqual(h.sample('emitter',2),before);
});

test('rewind and activation changes discard old poses without altering another emitter',()=>{
 const h=new P.ParticleTransformHistory();h.observe('a','attack1',10,pose(10));h.observe('a','attack1',11,pose(11));h.observe('b','charge1',11,pose(50));
 h.observe('a','attack1',2,pose(2));a.deepEqual(h.sample('a',10),pose(2));a.deepEqual(h.sample('b',11),pose(50));
 h.observe('a','attack2',3,pose(30));a.deepEqual(h.sample('a',2),pose(30));
 h.observe('a','attack2',3,pose(31));a.deepEqual(h.sample('a',3),pose(31));a.equal(h.summary().snapshots,2);
});

test('emitter, sample and age limits bound retained presentation memory',()=>{
 const h=new P.ParticleTransformHistory({maxEmitters:2,maxSamples:3,maxAge:.5});
 for(let i=0;i<100;i++)h.observe('a','x',i/10,pose(i));a.ok(h.summary().snapshots<=3);
 h.observe('b','x',10,pose());h.observe('c','x',10,pose());a.equal(h.summary().emitters,2);a.equal(h.sample('a',9),null);
 h.prune(10.6);a.deepEqual(h.summary(),{emitters:0,snapshots:0});
 h.observe('d','x',11,pose());h.clear();a.equal(h.sample('d',11),null);
});
