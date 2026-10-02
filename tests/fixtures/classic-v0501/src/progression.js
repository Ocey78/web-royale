/* Historical June-2021 road order, separate from the retained 3.2557.2 card balance. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./road-data.js'):root.RoyaleRoadData);if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleProgression=api;})(globalThis,function(road){'use strict';
const names=['Goblin Stadium','Bone Pit','Barbarian Bowl','P.E.K.K.A’s Playhouse','Spell Valley','Builder’s Workshop','Royal Arena','Frozen Peak','Jungle Arena','Hog Mountain','Electro Valley','Spooky Town','Rascal’s Hideout','Serenity Peak'];
const ids=['goblin','bone','barbarian','pekka','spell','builder','royal','frozen','jungle','hog','electro','spooky','rascals','serenity'];
const gates=[0,300,600,1000,1300,1600,2000,2300,2600,3000,3400,3800,4200,4600];
const ARENAS=Object.freeze(ids.map((id,i)=>Object.freeze({id,name:names[i],number:i+1,trophies:gates[i],image:'classic-arena-'+id})));
const LEAGUES=Object.freeze(['Challenger I','Challenger II','Challenger III','Master I','Master II','Master III','Champion','Grand Champion','Royal Champion','Ultimate Champion'].map((name,i)=>Object.freeze({name,trophies:[5000,5300,5600,6000,6300,6600,7000,7300,7600,8000][i],image:'classic-league-'+(i+1)})));
function arenaForTrophies(trophies){const t=Number.isFinite(trophies)?Math.max(0,trophies):0;return [...ARENAS].reverse().find(a=>t>=a.trophies)||ARENAS[0];}
function leagueForTrophies(trophies){const t=Number.isFinite(trophies)?Math.max(0,trophies):0;return [...LEAGUES].reverse().find(l=>t>=l.trophies)||null;}
function currentProgression(profile){const t=Number(profile?.trophies)||0;return leagueForTrophies(t)||arenaForTrophies(t);}
function cheatFlags(raw){const c={duplicates:raw?.duplicates===true,placement:raw?.placement===true,overlevels:raw?.overlevels===true};if(raw?.elixir===true)c.elixir=true;return c;}
function timeLabel(seconds){const s=Math.max(0,Math.ceil(seconds));if(s>=3600)return Math.floor(s/3600)+'H'+(Math.floor(s%3600/60)?' '+Math.floor(s%3600/60)+'MIN':'');if(s>=60)return Math.floor(s/60)+'MIN'+(s%60?' '+s%60+'S':'');return s+'S';}
function arenaUnlocks(cards,sourceArenas,number){const names=new Set(sourceArenas.filter(a=>a.Arena===number).map(a=>a.Name));return cards.filter(c=>names.has(c.arena||c.source?.UnlockArena));}
// Add new IDs between existing milestones: old claims and reward content stay valid.
const magicSteps=ARENAS.flatMap((arena,i)=>{const next=ARENAS[i+1]?.trophies??5000,span=Math.max(100,next-arena.trophies),n=i+1,rarity=n<4?'Common':n<8?'Rare':n<12?'Epic':'Legendary',book=n<4?'common-book':n<8?'rare-book':n<12?'epic-book':n<14?'legendary-book':'book-of-books';return [
 {id:'road2-wild-'+n,trophies:arena.trophies+Math.floor(span*.22),kind:'wildcards',rarity,amount:rarity==='Common'?100*n:rarity==='Rare'?20*n:rarity==='Epic'?4*n:n-10,align:'left'},
 {id:'road2-book-'+n,trophies:arena.trophies+Math.floor(span*.57),kind:'magic-item',item:book,amount:1,align:'right'},
 {id:'road2-coin-'+n,trophies:arena.trophies+Math.floor(span*.87),kind:'magic-item',item:'magic-coin',amount:1+Math.floor(n/6),align:'left'}
 ];});
const ROAD_REWARDS=Object.freeze([...(road?.steps||[]),...magicSteps].sort((a,b)=>a.trophies-b.trophies||a.id.localeCompare(b.id)).map(s=>Object.freeze(s)));
function currentArena(profile){return arenaForTrophies(profile?.trophies);}
function highestArena(profile){return arenaForTrophies(Math.max(Number(profile?.trophies)||0,Number(profile?.highestTrophies)||0));}
function cardArenaNumber(card,sourceArenas){const key=card?.arena||card?.source?.UnlockArena||'TrainingCamp';if(key==='TrainingCamp')return 0;const row=sourceArenas.find(a=>a.Name===key);return row&&Number.isFinite(row.Arena)?Math.min(14,Math.max(0,row.Arena)):Infinity;}
function eligibleCards(cards,sourceArenas,number){return cards.filter(c=>cardArenaNumber(c,sourceArenas)<=number);}
function trophyFloor(profile){const peak=Math.max(Number(profile?.trophies)||0,Number(profile?.highestTrophies)||0);return peak>=5000?5000:arenaForTrophies(peak).trophies;}
function rewardState(profile,step){if(profile?.roadClaimed?.includes(step.id))return 'claimed';return Math.max(Number(profile?.highestTrophies)||0,Number(profile?.trophies)||0)>=step.trophies?'available':'locked';}
function rewardIcon(r){if(r.kind==='magic-item')return 'magic-'+r.item;if(r.kind==='gold'||r.kind==='gems')return r.kind;if(r.kind==='emote')return 'emote-'+r.emote;if(r.kind==='tokens')return 'road-token-'+r.rarity.toLowerCase();if(r.kind==='wildcards')return 'road-wild-'+r.rarity.toLowerCase();if(r.kind==='cards')return r.rarity.toLowerCase();if(r.kind==='chest'){const key=r.chest||'';if(/Shop_Large_Legendary|LegendaryKings/.test(key))return 'road-chest-legendarykings';if(/Legendary/.test(key))return 'road-chest-legendary';if(/Epic/.test(key))return 'road-chest-epic';if(/Giant/.test(key))return 'road-chest-giant';if(/Shop_Small|Lightning/.test(key))return 'road-chest-lightning';if(/Magic|Large/.test(key))return 'magic-chest';if(/Silver/.test(key))return 'silver-chest';return 'gold-chest';}return null;}
return{rewardIcon,ARENAS,LEAGUES,ROAD_REWARDS,currentArena,currentProgression,leagueForTrophies,highestArena,cardArenaNumber,eligibleCards,trophyFloor,rewardState,arenaForTrophies,cheatFlags,timeLabel,arenaUnlocks};});
