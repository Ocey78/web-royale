/* One visual label per intact deployment group; no combat-state mutation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleLevelLabels=api;})(globalThis,function(){'use strict';
function visible(u){return !!u&&u.hp>0&&!u.dead&&!u.effectCarrier&&!u.attachedTo&&!u.hidden&&!u.burrowing;}
function damaged(u){return Number.isFinite(u.lastDamagedAt)||u.hp<u.maxHp-.001||(u.maxShield>0&&u.shield<u.maxShield-.001);}
function plan(units,isPresent=visible){const individual=new Set(),byGroup=new Map(),groups=[];
 for(const u of units){if(!visible(u)||!isPresent(u))continue;if(!u.levelGroupId){individual.add(u.id);continue;}const key=u.team+':'+u.level+':'+u.levelGroupId;if(!byGroup.has(key))byGroup.set(key,[]);byGroup.get(key).push(u);}
 for(const [id,members]of byGroup){if(members.length<=2){for(const u of members)individual.add(u.id);continue;}const intact=[];for(const u of members){if(damaged(u))individual.add(u.id);else intact.push(u);}if(intact.length)groups.push({id,level:intact[0].level,team:intact[0].team,members:intact,x:intact.reduce((s,u)=>s+u.x,0)/intact.length,y:intact.reduce((s,u)=>s+u.y,0)/intact.length});}
 return {individual,groups};
}
return {plan,visible,damaged};
});
