/* Deterministic radius-aware routing. Coordinates here are arena tiles, not
   stretched display pixels. This is an independently implemented navigator. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./arena-grid.js'):root.RoyaleArenaGrid,n?require('./pathing.js'):root.RoyalePathing);if(n)module.exports=api;else root.RoyaleNavigation=api;})(globalThis,function(G,Pathing){'use strict';
// Keep the half-tile search samples and add the exact bridge centerlines. A
// radius-one body fits a two-tile bridge only on its centerline; quarter-offset
// samples alone incorrectly make both bridges impassable for those source units.
const CELL=.5,XS=[...Array.from({length:36},(_,i)=>i*CELL+.25),...G.BRIDGES.map(b=>(b.left+b.right)/2)].sort((a,b)=>a-b),NX=XS.length,NY=64,N=NX*NY,EPS=1e-6;
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
class Heap{constructor(){this.a=[];}push(n){const a=this.a;a.push(n);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].f<=n.f)break;a[i]=a[p];i=p;}a[i]=n;}pop(){const a=this.a,r=a[0],n=a.pop();if(a.length){let i=0;while(2*i+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=n.f)break;a[i]=a[j];i=j;}a[i]=n;}return r;}get size(){return this.a.length;}}
function waterClear(x,y,r,layout=null){return G.waterClear(x,y,r,layout);}
function pointClear(p,r,obstacles,free=false){
 const airborne=free===true||free?.air===true,waterFree=airborne||free?.water===true,a=G.Layout.limits(free?.layout,airborne);
 if(p.x<a.left+.25||p.x>a.right-.25||p.y<a.top+.4||p.y>a.bottom-.4)return false;
 if(airborne)return true;
 if(!G.Layout.boundsClear(p.x,p.y,r,free?.layout))return false;
 if(!waterFree&&!waterClear(p.x,p.y,r,free?.layout))return false;
 for(const o of obstacles){const dx=p.x-o.x,dy=p.y-o.y,limit=r+o.radius+.025;if(dx*dx+dy*dy<limit*limit)return false;}return true;
}
// Resolve only invalid spawn/recovery points. Walking follows the returned point
// at the actor's normal speed; this helper never mutates an existing actor.
function nearestClearPoint(start,r,obstacles=[],free=false,forward={x:0,y:-1}){
 const air=free===true||free?.air===true,a=G.Layout.limits(free?.layout,air),minX=a.left+Math.max(.25,air?0:r),maxX=a.right-Math.max(.25,air?0:r),minY=a.top+Math.max(.4,air?0:r),maxY=a.bottom-Math.max(.4,air?0:r);
 const bounded=p=>({x:Math.max(minX,Math.min(maxX,p.x)),y:Math.max(minY,Math.min(maxY,p.y))}),base=bounded(start);
 if(pointClear(base,r,obstacles,free))return base;
 const candidates=[base,{x:base.x,y:15-r-1e-6},{x:base.x,y:17+r+1e-6}];
 for(const bridge of G.bridges(free?.layout))if(bridge.right-bridge.left>=2*r)candidates.push({x:Math.max(bridge.left+r,Math.min(bridge.right-r,base.x)),y:base.y});
 if(!air)for(const o of obstacles){const dx=base.x-o.x,dy=base.y-o.y,d=Math.hypot(dx,dy),radius=r+o.radius+.026;
  if(d>radius+2)continue;
  candidates.push({x:o.x+(d?dx/d:forward.x)*radius,y:o.y+(d?dy/d:forward.y)*radius});
  // Nearby structures, banks and arena edges can obstruct the nearest normal.
  for(let i=0;i<32;i++){const angle=Math.atan2(forward.y,forward.x)+i*Math.PI/16;candidates.push({x:o.x+Math.cos(angle)*radius,y:o.y+Math.sin(angle)*radius});}
 }
 const distance=p=>(p.x-start.x)**2+(p.y-start.y)**2;
 let best=null,bestDistance=Infinity;
 for(const p0 of candidates){const p=bounded(p0),d=distance(p);if(d<bestDistance&&pointClear(p,r,obstacles,free)){best=p;bestDistance=d;}}
 if(best)return best;
 // Bounded fallback for crowded spawn points, deterministic in team orientation.
 const angle0=Math.atan2(forward.y,forward.x);
 for(let ring=1;ring<=288;ring++){const radius=ring*.125,count=Math.min(128,Math.max(16,Math.ceil(radius*32)));for(let i=0;i<count;i++){const angle=angle0+i*Math.PI*2/count,p=bounded({x:base.x+Math.cos(angle)*radius,y:base.y+Math.sin(angle)*radius});if(pointClear(p,r,obstacles,free))return p;}}
 return null;
}
function segmentClear(a,b,r,obstacles,free=false){
 if(!pointClear(b,r,obstacles,free))return false;
 const airborne=free===true||free?.air===true;if(airborne)return true;
 if(!Pathing.terrainSegmentClear(a,b,r,free?.water===true,free?.layout))return false;
 return obstacles.every(o=>Pathing.pointSegmentDistance(o,a,b)>=r+o.radius+.025);
}
const point=i=>({x:XS[i%NX],y:Math.floor(i/NX)*CELL+.25});
const index=p=>{let col=0;for(let i=1;i<NX;i++)if(Math.abs(XS[i]-p.x)<Math.abs(XS[col]-p.x))col=i;return col+Math.max(0,Math.min(NY-1,Math.floor(p.y/CELL)))*NX;};
const customGrids=new Map();
function searchGrid(layout,radius=0){
 const a=G.layoutFor(layout);if(!a.custom)return{NX,NY,N,point,index};const key=layout+':'+radius;if(customGrids.has(key))return customGrids.get(key);
 // Include true wall-clearance tracks: half-tile centers alone can omit a
 // legal rear aisle between a large tower and the map border.
 const unique=values=>[...new Set(values)].sort((x,y)=>x-y);
 const xs=unique([...Array.from({length:Math.ceil((a.right-a.left)/CELL)},(_,i)=>a.left+i*CELL+.25),...G.bridges(layout).map(b=>(b.left+b.right)/2),a.left+radius+.026,a.right-radius-.026]);
 const ys=unique([...Array.from({length:Math.ceil((a.bottom-a.top)/CELL)},(_,i)=>a.top+i*CELL+.25),a.top+radius+.026,a.bottom-radius-.026]);
 const nearest=(values,x)=>{let j=0;for(let i=1;i<values.length;i++)if(Math.abs(values[i]-x)<Math.abs(values[j]-x))j=i;return j;};
 const nx=xs.length,ny=ys.length,pt=i=>({x:xs[i%nx],y:ys[Math.floor(i/nx)]}),ix=p=>nearest(xs,p.x)+nearest(ys,p.y)*nx;
 const out={NX:nx,NY:ny,N:nx*ny,point:pt,index:ix};if(customGrids.size>=64)customGrids.clear();customGrids.set(key,out);return out;
}
function route(start,target,r,reach,obstacles,free=false){
 const {NX,NY,N,point,index}=searchGrid(free?.layout,r);
 const delta=length(start,target),stop=Math.max(r+(target.radius||0)+.04,reach-.025);
 const direct=delta>stop?{x:target.x+(start.x-target.x)*stop/delta,y:target.y+(start.y-target.y)*stop/delta}:start;
 if(delta<=reach-EPS)return [];
 if(segmentClear(start,direct,r,obstacles,free))return [direct];
 // A death spawn may begin inside its parent footprint; permit only escaping
 // that initial overlap, never ignore a structure farther along the route.
 const blocking=obstacles.filter(o=>length(start,o)>=r+o.radius+.015);
 const valid=new Int8Array(N),cost=new Float64Array(N);cost.fill(Infinity);const parent=new Int32Array(N);parent.fill(-1);const closed=new Uint8Array(N);
 const legal=i=>{if(!valid[i])valid[i]=pointClear(point(i),r,blocking,free)?1:-1;return valid[i]===1;};
 let begin=index(start);if(!legal(begin)){let best=Infinity;for(let i=0;i<N;i++){if(!legal(i))continue;const p=point(i),d=length(start,p);if(d<best&&segmentClear(start,p,r,blocking,free)){begin=i;best=d;}}if(!Number.isFinite(best))return [];}
 const open=new Heap();cost[begin]=0;open.push({i:begin,f:length(point(begin),target)});let end=-1,nearest=begin,near=Infinity,expanded=0;
 const dirs=[[0,-1],[-1,0],[1,0],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
 while(open.size&&expanded++<N){const {i}=open.pop();if(closed[i])continue;closed[i]=1;const p=point(i),d=length(p,target);if(d<near){nearest=i;near=d;}
  if(d<=reach&&d>=r+(target.radius||0)+.01){end=i;break;}
  const ix=i%NX,iy=Math.floor(i/NX);for(const [dx,dy]of dirs){const x=ix+dx,y=iy+dy;if(x<0||x>=NX||y<0||y>=NY)continue;const j=x+y*NX;if(closed[j]||!legal(j))continue;
   if(dx&&dy&&(!legal(ix+dx+iy*NX)||!legal(ix+(iy+dy)*NX)))continue;
   const g=cost[i]+length(p,point(j))*(dx&&dy?1:.999999);if(g+EPS>=cost[j])continue;cost[j]=g;parent[j]=i;open.push({i:j,f:g+Math.max(0,length(point(j),target)-reach)});
  }
 }
 if(end<0)end=nearest;if(end===begin)return [];
 const path=[];for(let i=end;i!==begin&&i>=0;i=parent[i])path.push(point(i));path.reverse();
 // Remove grid stair steps only when the complete swept segment is clear.
 const smooth=[];let from=start,k=0;while(k<path.length){let last=k;for(let j=k+1;j<path.length;j++){if(!segmentClear(from,path[j],r,blocking,free))break;last=j;}smooth.push(path[last]);from=path[last];k=last+1;}
 return smooth;
}
// Hovering/jumping units may cross the river; unlike airborne troops, they
// must still route around every live building footprint.
function travelPermission(u){return {air:!!u.air,water:!!(u.air||u.def.hover||u.def.source.JumpEnabled),layout:u.layout};}
class Navigator{
 constructor(){this.signature='';this.obstacles=[];this.solids=[];this.revision=0;this.sampleTime=-1;this.searches=0;}
 refresh(b){if(this.sampleTime===b.time)return;this.sampleTime=b.time;const structures=[];for(const collection of [b.towers,b.units])for(const u of collection)if(u.building&&!u.effectCarrier&&!u.attachedTo&&b.isPresent(u))structures.push(u);const signature=structures.map(u=>u.id+':'+u.x+':'+u.y).join('|');this.solids=structures;if(signature!==this.signature){this.signature=signature;this.revision++;this.obstacles=structures.map(u=>({id:u.id,x:u.x/b.constructor.SX,y:u.y/b.constructor.SY,radius:u.def.radiusTiles}));}}
 next(b,u,t,intent=null){this.refresh(b);const SX=b.constructor.SX,SY=b.constructor.SY,start={x:u.x/SX,y:u.y/SY},target={x:t.x/SX,y:t.y/SY,radius:t.def?.radiusTiles||0},r=u.def.radiusTiles,free=travelPermission(u),reach=u.def.range+r+target.radius;
  const obstacles=u.building?this.obstacles.filter(o=>o.id!==u.id):this.obstacles;const d=length(start,target);if(d<=reach-EPS)return null;
  if(!pointClear(start,r,obstacles,free)){let recovery=u.navRecovery;if(!recovery||!recovery.point||recovery.revision!==this.revision||!pointClear(recovery.point,r,obstacles,free))recovery=u.navRecovery={revision:this.revision,point:nearestClearPoint(start,r,obstacles,free,{x:0,y:u.team?1:-1})};u.navPath=null;return recovery.point;}u.navRecovery=null;
  // Lane preference selects the Crown in targetDecision; it is not a mandatory
  // horizontal/vertical track. Approach that same target on a clear diagonal.
  // This also avoids an artificial corner when it enters local sight. Ground
  // bodies still use the swept, radius-aware route below for terrain/buildings.
  const stop=Math.max(r+target.radius+.04,reach-.015),direct={x:target.x+(start.x-target.x)*stop/d,y:target.y+(start.y-target.y)*stop/d};
  if(segmentClear(start,direct,r,obstacles,free)){u.navPath=null;return direct;}
  let state=u.navPath;if(!state||state.revision!==this.revision||state.targetId!==t.id||length(target,state.target)>.8||b.time>=state.expires){this.searches++;state=u.navPath={revision:this.revision,targetId:t.id,target,expires:t.building?Infinity:b.time+.65,path:route(start,target,r,reach,obstacles,free)};if(!state.path.length)state.expires=b.time+.25;}
  // A bridge approach can have zero spare clearance. Being 0.04 tiles
  // from a corner is NOT equivalent to reaching it: only skip it if the
  // complete next segment remains clear from the actor's real position.
  while(state.path.length&&length(start,state.path[0])<.04){if(state.path.length>1&&!segmentClear(start,state.path[1],r,obstacles,free))break;state.path.shift();}if(!state.path.length){state.expires=Math.min(state.expires,b.time+.25);return null;}return state.path[0];
 }
 allows(b,u,p){this.refresh(b);return pointClear({x:p.x/b.constructor.SX,y:p.y/b.constructor.SY},u.def.radiusTiles,u.building?this.obstacles.filter(o=>o.id!==u.id):this.obstacles,travelPermission(u));}
}
return {nearestClearPoint,Navigator,pointClear,segmentClear,route,waterClear};});
