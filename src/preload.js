/* Preload encoded assets, not thousands of decoded textures. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyalePreload=api;})(globalThis,function(){'use strict';
const CACHE='web-royale-assets-v1';
function assetURL(value,base){
 const url=new URL(value,base),scope=new URL('./',base),relative=url.pathname.slice(scope.pathname.length);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname)||url.username||url.password||url.hash||!/^([a-f0-9]{12})$/.test(url.searchParams.get('v')||'')||[...url.searchParams].length!==1||! /^(?:assets\/[A-Za-z0-9_./-]+\.(?:png|webp|wav|json|json\.gz)|training-[A-Za-z0-9_.-]+\.(?:js|json))$/.test(relative))throw Error('Invalid asset URL');
 return url.href;
}
function create(options={}){
 const base=options.base||globalThis.document?.baseURI,fetcher=options.fetch||globalThis.fetch.bind(globalThis),storage=options.caches??globalThis.caches,crypto=options.crypto||globalThis.crypto;
 const concurrency=Math.max(1,Math.min(6,options.concurrency||4)),attempts=Math.max(1,Math.min(3,options.maxAttempts||3));
 let state={},pending=null;
 const report=()=>options.onProgress?.({...state});
 async function run(catalog){
  const unique=new Map();for(const entry of catalog.assets||[]){const url=assetURL(entry.url,base);if(!Number.isSafeInteger(entry.bytes)||entry.bytes<0||! /^[a-f0-9]{64}$/.test(entry.sha256)||new URL(url).searchParams.get('v')!==entry.sha256.slice(0,12))throw Error('Invalid asset catalog');unique.set(url,{...entry,url});}
  const entries=[...unique.values()];if(!entries.length)throw Error('Empty asset catalog');
  state={status:'loading',total:entries.length,completed:0,totalBytes:entries.reduce((n,e)=>n+e.bytes,0),loadedBytes:0,fromCache:0,downloaded:0,cacheMode:'http'};
  let cache=null;try{if(crypto?.subtle)cache=await storage?.open(CACHE);if(cache)state.cacheMode='persistent';}catch(_){}report();
  let next=0,failure=null;
  async function one(entry){
   let cached;try{cached=await cache?.match(entry.url);}catch(_){cache=null;state.cacheMode='http';}
   if(cached?.ok&&cached.headers.get('X-Royale-SHA256')===entry.sha256&&Number(cached.headers.get('Content-Length'))===entry.bytes){state.fromCache++;state.completed++;state.loadedBytes+=entry.bytes;report();return;}
   if(cached)try{await cache?.delete(entry.url);}catch(_){}
   let lastError;for(let attempt=0;attempt<attempts;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),options.timeoutMs||45000);
    try{
     const response=await fetcher(entry.url,{credentials:'same-origin',headers:{'X-Royale-Preload':'1'},cache:attempt?'reload':'force-cache',redirect:'error',signal:controller.signal});
     if(response.status!==200||response.type==='opaque'||response.redirected)throw Error('Asset download failed: HTTP '+response.status);
     if(response.url&&new URL(response.url).origin!==new URL(base).origin)throw Error('Asset download changed origin');
     const bytes=await response.arrayBuffer();if(bytes.byteLength!==entry.bytes)throw Error('Asset bytes did not match: '+new URL(entry.url).pathname);
     if(crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',bytes),actual=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');if(actual!==entry.sha256)throw Error('Asset integrity check failed');}
     if(cache&&crypto?.subtle){try{await cache.put(entry.url,new Response(bytes,{headers:{'Content-Type':response.headers.get('Content-Type')||'application/octet-stream','Content-Length':String(bytes.byteLength),'X-Royale-SHA256':entry.sha256,'Cache-Control':'public, max-age=31536000, immutable'}}));}catch(_){cache=null;state.cacheMode='http';}}
     state.downloaded++;state.completed++;state.loadedBytes+=entry.bytes;report();return;
    }catch(error){lastError=error;}finally{clearTimeout(timer);}
   }throw lastError;
  }
  await Promise.all(Array.from({length:Math.min(concurrency,entries.length)},async()=>{while(next<entries.length&&!failure){const entry=entries[next++];try{await one(entry);}catch(error){failure=error;}}}));
  if(failure){state.status='error';state.error=failure.message;report();throw failure;}
  state.status='ready';report();return {...state};
 }
 return{load(catalog){if(!pending)pending=run(catalog).finally(()=>pending=null);return pending;},summary:()=>({...state})};
}
async function installWorker(script,base=globalThis.document?.baseURI){
 if(!globalThis.navigator?.serviceWorker||!script)return false;
 const sw=navigator.serviceWorker,url=new URL(script,base);if(url.origin!==location.origin)return false;
 let timer,listener,finished=false;
 try{return await Promise.race([(async()=>{await sw.register(url.href,{scope:new URL('./',base).href,updateViaCache:'none'});await sw.ready;if(finished)return false;if(sw.controller)return true;return await new Promise(resolve=>{listener=()=>{if(sw.controller)resolve(true);};sw.addEventListener('controllerchange',listener);listener();});})(),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),10000);})]);}catch(_){return false;}finally{finished=true;clearTimeout(timer);if(listener)sw.removeEventListener('controllerchange',listener);}
}
return{CACHE,assetURL,create,installWorker};
});
