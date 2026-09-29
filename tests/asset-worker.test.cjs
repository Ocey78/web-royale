'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/asset-worker.js'),'utf8');
const base='https://game.example/royale/',version='012345abcdef';
function request(url,options={}){return{url:new URL(url,base).href,method:'GET',mode:'cors',destination:'',headers:new Headers(),...options};}
function fixture({rows=new Map(),openError=false,matchError=false,network}={}){
 const listeners={},calls={open:0,match:[],fetch:[],put:0,skipWaiting:0,claim:0};
 const context={URL,Headers,Response,self:{location:{href:base+'asset-worker.js?v='+version},addEventListener:(name,fn)=>{listeners[name]=fn;},skipWaiting:async()=>{calls.skipWaiting++;},clients:{claim:async()=>{calls.claim++;}}},caches:{open:async name=>{calls.open++;A.equal(name,'web-royale-assets-v1');if(openError)throw Error('Storage denied');return{match:async req=>{calls.match.push(req.url);if(matchError)throw Error('Cache read failed');return rows.get(req.url)?.clone();},put:()=>{calls.put++;throw Error('Worker must not write a response');}};}},fetch:async req=>{calls.fetch.push(req);return network?network(req):new Response('network body');}};
 vm.runInNewContext(source,context,{filename:'asset-worker.js'});
 return{calls,listeners,dispatch(req){let result=null;listeners.fetch({request:req,respondWith:p=>{A.equal(result,null);result=Promise.resolve(p);}});return result;}};
}
test('asset worker activates without downloading or caching any document',async()=>{
 const f=fixture();for(const name of ['install','activate']){let work;f.listeners[name]({waitUntil:p=>{work=p;}});await work;}
 A.equal(f.calls.skipWaiting,1);A.equal(f.calls.claim,1);A.equal(f.calls.open,0);A.equal(f.calls.fetch.length,0);
});
test('exact versioned artwork, compressed scenes, audio, emotes and training URLs reuse cached responses',async()=>{
 const paths=['assets/cards/knight.png','assets/native/chr_dragon-0.webp','assets/scenes/chr_dragon.json.gz','assets/audio/chest-open.wav','assets/emotes/emote.json','training-worker.012345abcdef.js','training-engine.012345abcdef.js','training-data.012345abcdef.json'];
 const rows=new Map(paths.map(p=>[new URL(p+'?v='+version,base).href,new Response(p,{headers:{'Content-Type':'application/octet-stream'}})]));const f=fixture({rows});
 for(const p of paths){const response=await f.dispatch(request(p+'?v='+version));A.equal(await response.text(),p);}
 A.equal(f.calls.fetch.length,0);A.equal(f.calls.put,0);A.equal(f.calls.match.length,paths.length);
});
test('documents, authentication, APIs and requests outside the exact asset scope pass through untouched',()=>{
 const f=fixture(),valid='assets/a.png?v='+version;
 const bypass=[request(valid,{mode:'navigate'}),request(valid,{destination:'document'}),request(valid,{method:'POST'}),request(valid,{method:'HEAD'}),request(valid,{headers:new Headers({Range:'bytes=0-9'})}),request(valid,{headers:new Headers({'X-Royale-Preload':'1'})}),...['index.html?v='+version,'manifest.json?v='+version,'release.json?v='+version,'login?v='+version,'auth/callback?v='+version,'__webroyale_ai__/capabilities?v='+version,'__webroyale_ai__/state?v='+version,'../assets/a.png?v='+version,'/royalex/assets/a.png?v='+version,'https://elsewhere.example/royale/'+valid,'http://game.example/royale/'+valid,'assets/a.png','assets/a.png?v=invalid','assets/a.png?v='+version+'&token=private','assets/a.png?v='+version+'&v='+version,'assets/a.html?v='+version,'assets/code.js?v='+version].map(u=>request(u))];
 for(const req of bypass)A.equal(f.dispatch(req),null,req.url+' '+req.method+' '+req.mode);
 A.equal(f.calls.open,0);A.equal(f.calls.fetch.length,0);A.equal(f.calls.put,0);
});
test('a different asset version cannot reuse an old cache entry',async()=>{
 const old=request('assets/a.png?v='+version),next=request('assets/a.png?v=fedcba543210'),f=fixture({rows:new Map([[old.url,new Response('old bytes')]])});
 A.equal(await (await f.dispatch(next)).text(),'network body');A.equal(f.calls.fetch.length,1);A.equal(f.calls.fetch[0],next);
});
test('cache misses retain the original request and use the network without writing',async()=>{
 const req=request('assets/a.png?v='+version,{credentials:'same-origin',headers:new Headers({'X-Test':'keep'})}),f=fixture();
 A.equal(await (await f.dispatch(req)).text(),'network body');A.equal(f.calls.fetch[0],req);A.equal(f.calls.put,0);
});
test('cache storage denial or cache read failure falls back to one normal network request',async()=>{
 for(const options of [{openError:true},{matchError:true}]){const f=fixture(options);A.equal(await (await f.dispatch(request('assets/a.png?v='+version))).text(),'network body');A.equal(f.calls.fetch.length,1);A.equal(f.calls.put,0);}
});
test('cached failed responses are not served as game assets',async()=>{
 const req=request('assets/a.png?v='+version),f=fixture({rows:new Map([[req.url,new Response('denied',{status:403})]])});
 A.equal(await (await f.dispatch(req)).text(),'network body');A.equal(f.calls.fetch.length,1);
});
test('network authorization redirects and failures are returned without persistence or rewriting',async()=>{
 for(const response of [Response.redirect('https://game.example/login',302),new Response('Sign in',{status:401})]){const f=fixture({network:()=>response});A.equal(await f.dispatch(request('assets/a.png?v='+version)),response);A.equal(f.calls.put,0);}
});
