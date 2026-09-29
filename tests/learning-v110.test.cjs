'use strict';
const test=require('node:test'),A=require('node:assert/strict'),C=require('../src/core'),AI=require('../src/ai');
let L={};try{L=require('../src/learning')}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
test('v110: persistent reward learner and recorder are implemented',()=>{A.equal(typeof L.SharedBrain,'function');A.equal(typeof L.MatchRecorder,'function');});
const T=L.SharedBrain?test:test.skip;
T('reward changes actual action values; neutral logs alone do not train',()=>{const b=new L.SharedBrain(),feat=L.features({team:0,seat:0,time:20,secondsLeft:160,elixir:6,multiplier:1,own:[],enemies:[],towers:[],hand:[]},{card:'knight',reason:'defend: Giant',x:100,y:450,cost:3}),before=b.predict(feat);const trace=new Float64Array(L.DIM);for(let i=0;i<6;i++)b.update(feat,2,null,trace,1);A.ok(b.predict(feat)>before);A.equal(b.state.updates,6);A.ok(b.state.weights.some(w=>Math.abs(w)>1e-8));});
T('negative reward decreases a selected action and updates survive JSON reload',()=>{const b=new L.SharedBrain(),f=new Array(L.DIM).fill(0);f[0]=1;for(let i=0;i<6;i++)b.update(f,-2,null,new Float64Array(L.DIM),1);A.ok(b.predict(f)<0);const loaded=new L.SharedBrain(JSON.parse(JSON.stringify(b.export())));A.equal(loaded.predict(f),b.predict(f));});
T('model rejects mismatched snapshots, NaN and infinite weights',()=>{const a=L.normalizeModel({snapshot:'newer',weights:[999]});A.equal(a.snapshot,C.DATA.snapshot);A.ok(a.weights.every(Number.isFinite));const b=L.normalizeModel({...a,weights:a.weights.map((w,i)=>i%2?Infinity:NaN)});A.ok(b.weights.every(Number.isFinite));});
T('clipped rewards and gradients cannot explode over long runs',()=>{const b=new L.SharedBrain(),f=new Array(L.DIM).fill(1),tr=new Float64Array(L.DIM);for(let i=0;i<1000;i++)b.update(f,100000,null,tr,1);A.ok(b.state.weights.every(w=>Number.isFinite(w)&&Math.abs(w)<=L.WEIGHT_LIMIT));});
T('match records retain actions even after the visual event ring rolls over',()=>{const b=new C.Battle({ai:false,brain:new L.SharedBrain()});for(let i=0;i<600;i++)b.record({type:'deploy',team:i%2,seat:i%2,card:'knight',cost:3,x:120,y:420,serial:i});A.equal(b.events.length,300);A.equal(b.recorder.commands.length,600);});
T('every bot in a 2v2 match uses the same learned weights',()=>{const brain=new L.SharedBrain(),b=new C.Battle({mode:'TeamVsTeam',brain,ai:true});for(const s of [1,2,3])A.equal(b.bots[s].learner.brain,brain);for(let i=0;i<1800;i++)b.step(1/60);b.finish(0,'test');A.ok(brain.state.updates>0);A.ok(b.recorder.transitions.length>0);A.ok(b.recorder.finish().commands.some(x=>x.seat===2));});
T('cheat matches are recorded but cannot train the shared policy',()=>{const brain=new L.SharedBrain(),b=new C.Battle({brain,profile:{cheats:{placement:true}},ai:true});for(let i=0;i<1200;i++)b.step(1/60);b.finish(0,'test');A.equal(brain.state.updates,0);A.ok(b.recorder.finish().quarantined);A.ok(b.recorder.commands.length>0);});
T('summoning units does not manufacture a positive damage/trade reward',()=>{const b=new C.Battle({brain:new L.SharedBrain(),ai:false});const before=b.rewardFrame(0);b.spawnGroup('Skeleton',15,0,240,400,9);const after=b.rewardFrame(0),r=L.rewardDelta(before,after);A.equal(r.total,0);b.hitArea({team:1,x:240,y:400,damage:999,radius:8,ground:true,air:true});b.deaths();A.ok(L.rewardDelta(before,b.rewardFrame(0)).total<0);});
T('record and policy merge are idempotent and combine independent sessions',()=>{const base=new L.SharedBrain().export();const packet=(id,index)=>({record:{id,snapshot:C.DATA.snapshot,result:{winner:0},mode:'Default',duration:10},delta:{weights:Array.from({length:L.DIM},(_,i)=>i===index?.4:0),updates:2,reward:1}});const first=L.mergePacket(base,packet('a',0)),second=L.mergePacket(first,packet('b',1)),duplicate=L.mergePacket(second,packet('a',0));A.equal(second.weights[0],.4);A.equal(second.weights[1],.4);A.equal(second.matches,2);A.deepEqual(second,duplicate);});
T('abandoned matches do not receive a false victory reward',()=>{const brain=new L.SharedBrain(),b=new C.Battle({ai:false,brain});b.abortRecording('left');const r=b.recorder.finish();A.equal(r.result,null);A.equal(r.status,'abandoned');A.equal(r.terminalReward,0);});
T('learned policy does not access opponent hand queue or exact resources',()=>{const b=new C.Battle({brain:new L.SharedBrain(),ai:false});b.elixir[1]=10;for(const key of ['hand','queue','elixir'])Object.defineProperty(b[key],0,{get(){throw Error('Hidden '+key)}});A.doesNotThrow(()=>b.aiPlay(1));});

test('v110: learned action values can distinguish anti-air decisions in an air attack from an empty board',()=>{
 const b=new C.Battle({ai:false}),v=AI.observe(b,0),a={card:'musketeer',x:180,y:430,score:10,reason:'defend: Balloon'},ground={card:'knight',x:180,y:430,score:10,reason:'defend: Knight'};
 const enemy={hp:1500,maxHp:1500,x:180,y:370,air:true,building:false};
 const air={...v,enemies:[enemy]},empty={...v,enemies:[]},f1=L.features(air,a),f2=L.features(empty,a),g1=L.features(air,ground),g2=L.features(empty,ground);
 A.ok(f1.some((x,i)=>Math.abs((x-f2[i])-(g1[i]-g2[i]))>1e-8),'Context must interact with action identity, not add the same value to every card');
});
test('v110: repeated healing cannot mint unbounded damage-trade rewards',()=>{
 const b=new C.Battle({ai:false}),u=b.spawn('Knight',1,200,350,{wait:0}),attacker=b.spawn('Knight',0,200,390,{wait:0});
 for(let i=0;i<20;i++){b.damage(u,u.maxHp*.9,attacker);u.hp=u.maxHp;}
 A.ok(b.metrics.combat[0]<=3.001,'One Knight cannot generate more than its original elixir value in damage reward');
});
