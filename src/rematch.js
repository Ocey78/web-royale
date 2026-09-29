/* Build a fresh match request without touching the settled reward receipt. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleRematch=api;})(globalThis,function(){'use strict';
function request(battle){
 if(!battle?.result||battle.isReplay||battle.isSandbox||battle.warContext||['clan-war','self-play','replay','sandbox'].includes(battle.queueType))return null;
 const mode=battle.mode||'Default',queue=battle.queueType||(battle.is2v2?'2v2':mode==='Default'?'trophy-road':'challenge');
 const extra={queue,practice:battle.practice===true};
 // Do not copy a seed, enemy, arena or old result ID: this is another match.
 if(mode!=='RandomDeck'&&Array.isArray(battle.initialDecks?.[0]))extra.deck=[...battle.initialDecks[0]];
 return{mode,training:queue==='training',extra};
}
return{request};});
