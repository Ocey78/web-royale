'use strict';
// Isolated navigation CPU work, not a whole-game FPS or device benchmark.
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const engines={v037:require('../src/legacy-core-v037'),v038:require('../src/core')};
function run(C){const b=new C.Battle({ai:false,headless:true}),u=b.spawn('Knight',0,9*C.SX,24*C.SY,{wait:0}),t=b.towers.find(t=>t.team===1&&!t.king);b.spawn('Cannon',0,9*C.SX,21*C.SY,{wait:0});const start=performance.now();for(let i=0;i<900;i++){b.time+=1/60;b.move(u,t,1/60);}return {milliseconds:performance.now()-start,routeSearches:b.navigator.searches,position:[u.x/C.SX,u.y/C.SY]};}
for(let i=0;i<5;i++)for(const C of Object.values(engines))run(C);
const samples={v037:[],v038:[]};for(let i=0;i<15;i++)for(const [version,C]of Object.entries(engines))samples[version].push(run(C));
const result={scenario:'One Knight routes around a friendly Cannon toward the enemy Princess Tower for 900 movement steps at 1/60 s; AI and renderer disabled.',environment:{node:process.version,platform:process.platform,arch:process.arch},samples};
for(const key of Object.keys(samples)){const x=samples[key];result[key]={medianMilliseconds:x.map(v=>v.milliseconds).sort((a,b)=>a-b)[7],routeSearches:x[0].routeSearches,finalPosition:x[0].position};}
result.cpuReductionPercent=100*(1-result.v038.medianMilliseconds/result.v037.medianMilliseconds);console.log(JSON.stringify(result,null,2));
