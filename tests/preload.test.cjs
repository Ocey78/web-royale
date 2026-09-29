'use strict';
const test=require('node:test'),A=require('node:assert/strict'),{createHash,webcrypto}=require('node:crypto');
const P=require('../src/preload');
const base='https://game.example/royale/',payload='original animation bytes',sha=createHash('sha256').update(payload).digest('hex');
const entry=(name='test.json')=>({url:`assets/${name}?v=${sha.slice(0,12)}`,bytes:Buffer.byteLength(payload),sha256:sha});
function storage(){const rows=new Map(),deleted=[];return{rows,deleted,open:async()=>({match:async key=>rows.get(String(key))?.clone(),delete:async key=>{deleted.push(String(key));return rows.delete(String(key));},put:async(key,r)=>rows.set(String(key),r.clone())})};}
test('all assets preload once with bounded concurrency, then reuse persisted bytes',async()=>{
 let active=0,peak=0,requests=0;const caches=storage(),entries=Array.from({length:13},(_,i)=>entry(i+'.json'));
 const fetch=async()=>{requests++;peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,2));active--;return new Response(payload);};
 const loader=P.create({base,fetch,caches,crypto:webcrypto,concurrency:3});await loader.load({assets:[...entries,entries[0]]});
 A.equal(requests,13);A.ok(peak<=3);A.equal(loader.summary().completed,13);A.equal(loader.summary().status,'ready');
 const second=P.create({base,fetch,caches,crypto:webcrypto});await second.load({assets:entries});A.equal(requests,13);A.equal(second.summary().fromCache,13);
});
test('interrupted preload resumes validated entries and retries a transient asset',async()=>{
 const caches=storage();let failed=true,requests=0;
 const loader=P.create({base,caches,crypto:webcrypto,maxAttempts:2,concurrency:1,fetch:async url=>{requests++;if(url.includes('second')&&failed)throw Error('Offline');return new Response(payload);}});
 await A.rejects(loader.load({assets:[entry('first.json'),entry('second.json')]}),/Offline/);A.equal(caches.rows.size,1);failed=false;
 await loader.load({assets:[entry('first.json'),entry('second.json')]});A.equal(loader.summary().fromCache,1);A.equal(requests,4);
});
test('login HTML or corrupt assets never enter the cache',async()=>{
 const caches=storage(),loader=P.create({base,caches,crypto:webcrypto,maxAttempts:1,fetch:async()=>new Response('<html>Sign in</html>')});
 await A.rejects(loader.load({assets:[entry()]}),/integrity|bytes/i);A.equal(caches.rows.size,0);
});
test('storage denial falls back to bounded HTTP preloading without blocking play',async()=>{
 let requests=0;const loader=P.create({base,crypto:webcrypto,caches:{open:async()=>{throw Error('Denied');}},fetch:async()=>{requests++;return new Response(payload);}});
 await loader.load({assets:[entry()]});A.equal(requests,1);A.equal(loader.summary().cacheMode,'http');A.equal(loader.summary().status,'ready');
});
test('legacy or poisoned cache metadata is evicted and repaired before an asset counts as ready',async()=>{
 const asset=entry('repair.json'),url=new URL(asset.url,base).href;
 for(const headers of [{'Content-Length':String(asset.bytes)},{'Content-Length':String(asset.bytes),'X-Royale-SHA256':'0'.repeat(64)},{'Content-Length':String(asset.bytes+1),'X-Royale-SHA256':sha}]){
  const caches=storage();caches.rows.set(url,new Response('<html>expired login</html>',{headers}));let requests=0;
  const loader=P.create({base,caches,crypto:webcrypto,maxAttempts:1,fetch:async(request,options)=>{requests++;A.equal(request,url);A.equal(options.headers['X-Royale-Preload'],'1','Repair fetch must bypass the worker cache');A.equal(caches.rows.has(url),false);return new Response(payload);}});
  const result=await loader.load({assets:[asset]});A.equal(result.status,'ready');A.equal(result.fromCache,0);A.equal(result.downloaded,1);A.equal(requests,1);A.deepEqual(caches.deleted,[url]);
  const repaired=caches.rows.get(url).clone();A.equal(await repaired.text(),payload);A.equal(repaired.headers.get('X-Royale-SHA256'),sha);A.equal(Number(repaired.headers.get('Content-Length')),asset.bytes);
  const warm=P.create({base,caches,crypto:webcrypto,fetch:async()=>{throw Error('Repaired cache should be reusable');}});A.equal((await warm.load({assets:[asset]})).fromCache,1);
 }
});
test('quota exhaustion after a successful cache write completes through HTTP and preserves resumable entries',async()=>{
 const rows=new Map(),assets=Array.from({length:4},(_,i)=>entry('quota-'+i+'.json')),progress=[];let writes=0,quotaFull=true,requests=0;
 const caches={open:async()=>({match:async key=>rows.get(String(key))?.clone(),put:async(key,response)=>{writes++;if(quotaFull&&writes>1)throw new DOMException('Storage quota reached','QuotaExceededError');rows.set(String(key),response.clone());}})};
 const fetch=async()=>{requests++;return new Response(payload);},loader=P.create({base,caches,crypto:webcrypto,concurrency:1,fetch,onProgress:state=>progress.push(state.cacheMode)});
 const first=await loader.load({assets});A.equal(first.status,'ready');A.equal(first.cacheMode,'http');A.equal(first.completed,4);A.equal(first.loadedBytes,assets.reduce((n,e)=>n+e.bytes,0));A.equal(requests,4);A.equal(writes,2,'Stop cache writes after the first quota failure');A.equal(rows.size,1);A.ok(progress.includes('persistent')&&progress.includes('http'));
 quotaFull=false;const resumed=await P.create({base,caches,crypto:webcrypto,concurrency:1,fetch}).load({assets});A.equal(resumed.status,'ready');A.equal(resumed.cacheMode,'persistent');A.equal(resumed.fromCache,1);A.equal(resumed.downloaded,3);A.equal(requests,7);A.equal(rows.size,4);
});
test('preload catalog cannot fetch documents, external origins or unversioned URLs',async()=>{
 for(const url of ['https://elsewhere.example/a.png','index.html','../login?v='+sha.slice(0,12),'assets/a.png']){
  const loader=P.create({base,crypto:webcrypto,fetch:async()=>{throw Error('must not fetch');}});await A.rejects(loader.load({assets:[{...entry(),url}]}),/Invalid asset/);
 }
});
