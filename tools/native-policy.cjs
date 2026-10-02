'use strict';
function apply(game,native){const cards=new Map((game.cards||[]).map(c=>[c.id,c]));for(const [id,cfg]of Object.entries(native.units||{})){const card=cards.get(id),entity=game.entities?.[id]?id:card?.source?.SummonCharacter||card?.source?.SummonCharactersList?.[0],source=game.entities?.[entity],authored=source?.HasRotationOnTimeline;cfg.rotationTimeline=typeof authored==='boolean'?authored:cfg.rotationTimeline===true||native.units?.[entity]?.rotationTimeline===true;}return native;}
module.exports={apply};
