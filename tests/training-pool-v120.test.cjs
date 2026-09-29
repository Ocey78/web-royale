'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{Worker}=require('node:worker_threads'),S=require('../src/training-scheduler'),L=require('../src/learning');
const dir=path.resolve(__dirname,'../dist');
class BrowserWorkerAdapter{
 constructor(url){this.thread=new Worker(path.join(__dirname,'helpers/browser-worker-adapter.cjs'),{workerData:{dir,worker:new URL(url).pathname.slice(1)}});this.thread.on('message',data=>this.onmessage?.({data}));this.thread.on('error',error=>this.onerror?.(error));}
 postMessage(message){this.thread.postMessage(message);}
 terminate(){return this.thread.terminate();}
}
test('four actual concurrent 2v2 simulations finish through two packaged workers with unique learned packets',async()=>{
 const release=JSON.parse(fs.readFileSync(path.join(dir,'release.json'))),runtime=JSON.parse(fs.readFileSync(path.join(dir,release.runtime)));let pool,peak=0;const packets=[];
 const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pool?.terminate();reject(Error('Actual training pool timed out'));},180000);
 pool=new S.WorkerPool({Worker:BrowserWorkerAdapter,info:runtime.training,baseURI:'https://webroyale.test/',count:4,concurrent:4,hardware:3,model:L.normalizeModel(),mode:'TeamVsTeam',seed:7251,onmessage:({data:m})=>{peak=Math.max(peak,m.active||0);if(m.type==='match')packets.push(m.packet);if(m.type==='done'){clearTimeout(timer);resolve(m);}else if(m.type==='error'){clearTimeout(timer);reject(Error(m.message));}},onerror:e=>{clearTimeout(timer);reject(e);}});pool.start();
 });pool.terminate();A.equal(result.completed,4);A.equal(result.workers,2);A.equal(packets.length,4);A.equal(new Set(packets.map(p=>p.record.id)).size,4);A.equal(peak,4);
 let model=L.normalizeModel();for(const p of packets){A.equal(p.record.seatCount,4);A.equal(p.record.recording,'compact');A.equal(p.record.status,'completed');A.ok(p.delta.updates>0);A.ok(p.delta.weights.every(Number.isFinite));A.ok(p.record.commands.length<=64);A.ok(p.record.seatPlacements.every(n=>n>0));model=L.mergePacket(model,p);}A.equal(model.matches,4);A.ok(model.updates>0);
});
