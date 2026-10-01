/* Local practice account; no account, payment, or multiplayer service calls. */
(function(root,factory){const n=typeof module==='object'&&module.exports,K=n?require('./catalog.js'):root.RoyaleCatalog;const api=factory(K,n?require('./progression.js'):root.RoyaleProgression,n?require('./player-xp.js'):root.RoyalePlayerXP,n?require('./cosmetics.js'):root.RoyaleCosmetics,n?require('./chest-rules.js'):root.RoyaleChestRules,n?require('./world-state.js'):root.RoyaleWorldState,n?require('./graphics.js'):root.RoyaleGraphics,n?require('./crown-road.js'):root.RoyaleCrownRoad);if(n)module.exports=api;else root.RoyaleProfile=api;})(globalThis,function(K,R,X,Cos,Chest,WorldState,Graphics,Crown){'use strict';
const {clamp}=K,num=(v,d=0,max=9999999)=>Number.isFinite(v)?clamp(Math.floor(v),0,max):d;
const text=(v,d='',len=80)=>typeof v==='string'?v.slice(0,len):d;
function normalizeCheats(raw){const c={duplicates:raw?.duplicates===true,placement:raw?.placement===true,overlevels:raw?.overlevels===true};if(raw?.elixir===true)c.elixir=true;return c;}
const PRESETS=[K.DEFAULT_DECK,['hog-rider','musketeer','cannon','ice-golem','skeletons','ice-spirit','fireball','the-log'],['golem','night-witch','baby-dragon','mega-minion','lumberjack','tornado','lightning','barbarian-barrel'],['pekka','battle-ram','bandit','electro-wizard','royal-ghost','magic-archer','poison','zap'],['goblin-barrel','princess','knight','goblin-gang','inferno-tower','rocket','the-log','ice-spirit']];
const RARITIES=['Common','Rare','Epic','Legendary'],STARTER=new Set(K.DEFAULT_DECK);
function canUseCard(profile,id){const c=K.CARD_BY_ID[id];if(!c)return false;const owned=STARTER.has(id)||profile?.unlockedCards?.includes(id);if(!owned)return false;return STARTER.has(id)||R.cardArenaNumber(c,K.DATA.arenas)<=R.highestArena(profile).number;}
function arenaNumber(profile){return R.highestArena(profile).number;}
function streakIncrement(resultId,streak){let hash=2166136261;const seed=String(resultId)+'|ranked-streak|'+streak;for(let i=0;i<seed.length;i++)hash=Math.imul(hash^seed.charCodeAt(i),16777619)>>>0;return streak<=9?10+hash%6:5+hash%11;}
function streakBonusForMatch(resultId,streak){let bonus=0;for(let tier=1;tier<=Math.floor(streak/3);tier++)bonus+=streakIncrement(String(resultId)+'|tier:'+tier,tier*3);return bonus;}
// Each unlocked tier increases the range paid on EVERY later ranked win.
// One receipt-keyed roll across the inclusive range varies by match, never by
// rendering/reload. This is O(1) even for an imported large streak.
function streakCurrencyBonus(resultId,streak,kind){
 const gold=kind==='gold',tiers=Math.floor(streak/(gold?3:5));if(tiers<=0)return 0;
 const seed=String(resultId)+'|ranked-'+kind+'|'+streak;let hash=2166136261;
 for(let i=0;i<seed.length;i++)hash=Math.imul(hash^seed.charCodeAt(i),16777619)>>>0;
 const low=tiers*(gold?100:1),high=tiers*(gold?300:10);
 return low+hash%(high-low+1);
}
function normalizeProfile(raw){
 const p=raw&&typeof raw==='object'?raw:{},fresh=Object.keys(p).length===0,levels={},copies={},cheats=normalizeCheats(p.cheats),cheatLevels={};
 for(const c of K.CARDS){
  const base=K.baseLevel(c.rarity);
  levels[c.id]=clamp(num(p.cardLevels?.[c.id],fresh?base:9,13),base,13);
  copies[c.id]=num(p.copies?.[c.id],0,100000);
  if(Number.isFinite(p.cheatLevels?.[c.id]))cheatLevels[c.id]=clamp(Math.floor(p.cheatLevels[c.id]),base,30);
 }
 const trophies=num(p.trophies,fresh?0:1000),highestTrophies=Math.max(trophies,num(p.highestTrophies,trophies)),arena=R.arenaForTrophies(trophies),peakArena=R.arenaForTrophies(highestTrophies);
 const existingDecks=Array.isArray(p.decks)?p.decks:[],deckFallback=fresh?Array.from({length:5},()=>[...K.DEFAULT_DECK]):PRESETS;
 const savedDecks=Array.isArray(p.decks)?(existingDecks.length?existingDecks.slice(0,K.MAX_DECKS):[K.DEFAULT_DECK]):deckFallback;
 const candidates=savedDecks.map((d,i)=>K.validDeck(d,cheats)?[...d]:[...(deckFallback[i%deckFallback.length]||K.DEFAULT_DECK)]);
 const inferred=new Set(K.DEFAULT_DECK),legacy=num(p.version,0,99)<5;
 if(!fresh){
  for(const id of Array.isArray(p.unlockedCards)?p.unlockedCards:[])if(K.CARD_BY_ID[id])inferred.add(id);
  // A specific card copy is ownership regardless of whether it came from a chest,
  // Shop, Trophy Road or another valid grant. Future-arena copies remain dormant
  // until that arena has actually been reached.
  for(const [id,n] of Object.entries(copies)){const c=K.CARD_BY_ID[id];if(n>0&&c&&(legacy||STARTER.has(id)||R.cardArenaNumber(c,K.DATA.arenas)<=peakArena.number))inferred.add(id);}
  // Very old saves also used deck membership as their durable collection record. Keep
  // that ownership evidence even when the current trophy position is below its arena;
  // canUseCard still enforces the arena gate before the card can enter a deck.
  if(legacy)for(const deck of candidates)for(const id of deck)if(K.CARD_BY_ID[id])inferred.add(id);
 }
 const unlockedCards=[...inferred];
 const legal=id=>inferred.has(id)&&(STARTER.has(id)||R.cardArenaNumber(K.CARD_BY_ID[id],K.DATA.arenas)<=peakArena.number);
 const sanitize=(deck,size=8,duplicates=cheats.duplicates)=>{const out=[];for(const id of deck)if(legal(id)&&(duplicates||!out.includes(id)))out.push(id);for(const id of K.DEFAULT_DECK)if(out.length<size&&(duplicates||!out.includes(id)))out.push(id);for(const c of K.CARDS)if(out.length<size&&legal(c.id)&&(duplicates||!out.includes(c.id)))out.push(c.id);return out.slice(0,size);};
 const decks=candidates.map(d=>sanitize(d)),deckNames=decks.map((_,i)=>K.deckName(p.deckNames?.[i],i));
 // Full catalog eligibility in casual play is independent of inferred ownership.
 // Preserve each existing special deck; initialize the new modes once from the
 // selected ranked deck and store them as independent arrays thereafter.
 const modeSaved=(raw,mode)=>{const size=K.modeDeckSize(mode),out=Array(size).fill(null),seen=new Set();if(Array.isArray(raw))for(let i=0;i<size;i++){const id=raw[i];if(K.allowedInMode(id,mode)&&!seen.has(id)){out[i]=id;seen.add(id);}}for(const id of [...K.DEFAULT_DECK,...K.CARDS.map(c=>c.id)]){if(!out.includes(null))break;if(K.allowedInMode(id,mode)&&!seen.has(id)){out[out.indexOf(null)]=id;seen.add(id);}}return out;};
 const casualDecks=Object.fromEntries(Object.entries(K.MODE_DECKS).map(([mode,cfg])=>[cfg.key,modeSaved(p[cfg.key]??decks[num(p.activeDeck,0,decks.length-1)],mode)]));
 const modeDeckSets={};for(const [mode,cfg] of Object.entries(K.MODE_DECKS)){const rawSet=p.modeDeckSets?.[mode],rawDecks=Array.isArray(rawSet?.decks)?rawSet.decks.slice(0,K.MAX_DECKS):[],setDecks=(rawDecks.length?rawDecks:[casualDecks[cfg.key]]).map(d=>modeSaved(d,mode)),active=num(rawSet?.active,0,setDecks.length-1);if(rawDecks.length&&Array.isArray(p[cfg.key]))setDecks[active]=modeSaved(p[cfg.key],mode);const names=setDecks.map((_,i)=>K.deckName(rawSet?.names?.[i],i));modeDeckSets[mode]={active,decks:setDecks,names};casualDecks[cfg.key]=[...setDecks[active]];}
 const experience=X.legacyTotalXp(p,fresh),xpState=X.progressFromTotalXp(experience),starPoints=num(p.starPoints,0,999999999);
 const winStreak=num(p.winStreak),milestones=Math.floor(winStreak/3),minimumBonus=Math.min(3,milestones)*10+Math.max(0,milestones-3)*5,winStreakBonus=clamp(num(p.winStreakBonus,minimumBonus,milestones*15),minimumBonus,milestones*15),bestWinStreak=Math.max(winStreak,num(p.bestWinStreak));
 // Keep reward receipts beyond the 20-entry Battle Log. Import the IDs available
 // in older saves and bound recent receipts independently of presentation history.
 const processedResultIds=[...new Set([p.lastResultId,...(Array.isArray(p.history)?p.history.filter(x=>x&&Number.isInteger(x.winner)&&x.winner>=-1&&x.winner<=3).slice(0,20).map(x=>x.replayId):[]),...(Array.isArray(p.processedResultIds)?p.processedResultIds:[])].filter(id=>typeof id==='string'&&id.length>0&&id.length<=140))].slice(0,512);
 // Retire the six custom recolors without taking away currency. A receipt per ID
 // prevents repeated normalization or reimported ownership from paying twice.
 const retiredTowerSkinRefunds=[...new Set((Array.isArray(p.retiredTowerSkinRefunds)?p.retiredTowerSkinRefunds:[]).filter(id=>Cos.retiredTowerSkins.includes(id)))];
 let towerSkinRefundCredit=num(p.towerSkinRefundCredit,0,4500),gems=num(p.gems,100);
 for(const id of Array.isArray(p.ownedTowerSkins)?p.ownedTowerSkins:[]){
  if(!Cos.retiredTowerSkins.includes(id)||retiredTowerSkinRefunds.includes(id))continue;
  retiredTowerSkinRefunds.push(id);towerSkinRefundCredit+=750;
 }
 const skinRefund=Math.min(towerSkinRefundCredit,9999999-gems);gems+=skinRefund;towerSkinRefundCredit-=skinRefund;
 const ids=a=>Array.isArray(a)?a.filter(x=>typeof x==='string'&&x.length<=180&&/^[a-zA-Z0-9._:/-]+$/.test(x)&&!['__proto__','constructor','prototype'].includes(x)).slice(0,512):[];
 const ownedInput=[...ids(p.ownedEmotes),...ids(p.unresolvedEmotes?.owned)],equippedInput=Array.isArray(p.equippedEmotes)?[...ids(p.equippedEmotes),...ids(p.unresolvedEmotes?.equipped)]:['Emote0','Emote1','Emote2','Emote3'];
 const ownedEmotes=[...new Set(['Emote0','Emote1','Emote2','Emote3',...ownedInput.map(Cos.resolveEmoteId).filter(Boolean)])];
 const equippedEmotes=[...new Set(equippedInput.map(Cos.resolveEmoteId).filter(id=>id&&ownedEmotes.includes(id)))].slice(0,8);
 const unresolvedEmotes={owned:[...new Set(ownedInput.filter(id=>!Cos.resolveEmoteId(id)))],equipped:[...new Set(equippedInput.filter(id=>!Cos.resolveEmoteId(id)))]};
 const graphicsInput=num(p.version,0,99)<14?Graphics.migrateLegacy(p.graphics):p.graphics;
 return {version:14,...Crown.normalize(p),graphics:Graphics.normalize(graphicsInput),compactSwarmLevels:p.compactSwarmLevels!==false,world:WorldState.normalize(p.world),placementHints:true,learningEnabled:true,highestTrophies,unlockedCards,
 roadClaimed:Array.isArray(p.roadClaimed)?[...new Set(p.roadClaimed.filter(id=>R.ROAD_REWARDS.some(s=>s.id===id)))]:[],
 wildcards:Object.fromEntries(RARITIES.map(k=>[k,num(p.wildcards?.[k],0,100000)])),
 tradeTokens:Object.fromEntries(RARITIES.map(k=>[k,num(p.tradeTokens?.[k],0,10000)])),
 cheats,cheatLevels,freeChestAt:Math.max(0,num(p.freeChestAt,0,9999999999999)-(num(p.version,0,99)<10&&p.freeChestAt>0?13800000:0)),crownChestAt:0,crownChestClaimed:num(p.crownChestClaimed),
 ownedEmotes,unresolvedEmotes,
 ownedTowerSkins:[...new Set(['classic',...(Array.isArray(p.ownedTowerSkins)?p.ownedTowerSkins.filter(Cos.validSkin):[])])],
 selectedTowerSkin:Cos.validSkin(p.selectedTowerSkin)&&(p.selectedTowerSkin==='classic'||p.ownedTowerSkins?.includes(p.selectedTowerSkin))?p.selectedTowerSkin:'classic',
 equippedEmotes,
 magicItems:Object.fromEntries(Cos.magicItems.filter(x=>x.kind!=='wild').map(x=>[x.id,num(p.magicItems?.[x.id],0,999)])),
 aiDifficulty:'expert',battleSerial:num(p.battleSerial),name:text(p.name,'Nano',24),experience,starPoints,kingLevel:xpState.level,level:xpState.level,xp:xpState.xpIntoLevel,matches:num(p.matches),wins:num(p.wins),losses:num(p.losses),draws:num(p.draws),winStreak,winStreakBonus,bestWinStreak,lastStreakGoldBonus:num(p.lastStreakGoldBonus,0,Math.min(9999999,Math.floor(winStreak/3)*300)),lastStreakGemBonus:num(p.lastStreakGemBonus,0,Math.min(9999999,Math.floor(winStreak/5)*10)),
 trophies,gold:num(p.gold,2500),gems,retiredTowerSkinRefunds,towerSkinRefundCredit,laneCounts:Array.isArray(p.laneCounts)&&p.laneCounts.length===2?p.laneCounts.map(x=>num(x,1,100000)):[1,1],sound:p.sound===true,lastResultId:text(p.lastResultId,'',120),processedResultIds,
 history:Array.isArray(p.history)?p.history.filter(x=>x&&Number.isInteger(x.winner)&&x.winner>=-1&&x.winner<=3).slice(0,20).map(x=>({itemRewards:Chest.normalizeItems(x.itemRewards),winner:x.winner,crowns:Array.isArray(x.crowns)?x.crowns.slice(0,x.mode==='FreeForAll'?4:2).map(n=>num(n,0,x.mode==='TeamRumble'?10:x.mode==='Team3v3'?6:3)):[0,0],date:text(x.date,'',40),duration:num(x.duration,0,650),deck:K.normalizeDeck(x.deck,{size:K.modeDeckSize(x.mode)}),mode:text(x.mode,'Default',30),queue:text(x.queue,'',30),replayId:text(x.replayId,'',140),opponent:x.opponent&&WorldState.validPlayer(x.opponent.id)?{id:x.opponent.id,name:text(x.opponent.name,'Opponent',48),trophies:num(x.opponent.trophies,0,10000),clanId:WorldState.validClan(x.opponent.clanId)?x.opponent.clanId:null}:null,practice:x.practice===true,trophyChange:Number.isFinite(x.trophyChange)?clamp(Math.trunc(x.trophyChange),-9999999,9999999):0,streakBonus:num(x.streakBonus,0,Math.floor(num(x.winStreak)/3)*15),winStreak:num(x.winStreak),streakGoldBonus:num(x.streakGoldBonus,0,Math.min(9999999,Math.floor(num(x.winStreak)/3)*300)),streakGemBonus:num(x.streakGemBonus,0,Math.min(9999999,Math.floor(num(x.winStreak)/5)*10)),goldEarned:num(x.goldEarned,0,Math.min(9999999,50+Math.floor(num(x.winStreak)/3)*300)),gemsEarned:num(x.gemsEarned,0,Math.min(9999999,Math.floor(num(x.winStreak)/5)*10))})):[],
 sandboxMap:['training','Team3v3','Team3v3Jungle','Team3v3Volcano','TeamRumble','TeamRumbleArcReverse','TeamRumbleRiverLine','BridgeBattle','BridgeBattleLava','BridgeBattleGarden','Touchdown','Touchdown3v3',...R.ARENAS.map(a=>a.id)].includes(p.sandboxMap)?p.sandboxMap:arena.id,decks,deckNames,modeDeckSets,...casualDecks,activeDeck:num(p.activeDeck,0,decks.length-1),cardLevels:levels,copies,arena:arena.id,
 chests:Array.isArray(p.chests)?p.chests.filter(x=>x&&typeof x==='object').slice(0,4).map(x=>({id:text(x.id,'chest',80),arenaNumber:clamp(num(x.arenaNumber,arena.number,14),1,peakArena.number),...Chest.normalize(x)})):[],
 passClaimed:Array.isArray(p.passClaimed)?[...new Set(p.passClaimed.filter(x=>Number.isInteger(x)&&x>=0&&x<35))]:[],dailyClaim:text(p.dailyClaim,'',12),
 shopPurchases:p.shopPurchases&&typeof p.shopPurchases==='object'?Object.fromEntries(Object.entries(p.shopPurchases).filter(([k,v])=>/^(?:\d{4}-\d{2}-\d{2}|shop-\d+|hourshop-\d+):(?:[0-9]|1[01])$/.test(k)&&Number.isFinite(v)).slice(-80)): {},
 dailyPurchases:p.dailyPurchases&&typeof p.dailyPurchases==='object'?Object.fromEntries(Object.entries(p.dailyPurchases).filter(([k,v])=>/^dailyshop-\d+:[0-8]$/.test(k)&&v===1).slice(-126)):{},
 gemShop:{rotation:num(p.gemShop?.rotation,0,Number.MAX_SAFE_INTEGER-1),arenaNumber:clamp(num(p.gemShop?.arenaNumber,peakArena.number,14),1,peakArena.number),purchased:Array.isArray(p.gemShop?.purchased)?[...new Set(p.gemShop.purchased.filter(n=>Number.isInteger(n)&&n>=0&&n<6))].slice(0,1):[]},
 lightningPurchases:p.lightningPurchases&&typeof p.lightningPurchases==='object'?Object.fromEntries(Object.entries(p.lightningPurchases).filter(([k,v])=>/^lightning-\d+:[0-2]$/.test(k)&&v===1).slice(-96)):{},
 clan:p.clan&&typeof p.clan==='object'?{name:text(p.clan.name,'Web Royale',24),badge:text(p.clan.badge,'clan_badge_01_01',50),donations:num(p.clan.donations),messages:Array.isArray(p.clan.messages)?p.clan.messages.filter(m=>m&&typeof m==='object'&&!Array.isArray(m)).slice(-50).map(m=>({kind:m.kind==='emote'&&Cos.resolveEmoteId(m.emote)?'emote':'text',emote:Cos.resolveEmoteId(m.emote),name:text(m.name,'Clanmate',24),text:text(m.text,'',240),time:num(m.time,0,9999999999999),bot:m.bot!==false})):[]}:null,
 eventsWins:num(p.eventsWins),earnedCrowns:num(p.earnedCrowns),equalLevels:false,volume:clamp(num(p.volume,60,100),0,100)};
}
function applyResult(profile,battle){
 const p=normalizeProfile(profile),r=battle.result;if(battle.isReplay||!r||p.lastResultId===battle.id||p.processedResultIds.includes(battle.id))return p;
 p.lastResultId=battle.id;p.matches++;const queue=battle.queueType||'',ranked=queue?queue==='trophy-road':!battle.is2v2&&!battle.is3v3&&battle.mode!=='BridgeBattle';
 const practice=battle.practice===true||['training','friendly','clan-war','self-play','replay'].includes(queue),startingTrophies=p.trophies;
 const opponent=battle.opponent?{id:battle.opponent.id,name:battle.opponent.name,trophies:battle.opponent.trophies,clanId:battle.opponent.clanId}:null;
 const history={itemRewards:[],winner:r.winner,crowns:[...battle.crowns],date:new Date().toISOString(),duration:Math.round(battle.time),deck:battle.initialDecks?.[0]||K.DEFAULT_DECK,mode:battle.mode||'Default',queue,replayId:battle.id,opponent,practice,trophyChange:0,streakBonus:0,winStreak:p.winStreak,streakGoldBonus:0,streakGemBonus:0,goldEarned:0,gemsEarned:0};p.history.unshift(history);p.history=p.history.slice(0,20);
 if(opponent&&WorldState.validPlayer(opponent.id)){p.world.encountered=[...new Set([...p.world.encountered,opponent.id])].slice(-200);}
 if(practice)return normalizeProfile(p);
 const goldBefore=p.gold,gemsBefore=p.gems;
 p.lastStreakGoldBonus=0;p.lastStreakGemBonus=0;
 if(ranked){
  if(r.winner===0){p.winStreak++;p.winStreakBonus=streakBonusForMatch(battle.id,p.winStreak);p.bestWinStreak=Math.max(p.bestWinStreak,p.winStreak);p.lastStreakGoldBonus=streakCurrencyBonus(battle.id,p.winStreak,'gold');p.lastStreakGemBonus=streakCurrencyBonus(battle.id,p.winStreak,'gems');}
  else{p.winStreak=0;p.winStreakBonus=0;}
 }
 p.earnedCrowns+=battle.crowns?.[0]||0;p.lifetimeCrowns=Math.min(Crown.MAX_CROWNS,p.lifetimeCrowns+(battle.crowns?.[0]||0));
 if(r.winner===0){p.wins++;for(const chest of p.chests)chest.winsProgress=Math.min(chest.winsRequired,chest.winsProgress+1);if(ranked)p.trophies=num(p.trophies+30+p.winStreakBonus);p.gold+=50+p.lastStreakGoldBonus;p.gems+=p.lastStreakGemBonus;
  const item=Chest.battleItem(battle.id,p.world.seed);if(item){const inv=item.kind==='wild'?p.wildcards:p.magicItems,key=item.kind==='wild'?item.rarity:item.id,limit=item.kind==='wild'?100000:999,before=inv[key]||0;inv[key]=Math.min(limit,before+item.count);const credited=inv[key]-before;if(credited>0)history.itemRewards.push({...item,count:credited});}
  if(p.chests.length<4)p.chests.push({id:battle.id,kind:Chest.battleDrop(battle.id,p.world.seed),arenaNumber:R.arenaForTrophies(startingTrophies).number,unlockAt:0,winsProgress:0});if(queue&&queue!=='trophy-road'||battle.mode!=='Default')p.eventsWins++;
 }else if(r.winner>=0){p.losses++;if(ranked)p.trophies=Math.max(R.trophyFloor(p),p.trophies-20);p.gold+=10;}else{p.draws++;p.gold+=20;}
 // Store the actual credited totals once. The result screen only reads these
 // receipts; opening/redrawing it can never reroll or pay a reward again.
 p.gold=num(p.gold);p.gems=num(p.gems);
 history.goldEarned=p.gold-goldBefore;history.gemsEarned=p.gems-gemsBefore;
 history.streakGoldBonus=Math.min(p.lastStreakGoldBonus,Math.max(0,history.goldEarned-50));
 history.streakGemBonus=Math.min(p.lastStreakGemBonus,history.gemsEarned);
 p.lastStreakGoldBonus=history.streakGoldBonus;p.lastStreakGemBonus=history.streakGemBonus;
 history.trophyChange=p.trophies-startingTrophies;history.streakBonus=ranked&&r.winner===0?p.winStreakBonus:0;history.winStreak=p.winStreak;
 p.laneCounts=p.laneCounts.map((n,i)=>Math.min(100000,n+(battle.laneCounts?.[i]||0)));return normalizeProfile(p);
}
function upgradeQuote(profile,id){const c=K.CARD_BY_ID[id];if(!c)return null;const p=normalizeProfile(profile),level=p.cardLevels[id],idx=level-K.baseLevel(c.rarity),rar=K.DATA.rarities[c.rarity],unlocked=canUseCard(p,id);return {level,nextLevel:Math.min(13,level+1),gold:rar.UpgradeCost[idx]||0,copies:rar.UpgradeMaterialCount[idx]||0,canUpgrade:unlocked&&level<13&&p.gold>=(rar.UpgradeCost[idx]||0)&&p.copies[id]>=(rar.UpgradeMaterialCount[idx]||0),unlocked};}
function upgrade(profile,id){const p=normalizeProfile(profile),q=upgradeQuote(p,id),c=K.CARD_BY_ID[id];if(!q?.canUpgrade)return {ok:false,profile:p,reason:!q?.unlocked?'Unlock this card first':q?.level===13?'Maximum level':'Not enough gold or cards'};p.gold-=q.gold;p.copies[id]-=q.copies;const earned=X.upgradeXp(c,q.level);p.cardLevels[id]++;X.grant(p,earned,'card-upgrade');return {ok:true,profile:p,xpEarned:earned};}
function grantDonationXp(profile,id,count=1){const p=normalizeProfile(profile),c=K.CARD_BY_ID[id],earned=c?X.donationXp(c,count):0;X.grant(p,earned,'card-donation');return {profile:p,xpEarned:earned};}
function xpProgress(profile){const p=normalizeProfile(profile);return X.progressFromTotalXp(p.experience);}
return {crownProgress:Crown.progress,chestWinsRequired:Chest.required,normalizeProfile,applyResult,upgradeQuote,upgrade,grantDonationXp,xpProgress,canUseCard,arenaNumber,PRESETS};});
