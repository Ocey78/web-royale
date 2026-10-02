/* Public facade retained for the browser UI and the existing test interface. */
(function(root,factory){const n=typeof module==='object'&&module.exports;const api=factory(n?require('./catalog.js'):root.RoyaleCatalog,n?require('./profile.js'):root.RoyaleProfile,n?require('./battle.js'):root.RoyaleBattle);if(n)module.exports=api;else root.RoyaleCore=api;})(globalThis,function(K,P,B){'use strict';
const W=540,H=960,AW=480,AH=640;
function fitViewport(width,height){if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw RangeError('Viewport dimensions must be positive');const scale=Math.min(width/W,height/H);return {width:W*scale,height:H*scale,x:(width-W*scale)/2,y:(height-H*scale)/2,scale};}
function pointInViewport(x,y,width,height){const v=fitViewport(width,height);if(x<v.x||y<v.y||x>v.x+v.width||y>v.y+v.height)return null;return {x:(x-v.x)/v.scale,y:(y-v.y)/v.scale};}
return {...K,...P,...B,W,H,AW,AH,fitViewport,pointInViewport};});
