const test=require('node:test'),assert=require('node:assert/strict');
const Ground=require('../src/spell-ground');
const area=(name='Rage',radius=5)=>({id:73,name,x:240,y:250,radius,born:2,ends:10,team:0});
test('ground fields honor the battle radius, lifetime, and floor projection',()=>{
 for(const name of ['Rage','Poison','Graveyard','Freeze']){
  const a=area(name,3.7);assert.equal(Ground.state(a,1.99),null);assert.equal(Ground.state(a,10),null);
  const s=Ground.state(a,4);assert.equal(s.rx,3.7*480/18);assert.equal(s.ry,3.7*20);assert.equal(s.age,2);assert.equal(s.opacity,1);
  assert.ok(Ground.state(a,2.04).opacity<1);assert.ok(Ground.state(a,9.9).opacity<1);
 }
 assert.equal(Ground.state(area('Tornado'),4),null);assert.equal(Ground.state(area('Rage',0),4),null);
});
test('area particles populate the interior without snapping travel onto the perimeter',()=>{
 const a=area('Graveyard',4),p={born:1,age:1,theta:.3,travel:800,x:999,y:999,z:40,scale:1,alpha:1};
 const samples=Array.from({length:120},(_,i)=>Ground.placement(a,'graveyard_dark_partivles',{...p,born:i*.05},'effect',i));
 const r=a.radius*480/18,lengths=samples.map(v=>Math.hypot(v.x,v.y/.75)/r);
 assert.ok(lengths.every(v=>v<.93));assert.ok(lengths.filter(v=>v<.5).length>20);
 assert.ok(lengths.filter(v=>v>.8).length<40,'particles must not collect on one edge radius');
 assert.ok(new Set(lengths.map(v=>v.toFixed(3))).size>90);
 const stationary=Ground.placement(a,'graveyard_dark_partivles',{...p,travel:0},'effect',4);
 const moving=Ground.placement(a,'graveyard_dark_partivles',p,'effect',4);
 assert.ok(Math.hypot(stationary.x-moving.x,(stationary.y-moving.y)/.75)<=r*.15+1e-8);
});
test('a particle birth keeps its placement when render order or age changes',()=>{
 const a=area('Rage'),p={born:.734,age:.2,theta:1,travel:0,z:20,scale:.7,alpha:.6};
 const first=Ground.placement(a,'Spell_rage_sparkle1_loop',p,'seed',3);
 const later=Ground.placement(a,'Spell_rage_sparkle1_loop',{...p,age:.9},'seed',99);
 assert.deepEqual(first,later);assert.deepEqual(first,Ground.placement(a,'Spell_rage_sparkle1_loop',p,'seed',3));
 assert.notDeepEqual(first,Ground.placement({...a,id:74},'Spell_rage_sparkle1_loop',p,'seed',3));
 assert.equal(Ground.placement(a,'unknown',p,'seed',3),null);
});
test('poison replaces dense legacy skull emitters with a bounded native-art decoration',()=>{
 for(const name of ['Poison_skull1','Poison_big_skull'])assert.equal(Ground.policy(name).replace,true);
 const s=Ground.state(area('Poison'),4),d=Ground.decorations(area('Poison'),s);
 assert.ok(d.length>=1&&d.length<=3);assert.ok(d.every(x=>x.name==='poison_skull'&&x.alpha<=.30&&x.scale<=.35));
 assert.deepEqual(d,Ground.decorations(area('Poison'),s));
});
test('unrelated spells, expired areas, and above-unit passes do not paint a field',()=>{
 const calls=[],c=new Proxy({canvas:{width:540,height:700}}, {get:(o,k)=>o[k]??((...args)=>calls.push([k,...args]))});
 assert.equal(Ground.draw(c,area('Rage'),4,'above'),false);assert.equal(Ground.draw(c,area('Poison'),11,'ground'),false);assert.equal(Ground.draw(c,area('Tornado'),4,'ground'),false);assert.deepEqual(calls,[]);
});
test('Zap soft flare and soot are short-lived floor effects',()=>{
 const stops=[],c={save(){},restore(){},translate(){},scale(){},beginPath(){},arc(){},fill(){},createRadialGradient:()=>({addColorStop:(n,color)=>stops.push(color)})};
 assert.equal(Ground.zap(c,240,250,.15,'above'),false);assert.equal(Ground.zap(c,240,250,1.21,'ground'),false);assert.equal(stops.length,0);
 assert.equal(Ground.zap(c,240,250,.15,'ground'),true);assert.ok(stops.some(s=>s.includes('180,228,255')));stops.length=0;Ground.zap(c,240,250,.65,'ground');assert.ok(stops.some(s=>s.includes('37,44,52')));assert.ok(stops.every(s=>!s.includes('180,228,255')));
});
