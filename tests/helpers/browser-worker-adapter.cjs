'use strict';
// Executes the exact packaged worker/engine in an isolated Node worker thread.
// This is a host-API adapter, NOT a claim that browser Worker networking passed.
const {parentPort,workerData}=require('node:worker_threads'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=workerData.dir,origin='https://webroyale.test',seen=[];
function resolve(url){const u=new URL(url,origin),file=path.resolve(dir,'.'+u.pathname);if(u.origin!==origin||!file.startsWith(path.resolve(dir)+path.sep))throw Error('Nonlocal worker request');seen.push(u.href);return file;}
const context=vm.createContext({console,URL,setTimeout,clearTimeout,performance,structuredClone,TextEncoder,TextDecoder});
context.self=context;context.location=new URL(workerData.worker,origin+'/');context.postMessage=data=>parentPort.postMessage(data);
context.fetch=async url=>{try{const raw=fs.readFileSync(resolve(String(url)),'utf8');return{ok:true,json:async()=>JSON.parse(raw)}}catch{return{ok:false}}};
context.importScripts=(...urls)=>{for(const u of urls)vm.runInContext(fs.readFileSync(resolve(u),'utf8'),context,{filename:u});};
vm.runInContext(fs.readFileSync(resolve(context.location.href),'utf8'),context,{filename:workerData.worker});
parentPort.on('message',async data=>{try{await context.onmessage({data});}catch(e){parentPort.postMessage({type:'host-error',message:e.message});}});
