/* Reward presentation only. Entitlements are committed once by economy.js before
   this sequence starts; tapping, skipping or closing never grants anything. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./core.js'):root.RoyaleCore);if(n)module.exports=api;else root.RoyaleChestOpening=api;})(globalThis,function(C){'use strict';
const exportsByKind={treasure:'wooden',gem:'gold',silver:'iron',gold:'gold',magic:'magical',wood:'wooden',crown:'star',legendary:'legendary',epic:'epic',giant:'giant',lightning:'gold','mega-lightning':'lightmega','legendary-kings':'legendary','royal-wild':'lightning_legendary'};
const closedByKind={treasure:'Chest_wood',gem:'Chest_gold',silver:'Chest_iron',gold:'Chest_gold',magic:'Chest_magical',wood:'Chest_wood',crown:'chest_star_closed',legendary:'chest_legendary_closed',epic:'chest_epic_closed',giant:'chest_giant_closed',lightning:'Chest_gold','mega-lightning':'Chest_magical','legendary-kings':'chest_legendary_closed','royal-wild':'chest_legendary_closed'};
function entries(reward,owned=[]){
 const out=[];for(const kind of ['gold','gems'])if(reward[kind]>0)out.push({kind,count:reward[kind],name:kind==='gold'?'Gold':'Gems',rarity:'Common'});
 for(const item of reward.cards||[]){const card=C.CARD_BY_ID[item.id];if(!card||!(item.count>0))continue;const previous=out.find(x=>x.kind==='card'&&x.id===item.id);if(previous)previous.count+=item.count;else out.push({kind:'card',id:item.id,count:item.count,name:card.name,rarity:card.rarity,isNew:!owned.includes(item.id)});}
 for(const [rarity,count]of Object.entries(reward.wildcards||{}))if(count>0)out.push({kind:'wildcard',count,name:rarity+' Wild Cards',rarity});
 for(const [rarity,count]of Object.entries(reward.tradeTokens||{}))if(count>0)out.push({kind:'token',count,name:rarity+' Trade Token',rarity});
 return out;
}
function clip(scene,name){return scene?.clips?.[scene?.exports?.[name]];}
function range(scene,name){const c=clip(scene,name);if(!c)throw Error('Original chest timeline unavailable: '+name);const at=label=>c.labels.indexOf(label);return{fps:c.fps,start:0,play:Math.max(0,at('play')),end:at('end')>=0?at('end'):c.frames.length-1,idle:Math.max(0,at('idle'))};}
class Sequence{
 constructor(reward,{scene,kind='silver',owned=[]}={}){this.scene=scene;this.kind=kind;this.entries=entries(reward,owned);this.openingExport='chest_open_'+(exportsByKind[kind]||'wooden');this.openingRange=range(scene,this.openingExport);this.index=-1;this.stage='arriving';this.elapsed=0;}
 get current(){return this.entries[this.index]||null;}
 get closedExport(){return closedByKind[this.kind]||'Chest_wood';}
 get remaining(){return Math.max(0,this.entries.length-Math.max(0,this.index)-1);}
 get revealExport(){return this.current?.rarity==='Legendary'?'card_rotate_legendary_extended':'card_rotate_'+(this.current?.rarity||'Common').toLowerCase()+'_short';}
 get faceExport(){return 'card_reveal_'+(this.current?.rarity||'Common').toLowerCase();}
 duration(name){const c=clip(this.scene,name);return c?c.frames.length/c.fps:0;}
 get rotationDuration(){return this.duration(this.revealExport);}
 get phaseDuration(){if(this.stage==='arriving')return .3;if(this.stage==='opening')return(this.openingRange.end-this.openingRange.start)/this.openingRange.fps;if(this.stage==='revealing')return this.rotationDuration+this.duration(this.faceExport);return Infinity;}
 set(stage){this.stage=stage;this.elapsed=0;}
 advance(seconds){if(!Number.isFinite(seconds)||seconds<=0)return;let left=seconds;for(let guard=0;guard<4&&left>0;guard++){const remaining=this.phaseDuration-this.elapsed;if(!Number.isFinite(remaining)){this.elapsed+=left;break;}const step=Math.min(left,Math.max(0,remaining));this.elapsed+=step;left-=step;if(this.elapsed+1e-9<this.phaseDuration)break;if(this.stage==='arriving')this.set('closed');else if(this.stage==='opening'){this.index=0;this.set(this.entries.length?'revealing':'summary');}else if(this.stage==='revealing')this.set('shown');}}
 tap(){if(this.stage==='closed')this.set('opening');else if(this.stage==='revealing')this.set('shown');else if(this.stage==='shown'){if(this.index+1<this.entries.length){this.index++;this.set('revealing');}else this.set('summary');}else if(this.stage==='summary')this.set('done');}
 skip(){if(this.stage!=='done')this.set('summary');}
 get chestFrame(){const r=this.openingRange;return this.stage==='arriving'?Math.min(r.idle,Math.floor(this.elapsed*r.fps)):this.stage==='closed'?r.idle:this.stage==='opening'?Math.min(r.end,r.start+Math.floor(this.elapsed*r.fps)):r.end;}
}
return{Sequence,entries,exportsByKind};});
