/* Clash-style logical 18 x 32 arena tile geometry. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog,n?require('./arena-layout.js'):root.RoyaleArenaLayout);if(n)module.exports=api;else root.RoyaleArenaGrid=api;})(globalThis,function(K,L){'use strict';
const {SX,SY}=K,COLS=18,ROWS=32;
const RIVER_ROWS=new Set([15,16]),BRIDGE_COLS=new Set([3,4,13,14]);
const TOWER_CELLS=new Set();
function addRect(c0,c1,r0,r1){for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)TOWER_CELLS.add(c+','+r);}
// Native crown-tower footprints aligned to the logical tile field.
addRect(7,10,27,30);addRect(2,4,24,26);addRect(13,15,24,26);
addRect(7,10,1,4);addRect(2,4,5,7);addRect(13,15,5,7);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function worldToTile(x,y,layout=null){const a=L.get(layout);return{col:clamp(Math.floor(x/SX),Math.floor(a.left),Math.ceil(a.right)-1),row:clamp(Math.floor(y/SY),Math.floor(a.top),Math.ceil(a.bottom)-1)};}
function tileCenter(col,row){return{x:(col+.5)*SX,y:(row+.5)*SY};}
function tileFlags(col,row){if(col<0||col>=COLS||row<0||row>=ROWS)return{ground:false,river:false,bridge:false,tower:false,blocked:true};const water=RIVER_ROWS.has(row),bridge=water&&BRIDGE_COLS.has(col),tower=TOWER_CELLS.has(col+','+row);return{ground:!water||bridge,river:water&&!bridge,bridge,tower,blocked:tower};}
function footprintTiles(x,y,radius=0){const r=Math.max(0,Number(radius)||0),e=1e-6,minC=Math.floor(x/SX-r+e),maxC=Math.floor(x/SX+r-e),minR=Math.floor(y/SY-r+e),maxR=Math.floor(y/SY+r-e),out=[];for(let row=minR;row<=maxR;row++)for(let col=minC;col<=maxC;col++)out.push({col,row});return out;}
// Movement geometry is shared by the planner, sweep and separation solver.
// Use a circle/rectangle test at the banks, not only the unit's center row.
const BRIDGES=Object.freeze([{left:2.5,right:4.5},{left:13.5,right:15.5}]);
function waterClear(x,y,radius=0,layout=null){
 if(L.get(layout).custom)return L.waterClear(x,y,Math.max(0,radius),layout);
 const r=Math.max(0,Number(radius)||0),dy=y<15?15-y:y>17?y-17:0;
 if(dy>=r&&!(y>15&&y<17))return true;
 const margin=dy>0?Math.sqrt(Math.max(0,r*r-dy*dy)):r;
 return BRIDGES.some(b=>x-margin>=b.left-1e-7&&x+margin<=b.right+1e-7);
}
function terrainFits(x,y,radius=0,opt={}){
 const r=Math.max(0,Number(radius)||0),tx=x/SX,ty=y/SY;
 if(L.get(opt.layout).custom){if(!L.boundsClear(tx,ty,r,opt.layout))return false;return opt.allowWater||L.waterClear(tx,ty,r,opt.layout);}
 if(tx-r<0||tx+r>COLS||ty-r<0||ty+r>ROWS)return false;
 if(!opt.allowWater&&!waterClear(tx,ty,r))return false;
 if(opt.ignoreTowers)return true;
 return footprintTiles(x,y,r).every(({col,row})=>!tileFlags(col,row).tower);
}
function lane(col){return col<9?0:1;}
function deploymentAllowed(team,col,row,towers=[],cheat=false,layout=null){if(L.get(layout).custom){const a=L.get(layout);if(col<a.left||col>=a.right||row<a.top||row>=a.bottom)return false;if(cheat)return true;if(a.ffa){const left=col<9,top=row<16;return team===0?left&&!top:team===1?!left&&top:team===2?left&&top:team===3?!left&&!top:false;}if(team===0?row>=(a.river===false?16:17):row<=(a.river===false?15:14))return true;const ix=L.lane(col+.5,layout),t=towers.find(t=>t.team!==team&&!t.king&&t.crownSlot===ix);return !!t&&t.hp<=0&&(team===0?row>=10&&row<=14:row>=17&&row<=21);}if(col<0||col>=COLS||row<0||row>=ROWS)return false;if(cheat)return true;if(team===0){if(row>=17)return true;const enemy=towers.filter(t=>t.team===1&&!t.king).sort((a,b)=>a.x-b.x),opened=enemy[lane(col)]?.hp<=0;return !!opened&&row>=10&&row<=14;}if(team===1){if(row<=14)return true;const enemy=towers.filter(t=>t.team===0&&!t.king).sort((a,b)=>a.x-b.x),opened=enemy[lane(col)]?.hp<=0;return !!opened&&row>=17&&row<=21;}return false;}
function neighbors(col,row,radius=0){const out=[];for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const c=col+dc,r=row+dr;if(c<0||c>=COLS||r<0||r>=ROWS)continue;const p=tileCenter(c,r);if(terrainFits(p.x,p.y,radius))out.push({col:c,row:r});}return out;}
return{Layout:L,layoutFor:L.get,bridges:layout=>L.get(layout).bridges,BRIDGES,waterClear,COLS,ROWS,worldToTile,tileCenter,tileFlags,footprintTiles,terrainFits,deploymentAllowed,neighbors};
});
