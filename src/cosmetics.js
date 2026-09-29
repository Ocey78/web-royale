/* Offline cosmetic catalogue: expose only assets actually available in this build. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleCosmetics=api;})(globalThis,function(){'use strict';
// Prices are local game economy settings; keep imported historical metadata intact.
const EMOTE_PRICE=50,TOWER_SKIN_PRICE=100;
const sourceEmotes=typeof module==='object'&&module.exports?require('./emote-data.js'):globalThis.RoyaleEmoteData;
const emotes=Object.freeze(sourceEmotes.map(e=>Object.freeze({...e,cost:e.free?0:EMOTE_PRICE})));
// Retired v0.19-v0.21 recolors. Used only for once-per-ID local-gem refunds.
const retiredTowerSkins=Object.freeze(['lava-fortress','royal-blue','bone-crypt','jungle-ruins','electro-station','frozen-keep']);
const towerSkins=Object.freeze([
 {id:'classic',name:'Classic Tower',free:true,cost:0,sourceKind:'original'},
 ...[
  ['source-gold-rush','Gold Rush','goldrush',true,'GoldRush'],
  ['source-gem-rush','Gem Rush','gemrush',true,'GemRush'],
  ['source-elixir-pump','Elixir Pump','pump',false,'ElixerPump']
 ].map(([id,name,prefix,hasTop,sourceSet])=>({id,name,free:false,cost:TOWER_SKIN_PRICE,sourceKind:'original-event',sourceSet,scene:'tower_skins',
  description:'Original '+name+' event towers, available here as a local cosmetic.',
  exports:{king:[`kingtower_${prefix}_01`,`kingtower_${prefix}_02`],
   princessBase:[`princesstower_${prefix}_01`,`princesstower_${prefix}_02`],
   ...(hasTop?{princessTop:[`princesstower_${prefix}_01_top`,`princesstower_${prefix}_02_top`]}:{})}}))
]);
const towerSkinAvailability=Object.freeze({
 message:'Three original event tower styles are available.',
 detail:'Gold Rush, Gem Rush and Elixir Pump use their original artwork and animations. Seasonal tower skins are not included.',
 originalSkinCount:3
});
const rarities=['Common','Rare','Epic','Legendary'];
const magicItems=Object.freeze([
 ...rarities.map(r=>({id:'wild-'+r.toLowerCase(),name:r+' Wild Cards',rarity:r,kind:'wild',icon:'road-wild-'+r.toLowerCase()})),
 ...rarities.map(r=>({id:r.toLowerCase()+'-book',name:r+' Book of Cards',rarity:r,kind:'book',icon:'magic-'+r.toLowerCase()+'-book'})),
 {id:'book-of-books',name:'Book of Books',kind:'book',icon:'magic-book-of-books'},
 {id:'magic-coin',name:'Magic Coin',kind:'coin',icon:'magic-magic-coin'},
 {id:'chest-key',name:'Chest Key',kind:'key',icon:'magic-chest-key'}
]);
const collectionSections=Object.freeze([{id:'cards',name:'Cards',icon:'cards'},{id:'emotes',name:'Emotes',icon:'emote-icon'},{id:'tower-skins',name:'Tower Skins',icon:'battle'},{id:'magic-items',name:'Magic Items',icon:'road-wild-legendary'}]);
// Source-derived IDs may have been serialized with ':' or '-' separators by
// an earlier importer. Resolve only an unambiguous original scene/export pair.
const emoteIds=new Set(emotes.map(e=>e.id)),compact=id=>String(id).toLowerCase().replace(/[^a-z0-9]/g,'');
const sourceAliases=emotes.flatMap(e=>[compact(e.scene+e.animation),compact(e.scene.replace(/_dl$/,'')+e.animation)].map(key=>({key,id:e.id})));
function resolveEmoteId(id){if(typeof id!=='string')return null;if(emoteIds.has(id))return id;if(id.length>180||!/^[a-zA-Z0-9._:/-]+$/.test(id))return null;
 const value=compact(id),matches=[...new Set(sourceAliases.filter(a=>value.endsWith(a.key)).map(a=>a.id))];return matches.length===1?matches[0]:null;}
const skin=id=>towerSkins.find(s=>s.id===id)||towerSkins[0];
const validEmote=id=>emotes.some(e=>e.id===id),validSkin=id=>towerSkins.some(e=>e.id===id);
return {EMOTE_PRICE,TOWER_SKIN_PRICE,emotes,towerSkins,retiredTowerSkins,towerSkinAvailability,magicItems,collectionSections,skin,validEmote,validSkin,resolveEmoteId,rarities};});
