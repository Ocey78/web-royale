'use strict';
const test=require('node:test'),a=require('node:assert/strict'),C=require('../src/core.js'),G=require('../src/arena-grid.js');
const deck=id=>[id,...C.DEFAULT_DECK.filter(x=>x!==id)].slice(0,8);
const tiles=u=>({x:u.x/C.SX,y:u.y/C.SY});
function clear(b,u){a.ok(G.terrainFits(u.x,u.y,u.def.radiusTiles,{ignoreTowers:true,allowWater:u.air||u.def.hover||u.def.source.JumpEnabled}),u.entity+' terrain '+JSON.stringify(tiles(u)));for(const t of b.towers)if(t.hp>0)a.ok(Math.hypot((u.x-t.x)/C.SX,(u.y-t.y)/C.SY)>=u.def.radiusTiles+t.def.radiusTiles-1e-6,u.entity+' inside '+t.entity);}
for(const id of ['goblins','guards','skeleton-army','rascals','royal-recruits','barbarians','archers'])test('v038 real '+id+' deployment uses every adjusted preview position',()=>{
 for(const team of [0,1])for(const [x,y]of [[1.5,17.5],[3.5,26.5],[9.5,17.5],[16.5,18.5]]){
 const b=new C.Battle({ai:false,headless:true,deck:deck(id),enemyDeck:deck(id)}),yy=team?32-y:y;b.elixir[team]=10;
 const preview=b.placementPreview(team,0,x*C.SX,yy*C.SY);if(!preview.ok)continue;
 a.equal(b.deploy(team,0,x*C.SX,yy*C.SY).ok,true);const us=b.units.filter(u=>u.card===id);
 a.equal(us.length,preview.members.length);us.forEach((u,i)=>{a.ok(Math.hypot(u.x-preview.members[i].x,u.y-preview.members[i].y)<1e-7,`${id} member ${i} differs from preview`);clear(b,u);});
 }
});
for(const team of [0,1])test('v038 old bank-stranded troop walks back onto terrain and crosses a bridge team '+team,()=>{
 const b=new C.Battle({ai:false,headless:true}),u=b.spawn('Goblin',team,1.5*C.SX,(team?15:17)*C.SY,{wait:0}),t=b.towers.find(t=>t.team!==team&&!t.king);let previous={x:u.x,y:u.y};
 for(let i=0;i<1700&&C.edge(u,t)>u.def.range+1e-7;i++){b.time+=1/60;b.move(u,t,1/60);a.ok(Math.hypot((u.x-previous.x)/C.SX,(u.y-previous.y)/C.SY)<=u.def.speedTiles/60+1e-5,'recovery must not teleport');previous={x:u.x,y:u.y};}
 a.ok(C.edge(u,t)<=u.def.range+.01,JSON.stringify(tiles(u)));clear(b,u);
});
test('v038 static tower routes are reused instead of recomputing every 650ms',()=>{
 const b=new C.Battle({ai:false,headless:true}),u=b.spawn('Knight',0,9*C.SX,24*C.SY,{wait:0}),t=b.towers.find(t=>t.team===1&&!t.king);b.spawn('Cannon',0,9*C.SX,21*C.SY,{wait:0});
 for(let i=0;i<900;i++){b.time+=1/60;b.move(u,t,1/60);}
 a.ok(b.navigator.searches<=4,'unnecessary A* searches: '+b.navigator.searches);a.ok(u.y<18*C.SY);
});
for(const team of [0,1])test('v038 Goblin Barrel spreads three goblins around each tower, not through it team '+team,()=>{
 for(const king of [false,true])for(const lane of [0,1]){
 const b=new C.Battle({ai:false,headless:true}),t=b.towers.filter(t=>t.team!==team&&t.king===king)[king?0:lane];
 b.projectileImpact({name:'GoblinBarrelSpell',team,owner:team,x:t.x,y:t.y,level:9,vx:0,vy:team?1:-1},null);
 const us=b.units.filter(u=>u.entity==='Goblin');a.equal(us.length,3);us.forEach(u=>clear(b,u));
 const [p,q,r]=us.map(tiles),area=Math.abs((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x));a.ok(area>2,'barrel is a line instead of a triangle');a.ok(us.every(u=>Math.abs(u.wait-1.1)<1e-7));
 a.equal(new Set(us.map(u=>u.levelGroupId)).size,1);
 }
});
test('v038 Goblin Barrel landing by banks, arena walls, and a building gives legal separated bodies',()=>{
 for(const [x,y]of [[.25,.5],[17.75,31.5],[9,16],[4.5,17],[3.5,6],[9,20]]){const b=new C.Battle({ai:false,headless:true});const cannon=b.spawn('Cannon',1,9*C.SX,20*C.SY,{wait:0});b.projectileImpact({name:'GoblinBarrelSpell',team:0,x:x*C.SX,y:y*C.SY,level:9,vx:0,vy:-1},null);const us=b.units.filter(u=>u.entity==='Goblin');a.equal(us.length,3);us.forEach(u=>{clear(b,u);a.ok(C.edge(u,cannon)>=0);a.ok(Math.hypot((u.x-cannon.x)/C.SX,(u.y-cannon.y)/C.SY)>=u.def.radiusTiles+cannon.def.radiusTiles-1e-6);});for(let i=0;i<us.length;i++)for(let j=i+1;j<us.length;j++)a.ok(Math.hypot((us[i].x-us[j].x)/C.SX,(us[i].y-us[j].y)/C.SY)>=us[i].def.radiusTiles+us[j].def.radiusTiles-1e-6);}
});
test('v038 Mirror uses the mirrored troop safe placement rather than a spell anchor',()=>{
 const b=new C.Battle({ai:false,headless:true,deck:deck('mirror')});b.hand[0][0]='mirror';b.lastCard[0]={id:'goblins',cost:2,level:9};b.elixir[0]=10;
 const preview=b.placementPreview(0,0,1.5*C.SX,17.5*C.SY);a.equal(preview.ok,true);a.equal(b.deploy(0,0,1.5*C.SX,17.5*C.SY).ok,true);
 const us=b.units.filter(u=>u.card==='goblins');a.equal(us.length,preview.members.length);us.forEach((u,i)=>{a.equal(u.x,preview.members[i].x);a.equal(u.y,preview.members[i].y);clear(b,u);});
});
test('v038 an exhausted cached detour retries after a bounded delay',()=>{
 const b=new C.Battle({ai:false,headless:true}),u=b.spawn('Knight',0,9*C.SX,21*C.SY,{wait:0}),t=b.towers.find(t=>t.team===1&&!t.king);
 b.navigator.refresh(b);u.navPath={revision:b.navigator.revision,targetId:t.id,target:{x:t.x/C.SX,y:t.y/C.SY,radius:t.def.radiusTiles},expires:Infinity,path:[]};
 a.equal(b.navigator.next(b,u,t),null);a.ok(Number.isFinite(u.navPath.expires),'a consumed path must not strand the troop indefinitely');a.ok(u.navPath.expires<=b.time+.3);
 b.time+=.3;a.ok(b.navigator.next(b,u,t));a.equal(b.navigator.searches,1);
});
