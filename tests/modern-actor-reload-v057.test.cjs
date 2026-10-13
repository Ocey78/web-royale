'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

async function fixture(){
 // Expose the real cache instances only in this VM. Suspend the renderer import
 // to observe actual loadActor/pending behavior without a GPU or network request.
 const source=fs.readFileSync(require.resolve('../src/modern-3d.js'),'utf8'),marker='return {configure,prepareActors,';
 assert.ok(source.includes(marker));const root={};root.globalThis=root;
 vm.runInNewContext(source.replace(marker,'root.cacheTest={actors,poses,stallLoads(){enginePromise=new Promise(()=>{});}};'+marker),root);
 const api=root.RoyaleModern3D,cache=root.cacheTest,contract={parts:[],sourceEntity:{}},raster={image:{width:8,height:8},x:0,y:0,width:8,height:8};
 await api.configure({heroes:{FixtureHero:contract}});cache.stallLoads();let released=0,painted=0;cache.actors.release=()=>released++;cache.actors.maxActors=0;
 api.beginFrame(['FixtureHero']);cache.actors.set('FixtureHero',{id:'FixtureHero',contract,parts:[],bytes:1});
 // The rasterizer output is a fixture, while the actual draw method computes
 // its cache key. Later reads run the unchanged LRU lookup after mesh eviction.
 const get=cache.poses.get.bind(cache.poses);cache.poses.get=function(key){cache.poses.get=get;cache.poses.set(key,raster,256);return get(key);};
 const c={save(){},restore(){},translate(){},scale(){},drawImage(){painted++;}},entity={id:3,visualTime:10,visualStarted:0},draw=()=>api.draw(c,'FixtureHero',50,50,0,10,'idle',-Math.PI/2,0,1,{entity});
 assert.equal(draw(),true);api.endFrame();api.beginFrame([]);api.endFrame();assert.equal(released,1);assert.equal(api.summary().actors,0);assert.equal(api.summary().poseEntries,1);assert.equal(api.summary().pending,0);
 return {api,c,entity,draw,get painted(){return painted;}};
}

test('an evicted actor starts one reload even when its unchanged body pose is cached',async()=>{
 const q=await fixture(),before=JSON.stringify(q.entity);q.api.beginFrame(['FixtureHero']);
 assert.equal(q.draw(),true,'cached artwork remains visible during the reload');
 assert.equal(q.api.summary().pending,1,'mesh/effect loading cannot depend on a future pose cache miss');
 assert.equal(q.draw(),true);assert.equal(q.api.summary().pending,1,'the real pending map deduplicates repeated load requests');assert.equal(q.painted,3);assert.equal(JSON.stringify(q.entity),before);assert.equal(q.api.summary().error,null);q.api.endFrame();
});

test('a cached shadow also schedules the missing actor before the body pass',async()=>{
 const q=await fixture();q.api.beginFrame(['FixtureHero']);let shadows=0;
 assert.equal(q.api.shadow(q.c,'FixtureHero',50,50,0,10,'idle',-Math.PI/2,0,1,{entity:q.entity,paint(){shadows++;}}),true);
 assert.equal(shadows,1);assert.equal(q.api.summary().pending,1);assert.equal(q.draw(),true);assert.equal(q.api.summary().pending,1);assert.equal(q.api.summary().error,null);q.api.endFrame();
});
