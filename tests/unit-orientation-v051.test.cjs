'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),N=require('../src/native.js'),D=require('../assets/native/data.json');

function recorder(id,overrides={}){
 const library=new N.Library({...D,units:{...D.units,[id]:{...D.units[id],...overrides}}}),cfg=library.data.units[id],data=D.scenes[cfg.scene],drawn=[];
 let xScale=1;const stack=[],ctx={save(){stack.push(xScale);},restore(){xScale=stack.pop();},translate(){},scale(x){xScale*=x;}};
 library.scenes[cfg.scene]={data,id:name=>data.exports[name],clip(name){return data.clips[data.exports[name]];},duration(name){const c=this.clip(name);return c.frames.length/c.fps;},draw(c,name,time,options){drawn.push({name,time,xScale,options});}};
 return {draw(team,state,heading,time=.08){drawn.length=0;assert.equal(library.unit(ctx,id,0,0,team,time,state,heading,0,1),true);return drawn[0];}};
}

for(const id of ['MovingCannon','ZapMachine','BrokenCannon','DartBarrell','flying-machine'])test(id+' resolves all eighteen source directional views',()=>{
 const r=recorder(id);
 for(const team of [0,1])for(const state of (id==='BrokenCannon'?['idle','attack']:['idle','run','attack']))for(const [heading,index]of [[-Math.PI/2,1],[0,10],[Math.PI/2,18],[Math.PI,10]]){
  const p=r.draw(team,state,heading);
  assert.ok(p.name.endsWith('_'+index),team+':'+state+' heading '+heading+' selected '+p.name);
  assert.equal(p.xScale<0,heading===Math.PI,'Only leftward views are reflected');
  assert.equal(p.options.frame,undefined,'Directional clips must retain their animation clock');
 }
});

test('missing southward red Flying Machine idle keeps the red animated facing',()=>{
 const p=recorder('flying-machine').draw(1,'idle',Math.PI/2);
 assert.equal(p.name,'flying_machine_red_run1_18');assert.equal(p.time,.08);assert.equal(p.options.loop,true);
});

test('immobile Broken Cannon retains its authored single-view run clip when requested',()=>{
 for(const team of [0,1])for(const heading of [0,Math.PI/2,Math.PI])assert.equal(recorder('BrokenCannon').draw(team,'run',heading).name,D.units.BrokenCannon.prefix[team]+'_run1_1');
});

test('directional idle views cannot replace a spirit\'s authored single-view attack',()=>{
 for(const id of ['ElectroSpirit','HealSpirit'])for(const team of [0,1])for(const heading of [0,Math.PI/2,Math.PI]){
  const p=recorder(id).draw(team,'attack',heading);assert.equal(p.name,D.units[id].prefix[team]+'_attack1_1');assert.equal(p.options.loop,false);assert.equal(p.options.frame,undefined);assert.equal(p.time,.08);
 }
});

test('Mortar uses its five source directions and reflects leftward targets',()=>{
 const r=recorder('Mortar');for(const team of [0,1])for(const [heading,index]of [[-Math.PI/2,1],[0,3],[Math.PI/2,5],[Math.PI,3]]){
  const p=r.draw(team,'idle',heading);assert.ok(p.name.endsWith('_'+index),p.name);assert.equal(p.xScale<0,heading===Math.PI);
 }
});

test('Cannon and Xbow retain nested nineteen-frame rotation lookup',()=>{
 for(const id of ['Cannon','Xbow']){const r=recorder(id);for(const team of [0,1])for(const [heading,frame]of [[-Math.PI/2,0],[0,9],[Math.PI/2,18],[Math.PI,9]]){
  const p=r.draw(team,'idle',heading);assert.equal(p.options.frame,frame);assert.equal(p.time,frame/30);assert.equal(p.xScale<0,heading===Math.PI);
 }}
});

test('ordinary nine-view troops retain their source clips and moving animation time',()=>{
 const r=recorder('Knight');for(const team of [0,1])for(const [heading,index]of [[-Math.PI/2,1],[0,5],[Math.PI/2,9],[Math.PI,5]]){
  const p=r.draw(team,'run',heading,.2);assert.ok(p.name.endsWith('_'+index));assert.equal(p.xScale<0,heading===Math.PI);assert.equal(p.options.frame,undefined);assert.equal(p.time,.2);
 }
});

test('charge and dash retain the directional movement fallback',()=>{
 const r=recorder('Knight');for(const state of ['charge','dash'])for(const team of [0,1]){
  const p=r.draw(team,state,Math.PI/2,.2);assert.ok(p.name.endsWith('_run1_9'),p.name);assert.equal(p.options.frame,undefined);
 }
});
test('an atlas authored with a reversed model axis uses its explicit heading offset',()=>{const r=recorder('Knight',{headingOffset:Math.PI});for(const team of [0,1]){assert.ok(r.draw(team,'idle',-Math.PI/2).name.endsWith('_9'));assert.ok(r.draw(team,'idle',Math.PI/2).name.endsWith('_1'));assert.equal(r.draw(team,'idle',0).xScale<0,true);assert.equal(r.draw(team,'idle',Math.PI).xScale<0,false);}});
test('source knockback elevation uses the authored world height while ground idle stays grounded',()=>{assert.equal(N.entityElevation({modernKnockbackHeight:4500,def:{source:{}}}),90);assert.equal(N.entityElevation({modernKnockbackHeight:0,def:{source:{}}}),0);});
test('hero fallback prewarm uses the page for the authored offset and initial team heading',async()=>{
 const names=[],exports={},cfg={scene:'hero',prefix:['hero_blue','hero_red'],headingOffset:Math.PI,variants:{shield:{prefix:['hero_shield_blue','hero_shield_red']}}};for(const team of [...cfg.prefix,...cfg.variants.shield.prefix])for(let i=1;i<=18;i++)exports[team+'_idle1_'+i]=i;const sc={data:{exports},lazyLoader:true,prewarm:async name=>names.push(name)},lib=Object.create(N.Library.prototype);lib.data={units:{Hero:cfg}};lib.scenes={hero:sc};await lib.prewarmBattleActors({initialDecks:[],seatForms:[['hero'],['hero']],teamOf:s=>s,formRegistry:{get:()=>({kind:'hero',source:{SummonCharacter:'Hero'}})}});assert.deepEqual(names,['hero_blue_idle1_18','hero_red_idle1_1']);
});
test('authored frame labels constrain the skeleton barrel loop and its source transition',()=>{const clip={fps:10,frames:Array(30).fill([]),labels:Array(30).fill('')};clip.labels[2]='full_start';clip.labels[6]='full_end';clip.labels[10]='pop_start';clip.labels[14]='pop_end';const u={modernFrameRange:{start:'full_start',end:'full_end',born:0,transition:{start:'pop_start',end:'pop_end',born:1,until:2}}};assert.deepEqual(N.frameRangePose(clip,u,1.5),{frame:12});assert.deepEqual(N.frameRangePose(clip,u,2),{frame:2});assert.deepEqual(N.frameRangePose(clip,u,2.2),{frame:4});assert.equal(N.frameRangePose(clip,{modernFrameRange:{start:'missing',end:'full_end'}},0),null);});
