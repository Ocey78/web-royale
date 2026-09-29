/* Immutable battle geometry, shared by placement, collision, routing and art.
   Classic coordinates stay 18 x 32; expanded maps retain that origin and scale. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleArenaLayout=api;})(globalThis,function(){'use strict';
const freeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')freeze(v);return Object.freeze(o);};
const classic=freeze({id:'classic',custom:false,left:0,right:18,top:0,bottom:32,riverTop:15,riverBottom:17,lanes:[3.5,14.5],bridges:[{left:2.5,right:4.5},{left:13.5,right:15.5}],kings:[9],princessY:[6.5,6.5]});
const triple=freeze({id:'Team3v3',custom:true,left:0,right:18,top:-2,bottom:34,kingY:1.5,riverTop:15,riverBottom:17,lanes:[3.5,9,14.5],bridges:[{left:2.25,right:4.75},{left:7.75,right:10.25},{left:13.25,right:15.75}],kings:[5.6,9,12.4],princessY:[6.5,6.5,6.5]});
const bridge=freeze({id:'BridgeBattle',custom:true,left:5.25,right:12.75,top:-2,bottom:34,riverTop:15,riverBottom:17,lanes:[9],bridges:[{left:7.5,right:10.5}],kings:[9],princessY:[8]});
// Two broad concentric arches. The back/middle tower recedes toward the keep;
// spacing and perimeter aisles accommodate radius-one troops without resizing.
const rumble=freeze({id:'TeamRumble',custom:true,theme:'castle',revision:2,river:false,left:-5,right:23,top:-4,bottom:36,kingY:1,kingYs:[4,1.7,1,1.7,4],riverTop:16,riverBottom:16,lanes:[-1,4,9,14,19],bridges:[{left:-5,right:23}],kings:[-1,4,9,14,19],princessY:[10,7.7,7,7.7,10]});
function get(id){return id==='TeamRumble'?rumble:id==='Team3v3'?triple:id==='BridgeBattle'?bridge:classic;}
function waterClear(x,y,r=0,id){const a=get(id);if(a.river===false)return true;const dy=y<a.riverTop?a.riverTop-y:y>a.riverBottom?y-a.riverBottom:0;if(dy>=r&&!(y>a.riverTop&&y<a.riverBottom))return true;const margin=dy>0?Math.sqrt(Math.max(0,r*r-dy*dy)):r;return a.bridges.some(b=>x-margin>=b.left-1e-7&&x+margin<=b.right+1e-7);}
function boundsClear(x,y,r=0,id,air=false){const a=air&&id!=='TeamRumble'?classic:get(id);return x-r>=a.left-1e-7&&x+r<=a.right+1e-7&&y-r>=a.top-1e-7&&y+r<=a.bottom+1e-7;}
function forbidden(id,waterFree=false){const a=get(id),rects=[];if(a.left>0)rects.push({left:0,right:a.left,top:0,bottom:32});if(a.right<18)rects.push({left:a.right,right:18,top:0,bottom:32});if(!waterFree&&a.river!==false){let x=a.left;for(const b of [...a.bridges,{left:a.right,right:a.right}]){if(b.left>x)rects.push({left:x,right:b.left,top:a.riverTop,bottom:a.riverBottom});x=b.right;}}return rects;}
function lane(x,id){const a=get(id);let index=0;for(let i=1;i<a.lanes.length;i++)if(Math.abs(a.lanes[i]-x)<Math.abs(a.lanes[index]-x))index=i;return index;}
function towers(team,id){const a=get(id),flip=y=>team?y:32-y;if(!a.custom)return[['KingTower',9,flip(3),0],['PrincessTower',3.5,flip(6.5),0],['PrincessTower',14.5,flip(6.5),0]];const out=[];for(let i=0;i<a.kings.length;i++)out.push(['KingTower',a.kings[i],flip(a.kingYs?.[i]??a.kingY??3),i]);for(let i=0;i<a.lanes.length;i++)out.push(['PrincessTower',a.lanes[i],flip(a.princessY[i]),i]);return out;}
function validSlots(slots,teamSize=3){return Array.isArray(slots)&&slots.length===teamSize*2&&slots.every(x=>Number.isInteger(x)&&x>=0&&x<teamSize)&&[0,1].every(t=>new Set(slots.filter((_,s)=>s%2===t)).size===teamSize);}
function shuffleSlots(random,teamSize=3){const slots=[];for(const team of [0,1]){const row=Array.from({length:teamSize},(_,i)=>i);for(let i=teamSize-1;i>0;i--){const j=Math.floor(random()*(i+1));[row[i],row[j]]=[row[j],row[i]];}for(let i=0;i<teamSize;i++)slots[team+i*2]=row[i];}return slots;}
function limits(id,air=false){return air&&id!=='TeamRumble'?classic:get(id);}
return{limits,get,waterClear,boundsClear,forbidden,lane,towers,validSlots,shuffleSlots};});
