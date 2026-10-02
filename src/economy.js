/* Atomic local rewards. Chest entitlement is independent of active decks or
   manual scene selection. No real payment/account service is involved. */
(function(root,factory){const n=typeof module==='object'&&module.exports,a=factory(n?require('./core.js'):root.RoyaleCore,n?require('./progression.js'):root.RoyaleProgression,n?require('./chest-rules.js'):root.RoyaleChestRules,n?require('./cosmetics.js'):root.RoyaleCosmetics,n?require('./crown-road.js'):root.RoyaleCrownRoad,n?require('./modern-rewards.js'):root.RoyaleModernRewards);if(n)module.exports=a;else root.RoyaleEconomy=a;})(globalThis,function(C,R,Chest,Cos,Crown,Modern){'use strict';
const CHART={silver:{gold:120,cards:12,wait:10800000},gold:{gold:350,cards:30,wait:28800000},magic:{gold:800,cards:70,wait:43200000}};
const hash=s=>{let n=2166136261;for(const ch of String(s))n=Math.imul(n^ch.charCodeAt(0),16777619);return n>>>0;};
const fail=(p,reason)=>({ok:false,profile:p,reason});
const SHOP_ROUND=Object.freeze({Common:10,Rare:5,Epic:1,Legendary:1});
function shopQuantityMultiplier(raw){const level=Math.max(1,Math.min(13,Math.floor(Number(raw?.kingLevel)||1)));return 1+.025*(level-1);}
function scaleShopQuantity(base,rarity,raw){const step=SHOP_ROUND[rarity]||1,m=shopQuantityMultiplier(raw),scaled=Math.max(base,Math.round((base*m)/step)*step);return Math.max(step,scaled);}
function scaledDirectQuantity(rarity,raw,baseByRarity){const base=baseByRarity[rarity]??1;return scaleShopQuantity(base,rarity,raw);}
function shopWindow(now=Date.now()){if(typeof now==='string'){if(/^hourshop-\d+$/.test(now))return now;if(/^\d{4}-\d{2}-\d{2}$/.test(now))now=Date.parse(now+'T00:00:00Z');else return null;}return Number.isFinite(now)&&now>=0?'hourshop-'+Math.floor(now/3600000):null;}
function offers(now=Date.now(),rawProfile=null){
 const rng=C.rng(hash(shopWindow(now)||'invalid')),p=rawProfile?C.normalizeProfile(rawProfile):null,out=[];
 for(const rarity of ['Common','Rare','Epic','Legendary']){
  const pool=(p?cardPool(p):C.CARDS).filter(c=>c.rarity===rarity),shuffled=[...pool];
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  for(let n=0;n<3;n++){
   const c=shuffled[n%Math.max(1,shuffled.length)];
   if(!c){out.push({id:null,rarity,locked:true,quantity:0,price:0});continue;}
   const quantity=scaledDirectQuantity(rarity,p||{kingLevel:1},{Common:20,Rare:5,Epic:1,Legendary:1}),price=rarity==='Common'?100:rarity==='Rare'?250:rarity==='Epic'?500:1000;
   out.push({id:c.id,rarity,locked:false,quantity,price});
  }
 }
 return out;
}
const LIGHTNING_INTERVAL=600000;
function lightningWindow(now=Date.now()){return Number.isFinite(now)&&now>=0?'lightning-'+Math.floor(now/LIGHTNING_INTERVAL):null;}
function lightningOffers(now=Date.now(),rawProfile=null){
 const window=lightningWindow(now);if(!window)return[];
 const p=rawProfile?C.normalizeProfile(rawProfile):C.normalizeProfile({}),random=C.rng(hash(window)),pool=cardPool(p),used=new Set(),out=[];
 for(let slot=0;slot<3;slot++){
  let available=pool.filter(c=>!used.has(c.id));if(!available.length)available=pool;
  const rarities=['Common','Rare','Epic','Legendary'].filter(r=>available.some(c=>c.rarity===r));
  if(!rarities.length)break;
  const rarity=rarities[Math.floor(random()*rarities.length)],cards=available.filter(c=>c.rarity===rarity),c=cards[Math.floor(random()*cards.length)];used.add(c.id);
  out.push({id:c.id,rarity,locked:false,quantity:scaledDirectQuantity(rarity,p,{Common:20,Rare:5,Epic:1,Legendary:1}),price:rarity==='Common'?100:rarity==='Rare'?250:rarity==='Epic'?500:1000});
 }
 return out;
}
function purchaseLightningCard(raw,index,now=Date.now(),expectedWindow=null,expectedCard=null,expectedQuantity=null){
 const p=C.normalizeProfile(raw),window=lightningWindow(now);
 if(!window||!Number.isInteger(index)||index<0||index>=3)return fail(p,'Invalid offer');
 if(expectedWindow!==null&&expectedWindow!==window)return fail(p,'This offer expired. Refresh the shop.');
 const o=lightningOffers(now,p)[index],key=window+':'+index;
 if(!o||expectedCard&&o.id!==expectedCard||expectedQuantity!==null&&Number(expectedQuantity)!==o.quantity)return fail(p,'This offer changed. Refresh the shop.');
 if(p.lightningPurchases[key])return fail(p,'Offer already purchased');
 if(p.gold<o.price)return fail(p,'Not enough gold');
 p.gold-=o.price;const reward={gold:0,cards:[{id:o.id,count:o.quantity}]};grant(p,reward);p.lightningPurchases[key]=1;
 return {ok:true,profile:p,reward};
}
// Unlike timed shops, this rotation advances only after two successful purchases.
const GEM_OFFERS=Object.freeze({
 Common:Object.freeze({minQuantity:150,maxQuantity:500,price:20}),
 Rare:Object.freeze({minQuantity:50,maxQuantity:100,price:50}),
 Epic:Object.freeze({minQuantity:10,maxQuantity:15,price:100}),
 Legendary:Object.freeze({minQuantity:2,maxQuantity:3,price:200})
});
function gemOffers(rawProfile=null){
 const p=C.normalizeProfile(rawProfile),random=C.rng(hash('gemshop:'+p.world.seed+':'+p.gemShop.rotation)),pool=cardPool(p,p.gemShop.arenaNumber),used=new Set(),out=[];
 for(let slot=0;slot<6;slot++){
  const remaining=pool.filter(c=>!used.has(c.id));if(!remaining.length)break;
  const rarities=['Common','Rare','Epic','Legendary'].filter(r=>remaining.some(c=>c.rarity===r)),rarity=rarities[Math.floor(random()*rarities.length)],cards=remaining.filter(c=>c.rarity===rarity),card=cards[Math.floor(random()*cards.length)];used.add(card.id);
  // Keep quantity randomness separate from card selection so saved partial
  // rotations retain the same card IDs, slots, prices and purchase markers.
  const spec=GEM_OFFERS[rarity],rawQuantity=spec.minQuantity+hash('gemshop-quantity:'+p.world.seed+':'+p.gemShop.rotation+':'+slot+':'+card.id)%(spec.maxQuantity-spec.minQuantity+1),quantity=scaleShopQuantity(rawQuantity,rarity,p);
  out.push({kind:'card',id:card.id,name:card.name,rarity,locked:false,currency:'gems',quantity,price:spec.price});
 }
 return out;
}
function purchaseGemCard(raw,index,expectedRotation,expectedCard,expectedQuantity=null){
 const p=C.normalizeProfile(raw);
 if(!Number.isInteger(index)||index<0||index>=6)return fail(p,'Invalid Gem Shop offer');
 if(!Number.isSafeInteger(expectedRotation)||expectedRotation!==p.gemShop.rotation)return fail(p,'The Gem Shop refreshed. Choose a new offer.');
 const offer=gemOffers(p)[index];if(!offer||typeof expectedCard!=='string'||offer.id!==expectedCard||expectedQuantity!==null&&Number(expectedQuantity)!==offer.quantity)return fail(p,'This offer changed. Refresh the shop.');
 if(p.gemShop.purchased.includes(index))return fail(p,'Offer already purchased');
 if(p.gems<offer.price)return fail(p,'Not enough gems');
 p.gems-=offer.price;const reward={gold:0,cards:[{id:offer.id,count:offer.quantity}]};grant(p,reward);
 p.gemShop.purchased.push(index);const refreshed=p.gemShop.purchased.length===2;
 if(refreshed){p.gemShop.rotation++;p.gemShop.arenaNumber=R.highestArena(p).number;p.gemShop.purchased=[];}
 return {ok:true,profile:C.normalizeProfile(p),reward,refreshed};
}
const DAILY_INTERVAL=86400000;
function dailyWindow(now=Date.now()){return Number.isFinite(now)&&now>=0?'dailyshop-'+Math.floor(now/DAILY_INTERVAL):null;}
function dailyOffers(now=Date.now(),rawProfile=null){
 const window=dailyWindow(now);if(!window)return[];const p=C.normalizeProfile(rawProfile),seed=window+':'+p.world.seed,random=C.rng(hash(seed)),integer=(lo,hi)=>lo+Math.floor(random()*(hi-lo+1));
 const gold=integer(10,1000)*10,gems=integer(1,50)*5,roll=integer(0,99),rarity=roll===0?'Legendary':roll<10?'Epic':roll<40?'Rare':'Common';
 const count=5*(rarity==='Legendary'?1:rarity==='Epic'?integer(5,19):rarity==='Rare'?integer(25,75):integer(50,250));
 const out=[{kind:'gold-chest',name:'Gold Chest',price:0,icon:'gold-chest',reward:{gold,cards:[]}},{kind:'gem',name:'Gem Chest',price:0,icon:'gem-chest',reward:{gold:0,gems,cards:[]}},{kind:'wildcard',name:rarity+' Wild Cards',rarity,quantity:count,price:0,icon:'road-wild-'+rarity.toLowerCase(),reward:{gold:0,cards:[],wildcards:{[rarity]:count}}}];
 const pool=cardPool(p),used=new Set();for(let slot=3;slot<9;slot++){
  const available=pool.filter(c=>!used.has(c.id)),cards=available.length?available:pool,c=cards[integer(0,cards.length-1)];used.add(c.id);
  const quantity=scaledDirectQuantity(c.rarity,p,{Common:500,Rare:150,Epic:30,Legendary:8}),price=c.rarity==='Common'?100:c.rarity==='Rare'?250:c.rarity==='Epic'?500:1000;
  out.push({kind:'card',id:c.id,name:c.name,rarity:c.rarity,quantity,price,reward:{gold:0,cards:[{id:c.id,count:quantity}]}});
 }
 return out;
}
function purchaseDailyOffer(raw,index,now=Date.now(),expectedWindow=null,expectedCard=null,expectedQuantity=null){
 const p=C.normalizeProfile(raw),window=dailyWindow(now);if(!window||!Number.isInteger(index)||index<0||index>8)return fail(p,'Invalid daily offer');
 if(expectedWindow!==null&&expectedWindow!==window)return fail(p,'This offer expired. Refresh the shop.');
 const key=window+':'+index;if(p.dailyPurchases[key])return fail(p,'Already collected today');
 const offer=dailyOffers(now,p)[index];if(expectedCard&&expectedCard!==offer.id||expectedQuantity!==null&&offer.kind==='card'&&Number(expectedQuantity)!==offer.quantity)return fail(p,'This offer changed. Refresh the shop.');
 if(p.gold<offer.price)return fail(p,'Not enough gold');p.gold-=offer.price;grant(p,offer.reward);p.dailyPurchases[key]=1;
 return{ok:true,profile:C.normalizeProfile(p),reward:offer.reward,kind:offer.kind};
}
function dailyGift(raw,date){const p=C.normalizeProfile(raw);if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return fail(p,'Invalid date');if(p.dailyClaim===date)return fail(p,'Already collected today');p.dailyClaim=date;p.gold+=250;return {ok:true,profile:p,reward:{gold:250,cards:[]}};}
function purchaseCard(raw,index,now=Date.now(),expectedWindow=null,expectedCard=null,expectedQuantity=null){const p=C.normalizeProfile(raw),window=shopWindow(now);if(!window||!Number.isInteger(index)||index<0||index>=12)return fail(p,'Invalid offer');if(expectedWindow!==null&&expectedWindow!==window)return fail(p,'This offer expired. Refresh the shop.');const o=offers(now,p)[index],key=window+':'+index;if(expectedCard&&o?.id!==expectedCard||expectedQuantity!==null&&o&&Number(expectedQuantity)!==o.quantity)return fail(p,'This offer changed. Refresh the shop.');if(!o||o.locked||!o.id)return fail(p,'Reach the required arena to unlock this rarity.');if(p.shopPurchases[key])return fail(p,'Offer already purchased');if(p.gold<o.price)return fail(p,'Not enough gold');p.gold-=o.price;const reward={gold:0,cards:[{id:o.id,count:o.quantity}]};grant(p,reward);p.shopPurchases[key]=1;return {ok:true,profile:p,reward};}
function cardPool(p,arenaNumber=R.highestArena(p).number,rarity){const limit=Math.min(R.highestArena(p).number,Math.max(1,Math.floor(arenaNumber)||1));return C.CARDS.filter(c=>(C.DEFAULT_DECK.includes(c.id)||R.cardArenaNumber(c,C.DATA.arenas)<=limit)&&(!rarity||c.rarity===rarity));}
function randomCards(p,arena,rarity,count,seed){const pool=cardPool(p,arena,rarity);if(!pool.length)return [];const random=C.rng(hash(seed));return [{id:pool[Math.floor(random()*pool.length)].id,count}];}
// The original Giant base count, gold/card and arena multipliers are bundled
// with the game. Keep its Common/Rare identity instead of falling back to Silver.
function giantLoot(seed,p,arenaNumber){
 const source=C.DATA.chests.find(c=>c.Name==='Giant'),arena=C.DATA.arenas.find(a=>a.Arena===arenaNumber);
 const count=Math.max(1,Math.floor(source.RandomSpells*(arena?.ChestRewardMultiplier||100)/100));
 const rare=Math.floor(count/source.RareChance),cards=[...randomCards(p,arenaNumber,'Common',count-rare,String(seed)+':common'),...randomCards(p,arenaNumber,'Rare',rare,String(seed)+':rare')];
 return {gold:count*source.MinGoldPerCard,cards,arenaNumber};
}
function loot(kind,seed,p,arenaNumber=R.highestArena(p).number){if(kind==='treasure')return{gold:10000+Math.floor(C.rng(hash(String(seed)+':treasure'))()*90001),cards:[],arenaNumber};if(kind==='giant')return giantLoot(seed,p,arenaNumber);if(kind==='gem')return{gold:0,gems:5*(1+Math.floor(C.rng(hash(seed+':gems'))()*50)),cards:[],arenaNumber};if(kind==='legendary'){const cards=randomCards(p,arenaNumber,'Legendary',1,seed);return {gold:0,cards,...(!cards.length?{wildcards:{Legendary:1}}:{}),arenaNumber};}if(kind==='epic')return {gold:0,cards:randomCards(p,arenaNumber,'Epic',20,seed),arenaNumber};const tier=CHART[kind]||CHART.silver,cards=[];for(let i=0;i<3;i++){const rarity=i===2&&kind==='magic'?'Epic':i===1?'Rare':'Common';cards.push(...randomCards(p,arenaNumber,rarity,i===0?tier.cards:i===1?Math.ceil(tier.cards/8):1,String(seed)+':'+i));}return {gold:tier.gold,cards,arenaNumber};}
function grant(p,reward,{discover=true,formRegistry}={}){p.gold=Math.min(9999999,p.gold+(reward.gold||0));p.gems=Math.min(9999999,p.gems+(reward.gems||0));for(const c of reward.cards||[]){if(!C.CARD_BY_ID[c.id]||!Number.isInteger(c.count)||c.count<1||!cardPool(p).some(x=>x.id===c.id))continue;p.copies[c.id]=Math.min(100000,p.copies[c.id]+c.count);const eligible=C.DEFAULT_DECK.includes(c.id)||R.cardArenaNumber(C.CARD_BY_ID[c.id],C.DATA.arenas)<=R.highestArena(p).number;if(discover&&c.count>0&&eligible&&!p.unlockedCards.includes(c.id))p.unlockedCards.push(c.id);}for(const kind of ['wildcards','tradeTokens'])for(const [rarity,n]of Object.entries(reward[kind]||{}))p[kind][rarity]=Math.min(100000,(p[kind][rarity]||0)+n);if(Cos.validEmote(reward.emote)&&!p.ownedEmotes.includes(reward.emote))p.ownedEmotes.push(reward.emote);for(const [id,count] of Object.entries(reward.magicItems||{}))if(Object.hasOwn(p.magicItems,id)&&Number.isInteger(count)&&count>0)p.magicItems[id]=Math.min(999,p.magicItems[id]+count);Modern.addHeroCoins(p,reward.heroCoins||0);p.evoWildShards=Math.min(999999,(p.evoWildShards||0)+(reward.evoWildShards||0));for(const [id,n]of Object.entries(reward.formShards||{}))Modern.addShards(p,id,n,{registry:formRegistry});for(const id of reward.unlockedForms||[])Modern.grantForm(p,id,{registry:formRegistry});for(const [id,n]of Object.entries(reward.towerTroops||{})){p.towerTroopCopies||={};p.towerTroopCopies[id]=Math.min(100000,(p.towerTroopCopies[id]||0)+n);p.unlockedTowerTroops||=[];if(!p.unlockedTowerTroops.includes(id))p.unlockedTowerTroops.push(id);}if(reward.sourceCosmetics){p.sourceCosmetics||=[];for(const row of reward.sourceCosmetics)if(!p.sourceCosmetics.some(r=>r.kind===row.kind&&r.id===row.id))p.sourceCosmetics.push(row);}return p;}
function unlockChest(raw,id){const p=C.normalizeProfile(raw),c=p.chests.find(c=>c.id===id);return fail(p,!c?'Chest not found':Chest.ready(c)?'Chest is ready to open':'Win battles to unlock this chest');}
function openChest(raw,id){const p=C.normalizeProfile(raw),c=p.chests.find(c=>c.id===id);if(!Chest.ready(c))return fail(p,'Chest is not ready');const reward=loot(c.kind,c.id,p,R.highestArena(p).number);p.chests=p.chests.filter(x=>x.id!==id);grant(p,reward);return {ok:true,profile:p,reward};}
// A single catalogue drives both shop labels and actual charges.
const CHEST_OFFERS=Object.freeze([
 {kind:'silver',name:'Silver Chest',price:15},
 {kind:'gold',name:'Golden Chest',price:35},
 {kind:'magic',name:'Magical Chest',price:50},
 {kind:'giant',name:'Giant Chest',price:65},
 {kind:'epic',name:'Epic Chest',price:80,rarity:'Epic'},
 {kind:'legendary',name:'Legendary Chest',price:100,rarity:'Legendary'}
].map(o=>Object.freeze({...o,icon:Chest.icon(o.kind)})));
function chestOffers(raw){
 const p=C.normalizeProfile(raw),rarities=new Set(cardPool(p).map(c=>c.rarity));
 return CHEST_OFFERS.map(o=>({...o,locked:!!o.rarity&&!rarities.has(o.rarity)}));
}
function buyChest(raw,kind,seed){
 const p=C.normalizeProfile(raw),offer=chestOffers(p).find(o=>o.kind===kind);
 if(!offer)return fail(p,'Unknown chest');
 if(offer.locked)return fail(p,'Reach an arena with '+offer.rarity+' cards before buying this chest.');
 if(p.gems<offer.price)return fail(p,'Not enough gems');
 const reward=loot(kind,seed,p);p.gems-=offer.price;grant(p,reward,{discover:true});
 return {ok:true,profile:p,reward};
}
function classicChest(raw,crown=false,now=Date.now()){const p=C.normalizeProfile(raw);if(!Number.isFinite(now)||now<0)return fail(p,'Invalid time');const ready=crown?p.earnedCrowns-p.crownChestClaimed>=10:now>=p.freeChestAt;if(!ready)return fail(p,crown?'Earn 10 crowns for your next chest':'Free chest is not ready');const arena=R.highestArena(p).number,reward={gold:crown?350:50,cards:randomCards(p,arena,'Common',crown?10:3,(crown?'crown:':'free:')+(crown?p.crownChestClaimed:p.freeChestAt)),arenaNumber:arena};grant(p,reward,{discover:true});if(crown){p.crownChestAt=0;p.crownChestClaimed+=10;}else p.freeChestAt=now+600000;return{ok:true,profile:p,reward};}
function claimPass(raw,tier){const p=C.normalizeProfile(raw);if(!Number.isInteger(tier)||tier<0||tier>=35)return fail(p,'Invalid tier');if(p.earnedCrowns<(tier+1)*10)return fail(p,'Earn more crowns in battle');if(p.passClaimed.includes(tier))return fail(p,'Reward already collected');p.passClaimed.push(tier);const chest=tier%5===4,reward=chest?loot('magic','pass-'+tier,p):{gold:100+25*tier,cards:[]};grant(p,reward,{discover:chest});return {ok:true,profile:p,reward};}
function roadChoices(p,s){const arena=R.arenaForTrophies(s.trophies).number;return (s.cards||[]).filter(id=>C.CARD_BY_ID[id]&&R.cardArenaNumber(C.CARD_BY_ID[id],C.DATA.arenas)<=arena);}
function roadChest(p,s){const name=s.chest||'',arena=R.highestArena(p).number;
 if(/^Legendary/.test(name))return{gold:0,cards:randomCards(p,arena,'Legendary',1,s.id),arenaNumber:arena};
 if(/^Epic/.test(name))return{gold:0,cards:randomCards(p,arena,'Epic',20,s.id),arenaNumber:arena};
 const reward=loot(/Magic|Large/.test(name)?'magic':'gold',s.id,p,arena);const source=C.DATA.chests.find(c=>c.Name===name);if(source?.LegendaryOverrideChance===1)reward.cards.push(...randomCards(p,arena,'Legendary',1,s.id+':guaranteed-legendary'));return reward;
}
function claimRoad(raw,id,choice){const p=C.normalizeProfile(raw),s=R.ROAD_REWARDS.find(s=>s.id===id);if(!s)return fail(p,'Unknown Trophy Road reward');const state=R.rewardState(p,s);if(state!=='available')return fail(p,state==='claimed'?'Reward already collected':'Reach '+s.trophies+' trophies to collect');let reward={gold:0,cards:[]};const arena=R.arenaForTrophies(s.trophies).number;
 switch(s.kind){case'gold':reward.gold=s.amount;break;case'gems':reward.gems=s.amount;break;
 case'choice':{const choices=roadChoices(p,s);if(!choices.includes(choice))return fail(p,'Choose one of the offered cards');reward.cards=[{id:choice,count:s.amount}];break;}
 case'card':reward.cards=[{id:s.cards[0],count:s.amount}];break;case'cards':reward.cards=randomCards(p,arena,s.rarity,s.amount,s.id);break;case'consumable':{reward=Modern.consumable(s.item,s.amount);if(!reward)return fail(p,'Reward item is unavailable');break;}case'evo-shards':reward={evoWildShards:s.amount};break;case'mystery-box':{const r=Modern.mysteryBox(s.box,{profile:p,arenaNumber:arena,seed:p.world.seed+':'+s.id});if(!r.ok)return fail(p,r.reason);reward=r.reward;break;}case'tower-troop':{const options=[s.supportCard,s.supportCardAlt].filter(Boolean),selected=options.length>1?choice:options[0];if(!options.includes(selected))return fail(p,'Choose one of the offered Tower Troops');reward={towerTroops:{[selected]:s.amount}};break;}
 case'chest':reward=roadChest(p,s);break;
 case'wildcards':reward.wildcards={[s.rarity]:s.amount};break;
 case'magic-item':reward.magicItems={[s.item]:s.amount};break;
 case'tokens':reward.tradeTokens={[s.rarity]:s.amount};break;
 case'emote':reward.emote=s.emote;break;
 default:return fail(p,'Unsupported reward');}
 grant(p,reward,{discover:true});p.roadClaimed.push(s.id);return{ok:true,profile:p,reward,step:s};
}
// Preview and claim share a deterministic Crown Road reward recipe. Premium
// chest contents are included immediately; no battle chest slots are consumed.
function crownReward(raw,n){const p=C.normalizeProfile(raw),spec=Crown.reward(n);if(!spec)return null;const reward={...spec,cards:[],wildcards:{...spec.wildcards},magicItems:{...spec.magicItems}};if(spec.chestKind){let kind=spec.chestKind;if(kind==='legendary'&&!cardPool(p,undefined,'Legendary').length)kind='magic';const contents=loot(kind,'crown-road:'+p.world.seed+':'+n,p);reward.gold=Math.min(9999999,reward.gold+(contents.gold||0));reward.gems=Math.min(9999999,reward.gems+(contents.gems||0));reward.cards=contents.cards||[];reward.chestKind=kind;}return reward;}
function claimCrown(raw,n){const p=C.normalizeProfile(raw),state=Crown.state(p,n);if(state!=='available')return fail(p,state==='claimed'?'Reward already collected':'Earn more lifetime crowns to collect this reward');const reward=crownReward(p,n);grant(p,reward);p.crownRoadClaims=Crown.mark(p,n);return{ok:true,profile:C.normalizeProfile(p),reward,milestone:n};}
function useWildcards(raw,id,count){const p=C.normalizeProfile(raw),c=C.CARD_BY_ID[id];if(!c||!Number.isInteger(count)||count<1||count>100000)return fail(p,'Invalid wildcard amount');if(R.cardArenaNumber(c,C.DATA.arenas)>R.highestArena(p).number)return fail(p,'Reach this card’s arena first');if(p.wildcards[c.rarity]<count)return fail(p,'Not enough wild cards');if(!p.unlockedCards.includes(id))return fail(p,'Unlock this card first');p.wildcards[c.rarity]-=count;p.copies[id]=Math.min(100000,p.copies[id]+count);return{ok:true,profile:p,reward:{gold:0,cards:[{id,count}]}};}
function useMagicItem(raw,itemId,target){const p=C.normalizeProfile(raw),item=Cos.magicItems.find(i=>i.id===itemId);if(!item||item.kind==='wild')return fail(p,'Select a valid magic item');if(!(p.magicItems[itemId]>0))return fail(p,'You do not own this magic item');
 if(item.kind==='key'){const chest=p.chests.find(c=>c.id===target);if(!chest||Chest.ready(chest))return fail(p,'Choose a locked chest');chest.winsProgress=chest.winsRequired;p.magicItems[itemId]--;return {ok:true,profile:p};}
 const card=C.CARD_BY_ID[target],q=card&&C.upgradeQuote(p,target);if(!card||!q?.unlocked||q.level>=C.maxLevel(card.rarity))return fail(p,'Choose an owned, non-max card');if(item.rarity&&card.rarity!==item.rarity)return fail(p,'Choose a matching rarity');
 if(item.kind==='book'){const missing=Math.max(0,q.copies-p.copies[target]);if(!missing)return fail(p,'This card already has enough copies');p.copies[target]+=missing;p.magicItems[itemId]--;return {ok:true,profile:p};}
 if(item.kind==='coin'){if(p.copies[target]<q.copies)return fail(p,'Collect the required card copies first');const before=p.gold;p.gold=Math.max(before,q.gold);const r=C.upgrade(p,target);if(!r.ok)return r;r.profile.gold=before;r.profile.magicItems[itemId]--;return r;}
 return fail(p,'Unsupported magic item');}
return {crownReward,claimCrown,CHEST_OFFERS,chestOffers,GEM_OFFERS,gemOffers,purchaseGemCard,DAILY_INTERVAL,dailyWindow,dailyOffers,purchaseDailyOffer,loot,LIGHTNING_INTERVAL,lightningWindow,lightningOffers,purchaseLightningCard,shopWindow,shopQuantityMultiplier,scaleShopQuantity,chestReady:Chest.ready,chestIcon:Chest.icon,useMagicItem,CHART,offers,dailyGift,purchaseCard,cardPool,unlockChest,openChest,buyChest,classicChest,claimPass,claimRoad,roadChoices,useWildcards,grant};});
