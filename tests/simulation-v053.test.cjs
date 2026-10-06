'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core'),P=require('../src/platform'),R=require('../src/replay');
async function workerAdvance(){
 let callbacks;const messages=[];
 const context=vm.createContext({URL,performance,setTimeout,clearTimeout,RoyalePlatform:P,RoyaleLearning:{normalizeModel:x=>x},RoyaleTrainingModes:{},RoyaleTraining:{plan(){},CooperativeScheduler:class{constructor(options){callbacks=options;this.done=true;}cancel(){}}}});
 Object.assign(context,{self:context,location:new URL('https://game.test/worker.js'),postMessage:m=>messages.push(m),fetch:async()=>({ok:true,json:async()=>({})}),importScripts(){}});
 vm.runInContext(fs.readFileSync(require.resolve('../src/training-worker'),'utf8'),context);
 await context.onmessage({data:{type:'start',game:'game.json',engine:'engine.js',count:1}});
 a.ok(callbacks,JSON.stringify(messages));return callbacks.advance;
}
test('training uses the live fixed step and keeps a quarter-second AI decision interval',async()=>{
 const advance=await workerAdvance(),steps=[],decisions=[];let frame=0;
 const b={time:0,timeline:{SectionLength:[180,120]},aiPlay:seat=>decisions.push([seat,frame]),step(dt){steps.push(dt);this.time+=dt;}};
 const o={b,frame:0};for(;frame<60;frame++)advance(o);
 a.ok(steps.every(dt=>dt===P.STEP));a.deepEqual(decisions,[[0,0],[0,15],[0,30],[0,45]]);a.ok(Math.abs(b.time-1)<1e-9);
});
test('training and live advancement produce identical troop movement and attack state',async()=>{
 const advance=await workerAdvance(),make=()=>{const b=new C.Battle({seed:530006,ai:false,queue:'challenge'});for(const [team,x,y]of [[0,8.8,17.4],[0,9,17.8],[0,9.2,18.2],[1,8.8,14.6],[1,9,14.2],[1,9.2,13.8]])b.spawn('Knight',team,x*C.SX,y*C.SY,{wait:0});b.aiPlay=()=>{};return b;};
 const live=make(),training=make(),session=new P.LocalMatchSession(live),job={b:training,frame:0};for(let frame=0;frame<360;frame++){advance(job);session.advance(P.STEP);}
 a.deepEqual(R.digest(training),R.digest(live));a.deepEqual(training.units.map(u=>[u.id,u.lastAttackAt,u.nextAttackAt,u.windup,u.chargeDistance,u.readyAt]),live.units.map(u=>[u.id,u.lastAttackAt,u.nextAttackAt,u.windup,u.chargeDistance,u.readyAt]));
});
test('v0.52 replay remains isolated from current balance tables and form registry',()=>{
 const record=require('./fixtures/virtual-forms-v0521.json'),Old=R.engineFor('0.52');
 a.ok(Old.DATA!==C.DATA);a.equal(Old.FormRegistry.fingerprint,record.initial.formRegistryFingerprint);
 const s=new R.Session(record);a.ok(s.battle instanceof Old.Battle);s.seek(record.duration);a.equal(s.error,null);a.deepEqual(R.digest(s.battle),record.expected);
});
test('new replays identify the changed simulation as 0.53',()=>{const b=new C.Battle({seed:530007,ai:false});R.captureInitial(b);a.equal(R.pack(b).engine,'0.53');});

test('changed gameplay has a separate learning archive and rejects old snapshot weights',()=>{const project=require('../project.json'),L=require('../src/learning');a.equal(project.learningKey,'web-royale-main-learning-v053');a.equal(project.learningDatabase,'web-royale-main-learning-v053');a.equal(project.aiFolder,'WebRoyaleMain053');const old={...L.normalizeModel(),snapshot:'16.402.2',weights:Array(L.DIM).fill(1),matches:12};const fresh=L.normalizeModel(old);a.equal(fresh.matches,0);a.ok(fresh.weights.every(w=>w===0));});
