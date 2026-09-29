/* Loads genuine card PNGs. Never executes downloaded code. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleAssets=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MAX_BYTES=2*1024*1024;
const cacheKey=(revision,id)=>`royale-card-art-v1:${revision}:${id}`;
function containRect(sw,sh,w,h,padding=0){
 if(![sw,sh,w,h].every(n=>Number.isFinite(n)&&n>0)||padding<0||padding*2>=Math.min(w,h))throw new RangeError('Invalid image bounds');
 const scale=Math.min((w-padding*2)/sw,(h-padding*2)/sh);
 return{x:(w-sw*scale)/2,y:(h-sh*scale)/2,width:sw*scale,height:sh*scale};
}
function checkDataURL(src){if(typeof src!=='string'||!src.startsWith('data:image/png;base64,')||src.length>MAX_BYTES*1.4)throw new Error('Expected a bounded PNG image');}
function checkImageSource(src,base=globalThis.document?.baseURI){
 if(typeof src!=='string')throw Error('Invalid image URL');
 if(src.startsWith('data:'))return checkDataURL(src);
 const url=new URL(src,base),origin=new URL(base);if(!['https:','http:'].includes(url.protocol)||url.origin!==origin.origin||url.username||url.password||!/\.(png|webp)$/i.test(url.pathname))throw Error('Expected a same-origin image URL');
}
async function fetchImage(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
 try{
  const response=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'force-cache'});
  if(!response.ok)throw new Error(`Image download returned HTTP ${response.status}`);
  if(Number(response.headers.get('content-length'))>MAX_BYTES)throw new Error('Image is too large');
  let bytes;
  if(response.body&&response.body.getReader){
   const reader=response.body.getReader(),chunks=[];let size=0;
   for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES){await reader.cancel();throw new Error('Image is too large');}chunks.push(value);}
   bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  }else bytes=new Uint8Array(await response.arrayBuffer());
  const sig=[137,80,78,71,13,10,26,10];
  if(bytes.length<33||bytes.length>MAX_BYTES||sig.some((n,i)=>bytes[i]!==n))throw new Error('Source did not return a PNG');
  const header=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),w=header.getUint32(16),h=header.getUint32(20);
  if(w<32||h<32||w>2048||h>2048)throw new Error('Unexpected image dimensions');
  let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return'data:image/png;base64,'+btoa(binary);
 }finally{clearTimeout(timer);}
}
function decodeImage(src,{local=false}={}){
 if(local)checkImageSource(src);else checkDataURL(src);
 return new Promise((resolve,reject)=>{
  const image=new Image(),timer=setTimeout(()=>fail(new Error('Image decoding timed out')),10000);
  function fail(error){clearTimeout(timer);image.onload=image.onerror=null;reject(error);}
  image.onerror=()=>fail(new Error('The card PNG could not be decoded'));
  image.onload=()=>{
   try{
    const w=image.naturalWidth,h=image.naturalHeight;
    if(w<32||h<32||w>2048||h>2048)throw new Error('Unexpected image dimensions');
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,w,h).data;let left=w,top=h,right=-1,bottom=-1;
    // Trim transparent export padding only; preserve the actual card border.
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(pixels[(y*w+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    if(right<left||bottom<top)throw new Error('The card PNG is empty');
    clearTimeout(timer);image.onload=image.onerror=null;
    resolve({image,bounds:{x:left,y:top,width:right-left+1,height:bottom-top+1}});
   }catch(error){fail(error);}
  };
  image.crossOrigin='anonymous';image.src=src;
 });
}
function createStore(options){
 const {manifest,bundled={},storage=null}=options;
 const fetcher=options.fetchImage||fetchImage,decoder=options.decodeImage||(src=>decodeImage(src,{local:!!options.localAssets}));
 const definitions=new Map(manifest.cards.map(c=>[c.id,c]));
 const records=new Map(manifest.cards.map(c=>[c.id,{id:c.id,status:'idle',image:null,bounds:null,source:null,persistent:false,error:null}]));
 const pending=new Map(),listeners=new Set();
 function notify(id){for(const fn of listeners)fn(id);}
 function read(key){try{return storage?.getItem(key)||null;}catch(_){return null;}}
 function remove(key){try{storage?.removeItem(key);}catch(_){}}
 function write(key,value){try{if(!storage)return false;storage.setItem(key,value);return true;}catch(_){return false;}}
 async function load(id,{retry=false}={}){
  if(!definitions.has(id))throw new Error('Unknown card: '+id);
  const record=records.get(id);
  if(record.status==='ready'||(record.status==='error'&&!retry))return record;
  if(pending.has(id))return pending.get(id);
  record.status='loading';record.error=null;notify(id);
  const promise=(async()=>{
   const key=cacheKey(manifest.revision,id),candidates=[];
   if(bundled[id])candidates.push({source:'bundled',data:bundled[id]});
   const cached=read(key);if(cached)candidates.push({source:'cache',data:cached});
   if(definitions.get(id).url)candidates.push({source:'download'});
   for(const candidate of candidates){
    try{
     const data=candidate.source==='download'?await fetcher(definitions.get(id).url):candidate.data;
     if(options.localAssets&&candidate.source==='bundled')checkImageSource(data);else checkDataURL(data);const decoded=await decoder(data);
     Object.assign(record,decoded,{status:'ready',source:candidate.source,error:null,persistent:candidate.source==='bundled'||candidate.source==='cache'||write(key,data)});
     notify(id);return record;
    }catch(error){record.error=String(error?.message||error);if(candidate.source==='cache')remove(key);}
   }
   record.status='error';notify(id);return record;
  })();
  pending.set(id,promise);
  try{return await promise;}finally{pending.delete(id);}
 }
 return{
  get:id=>records.get(id)||null,load,
  loadAll:opts=>Promise.all([...definitions.keys()].map(id=>load(id,opts))),
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  summary(){const values=[...records.values()];return{total:values.length,ready:values.filter(r=>r.status==='ready').length,failed:values.filter(r=>r.status==='error').length,pending:values.filter(r=>r.status==='loading'||r.status==='idle').length,persistent:values.filter(r=>r.persistent).length};}
 };
}
return{checkImageSource,createStore,cacheKey,containRect,fetchImage,decodeImage};
});
