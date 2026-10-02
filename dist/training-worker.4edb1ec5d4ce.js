/* Each worker holds multiple headless matches and advances them cooperatively.
   No textures, canvases or full replays are allocated for training matches. */
'use strict';
let running=false,cancelled=false,initialized=false,scheduler=null,externalModel=null;
self.onmessage=async event=>{const m=event.data||{};if(m.type==='cancel'){cancelled=true;scheduler?.cancel();return;}if(m.type==='model'){externalModel=m.model;return;}if(m.type!=='start'||running)return;running=true;cancelled=false;let completed=0;
 try{
  if(!initialized){const game=new URL(m.game,self.location.href),engine=new URL(m.engine,self.location.href);if(game.origin!==self.location.origin||engine.origin!==self.location.origin)throw Error('Training resources must be local to this website');const response=await fetch(game);if(!response.ok)throw Error('Training tables could not load');self.RoyaleGameData=await response.json();importScripts(engine.href);initialized=true;}
  const count=Number(m.count)||10,concurrent=Number(m.concurrency)||1;RoyaleTraining.plan(count,concurrent,2);let state=RoyaleLearning.normalizeModel(m.model),lastProgress=0;const seed=Number(m.seed)||1001,mode=m.mode||'Default',batch=String(m.batch||'selfplay-'+Date.now()).slice(0,70),lane=Number(m.lane)||0;
  scheduler=new RoyaleTraining.CooperativeScheduler({count,concurrent,
   create(i){if(externalModel){state=RoyaleLearning.normalizeModel(externalModel);externalModel=null;}const ix=(Number(m.offset)||0)+i*(Number(m.stride)||1),brain=new RoyaleLearning.SharedBrain({...state,seen:[],recent:[]}),matchSeed=seed+ix*7919;const b=RoyaleTrainingModes.create(mode,{seed:matchSeed,brain,ai:true});b.id=batch+'-'+lane+'-'+ix;return{b,frame:0,arenaNumber:b.formContext.arena};},
   advance(o){if(o.frame%5===0)o.b.aiPlay(0);o.b.step(.05);o.frame++;if(o.b.time>(o.b.timeline.SectionLength.reduce((n,s)=>n+s,0)+15)&&!o.b.result)throw Error('Self-play match exceeded its time limit');return !!o.b.result;},
   finish(o){const packet=o.b.recorder.packet();packet.record.origin='self-play';state=RoyaleLearning.mergePacket(state,packet);completed++;self.postMessage({type:'match',packet,completed,total:count,active:Math.max(0,scheduler.active.length-1),queued:count-scheduler.created});}
  });
  while(!scheduler.done&&!cancelled){const p=scheduler.slice(10),now=performance.now();if(now-lastProgress>250){lastProgress=now;self.postMessage({type:'progress',...p,matchSeconds:Math.round(scheduler.active[0]?.b.time||0),updates:state.updates,mode});}await new Promise(r=>setTimeout(r,0));}
  self.postMessage({type:'done',completed,cancelled});
 }catch(e){self.postMessage({type:'error',message:String(e.message||e),completed});}finally{scheduler?.cancel();scheduler=null;running=false;externalModel=null;}
};
