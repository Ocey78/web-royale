/* Wins-based battle chest rules. Wall clock time never advances these chests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleChestRules=api;})(globalThis,function(){'use strict';
const kinds=['treasure','gem','silver','gold','magic','legendary','giant','epic','lightning','mega-lightning','legendary-kings','royal-wild','wood','crown'];
function canonical(kind){return ({golden:'gold',magical:'magic'})[kind]|| (kinds.includes(kind)?kind:'wood');}
function required(kind){kind=canonical(kind);return kind==='gem'?2:kind==='silver'?1:kind==='gold'?3:kind==='magic'?4:kind==='legendary'?10:5;}
function normalize(c,now=Date.now()){
 const kind=canonical(c.kind),winsRequired=required(kind),legacyReady=!Number.isFinite(c.winsProgress)&&Number(c.unlockAt)>0&&Number(c.unlockAt)<=now;
 return {kind,winsRequired,winsProgress:legacyReady?winsRequired:Math.max(0,Math.min(winsRequired,Math.floor(Number(c.winsProgress)||0))),unlockAt:0};
}
function ready(c){return !!c&&Number(c.winsProgress)>=required(c.kind);}
function icon(kind){return ({treasure:'treasure-chest',gem:'gem-chest',silver:'silver-chest',gold:'gold-chest',magic:'magic-chest',legendary:'road-chest-legendary',giant:'road-chest-giant',epic:'road-chest-epic',lightning:'road-chest-lightning','mega-lightning':'road-chest-lightning','legendary-kings':'road-chest-legendarykings','royal-wild':'road-chest-legendarykings',wood:'classic-wood-chest',crown:'classic-crown-chest'})[canonical(kind)];}
function label(c){
 const n=required(c?.kind),raw=Number(c?.winsProgress),progress=Number.isFinite(raw)?Math.max(0,Math.min(n,Math.floor(raw))):0;
 const remaining=n-progress,isReady=remaining===0;
 return {title:isReady?'Open now!':'Locked',detail:isReady?'Ready!':remaining+(remaining===1?' Win':' Wins'),remaining,ready:isReady};
}
// Preserve Gem/Magical/Treasure/Gold weights exactly; the new Legendary
// chance is one in 1000, taken from Silver's share, not from those rarities.
const DROP_WEIGHTS=Object.freeze({legendary:60,treasure:4000,gem:5000,magic:5000,gold:10000,silver:35940});
function hash(text){let h=2166136261;for(const ch of String(text))h=Math.imul(h^ch.charCodeAt(0),16777619);h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;return h>>>0;}
function battleDrop(resultId,seed=0){let roll=hash(String(seed)+':battle-chest:'+String(resultId))%60000;for(const [kind,weight]of Object.entries(DROP_WEIGHTS)){if(roll<weight)return kind;roll-=weight;}return'silver';}
const RARITIES=['Common','Rare','Epic','Legendary'],BOOKS=['common-book','rare-book','epic-book','legendary-book','book-of-books'];
// One independent item-category roll per eligible win, including full chest slots.
// Each category has 1/1000 probability. It never touches combat/random deck RNG.
function battleItem(resultId,seed=0){const key=String(seed)+':battle-item:'+String(resultId),roll=hash(key)%1000;if(roll>2)return null;const q=hash(key+':contents');
 if(roll===0){const r=q%100,rarity=r<60?'Common':r<90?'Rare':r<99?'Epic':'Legendary',range={Common:[50,250],Rare:[25,75],Epic:[5,19],Legendary:[1,1]}[rarity];return {kind:'wild',id:'wild-'+rarity.toLowerCase(),rarity,count:range[0]+hash(key+':amount')%(range[1]-range[0]+1)};}
 if(roll===1){const r=q%100,id=r<40?BOOKS[0]:r<70?BOOKS[1]:r<90?BOOKS[2]:r<99?BOOKS[3]:BOOKS[4];return{kind:'book',id,count:1};}
 return{kind:'coin',id:'magic-coin',count:1};}
function normalizeItems(raw){if(!Array.isArray(raw))return [];return raw.slice(0,1).flatMap(i=>{if(!i||!Number.isFinite(i.count)||i.count<1)return[];const r=RARITIES.find(r=>i.id==='wild-'+r.toLowerCase());if(r)return[{kind:'wild',id:i.id,rarity:r,count:Math.min(100000,Math.floor(i.count))}];if(BOOKS.includes(i.id))return[{kind:'book',id:i.id,count:Math.min(999,Math.floor(i.count))}];return i.id==='magic-coin'?[{kind:'coin',id:i.id,count:Math.min(999,Math.floor(i.count))}]:[];});}
return {battleItem,normalizeItems,DROP_WEIGHTS,battleDrop,kinds,canonical,required,normalize,ready,icon,label};});
