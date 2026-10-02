'use strict';
const test=require('node:test'),a=require('node:assert/strict'),N=require('../src/native');
test('lazy hero scenes decode only requested pages and evicted pages can reload',async()=>{
 const OriginalImage=globalThis.Image;let created=0,closed=0;
 globalThis.Image=class{constructor(){created++;this.naturalWidth=this.naturalHeight=2;}set src(value){queueMicrotask(()=>this.onload());}close(){closed++;}};
 try{
  const scene={lazyTextures:true,textures:[{file:'a',w:2,h:2},{file:'b',w:2,h:2}],exports:{idle:1},clips:{1:{fps:30,frames:[[[2,65535,65535,0]]]}},shapes:{2:[{texture:0,xy:[[0,0],[1,0],[1,1]],uv:[[0,0],[1,0],[1,1]]}]}};
  const lib=new N.Library({arenas:[{id:'test'}],units:{},scenes:{hero:scene}},{a:'a.png',b:'b.png'});lib.decodedArt.maxBytes=16;
  const sc=await lib.fetchScene('hero');a.equal(created,0,'fetching metadata must not decode all hero pages');
  await sc.loadTexture(0);a.equal(created,1);a.ok(sc.texture(0));await sc.loadTexture(1);a.equal(created,2);a.equal(sc.images[0],null);a.equal(closed,1);
  await sc.loadTexture(0);a.equal(created,3);a.ok(lib.decodedArt.bytes<=16);
 }finally{globalThis.Image=OriginalImage;}
});
test('hero prewarming follows the selected clip page list instead of loading every page',async()=>{
 const OriginalImage=globalThis.Image;let created=0;globalThis.Image=class{constructor(){created++;this.naturalWidth=this.naturalHeight=2;}set src(v){queueMicrotask(()=>this.onload());}};
 try{
  const scene={lazyTextures:true,texturePages:{idle:[1]},textures:[{file:'a'},{file:'b'},{file:'c'}],exports:{idle:1},clips:{1:{fps:30,frames:[[]]}},shapes:{}};
  const lib=new N.Library({arenas:[{id:'test'}],units:{},scenes:{hero:scene}},{a:'a',b:'b',c:'c'}),sc=await lib.fetchScene('hero');await sc.prewarm('idle');
  a.equal(created,1);a.equal(sc.images[0],null);a.ok(sc.images[1]);a.equal(sc.images[2],null);
 }finally{globalThis.Image=OriginalImage;}
});
