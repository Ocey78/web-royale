/* Cosmetic map choices are independent of combat RNG and never change a mode's geometry. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./progression.js'):root.RoyaleProgression);if(n)module.exports=api;else root.RoyaleArenaSelection=api;})(globalThis,function(R){'use strict';
const standard=Object.freeze([{id:'training',name:'Training Camp'},...R.ARENAS.map(({id,name})=>({id,name}))].map(Object.freeze));
const choices=Object.freeze([...standard,{id:'Team3v3',name:'3v3 · Royal Bastion'},{id:'TeamRumble',name:'5v5 · Rumble Colosseum'},{id:'BridgeBattle',name:'Bridge · Frozen Causeway'}].map(Object.freeze));
function valid(id){return choices.some(m=>m.id===id);}
function base(id){return (id==='Team3v3'||id==='TeamRumble')?'spooky':id==='BridgeBattle'?'frozen':standard.some(m=>m.id===id)?id:'training';}
function choose({mode,queue,current='training',seed=1,requested}={}){if(['Team3v3','TeamRumble','BridgeBattle'].includes(mode))return mode;if(queue==='trophy-road')return base(current);if(standard.some(m=>m.id===requested))return requested;let h=(Number(seed)||1)>>>0;h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);h=(h^(h>>>16))>>>0;return standard[h%standard.length].id;}
return{standard,choices,valid,base,choose};});
