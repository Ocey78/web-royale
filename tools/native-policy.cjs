'use strict';
function apply(game,native){
 for(const [alias,record]of Object.entries(game.entities||{}))if(record.NativeActor){
  const source=native.units?.[record.NativeActor];
  if(!source)throw Error('Missing native actor source for '+alias);
  native.units[alias]={...source};
 }
 for(const [alias,record]of Object.entries(game.projectiles||{}))if(record.NativeProjectile){
  const source=native.projectiles?.[record.NativeProjectile];
  if(!source)throw Error('Missing native projectile source for '+alias);
  native.projectiles[alias]={...source};
 }
 // Manual gameplay aliases reuse original source artwork. This modifies only
 // the generated in-memory policy, preserving authored native asset bytes.
 for(const [alias,record]of Object.entries(game.manualEntityAliases||{})){
  const source=native.units?.[record.sourceEntity];
  if(!game.entities?.[alias]||!source)throw Error('Missing native artwork source for manual entity alias '+alias);
  native.units[alias]={...source};
 }
 const cards=new Map((game.cards||[]).map(c=>[c.id,c]));
 for(const [id,cfg]of Object.entries(native.units||{})){
  const card=cards.get(id),entity=game.entities?.[id]?id:card?.source?.SummonCharacter||card?.source?.SummonCharactersList?.[0],source=game.entities?.[entity],authored=source?.HasRotationOnTimeline;
  cfg.rotationTimeline=typeof authored==='boolean'?authored:cfg.rotationTimeline===true||native.units?.[entity]?.rotationTimeline===true;
 }
 return native;
}
module.exports={apply};
