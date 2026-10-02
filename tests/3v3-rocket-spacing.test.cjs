'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core'),L=require('../src/arena-layout'),Nav=require('../src/navigation'),V=require('../src/battle-view'),Native=require('../src/native'),Cos=require('../src/cosmetics');
const THEMES=['Team3v3','Team3v3Jungle','Team3v3Volcano'];
const battle=id=>new C.Battle({mode:'Team3v3',arenaId:id,ai:false,headless:true,seed:17,queue:'challenge'});
const princess=(b,team)=>b.towers.filter(t=>!t.king&&t.team===team).sort((x,y)=>x.crownSlot-y.crownSlot);
function impact(b,team,x,y){const row=princess(b,team),before=row.map(t=>t.hp);b.projectileImpact({name:'RocketSpell',team:1-team,owner:1-team,x:x*C.SX,y:y*C.SY,level:9,vx:0,vy:team?-1:1,attacker:null},null);return row.map((t,i)=>before[i]-t.hp);}

test('every 3v3 theme moves only the outer Princess towers two tiles outwards',()=>{
 for(const id of THEMES){const b=battle(id),l=L.get(id);a.equal(b.arenaLayout.id,id);a.deepEqual(l.princessXs,[1.5,9,16.5]);a.ok(Object.isFrozen(l.princessXs));a.deepEqual(l.lanes,[3.5,9,14.5]);a.deepEqual(l.bridges,[{left:2.25,right:4.75},{left:7.75,right:10.25},{left:13.25,right:15.75}]);a.deepEqual([l.left,l.right,l.top,l.bottom],[0,18,-2,34]);
  for(const team of [0,1]){const row=princess(b,team);a.deepEqual(row.map(t=>t.x/C.SX),[1.5,9,16.5]);a.ok(row.every(t=>t.y/C.SY===(team?6.5:25.5)));for(const tower of row){a.equal(tower.crownSlot,l.princessXs.indexOf(tower.x/C.SX));a.equal(b.seatSlots[tower.owner],tower.crownSlot);a.equal(tower.owner%2,team);a.equal(b.towers.filter(t=>t.king&&t.owner===tower.owner).length,1);a.ok(L.boundsClear(tower.x/C.SX,tower.y/C.SY,tower.def.radiusTiles,id));}}
  a.deepEqual(b.towers.filter(t=>t.king&&t.team===1).map(t=>[t.x,t.y]),[[5.6*C.SX,1.5*C.SY],[9*C.SX,1.5*C.SY],[12.4*C.SX,1.5*C.SY]]);
 }
});

test('a real Rocket impact cannot damage two Princess towers at any adjacent midpoint, on either side',()=>{
 for(const id of THEMES)for(const team of [0,1])for(const pair of [[0,1],[1,2],[0,2]]){const b=battle(id),row=princess(b,team),x=(row[pair[0]].x+row[pair[1]].x)/2/C.SX,y=row[0].y/C.SY,damage=impact(b,team,x,y);a.ok(damage.filter(n=>n>0).length<=1,`${id} team ${team} pair ${pair}: ${damage}`);if(pair[1]-pair[0]===1)a.deepEqual(damage,[0,0,0],'adjacent midpoint lies outside both hitboxes');}
});

test('actual Rocket damage reaches one Princess when aimed at her center or hitbox edge',()=>{
 const radius=C.DATA.projectiles.RocketSpell.Radius/1000;a.equal(radius,2);
 for(const id of THEMES)for(const team of [0,1])for(let slot=0;slot<3;slot++)for(const offset of [0,radius+1-.001]){const b=battle(id),row=princess(b,team),damage=impact(b,team,row[slot].x/C.SX,row[slot].y/C.SY+(team?1:-1)*offset);a.equal(row[slot].def.radiusTiles,1);const r=C.DATA.projectiles.RocketSpell;a.equal(damage[slot],Math.floor(C.scaled(r.Damage,r.Rarity,9)*(100+r.CrownTowerDamagePercent)/100));a.equal(damage.filter(n=>n>0).length,1,`${id} team ${team} slot ${slot}`);}
});

test('strict pair separation proves no Rocket center can intersect two Princess hitboxes at any level',()=>{
 // Triangle inequality: a double hit needs distance <= (Rocket + first body) + (Rocket + second body).
 const radius=C.DATA.projectiles.RocketSpell.Radius/1000;
 for(const id of THEMES)for(const team of [0,1])for(let level=1;level<=C.MAX_CARD_LEVEL;level++){const row=L.towers(team,id).filter(t=>t[0]==='PrincessTower'),body=C.entityDef('PrincessTower',level).radiusTiles;for(let i=0;i<row.length;i++)for(let j=i+1;j<row.length;j++){const distance=Math.hypot(row[i][1]-row[j][1],row[i][2]-row[j][2]);a.ok(distance>2*radius+2*body,`${id} team ${team}, level ${level}`);}}
});

