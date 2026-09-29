'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{gzipSync}=require('node:zlib'),N=require('../src/native');
test('streamed scenes preserve animation values in ordinary and compressed delivery',async()=>{
 const originalFetch=global.fetch,scene={textures:[],exports:{walk:1},clips:{1:{fps:24,frames:[[1,0,-0.5],[2,3,0.125]],labels:['','action_frame']}}},bytes=JSON.stringify(scene);
 try{for(const compressed of [false,true]){
  global.fetch=async()=>new Response(compressed?gzipSync(bytes):bytes);
  const library=new N.Library({arenas:[{id:'test'}],scenes:{test:{file:'assets/scenes/test.json'+(compressed?'.gz?v=123':'')}}},{});
  const loaded=await library.fetchScene('test');assert.deepEqual(loaded.data.clips,scene.clips);assert.deepEqual(loaded.data.exports,scene.exports);
 }}finally{global.fetch=originalFetch;}
});
