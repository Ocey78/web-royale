/* Cooperative headless concurrency. Active matches are state machines, not OS
   threads. A small worker pool time-slices them; 5000 is not a real-time promise. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleTraining=api;})(globalThis,function(){'use strict';
const MAX_GAMES=5000,MAX_WORKERS=8;
function plan(count=10,concurrent=1,hardware=4,options={}){if(!Number.isInteger(count)||count<1||count>MAX_GAMES||!Number.isInteger(concurrent)||concurrent<1||concurrent>count)throw RangeError('Choose 1–5000 matches and concurrency no greater than the match count');const threads=Math.max(1,Math.min(MAX_WORKERS,concurrent,Math.max(1,Math.floor(Number(hardware)||2)-1)));return{count,concurrent,threads,loop:options.loop===true,lanes:Array.from({length:threads},(_,i)=>({offset:i,stride:threads,count:Math.floor(count/threads)+(i<count%threads?1:0),concurrent:Math.floor(concurrent/threads)+(i<concurrent%threads?1:0)}))};}
class CooperativeScheduler{
 constructor({count,concurrent,create,advance,finish,clock=()=>performance.now()}){plan(count,concurrent,2);Object.assign(this,{count,concurrent,create,advance,finish,clock});this.active=[];this.created=0;this.completed=0;this.cursor=0;this.cancelled=false;this.peak=0;}
 get done(){return this.cancelled||this.completed>=this.count;}
 cancel(){this.cancelled=true;this.active.length=0;}
 status(){return{completed:this.completed,total:this.count,active:this.active.length,queued:this.count-this.created,peak:this.peak,cancelled:this.cancelled};}
 slice(budget=10){if(this.done)return this.status();const start=this.clock();let admitted=0,steps=0;
  while(this.active.length<Math.min(this.concurrent,this.count-this.completed)&&this.created<this.count){this.active.push(this.create(this.created++));this.peak=Math.max(this.peak,this.active.length);admitted++;if(admitted>=32||this.clock()-start>=budget)return this.status();}
  while(this.active.length&&this.clock()-start<budget&&steps++<512&&!this.cancelled){this.cursor%=this.active.length;const instance=this.active[this.cursor];if(this.advance(instance)){this.finish(instance);this.completed++;this.active.splice(this.cursor,1);if(this.created<this.count){this.active.push(this.create(this.created++));this.peak=Math.max(this.peak,this.active.length);}}else this.cursor++;}
  return this.status();
 }
}
class WorkerPool{
 constructor({Worker,info,baseURI,count,concurrent,hardware,model,mode,seed,onmessage=()=>{},onerror=()=>{}}){this.plan=plan(count,concurrent,hardware);this.workers=[];this.states=this.plan.lanes.map(l=>({completed:0,total:l.count,active:0,queued:l.count}));this.doneLanes=new Set();this.onmessage=onmessage;this.onerror=onerror;this.stopped=false;this.cancelled=false;this.config={info,baseURI,model,mode,seed};this.Worker=Worker;}
 start(){const c=this.config,id='train-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);try{this.plan.lanes.forEach((lane,index)=>{const worker=new this.Worker(new URL(c.info.worker,c.baseURI));this.workers.push(worker);worker.onmessage=e=>{if(this.stopped)return;const m=e.data||{};
   if(m.type==='progress'||m.type==='match'){this.states[index]={...this.states[index],...Object.fromEntries(['completed','active','queued','matchSeconds','updates'].filter(k=>m[k]!==undefined).map(k=>[k,m[k]]))};const s=this.status();this.onmessage({data:{...m,...s,worker:index}});}
   else if(m.type==='done'){this.states[index]={...this.states[index],completed:m.completed,active:0,queued:0};this.doneLanes.add(index);worker.terminate();if(this.doneLanes.size===this.workers.length){const s=this.status();this.onmessage({data:{type:'done',...s,cancelled:this.cancelled||m.cancelled}});this.stopped=true;}}
   else if(m.type==='error'){this.cancelled=true;this.terminate();this.onmessage({data:{type:'error',...this.status(),message:m.message}});}
  };worker.onerror=e=>{this.terminate();this.onerror(e);};worker.postMessage({type:'start',...lane,concurrency:lane.concurrent,count:lane.count,batch:id,lane:index,seed:c.seed,model:c.model,mode:c.mode,game:new URL(c.info.game,c.baseURI).href,engine:new URL(c.info.engine,c.baseURI).href});});}catch(e){this.terminate();throw e;}return this;}
 status(){return{completed:this.states.reduce((n,s)=>n+s.completed,0),total:this.plan.count,active:this.states.reduce((n,s)=>n+(s.active||0),0),queued:this.states.reduce((n,s)=>n+(s.queued||0),0),workers:this.plan.threads,concurrent:this.plan.concurrent};}
 postMessage(m){if(m.type==='cancel')this.cancelled=true;for(const w of this.workers)w.postMessage(m);}
 terminate(){this.stopped=true;for(const w of this.workers)w.terminate();}
}
return{MAX_GAMES,MAX_WORKERS,plan,CooperativeScheduler,WorkerPool};});