test('outer towers leave swept routes from behind every crown to the unchanged bridges for the largest bodies',()=>{
 for(const id of THEMES){const b=battle(id),ob=b.towers.map(t=>({id:t.id,x:t.x/C.SX,y:t.y/C.SY,radius:t.def.radiusTiles})),free={layout:id},r=1;for(const tower of b.towers){const dir=tower.team?1:-1,start={x:tower.x/C.SX,y:tower.y/C.SY-dir*(tower.def.radiusTiles+r+.1)},target={x:b.arenaLayout.lanes[L.lane(start.x,id)],y:16,radius:0};a.ok(Nav.pointClear(start,r,ob,free),`${id} legal rear ${tower.id}`);const path=Nav.route(start,target,r,1.1,ob,free);a.ok(path.length,`${id} route ${tower.id}`);let prev=start;for(const next of path){a.ok(Nav.segmentClear(prev,next,r,ob,free),`${id} sweep ${tower.id}`);prev=next;}a.ok(Math.hypot(prev.x-target.x,prev.y-target.y)<=1.11,`${id} gets past row ${tower.id}`);}}
});

function arenaFixture(){const calls=[],ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args]),set:(o,k,v)=>(o[k]=v,true)}),root={RoyaleGraphics:{current:{arenaScale:1,textureScale:1,arenaAnimated:true}},document:{createElement:()=>({width:0,height:0,getContext:()=>ctx})}};root.globalThis=root;vm.runInNewContext(fs.readFileSync(require.resolve('../src/custom-arena'),'utf8'),root);return{root,calls};}
test('all themed floors, foundations and native tower anchors share the new Princess coordinates',()=>{
 for(const id of THEMES){const {root,calls}=arenaFixture(),b=battle(id),l=b.arenaLayout,cv=root.RoyaleCustomArena.prepare(b,null);a.equal(cv.foundations.length,b.towers.length);a.equal(cv.crossings,3);for(const tower of b.towers){a.ok(cv.foundations.some(f=>f.entity===tower.entity&&f.team===tower.team&&Math.abs(f.x-tower.x)<1e-9&&Math.abs(f.y-tower.y)<1e-9),`${id} foundation ${tower.id}`);a.equal(Native.towerArtPosition(tower).x,tower.x);}a.ok(calls.some(c=>c[0]==='fillRect'&&Math.abs(c[1]-l.left*C.SX)<1e-6&&c[2]===l.top*C.SY&&Math.abs(c[3]-(l.right-l.left)*C.SX)<1e-6&&c[4]===(l.bottom-l.top)*C.SY),'floor reaches all playable bounds');}
});

test('native Princess sprite assemblies for every available skin remain inside both camera compositions',()=>{
 const data=require('../assets/native/data.json'),skinScene=require('../assets/tower-skins/scene.json'),classic=new Native.Scene(data.scenes.building_tower,[]),skins=new Native.Scene(skinScene,[]),actor=new Native.Scene(data.scenes.chr_princess,[]),extents=[];
 for(const team of [0,1])for(const skin of Cos.towerSkins){const sc=skin.scene==='tower_skins'?skins:skin.scene?new Native.Scene(data.scenes[skin.scene],[]):classic,names=skin.scene?[skin.exports.princessBase[team],skin.exports.princessTop?.[team]].filter(Boolean):[`StarTower_base_${team?'red':'blue'}`,`StarTower_top_${team?'red':'blue'}`],boxes=names.map(n=>{a.ok(sc.clip(n),'native skin export '+n);return sc.bounds(n,0);});for(let dir=1;dir<=9;dir++)for(const state of ['idle','attack']){const name=`princess_tower${team?'_red':''}_${state}1_${dir}`,clip=actor.clip(name);a.ok(clip,'native Princess export '+name);for(let f=0;f<clip.frames.length;f++){const q=actor.bounds(name,f/clip.fps),y=q.y-Native.towerAttachmentOffset({def:C.entityDef('PrincessTower',9)});boxes.push({...q,y},{...q,x:-q.x-q.width,y});}}extents.push({team,skin:skin.id,left:Math.min(...boxes.map(q=>q.x)),right:Math.max(...boxes.map(q=>q.x+q.width)),top:Math.min(...boxes.map(q=>q.y)),bottom:Math.max(...boxes.map(q=>q.y+q.height))});}
 try{for(const id of THEMES)for(const compact of [false,true]){V.configure({arenaId:id,compact});for(const tower of battle(id).towers.filter(t=>!t.king)){const pos=Native.towerArtPosition(tower);for(const box of extents.filter(q=>q.team===tower.team)){const lo=V.toScreen({x:pos.x+box.left*5/6,y:pos.y+box.top*5/6}),hi=V.toScreen({x:pos.x+box.right*5/6,y:pos.y+box.bottom*5/6});a.ok(lo.x>=0&&hi.x<=V.viewport.width&&lo.y>=0&&hi.y<=V.viewport.height,`${id} compact ${compact}, slot ${tower.crownSlot}, team ${tower.team}, ${box.skin}: ${JSON.stringify({lo,hi})}`);}}}}finally{V.configure({compact:false,arenaId:'training'});}
});

test('Classic, Bridge and Rumble tower placement keeps its existing coordinates',()=>{
 for(const id of ['classic','BridgeBattle','BridgeBattleLava','BridgeBattleGarden','TeamRumble','TeamRumbleArcReverse','TeamRumbleRiverLine']){const l=L.get(id);a.equal(l.princessXs,undefined);for(const team of [0,1])a.deepEqual(L.towers(team,id).filter(t=>t[0]==='PrincessTower').map(t=>t[1]),l.lanes);}
});
