/* Radius-aware tile routing and swept body collision for ground entities. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog,n?require('./arena-grid.js'):root.RoyaleArenaGrid);if(n)module.exports=api;else root.RoyalePathing=api;})(globalThis,function(K,G){'use strict';
const {SX,SY}=K,EPS=1e-7,ROUTE_CLEARANCE=.08,key=(c,r)=>c+','+r;
function pointSegmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
function segmentRectDistance(a,b,left,right,top,bottom){
 let lo=0,hi=1;
 for(const [origin,delta,min,max] of [[a.x,b.x-a.x,left,right],[a.y,b.y-a.y,top,bottom]]){
  if(Math.abs(delta)<1e-12){if(origin<min||origin>max){lo=1;hi=0;break;}}
  else{const near=(min-origin)/delta,far=(max-origin)/delta;lo=Math.max(lo,Math.min(near,far));hi=Math.min(hi,Math.max(near,far));}
 }
 if(lo<=hi)return 0;
 const pointRect=p=>Math.hypot(Math.max(left-p.x,0,p.x-right),Math.max(top-p.y,0,p.y-bottom));
 return Math.min(pointRect(a),pointRect(b),...[[left,top],[left,bottom],[right,top],[right,bottom]].map(([x,y])=>pointSegmentDistance({x,y},a,b)));
}
// Tile-space circular-body clearance against the existing river rectangles.
// Exact segment distance avoids different sampling intervals disagreeing at
// rounded bank corners; touching the bridge boundary is legal for radius 1.
function terrainSegmentClear(a,b,radius=0,allowWater=false,layout=null){
 if(G.layoutFor(layout).custom){const r=Math.max(0,radius);if(!G.Layout.boundsClear(a.x,a.y,r,layout)||!G.Layout.boundsClear(b.x,b.y,r,layout))return false;return G.Layout.forbidden(layout,allowWater).every(o=>segmentRectDistance(a,b,o.left,o.right,o.top,o.bottom)>=Math.max(EPS,r)-EPS/2);}
 const r=Math.max(0,radius),inside=p=>p.x-r>=-EPS&&p.x+r<=G.COLS+EPS&&p.y-r>=-EPS&&p.y+r<=G.ROWS+EPS;
 if(!inside(a)||!inside(b))return false;
 if(allowWater)return true;
 let left=0;
 for(const bridge of [...G.BRIDGES,{left:G.COLS,right:G.COLS}]){
  if(bridge.left>left&&segmentRectDistance(a,b,left,bridge.left,15,17)<Math.max(EPS,r)-EPS/2)return false;
  left=bridge.right;
 }
 return true;
}
function edgeDistance(a,b){return Math.max(0,Math.hypot((a.x-b.x)/SX,(a.y-b.y)/SY)-(a.def?.radiusTiles||0)-(b.def?.radiusTiles||0));}
function obstacleFree(x,y,radius,obstacles=[],ignore=null,clearance=0){if(!G.terrainFits(x,y,radius,{ignoreTowers:true}))return false;for(const o of obstacles){if(!o||o.id===ignore||o.hp<=0||o.air||o.attachedTo)continue;const d=Math.hypot((x-o.x)/SX,(y-o.y)/SY),min=radius+(o.def?.radiusTiles||o.radiusTiles||0)+clearance;if(d<min-.025)return false;}return true;}
function neighbors8(node,radius,obstacles){const out=[];for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const col=node.col+dc,row=node.row+dr;if(col<0||col>=G.COLS||row<0||row>=G.ROWS)continue;const p=G.tileCenter(col,row);if((row===15||row===16)&&col!==3&&col!==14)continue;if(!obstacleFree(p.x,p.y,radius,obstacles,null,ROUTE_CLEARANCE))continue;if(dc&&dr){const a=G.tileCenter(node.col+dc,node.row),b=G.tileCenter(node.col,node.row+dr);if(!obstacleFree(a.x,a.y,radius,obstacles,null,ROUTE_CLEARANCE)||!obstacleFree(b.x,b.y,radius,obstacles,null,ROUTE_CLEARANCE))continue;}out.push({col,row,cost:dc&&dr?Math.SQRT2:1});}return out;}
function nearestGoal(raw,radius,obstacles){
 const max=Math.max(G.COLS,G.ROWS);for(let ring=0;ring<=max;ring++){let best=null,bestD=Infinity;const c0=Math.max(0,raw.col-ring),c1=Math.min(G.COLS-1,raw.col+ring),r0=Math.max(0,raw.row-ring),r1=Math.min(G.ROWS-1,raw.row+ring);for(let row=r0;row<=r1;row++)for(let col=c0;col<=c1;col++){if(ring&&col>c0&&col<c1&&row>r0&&row<r1)continue;const p=G.tileCenter(col,row);if(!obstacleFree(p.x,p.y,radius,obstacles,null,ROUTE_CLEARANCE))continue;const d=(col-raw.col)*(col-raw.col)+(row-raw.row)*(row-raw.row);if(d<bestD||(d===bestD&&(!best||row<best.row||row===best.row&&col<best.col))){bestD=d;best={col,row};}}if(best)return best;}return null;
}
function heapPush(heap,node){let i=heap.length;heap.push(node);while(i){const p=(i-1)>>1,a=heap[p];if(a.f<node.f||a.f===node.f&&(a.h<node.h||a.h===node.h&&a.seq<=node.seq))break;heap[i]=a;i=p;}heap[i]=node;}
function heapPop(heap){if(!heap.length)return null;const root=heap[0],last=heap.pop();if(heap.length){let i=0;while(true){let l=i*2+1,r=l+1;if(l>=heap.length)break;let c=l;if(r<heap.length){const a=heap[l],b=heap[r];if(b.f<a.f||b.f===a.f&&(b.h<a.h||b.h===a.h&&b.seq<a.seq))c=r;}const ch=heap[c];if(last.f<ch.f||last.f===ch.f&&(last.h<ch.h||last.h===ch.h&&last.seq<=ch.seq))break;heap[i]=ch;i=c;}heap[i]=last;}return root;}
function route(start,goal,radius=0,obstacles=[]){
 const s=G.worldToTile(start.x,start.y),rawGoal=G.worldToTile(goal.x,goal.y),goalTile=nearestGoal(rawGoal,radius,obstacles);if(!goalTile)return[];
 const count=G.COLS*G.ROWS,gScore=new Float64Array(count),came=new Int16Array(count),closed=new Uint8Array(count);gScore.fill(Infinity);came.fill(-1);const idx=(c,r)=>r*G.COLS+c,heur=(c,r)=>Math.hypot(c-goalTile.col,r-goalTile.row),heap=[];let seq=0,si=idx(s.col,s.row);gScore[si]=0;heapPush(heap,{col:s.col,row:s.row,g:0,h:heur(s.col,s.row),f:heur(s.col,s.row),seq:seq++});
 while(heap.length){const cur=heapPop(heap),ci=idx(cur.col,cur.row);if(closed[ci]||cur.g>gScore[ci]+EPS)continue;closed[ci]=1;if(cur.col===goalTile.col&&cur.row===goalTile.row){const path=[];let n=ci;while(n!==si&&n>=0){const row=Math.floor(n/G.COLS),col=n-row*G.COLS;path.unshift(G.tileCenter(col,row));n=came[n];}return path;}
  for(const nx of neighbors8(cur,radius,obstacles)){const ni=idx(nx.col,nx.row);if(closed[ni])continue;const ng=cur.g+nx.cost;if(ng+EPS<gScore[ni]){gScore[ni]=ng;came[ni]=ci;const h=heur(nx.col,nx.row);heapPush(heap,{col:nx.col,row:nx.row,g:ng,h,f:ng+h,seq:seq++});}}
 }
 return[];
}
function overlaps(unit,x,y,solids){for(const v of solids||[]){if(!v||v.id===unit.id||v.hp<=0||v.air||v.attachedTo)continue;const min=(unit.def?.radiusTiles||0)+(v.def?.radiusTiles||0),d=Math.hypot((v.x-x)/SX,(v.y-y)/SY),start=Math.hypot((v.x-unit.x)/SX,(v.y-unit.y)/SY);if(start<min-1e-8&&d>=start-1e-9)continue;if(d<min-1e-8)return true;}return false;}
function valid(unit,x,y,solids){const radius=unit.def?.radiusTiles||0,allowWater=unit.def?.hover===true||unit.def?.source?.JumpEnabled===true;if(G.terrainFits(unit.x,unit.y,radius,{allowWater,ignoreTowers:true,layout:unit.layout})&&(!G.terrainFits(x,y,radius,{allowWater,ignoreTowers:true,layout:unit.layout})||!terrainSegmentClear({x:unit.x/SX,y:unit.y/SY},{x:x/SX,y:y/SY},radius,allowWater,unit.layout)))return false;return !overlaps(unit,x,y,solids);}
function sweptStep(unit,dx,dy,solids=[]){
 if(unit.air)return{x:unit.x+dx,y:unit.y+dy,blocked:false};
 // Test the complete sweep, not just its endpoint. A large knockback can end
 // beyond a tower and look clear even though it crossed the tower's body.
 const length=Math.hypot(dx/SX,dy/SY),samples=Math.max(1,Math.ceil(length/.1));
 let lo=0,hi=1,hit=false;
 for(let i=1;i<=samples;i++){const q=i/samples;if(!valid(unit,unit.x+dx*q,unit.y+dy*q,solids)){hi=q;hit=true;break;}lo=q;}
 if(!hit)return{x:unit.x+dx,y:unit.y+dy,blocked:false};
 for(let i=0;i<18;i++){const m=(lo+hi)/2;if(valid(unit,unit.x+dx*m,unit.y+dy*m,solids))lo=m;else hi=m;}
 let x=unit.x+dx*lo,y=unit.y+dy*lo;const remain=1-lo;
 // A slide is another sweep; sampling it also prevents diagonal corner tunneling.
 const slide=(sx,sy)=>{const n=Math.max(1,Math.ceil(Math.hypot(sx/SX,sy/SY)/.1));for(let i=1;i<=n;i++)if(!valid(unit,x+sx*i/n,y+sy*i/n,solids))return false;return true;};
 if(Math.abs(dx)>=Math.abs(dy)&&slide(0,dy*remain))y+=dy*remain;
 else if(slide(dx*remain,0))x+=dx*remain;
 else if(slide(0,dy*remain))y+=dy*remain;
 return{x,y,blocked:true};
}
function separationVector(unit,solids=[]){let x=0,y=0;for(const v of solids){if(!v||v.id===unit.id||v.hp<=0||v.air!==unit.air||v.attachedTo)continue;let dx=(unit.x-v.x)/SX,dy=(unit.y-v.y)/SY,d=Math.hypot(dx,dy),min=(unit.def?.radiusTiles||0)+(v.def?.radiusTiles||0);if(d>=min||min<=0)continue;if(d<EPS){dx=unit.id%2?.01:-.01;dy=.01;d=Math.hypot(dx,dy);}const push=(min-d)*.12;x+=dx/d*push*SX;y+=dy/d*push*SY;}return{x,y};}
return{route,sweptStep,separationVector,edgeDistance,obstacleFree,pointSegmentDistance,terrainSegmentClear};
});
