/* Shared Clash-style placement/forecast rules used by both engine and renderer. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog,n?require('./arena-grid.js'):root.RoyaleArenaGrid,n?require('./formations.js'):root.RoyaleFormations);if(n)module.exports=api;else root.RoyalePlacement=api;})(globalThis,function(K,G,F){'use strict';
const {SX,SY,clamp,entityDef,cardAt,DATA}=K;
const edgeDistance=(a,b)=>Math.max(0,Math.hypot((a.x-b.x)/SX,(a.y-b.y)/SY)-(a.def?.radiusTiles||0)-(b.def?.radiusTiles||0));
const segmentDistance=(u,s)=>{const ax=s.x/SX,ay=s.y/SY,bx=s.x2/SX,by=s.y2/SY,px=u.x/SX,py=u.y/SY,dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy||1,t=clamp(((px-ax)*dx+(py-ay)*dy)/l2,0,1),qx=ax+t*dx,qy=ay+t*dy;return Math.hypot(px-qx,py-qy);};
function spellShape(card,x,y,team){
 const r=card?.source||{},p=DATA.projectiles[card?.projectileName]||DATA.projectiles[r.CustomFirstProjectile]||DATA.projectiles[r.Projectile]||{};
 if(card?.id==='the-log'||card?.id==='barbarian-barrel'){const dir=team===0?-1:1,range=Math.max(card.spellRange||0,(p.ProjectileRange||10000)/1000,10);return{kind:'rolling',x,y,x2:x,y2:y+dir*range*SY,width:Math.max(.55,(p.ProjectileRadius||700)/1000)};}
 if(p.ProjectileRange&&r.SpellAsDeploy){const dir=team===0?-1:1;return{kind:'line',x,y,x2:x,y2:y+dir*(p.ProjectileRange/1000)*SY,width:Math.max(.25,(p.ProjectileRadius||200)/1000)};}
 return{kind:'radial',x,y,radius:card?.radiusTiles||Math.max(.25,(r.Radius||p.Radius||1000)/1000)};
}
function bodyOverlap(battle,x,y,radius,ignoreId=null){return battle.active.some(v=>v.id!==ignoreId&&!v.air&&!v.attachedTo&&v.hp>0&&v.building&&Math.hypot((v.x-x)/SX,(v.y-y)/SY)<(v.def?.radiusTiles||0)+radius+.025);}
function snapCard(battle,team,card,x,y,seat=team){
 const layout=battle.arenaLayout?.id,a=G.layoutFor(layout);
 if(!card||!Number.isFinite(x)||!Number.isFinite(y)||x<a.left*SX||x>a.right*SX||y<a.top*SY||y>a.bottom*SY)return{ok:false,reason:'Place inside the arena',x,y,tiles:[],formation:[]};
 const r=card.source||{};
 if(card.spell&&!r.SpellAsDeploy)return{ok:true,reason:'',x:clamp(x,(a.left+.25)*SX,(a.right-.25)*SX),y:clamp(y,(a.top+.5)*SY,(a.bottom-.5)*SY),tiles:[],formation:[]};
 const tile=G.worldToTile(x,y,layout),anchor=G.tileCenter(tile.col,tile.row),cheat=seat===0&&battle.cheats?.placement;
 const allowed=(p)=>{const t=G.worldToTile(p.x,p.y,layout);return r.CanDeployOnEnemySide||G.deploymentAllowed(team,t.col,t.row,battle.towers,cheat,battle.arenaLayout?.id);};
 // Do not accept an illegal territory tap by snapping it across the river.
 if(!allowed(anchor))return{ok:false,reason:'Deploy on your side of the arena',...anchor,tiles:[],formation:[]};
 if(!r.CanPlaceOnWater&&!G.waterClear(anchor.x/SX,anchor.y/SY,0,battle.arenaLayout?.id))return{ok:false,reason:'Cannot deploy on the river',...anchor,tiles:[],formation:[]};
 const allowWater=r.CanPlaceOnWater===true,d=card.entity?entityDef(card.entity,card.level):null,radius=d?.radiusTiles||.3;
 const terrain=(p,rad)=>G.terrainFits(p.x,p.y,rad,{allowWater,ignoreTowers:true,layout:battle.arenaLayout?.id});
 const free=(p,rad)=>terrain(p,rad)&&(r.CanPlaceOnBuildings||!bodyOverlap(battle,p.x,p.y,rad));
 const candidates=[anchor];
 // Troops softly settle around a blocked tile; buildings retain deliberate grid placement.
 if(!card.building)for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dc||dr){const p=G.tileCenter(tile.col+dc,tile.row+dr);if(allowed(p))candidates.push(p);}
 candidates.sort((a,b)=>Math.hypot((a.x-x)/SX,(a.y-y)/SY)-Math.hypot((b.x-x)/SX,(b.y-y)/SY));
 for(const center of candidates){
  if(!free(center,radius))continue;
  const members=card.entity?F.cardMembers(card,center.x,center.y,team):[];
  let fits=true;
  for(const m of members){const md=entityDef(m.entity,card.level);if(free(m,md.radiusTiles)&&allowed(m))continue;
   // Keep source formation ordering, move only obstructed members towards the legal anchor.
   let found=false;for(let k=1;k<=8;k++){const q={x:m.x+(center.x-m.x)*k/8,y:m.y+(center.y-m.y)*k/8};if(free(q,md.radiusTiles)&&allowed(q)){m.x=q.x;m.y=q.y;found=true;break;}}
   if(!found){fits=false;break;}
  }
  if(fits)return{ok:true,reason:'',...center,tiles:G.footprintTiles(center.x,center.y,radius),formation:members,softAdjusted:Math.abs(center.x-anchor.x)+Math.abs(center.y-anchor.y)>.001};
 }
 return{ok:false,reason:'Cannot deploy on this tile',...anchor,tiles:G.footprintTiles(anchor.x,anchor.y,radius),formation:[]};
}
function affectedByShape(u,shape){if(shape.kind==='radial')return Math.hypot((u.x-shape.x)/SX,(u.y-shape.y)/SY)<=shape.radius+(u.def?.radiusTiles||0);return segmentDistance(u,shape)<=shape.width+(u.def?.radiusTiles||0);}
function forecastPlacement(battle,seat,slot,x,y){
 const original=battle.card(seat,slot),card=original?.mirrorCard?{...cardAt(original.mirrorCard,Math.min(30,original.level+1)),cost:original.cost}:original,team=battle.teamOf(seat);
 if(!card)return{ok:false,reason:'Select a card',affected:[],retargeting:[],locked:[],targets:[],attackers:[]};
 const snapped=snapCard(battle,team,card,x,y,seat),affordable=battle.elixir[seat]+1e-7>=card.cost,cycling=battle.slotReady[seat][slot]>battle.time+1e-7,shape=spellShape(card,snapped.x,snapped.y,team);
 const info={...snapped,members:snapped.formation||[],affordable,cycling,card:card.id,name:card.name,level:card.level,spell:card.spell,building:card.building,air:false,range:0,minRange:0,radius:card.radiusTiles||0,shape,affected:[],retargeting:[],locked:[],targets:[],attackers:[],deployTime:0,cardEntity:card.entity||null};
 if(card.spell){info.affected=snapped.ok?battle.spellAffectedEntities(card,shape,team).map(v=>({id:v.id,x:v.x,y:v.y})):[];return info;}
 if(!snapped.ok||!card.entity)return info;
 const d=entityDef(card.entity,card.level);Object.assign(info,{air:d.air,range:d.range,minRange:d.minRange,radius:d.radiusTiles,deployTime:d.deploy});
 const ghosts=(info.members.length?info.members:[{entity:card.entity,x:snapped.x,y:snapped.y,delay:0}]).map((m,i)=>{const md=entityDef(m.entity,card.level);return{id:-1000000-seat*100-i,entity:m.entity,card:card.id,team,owner:seat,x:m.x,y:m.y,def:md,level:card.level,hp:md.hp,maxHp:md.hp,shield:md.shield,wait:md.deploy+(m.delay||0),readyAt:battle.time+md.deploy+(m.delay||0),born:battle.time,appearsAt:battle.time,buffs:{},building:md.building,air:md.air,dead:false,attachedTo:null};});
 const candidates=[...battle.active,...ghosts];
 for(const enemy of battle.active){if(enemy.team===team||enemy.king&&!enemy.active)continue;const targetable=ghosts.filter(g=>battle.canTarget(enemy,g)&&edgeDistance(enemy,g)+1e-7>=enemy.def.minRange);if(!targetable.length)continue;const nearest=targetable.sort((a,b)=>edgeDistance(enemy,a)-edgeDistance(enemy,b))[0],edgeGhost=edgeDistance(enemy,nearest),e={id:enemy.id,x:enemy.x,y:enemy.y,range:enemy.def.range,immediate:edgeGhost<=enemy.def.range+1e-7&&enemy.wait<=0,deploying:enemy.wait>0};if(edgeGhost<=enemy.def.sight+1e-7)info.attackers.push(e);const before=battle.chooseTarget(enemy),after=battle.chooseTarget(enemy,candidates);if(before&&after?.id===before.id)info.locked.push({id:enemy.id,x:enemy.x,y:enemy.y,target:before.id});else if(after&&ghosts.some(g=>g.id===after.id))info.retargeting.push(e);}
 const ghost=ghosts[0];info.targets=battle.active.filter(t=>battle.canTarget(ghost,t)&&edgeDistance(ghost,t)<=ghost.def.range+1e-7&&edgeDistance(ghost,t)+1e-7>=ghost.def.minRange).map(t=>({id:t.id,x:t.x,y:t.y}));
 info.affected=info.targets;
 return info;
}
return{snapCard,spellShape,forecastPlacement,affectedByShape};
});
