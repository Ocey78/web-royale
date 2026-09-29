'use strict';
// Only versioned game assets use the cache. Documents and authentication always
// go to the host, preserving private-site access checks and update discovery.
const CACHE='web-royale-assets-v1',scope=new URL('./',self.location.href);
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),relative=url.pathname.slice(scope.pathname.length);if(request.headers.has('X-Royale-Preload'))return;
 if(request.method!=='GET'||request.mode==='navigate'||request.destination==='document'||request.headers.has('Range')||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname)||[...url.searchParams].length!==1||! /^[a-f0-9]{12}$/.test(url.searchParams.get('v')||'')||! /^(?:assets\/[A-Za-z0-9_./-]+\.(?:png|webp|wav|json|json\.gz)|training-[A-Za-z0-9_.-]+\.(?:js|json))$/.test(relative))return;
 event.respondWith((async()=>{try{const cache=await caches.open(CACHE),hit=await cache.match(request);if(hit?.ok)return hit;}catch(_){}return fetch(request);})());
});
