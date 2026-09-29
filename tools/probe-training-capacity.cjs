'use strict';
// Bounded capacity smoke, not a completed-training benchmark. No files/network.
// Run with: node --max-old-space-size=768 tools/probe-training-capacity.cjs
const C=require('../src/core'),L=require('../src/learning'),S=require('../src/training-scheduler');
const count=5000,limit=720*1024*1024,start=performance.now(),model=L.normalizeModel();let stepped=0,peak=0,stoppedForMemory=false;
const scheduler=new S.CooperativeScheduler({count,concurrent:count,create(i){return{b:new C.Battle({seed:i+50000,ai:false,brain:new L.SharedBrain({...model,seen:[],recent:[]}),recording:'compact',headless:true,practice:true}),stepped:false};},advance(o){if(!o.stepped){o.b.step(1/60);o.stepped=true;stepped++;}return false;},finish(){throw Error('This probe does not finish matches');}});
while(stepped<count){scheduler.slice(10);peak=Math.max(peak,process.memoryUsage().rss);if(peak>limit){stoppedForMemory=true;break;}}
const result={requested:count,initialized:scheduler.created,peakActive:scheduler.peak,stepped,completed:scheduler.completed,peakRSSBytes:peak,seconds:(performance.now()-start)/1000,stoppedForMemory,note:'Actual battle instances, one simulation tick each, then cancelled. Not a 5000 completed-game benchmark or Windows/browser capacity guarantee.'};scheduler.cancel();result.activeAfterCancel=scheduler.active.length;console.log(JSON.stringify(result,null,2));
