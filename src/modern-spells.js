/* Source controllers for current spells whose native actions are not simple damage fields. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog,()=>n?require('./modern-actions.js'):root.RoyaleModernActions);if(n)module.exports=api;else root.RoyaleModernSpells=api;})(globalThis,function(K,actions){'use strict';
const EPS=1e-7,sec=n=>Math.max(0,Number(n)||0)/1000;
function record(ref,data){return typeof ref==='string'?data.actions?.[ref]:ref;}
function canExecuteAction(b,ref,c={}){const data=c.data||b?.catalog?.DATA||K.DATA,r=record(ref,data);if(ref==='Vines_Select_Buff_Size')return{ok:true,handled:true,unsupported:[]};if(r?.ClassType!=='ActionLaserBall')return undefined;const buffs=r.OnDetectedUnitActionList?.map(a=>a.SpawnData),valid=Number(r.DetectionRadius)>0&&Number(r.HitFrequency)>0&&Array.isArray(r.MaxUnitPerActionList)&&r.MaxUnitPerActionList.length+1===buffs?.length&&buffs.every(x=>x&&Number.isFinite(x.DamagePerSecond)&&Number(x.HitFrequency)>0&&Number.isFinite(x.CrownTowerDamagePerHit));return{ok:!!valid,handled:true,reason:valid?null:'Unsupported source laser damage configuration',unsupported:valid?[]:['Unsupported source laser damage configuration']};}
function executeAction(b,ref,c={}){const check=canExecuteAction(b,ref,c);if(!check)return undefined;if(!check.ok)return check;const data=c.data||b.catalog?.DATA||K.DATA,r=record(ref,data),u=c.unit;if(!u)return{ok:false,handled:true,reason:'Missing source spell area',unsupported:['Missing source spell area']};
 if(r.ClassType==='ActionLaserBall'){u.modernLaser={record:r,nextAt:b.time+sec(r.FirstHitDelay),pending:[],hits:0};return check;}
 // Two anonymous native IDs in the tower size branch have no exported name map.
 // The source snare sizes share gameplay stats; select the tower art branch by role.
 const entity=u.entity,radius=(u.def?.radiusTiles||0)*1000;
 const index=u.king===true||entity==='KingTower'?0:u.king===false||['PrincessTower','Cannoneer','BarbarianHut'].includes(entity)?1:['ElixirGolem1','InfernoDragon','MergeMaiden_Mounted','MightyMiner','MovingCannon','SuperHogRider_Terry','SuperIceGolemite','BombTower','InfernoTower'].includes(entity)?2:['MiniPekka','SuperMiniPekka','GoblinDrill','Tombstone'].includes(entity)?3:radius<=500?4:radius<750?5:6;
 return actions().executeAction(b,r.SubActions[index],c);
}
function tickArea(b,a){const laser=a.modernLaser;if(!laser)return;const data=b.catalog?.DATA||K.DATA,r=laser.record,M=actions();
 for(const hit of laser.pending.filter(p=>p.due<=b.time+EPS)){for(const id of hit.targets){const u=b.getEntity(id);if(!u||u.hp<=0||u.dead)continue;const buff=hit.buff,amount=u.king!==undefined?b.scaleStat(buff.CrownTowerDamagePerHit,buff.Rarity,a.level):b.scaleStat(buff.DamagePerSecond,buff.Rarity,a.level)*sec(buff.HitFrequency);b.damage(u,amount,null,{team:a.team});if(buff.HitEffect)b.effect({kind:'source',sourceEffect:buff.HitEffect,x:u.x,y:u.y,team:a.team,ttl:3});}}
 laser.pending=laser.pending.filter(p=>p.due>b.time+EPS);
 if(b.time>a.ends+EPS||b.time+EPS<laser.nextAt)return;
 const targets=b.active.filter(u=>b.isPresent(u)&&!u.effectCarrier&&!u.attachedTo&&M.matchesFilter(data,r.HitFilter,a,u)&&!M.tags(u,b.time).has('UNTARGETABLE')&&Math.hypot((u.x-a.x)/K.SX,(u.y-a.y)/K.SY)<=(r.DetectionRadius||0)/1000+(u.def?.radiusTiles||0)+EPS).sort((u,v)=>u.id-v.id);
 if(targets.length){let index=r.MaxUnitPerActionList.findIndex(max=>targets.length<=max);if(index<0)index=r.MaxUnitPerActionList.length;const action=r.OnDetectedUnitActionList[index],buff=action.SpawnData;laser.pending.push({due:b.time+sec(buff.HitFrequency),targets:targets.map(u=>u.id),buff});for(const effect of [r.MainEffectList?.[index]||r.MainEffectList?.[0],action.NextAction?.Effect])if(effect)b.effect({kind:'source',sourceEffect:effect,x:a.x,y:a.y,team:a.team,ttl:3});laser.hits++;}
 laser.nextAt+=sec(r.HitFrequency);
}
return{canExecuteAction,executeAction,tickArea};
});
