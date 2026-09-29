'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{Worker}=require('node:worker_threads');
const dir=path.resolve(__dirname,'../dist'),release=JSON.parse(fs.readFileSync(path.join(dir,'release.json'))),runtime=JSON.parse(fs.readFileSync(path.join(dir,release.runtime))),L=require('../src/learning');
async function run(mode,{cancel=false,badOrigin=false}={}){
 const meta=runtime.training;A.ok(meta,'Build must include the worker');const worker=new Worker(path.join(__dirname,'helpers/browser-worker-adapter.cjs'),{workerData:{dir,worker:meta.worker}}),packets=[];
 try{return await new Promise((resolve,reject)=>{let stopped=false;const timeout=setTimeout(()=>reject(Error('Worker timeout')),90000);
  worker.on('error',e=>{clearTimeout(timeout);reject(e)});worker.on('message',m=>{if(m.type==='match')packets.push(m.packet);if(cancel&&m.type==='progress'&&!stopped){stopped=true;worker.postMessage({type:'cancel'});}if(['done','error','host-error'].includes(m.type)){clearTimeout(timeout);resolve({message:m,packets});}});
  worker.postMessage({type:'start',mode,count:cancel?25:1,seed:14444,model:L.normalizeModel(),engine:new URL(meta.engine,'https://webroyale.test/').href,game:new URL(meta.game,badOrigin?'https://not-game.test/':'https://webroyale.test/').href});
 });}finally{await worker.terminate();}
}
test('v110: packaged self-play worker completes 1v1 with actual learned gradients',async()=>{const r=await run('Default');A.equal(r.message.type,'done',JSON.stringify(r.message));A.equal(r.packets.length,1);A.ok(r.packets[0].delta.updates>0);A.ok(r.packets[0].delta.weights.some(x=>x!==0));A.ok(r.packets[0].record.commands.some(c=>c.seat===0));});
test('v110: packaged self-play worker completes 2v2 with all four players',async()=>{const r=await run('TeamVsTeam');A.equal(r.message.type,'done',JSON.stringify(r.message));const x=r.packets[0].record;A.equal(x.seatCount,4);for(const s of [0,1,2,3])A.ok(x.commands.some(c=>c.seat===s));});
test('v110: self-play can be cancelled without pretending an unfinished match completed',async()=>{const r=await run('Default',{cancel:true});A.equal(r.message.type,'done');A.equal(r.message.cancelled,true);A.ok(r.message.completed<25);A.equal(r.packets.length,r.message.completed);});
test('v110: training worker rejects external resource origins',async()=>{const r=await run('Default',{badOrigin:true});A.equal(r.message.type,'error');A.match(r.message.message,/local/);A.equal(r.packets.length,0);});
