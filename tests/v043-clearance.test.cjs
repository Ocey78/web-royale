'use strict';
const test=require('node:test'),a=require('node:assert/strict'),C=require('../src/core'),L=require('../src/arena-layout'),N=require('../src/navigation'),G=require('../src/arena-grid'),V=require('../src/battle-view');
const battle=mode=>new C.Battle({mode,ai:false,headless:true,seed:17,queue:'challenge'});
const obstacles=b=>b.towers.map(t=>({id:t.id,x:t.x/C.SX,y:t.y/C.SY,radius:t.def.radiusTiles}));
test('3v3 rows stay aligned and Rumble arches stay mirrored on both teams',()=>{
 for(const id of ['Team3v3','TeamRumble']){const b=battle(id),row=b.towers.filter(t=>!t.king&&t.team===1);a.equal(new Set(row.map(t=>t.y)).size,id==='TeamRumble'?3:1,id);for(const t of row){const mirror=b.towers.find(u=>u.team===0&&u.crownSlot===t.crownSlot&&!u.king);a.equal(mirror.y+t.y,32*C.SY);a.equal(mirror.x,t.x);}}
});
test('Rumble gains real rear space and side clearance without shrinking bodies',()=>{
 const b=battle('TeamRumble'),l=b.arenaLayout;a.ok(l.top<0&&l.bottom>32);a.equal(l.top+l.bottom,32);a.ok(l.left<0&&l.right>18);a.equal(l.left+l.right,18);
 const ob=obstacles(b);for(const x of [l.left+1.25,l.right-1.25])a.ok(N.segmentClear({x,y:-.75},{x,y:32.75},1,ob,{layout:l.id}));
 for(const id of ['GiantSkeleton',C.CARD_BY_ID.sparky.entity,'Giant','Golem','Pekka'])a.equal(b.entityDefinition(id,9).radiusTiles,C.entityDef(id,9).radiusTiles);
});
test('largest bodies behind every Rumble tower have a swept route into midfield',()=>{
 const b=battle('TeamRumble'),ob=obstacles(b);for(const tower of b.towers){const r=1,dir=tower.team?1:-1,start={x:tower.x/C.SX,y:tower.y/C.SY-dir*(tower.def.radiusTiles+r+.1)},target={x:start.x,y:16,radius:0},free={layout:'TeamRumble'};
 a.ok(N.pointClear(start,r,ob,free),'legal rear start '+tower.id);const path=N.route(start,target,r,1.1,ob,free);a.ok(path.length,'rear route '+tower.id);let prev=start;for(const next of path){a.ok(N.segmentClear(prev,next,r,ob,free),'swept rear route '+tower.id);prev=next;}a.ok(Math.hypot(prev.x-target.x,prev.y-target.y)<=1.11,'reaches midfield '+tower.id);
 }
});
test('Rumble extended deployment tiles and entities are not clamped to the old map',()=>{
 const b=battle('TeamRumble');const card=C.cardAt('knight',9);
 for(const [team,x,y] of [[0,-.5,33],[1,18.5,-1]]){const s=require('../src/placement').snapCard(b,team,card,x*C.SX,y*C.SY,team);a.ok(s.ok,s.reason);a.ok((team===0?s.y>32*C.SY:s.y<0));const u=b.spawn('Knight',team,s.x,s.y,{wait:0});a.equal(u.x,s.x);a.equal(u.y,s.y);a.ok(G.terrainFits(u.x,u.y,u.def.radiusTiles,{ignoreTowers:true,layout:'TeamRumble'}));}
});
test('custom board camera input covers the enlarged floor with no hand overlap',()=>{for(const compact of [true,false]){V.configure({compact,arenaId:'TeamRumble'});const l=L.get('TeamRumble');for(const x of [l.left+.1,l.right-.1])for(const y of [l.top+.1,l.bottom-.1]){const p={x:x*C.SX,y:y*C.SY},s=V.toScreen(p);a.ok(s.x>0&&s.x<V.layout.width&&s.y>=0&&s.y<V.layout.handTop,'board fits');a.ok(V.onBoard(s));a.ok(Math.abs(V.toWorld(s).y-p.y)<1e-7);}}V.configure({compact:false,arenaId:'training'});});
test('Bridge has a real outboard route past the King for the largest ground body',()=>{const b=battle('BridgeBattle'),ob=obstacles(b),l=b.arenaLayout,r=1;for(const x of [l.left+1.1,l.right-1.1])a.ok(N.segmentClear({x,y:1.1},{x,y:12},r,ob,{layout:l.id}),'Bridge side corridor');});
test('Sandbox accepts extended Rumble corners without teleporting placements to old borders',()=>{const S=require('../src/sandbox'),s=new S.Session({mapId:'TeamRumble'});a.equal(s.spawn({card:'knight',team:0,x:-.5*C.SX,y:33*C.SY}).ok,true);a.ok(s.battle.pending.length||s.battle.units.length);});
test('largest bodies have routes behind every 3v3 and Bridge tower, not just Rumble',()=>{
 for(const mode of ['Team3v3','BridgeBattle']){const b=battle(mode),ob=obstacles(b),r=1,free={layout:mode};for(const tower of b.towers){const dir=tower.team?1:-1,start={x:tower.x/C.SX,y:tower.y/C.SY-dir*(tower.def.radiusTiles+r+.1)},target={x:b.arenaLayout.lanes[L.lane(start.x,mode)],y:16,radius:0};a.ok(N.pointClear(start,r,ob,free),'legal rear '+mode+':'+tower.id);const path=N.route(start,target,r,1.1,ob,free);a.ok(path.length,'rear route '+mode+':'+tower.id);let prev=start;for(const next of path){a.ok(N.segmentClear(prev,next,r,ob,free),'sweep '+mode+':'+tower.id);prev=next;}a.ok(Math.hypot(prev.x-target.x,prev.y-target.y)<=1.11,'gets past row '+mode+':'+tower.id);}}
});
test('air units in narrow Bridge mode keep their outboard movement permission',()=>{const b=battle('BridgeBattle'),u=b.spawn('BabyDragon',0,3*C.SX,24*C.SY,{wait:0});a.equal(u.x,3*C.SX);b.push(u,-C.SX,0,.3,true);a.ok(u.x<3*C.SX,'flight is not clamped to narrow ground corridor');});
