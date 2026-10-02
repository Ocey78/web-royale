const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const M=require('../src/modern-3d.js');
function cache(options={}){assert.equal(typeof M.ActorCache,'function','resident cache must retain the visible cohort');return new M.ActorCache(options);}

test('17 visible source actors remain resident across repeated frames instead of reloading the first actor',()=>{
 const released=[],c=cache({maxActors:16,budget:128,release:a=>released.push(a.id)}),ids=Array.from({length:17},(_,i)=>'actor'+i);
 c.beginFrame(ids);for(const id of ids)c.set(id,{id,bytes:4});c.endFrame();
 for(let frame=0;frame<10;frame++){c.beginFrame(ids);for(const id of ids)assert.equal(c.get(id)?.id,id);c.endFrame();}
 assert.equal(c.size,17);assert.equal(c.bytes,68);assert.deepEqual(released,[]);assert.equal(c.stats().activeActors,17);assert.equal(c.stats().overActorLimit,1);
});

test('visible model bytes may exceed the soft target; changing the cohort releases only inactive models',()=>{
 const released=[],c=cache({maxActors:2,budget:10,release:a=>released.push(a.id)});
 c.beginFrame(['a','b','c']);for(const id of ['a','b','c'])c.set(id,{id,bytes:6});c.endFrame();
 assert.equal(c.bytes,18);assert.equal(c.stats().overBudgetBytes,8);assert.deepEqual(released,[]);
 c.beginFrame(['a']);c.endFrame();assert.equal(c.get('a')?.id,'a');assert.equal(c.bytes,6);assert.deepEqual(released,['b','c']);
 c.beginFrame([]);c.endFrame();assert.equal(c.stats().activeActors,0);assert.ok(c.bytes<=10);
});

test('a preview actor loaded asynchronously after endFrame stays pinned until the next cohort',()=>{
 const released=[],c=cache({maxActors:1,budget:8,release:a=>released.push(a.id)});
 c.beginFrame(['live']);c.set('live',{id:'live',bytes:4});c.markActive('preview');c.endFrame();
 c.set('preview',{id:'preview',bytes:4});assert.equal(c.get('live')?.id,'live');assert.equal(c.get('preview')?.id,'preview');assert.deepEqual(released,[]);
 c.beginFrame(['live']);c.endFrame();assert.deepEqual(released,['preview']);assert.equal(c.frameOpen,false);
});
test('a continuing preview can rejoin the new frame before inactive pruning',()=>{
 const released=[],c=cache({maxActors:1,budget:8,release:a=>released.push(a.id)});
 c.beginFrame(['live']);c.markActive('preview');c.set('live',{id:'live',bytes:4});c.set('preview',{id:'preview',bytes:4});c.endFrame();
 c.beginFrame(['live']);assert.equal(c.get('preview')?.id,'preview');c.markActive('preview');c.endFrame();assert.deepEqual(released,[]);
});

test('inactive resident models use LRU disposal and configuration cleanup releases each model once',()=>{
 const released=[],c=cache({maxActors:2,budget:20,release:a=>released.push(a.id)});
 for(const id of ['a','b'])c.set(id,{id,bytes:5});c.get('a');c.set('c',{id:'c',bytes:5});
 assert.equal(c.get('b'),undefined);assert.equal(c.get('a')?.id,'a');assert.deepEqual(released,['b']);
 c.clear();assert.deepEqual(released,['b','c','a']);assert.equal(c.bytes,0);assert.equal(c.size,0);
});

function drawingContext(c){
 const context={RoyaleModern3D:{beginFrame:ids=>c.beginFrame(ids),endFrame:()=>c.endFrame(),has:id=>id?.startsWith('hero')},RoyaleCore:{},RoyaleBattleView:{layout:{height:640},viewport:{x:0,y:0,width:540,height:640},camera:{x:0,y:0,scale:1}},RoyaleNative:{library:{drawArena(){throw Error('deliberate renderer failure');}}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/draw.js'),'utf8'),context);return context;
}
test('battle drawing pins every present actor before arena rendering and closes the frame on an error',()=>{
 const c=cache(),r=drawingContext(c),canvas=new Proxy({},{get:()=>()=>{}}),units=[{entity:'hero1',present:true},{entity:'hero2',present:true},{entity:'heroGone',present:false}];
 assert.throws(()=>r.RoyaleDraw.battle(canvas,{units,towers:[],isPresent:u=>u.present},0,null,null),/deliberate renderer failure/);
 assert.deepEqual([...c.active],['hero1','hero2']);assert.equal(c.frameOpen,false);
});
test('menu and Potato rendering clear the former battle cohort',()=>{
 const c=cache(),r=drawingContext(c),canvas=new Proxy({},{get:()=>()=>{}});r.RoyaleNative.library.ready=false;
 c.beginFrame(['hero1']);c.endFrame();r.RoyaleDraw.diorama(canvas);assert.equal(c.active.size,0);
 c.beginFrame(['hero2']);c.endFrame();r.RoyaleGraphics={current:{potato:true}};r.RoyalePotato={draw:()=>true};
 assert.equal(r.RoyaleDraw.battle(canvas,{units:[]},0,null,null),true);assert.equal(c.active.size,0);assert.equal(c.frameOpen,false);
});
