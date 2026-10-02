/* Frozen v0.51 simulation and boat adapter from v0.51.0. Data uses its own 3.2557.2 snapshot. */
(function(root){const common=typeof module==='object'&&module.exports;
const legacy={RoyaleGameData:common?require('./historical-game-data.js'):root.RoyaleHistoricalGameData};
(function(globalThis,module,require){
/* Local presentation policy. Never alters combat ticks, stats or random state. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleGraphics=api;})(globalThis,function(){'use strict';
const TIERS=Object.freeze(['low','med','good','high','max','ultra']);
const DEFAULTS=Object.freeze({textures:'good',animations:'good',particles:'good',arenaBackgrounds:'good'});
const SAFARI_DEFAULTS=Object.freeze({textures:'med',animations:'med',particles:'med',arenaBackgrounds:'med'});
const OPTIONS=Object.freeze({textures:TIERS,animations:TIERS,particles:TIERS,arenaBackgrounds:TIERS});
const LEGACY_PARTICLES=Object.freeze({off:'low','spells-only':'med',minimal:'good',full:'high'});
function migrateLegacy(raw){const g=raw&&typeof raw==='object'?raw:{};return {textures:g.textures==='high'?'good':g.textures,animations:g.animations==='high'?'good':g.animations,particles:LEGACY_PARTICLES[g.particles]||g.particles,arenaBackgrounds:g.arenaBackgrounds==='high'?'good':g.arenaBackgrounds,...(g.potato===true?{potato:true}:{})};}
function normalize(raw){const source=raw&&typeof raw==='object'?{...raw}:{};if(LEGACY_PARTICLES[source.particles])source.particles=LEGACY_PARTICLES[source.particles];return {...Object.fromEntries(Object.entries(OPTIONS).map(([key,values])=>[key,values.includes(source?.[key])?source[key]:DEFAULTS[key]])),...(source?.potato===true?{potato:true}: {})};}
function isSafari(userAgent=''){const ua=String(userAgent);return /Safari\//.test(ua)&&!/Chrome\/|Chromium\/|CriOS\/|FxiOS\/|EdgiOS\/|OPiOS\/|SamsungBrowser\/|Android\b/.test(ua);}
function firstLaunchDefaults(userAgent=''){return {...(isSafari(userAgent)?SAFARI_DEFAULTS:DEFAULTS)};}
function policy(raw){const g=normalize(raw),textureScale={low:.5,med:.75,good:1,high:1.5,max:2,ultra:2.5}[g.textures],animationFps={low:12,med:24,good:60,high:90,max:120,ultra:120}[g.animations],arenaScale={low:.75,med:1.25,good:2,high:2.25,max:2.5,ultra:3}[g.arenaBackgrounds];return {...g,renderMode:'native',textureScale,animationFps,arenaScale,superResolutionScale:Math.max(1,textureScale),battleDensity:{low:1,med:1.5,good:2,high:2.25,max:2.5,ultra:3}[g.textures],postProcessing:g.textures==='ultra',arenaAnimated:g.arenaBackgrounds!=='low',arenaFps:g.arenaBackgrounds==='low'?0:g.arenaBackgrounds==='med'?12:60,frameParticles:{low:0,med:220,good:120,high:360,max:512,ultra:640}[g.particles],emitterParticles:{low:0,med:24,good:10,high:48,max:64,ultra:80}[g.particles],...(g.potato?{renderMode:'primitive',textureScale:.2,animationFps:60,arenaScale:.5,battleDensity:.75,postProcessing:false,superResolutionScale:1,arenaAnimated:false,arenaFps:0,frameParticles:0,emitterParticles:0}: {})};}
function particleBudget(mode,spell=false){mode=LEGACY_PARTICLES[mode]||mode;return mode==='ultra'?80:mode==='max'?64:mode==='high'?48:mode==='low'||mode==='med'&&!spell?0:mode==='med'?24:10;}
let current=policy(DEFAULTS),revision=0;
function apply(raw){const next=policy(raw);if(JSON.stringify(next)!==JSON.stringify(current)){current=next;revision++;}return current;}
function animationTime(seconds){return Math.floor(Math.max(0,Number(seconds)||0)*current.animationFps+1e-7)/current.animationFps;}
return {TIERS,DEFAULTS,SAFARI_DEFAULTS,OPTIONS,migrateLegacy,normalize,isSafari,firstLaunchDefaults,policy,particleBudget,apply,animationTime,get current(){return current;},get revision(){return revision;}};
});

;
/* Source-table interpretation, kept separate from the battle simulation. */
(function(root,factory){const d=typeof module==='object'&&module.exports?require('./game-data.js'):root.RoyaleGameData;const api=factory(d);if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleCatalog=api;})(globalThis,function(DATA){'use strict';
const SX=480/18,SY=640/32,DEFAULT_DECK=['knight','archers','giant','mini-pekka','musketeer','bomber','fireball','arrows'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),sec=x=>(Number(x)||0)/1000;
function baseLevel(rarity){return (DATA.rarities[rarity]?.RelativeLevel||0)+1;}
function levelFactor(rarity,level){const r=DATA.rarities[rarity]||DATA.rarities.Common,n=Math.max(0,Math.floor(level)-baseLevel(rarity));return n===0?1:(r.PowerLevelMultiplier?.[n-1]??Math.floor(100*Math.pow(1.1,n)))/100;}
function scaled(raw,rarity,level){return Math.floor((Number(raw)||0)*levelFactor(rarity,level)+1e-7);}
function towerFactor(name,level,damage=false){let v=100;for(let l=2;l<=level;l++){const king=name==='KingTower'&&!damage;const key=(king?'HITPOINT_INCREASE_PERCENT_PER_KING_LEVEL':damage?'DAMAGE_INCREASE_PERCENT_PER_TOWER_LEVEL':'HITPOINT_INCREASE_PERCENT_PER_TOWER_LEVEL');const suffix=l>9?'_AFTER_TOURNAMENTCAP':l===9?'_AT_TOURNAMENTCAP':'';v=Math.floor(v*(100+(DATA.globals[key+suffix]?.NumberValue??DATA.globals[key]?.NumberValue??8))/100);}return v/100;}
function projectileForAttack(source,index=0){if(!source)return null;if(index===0&&source.CustomFirstProjectile&&DATA.projectiles[source.CustomFirstProjectile])return source.CustomFirstProjectile;return source.Projectile&&DATA.projectiles[source.Projectile]?source.Projectile:null;}
function projectileDamageDef(name){let cur=DATA.projectiles[name];if(!cur)return null;const seen=new Set([name]);while(cur.Damage===undefined&&cur.SpawnProjectile&&!seen.has(cur.SpawnProjectile)){seen.add(cur.SpawnProjectile);cur=DATA.projectiles[cur.SpawnProjectile]||cur;}return cur;}
const cache=new Map();
function entityDef(name,level=9){level=clamp(Math.floor(Number(level)||9),1,30);const key=name+':'+level;if(cache.has(key))return cache.get(key);const r=DATA.entities[name];if(!r)throw RangeError('Unknown source entity '+name);const firstProjectile=projectileForAttack(r,0),p=projectileDamageDef(firstProjectile)||DATA.projectiles[firstProjectile]||{},rarity=r.Rarity||'Common',tower=['KingTower','PrincessTower'].includes(name),stat=(n,isDamage=false)=>tower?Math.floor((n||0)*towerFactor(name,level,isDamage)):scaled(n,rarity,level);const interval=Math.max(.05,sec(r.HitSpeed)||1),damageRaw=r.Damage??p.Damage??0;
 const d={name,source:r,level,rarity,hp:stat(r.Hitpoints),damage:r.Damage!==undefined?stat(damageRaw,true):tower?Math.floor(damageRaw*towerFactor(name,level,true)):scaled(damageRaw,p.Rarity||rarity,level),shield:scaled(r.ShieldHitpoints,rarity,level),interval,firstHit:r.LoadFirstHit?interval:Math.max(0,interval-sec(r.LoadTime)),range:(r.Range||0)/1000,minRange:(r.MinimumRange||0)/1000,sight:(r.SightRange||r.Range||5500)/1000,radiusTiles:(r.CollisionRadius||400)/1000,radius:(r.CollisionRadius||400)/1000*SY,speedTiles:(r.Speed||0)/60,speed:(r.Speed||0)/60*SY,air:!!(r.FlyingHeight||r.FlyFromGround),hover:!!r.Hovering,building:!!r.isBuilding||name==='BrokenCannon',targetsAir:!!r.AttacksAir,targetsGround:r.AttacksGround!==false,buildingsOnly:!!(r.TargetOnlyBuildings||r.TargetOnlyTowers||r.TargetOnlyKingTower),troopsOnly:!!r.TargetOnlyTroops,splash:(r.AreaDamageRadius||p.Radius||0)/1000,deploy:sec(r.DeployTime),life:sec(r.LifeTime),projectile:firstProjectile||r.Projectile||null,mass:r.Mass||100};cache.set(key,d);return d;
}
function cardDef(c,level=9){
 const r=c.source,e=r.SummonCharacter?entityDef(r.SummonCharacter,level):null,a=DATA.areas[r.AreaEffectObject]||{},buff=DATA.buffs[a.Buff]||{};
 let projectileName=r.CustomFirstProjectile||r.Projectile||a.Projectile,p=DATA.projectiles[projectileName]||{};
 // Wrapper projectiles carry travel/visuals; the rolling or delivered payload owns damage.
 const visited=new Set();while(p.Damage===undefined&&p.SpawnProjectile&&!visited.has(p.SpawnProjectile)){visited.add(p.SpawnProjectile);projectileName=p.SpawnProjectile;p=DATA.projectiles[projectileName]||{};}
 const damage=e?.damage??scaled(p.Damage??a.Damage??r.InstantDamage??buff.DamagePerSecond??0,p.Rarity||a.Rarity||c.rarity,level);
 const damageMode=e?'per hit':buff.DamagePerSecond?'per second':r.ProjectileWaves?'per wave':'per hit';
 const duration=a.LifeDuration?(a.LifeDuration+Math.max(0,level-baseLevel(a.Rarity))*(a.LifeDurationIncreasePerLevel||0))/1000:0;
 const spawnEntity=!e?(p.SpawnCharacter||a.SpawnCharacter||null):null;
 const crownPercent=p.CrownTowerDamagePercent??a.CrownTowerDamagePercent??buff.CrownTowerDamagePercent;
 return {...c,level,spell:c.kind==='Spell',building:c.kind==='Building',entity:r.SummonCharacter||null,hp:e?.hp||0,damage,damageMode,duration,spawnEntity,projectileName:projectileName||null,spellRange:(p.ProjectileRange||0)/1000,crownDamage:crownPercent!==undefined?Math.floor(damage*(100+crownPercent)/100):null,speed:e?.speed||0,speedTiles:e?.speedTiles||0,range:e?.range||0,interval:e?.interval||0,firstHit:e?.firstHit||0,radius:((r.Radius||p.Radius||p.ProjectileRadius||a.Radius||1000)/1000)*SY,radiusTiles:(r.Radius||p.Radius||p.ProjectileRadius||a.Radius||1000)/1000,count:r.SummonNumber||p.SpawnCharacterCount||1,role:c.kind,buildingsOnly:!!e?.buildingsOnly,description:c.description.replace(/<[^>]*>/g,'')};
}
const CARDS=DATA.cards.map(c=>Object.freeze(cardDef(c))),CARD_BY_ID=Object.fromEntries(CARDS.map(c=>[c.id,c])),SOURCE_CARD=Object.fromEntries(CARDS.map(c=>[c.source.Name,c.id]));
function validDeck(deck,options={}){const size=[4,6,12].includes(options.size)?options.size:8;return Array.isArray(deck)&&deck.length===size&&(options.duplicates===true||new Set(deck).size===size)&&deck.every(id=>!!CARD_BY_ID[id]);}
function modeDeckSize(mode){return mode==='TwelveCardDeck'?12:mode==='SixCardDeck'?6:mode==='FourCardDeck'?4:8;}
function allowedInMode(id,mode){const c=CARD_BY_ID[id];return !!c&&(mode!=='OneShot'||c.kind!=='Spell'&&!['mortar','x-bow','miner','goblin-drill'].includes(id));}
// Casual deck storage never implies collection ownership. Keep this registry below
// the catalog, so profile migration, builders, battles and workers share one rule.
const MAX_DECKS=100,DECK_PAGE_SIZE=5;
const MODE_DECKS=Object.freeze(Object.fromEntries([
 ['Default','challengeDeck','Classic Challenge'],['TeamVsTeam','duoDeck','2v2'],
 ['Team3v3','tripleDeck','3v3'],['TeamRumble','rumbleDeck','Team Rumble'],
 ['BridgeBattle','bridgeDeck','Bridge'],['FourCardDeck','fourCardDeck','4 Card Deck'],
 ['SixCardDeck','sixCardDeck','6 Card Deck'],['TwelveCardDeck','twelveCardDeck','12 Card Deck'],['TwentyElixir','twentyElixirDeck','20 Elixir'],['UncappedElixir','uncappedElixirDeck','Uncapped Elixir'],
 ['OneShot','oneShotDeck','One Shot'],['DoubleElixir','doubleElixirDeck','Double Elixir'],
 ['TripleElixir','tripleElixirDeck','Triple Elixir'],['RampUp','rampDeck','Ramp Up'],
 ['SuddenDeath','suddenDeck','Sudden Death'],['7xElixir','infiniteDeck','Infinite Elixir'],
 ['ClanWar_BoatBattle','boatPracticeDeck','Boat Battle'],['Touchdown','touchdownDeck','Touchdown'],
 ['Touchdown2v2','touchdown2v2Deck','2v2 Touchdown'],['Touchdown3v3','touchdown3v3Deck','3v3 Touchdown']
].map(([mode,key,name])=>[mode,Object.freeze({key,name,size:modeDeckSize(mode)})])));
function deckName(value,index=0){return (typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24):'')||'Deck '+(index+1);}
function normalizeDeck(deck,options={}){const size=[4,6,12].includes(options.size)?options.size:8;return validDeck(deck,options)?[...deck]:[...new Set([...DEFAULT_DECK,...CARDS.map(c=>c.id)])].slice(0,size);}
function cardAt(id,level=9){const c=CARD_BY_ID[id];return c?cardDef(c,level):null;}
function features(c){const r=c.source,e=DATA.entities[r.SummonCharacter]||{},p=DATA.projectiles[e.Projectile||r.Projectile]||{},a=DATA.areas[r.AreaEffectObject]||{};const f=[];if(e.FlyingHeight)f.push('Flying');if(e.TargetOnlyBuildings)f.push('Buildings only');if(e.AttacksAir)f.push('Targets air');if(e.ShieldHitpoints||c.id==='cannon-cart')f.push('Shield / second form');if(e.ChargeRange)f.push('Charge');if(e.DashDamage)f.push('Dash / jump');if(e.DeathSpawnCharacter)f.push('Death spawn');if(e.SpawnCharacter)f.push(e.SpawnAttach?'Attached attacker':'Troop spawner');if(e.DeathDamage||e.DeathAreaEffect)f.push('Death effect');if(e.VariableDamage2)f.push('Ramping damage');if(e.BuffOnDamage||p.TargetBuff)f.push('On-hit status');if(e.HidesWhenNotAttacking||e.BuffWhenNotAttacking==='Invisibility')f.push('Concealment');if(e.ReflectedAttackDamage)f.push('Damage reflection');if(e.ProjectileSpecial==='FishermanProjectile')f.push('Hook');if(p.ProjectileRange)f.push('Line projectile');if(p.ChainedHitCount)f.push('Chain hit');if(a.Buff)f.push('Area status');if(a.SpawnCharacter)f.push('Area spawner');if(e.ManaGenerateTimeMs)f.push('Elixir generation');if(e.AreaEffectOnHit)f.push('On-hit area effect');if(e.Kamikaze)f.push('One-shot attack');if(e.AreaDamageRadius||p.Radius)f.push('Area damage');if(r.Mirror)f.push('Copies last card');if(c.id==='clone')f.push('One-HP copies');return f.length?f:['Direct attack'];}
return {MAX_DECKS,DECK_PAGE_SIZE,MODE_DECKS,deckName,DATA,CARDS,CARD_BY_ID,SOURCE_CARD,DEFAULT_DECK,SX,SY,sec,clamp,scaled,baseLevel,levelFactor,towerFactor,projectileForAttack,projectileDamageDef,entityDef,cardDef,cardAt,validDeck,normalizeDeck,modeDeckSize,allowedInMode,features};
});

;
/* Immutable battle geometry, shared by placement, collision, routing and art.
   Classic coordinates stay 18 x 32; expanded maps retain that origin and scale. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleArenaLayout=api;})(globalThis,function(){'use strict';
const freeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')freeze(v);return Object.freeze(o);};
const classic=freeze({id:'classic',custom:false,left:0,right:18,top:0,bottom:32,riverTop:15,riverBottom:17,lanes:[3.5,14.5],bridges:[{left:2.5,right:4.5},{left:13.5,right:15.5}],kings:[9],princessY:[6.5,6.5]});
// Rocket radius 2 + Princess body radius 1 needs more than 6 tiles between crowns.
// Keep troop lanes and bridges fixed while separating the Princess row by 7.5 tiles.
const triple=freeze({id:'Team3v3',custom:true,theme:'bastion',left:0,right:18,top:-2,bottom:34,kingY:1.5,riverTop:15,riverBottom:17,lanes:[3.5,9,14.5],princessXs:[1.5,9,16.5],bridges:[{left:2.25,right:4.75},{left:7.75,right:10.25},{left:13.25,right:15.75}],kings:[5.6,9,12.4],princessY:[6.5,6.5,6.5]});
const tripleJungle=freeze({...triple,id:'Team3v3Jungle',theme:'jungle',revision:1});
const tripleVolcano=freeze({...triple,id:'Team3v3Volcano',theme:'volcano',revision:1});
const bridge=freeze({id:'BridgeBattle',custom:true,theme:'ice',left:5.25,right:12.75,top:-2,bottom:34,riverTop:15,riverBottom:17,lanes:[9],bridges:[{left:7.5,right:10.5}],kings:[9],princessY:[8]});
const bridgeLava=freeze({...bridge,id:'BridgeBattleLava',theme:'lava',revision:1});
const bridgeGarden=freeze({...bridge,id:'BridgeBattleGarden',theme:'garden',revision:1});
const rumble=freeze({id:'TeamRumble',custom:true,theme:'castle',revision:4,river:false,left:-5,right:23,top:-8,bottom:40,kingY:-.5,kingYs:[3.2,.7,-.5,.7,3.2],riverTop:16,riverBottom:16,lanes:[-1,4,9,14,19],bridges:[{left:-5,right:23}],kings:[-1,4,9,14,19],princessY:[9.2,6.9,6.2,6.9,9.2]});
const rumbleReverse=freeze({...rumble,id:'TeamRumbleArcReverse',theme:'moon-castle',revision:1,kingYs:[-.5,.7,3.2,.7,-.5],princessY:[6.2,6.9,9.2,6.9,6.2]});
const rumbleRiver=freeze({id:'TeamRumbleRiverLine',custom:true,theme:'river-fort',revision:1,river:true,left:-3,right:21,top:-5,bottom:37,kingY:1.4,kingYs:[1.4,1.4,1.4,1.4,1.4],riverTop:15,riverBottom:17,lanes:[-1,4,9,14,19],bridges:[{left:.5,right:2.5},{left:5.5,right:7.5},{left:10.5,right:12.5},{left:15.5,right:17.5}],kings:[-1,4,9,14,19],princessY:[7.8,7.8,7.8,7.8,7.8]});
const touchdown=freeze({id:'Touchdown',custom:true,theme:'touchdown',touchdown:true,river:false,left:0,right:18,top:-1,bottom:33,riverTop:16,riverBottom:16,lanes:[3.5,9,14.5],bridges:[{left:0,right:18}],kings:[],princessY:[],goalTop:1.25,goalBottom:30.75});
const touchdownWide=freeze({...touchdown,id:'Touchdown3v3',theme:'touchdown-wide',left:-3,right:21,lanes:[1,6,12,17],goalTop:1.25,goalBottom:30.75,revision:1});
const ffa=freeze({id:'FreeForAll',custom:true,theme:'ffa',ffa:true,river:true,left:-2,right:20,top:-2,bottom:34,riverTop:15,riverBottom:17,verticalRiverLeft:8,verticalRiverRight:10,verticalBridges:[{top:3.5,bottom:6.5},{top:12.5,bottom:19.5},{top:25.5,bottom:28.5}],lanes:[3,9,15],bridges:[{left:1.5,right:3.5},{left:7.5,right:10.5},{left:14.5,right:16.5}],kings:[],princessY:[],revision:1,ffaTeams:[{team:0,color:'blue',king:[1.5,29.5],princess:[[4.2,29.5],[1.5,26.4]]},{team:1,color:'red',king:[16.5,2.5],princess:[[13.8,2.5],[16.5,5.6]]},{team:2,color:'green',king:[1.5,2.5],princess:[[4.2,2.5],[1.5,5.6]]},{team:3,color:'yellow',king:[16.5,29.5],princess:[[13.8,29.5],[16.5,26.4]]}]});
const layouts={classic,Team3v3:triple,Team3v3Jungle:tripleJungle,Team3v3Volcano:tripleVolcano,BridgeBattle:bridge,BridgeBattleLava:bridgeLava,BridgeBattleGarden:bridgeGarden,TeamRumble:rumble,TeamRumbleArcReverse:rumbleReverse,TeamRumbleRiverLine:rumbleRiver,Touchdown:touchdown,Touchdown2v2:touchdown,Touchdown3v3:touchdownWide};
function get(id){return layouts[id]||classic;}
function waterClear(x,y,r=0,id){const a=get(id);if(a.river===false)return true;const horizontal=()=>{const dy=y<a.riverTop?a.riverTop-y:y>a.riverBottom?y-a.riverBottom:0;if(dy>=r&&!(y>a.riverTop&&y<a.riverBottom))return true;const margin=dy>0?Math.sqrt(Math.max(0,r*r-dy*dy)):r;return a.bridges.some(b=>x-margin>=b.left-1e-7&&x+margin<=b.right+1e-7);};if(!horizontal())return false;if(a.verticalRiverLeft===undefined)return true;const dx=x<a.verticalRiverLeft?a.verticalRiverLeft-x:x>a.verticalRiverRight?x-a.verticalRiverRight:0;if(dx>=r&&!(x>a.verticalRiverLeft&&x<a.verticalRiverRight))return true;const margin=dx>0?Math.sqrt(Math.max(0,r*r-dx*dx)):r;return (a.verticalBridges||[]).some(b=>y-margin>=b.top-1e-7&&y+margin<=b.bottom+1e-7);}
function boundsClear(x,y,r=0,id,air=false){const a=get(id);return x-r>=a.left-1e-7&&x+r<=a.right+1e-7&&y-r>=a.top-1e-7&&y+r<=a.bottom+1e-7;}
function forbidden(id,waterFree=false){const a=get(id),rects=[];if(a.left>0)rects.push({left:0,right:a.left,top:a.top,bottom:a.bottom});if(a.right<18)rects.push({left:a.right,right:18,top:a.top,bottom:a.bottom});if(!waterFree&&a.river!==false){let x=a.left;for(const b of [...a.bridges,{left:a.right,right:a.right}]){if(b.left>x)rects.push({left:x,right:b.left,top:a.riverTop,bottom:a.riverBottom});x=b.right;}if(a.verticalRiverLeft!==undefined){let y=a.top;for(const b of [...(a.verticalBridges||[]),{top:a.bottom,bottom:a.bottom}]){if(b.top>y)rects.push({left:a.verticalRiverLeft,right:a.verticalRiverRight,top:y,bottom:b.top});y=b.bottom;}}}return rects;}
function lane(x,id){const a=get(id);let index=0;for(let i=1;i<a.lanes.length;i++)if(Math.abs(a.lanes[i]-x)<Math.abs(a.lanes[index]-x))index=i;return index;}
function towers(team,id){const a=get(id),flip=y=>team?y:32-y;if(!a.custom)return[['KingTower',9,flip(3),0],['PrincessTower',3.5,flip(6.5),0],['PrincessTower',14.5,flip(6.5),0]];const out=[],xs=a.princessXs||a.lanes;for(let i=0;i<a.kings.length;i++)out.push(['KingTower',a.kings[i],flip(a.kingYs?.[i]??a.kingY??3),i]);for(let i=0;i<xs.length;i++)out.push(['PrincessTower',xs[i],flip(a.princessY[i]),i]);return out;}
function validSlots(slots,teamSize=3){return Array.isArray(slots)&&slots.length===teamSize*2&&slots.every(x=>Number.isInteger(x)&&x>=0&&x<teamSize)&&[0,1].every(t=>new Set(slots.filter((_,s)=>s%2===t)).size===teamSize);}
function shuffleSlots(random,teamSize=3){const slots=[];for(const team of [0,1]){const row=Array.from({length:teamSize},(_,i)=>i);for(let i=teamSize-1;i>0;i--){const j=Math.floor(random()*(i+1));[row[i],row[j]]=[row[j],row[i]];}for(let i=0;i<teamSize;i++)slots[team+i*2]=row[i];}return slots;}
function limits(id,air=false){const l=get(id);if(air&&!String(id).startsWith('TeamRumble')&&!String(id).startsWith('Touchdown'))return classic;return l;}
return{limits,get,waterClear,boundsClear,forbidden,lane,towers,validSlots,shuffleSlots};});

;
/* Clash-style logical 18 x 32 arena tile geometry. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog,n?require('./arena-layout.js'):root.RoyaleArenaLayout);if(n)module.exports=api;else root.RoyaleArenaGrid=api;})(globalThis,function(K,L){'use strict';
const {SX,SY}=K,COLS=18,ROWS=32;
const RIVER_ROWS=new Set([15,16]),BRIDGE_COLS=new Set([3,4,13,14]);
const TOWER_CELLS=new Set();
function addRect(c0,c1,r0,r1){for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)TOWER_CELLS.add(c+','+r);}
// Native crown-tower footprints aligned to the logical tile field.
addRect(7,10,27,30);addRect(2,4,24,26);addRect(13,15,24,26);
addRect(7,10,1,4);addRect(2,4,5,7);addRect(13,15,5,7);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function worldToTile(x,y,layout=null){const a=L.get(layout);return{col:clamp(Math.floor(x/SX),Math.floor(a.left),Math.ceil(a.right)-1),row:clamp(Math.floor(y/SY),Math.floor(a.top),Math.ceil(a.bottom)-1)};}
function tileCenter(col,row){return{x:(col+.5)*SX,y:(row+.5)*SY};}
function tileFlags(col,row){if(col<0||col>=COLS||row<0||row>=ROWS)return{ground:false,river:false,bridge:false,tower:false,blocked:true};const water=RIVER_ROWS.has(row),bridge=water&&BRIDGE_COLS.has(col),tower=TOWER_CELLS.has(col+','+row);return{ground:!water||bridge,river:water&&!bridge,bridge,tower,blocked:tower};}
function footprintTiles(x,y,radius=0){const r=Math.max(0,Number(radius)||0),e=1e-6,minC=Math.floor(x/SX-r+e),maxC=Math.floor(x/SX+r-e),minR=Math.floor(y/SY-r+e),maxR=Math.floor(y/SY+r-e),out=[];for(let row=minR;row<=maxR;row++)for(let col=minC;col<=maxC;col++)out.push({col,row});return out;}
// Movement geometry is shared by the planner, sweep and separation solver.
// Use a circle/rectangle test at the banks, not only the unit's center row.
const BRIDGES=Object.freeze([{left:2.5,right:4.5},{left:13.5,right:15.5}]);
function waterClear(x,y,radius=0,layout=null){
 if(L.get(layout).custom)return L.waterClear(x,y,Math.max(0,radius),layout);
 const r=Math.max(0,Number(radius)||0),dy=y<15?15-y:y>17?y-17:0;
 if(dy>=r&&!(y>15&&y<17))return true;
 const margin=dy>0?Math.sqrt(Math.max(0,r*r-dy*dy)):r;
 return BRIDGES.some(b=>x-margin>=b.left-1e-7&&x+margin<=b.right+1e-7);
}
function terrainFits(x,y,radius=0,opt={}){
 const r=Math.max(0,Number(radius)||0),tx=x/SX,ty=y/SY;
 if(L.get(opt.layout).custom){if(!L.boundsClear(tx,ty,r,opt.layout))return false;return opt.allowWater||L.waterClear(tx,ty,r,opt.layout);}
 if(tx-r<0||tx+r>COLS||ty-r<0||ty+r>ROWS)return false;
 if(!opt.allowWater&&!waterClear(tx,ty,r))return false;
 if(opt.ignoreTowers)return true;
 return footprintTiles(x,y,r).every(({col,row})=>!tileFlags(col,row).tower);
}
function lane(col){return col<9?0:1;}
function deploymentAllowed(team,col,row,towers=[],cheat=false,layout=null){if(L.get(layout).custom){const a=L.get(layout);if(col<a.left||col>=a.right||row<a.top||row>=a.bottom)return false;if(cheat)return true;if(a.ffa){const left=col<9,top=row<16;return team===0?left&&!top:team===1?!left&&top:team===2?left&&top:team===3?!left&&!top:false;}if(team===0?row>=(a.river===false?16:17):row<=(a.river===false?15:14))return true;const ix=L.lane(col+.5,layout),t=towers.find(t=>t.team!==team&&!t.king&&t.crownSlot===ix);return !!t&&t.hp<=0&&(team===0?row>=10&&row<=14:row>=17&&row<=21);}if(col<0||col>=COLS||row<0||row>=ROWS)return false;if(cheat)return true;if(team===0){if(row>=17)return true;const enemy=towers.filter(t=>t.team===1&&!t.king).sort((a,b)=>a.x-b.x),opened=enemy[lane(col)]?.hp<=0;return !!opened&&row>=10&&row<=14;}if(team===1){if(row<=14)return true;const enemy=towers.filter(t=>t.team===0&&!t.king).sort((a,b)=>a.x-b.x),opened=enemy[lane(col)]?.hp<=0;return !!opened&&row>=17&&row<=21;}return false;}
function neighbors(col,row,radius=0){const out=[];for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const c=col+dc,r=row+dr;if(c<0||c>=COLS||r<0||r>=ROWS)continue;const p=tileCenter(c,r);if(terrainFits(p.x,p.y,radius))out.push({col:c,row:r});}return out;}
return{Layout:L,layoutFor:L.get,bridges:layout=>L.get(layout).bridges,BRIDGES,waterClear,COLS,ROWS,worldToTile,tileCenter,tileFlags,footprintTiles,terrainFits,deploymentAllowed,neighbors};
});

;
/* Source-driven multi-unit deployment formations shared by preview and live spawning. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog);if(n)module.exports=api;else root.RoyaleFormations=api;})(globalThis,function(K){'use strict';
const {SX,SY}=K,TAU=Math.PI*2;
const sec=v=>Math.max(0,Number(v)||0)/1000;
function point(x,y,entity,index,delay,group='primary'){return{x,y,entity,index,delay,group};}
function orient(team){return team===0?-1:1;}
function primaryLayout(card,x,y,team){const r=card.source||{},n=Math.max(1,r.SummonNumber||1),entity=r.SummonCharacter||card.entity,delay=sec(r.SummonDeployDelay),f=orient(team),radius=(r.SummonRadius||0)/1000,width=(r.SummonWidth||0)/1000,out=[];
 if(n===1)return[point(x,y,entity,0,0)];
 if(r.FullLaneDeploy||width){const w=width||14,center=r.FullLaneDeploy?9:x/SX;for(let i=0;i<n;i++)out.push(point((center-w/2+w*i/(n-1))*SX,y,entity,i,i*delay));return out;}
 if(card.id==='skeleton-army'&&n===15){out.push(point(x,y,entity,0,0));let ix=1;for(const [count,rad,phase] of [[6,.68,-Math.PI/2],[8,1.28,-Math.PI/2+Math.PI/8]])for(let j=0;j<count;j++,ix++){const a=phase+TAU*j/count;out.push(point(x+Math.cos(a)*rad*SX,y+Math.sin(a)*rad*SY,entity,ix,ix*delay));}return out;}
 if(n===2){const half=Math.max(.5,radius*.62);return[point(x-half*SX,y,entity,0,0),point(x+half*SX,y,entity,1,delay)];}
 if(n===3){const rad=radius||.7,frontY=y+f*rad*SY,backY=y-f*rad*.5*SY,side=Math.sqrt(3)/2*rad*SX;return[point(x,frontY,entity,0,0),point(x-side,backY,entity,1,delay),point(x+side,backY,entity,2,2*delay)];}
 if(n===4){const rad=radius||.75;return[point(x-rad*.7*SX,y+f*rad*.55*SY,entity,0,0),point(x+rad*.7*SX,y+f*rad*.55*SY,entity,1,delay),point(x-rad*.7*SX,y-f*rad*.55*SY,entity,2,2*delay),point(x+rad*.7*SX,y-f*rad*.55*SY,entity,3,3*delay)];}
 const rad=radius||Math.min(1.1,.52+.09*n),start=f<0?-Math.PI/2:Math.PI/2;for(let i=0;i<n;i++){const a=start+TAU*i/n;out.push(point(x+Math.cos(a)*rad*SX,y+Math.sin(a)*rad*SY,entity,i,i*delay));}return out;
}
function cardMembers(card,x,y,team=0){if(!card?.entity)return[];const r=card.source||{},f=orient(team),finish=members=>members.map(m=>{const d=K.entityDef(m.entity,card.level||9);if(!d.air&&!d.hover){if(team===0&&y>=17*SY)m.y=Math.max(m.y,17*SY);else if(team===1&&y<=15*SY)m.y=Math.min(m.y,15*SY);}return m;});
 if(card.id==='goblin-gang'&&r.SummonCharacterSecond){const d=sec(r.SummonDeployDelay)||.1,sd=sec(r.SummonDeployDelaySecond||r.SummonDeployDelay)||d;return finish([
   point(x-.78*SX,y+f*.36*SY,r.SummonCharacter,0,0),point(x,y+f*.82*SY,r.SummonCharacter,1,d),point(x+.78*SX,y+f*.36*SY,r.SummonCharacter,2,2*d),
   point(x-.55*SX,y-f*.72*SY,r.SummonCharacterSecond,3,3*d,'secondary'),point(x+.55*SX,y-f*.72*SY,r.SummonCharacterSecond,4,3*d+sd,'secondary')]);}
 if(card.id==='rascals'&&r.SummonCharacterSecond){const sd=sec(r.SummonDeployDelaySecond||100);return finish([point(x,y+f*.95*SY,r.SummonCharacter,0,0),point(x-.88*SX,y-f*.78*SY,r.SummonCharacterSecond,1,sd,'secondary'),point(x+.88*SX,y-f*.78*SY,r.SummonCharacterSecond,2,2*sd,'secondary')]);}
 const out=primaryLayout(card,x,y,team);if(r.SummonCharacterSecond){const n=Math.max(1,r.SummonCharacterSecondCount||1),delay=sec(r.SummonDeployDelaySecond||r.SummonDeployDelay),start=out.length*sec(r.SummonDeployDelay||0);for(let i=0;i<n;i++){const xx=x+(i-(n-1)/2)*.9*SX,yy=y-f*.8*SY;out.push(point(xx,yy,r.SummonCharacterSecond,out.length,start+i*delay,'secondary'));}}return finish(out);
}
return{cardMembers};
});

;
/* Shared Clash-style placement/forecast rules used by both engine and renderer. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog,n?require('./arena-grid.js'):root.RoyaleArenaGrid,n?require('./formations.js'):root.RoyaleFormations);if(n)module.exports=api;else root.RoyalePlacement=api;})(globalThis,function(K,G,F){'use strict';
const {SX,SY,clamp,entityDef,cardAt,DATA}=K;
const edgeDistance=(a,b)=>Math.max(0,Math.hypot((a.x-b.x)/SX,(a.y-b.y)/SY)-(a.def?.radiusTiles||0)-(b.def?.radiusTiles||0));
const segmentDistance=(u,s)=>{const ax=s.x/SX,ay=s.y/SY,bx=s.x2/SX,by=s.y2/SY,px=u.x/SX,py=u.y/SY,dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy||1,t=clamp(((px-ax)*dx+(py-ay)*dy)/l2,0,1),qx=ax+t*dx,qy=ay+t*dy;return Math.hypot(px-qx,py-qy);};
function spellShape(card,x,y,team){
 const r=card?.source||{},p=DATA.projectiles[card?.projectileName]||DATA.projectiles[r.CustomFirstProjectile]||DATA.projectiles[r.Projectile]||{};
 if(card?.id==='the-log'||card?.id==='barbarian-barrel'){const dir=team===0?-1:1,range=Math.max(card.spellRange||0,(p.ProjectileRange||10000)/1000,10);return{kind:'rolling',x,y,x2:x,y2:y+dir*range*SY,width:Math.max(.55,(p.ProjectileRadius||700)/1000)};}
 if(p.ProjectileRange&&r.SpellAsDeploy){const dir=team===0?-1:1;return{kind:'line',x,y,x2:x,y2:y+dir*(p.ProjectileRange/1000)*SY,width:Math.max(.25,(p.ProjectileRadius||200)/1000)};}
 return{kind:'radial',x,y,radius:card?.radiusTiles||Math.max(.25,(r.Radius||p.Radius||1000)/1000)};
}
function bodyOverlap(battle,x,y,radius,ignoreId=null){return battle.active.some(v=>v.id!==ignoreId&&!v.air&&!v.attachedTo&&v.hp>0&&v.building&&Math.hypot((v.x-x)/SX,(v.y-y)/SY)<(v.def?.radiusTiles||0)+radius+.025);}
function snapCard(battle,team,card,x,y,seat=team){
 const layout=battle.arenaLayout?.id,a=G.layoutFor(layout);
 if(!card||!Number.isFinite(x)||!Number.isFinite(y)||x<a.left*SX||x>a.right*SX||y<a.top*SY||y>a.bottom*SY)return{ok:false,reason:'Place inside the arena',x,y,tiles:[],formation:[]};
 const r=card.source||{};
 if(card.spell&&!r.SpellAsDeploy)return{ok:true,reason:'',x:clamp(x,(a.left+.25)*SX,(a.right-.25)*SX),y:clamp(y,(a.top+.5)*SY,(a.bottom-.5)*SY),tiles:[],formation:[]};
 const tile=G.worldToTile(x,y,layout),anchor=G.tileCenter(tile.col,tile.row),cheat=seat===0&&battle.cheats?.placement;
 const allowed=(p)=>{const t=G.worldToTile(p.x,p.y,layout);return r.CanDeployOnEnemySide||G.deploymentAllowed(team,t.col,t.row,battle.towers,cheat,battle.arenaLayout?.id);};
 // Do not accept an illegal territory tap by snapping it across the river.
 if(!allowed(anchor))return{ok:false,reason:'Deploy on your side of the arena',...anchor,tiles:[],formation:[]};
 if(!r.CanPlaceOnWater&&!G.waterClear(anchor.x/SX,anchor.y/SY,0,battle.arenaLayout?.id))return{ok:false,reason:'Cannot deploy on the river',...anchor,tiles:[],formation:[]};
 const allowWater=r.CanPlaceOnWater===true,d=card.entity?entityDef(card.entity,card.level):null,radius=d?.radiusTiles||.3;
 const terrain=(p,rad)=>G.terrainFits(p.x,p.y,rad,{allowWater,ignoreTowers:true,layout:battle.arenaLayout?.id});
 const free=(p,rad)=>terrain(p,rad)&&(r.CanPlaceOnBuildings||!bodyOverlap(battle,p.x,p.y,rad));
 const candidates=[anchor];
 // Troops softly settle around a blocked tile; buildings retain deliberate grid placement.
 if(!card.building)for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dc||dr){const p=G.tileCenter(tile.col+dc,tile.row+dr);if(allowed(p))candidates.push(p);}
 candidates.sort((a,b)=>Math.hypot((a.x-x)/SX,(a.y-y)/SY)-Math.hypot((b.x-x)/SX,(b.y-y)/SY));
 for(const center of candidates){
  if(!free(center,radius))continue;
  const members=card.entity?F.cardMembers(card,center.x,center.y,team):[];
  let fits=true;
  for(const m of members){const md=entityDef(m.entity,card.level);if(free(m,md.radiusTiles)&&allowed(m))continue;
   // Keep source formation ordering, move only obstructed members towards the legal anchor.
   let found=false;for(let k=1;k<=8;k++){const q={x:m.x+(center.x-m.x)*k/8,y:m.y+(center.y-m.y)*k/8};if(free(q,md.radiusTiles)&&allowed(q)){m.x=q.x;m.y=q.y;found=true;break;}}
   if(!found){fits=false;break;}
  }
  if(fits)return{ok:true,reason:'',...center,tiles:G.footprintTiles(center.x,center.y,radius),formation:members,softAdjusted:Math.abs(center.x-anchor.x)+Math.abs(center.y-anchor.y)>.001};
 }
 return{ok:false,reason:'Cannot deploy on this tile',...anchor,tiles:G.footprintTiles(anchor.x,anchor.y,radius),formation:[]};
}
function affectedByShape(u,shape){if(shape.kind==='radial')return Math.hypot((u.x-shape.x)/SX,(u.y-shape.y)/SY)<=shape.radius+(u.def?.radiusTiles||0);return segmentDistance(u,shape)<=shape.width+(u.def?.radiusTiles||0);}
function forecastPlacement(battle,seat,slot,x,y){
 const original=battle.card(seat,slot),card=original?.mirrorCard?{...cardAt(original.mirrorCard,Math.min(30,original.level+1)),cost:original.cost}:original,team=battle.teamOf(seat);
 if(!card)return{ok:false,reason:'Select a card',affected:[],retargeting:[],locked:[],targets:[],attackers:[]};
 const snapped=snapCard(battle,team,card,x,y,seat),affordable=battle.elixir[seat]+1e-7>=card.cost,cycling=battle.slotReady[seat][slot]>battle.time+1e-7,shape=spellShape(card,snapped.x,snapped.y,team);
 const info={...snapped,members:snapped.formation||[],affordable,cycling,card:card.id,name:card.name,level:card.level,spell:card.spell,building:card.building,air:false,range:0,minRange:0,radius:card.radiusTiles||0,shape,affected:[],retargeting:[],locked:[],targets:[],attackers:[],deployTime:0,cardEntity:card.entity||null};
 if(card.spell){info.affected=snapped.ok?battle.spellAffectedEntities(card,shape,team).map(v=>({id:v.id,x:v.x,y:v.y})):[];return info;}
 if(!snapped.ok||!card.entity)return info;
 const d=entityDef(card.entity,card.level);Object.assign(info,{air:d.air,range:d.range,minRange:d.minRange,radius:d.radiusTiles,deployTime:d.deploy});
 const ghosts=(info.members.length?info.members:[{entity:card.entity,x:snapped.x,y:snapped.y,delay:0}]).map((m,i)=>{const md=entityDef(m.entity,card.level);return{id:-1000000-seat*100-i,entity:m.entity,card:card.id,team,owner:seat,x:m.x,y:m.y,def:md,level:card.level,hp:md.hp,maxHp:md.hp,shield:md.shield,wait:md.deploy+(m.delay||0),readyAt:battle.time+md.deploy+(m.delay||0),born:battle.time,appearsAt:battle.time,buffs:{},building:md.building,air:md.air,dead:false,attachedTo:null};});
 const candidates=[...battle.active,...ghosts];
 for(const enemy of battle.active){if(enemy.team===team||enemy.king&&!enemy.active)continue;const targetable=ghosts.filter(g=>battle.canTarget(enemy,g)&&edgeDistance(enemy,g)+1e-7>=enemy.def.minRange);if(!targetable.length)continue;const nearest=targetable.sort((a,b)=>edgeDistance(enemy,a)-edgeDistance(enemy,b))[0],edgeGhost=edgeDistance(enemy,nearest),e={id:enemy.id,x:enemy.x,y:enemy.y,range:enemy.def.range,immediate:edgeGhost<=enemy.def.range+1e-7&&enemy.wait<=0,deploying:enemy.wait>0};if(edgeGhost<=enemy.def.sight+1e-7)info.attackers.push(e);const before=battle.chooseTarget(enemy),after=battle.chooseTarget(enemy,candidates);if(before&&after?.id===before.id)info.locked.push({id:enemy.id,x:enemy.x,y:enemy.y,target:before.id});else if(after&&ghosts.some(g=>g.id===after.id))info.retargeting.push(e);}
 const ghost=ghosts[0];info.targets=battle.active.filter(t=>battle.canTarget(ghost,t)&&edgeDistance(ghost,t)<=ghost.def.range+1e-7&&edgeDistance(ghost,t)+1e-7>=ghost.def.minRange).map(t=>({id:t.id,x:t.x,y:t.y}));
 info.affected=info.targets;
 return info;
}
return{snapCard,spellShape,forecastPlacement,affectedByShape};
});

;
/* Radius-aware tile routing and swept body collision for ground entities. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog,n?require('./arena-grid.js'):root.RoyaleArenaGrid);if(n)module.exports=api;else root.RoyalePathing=api;})(globalThis,function(K,G){'use strict';
const {SX,SY}=K,EPS=1e-7,ROUTE_CLEARANCE=.08,key=(c,r)=>c+','+r;
function pointSegmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
function segmentRectDistance(a,b,left,right,top,bottom){
 let lo=0,hi=1;
 for(const [origin,delta,min,max] of [[a.x,b.x-a.x,left,right],[a.y,b.y-a.y,top,bottom]]){
  if(Math.abs(delta)<1e-12){if(origin<min||origin>max){lo=1;hi=0;break;}}
  else{const near=(min-origin)/delta,far=(max-origin)/delta;lo=Math.max(lo,Math.min(near,far));hi=Math.min(hi,Math.max(near,far));}
 }
 if(lo<=hi)return 0;
 const pointRect=p=>Math.hypot(Math.max(left-p.x,0,p.x-right),Math.max(top-p.y,0,p.y-bottom));
 return Math.min(pointRect(a),pointRect(b),...[[left,top],[left,bottom],[right,top],[right,bottom]].map(([x,y])=>pointSegmentDistance({x,y},a,b)));
}
// Tile-space circular-body clearance against the existing river rectangles.
// Exact segment distance avoids different sampling intervals disagreeing at
// rounded bank corners; touching the bridge boundary is legal for radius 1.
function terrainSegmentClear(a,b,radius=0,allowWater=false,layout=null){
 if(G.layoutFor(layout).custom){const r=Math.max(0,radius);if(!G.Layout.boundsClear(a.x,a.y,r,layout)||!G.Layout.boundsClear(b.x,b.y,r,layout))return false;return G.Layout.forbidden(layout,allowWater).every(o=>segmentRectDistance(a,b,o.left,o.right,o.top,o.bottom)>=Math.max(EPS,r)-EPS/2);}
 const r=Math.max(0,radius),inside=p=>p.x-r>=-EPS&&p.x+r<=G.COLS+EPS&&p.y-r>=-EPS&&p.y+r<=G.ROWS+EPS;
 if(!inside(a)||!inside(b))return false;
 if(allowWater)return true;
 let left=0;
 for(const bridge of [...G.BRIDGES,{left:G.COLS,right:G.COLS}]){
  if(bridge.left>left&&segmentRectDistance(a,b,left,bridge.left,15,17)<Math.max(EPS,r)-EPS/2)return false;
  left=bridge.right;
 }
 return true;
}
function edgeDistance(a,b){return Math.max(0,Math.hypot((a.x-b.x)/SX,(a.y-b.y)/SY)-(a.def?.radiusTiles||0)-(b.def?.radiusTiles||0));}
function obstacleFree(x,y,radius,obstacles=[],ignore=null,clearance=0){if(!G.terrainFits(x,y,radius,{ignoreTowers:true}))return false;for(const o of obstacles){if(!o||o.id===ignore||o.hp<=0||o.air||o.attachedTo)continue;const d=Math.hypot((x-o.x)/SX,(y-o.y)/SY),min=radius+(o.def?.radiusTiles||o.radiusTiles||0)+clearance;if(d<min-.025)return false;}return true;}
function neighbors8(node,radius,obstacles){const out=[];for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const col=node.col+dc,row=node.row+dr;if(col<0||col>=G.COLS||row<0||row>=G.ROWS)continue;const p=G.tileCenter(col,row);if((row===15||row===16)&&col!==3&&col!==14)continue;if(!obstacleFree(p.x,p.y,radius,obstacles,null,ROUTE_CLEARANCE))continue;if(dc&&dr){const a=G.tileCenter(node.col+dc,node.row),b=G.tileCenter(node.col,node.row+dr);if(!obstacleFree(a.x,a.y,radius,obstacles,null,ROUTE_CLEARANCE)||!obstacleFree(b.x,b.y,radius,obstacles,null,ROUTE_CLEARANCE))continue;}out.push({col,row,cost:dc&&dr?Math.SQRT2:1});}return out;}
function nearestGoal(raw,radius,obstacles){
 const max=Math.max(G.COLS,G.ROWS);for(let ring=0;ring<=max;ring++){let best=null,bestD=Infinity;const c0=Math.max(0,raw.col-ring),c1=Math.min(G.COLS-1,raw.col+ring),r0=Math.max(0,raw.row-ring),r1=Math.min(G.ROWS-1,raw.row+ring);for(let row=r0;row<=r1;row++)for(let col=c0;col<=c1;col++){if(ring&&col>c0&&col<c1&&row>r0&&row<r1)continue;const p=G.tileCenter(col,row);if(!obstacleFree(p.x,p.y,radius,obstacles,null,ROUTE_CLEARANCE))continue;const d=(col-raw.col)*(col-raw.col)+(row-raw.row)*(row-raw.row);if(d<bestD||(d===bestD&&(!best||row<best.row||row===best.row&&col<best.col))){bestD=d;best={col,row};}}if(best)return best;}return null;
}
function heapPush(heap,node){let i=heap.length;heap.push(node);while(i){const p=(i-1)>>1,a=heap[p];if(a.f<node.f||a.f===node.f&&(a.h<node.h||a.h===node.h&&a.seq<=node.seq))break;heap[i]=a;i=p;}heap[i]=node;}
function heapPop(heap){if(!heap.length)return null;const root=heap[0],last=heap.pop();if(heap.length){let i=0;while(true){let l=i*2+1,r=l+1;if(l>=heap.length)break;let c=l;if(r<heap.length){const a=heap[l],b=heap[r];if(b.f<a.f||b.f===a.f&&(b.h<a.h||b.h===a.h&&b.seq<a.seq))c=r;}const ch=heap[c];if(last.f<ch.f||last.f===ch.f&&(last.h<ch.h||last.h===ch.h&&last.seq<=ch.seq))break;heap[i]=ch;i=c;}heap[i]=last;}return root;}
function route(start,goal,radius=0,obstacles=[]){
 const s=G.worldToTile(start.x,start.y),rawGoal=G.worldToTile(goal.x,goal.y),goalTile=nearestGoal(rawGoal,radius,obstacles);if(!goalTile)return[];
 const count=G.COLS*G.ROWS,gScore=new Float64Array(count),came=new Int16Array(count),closed=new Uint8Array(count);gScore.fill(Infinity);came.fill(-1);const idx=(c,r)=>r*G.COLS+c,heur=(c,r)=>Math.hypot(c-goalTile.col,r-goalTile.row),heap=[];let seq=0,si=idx(s.col,s.row);gScore[si]=0;heapPush(heap,{col:s.col,row:s.row,g:0,h:heur(s.col,s.row),f:heur(s.col,s.row),seq:seq++});
 while(heap.length){const cur=heapPop(heap),ci=idx(cur.col,cur.row);if(closed[ci]||cur.g>gScore[ci]+EPS)continue;closed[ci]=1;if(cur.col===goalTile.col&&cur.row===goalTile.row){const path=[];let n=ci;while(n!==si&&n>=0){const row=Math.floor(n/G.COLS),col=n-row*G.COLS;path.unshift(G.tileCenter(col,row));n=came[n];}return path;}
  for(const nx of neighbors8(cur,radius,obstacles)){const ni=idx(nx.col,nx.row);if(closed[ni])continue;const ng=cur.g+nx.cost;if(ng+EPS<gScore[ni]){gScore[ni]=ng;came[ni]=ci;const h=heur(nx.col,nx.row);heapPush(heap,{col:nx.col,row:nx.row,g:ng,h,f:ng+h,seq:seq++});}}
 }
 return[];
}
function overlaps(unit,x,y,solids){for(const v of solids||[]){if(!v||v.id===unit.id||v.hp<=0||v.air||v.attachedTo)continue;const min=(unit.def?.radiusTiles||0)+(v.def?.radiusTiles||0),d=Math.hypot((v.x-x)/SX,(v.y-y)/SY),start=Math.hypot((v.x-unit.x)/SX,(v.y-unit.y)/SY);if(start<min-1e-8&&d>=start-1e-9)continue;if(d<min-1e-8)return true;}return false;}
function valid(unit,x,y,solids){const radius=unit.def?.radiusTiles||0,allowWater=unit.def?.hover===true||unit.def?.source?.JumpEnabled===true;if(G.terrainFits(unit.x,unit.y,radius,{allowWater,ignoreTowers:true,layout:unit.layout})&&(!G.terrainFits(x,y,radius,{allowWater,ignoreTowers:true,layout:unit.layout})||!terrainSegmentClear({x:unit.x/SX,y:unit.y/SY},{x:x/SX,y:y/SY},radius,allowWater,unit.layout)))return false;return !overlaps(unit,x,y,solids);}
function sweptStep(unit,dx,dy,solids=[]){
 if(unit.air)return{x:unit.x+dx,y:unit.y+dy,blocked:false};
 // Test the complete sweep, not just its endpoint. A large knockback can end
 // beyond a tower and look clear even though it crossed the tower's body.
 const length=Math.hypot(dx/SX,dy/SY),samples=Math.max(1,Math.ceil(length/.1));
 let lo=0,hi=1,hit=false;
 for(let i=1;i<=samples;i++){const q=i/samples;if(!valid(unit,unit.x+dx*q,unit.y+dy*q,solids)){hi=q;hit=true;break;}lo=q;}
 if(!hit)return{x:unit.x+dx,y:unit.y+dy,blocked:false};
 for(let i=0;i<18;i++){const m=(lo+hi)/2;if(valid(unit,unit.x+dx*m,unit.y+dy*m,solids))lo=m;else hi=m;}
 let x=unit.x+dx*lo,y=unit.y+dy*lo;const remain=1-lo;
 // A slide is another sweep; sampling it also prevents diagonal corner tunneling.
 const slide=(sx,sy)=>{const n=Math.max(1,Math.ceil(Math.hypot(sx/SX,sy/SY)/.1));for(let i=1;i<=n;i++)if(!valid(unit,x+sx*i/n,y+sy*i/n,solids))return false;return true;};
 if(Math.abs(dx)>=Math.abs(dy)&&slide(0,dy*remain))y+=dy*remain;
 else if(slide(dx*remain,0))x+=dx*remain;
 else if(slide(0,dy*remain))y+=dy*remain;
 return{x,y,blocked:true};
}
function separationVector(unit,solids=[]){let x=0,y=0;for(const v of solids){if(!v||v.id===unit.id||v.hp<=0||v.air!==unit.air||v.attachedTo)continue;let dx=(unit.x-v.x)/SX,dy=(unit.y-v.y)/SY,d=Math.hypot(dx,dy),min=(unit.def?.radiusTiles||0)+(v.def?.radiusTiles||0);if(d>=min||min<=0)continue;if(d<EPS){dx=unit.id%2?.01:-.01;dy=.01;d=Math.hypot(dx,dy);}const push=(min-d)*.12;x+=dx/d*push*SX;y+=dy/d*push*SY;}return{x,y};}
return{route,sweptStep,separationVector,edgeDistance,obstacleFree,pointSegmentDistance,terrainSegmentClear};
});

;
(function(r){const d={"snapshot":"3.2557.2","schema":1,"hashes":{"csv_logic/trophy_road.csv":"9c0a8a042bdf12a97438a98597c6a1461587fa23d3e8232d11bf8327d5505bf9","csv_logic/trophy_road_season.csv":"96b6111108444c16a86f751bdaaeb48e59ce1c847702ea4ae9764fc60f92b07b","csv_logic/emotes.csv":"5963a2b6c387af18b9c0a2aced6b6e4d5cca0af0bedd6339d1ed736d823c0d85","csv_client/effects.csv":"56f6d40a5f2494179a1c6ce3290700c7de2c48b960b07c02f71d150967e82e97","csv_client/particle_emitters.csv":"0cd31d2fc9f7c53ce917db7a64f2a922ea3fc30fb142d8db70d8431181439c3a"},"note":"Original reward rows; later arena thresholds and leagues are explicitly adapted. Claims are local once per save, not live seasonal rewards.","steps":[{"id":"road1-50","trophies":50,"amount":10,"align":"right","source":{"Name":"Default","Trophies":50,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_1_1","Align":"right","Amount":10,"Spell":"Goblins","SpellAlt":"SpearGoblins","origin":"original-row"},"kind":"choice","cards":["goblins","spear-goblins"]},{"id":"road1-100","trophies":100,"amount":1,"align":"left","source":{"Trophies":100,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_1_2","Align":"left","Amount":1,"Chest":"Gold_Arena1","origin":"original-row"},"kind":"chest","chest":"Gold_Arena1"},{"id":"road1-150","trophies":150,"amount":4,"align":"right","source":{"Trophies":150,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_1_3","Align":"right","Amount":4,"Spell":"GoblinHut","SpellAlt":"HogRider","origin":"original-row"},"kind":"choice","cards":["goblin-hut","hog-rider"]},{"id":"road1-200","trophies":200,"amount":200,"align":"left","source":{"Trophies":200,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_1_4","Align":"left","Amount":200,"Resource":"Gold","origin":"original-row"},"kind":"gold"},{"id":"road1-250","trophies":250,"amount":1,"align":"right","source":{"Trophies":250,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_1_5","Align":"right","Amount":1,"Spell":"GoblinBarrel","SpellAlt":"Hunter","origin":"original-row"},"kind":"choice","cards":["goblin-barrel","hunter"]},{"id":"road1-350","trophies":350,"amount":25,"align":"right","source":{"Trophies":350,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_2_1","Align":"right","Amount":25,"Spell":"Skeletons","SpellAlt":"Bomber","origin":"original-row"},"kind":"choice","cards":["skeletons","bomber"]},{"id":"road1-400","trophies":400,"amount":1,"align":"left","source":{"Trophies":400,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_2_2","Align":"left","Amount":1,"Chest":"Gold_Arena2","origin":"original-row"},"kind":"chest","chest":"Gold_Arena2"},{"id":"road1-450","trophies":450,"amount":6,"align":"right","source":{"Trophies":450,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_2_3","Align":"right","Amount":6,"Spell":"Tombstone","SpellAlt":"Valkyrie","origin":"original-row"},"kind":"choice","cards":["tombstone","valkyrie"]},{"id":"road1-500","trophies":500,"amount":400,"align":"left","source":{"Trophies":500,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_2_4","Align":"left","Amount":400,"Resource":"Gold","origin":"original-row"},"kind":"gold"},{"id":"road1-550","trophies":550,"amount":1,"align":"right","source":{"Trophies":550,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_2_5","Align":"right","Amount":1,"Spell":"Witch","SpellAlt":"GiantSkeleton","origin":"original-row"},"kind":"choice","cards":["witch","giant-skeleton"]},{"id":"road1-650","trophies":650,"amount":50,"align":"right","source":{"Trophies":650,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_3_1","Align":"right","Amount":50,"Spell":"Barbarians","SpellAlt":"Cannon","origin":"original-row"},"kind":"choice","cards":["barbarians","cannon"]},{"id":"road1-700","trophies":700,"amount":1,"align":"left","source":{"Trophies":700,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_3_2","Align":"left","Amount":1,"Chest":"Gold_Arena3","origin":"original-row"},"kind":"chest","chest":"Gold_Arena3"},{"id":"road1-750","trophies":750,"amount":8,"align":"right","source":{"Trophies":750,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_3_3","Align":"right","Amount":8,"Spell":"BattleRam","SpellAlt":"BarbarianHut","origin":"original-row"},"kind":"choice","cards":["battle-ram","barbarian-hut"]},{"id":"road1-800","trophies":800,"amount":600,"align":"left","source":{"Trophies":800,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_3_4","Align":"left","Amount":600,"Resource":"Gold","origin":"original-row"},"kind":"gold"},{"id":"road1-850","trophies":850,"amount":1,"align":"right","source":{"Trophies":850,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_3_5","Align":"right","Amount":1,"Spell":"Golem","SpellAlt":"BarbLog","origin":"original-row"},"kind":"choice","cards":["golem","barbarian-barrel"]},{"id":"road1-900","trophies":900,"amount":50,"align":"left","source":{"Trophies":900,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_3_6","Align":"left","Amount":50,"Resource":"Diamonds","origin":"original-row"},"kind":"gems"},{"id":"road1-950","trophies":950,"amount":1,"align":"right","source":{"Trophies":950,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_3_7","Align":"right","Amount":1,"Chest":"Giant_Arena3","origin":"original-row"},"kind":"chest","chest":"Giant_Arena3"},{"id":"road1-1050","trophies":1050,"amount":50,"align":"right","source":{"Trophies":1050,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_4_1","Align":"right","Amount":50,"Consumable":"WildcardCommon","origin":"original-row"},"kind":"wildcards","rarity":"Common"},{"id":"road1-1100","trophies":1100,"amount":1,"align":"left","source":{"Trophies":1100,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_4_2","Align":"left","Amount":1,"Chest":"Gold_Arena4","origin":"original-row"},"kind":"chest","chest":"Gold_Arena4"},{"id":"road1-1150","trophies":1150,"amount":10,"align":"right","source":{"Trophies":1150,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_4_3","Align":"right","Amount":10,"Spell":"InfernoTower","SpellAlt":"MegaMinion","origin":"original-row"},"kind":"choice","cards":["inferno-tower","mega-minion"]},{"id":"road1-1200","trophies":1200,"amount":800,"align":"left","source":{"Trophies":1200,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_4_4","Align":"left","Amount":800,"Resource":"Gold","origin":"original-row"},"kind":"gold"},{"id":"road1-1250","trophies":1250,"amount":1,"align":"right","source":{"Trophies":1250,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_4_5","Align":"right","Amount":1,"Spell":"Pekka","SpellAlt":"Lightning","origin":"original-row"},"kind":"choice","cards":["pekka","lightning"]},{"id":"road1-1350","trophies":1350,"amount":50,"align":"right","source":{"Trophies":1350,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_5_1","Align":"right","Amount":50,"Spell":"FireSpirits","SpellAlt":"Bats","origin":"original-row"},"kind":"choice","cards":["fire-spirits","bats"]},{"id":"road1-1400","trophies":1400,"amount":1,"align":"left","source":{"Trophies":1400,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_5_2","Align":"left","Amount":1,"Chest":"Magic_Arena5","origin":"original-row"},"kind":"chest","chest":"Magic_Arena5"},{"id":"road1-1450","trophies":1450,"amount":10,"align":"right","source":{"Trophies":1450,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_5_3","Align":"right","Amount":10,"Consumable":"WildcardRare","origin":"original-row"},"kind":"wildcards","rarity":"Rare"},{"id":"road1-1500","trophies":1500,"amount":1000,"align":"left","source":{"Trophies":1500,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_5_4","Align":"left","Amount":1000,"Resource":"Gold","origin":"original-row"},"kind":"gold"},{"id":"road1-1550","trophies":1550,"amount":1,"align":"right","source":{"Trophies":1550,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_5_5","Align":"right","Amount":1,"Spell":"Poison","SpellAlt":"Tornado","origin":"original-row"},"kind":"choice","cards":["poison","tornado"]},{"id":"road1-1650","trophies":1650,"amount":50,"align":"right","source":{"Trophies":1650,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_6_1","Align":"right","Amount":50,"Spell":"Mortar","SpellAlt":"SkeletonBalloon","origin":"original-row"},"kind":"choice","cards":["mortar","skeleton-barrel"]},{"id":"road1-1700","trophies":1700,"amount":1,"align":"left","source":{"Trophies":1700,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_6_2","Align":"left","Amount":1,"Chest":"Gold_Arena6","origin":"original-row"},"kind":"chest","chest":"Gold_Arena6"},{"id":"road1-1750","trophies":1750,"amount":10,"align":"right","source":{"Trophies":1750,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_6_3","Align":"right","Amount":10,"Consumable":"WildcardRare","origin":"original-row"},"kind":"wildcards","rarity":"Rare"},{"id":"road1-1800","trophies":1800,"amount":1250,"align":"left","source":{"Trophies":1800,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_6_4","Align":"left","Amount":1250,"Resource":"Gold","origin":"original-row"},"kind":"gold"},{"id":"road1-1850","trophies":1850,"amount":1,"align":"right","source":{"Trophies":1850,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_6_5","Align":"right","Amount":1,"Spell":"Xbow","SpellAlt":"Balloon","origin":"original-row"},"kind":"choice","cards":["x-bow","balloon"]},{"id":"road1-1900","trophies":1900,"amount":1500,"align":"left","source":{"Trophies":1900,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_6_6","Align":"left","Amount":1500,"Resource":"Gold","origin":"original-row"},"kind":"gold"},{"id":"road1-1950","trophies":1950,"amount":1,"align":"right","source":{"Trophies":1950,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_6_7","Align":"right","Amount":1,"Chest":"Legendary","origin":"original-row"},"kind":"chest","chest":"Legendary"},{"id":"road1-2050","trophies":2050,"amount":50,"align":"right","source":{"Trophies":2050,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_7_1","Align":"right","Amount":50,"Spell":"RoyalGiant","SpellAlt":"RoyalRecruits","origin":"original-row"},"kind":"choice","cards":["royal-giant","royal-recruits"]},{"id":"road1-2100","trophies":2100,"amount":1,"align":"left","source":{"Trophies":2100,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_7_2","Align":"left","Amount":1,"Chest":"Gold_Arena7","origin":"original-row"},"kind":"chest","chest":"Gold_Arena7"},{"id":"road1-2150","trophies":2150,"amount":10,"align":"right","source":{"Trophies":2150,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_7_3","Align":"right","Amount":10,"Spell":"ThreeMusketeers","SpellAlt":"RoyalHogs","origin":"original-row"},"kind":"choice","cards":["three-musketeers","royal-hogs"]},{"id":"road1-2200","trophies":2200,"amount":1,"align":"left","source":{"Trophies":2200,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_7_4","Align":"left","Amount":1,"EmoteIDHigh":15,"EmoteIDLow":2,"origin":"original-row"},"kind":"emote","emote":"Emote58"},{"id":"road1-2250","trophies":2250,"amount":2,"align":"right","source":{"Trophies":2250,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_7_5","Align":"right","Amount":2,"Consumable":"WildcardEpic","origin":"original-row"},"kind":"wildcards","rarity":"Epic"},{"id":"road1-2350","trophies":2350,"amount":50,"align":"right","source":{"Trophies":2350,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_8_1","Align":"right","Amount":50,"Consumable":"WildcardCommon","origin":"original-row"},"kind":"wildcards","rarity":"Common"},{"id":"road1-2400","trophies":2400,"amount":1,"align":"left","source":{"Trophies":2400,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_8_2","Align":"left","Amount":1,"Chest":"Epic_Arena8","origin":"original-row"},"kind":"chest","chest":"Epic_Arena8"},{"id":"road1-2450","trophies":2450,"amount":10,"align":"right","source":{"Trophies":2450,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_8_3","Align":"right","Amount":10,"Spell":"IceGolemite","SpellAlt":"Elixir Collector","origin":"original-row"},"kind":"choice","cards":["ice-golem","elixir-collector"]},{"id":"road1-2500","trophies":2500,"amount":1750,"align":"left","source":{"Trophies":2500,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_8_4","Align":"left","Amount":1750,"Resource":"Gold","origin":"original-row"},"kind":"gold"},{"id":"road1-2550","trophies":2550,"amount":2,"align":"right","source":{"Trophies":2550,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_8_5","Align":"right","Amount":2,"Spell":"Bowler","SpellAlt":"Freeze","origin":"original-row"},"kind":"choice","cards":["bowler","freeze"]},{"id":"road1-2650","trophies":2650,"amount":50,"align":"right","source":{"Trophies":2650,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_9_1","Align":"right","Amount":50,"Spell":"Rascals","SpellAlt":"GoblinGang","origin":"original-row"},"kind":"choice","cards":["rascals","goblin-gang"]},{"id":"road1-2700","trophies":2700,"amount":1,"align":"left","source":{"Trophies":2700,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_9_2","Align":"left","Amount":1,"Chest":"Gold_Arena9","origin":"original-row"},"kind":"chest","chest":"Gold_Arena9"},{"id":"road1-2750","trophies":2750,"amount":10,"align":"right","source":{"Trophies":2750,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_9_3","Align":"right","Amount":10,"Spell":"BlowdartGoblin","SpellAlt":"Earthquake","origin":"original-row"},"kind":"choice","cards":["dart-goblin","earthquake"]},{"id":"road1-2800","trophies":2800,"amount":2000,"align":"left","source":{"Trophies":2800,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_9_4","Align":"left","Amount":2000,"Resource":"Gold","origin":"original-row"},"kind":"gold"},{"id":"road1-2850","trophies":2850,"amount":2,"align":"right","source":{"Trophies":2850,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_9_5","Align":"right","Amount":2,"Consumable":"WildcardEpic","origin":"original-row"},"kind":"wildcards","rarity":"Epic"},{"id":"road1-2900","trophies":2900,"amount":50,"align":"left","source":{"Trophies":2900,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_9_6","Align":"left","Amount":50,"Resource":"Diamonds","origin":"original-row"},"kind":"gems"},{"id":"road1-2950","trophies":2950,"amount":1,"align":"right","source":{"Trophies":2950,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_9_7","Align":"right","Amount":1,"Chest":"Giant_Arena9","origin":"original-row"},"kind":"chest","chest":"Giant_Arena9"},{"id":"road1-3075","trophies":3075,"amount":50,"align":"right","source":{"Trophies":3050,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_10_1","Align":"right","Amount":50,"Spell":"AngryBarbarians","SpellAlt":"Firecracker","origin":"remapped-to-requested-arena-gate"},"kind":"choice","cards":["elite-barbarians","firecracker"]},{"id":"road1-3125","trophies":3125,"amount":1,"align":"left","source":{"Trophies":3100,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_10_2","Align":"left","Amount":1,"Chest":"Shop_Small_1_Arena_L","origin":"remapped-to-requested-arena-gate"},"kind":"chest","chest":"Shop_Small_1_Arena_L"},{"id":"road1-3200","trophies":3200,"amount":10,"align":"right","source":{"Trophies":3150,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_10_3","Align":"right","Amount":10,"Consumable":"WildcardRare","origin":"remapped-to-requested-arena-gate"},"kind":"wildcards","rarity":"Rare"},{"id":"road1-3275","trophies":3275,"amount":2250,"align":"left","source":{"Trophies":3200,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_10_4","Align":"left","Amount":2250,"Resource":"Gold","origin":"remapped-to-requested-arena-gate"},"kind":"gold"},{"id":"road1-3325","trophies":3325,"amount":2,"align":"right","source":{"Trophies":3250,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_10_5","Align":"right","Amount":2,"Spell":"MovingCannon","SpellAlt":"Rage","origin":"remapped-to-requested-arena-gate"},"kind":"choice","cards":["cannon-cart","rage"]},{"id":"road1-3475","trophies":3475,"amount":50,"align":"right","source":{"Trophies":3350,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_11_1","Align":"right","Amount":50,"Consumable":"WildcardCommon","origin":"remapped-to-requested-arena-gate"},"kind":"wildcards","rarity":"Common"},{"id":"road1-3525","trophies":3525,"amount":1,"align":"left","source":{"Trophies":3400,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_11_2","Align":"left","Amount":1,"Chest":"Magic_Arena_Electric","origin":"remapped-to-requested-arena-gate"},"kind":"chest","chest":"Magic_Arena_Electric"},{"id":"road1-3600","trophies":3600,"amount":10,"align":"right","source":{"Trophies":3450,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_11_3","Align":"right","Amount":10,"Spell":"MiniSparkys","SpellAlt":"ElixirGolem","origin":"remapped-to-requested-arena-gate"},"kind":"choice","cards":["zappies","elixir-golem"]},{"id":"road1-3675","trophies":3675,"amount":2500,"align":"left","source":{"Trophies":3500,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_11_4","Align":"left","Amount":2500,"Resource":"Gold","origin":"remapped-to-requested-arena-gate"},"kind":"gold"},{"id":"road1-3725","trophies":3725,"amount":2,"align":"right","source":{"Trophies":3550,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_11_5","Align":"right","Amount":2,"Spell":"ElectroDragon","SpellAlt":"Clone","origin":"remapped-to-requested-arena-gate"},"kind":"choice","cards":["electro-dragon","clone"]},{"id":"road1-3850","trophies":3850,"amount":50,"align":"right","source":{"Trophies":3650,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_12_1","Align":"right","Amount":50,"Consumable":"WildcardCommon","origin":"remapped-to-requested-arena-gate"},"kind":"wildcards","rarity":"Common"},{"id":"road1-3900","trophies":3900,"amount":2750,"align":"left","source":{"Trophies":3700,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_12_2","Align":"left","Amount":2750,"Resource":"Gold","origin":"remapped-to-requested-arena-gate"},"kind":"gold"},{"id":"road1-3950","trophies":3950,"amount":10,"align":"right","source":{"Trophies":3750,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_12_3","Align":"right","Amount":10,"Spell":"GoblinCage","SpellAlt":"BattleHealer","origin":"remapped-to-requested-arena-gate"},"kind":"choice","cards":["goblin-cage","battle-healer"]},{"id":"road1-4000","trophies":4000,"amount":1,"align":"left","source":{"Trophies":3800,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_12_4","Align":"left","Amount":1,"EmoteIDHigh":18,"EmoteIDLow":3,"origin":"remapped-to-requested-arena-gate"},"kind":"emote","emote":"Emote71"},{"id":"road1-4050","trophies":4050,"amount":2,"align":"right","source":{"Trophies":3850,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_12_5","Align":"right","Amount":2,"Spell":"AxeMan","SpellAlt":"Mirror","origin":"remapped-to-requested-arena-gate"},"kind":"choice","cards":["executioner","mirror"]},{"id":"road1-4100","trophies":4100,"amount":3000,"align":"left","source":{"Trophies":3900,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_12_6","Align":"left","Amount":3000,"Resource":"Gold","origin":"remapped-to-requested-arena-gate"},"kind":"gold"},{"id":"road1-4150","trophies":4150,"amount":1,"align":"right","source":{"Trophies":3950,"ItemSWF":"sc/ui_trophy_road_milestones.sc","ItemExportName":"tr_12_7","Align":"right","Amount":1,"Chest":"Shop_Large_Legendary_Arena_T","origin":"remapped-to-requested-arena-gate"},"kind":"chest","chest":"Shop_Large_Legendary_Arena_T"},{"id":"road1-4250","trophies":4250,"amount":50,"align":"right","source":{"Amount":50,"Align":"right","ItemExportName":"tr_12_1","Consumable":"WildcardCommon","origin":"local-extension-using-source-reward-types"},"kind":"wildcards","rarity":"Common"},{"id":"road1-4300","trophies":4300,"amount":3000,"align":"left","source":{"Amount":3000,"Align":"left","ItemExportName":"tr_12_2","Resource":"Gold","origin":"local-extension-using-source-reward-types"},"kind":"gold"},{"id":"road1-4350","trophies":4350,"amount":10,"align":"right","source":{"Amount":10,"Align":"right","ItemExportName":"tr_12_3","RandomSpell":"Rare","origin":"local-extension-using-source-reward-types"},"kind":"cards","rarity":"Rare"},{"id":"road1-4400","trophies":4400,"amount":1,"align":"left","source":{"Amount":1,"Align":"left","ItemExportName":"tr_12_4","Chest":"Gold_Arena_L1","origin":"local-extension-using-source-reward-types"},"kind":"chest","chest":"Gold_Arena_L1"},{"id":"road1-4450","trophies":4450,"amount":2,"align":"right","source":{"Amount":2,"Align":"right","ItemExportName":"tr_12_5","RandomSpell":"Epic","origin":"local-extension-using-source-reward-types"},"kind":"cards","rarity":"Epic"},{"id":"road1-4500","trophies":4500,"amount":50,"align":"left","source":{"Amount":50,"Align":"left","ItemExportName":"tr_12_6","Resource":"Diamonds","origin":"local-extension-using-source-reward-types"},"kind":"gems"},{"id":"road1-4550","trophies":4550,"amount":1,"align":"right","source":{"Amount":1,"Align":"right","ItemExportName":"tr_12_7","Chest":"Magic_Arena_L1","origin":"local-extension-using-source-reward-types"},"kind":"chest","chest":"Magic_Arena_L1"},{"id":"road1-4650","trophies":4650,"amount":50,"align":"right","source":{"Amount":50,"Align":"right","ItemExportName":"tr_12_1","Consumable":"WildcardCommon","origin":"local-extension-using-source-reward-types"},"kind":"wildcards","rarity":"Common"},{"id":"road1-4700","trophies":4700,"amount":3000,"align":"left","source":{"Amount":3000,"Align":"left","ItemExportName":"tr_12_2","Resource":"Gold","origin":"local-extension-using-source-reward-types"},"kind":"gold"},{"id":"road1-4750","trophies":4750,"amount":10,"align":"right","source":{"Amount":10,"Align":"right","ItemExportName":"tr_12_3","RandomSpell":"Rare","origin":"local-extension-using-source-reward-types"},"kind":"cards","rarity":"Rare"},{"id":"road1-4800","trophies":4800,"amount":1,"align":"left","source":{"Amount":1,"Align":"left","ItemExportName":"tr_12_4","Chest":"Gold_Arena_L1","origin":"local-extension-using-source-reward-types"},"kind":"chest","chest":"Gold_Arena_L1"},{"id":"road1-4850","trophies":4850,"amount":2,"align":"right","source":{"Amount":2,"Align":"right","ItemExportName":"tr_12_5","RandomSpell":"Epic","origin":"local-extension-using-source-reward-types"},"kind":"cards","rarity":"Epic"},{"id":"road1-4900","trophies":4900,"amount":50,"align":"left","source":{"Amount":50,"Align":"left","ItemExportName":"tr_12_6","Resource":"Diamonds","origin":"local-extension-using-source-reward-types"},"kind":"gems"},{"id":"road1-4950","trophies":4950,"amount":1,"align":"right","source":{"Amount":1,"Align":"right","ItemExportName":"tr_12_7","Chest":"Magic_Arena_L1","origin":"local-extension-using-source-reward-types"},"kind":"chest","chest":"Magic_Arena_L1"},{"id":"road1-5075","trophies":5075,"amount":2000,"align":"right","source":{"Name":"SeasonDefault","Trophies":4075,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_gold_right_1","Align":"right","Amount":2000,"Resource":"Gold","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"gold"},{"id":"road1-5150","trophies":5150,"amount":1,"align":"left","source":{"Trophies":4150,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_left_1","Align":"left","Amount":1,"Token":"Epic","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"tokens","rarity":"Epic"},{"id":"road1-5225","trophies":5225,"amount":1,"align":"right","source":{"Trophies":4225,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_right_2","Align":"right","Amount":1,"Chest":"Shop_Small_1_Arena_L1","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"chest","chest":"Shop_Small_1_Arena_L1"},{"id":"road1-5375","trophies":5375,"amount":2000,"align":"right","source":{"Trophies":4375,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_gold_right_2","Align":"right","Amount":2000,"Resource":"Gold","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"gold"},{"id":"road1-5450","trophies":5450,"amount":5,"align":"left","source":{"Trophies":4450,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_left_2","Align":"left","Amount":5,"RandomSpell":"Epic","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"cards","rarity":"Epic"},{"id":"road1-5525","trophies":5525,"amount":1,"align":"right","source":{"Trophies":4525,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_right_1","Align":"right","Amount":1,"Chest":"Legendary","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"chest","chest":"Legendary"},{"id":"road1-5700","trophies":5700,"amount":3000,"align":"right","source":{"Trophies":4700,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_gold_right_1","Align":"right","Amount":3000,"Resource":"Gold","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"gold"},{"id":"road1-5800","trophies":5800,"amount":1,"align":"left","source":{"Trophies":4800,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_left_3","Align":"left","Amount":1,"Token":"Legendary","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"tokens","rarity":"Legendary"},{"id":"road1-5900","trophies":5900,"amount":1,"align":"right","source":{"Trophies":4900,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_right_3","Align":"right","Amount":1,"Chest":"Epic_Arena_L1","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"chest","chest":"Epic_Arena_L1"},{"id":"road1-6075","trophies":6075,"amount":3000,"align":"right","source":{"Trophies":5075,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_gold_right_2","Align":"right","Amount":3000,"Resource":"Gold","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"gold"},{"id":"road1-6150","trophies":6150,"amount":50,"align":"left","source":{"Trophies":5150,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_left_1","Align":"left","Amount":50,"RandomSpell":"Rare","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"cards","rarity":"Rare"},{"id":"road1-6225","trophies":6225,"amount":1,"align":"right","source":{"Trophies":5225,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_right_2","Align":"right","Amount":1,"Chest":"Giant_Arena_L1","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"chest","chest":"Giant_Arena_L1"},{"id":"road1-6375","trophies":6375,"amount":4000,"align":"right","source":{"Trophies":5375,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_gold_right_1","Align":"right","Amount":4000,"Resource":"Gold","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"gold"},{"id":"road1-6450","trophies":6450,"amount":100,"align":"left","source":{"Trophies":5450,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_left_2","Align":"left","Amount":100,"Resource":"Diamonds","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"gems"},{"id":"road1-6525","trophies":6525,"amount":1,"align":"right","source":{"Trophies":5525,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_right_1","Align":"right","Amount":1,"Chest":"Magic_Arena_L1","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"chest","chest":"Magic_Arena_L1"},{"id":"road1-6700","trophies":6700,"amount":4000,"align":"right","source":{"Trophies":5700,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_gold_right_2","Align":"right","Amount":4000,"Resource":"Gold","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"gold"},{"id":"road1-6800","trophies":6800,"amount":10,"align":"left","source":{"Trophies":5800,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_left_3","Align":"left","Amount":10,"RandomSpell":"Epic","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"cards","rarity":"Epic"},{"id":"road1-6900","trophies":6900,"amount":1,"align":"right","source":{"Trophies":5900,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_right_3","Align":"right","Amount":1,"Chest":"Legendary","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"chest","chest":"Legendary"},{"id":"road1-7075","trophies":7075,"amount":5000,"align":"left","source":{"Trophies":6075,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_gold_left_1","Align":"left","Amount":5000,"Resource":"Gold","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"gold"},{"id":"road1-7150","trophies":7150,"amount":1,"align":"right","source":{"Trophies":6150,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_right_1","Align":"right","Amount":1,"Token":"Rare","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"tokens","rarity":"Rare"},{"id":"road1-7225","trophies":7225,"amount":1,"align":"left","source":{"Trophies":6225,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_left_2","Align":"left","Amount":1,"Chest":"Shop_Small_1_Arena_L1","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"chest","chest":"Shop_Small_1_Arena_L1"},{"id":"road1-7375","trophies":7375,"amount":5000,"align":"right","source":{"Trophies":6375,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_gold_right_1","Align":"right","Amount":5000,"Resource":"Gold","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"gold"},{"id":"road1-7450","trophies":7450,"amount":1,"align":"left","source":{"Trophies":6450,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_left_3","Align":"left","Amount":1,"Token":"Epic","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"tokens","rarity":"Epic"},{"id":"road1-7525","trophies":7525,"amount":1,"align":"right","source":{"Trophies":6525,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_right_3","Align":"right","Amount":1,"Chest":"Magic_Arena_L1","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"chest","chest":"Magic_Arena_L1"},{"id":"road1-7700","trophies":7700,"amount":10000,"align":"left","source":{"Trophies":6700,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_gold_left_2","Align":"left","Amount":10000,"Resource":"Gold","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"gold"},{"id":"road1-7800","trophies":7800,"amount":1,"align":"right","source":{"Trophies":6800,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_right_1","Align":"right","Amount":1,"Token":"Legendary","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"tokens","rarity":"Legendary"},{"id":"road1-7900","trophies":7900,"amount":1,"align":"left","source":{"Trophies":6900,"ItemSWF":"sc/season_0_default.sc","ItemExportName":"tr_season_panel_generic_left_2","Align":"left","Amount":1,"Chest":"Shop_Large_Legendary_Arena_L1","origin":"source-season-row-shifted-to-5000-league-gate"},"kind":"chest","chest":"Shop_Large_Legendary_Arena_L1"}]};if(typeof module==="object"&&module.exports)module.exports=d;else r.RoyaleRoadData=d;})(globalThis);

;
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

;
/* Cosmetic and purpose-built map choices. Custom variants carry real geometry. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./progression.js'):root.RoyaleProgression);if(n)module.exports=api;else root.RoyaleArenaSelection=api;})(globalThis,function(R){'use strict';
const standard=Object.freeze([{id:'training',name:'Training Camp'},...R.ARENAS.map(({id,name})=>({id,name}))].map(Object.freeze));
const groups=Object.freeze({TeamRumble:['TeamRumble','TeamRumbleArcReverse','TeamRumbleRiverLine'],Team3v3:['Team3v3','Team3v3Jungle','Team3v3Volcano'],BridgeBattle:['BridgeBattle','BridgeBattleLava','BridgeBattleGarden'],Touchdown:['Touchdown'],Touchdown2v2:['Touchdown'],Touchdown3v3:['Touchdown3v3']});
const labels={TeamRumble:'5v5 · Castle Crown',TeamRumbleArcReverse:'5v5 · Moon Keep',TeamRumbleRiverLine:'5v5 · Four Bridges',Team3v3:'3v3 · Royal Bastion',Team3v3Jungle:'3v3 · Jungle Citadel',Team3v3Volcano:'3v3 · Ember Fortress',BridgeBattle:'Bridge · Frozen Causeway',BridgeBattleLava:'Bridge · Lava Causeway',BridgeBattleGarden:'Bridge · Royal Garden',Touchdown:'Touchdown Stadium',Touchdown3v3:'Wide Touchdown Stadium'};
const customIds=[...new Set(Object.values(groups).flat())];const choices=Object.freeze([...standard,...customIds.map(id=>({id,name:labels[id]}))].map(Object.freeze));
function valid(id){return choices.some(m=>m.id===id);}function hash(seed){let h=(Number(seed)||1)>>>0;h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return(h^(h>>>16))>>>0;}
function base(id){if(id.startsWith('Team3v3'))return id.includes('Jungle')?'jungle':id.includes('Volcano')?'pekka':'royal';if(id.startsWith('TeamRumble'))return id.includes('River')?'royal':id.includes('Reverse')?'serenity':'royal';if(id.startsWith('BridgeBattle'))return id.includes('Lava')?'pekka':id.includes('Garden')?'jungle':'frozen';if(id.startsWith('Touchdown'))return'barbarian';return standard.some(m=>m.id===id)?id:'training';}
function choose({mode,queue,current='training',seed=1,requested}={}){const group=groups[mode];if(group){if(group.includes(requested))return requested;return group[hash(seed)%group.length];}if(queue==='trophy-road')return base(current);if(standard.some(m=>m.id===requested))return requested;return standard[hash(seed)%standard.length].id;}
return{standard,groups,choices,valid,base,choose};});

;
/* Historical level-13 account XP progression for the supplied 3.2557.2-era data. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog);if(n)module.exports=api;else root.RoyalePlayerXP=api;})(globalThis,function(K){'use strict';
const MAX_KING_LEVEL=13;
const CUMULATIVE=Object.freeze({1:0,2:20,3:70,4:170,5:370,6:770,7:1770,8:3770,9:8770,10:18770,11:48770,12:88770,13:168770});
const TO_NEXT=Object.freeze({1:20,2:50,3:100,4:200,5:400,6:1000,7:2000,8:5000,9:10000,10:30000,11:40000,12:80000,13:0});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function levelFromTotalXp(total){const xp=Math.max(0,Math.floor(Number(total)||0));let level=1;for(let i=2;i<=MAX_KING_LEVEL;i++){if(xp>=CUMULATIVE[i])level=i;else break;}return level;}
function progressFromTotalXp(total){const totalXp=Math.max(0,Math.floor(Number(total)||0)),level=levelFromTotalXp(totalXp),maxLevel=level>=MAX_KING_LEVEL,start=CUMULATIVE[level],need=maxLevel?0:TO_NEXT[level],into=maxLevel?0:clamp(totalXp-start,0,need);return{level,kingLevel:level,totalXp:Math.min(totalXp,CUMULATIVE[13]),xpIntoLevel:into,xpNeededForNextLevel:need,xpRemaining:maxLevel?0:Math.max(0,need-into),progress01:maxLevel?1:clamp(into/Math.max(1,need),0,1),maxLevel};}
function legacyTotalXp(raw,fresh=false){if(Number.isFinite(Number(raw?.experience)))return clamp(Math.floor(Number(raw.experience)),0,CUMULATIVE[13]);if(fresh)return 0;const level=clamp(Math.floor(Number(raw?.kingLevel??raw?.level)||9),1,13);if(level>=13)return CUMULATIVE[13];const into=clamp(Math.floor(Number(raw?.xp)||0),0,Math.max(0,TO_NEXT[level]-1));return CUMULATIVE[level]+into;}
function sync(profile){profile.experience=clamp(Math.floor(Number(profile.experience)||0),0,CUMULATIVE[13]);const p=progressFromTotalXp(profile.experience);profile.kingLevel=p.level;profile.level=p.level;profile.xp=p.xpIntoLevel;profile.starPoints=Math.max(0,Math.floor(Number(profile.starPoints)||0));return p;}
function grant(profile,amount,reason='generic'){const add=Math.max(0,Math.floor(Number(amount)||0));sync(profile);if(!add)return{amount:0,xpApplied:0,overflowToStarPoints:0,...progressFromTotalXp(profile.experience)};const room=Math.max(0,CUMULATIVE[13]-profile.experience),xpApplied=Math.min(add,room),overflowToStarPoints=add-xpApplied,oldLevel=profile.level;profile.experience+=xpApplied;if(overflowToStarPoints)profile.starPoints+=overflowToStarPoints;const p=sync(profile);return{amount:add,xpApplied,overflowToStarPoints,oldKingLevel:oldLevel,newKingLevel:p.level,leveledUp:p.level>oldLevel,reason,...p};}
function rarityRow(cardOrRarity){const rarity=typeof cardOrRarity==='string'?cardOrRarity:cardOrRarity?.rarity;return K.DATA.rarities[rarity]||K.DATA.rarities[Object.keys(K.DATA.rarities).find(k=>k.toLowerCase()===String(rarity||'').toLowerCase())];}
function upgradeXp(card,currentLevel){const row=rarityRow(card);if(!row)return 0;const base=K.baseLevel(typeof card==='string'?card:card.rarity),idx=Math.max(0,Math.floor(Number(currentLevel)||base)-base);return Math.max(0,Math.floor(Number(row.UpgradeExp?.[idx])||0));}
function donationXp(card,count=1){const row=rarityRow(card);return Math.max(0,Math.floor(Number(row?.DonateXP)||0))*Math.max(0,Math.floor(Number(count)||0));}
return{MAX_KING_LEVEL,CUMULATIVE,TO_NEXT,levelFromTotalXp,progressFromTotalXp,legacyTotalXp,sync,grant,upgradeXp,donationXp};
});

;
(function(r){const data=[{"id":"Emote1","name":"Angry King","cost":250,"free":true,"scene":"emotes_king_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-45.979052734374996,"y":-110.527175283432,"width":91.457666015625,"height":112.262624502182}},{"id":"Emote2","name":"Crying King","cost":250,"free":true,"scene":"emotes_king_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-35.09705429077148,"y":-87.86494522094726,"width":69.47053527832031,"height":97.72144889831543}},{"id":"Emote0","name":"Happy King","cost":250,"free":true,"scene":"emotes_king_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-53.41364326477051,"y":-88.5305687904358,"width":106.87179250717163,"height":90.04387063980103}},{"id":"Emote3","name":"Laughing King","cost":250,"free":true,"scene":"emotes_king_01_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-35.64321494102478,"y":-102.41734595298767,"width":69.76593189239502,"height":106.4805989742279}},{"id":"Emote4","name":"Goblin","cost":250,"free":false,"scene":"emotes_goblin_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-37.65,"y":-80.75,"width":73,"height":80.25}},{"id":"Emote20","name":"Princess","cost":250,"free":false,"scene":"emotes_princess_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-40.85,"y":-106.2873046875,"width":82.6,"height":116.5873046875}},{"id":"Emote38","name":"Royal Hog","cost":250,"free":false,"scene":"emotes_hog_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-37.9967041015625,"y":-88.846875,"width":72.60503768920898,"height":88.9892578125}},{"id":"Emote71","name":"Trophy Road Emote","cost":250,"free":false,"scene":"emotes_royal_ghost_01_dl","animation":"emote4","iconExport":"icon4","frames":140,"fps":60,"bounds":{"x":-83.35751953125,"y":-148.48759765625,"width":159.10478515625002,"height":151.63105468749998}},{"id":"Emote58","name":"Trophy Road King","cost":250,"free":false,"scene":"emotes_crl_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-60.81982059478759,"y":-146.95603027343748,"width":125.4896411895752,"height":170.42887897491454}},{"id":"emotes_10yr_infernoDragon_dl-emote1","name":"10Yr Inferno Dragon \u00b7 1","cost":250,"free":false,"scene":"emotes_10yr_infernoDragon_dl","animation":"emote1","iconExport":"icon1","frames":167,"fps":60,"bounds":{"x":-80.7869140625,"y":-130.891015625,"width":172.150927734375,"height":168.962109375}},{"id":"emotes_10yr_king_dl-emote1","name":"10Yr King \u00b7 1","cost":250,"free":false,"scene":"emotes_10yr_king_dl","animation":"emote1","iconExport":"icon1","frames":177,"fps":60,"bounds":{"x":-43.95625,"y":-90.4,"width":115.676953125,"height":99.47734375}},{"id":"emotes_10yr_knight_dl-emote1","name":"10Yr Knight \u00b7 1","cost":250,"free":false,"scene":"emotes_10yr_knight_dl","animation":"emote1","iconExport":"icon1","frames":139,"fps":60,"bounds":{"x":-111.75390625,"y":-99.671484375,"width":159.40390625,"height":193.026171875}},{"id":"emotes_10yr_lavaHound_dl-emote1","name":"10Yr Lava Hound \u00b7 1","cost":250,"free":false,"scene":"emotes_10yr_lavaHound_dl","animation":"emote1","iconExport":"icon1","frames":175,"fps":60,"bounds":{"x":-61.66875,"y":-89.3203125,"width":122.5791015625,"height":133.7072265625}},{"id":"emotes_4th_bday_battleHealer_dl-emote1","name":"4Th Bday Battle Healer \u00b7 1","cost":250,"free":false,"scene":"emotes_4th_bday_battleHealer_dl","animation":"emote1","iconExport":"icon1","frames":196,"fps":60,"bounds":{"x":-63.1189453125,"y":-126.58720703125,"width":130.625,"height":164.5693359375}},{"id":"emotes_4th_bday_fish_dl-emote1","name":"4Th Bday Fish \u00b7 1","cost":250,"free":false,"scene":"emotes_4th_bday_fish_dl","animation":"emote1","iconExport":"icon1","frames":176,"fps":60,"bounds":{"x":-42.37978515625,"y":-104.84775390625,"width":87.99228515625,"height":104.49541015625}},{"id":"emotes_4th_bday_pekka_dl-emote1","name":"4Th Bday Pekka \u00b7 1","cost":250,"free":false,"scene":"emotes_4th_bday_pekka_dl","animation":"emote1","iconExport":"icon1","frames":196,"fps":60,"bounds":{"x":-95.965234375,"y":-103.55,"width":171.81289062500002,"height":146.40185546875}},{"id":"emotes_4th_bday_royalGiant_dl-emote1","name":"4Th Bday Royal Giant \u00b7 1","cost":250,"free":false,"scene":"emotes_4th_bday_royalGiant_dl","animation":"emote1","iconExport":"icon1","frames":176,"fps":60,"bounds":{"x":-47.5025390625,"y":-100.65,"width":126.3763671875,"height":125.2796875}},{"id":"emotes_4th_bday_sparky_dl-emote1","name":"4Th Bday Sparky \u00b7 1","cost":250,"free":false,"scene":"emotes_4th_bday_sparky_dl","animation":"emote1","iconExport":"icon1","frames":176,"fps":60,"bounds":{"x":-100.334375,"y":-140.87617187499998,"width":178.734375,"height":154.276171875}},{"id":"emotes_april_fools_01_dl-emote1","name":"April Fools 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_april_fools_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-44.081787109375,"y":-118.262890625,"width":85.01362304687498,"height":125.16185812950134}},{"id":"emotes_april_fools_01_dl-emote2","name":"April Fools 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_april_fools_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-35.46989789009095,"y":-80.558447265625,"width":72.60097093582154,"height":91.77827215194702}},{"id":"emotes_archers_01_dl-emote1","name":"Archers 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_archers_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-57.43125,"y":-81.537841796875,"width":163.78554687500002,"height":84.572021484375}},{"id":"emotes_archers_01_dl-emote2","name":"Archers 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_archers_01_dl","animation":"emote2","iconExport":"icon2","frames":141,"fps":60,"bounds":{"x":-64.14931640625,"y":-95.0619140625,"width":157.94794921874998,"height":104.65537109374999}},{"id":"emotes_archers_01_dl-emote3","name":"Archers 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_archers_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-45.759765625,"y":-77.021240234375,"width":117.03330078125,"height":84.209765625}},{"id":"emotes_barbarian_01_dl-emote1","name":"Barbarian 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_barbarian_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-42.18393173217774,"y":-83.94019870758058,"width":85.02814941406251,"height":86.80362358093262}},{"id":"emotes_barbarian_01_dl-emote2","name":"Barbarian 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_barbarian_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-35.48130342178047,"y":-99.38665654361247,"width":69.10829008510336,"height":102.5802685469389}},{"id":"emotes_barbarian_01_dl-emote3","name":"Barbarian 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_barbarian_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-38.02882461547851,"y":-81.92575969696045,"width":75.03072509765624,"height":86.28234519958497}},{"id":"emotes_barbarian_01_dl-emote4","name":"Barbarian 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_barbarian_01_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-59.68083152770996,"y":-98.20291519165039,"width":138.20623283386232,"height":132.97165565490724}},{"id":"emotes_battlehealer_cakethrow_dl-emote1","name":"Battlehealer Cakethrow \u00b7 1","cost":250,"free":false,"scene":"emotes_battlehealer_cakethrow_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-67.672119140625,"y":-130.62328338623047,"width":133.48723602294922,"height":176.3765489578247}},{"id":"emotes_bday_03_dl-emote1","name":"Bday 03 \u00b7 1","cost":250,"free":false,"scene":"emotes_bday_03_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-47.948437500000004,"y":-104.084228515625,"width":111.34267578125001,"height":106.896875}},{"id":"emotes_bday_03_dl-emote2","name":"Bday 03 \u00b7 2","cost":250,"free":false,"scene":"emotes_bday_03_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-47.18291392326355,"y":-97.229833984375,"width":92.94995493888854,"height":134.23793945312502}},{"id":"emotes_bday_03_dl-emote3","name":"Bday 03 \u00b7 3","cost":250,"free":false,"scene":"emotes_bday_03_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-64.642236328125,"y":-136.464794921875,"width":117.27880859375,"height":211.77182769775393}},{"id":"emotes_black_friday_01_dl-emote1","name":"Black Friday 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_black_friday_01_dl","animation":"emote1","iconExport":"icon1","frames":140,"fps":60,"bounds":{"x":-52.283203125,"y":-85.1453125,"width":105.283984375,"height":85.6453125}},{"id":"emotes_black_friday_01_dl-emote2","name":"Black Friday 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_black_friday_01_dl","animation":"emote2","iconExport":"icon2","frames":140,"fps":60,"bounds":{"x":-60.265625,"y":-79.1203125,"width":171.33217105865475,"height":90.08682308197021}},{"id":"emotes_black_friday_01_dl-emote3","name":"Black Friday 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_black_friday_01_dl","animation":"emote3","iconExport":"icon3","frames":140,"fps":60,"bounds":{"x":-43.371875,"y":-96.7359375,"width":88.68183593750001,"height":97.9978515625}},{"id":"emotes_black_friday_01_dl-emote4","name":"Black Friday 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_black_friday_01_dl","animation":"emote4","iconExport":"icon4","frames":140,"fps":60,"bounds":{"x":-39.02135944366455,"y":-100.37736320495605,"width":75.5427188873291,"height":100.67736320495605}},{"id":"emotes_black_friday_02_dl-emote1","name":"Black Friday 02 \u00b7 1","cost":250,"free":false,"scene":"emotes_black_friday_02_dl","animation":"emote1","iconExport":"icon1","frames":140,"fps":60,"bounds":{"x":-85.37734375,"y":-177.6521484375,"width":161.0515625,"height":177.6521484375}},{"id":"emotes_black_friday_02_dl-emote2","name":"Black Friday 02 \u00b7 2","cost":250,"free":false,"scene":"emotes_black_friday_02_dl","animation":"emote2","iconExport":"icon2","frames":140,"fps":60,"bounds":{"x":-44.41953125,"y":-112.242578125,"width":95.49453125,"height":112.6068359375}},{"id":"emotes_black_friday_02_dl-emote3","name":"Black Friday 02 \u00b7 3","cost":250,"free":false,"scene":"emotes_black_friday_02_dl","animation":"emote3","iconExport":"icon3","frames":140,"fps":60,"bounds":{"x":-93.763671875,"y":-122.069140625,"width":149.49267578125,"height":119.8728515625}},{"id":"emotes_black_friday_02_dl-emote4","name":"Black Friday 02 \u00b7 4","cost":250,"free":false,"scene":"emotes_black_friday_02_dl","animation":"emote4","iconExport":"icon4","frames":140,"fps":60,"bounds":{"x":-43.2484375,"y":-99.3783203125,"width":80.1072265625,"height":99.17832031249999}},{"id":"emotes_clashnights_01_dl-emote1","name":"Clashnights 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_clashnights_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-78.1513671875,"y":-119.096923828125,"width":213.29545898437502,"height":137.340185546875}},{"id":"emotes_clashnights_01_dl-emote2","name":"Clashnights 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_clashnights_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-83.126171875,"y":-105.76025390625,"width":167.05234374999998,"height":108.54423828125}},{"id":"emotes_crl_01_dl-emote1","name":"Crl 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_crl_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-24.75,"y":-113.5,"width":52.45,"height":141.39999999999998}},{"id":"emotes_crl_01_dl-emote2","name":"Crl 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_crl_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-48.25,"y":-99.7,"width":96.5,"height":100.37343750000001}},{"id":"emotes_crl_01_dl-emote4","name":"Crl 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_crl_01_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-45,"y":-93,"width":89.95,"height":100}},{"id":"emotes_crl_01_dl-emote5","name":"Crl 01 \u00b7 5","cost":250,"free":false,"scene":"emotes_crl_01_dl","animation":"emote5","iconExport":"icon5","frames":145,"fps":60,"bounds":{"x":-69.90966796875,"y":-97.3,"width":122.517333984375,"height":98.05}},{"id":"emotes_crl_03_dl-emote1","name":"Crl 03 \u00b7 1","cost":250,"free":false,"scene":"emotes_crl_03_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-69.91748046875,"y":-97.3,"width":122.538330078125,"height":98.05}},{"id":"emotes_crl_20win_01_dl-emote1","name":"Crl 20Win 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_crl_20win_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-54.02109565734864,"y":-110.0304754257202,"width":107.18227615356446,"height":115.7513738632202}},{"id":"emotes_crl_king_headset_dl-emote1","name":"Crl King Headset \u00b7 1","cost":250,"free":false,"scene":"emotes_crl_king_headset_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-54.0341796875,"y":-120.011865234375,"width":106.066796875,"height":128.543115234375}},{"id":"emotes_cw_goblinDance_dl-emote1","name":"Cw Goblin Dance \u00b7 1","cost":250,"free":false,"scene":"emotes_cw_goblinDance_dl","animation":"emote1","iconExport":"icon1","frames":122,"fps":60,"bounds":{"x":-60.396484375,"y":-96.25107421875,"width":93.78857421875,"height":120.97998046875}},{"id":"emotes_cw_goblinThumb_dl-emote1","name":"Cw Goblin Thumb \u00b7 1","cost":250,"free":false,"scene":"emotes_cw_goblinThumb_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-34.09609375,"y":-81.8478515625,"width":68.99375,"height":140.94785156249998}},{"id":"emotes_cw_golem_boat_dl-emote1","name":"Cw Golem Boat \u00b7 1","cost":250,"free":false,"scene":"emotes_cw_golem_boat_dl","animation":"emote1","iconExport":"icon1","frames":177,"fps":60,"bounds":{"x":-46.475634765625,"y":-118.48476562500001,"width":83.998876953125,"height":129.702587890625}},{"id":"emotes_dragon_boat_01_dl-emote1","name":"Dragon Boat 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_dragon_boat_01_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-46.672314453125,"y":-81.1529296875,"width":93.6529296875,"height":86.20634765625002}},{"id":"emotes_dragon_boat_01_dl-emote2","name":"Dragon Boat 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_dragon_boat_01_dl","animation":"emote2","iconExport":"icon2","frames":144,"fps":60,"bounds":{"x":-48.662890625,"y":-100.6484375,"width":98.227294921875,"height":102.11855468750001}},{"id":"emotes_dragon_boat_01_dl-emote3","name":"Dragon Boat 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_dragon_boat_01_dl","animation":"emote3","iconExport":"icon3","frames":144,"fps":60,"bounds":{"x":-48.40126953125,"y":-89.75634269714355,"width":99.9525390625,"height":102.90536613464354}},{"id":"emotes_dragon_boat_01_dl-emote4","name":"Dragon Boat 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_dragon_boat_01_dl","animation":"emote4","iconExport":"icon4","frames":144,"fps":60,"bounds":{"x":-51.158984375,"y":-87.94077148437499,"width":105.91796875,"height":94.59838867187499}},{"id":"emotes_electroGiant_01_dl-emote1","name":"Electro Giant 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_electroGiant_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-75.128515625,"y":-91.396875,"width":155.1314453125,"height":114.74565429687499}},{"id":"emotes_electroGiant_01_dl-emote2","name":"Electro Giant 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_electroGiant_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-77.89033203125,"y":-114.48720703125,"width":159.364501953125,"height":125.23720703125}},{"id":"emotes_electroGiant_01_dl-emote3","name":"Electro Giant 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_electroGiant_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-87.761376953125,"y":-115.746630859375,"width":142.289599609375,"height":136.063330078125}},{"id":"emotes_electroGiant_01_dl-emote4","name":"Electro Giant 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_electroGiant_01_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-70.90771484375,"y":-104.236328125,"width":133.11015625,"height":119.42080078125}},{"id":"emotes_elixir_golem_01_dl-emote1","name":"Elixir Golem 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_elixir_golem_01_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-41.25,"y":-75.41728515625,"width":80.8421875,"height":82.116796875}},{"id":"emotes_elixir_golem_01_dl-emote2","name":"Elixir Golem 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_elixir_golem_01_dl","animation":"emote2","iconExport":"icon2","frames":144,"fps":60,"bounds":{"x":-50.519580078125,"y":-90.232275390625,"width":102.86591796875001,"height":106.16455078125}},{"id":"emotes_elixirgolem_candlehead_dl-emote1","name":"Elixirgolem Candlehead \u00b7 1","cost":250,"free":false,"scene":"emotes_elixirgolem_candlehead_dl","animation":"emote1","iconExport":"icon1","frames":139,"fps":60,"bounds":{"x":-65.625439453125,"y":-133.19794921875,"width":131.65087890625,"height":153.26201171875002}},{"id":"emotes_ewiz_01_dl-emote1","name":"Ewiz 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_ewiz_01_dl","animation":"emote1","iconExport":"icon1","frames":140,"fps":60,"bounds":{"x":-44.8923828125,"y":-130.69423828125,"width":93.81162109375,"height":132.92353515625}},{"id":"emotes_ewiz_01_dl-emote2","name":"Ewiz 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_ewiz_01_dl","animation":"emote2","iconExport":"icon2","frames":140,"fps":60,"bounds":{"x":-49.95,"y":-142.89404296875,"width":111.052880859375,"height":158.29404296875}},{"id":"emotes_ewiz_01_dl-emote3","name":"Ewiz 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_ewiz_01_dl","animation":"emote3","iconExport":"icon3","frames":140,"fps":60,"bounds":{"x":-52.1623046875,"y":-105.2,"width":102.0216796875,"height":105.2}},{"id":"emotes_ewiz_01_dl-emote4","name":"Ewiz 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_ewiz_01_dl","animation":"emote4","iconExport":"icon4","frames":140,"fps":60,"bounds":{"x":-64.95,"y":-118.5,"width":132.5,"height":129}},{"id":"emotes_feb2020_01_dl-emote1","name":"Feb2020 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_feb2020_01_dl","animation":"emote1","iconExport":"icon1","frames":163,"fps":60,"bounds":{"x":-33.12548828125,"y":-89.85,"width":65.67548828125001,"height":97.09824218749999}},{"id":"emotes_feb2020_01_dl-emote2","name":"Feb2020 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_feb2020_01_dl","animation":"emote2","iconExport":"icon2","frames":181,"fps":60,"bounds":{"x":-51.7162109375,"y":-85.7,"width":98.3740234375,"height":88.70078125}},{"id":"emotes_feb2020_01_dl-emote3","name":"Feb2020 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_feb2020_01_dl","animation":"emote3","iconExport":"icon3","frames":199,"fps":60,"bounds":{"x":-41.9296875,"y":-77.38437499999999,"width":83.359375,"height":86.046875}},{"id":"emotes_fish_slap_01_dl-emote1","name":"Fish Slap 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_fish_slap_01_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-39.406835937500006,"y":-78.021240234375,"width":79.34855728149415,"height":92.430615234375}},{"id":"emotes_fisherman_01_dl-emote1","name":"Fisherman 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_fisherman_01_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-66.34495162963867,"y":-139.12736139297485,"width":162.50323591232296,"height":149.00026178359985}},{"id":"emotes_fisherman_01_dl-emote2","name":"Fisherman 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_fisherman_01_dl","animation":"emote2","iconExport":"icon2","frames":144,"fps":60,"bounds":{"x":-38.76787109375,"y":-85.7189453125,"width":80.760009765625,"height":110.3822265625}},{"id":"emotes_fisherman_01_dl-emote3","name":"Fisherman 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_fisherman_01_dl","animation":"emote3","iconExport":"icon3","frames":144,"fps":60,"bounds":{"x":-55.0193359375,"y":-79.9,"width":107.36748046875,"height":133.81386718750002}},{"id":"emotes_fisherman_01_dl-emote4","name":"Fisherman 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_fisherman_01_dl","animation":"emote4","iconExport":"icon4","frames":144,"fps":60,"bounds":{"x":-90.380712890625,"y":-76.29921875,"width":131.453466796875,"height":83.6671875}},{"id":"emotes_giant_01_dl-emote1","name":"Giant 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_giant_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-43.4,"y":-86.3,"width":87.5,"height":88.55}},{"id":"emotes_giant_01_dl-emote2","name":"Giant 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_giant_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-49.2271484375,"y":-100.434375,"width":96.7376953125,"height":103.38291015625}},{"id":"emotes_giant_01_dl-emote3","name":"Giant 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_giant_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-53.03515625,"y":-93.2,"width":99.94287109375,"height":94.75}},{"id":"emotes_giant_01_dl-emote4","name":"Giant 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_giant_01_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-63.455078125,"y":-98.038671875,"width":118.3048828125,"height":100.288671875}},{"id":"emotes_goblin_01_dl-emote2","name":"Goblin 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_goblin_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-37.5,"y":-80.75,"width":94.14736328125,"height":80.25}},{"id":"emotes_goblin_01_dl-emote3","name":"Goblin 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_goblin_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-62.780845642089844,"y":-87.78550510406495,"width":97.37923374176026,"height":77.99499845504762}},{"id":"emotes_goblin_01_dl-emote4","name":"Goblin 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_goblin_01_dl","animation":"emote4","iconExport":"icon4","frames":154,"fps":60,"bounds":{"x":-37.53369140625,"y":-84.72578125,"width":75.0673828125,"height":84.26728515625}},{"id":"emotes_goblin_02_dl-emote1","name":"Goblin 02 \u00b7 1","cost":250,"free":false,"scene":"emotes_goblin_02_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-43.77998046875,"y":-79.75,"width":91.10087890624999,"height":83.97197265625}},{"id":"emotes_goblin_02_dl-emote2","name":"Goblin 02 \u00b7 2","cost":250,"free":false,"scene":"emotes_goblin_02_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-38.45,"y":-84.35,"width":74.65,"height":87.64999999999999}},{"id":"emotes_goblin_02_dl-emote3","name":"Goblin 02 \u00b7 3","cost":250,"free":false,"scene":"emotes_goblin_02_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-40.95,"y":-96.2361228942871,"width":89.09697113037109,"height":116.4799705505371}},{"id":"emotes_goblin_02_dl-emote4","name":"Goblin 02 \u00b7 4","cost":250,"free":false,"scene":"emotes_goblin_02_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-44.00725030954928,"y":-158.9347700215876,"width":87.01483506094664,"height":167.43934308066963}},{"id":"emotes_goblin_03_dl-emote1","name":"Goblin 03 \u00b7 1","cost":250,"free":false,"scene":"emotes_goblin_03_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-37.9294921875,"y":-89.9,"width":76.766357421875,"height":94.36074218750001}},{"id":"emotes_goblin_03_dl-emote2","name":"Goblin 03 \u00b7 2","cost":250,"free":false,"scene":"emotes_goblin_03_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-37.9,"y":-81.65,"width":73.6,"height":81.80000000000001}},{"id":"emotes_goblin_03_dl-emote3","name":"Goblin 03 \u00b7 3","cost":250,"free":false,"scene":"emotes_goblin_03_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-38,"y":-79.7,"width":85.463037109375,"height":79.65}},{"id":"emotes_goblin_03_dl-emote4","name":"Goblin 03 \u00b7 4","cost":250,"free":false,"scene":"emotes_goblin_03_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-39.13323619328439,"y":-85.74013175964356,"width":76.11624400578438,"height":88.63806867599487}},{"id":"emotes_goblin_04_dl-emote1","name":"Goblin 04 \u00b7 1","cost":250,"free":false,"scene":"emotes_goblin_04_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-38.400000000000006,"y":-78.25,"width":74.5,"height":78.15}},{"id":"emotes_goblin_04_dl-emote2","name":"Goblin 04 \u00b7 2","cost":250,"free":false,"scene":"emotes_goblin_04_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-23.870999145507813,"y":-112.95136642456055,"width":50.50322570800782,"height":133.28456954956056}},{"id":"emotes_goblin_04_dl-emote3","name":"Goblin 04 \u00b7 3","cost":250,"free":false,"scene":"emotes_goblin_04_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-36.995019531249994,"y":-82.0017578125,"width":75.088330078125,"height":84.385302734375}},{"id":"emotes_goblin_04_dl-emote4","name":"Goblin 04 \u00b7 4","cost":250,"free":false,"scene":"emotes_goblin_04_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-51.33154296875,"y":-106.9498046875,"width":101.84501953125,"height":108.9998046875}},{"id":"emotes_goblin_brawler_01_dl-emote1","name":"Goblin Brawler 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_goblin_brawler_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-54.46613807678222,"y":-74.84017305374145,"width":110.08038520812988,"height":105.41185274124146}},{"id":"emotes_goblin_brawler_01_dl-emote2","name":"Goblin Brawler 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_goblin_brawler_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-52.74482421875,"y":-80.6427734375,"width":111.294775390625,"height":77.0314453125}},{"id":"emotes_goblin_feast_01_dl-emote1","name":"Goblin Feast 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_goblin_feast_01_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-49.46044921875,"y":-85.28388671875,"width":114.79130859375002,"height":98.39248046875}},{"id":"emotes_goblin_feast_01_dl-emote2","name":"Goblin Feast 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_goblin_feast_01_dl","animation":"emote2","iconExport":"icon2","frames":144,"fps":60,"bounds":{"x":-48.9984375,"y":-71.78466796875,"width":95.4375,"height":109.7611328125}},{"id":"emotes_goblin_feast_01_dl-emote3","name":"Goblin Feast 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_goblin_feast_01_dl","animation":"emote3","iconExport":"icon3","frames":144,"fps":60,"bounds":{"x":-45.88505859375,"y":-87.15673828125,"width":92.59272460937501,"height":91.25537109375}},{"id":"emotes_golden_week_01_dl-emote1","name":"Golden Week 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_golden_week_01_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-37.7701171875,"y":-92.58203125,"width":76.240234375,"height":105.97353515625}},{"id":"emotes_halloween_01_dl-emote1","name":"Halloween 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_halloween_01_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-60.648828125,"y":-93.93046875,"width":110.2593918800354,"height":104.41008892059327}},{"id":"emotes_halloween_01_dl-emote2","name":"Halloween 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_halloween_01_dl","animation":"emote2","iconExport":"icon2","frames":144,"fps":60,"bounds":{"x":-41.78828125,"y":-88.470703125,"width":85.82978515625,"height":103.11787109375}},{"id":"emotes_halloween_01_dl-emote3","name":"Halloween 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_halloween_01_dl","animation":"emote3","iconExport":"icon3","frames":144,"fps":60,"bounds":{"x":-41.78828125,"y":-88.470703125,"width":85.82978515625,"height":108.42265625}},{"id":"emotes_halloween_01_dl-emote4","name":"Halloween 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_halloween_01_dl","animation":"emote4","iconExport":"icon4","frames":144,"fps":60,"bounds":{"x":-56.997571325302125,"y":-84.64394197463989,"width":111.95439062118531,"height":86.49765291213988}},{"id":"emotes_halloween_01_dl-emote5","name":"Halloween 01 \u00b7 5","cost":250,"free":false,"scene":"emotes_halloween_01_dl","animation":"emote5","iconExport":"icon5","frames":144,"fps":60,"bounds":{"x":-51.87626953125,"y":-95.2703125,"width":104.290771484375,"height":96.16958007812501}},{"id":"emotes_halloween_02_dl-emote1","name":"Halloween 02 \u00b7 1","cost":250,"free":false,"scene":"emotes_halloween_02_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-51.87626953125,"y":-95.2703125,"width":104.290771484375,"height":96.16958007812501}},{"id":"emotes_heist_bandit_dl-emote1","name":"Heist Bandit \u00b7 1","cost":250,"free":false,"scene":"emotes_heist_bandit_dl","animation":"emote1","iconExport":"icon1","frames":140,"fps":60,"bounds":{"x":-41.8974609375,"y":-78.626513671875,"width":104.13212890625002,"height":92.68564510345459}},{"id":"emotes_heist_hunter_dl-emote1","name":"Heist Hunter \u00b7 1","cost":250,"free":false,"scene":"emotes_heist_hunter_dl","animation":"emote1","iconExport":"icon1","frames":180,"fps":60,"bounds":{"x":-61.37285156250002,"y":-73.35,"width":107.28627929687502,"height":86.77998046875}},{"id":"emotes_heist_magicArcher_dl-emote1","name":"Heist Magic Archer \u00b7 1","cost":250,"free":false,"scene":"emotes_heist_magicArcher_dl","animation":"emote1","iconExport":"icon1","frames":165,"fps":60,"bounds":{"x":-47.15,"y":-83.72548828125001,"width":96.8453125,"height":97.91376953125001}},{"id":"emotes_hog_01_dl-emote2","name":"Hog 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_hog_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-35.2185546875,"y":-71.79837036132812,"width":71.41276702880859,"height":75.63938598632812}},{"id":"emotes_hog_01_dl-emote3","name":"Hog 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_hog_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-43.21049118041992,"y":-99.17408847808838,"width":95.27264099121095,"height":99.69869785308838}},{"id":"emotes_hog_01_dl-emote4","name":"Hog 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_hog_01_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-32.92265625,"y":-92.12167968749999,"width":67.39453125,"height":95.39648437499999}},{"id":"emotes_hog_02_dl-emote1","name":"Hog 02 \u00b7 1","cost":250,"free":false,"scene":"emotes_hog_02_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-68.581787109375,"y":-92.54609375,"width":133.216552734375,"height":129.810546875}},{"id":"emotes_hog_02_dl-emote2","name":"Hog 02 \u00b7 2","cost":250,"free":false,"scene":"emotes_hog_02_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-60.655664062499994,"y":-79.962158203125,"width":123.47626953125,"height":137.177978515625}},{"id":"emotes_hog_02_dl-emote3","name":"Hog 02 \u00b7 3","cost":250,"free":false,"scene":"emotes_hog_02_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-47.425244140625,"y":-85.45,"width":92.688671875,"height":118.1044921875}},{"id":"emotes_hog_02_dl-emote4","name":"Hog 02 \u00b7 4","cost":250,"free":false,"scene":"emotes_hog_02_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-92.81953125,"y":-102.409375,"width":171.7626953125,"height":133.65390624999998}},{"id":"emotes_hogrider_01_dl-emote1","name":"Hogrider 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_hogrider_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-43.63514728546143,"y":-89.836669921875,"width":89.4829158782959,"height":90.92470121383667}},{"id":"emotes_hogrider_01_dl-emote2","name":"Hogrider 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_hogrider_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-36.70859375,"y":-109.95694885253906,"width":111.84318237304689,"height":112.01254005432128}},{"id":"emotes_hogrider_01_dl-emote3","name":"Hogrider 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_hogrider_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-77.24115867614746,"y":-102.93436241149902,"width":117.27522087097168,"height":105.93385047912598}},{"id":"emotes_hogrider_01_dl-emote4","name":"Hogrider 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_hogrider_01_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-59.04905309677124,"y":-118.78111267089844,"width":138.88209142684937,"height":120.36109313964843}},{"id":"emotes_icewizard_01_dl-emote1","name":"Icewizard 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_icewizard_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-59.4375,"y":-95.5,"width":130.233837890625,"height":112.514404296875}},{"id":"emotes_icewizard_01_dl-emote2","name":"Icewizard 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_icewizard_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-96.088330078125,"y":-97.108984375,"width":193.94775390625,"height":111.4021484375}},{"id":"emotes_icewizard_01_dl-emote3","name":"Icewizard 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_icewizard_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-37.220166015625,"y":-96.8,"width":88.6044921875,"height":111.1662109375}},{"id":"emotes_king_02_dl-emote1","name":"King 02 \u00b7 1","cost":250,"free":false,"scene":"emotes_king_02_dl","animation":"emote1","iconExport":"icon1","frames":149,"fps":60,"bounds":{"x":-39.417041015625,"y":-110.583544921875,"width":125.67529296875,"height":167.2083984375}},{"id":"emotes_king_book_dl-emote1","name":"King Book \u00b7 1","cost":250,"free":false,"scene":"emotes_king_book_dl","animation":"emote1","iconExport":"icon1","frames":139,"fps":60,"bounds":{"x":-56.91845703125,"y":-123.734033203125,"width":111.51845703125001,"height":135.584033203125}},{"id":"emotes_lny_01_dl-emote1","name":"Lny 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_lny_01_dl","animation":"emote1","iconExport":"icon1","frames":243,"fps":60,"bounds":{"x":-42.773828125,"y":-82.431640625,"width":130.323828125,"height":90.19365234375}},{"id":"emotes_lny_02_dl-emote1","name":"Lny 02 \u00b7 1","cost":250,"free":false,"scene":"emotes_lny_02_dl","animation":"emote1","iconExport":"icon1","frames":193,"fps":60,"bounds":{"x":-192.7021484375,"y":-185.5041015625,"width":235.73549804687502,"height":222.684375}},{"id":"emotes_lny_02_dl-emote2","name":"Lny 02 \u00b7 2","cost":250,"free":false,"scene":"emotes_lny_02_dl","animation":"emote2","iconExport":"icon2","frames":181,"fps":60,"bounds":{"x":-50.3009765625,"y":-92.08847656249999,"width":86.08837890624999,"height":150.90302734374998}},{"id":"emotes_lny_02_dl-emote3","name":"Lny 02 \u00b7 3","cost":250,"free":false,"scene":"emotes_lny_02_dl","animation":"emote3","iconExport":"icon3","frames":182,"fps":60,"bounds":{"x":-88,"y":-118,"width":169.3,"height":179.85}},{"id":"emotes_LNY_2021_01_dl-emote1","name":"Lny 2021 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_LNY_2021_01_dl","animation":"emote1","iconExport":"icon1","frames":139,"fps":60,"bounds":{"x":-52.7,"y":-79.5,"width":102,"height":103.35}},{"id":"emotes_LNY_2021_01_dl-emote2","name":"Lny 2021 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_LNY_2021_01_dl","animation":"emote2","iconExport":"icon2","frames":139,"fps":60,"bounds":{"x":-48.25,"y":-97.883984375,"width":98.254296875,"height":129.362939453125}},{"id":"emotes_LNY_2021_02_dl-emote1","name":"Lny 2021 02 \u00b7 1","cost":250,"free":false,"scene":"emotes_LNY_2021_02_dl","animation":"emote1","iconExport":"icon1","frames":139,"fps":60,"bounds":{"x":-40.748388671875,"y":-99.93662109375,"width":112.01186523437502,"height":106.48564453125}},{"id":"emotes_LNY_2021_03_dl-emote1","name":"Lny 2021 03 \u00b7 1","cost":250,"free":false,"scene":"emotes_LNY_2021_03_dl","animation":"emote1","iconExport":"icon1","frames":139,"fps":60,"bounds":{"x":-72.906103515625,"y":-136.74716796875,"width":147.81220703125,"height":150.04716796875}},{"id":"emotes_log_02_dl-emote1","name":"Log 02 \u00b7 1","cost":250,"free":false,"scene":"emotes_log_02_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-51.8078125,"y":-76.17313232421876,"width":105.415625,"height":82.59626464843751}},{"id":"emotes_log_02_dl-emote2","name":"Log 02 \u00b7 2","cost":250,"free":false,"scene":"emotes_log_02_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-50.145113945007324,"y":-91.20815558433533,"width":102.99672203063965,"height":105.09679498672484}},{"id":"emotes_logmas2020_01_dl-emote1","name":"Logmas2020 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_logmas2020_01_dl","animation":"emote1","iconExport":"icon1","frames":139,"fps":60,"bounds":{"x":-55.1875,"y":-114.4052734375,"width":110.8525390625,"height":131.9052734375}},{"id":"emotes_logmas2020_02_dl-emote1","name":"Logmas2020 02 \u00b7 1","cost":250,"free":false,"scene":"emotes_logmas2020_02_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-57.448193359375,"y":-102.10400390625,"width":114.63203125,"height":133.60400390625}},{"id":"emotes_logmas2020_02_dl-emote2","name":"Logmas2020 02 \u00b7 2","cost":250,"free":false,"scene":"emotes_logmas2020_02_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-57.7435546875,"y":-120.5046875,"width":119.709375,"height":130.317578125}},{"id":"emotes_logmas2020_03_dl-emote1","name":"Logmas2020 03 \u00b7 1","cost":250,"free":false,"scene":"emotes_logmas2020_03_dl","animation":"emote1","iconExport":"icon1","frames":139,"fps":60,"bounds":{"x":-93.02470703125,"y":-111.3505859375,"width":162.407568359375,"height":141.0173828125}},{"id":"emotes_logmas2020_04_dl-emote1","name":"Logmas2020 04 \u00b7 1","cost":250,"free":false,"scene":"emotes_logmas2020_04_dl","animation":"emote1","iconExport":"icon1","frames":139,"fps":60,"bounds":{"x":-34.35,"y":-125.5,"width":71.05000000000001,"height":149.75}},{"id":"emotes_lumberjack_cakerun_dl-emote1","name":"Lumberjack Cakerun \u00b7 1","cost":250,"free":false,"scene":"emotes_lumberjack_cakerun_dl","animation":"emote1","iconExport":"icon1","frames":139,"fps":60,"bounds":{"x":-64.006640625,"y":-104.085546875,"width":126.63076171875,"height":116.10878906250001}},{"id":"emotes_megaKnight_01_dl-emote1","name":"Mega Knight 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_megaKnight_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-76.77421875,"y":-113.26875,"width":150.81289062500002,"height":171.655908203125}},{"id":"emotes_megaKnight_01_dl-emote2","name":"Mega Knight 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_megaKnight_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-75.06015625,"y":-88.05,"width":152.31191406250002,"height":101.6}},{"id":"emotes_megaKnight_01_dl-emote3","name":"Mega Knight 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_megaKnight_01_dl","animation":"emote3","iconExport":"icon3","frames":139,"fps":60,"bounds":{"x":-77.3884765625,"y":-90.649609375,"width":156.926953125,"height":117.31279296875}},{"id":"emotes_miner_01_dl-emote1","name":"Miner 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_miner_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-49.558349609375,"y":-99.33836932182312,"width":98.61284179687499,"height":101.66356463432312}},{"id":"emotes_miner_01_dl-emote2","name":"Miner 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_miner_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-53.053551244735715,"y":-92.76781229972839,"width":96.08206686973571,"height":122.59580607414246}},{"id":"emotes_minipekka_02_dl-emote1","name":"Minipekka 02 \u00b7 1","cost":250,"free":false,"scene":"emotes_minipekka_02_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-38.692822265625,"y":-86.1625,"width":110.05551757812499,"height":103.25576171875}},{"id":"emotes_minipekka_02_dl-emote2","name":"Minipekka 02 \u00b7 2","cost":250,"free":false,"scene":"emotes_minipekka_02_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-45.464404296875,"y":-86.18389329910279,"width":97.791943359375,"height":99.55171556472779}},{"id":"emotes_minipekka_02_dl-emote3","name":"Minipekka 02 \u00b7 3","cost":250,"free":false,"scene":"emotes_minipekka_02_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-64.765185546875,"y":-97.12763671875,"width":129.590673828125,"height":127.5142578125}},{"id":"emotes_minipekka_02_dl-emote4","name":"Minipekka 02 \u00b7 4","cost":250,"free":false,"scene":"emotes_minipekka_02_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-57.330078125,"y":-96.13323526382446,"width":106.10673828124999,"height":120.00491495132445}},{"id":"emotes_night_witch_01_dl-emote1","name":"Night Witch 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_night_witch_01_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-31.031884765625,"y":-107.3580078125,"width":95.85893554687499,"height":154.30556640625002}},{"id":"emotes_night_witch_clap_01_dl-emote1","name":"Night Witch Clap 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_night_witch_clap_01_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-47.45,"y":-84.83935546875,"width":94.9,"height":105.73798828125}},{"id":"emotes_pekka_blossom_dl-emote1","name":"Pekka Blossom \u00b7 1","cost":250,"free":false,"scene":"emotes_pekka_blossom_dl","animation":"emote1","iconExport":"icon1","frames":139,"fps":60,"bounds":{"x":-77.0787109375,"y":-121.3072265625,"width":132.2697265625,"height":125.3072265625}},{"id":"emotes_PEKKA_boombox_dl-emote1","name":"Pekka Boombox \u00b7 1","cost":250,"free":false,"scene":"emotes_PEKKA_boombox_dl","animation":"emote1","iconExport":"icon1","frames":150,"fps":60,"bounds":{"x":-61.15,"y":-81.3365234375,"width":152.49873046875,"height":100.12934570312501}},{"id":"emotes_PEKKA_coconut_dl-emote1","name":"Pekka Coconut \u00b7 1","cost":250,"free":false,"scene":"emotes_PEKKA_coconut_dl","animation":"emote1","iconExport":"icon1","frames":150,"fps":60,"bounds":{"x":-59.45,"y":-86.8513671875,"width":100.98828125,"height":95.3931640625}},{"id":"emotes_prince_01_dl-emote1","name":"Prince 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_prince_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-45.381640625,"y":-108.00039062500001,"width":85.57265625,"height":139.131591796875}},{"id":"emotes_prince_01_dl-emote2","name":"Prince 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_prince_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-57.9509765625,"y":-107.238671875,"width":114.25219726562501,"height":160.59658203125}},{"id":"emotes_prince_01_dl-emote3","name":"Prince 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_prince_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-56.376953125,"y":-109.47861328125,"width":105.94873046875,"height":165.4759765625}},{"id":"emotes_prince_01_dl-emote4","name":"Prince 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_prince_01_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-37.7,"y":-96.45,"width":84.79082031249999,"height":113.703662109375}},{"id":"emotes_princess_01_dl-emote2","name":"Princess 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_princess_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-42.911523437499994,"y":-117.01473693847656,"width":122.25498046875,"height":125.51473693847656}},{"id":"emotes_princess_01_dl-emote3","name":"Princess 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_princess_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-55.91015625,"y":-110.9416015625,"width":117.91171875,"height":116.04541015625}},{"id":"emotes_princess_01_dl-emote4","name":"Princess 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_princess_01_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-49.4,"y":-111.75625,"width":100.14999999999999,"height":117.58945312499999}},{"id":"emotes_princess_02_dl-emote1","name":"Princess 02 \u00b7 1","cost":250,"free":false,"scene":"emotes_princess_02_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-46.816015625,"y":-101.443359375,"width":88.01669921874999,"height":104.15927734375}},{"id":"emotes_princess_02_dl-emote2","name":"Princess 02 \u00b7 2","cost":250,"free":false,"scene":"emotes_princess_02_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-42.66796875,"y":-108.99677734375,"width":84.347265625,"height":113.39501953125}},{"id":"emotes_princess_02_dl-emote3","name":"Princess 02 \u00b7 3","cost":250,"free":false,"scene":"emotes_princess_02_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-41.3740234375,"y":-109.85033798217775,"width":83.62529296875,"height":113.90277938842775}},{"id":"emotes_princess_02_dl-emote4","name":"Princess 02 \u00b7 4","cost":250,"free":false,"scene":"emotes_princess_02_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-37.03702011108398,"y":-234.42554206848146,"width":129.92641820907593,"height":246.8921573638916}},{"id":"emotes_princess_glasses_01_dl-emote1","name":"Princess Glasses 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_princess_glasses_01_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-39.317822265625,"y":-96.15576171875,"width":77.88022460937499,"height":99.8951171875}},{"id":"emotes_ram_rider_01_dl-emote1","name":"Ram Rider 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_ram_rider_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-54,"y":-100.6,"width":102,"height":104.42607421874999}},{"id":"emotes_ram_rider_01_dl-emote2","name":"Ram Rider 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_ram_rider_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-71.0037109375,"y":-107.55,"width":143.66484375,"height":107.55}},{"id":"emotes_ramRiderFeb2020_01_dl-emote1","name":"Ram Rider Feb2020 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_ramRiderFeb2020_01_dl","animation":"emote1","iconExport":"icon1","frames":163,"fps":60,"bounds":{"x":-34.46064453125,"y":-83.9,"width":70.27919921875,"height":112.08095703125001}},{"id":"emotes_royal_ghost_01_dl-emote1","name":"Royal Ghost 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_royal_ghost_01_dl","animation":"emote1","iconExport":"icon1","frames":140,"fps":60,"bounds":{"x":-47,"y":-96.75,"width":93.55,"height":113.45}},{"id":"emotes_royal_ghost_01_dl-emote2","name":"Royal Ghost 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_royal_ghost_01_dl","animation":"emote2","iconExport":"icon2","frames":140,"fps":60,"bounds":{"x":-71.280859375,"y":-98,"width":120.330859375,"height":98.7}},{"id":"emotes_royal_ghost_01_dl-emote3","name":"Royal Ghost 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_royal_ghost_01_dl","animation":"emote3","iconExport":"icon3","frames":140,"fps":60,"bounds":{"x":-45.4599609375,"y":-98,"width":89.506103515625,"height":139.7625}},{"id":"emotes_royal_ghost_01_dl-emote5","name":"Royal Ghost 01 \u00b7 5","cost":250,"free":false,"scene":"emotes_royal_ghost_01_dl","animation":"emote5","iconExport":"icon5","frames":140,"fps":60,"bounds":{"x":-48.90546875,"y":-117.80000000000001,"width":96.60546874999999,"height":122.65}},{"id":"emotes_royalGuards_01_dl-emote1","name":"Royal Guards 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_royalGuards_01_dl","animation":"emote1","iconExport":"icon1","frames":132,"fps":60,"bounds":{"x":-39.25,"y":-111.26015625,"width":81.99921875,"height":113.404296875}},{"id":"emotes_s12_darkPrince_dl-emote1","name":"S12 Dark Prince \u00b7 1","cost":250,"free":false,"scene":"emotes_s12_darkPrince_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-28.7830020904541,"y":-98.448095703125,"width":57.3815860748291,"height":107.718359375}},{"id":"emotes_s12_pony_dl-emote1","name":"S12 Pony \u00b7 1","cost":250,"free":false,"scene":"emotes_s12_pony_dl","animation":"emote1","iconExport":"icon1","frames":135,"fps":60,"bounds":{"x":-39.9896484375,"y":-88.852001953125,"width":78.475,"height":89.910595703125}},{"id":"emotes_s12_prince_dl-emote1","name":"S12 Prince \u00b7 1","cost":250,"free":false,"scene":"emotes_s12_prince_dl","animation":"emote1","iconExport":"icon1","frames":187,"fps":60,"bounds":{"x":-58.65,"y":-119.65,"width":112.75,"height":151.64140625}},{"id":"emotes_scid_chicken_01_dl-emote1","name":"Scid Chicken 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_scid_chicken_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-39.52869443893432,"y":-112.63935546875,"width":82.06931943893431,"height":128.263671875}},{"id":"emotes_shipwreck_02_dl-emote1","name":"Shipwreck 02 \u00b7 1","cost":250,"free":false,"scene":"emotes_shipwreck_02_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-48.362953376770015,"y":-81.28895177841187,"width":90.17917051315308,"height":85.31375646591187}},{"id":"emotes_shipwreck_03_dl-emote1","name":"Shipwreck 03 \u00b7 1","cost":250,"free":false,"scene":"emotes_shipwreck_03_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-50.81966171264649,"y":-95.226708984375,"width":101.98264999389647,"height":105.12436523437499}},{"id":"emotes_shipwreck_03_dl-emote2","name":"Shipwreck 03 \u00b7 2","cost":250,"free":false,"scene":"emotes_shipwreck_03_dl","animation":"emote2","iconExport":"icon2","frames":144,"fps":60,"bounds":{"x":-39.05712890625,"y":-86.03890037536621,"width":78.06826171875,"height":97.88113670349121}},{"id":"emotes_shipwreck_03_dl-emote3","name":"Shipwreck 03 \u00b7 3","cost":250,"free":false,"scene":"emotes_shipwreck_03_dl","animation":"emote3","iconExport":"icon3","frames":144,"fps":60,"bounds":{"x":-41.070654296875,"y":-82.3357421875,"width":78.8359375,"height":85.48515625}},{"id":"emotes_shipwreck_kingPirate_dl-emote1","name":"Shipwreck King Pirate \u00b7 1","cost":250,"free":false,"scene":"emotes_shipwreck_kingPirate_dl","animation":"emote1","iconExport":"icon1","frames":144,"fps":60,"bounds":{"x":-61.3541015625,"y":-96.116162109375,"width":106.48393554687499,"height":100.161181640625}},{"id":"emotes_skeleton_01_dl-emote1","name":"Skeleton 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_skeleton_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-35.022265625,"y":-97.73525390625001,"width":70.017626953125,"height":201.430224609375}},{"id":"emotes_skeleton_01_dl-emote2","name":"Skeleton 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_skeleton_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-48.16035604476929,"y":-71.66991949081421,"width":95.89219450950623,"height":73.4235016822815}},{"id":"emotes_skeleton_01_dl-emote3","name":"Skeleton 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_skeleton_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-40.746293449401854,"y":-101.65679841041565,"width":95.6613172531128,"height":104.77953171730042}},{"id":"emotes_skeleton_01_dl-emote4","name":"Skeleton 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_skeleton_01_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-32.25205078125,"y":-72.587841796875,"width":64.75283203125,"height":120.55808744430541}},{"id":"emotes_skeleton_dragon_01_dl-emote1","name":"Skeleton Dragon 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_skeleton_dragon_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-59.356689453125,"y":-106.74150390625,"width":120.5953125,"height":220.150390625}},{"id":"emotes_skeleton_snorkel_dl-emote1","name":"Skeleton Snorkel \u00b7 1","cost":250,"free":false,"scene":"emotes_skeleton_snorkel_dl","animation":"emote1","iconExport":"icon1","frames":138,"fps":60,"bounds":{"x":-63,"y":-147,"width":124.05,"height":156.85000000000002}},{"id":"emotes_sparky_surprise_dl-emote1","name":"Sparky Surprise \u00b7 1","cost":250,"free":false,"scene":"emotes_sparky_surprise_dl","animation":"emote1","iconExport":"icon1","frames":139,"fps":60,"bounds":{"x":-56.6884765625,"y":-98.6357421875,"width":148.4783203125,"height":185.1857421875}},{"id":"emotes_spring_01_dl-emote1","name":"Spring 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_spring_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-40.079510593414305,"y":-87.92746906280517,"width":79.82972431182861,"height":101.34839057922363}},{"id":"emotes_spring_01_dl-emote2","name":"Spring 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_spring_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-59.074316406250006,"y":-92.61763429641724,"width":117.83300781250001,"height":98.55630235671997}},{"id":"emotes_spring_01_dl-emote3","name":"Spring 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_spring_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-44.96713318042457,"y":-103.18427476882934,"width":95.11132015399633,"height":110.02075023651122}},{"id":"emotes_spring_01_dl-emote4","name":"Spring 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_spring_01_dl","animation":"emote4","iconExport":"icon4","frames":145,"fps":60,"bounds":{"x":-41.88377752304077,"y":-90.45404834747315,"width":90.98220586776733,"height":133.06328287124634}},{"id":"emotes_wizard_01_dl-emote1","name":"Wizard 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_wizard_01_dl","animation":"emote1","iconExport":"icon1","frames":140,"fps":60,"bounds":{"x":-81.05513935089112,"y":-83.1373046875,"width":121.7292316913605,"height":84.07177734375}},{"id":"emotes_wizard_01_dl-emote2","name":"Wizard 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_wizard_01_dl","animation":"emote2","iconExport":"icon2","frames":140,"fps":60,"bounds":{"x":-103.43493061065674,"y":-82.7373046875,"width":135.62951068878175,"height":84.47211914062501}},{"id":"emotes_wizard_01_dl-emote3","name":"Wizard 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_wizard_01_dl","animation":"emote3","iconExport":"icon3","frames":140,"fps":60,"bounds":{"x":-57.13505878448487,"y":-82.070068359375,"width":115.00843296051026,"height":105.33489627838135}},{"id":"emotes_wizard_01_dl-emote4","name":"Wizard 01 \u00b7 4","cost":250,"free":false,"scene":"emotes_wizard_01_dl","animation":"emote4","iconExport":"icon4","frames":140,"fps":60,"bounds":{"x":-46.467623710632324,"y":-75.931494140625,"width":121.44422273635865,"height":80.42161235809327}},{"id":"emotes_womens_month_01_dl-emote1","name":"Womens Month 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_womens_month_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-56.729150390625,"y":-105.6142970085144,"width":102.11365599632262,"height":149.3471095085144}},{"id":"emotes_womens_month_01_dl-emote2","name":"Womens Month 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_womens_month_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-59.0861328125,"y":-110.78857421875,"width":145.10336914062498,"height":141.0015625}},{"id":"emotes_womens_month_01_dl-emote3","name":"Womens Month 01 \u00b7 3","cost":250,"free":false,"scene":"emotes_womens_month_01_dl","animation":"emote3","iconExport":"icon3","frames":145,"fps":60,"bounds":{"x":-50.651953125,"y":-86.35,"width":102.65214843749999,"height":115.28876953125}},{"id":"emotes_xmas_01_dl-emote1","name":"Xmas 01 \u00b7 1","cost":250,"free":false,"scene":"emotes_xmas_01_dl","animation":"emote1","iconExport":"icon1","frames":145,"fps":60,"bounds":{"x":-52.72119140625,"y":-134.69739418029786,"width":103.35520668029787,"height":141.29739418029786}},{"id":"emotes_xmas_01_dl-emote2","name":"Xmas 01 \u00b7 2","cost":250,"free":false,"scene":"emotes_xmas_01_dl","animation":"emote2","iconExport":"icon2","frames":145,"fps":60,"bounds":{"x":-54.8181640625,"y":-106.1470703125,"width":107.8037109375,"height":184.36943359375}},{"id":"emotes_xmass_barb_nutcracker_dl-emote1","name":"Xmass Barb Nutcracker \u00b7 1","cost":250,"free":false,"scene":"emotes_xmass_barb_nutcracker_dl","animation":"emote1","iconExport":"icon1","frames":137,"fps":60,"bounds":{"x":-37.240527343749996,"y":-84.7,"width":76.8869140625,"height":91.6998046875}},{"id":"emotes_xmass_hog_lights_dl-emote1","name":"Xmass Hog Lights \u00b7 1","cost":250,"free":false,"scene":"emotes_xmass_hog_lights_dl","animation":"emote1","iconExport":"icon1","frames":143,"fps":60,"bounds":{"x":-42.287304687500004,"y":-82.848828125,"width":86.959765625,"height":94.333203125}},{"id":"emotes_xmass_santa_giant_dl-emote1","name":"Xmass Santa Giant \u00b7 1","cost":250,"free":false,"scene":"emotes_xmass_santa_giant_dl","animation":"emote1","iconExport":"icon1","frames":176,"fps":60,"bounds":{"x":-43.91689453125,"y":-78.797265625,"width":90.1185546875,"height":95.7951171875}}];if(typeof module==='object'&&module.exports)module.exports=data;else r.RoyaleEmoteData=data;})(globalThis);

;
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

;
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

;
/* Bounded save shape for the lazy offline world. No population-sized arrays. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleWorldState=api;})(globalThis,function(){'use strict';
const PLAYER_COUNT=4000000,CLAN_COUNT=50000;
const integer=(n,d=0,max=Number.MAX_SAFE_INTEGER)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):d;
const playerId=n=>'p'+String(n).padStart(7,'0');
const validPlayer=id=>typeof id==='string'&&/^p\d{7}$/.test(id)&&Number(id.slice(1))<PLAYER_COUNT;
const validClan=id=>typeof id==='string'&&(/^(?:c\d{5}|new-[0-9a-z-]{1,50})$/.test(id))&&(id[0]!=='c'||Number(id.slice(1))<CLAN_COUNT);
function plain(value,depth=0){
 if(depth>13)return null;
 if(typeof value==='string')return value.slice(0,400);
 if(typeof value==='boolean'||value===null)return value;
 if(typeof value==='number')return Number.isFinite(value)?value:0;
 if(Array.isArray(value))return value.slice(0,256).map(x=>plain(x,depth+1));
 if(value&&typeof value==='object'){const out={};for(const [key,x] of Object.entries(value).slice(0,150)){if(key.length>120||['__proto__','prototype','constructor'].includes(key))continue;out[key]=plain(x,depth+1);}return out;}
 return null;
}
const list=v=>Array.isArray(v)?v:[],record=v=>v&&typeof v==='object'&&!Array.isArray(v),actor=id=>id==='self'||validPlayer(id),card=id=>typeof id==='string'&&/^[a-z][a-z0-9-]{0,60}$/.test(id);
function cleanClan(value,id){
 const c=plain(value);c.id=id;c.memberIds=[...new Set(list(c.memberIds).filter(validPlayer))].slice(0,49);c.departed=[...new Set(list(c.departed).filter(validPlayer))].slice(-100);
 c.messages=list(c.messages).filter(m=>record(m)&&typeof m.text==='string'&&actor(m.actor)&&Number.isFinite(m.time)).slice(-100);
 c.requests=list(c.requests).filter(q=>record(q)&&card(q.card)&&actor(q.owner)&&typeof q.id==='string'&&Number.isFinite(q.expiresAt)&&q.total>0).slice(-35).map(q=>({...q,total:integer(q.total,1,40),filled:integer(q.filled,0,40),donors:record(q.donors)?q.donors:{}}));
 c.trades=list(c.trades).filter(t=>record(t)&&card(t.want)&&actor(t.owner)&&typeof t.id==='string'&&['Common','Rare','Epic','Legendary'].includes(t.rarity)&&list(t.give).length&&list(t.give).every(card)&&Number.isFinite(t.expiresAt)&&t.count>0).slice(-35).map(t=>({...t,give:list(t.give).slice(0,4),count:({Common:250,Rare:50,Epic:10,Legendary:1})[t.rarity]}));
 c.roles=record(c.roles)?Object.fromEntries(Object.entries(c.roles).filter(([id,role])=>actor(id)&&['Leader','Co-leader','Elder','Member'].includes(role))):{};
 return c;
}
function normalize(raw){const r=raw&&typeof raw==='object'?raw:{},clans={};for(const [id,value] of Object.entries(r.clans||{}).slice(-12)){if(validClan(id)&&value&&typeof value==='object')clans[id]=cleanClan(value,id);}
 const players={};for(const [id,d] of Object.entries(record(r.players)?r.players:{}).slice(-4000)){if(validPlayer(id)&&record(d))players[id]={trophies:Number.isFinite(d.trophies)?Math.max(-8000,Math.min(8000,Math.floor(d.trophies))):0,wins:integer(d.wins,0,1000000),matches:integer(d.matches,0,1000000),donations:integer(d.donations,0,1000000)};}
 return {version:1,players,lastOpponentResult:typeof r.lastOpponentResult==='string'?r.lastOpponentResult.slice(0,120):'',seed:integer(r.seed,77137,0xffffffff)||77137,epoch:integer(r.epoch),clock:integer(r.clock),serial:integer(r.serial),
 friends:[...new Set((Array.isArray(r.friends)?r.friends:[]).filter(validPlayer))].slice(0,200),
 encountered:[...new Set((Array.isArray(r.encountered)?r.encountered:[]).filter(validPlayer))].slice(-200),
 currentClan:validClan(r.currentClan)?r.currentClan:null,clans,
 requestAt:integer(r.requestAt),lastEpicSunday:Number.isFinite(r.lastEpicSunday)&&r.lastEpicSunday>=0?integer(r.lastEpicSunday):-1,donationDay:integer(r.donationDay),dailyDonated:integer(r.dailyDonated,0,360),
 war:r.war&&typeof r.war==='object'?plain(r.war):null,retiredLegacyClan:r.retiredLegacyClan===true};
}
return{PLAYER_COUNT,CLAN_COUNT,integer,playerId,validPlayer,validClan,normalize,plain};});

;
/* Permanent crown progression. Claims are compact disjoint milestone ranges;
   nothing here pays currency, changes King XP, or spends Crown Chest crowns. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleCrownRoad=api;})(globalThis,function(){'use strict';
const MAX_CROWNS=9999999,integer=(v,max=MAX_CROWNS)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
function lifetime(p={}){const recent=Array.isArray(p.history)?p.history.filter(h=>h&&!h.practice&&h.queue!=='replay'&&[-1,0,1].includes(h.winner)).slice(0,20).reduce((n,h)=>n+integer(h.crowns?.[0],h.mode==='TeamRumble'?10:h.mode==='Team3v3'?6:3),0):0;return Math.max(integer(p.lifetimeCrowns),integer(p.earnedCrowns),integer(p.crownChestClaimed),recent);}
function normalizeClaims(raw,limit){const pairs=Array.isArray(raw)?raw.filter(x=>Array.isArray(x)&&x.length===2&&x.every(Number.isSafeInteger)&&x[0]>=1&&x[1]>=x[0]&&x[0]<=limit).map(([lo,hi])=>[lo,Math.min(limit,hi)]).sort((a,b)=>a[0]-b[0]):[],out=[];for(const p of pairs){const last=out[out.length-1];if(last&&p[0]<=last[1]+1)last[1]=Math.max(last[1],p[1]);else out.push(p);}return out;}
function normalize(p){const lifetimeCrowns=lifetime(p),milestones=Math.floor(lifetimeCrowns/10);return{lifetimeCrowns,crownLevel:1+milestones,crownRoadClaims:normalizeClaims(p.crownRoadClaims,milestones)};}
function progress(p){const v=normalize(p),milestones=v.crownLevel-1,claimed=v.crownRoadClaims.reduce((n,[lo,hi])=>n+hi-lo+1,0);let next=1;for(const [lo,hi] of v.crownRoadClaims){if(lo>next)break;next=Math.max(next,hi+1);}return{...v,milestones,remainder:v.lifetimeCrowns%10,unclaimed:milestones-claimed,nextUnclaimed:next<=milestones?next:null};}
function claimed(p,n){return normalize(p).crownRoadClaims.some(([lo,hi])=>n>=lo&&n<=hi);}
function state(p,n){if(!Number.isSafeInteger(n)||n<1||n>Math.floor(lifetime(p)/10))return'locked';return claimed(p,n)?'claimed':'available';}
function mark(p,n){return normalizeClaims([...p.crownRoadClaims,[n,n]],Math.floor(lifetime(p)/10));}
function reward(n){if(!Number.isSafeInteger(n)||n<1||n>Math.floor(MAX_CROWNS/10))return null;const cap=(x,limit=9999999)=>Math.min(limit,Math.floor(x));const r={gold:cap(500+150*n+25*n*n),gems:0,cards:[],wildcards:{Common:cap(15+5*n+Math.pow(n,1.25),100000)}};if(n>=2)r.wildcards.Rare=cap(5+n+Math.pow(n,1.12)/3,100000);if(n%5===0){r.gems=cap(10+4*n+Math.pow(n,1.25));r.wildcards.Epic=cap(2+n/5+Math.pow(n,1.1)/10,100000);}if(n%3===0)r.wildcards.Epic=Math.max(r.wildcards.Epic||0,cap(2+n/5+Math.pow(n,1.1)/10,100000));if(n%10===0){r.wildcards.Legendary=cap(1+n/50,100000);const book=n>=100?'book-of-books':n>=60?'legendary-book':n>=30?'epic-book':n>=20?'rare-book':'common-book';r.magicItems={[book]:1};}if(n%7===0)r.magicItems={...r.magicItems,'magic-coin':Math.min(10,1+Math.floor(n/100))};if(n%25===0){r.wildcards.Legendary=cap(1+n/50,100000);const id=n>=100?'book-of-books':n>=75?'legendary-book':n>=50?'epic-book':'rare-book';r.magicItems={...r.magicItems,[id]:Math.min(10,1+Math.floor(n/100))};}if(n%10===0)r.chestKind=n%50===0?'treasure':n>=30&&n%30===0?'legendary':n%20===0?'giant':'magic';return r;}
return{MAX_CROWNS,lifetime,normalize,progress,normalizeClaims,claimed,state,mark,reward};});

;
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
 const modeSaved=(raw,mode)=>{const size=K.modeDeckSize(mode),out=Array(size).fill(null),seen=new Set();if(Array.isArray(raw))for(let i=0;i<size;i++){const id=raw[i];if(K.allowedInMode(id,mode)&&(cheats.duplicates||!seen.has(id))){out[i]=id;seen.add(id);}}for(const id of [...K.DEFAULT_DECK,...K.CARDS.map(c=>c.id)]){if(!out.includes(null))break;if(K.allowedInMode(id,mode)&&!seen.has(id)){out[out.indexOf(null)]=id;seen.add(id);}}return out;};
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

;
/* Collection-strength model for local AI opponents. Card strength is sampled from
   collection development, not copied from the human deck. Rarity floors, unlock
   age, collection scarcity and league position all affect the result. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog,n?require('./progression.js'):root.RoyaleProgression);if(n)module.exports=api;else root.RoyaleLevelModel=api;})(globalThis,function(K,R){'use strict';
const MAX=13,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const DEVELOPMENT=Object.freeze({1:.10,2:.17,3:.24,4:.31,5:.39,6:.47,7:.55,8:.62,9:.69,10:.75,11:.80,12:.85,13:.89,14:.92});
const KING_CENTER=Object.freeze({1:2.0,2:3.0,3:4.0,4:5.0,5:6.0,6:7.0,7:7.7,8:8.4,9:9.0,10:9.6,11:10.1,12:10.6,13:11.0,14:11.4});
const MASTER_INDEX=R.LEAGUES.findIndex(x=>x.name==='Master I');
const LEAGUE_RULES=R.LEAGUES.map((league,i)=>{const d=i-MASTER_INDEX;let max12=null,pStart=0,pEnd=0,king12=0;if(d===0){max12=4;pStart=.22;pEnd=.17;king12=.22;}else if(d===1){max12=3;pStart=.15;pEnd=.11;king12=.12;}else if(d===2){max12=2;pStart=.10;pEnd=.07;king12=.06;}else if(d===3){max12=1;pStart=.06;pEnd=.04;king12=.025;}else if(d===4){max12=1;pStart=.03;pEnd=.015;king12=.01;}else if(d>=5){max12=0;pStart=0;pEnd=0;king12=0;}return{...league,index:i,max12,pStart,pEnd,king12};});
function leagueForTrophies(t){const n=Math.max(0,Number(t)||0);return[...LEAGUE_RULES].reverse().find(x=>n>=x.trophies)||null;}
function randNormal(rng){let u=0,v=0;while(!u)u=rng();while(!v)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function rarityFloor(card){return K.baseLevel(card?.rarity||'Common');}
function cardArena(card){return Math.max(0,R.cardArenaNumber(card,K.DATA.arenas));}
function rarityScarcity(card){const row=K.DATA.rarities[card?.rarity]||K.DATA.rarities.Common,weight=Math.max(1,Number(row?.ChanceWeight)||1);return clamp(Math.log10(194/weight)/Math.log10(194),0,1);}
function acquisitionDifficulty(card,arena){const unlock=cardArena(card),age=Math.max(0,(Number(arena)||1)-unlock),newness=clamp(1-age/6,0,1),scarcity=rarityScarcity(card);return clamp(.20+.45*scarcity+.35*newness,.15,1);}
function displayedLevel(card,development){const min=rarityFloor(card);return clamp(Math.round(min+clamp(development,0,1)*(MAX-min)),min,MAX);}
function baseDevelopment(arena,trophies){const a=clamp(Math.floor(Number(arena)||1),1,14),t=Math.max(0,Number(trophies)||0),challenger=R.LEAGUES[0]?.trophies||5000,master=R.LEAGUES[MASTER_INDEX]?.trophies||6000;if(t>=master)return 1;if(t>=challenger){const x=clamp((t-challenger)/Math.max(1,master-challenger),0,1);return .91+.075*x;}return DEVELOPMENT[a]??.5;}
function rollAccountBias(rng){const x=rng();if(x<.06)return-.095-Math.abs(randNormal(rng))*.025;if(x>.94)return.070+Math.abs(randNormal(rng))*.020;return clamp(randNormal(rng)*.032,-.075,.075);}
function weightedPickIndices(cards,count,arena,rng){const pool=cards.map((card,i)=>({i,w:.35+acquisitionDifficulty(card,arena)})),out=[];while(pool.length&&out.length<count){let total=pool.reduce((s,x)=>s+x.w,0),r=rng()*total,k=0;for(;k<pool.length-1;k++){r-=pool[k].w;if(r<=0)break;}out.push(pool[k].i);pool.splice(k,1);}return out;}
function masterLevel12Count(trophies,deckSize,rng){const rule=leagueForTrophies(trophies);if(!rule||rule.max12===null)return null;if(rule.max12===0)return 0;const next=LEAGUE_RULES[rule.index+1],end=next?.trophies??rule.trophies+300,x=clamp((trophies-rule.trophies)/Math.max(1,end-rule.trophies),0,1),p=rule.pStart+(rule.pEnd-rule.pStart)*x;let count=0;for(let i=0;i<deckSize;i++)if(rng()<p)count++;return Math.min(rule.max12,count);}
function deckLevels({arena=1,trophies=0,cards=[],rng=Math.random,accountBias=null}={}){const a=clamp(Math.floor(Number(arena)||1),1,14),t=Math.max(0,Number(trophies)||0),rule=leagueForTrophies(t),master=R.LEAGUES[MASTER_INDEX]?.trophies||6000;if(t>=master&&rule?.max12!==null){const count=masterLevel12Count(t,cards.length,rng),lag=new Set(weightedPickIndices(cards,count,a,rng));return cards.map((card,i)=>({cardId:card.id,level:lag.has(i)?12:13,difficulty:acquisitionDifficulty(card,a)}));}
 const account=accountBias===null?rollAccountBias(rng):Number(accountBias)||0,base=baseDevelopment(a,t);return cards.map(card=>{const age=Math.max(0,a-cardArena(card)),difficulty=acquisitionDifficulty(card,a),ageLag=clamp((4-age)*.016,0,.064),scarcityLag=difficulty*.055,cardNoise=randNormal(rng)*.030,favorite=rng()<.12?.045:rng()<.10?-.040:0,outlier=rng()<.025?(rng()<.5?-.12:.09):0,development=clamp(base+account-ageLag-scarcityLag+cardNoise+favorite+outlier,0,1);return{cardId:card.id,level:displayedLevel(card,development),development,difficulty};});}
function levelMap(opts){return Object.fromEntries(deckLevels(opts).map(x=>[x.cardId,x.level]));}
function opponentTrophies(playerTrophies,rng=Math.random){const t=Math.max(0,Number(playerTrophies)||0),spread=t>=5000?140:t>=3000?120:90;return Math.max(0,Math.round(t+(rng()+rng()-1)*spread));}
function expectedKing(arena,trophies){const t=Math.max(0,Number(trophies)||0),master=R.LEAGUES[MASTER_INDEX]?.trophies||6000;if(t>=master)return 12.8;const challenger=R.LEAGUES[0]?.trophies||5000;if(t>=challenger)return 11.2+1.35*clamp((t-challenger)/Math.max(1,master-challenger),0,1);return KING_CENTER[clamp(Math.floor(Number(arena)||1),1,14)]||9;}
function kingLevel({arena=1,trophies=0,rng=Math.random}={}){const t=Math.max(0,Number(trophies)||0),rule=leagueForTrophies(t),master=R.LEAGUES[MASTER_INDEX]?.trophies||6000;if(t>=master&&rule?.max12!==null)return rule.king12>0&&rng()<rule.king12?12:13;return clamp(Math.round(expectedKing(arena,trophies)+randNormal(rng)*.55),1,13);}
return{MAX,DEVELOPMENT,KING_CENTER,LEAGUE_RULES,MASTER_INDEX,leagueForTrophies,rarityScarcity,acquisitionDifficulty,displayedLevel,baseDevelopment,rollAccountBias,masterLevel12Count,deckLevels,levelMap,opponentTrophies,expectedKing,kingLevel};
});

;
/* Deterministic radius-aware routing. Coordinates here are arena tiles, not
   stretched display pixels. This is an independently implemented navigator. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./arena-grid.js'):root.RoyaleArenaGrid,n?require('./pathing.js'):root.RoyalePathing);if(n)module.exports=api;else root.RoyaleNavigation=api;})(globalThis,function(G,Pathing){'use strict';
// Keep the half-tile search samples and add the exact bridge centerlines. A
// radius-one body fits a two-tile bridge only on its centerline; quarter-offset
// samples alone incorrectly make both bridges impassable for those source units.
const CELL=.5,XS=[...Array.from({length:36},(_,i)=>i*CELL+.25),...G.BRIDGES.map(b=>(b.left+b.right)/2)].sort((a,b)=>a-b),NX=XS.length,NY=64,N=NX*NY,EPS=1e-6;
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
class Heap{constructor(){this.a=[];}push(n){const a=this.a;a.push(n);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].f<=n.f)break;a[i]=a[p];i=p;}a[i]=n;}pop(){const a=this.a,r=a[0],n=a.pop();if(a.length){let i=0;while(2*i+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=n.f)break;a[i]=a[j];i=j;}a[i]=n;}return r;}get size(){return this.a.length;}}
function waterClear(x,y,r,layout=null){return G.waterClear(x,y,r,layout);}
function pointClear(p,r,obstacles,free=false){
 const airborne=free===true||free?.air===true,waterFree=airborne||free?.water===true,a=G.Layout.limits(free?.layout,airborne);
 if(p.x<a.left+.25||p.x>a.right-.25||p.y<a.top+.4||p.y>a.bottom-.4)return false;
 if(airborne)return true;
 if(!G.Layout.boundsClear(p.x,p.y,r,free?.layout))return false;
 if(!waterFree&&!waterClear(p.x,p.y,r,free?.layout))return false;
 for(const o of obstacles){const dx=p.x-o.x,dy=p.y-o.y,limit=r+o.radius+.025;if(dx*dx+dy*dy<limit*limit)return false;}return true;
}
// Resolve only invalid spawn/recovery points. Walking follows the returned point
// at the actor's normal speed; this helper never mutates an existing actor.
function nearestClearPoint(start,r,obstacles=[],free=false,forward={x:0,y:-1}){
 const air=free===true||free?.air===true,a=G.Layout.limits(free?.layout,air),minX=a.left+Math.max(.25,air?0:r),maxX=a.right-Math.max(.25,air?0:r),minY=a.top+Math.max(.4,air?0:r),maxY=a.bottom-Math.max(.4,air?0:r);
 const bounded=p=>({x:Math.max(minX,Math.min(maxX,p.x)),y:Math.max(minY,Math.min(maxY,p.y))}),base=bounded(start);
 if(pointClear(base,r,obstacles,free))return base;
 const candidates=[base,{x:base.x,y:15-r-1e-6},{x:base.x,y:17+r+1e-6}];
 for(const bridge of G.bridges(free?.layout))if(bridge.right-bridge.left>=2*r)candidates.push({x:Math.max(bridge.left+r,Math.min(bridge.right-r,base.x)),y:base.y});
 if(!air)for(const o of obstacles){const dx=base.x-o.x,dy=base.y-o.y,d=Math.hypot(dx,dy),radius=r+o.radius+.026;
  if(d>radius+2)continue;
  candidates.push({x:o.x+(d?dx/d:forward.x)*radius,y:o.y+(d?dy/d:forward.y)*radius});
  // Nearby structures, banks and arena edges can obstruct the nearest normal.
  for(let i=0;i<32;i++){const angle=Math.atan2(forward.y,forward.x)+i*Math.PI/16;candidates.push({x:o.x+Math.cos(angle)*radius,y:o.y+Math.sin(angle)*radius});}
 }
 const distance=p=>(p.x-start.x)**2+(p.y-start.y)**2;
 let best=null,bestDistance=Infinity;
 for(const p0 of candidates){const p=bounded(p0),d=distance(p);if(d<bestDistance&&pointClear(p,r,obstacles,free)){best=p;bestDistance=d;}}
 if(best)return best;
 // Bounded fallback for crowded spawn points, deterministic in team orientation.
 const angle0=Math.atan2(forward.y,forward.x);
 for(let ring=1;ring<=288;ring++){const radius=ring*.125,count=Math.min(128,Math.max(16,Math.ceil(radius*32)));for(let i=0;i<count;i++){const angle=angle0+i*Math.PI*2/count,p=bounded({x:base.x+Math.cos(angle)*radius,y:base.y+Math.sin(angle)*radius});if(pointClear(p,r,obstacles,free))return p;}}
 return null;
}
function segmentClear(a,b,r,obstacles,free=false){
 if(!pointClear(b,r,obstacles,free))return false;
 const airborne=free===true||free?.air===true;if(airborne)return true;
 if(!Pathing.terrainSegmentClear(a,b,r,free?.water===true,free?.layout))return false;
 return obstacles.every(o=>Pathing.pointSegmentDistance(o,a,b)>=r+o.radius+.025);
}
const point=i=>({x:XS[i%NX],y:Math.floor(i/NX)*CELL+.25});
const index=p=>{let col=0;for(let i=1;i<NX;i++)if(Math.abs(XS[i]-p.x)<Math.abs(XS[col]-p.x))col=i;return col+Math.max(0,Math.min(NY-1,Math.floor(p.y/CELL)))*NX;};
const customGrids=new Map();
function searchGrid(layout,radius=0){
 const a=G.layoutFor(layout);if(!a.custom)return{NX,NY,N,point,index};const key=layout+':'+radius;if(customGrids.has(key))return customGrids.get(key);
 // Include true wall-clearance tracks: half-tile centers alone can omit a
 // legal rear aisle between a large tower and the map border.
 const unique=values=>[...new Set(values)].sort((x,y)=>x-y);
 const xs=unique([...Array.from({length:Math.ceil((a.right-a.left)/CELL)},(_,i)=>a.left+i*CELL+.25),...G.bridges(layout).map(b=>(b.left+b.right)/2),a.left+radius+.026,a.right-radius-.026]);
 const ys=unique([...Array.from({length:Math.ceil((a.bottom-a.top)/CELL)},(_,i)=>a.top+i*CELL+.25),a.top+radius+.026,a.bottom-radius-.026]);
 const nearest=(values,x)=>{let j=0;for(let i=1;i<values.length;i++)if(Math.abs(values[i]-x)<Math.abs(values[j]-x))j=i;return j;};
 const nx=xs.length,ny=ys.length,pt=i=>({x:xs[i%nx],y:ys[Math.floor(i/nx)]}),ix=p=>nearest(xs,p.x)+nearest(ys,p.y)*nx;
 const out={NX:nx,NY:ny,N:nx*ny,point:pt,index:ix};if(customGrids.size>=64)customGrids.clear();customGrids.set(key,out);return out;
}
function route(start,target,r,reach,obstacles,free=false){
 const {NX,NY,N,point,index}=searchGrid(free?.layout,r);
 const delta=length(start,target),stop=Math.max(r+(target.radius||0)+.04,reach-.025);
 const direct=delta>stop?{x:target.x+(start.x-target.x)*stop/delta,y:target.y+(start.y-target.y)*stop/delta}:start;
 if(delta<=reach-EPS)return [];
 if(segmentClear(start,direct,r,obstacles,free))return [direct];
 // A death spawn may begin inside its parent footprint; permit only escaping
 // that initial overlap, never ignore a structure farther along the route.
 const blocking=obstacles.filter(o=>length(start,o)>=r+o.radius+.015);
 const valid=new Int8Array(N),cost=new Float64Array(N);cost.fill(Infinity);const parent=new Int32Array(N);parent.fill(-1);const closed=new Uint8Array(N);
 const legal=i=>{if(!valid[i])valid[i]=pointClear(point(i),r,blocking,free)?1:-1;return valid[i]===1;};
 let begin=index(start);if(!legal(begin)){let best=Infinity;for(let i=0;i<N;i++){if(!legal(i))continue;const p=point(i),d=length(start,p);if(d<best&&segmentClear(start,p,r,blocking,free)){begin=i;best=d;}}if(!Number.isFinite(best))return [];}
 const open=new Heap();cost[begin]=0;open.push({i:begin,f:length(point(begin),target)});let end=-1,nearest=begin,near=Infinity,expanded=0;
 const dirs=[[0,-1],[-1,0],[1,0],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
 while(open.size&&expanded++<N){const {i}=open.pop();if(closed[i])continue;closed[i]=1;const p=point(i),d=length(p,target);if(d<near){nearest=i;near=d;}
  if(d<=reach&&d>=r+(target.radius||0)+.01){end=i;break;}
  const ix=i%NX,iy=Math.floor(i/NX);for(const [dx,dy]of dirs){const x=ix+dx,y=iy+dy;if(x<0||x>=NX||y<0||y>=NY)continue;const j=x+y*NX;if(closed[j]||!legal(j))continue;
   if(dx&&dy&&(!legal(ix+dx+iy*NX)||!legal(ix+(iy+dy)*NX)))continue;
   const g=cost[i]+length(p,point(j))*(dx&&dy?1:.999999);if(g+EPS>=cost[j])continue;cost[j]=g;parent[j]=i;open.push({i:j,f:g+Math.max(0,length(point(j),target)-reach)});
  }
 }
 if(end<0)end=nearest;if(end===begin)return [];
 const path=[];for(let i=end;i!==begin&&i>=0;i=parent[i])path.push(point(i));path.reverse();
 // Remove grid stair steps only when the complete swept segment is clear.
 const smooth=[];let from=start,k=0;while(k<path.length){let last=k;for(let j=k+1;j<path.length;j++){if(!segmentClear(from,path[j],r,blocking,free))break;last=j;}smooth.push(path[last]);from=path[last];k=last+1;}
 return smooth;
}
// Hovering/jumping units may cross the river; unlike airborne troops, they
// must still route around every live building footprint.
function travelPermission(u){return {air:!!u.air,water:!!(u.air||u.def.hover||u.def.source.JumpEnabled),layout:u.layout};}
class Navigator{
 constructor(){this.signature='';this.obstacles=[];this.solids=[];this.revision=0;this.sampleTime=-1;this.searches=0;}
 refresh(b){if(this.sampleTime===b.time)return;this.sampleTime=b.time;const structures=[];for(const collection of [b.towers,b.units])for(const u of collection)if(u.building&&!u.effectCarrier&&!u.attachedTo&&b.isPresent(u))structures.push(u);const signature=structures.map(u=>u.id+':'+u.x+':'+u.y).join('|');this.solids=structures;if(signature!==this.signature){this.signature=signature;this.revision++;this.obstacles=structures.map(u=>({id:u.id,x:u.x/b.constructor.SX,y:u.y/b.constructor.SY,radius:u.def.radiusTiles}));}}
 next(b,u,t,intent=null){this.refresh(b);const SX=b.constructor.SX,SY=b.constructor.SY,start={x:u.x/SX,y:u.y/SY},target={x:t.x/SX,y:t.y/SY,radius:t.def?.radiusTiles||0},r=u.def.radiusTiles,free=travelPermission(u),reach=u.def.range+r+target.radius;
  const obstacles=u.building?this.obstacles.filter(o=>o.id!==u.id):this.obstacles;const d=length(start,target);if(d<=reach-EPS)return null;
  if(!pointClear(start,r,obstacles,free)){let recovery=u.navRecovery;if(!recovery||!recovery.point||recovery.revision!==this.revision||!pointClear(recovery.point,r,obstacles,free))recovery=u.navRecovery={revision:this.revision,point:nearestClearPoint(start,r,obstacles,free,{x:0,y:u.team?1:-1})};u.navPath=null;return recovery.point;}u.navRecovery=null;
  // Lane preference selects the Crown in targetDecision; it is not a mandatory
  // horizontal/vertical track. Approach that same target on a clear diagonal.
  // This also avoids an artificial corner when it enters local sight. Ground
  // bodies still use the swept, radius-aware route below for terrain/buildings.
  const stop=Math.max(r+target.radius+.04,reach-.015),direct={x:target.x+(start.x-target.x)*stop/d,y:target.y+(start.y-target.y)*stop/d};
  if(segmentClear(start,direct,r,obstacles,free)){u.navPath=null;return direct;}
  let state=u.navPath;if(!state||state.revision!==this.revision||state.targetId!==t.id||length(target,state.target)>.8||b.time>=state.expires){this.searches++;state=u.navPath={revision:this.revision,targetId:t.id,target,expires:t.building?Infinity:b.time+.65,path:route(start,target,r,reach,obstacles,free)};if(!state.path.length)state.expires=b.time+.25;}
  // A bridge approach can have zero spare clearance. Being 0.04 tiles
  // from a corner is NOT equivalent to reaching it: only skip it if the
  // complete next segment remains clear from the actor's real position.
  while(state.path.length&&length(start,state.path[0])<.04){if(state.path.length>1&&!segmentClear(start,state.path[1],r,obstacles,free))break;state.path.shift();}if(!state.path.length){state.expires=Math.min(state.expires,b.time+.25);return null;}return state.path[0];
 }
 allows(b,u,p){this.refresh(b);return pointClear({x:p.x/b.constructor.SX,y:p.y/b.constructor.SY},u.def.radiusTiles,u.building?this.obstacles.filter(o=>o.id!==u.id):this.obstacles,travelPermission(u));}
}
return {nearestClearPoint,Navigator,pointClear,segmentClear,route,waterClear};});

;
/* Shared, reward-trained linear action-value model with a tactical prior.
   Online TD(lambda) updates are real parameter updates, not a difficulty timer.
   This is not a neural network, and learning is not a guarantee of improvement. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog);if(n)module.exports=api;else root.RoyaleLearning=api;})(globalThis,function(K){'use strict';
const VERSION=1,ENGINE='0.14.0',WEIGHT_LIMIT=4,GAMMA=.985,LAMBDA=.94,ALPHA=.06;
const CATEGORIES=['wait','defend','support','counterpush','pressure','build','finish','spell'];
const CONTEXT_NAMES=['air-threat','swarm','tank','structure','danger','allied-tank','low-elixir','late','tower-weak','allied-push','2v2','near-tower'];
const FEATURE_NAMES=['bias','cost','reserve','elixir','time','double','own-board','enemy-board','own-hp','enemy-hp','left-lane','front','danger','anti-air','splash','tank','building','spell','endgame','2v2',...CATEGORIES.map(x=>'action:'+x),...K.CARDS.map(c=>'card:'+c.id),...CATEGORIES.flatMap(a=>CONTEXT_NAMES.map(c=>'action:'+a+'@'+c)),...K.CARDS.flatMap(a=>CONTEXT_NAMES.map(c=>'card:'+a.id+'@'+c))];
const DIM=FEATURE_NAMES.length,finite=(x,d=0)=>Number.isFinite(x)?x:d,clamp=K.clamp;
const num=(x,max=1e12)=>clamp(Math.floor(finite(x)),0,max);
function normalizeModel(raw){const p=raw&&raw.schema===VERSION&&raw.snapshot===K.DATA.snapshot?raw:{};
 return {schema:VERSION,snapshot:K.DATA.snapshot,engine:ENGINE,weights:Array.from({length:DIM},(_,i)=>clamp(finite(p.weights?.[i]),-WEIGHT_LIMIT,WEIGHT_LIMIT)),updates:num(p.updates),matches:num(p.matches),recorded:num(p.recorded),quarantined:num(p.quarantined),abandoned:num(p.abandoned),reward:clamp(finite(p.reward),-1e12,1e12),revision:num(p.revision),actionStats:p.actionStats&&typeof p.actionStats==='object'?Object.fromEntries(Object.entries(p.actionStats).filter(([k,v])=>typeof k==='string'&&k.length<=100&&v&&Number.isFinite(v.count)&&Number.isFinite(v.sum)).slice(-12000).map(([k,v])=>[k,{count:num(v.count,1000000),sum:clamp(finite(v.sum),-1e7,1e7)}])):{},seen:Array.isArray(p.seen)?p.seen.filter(s=>typeof s==='string'&&s.length<=140).slice(-20000):[],recent:Array.isArray(p.recent)?p.recent.filter(r=>r&&typeof r.id==='string').slice(-40).map(r=>({id:r.id.slice(0,140),mode:String(r.mode||'Default').slice(0,40),status:String(r.status||'completed').slice(0,20),winner:[-1,0,1].includes(r.winner)?r.winner:null,duration:num(r.duration,650),updates:num(r.updates),reward:finite(r.reward)})):[]};
}
function features(v,a){const f=new Array(DIM).fill(0),c=K.CARD_BY_ID[a?.card],cost=a?.cost??c?.cost??0,category=a?(a.reason||'').split(':')[0]:'wait',entity=c?.entity?K.entityDef(c.entity,c.level||9):null,own=v.own||[],enemies=v.enemies||[],towers=v.towers||[];
 const ours=towers.filter(t=>t.team===v.team),theirs=towers.filter(t=>t.team!==v.team),front=y=>v.team?y:640-y;
 const hp=xs=>xs.reduce((n,u)=>n+u.hp/Math.max(1,u.maxHp),0)/Math.max(1,xs.length);
 const vals=[1,cost/10,(v.elixir-cost)/(v.maxElixir||10),v.elixir/(v.maxElixir||10),Math.min(1,v.time/300),Math.min(1,(v.multiplier-1)/2),Math.min(1,own.length/15),Math.min(1,enemies.length/15),hp(ours),hp(theirs),a?(a.x<240?1:-1):0,a?front(a.y)/640:0,Math.min(1,enemies.filter(u=>front(u.y)<300).length/6),entity?.targetsAir?1:0,entity?.splash>0?1:0,entity?.buildingsOnly?1:0,c?.building?1:0,c?.spell?1:0,v.secondsLeft<45?1:0,v.seatCount===4?1:0];
 vals.forEach((x,i)=>f[i]=clamp(finite(x),-1,1));const cat=Math.max(0,CATEGORIES.indexOf(category)),cardIndex=c?K.CARDS.findIndex(x=>x.id===c.id):-1;f[20+cat]=1;if(c)f[20+CATEGORIES.length+cardIndex]=1;
 // State-action interactions are essential: a common state offset alone cannot
 // learn different counters for an air rush, a swarm, and an empty battlefield.
 const contexts=[enemies.filter(u=>u.air).length/4,enemies.length/8,Math.max(0,...enemies.map(u=>u.hp))/2500,enemies.filter(u=>u.building).length/2,enemies.filter(u=>front(u.y)<300).length/5,own.filter(u=>u.hp>1400&&front(u.y)>180).length/2,1-v.elixir/(v.maxElixir||10),v.secondsLeft<45?1:0,1-hp(theirs),own.filter(u=>front(u.y)>300).length/5,v.seatCount===4?1:0,Math.max(0,...enemies.map(u=>Math.max(0,...ours.map(t=>1-Math.hypot((u.x-t.x)/K.SX,(u.y-t.y)/K.SY)/8))))].map(x=>clamp(finite(x),0,1));
 const start=20+CATEGORIES.length+K.CARDS.length;for(let i=0;i<contexts.length;i++){f[start+cat*CONTEXT_NAMES.length+i]=contexts[i];if(c)f[start+CATEGORIES.length*CONTEXT_NAMES.length+cardIndex*CONTEXT_NAMES.length+i]=contexts[i];}return f;
}

function experienceKey(v,a,specific=true){
 const c=K.CARD_BY_ID[a?.card],category=a?(a.reason||'').split(':')[0]:'wait',enemies=v.enemies||[],own=v.own||[],front=y=>v.team?y:640-y;
 const air=enemies.some(u=>u.air)?1:0,swarm=enemies.length>=4?1:0,tank=enemies.some(u=>u.hp>1700)?1:0,danger=enemies.some(u=>front(u.y)<250)?1:0,push=own.some(u=>front(u.y)>360&&u.hp>800)?1:0,late=v.secondsLeft<50?1:0,lane=a?(v.mode==='BridgeBattle'?'C':v.mode==='TeamRumble'?String(Math.min(4,Math.floor(a.x/96))):v.mode==='Team3v3'?(a.x<160?'L':a.x<320?'C':'R'):(a.x<240?'L':'R')):'W';
 const modeKey=({TwelveCardDeck:'twelve',TwentyElixir:'twenty',OneShot:'oneshot',Team3v3:'3v3',TeamRumble:'5v5',BridgeBattle:'bridge',FourCardDeck:'four',RandomDeck:'random',DoubleElixir:'double',TripleElixir:'triple',RampUp:'ramp',SuddenDeath:'sudden','7xElixir':'7x',ClanWar_BoatBattle:'boat'})[v.mode]||'',teamKey=modeKey|| (v.seatCount===4?'2':'1');
 const threat=[...enemies].sort((a,b)=>front(a.y)-front(b.y)||b.hp-a.hp)[0],threatId=String(threat?.card||threat?.entity||'none').slice(0,28),elixirBand=Math.max(0,Math.min(5,Math.floor(finite(v.elixir)/2)));
 const broad=`${c?.id||'wait'}|${category}|${danger}${push}${late}|${teamKey}|${lane}`;
 const specificState=`${c?.id||'wait'}|${category}|${air}${swarm}${tank}${danger}${push}${late}|${teamKey}|${lane}`;
 return specific?`${specificState}|${threatId}|e${elixirBand}`:broad;
}

function rewardDelta(before,after,terminal=0){const d=k=>finite(after?.[k])-finite(before?.[k]),loss=k=>Math.min(0,d(k));const terms={tower:5*(d('towerFor')-d('towerAgainst')),trade:.16*(d('dealt')-d('taken')),board:.28*(loss('boardFor')-loss('boardAgainst')),crowns:.8*(d('crownsFor')-d('crownsAgainst')),spending:-.008*d('spent'),leaking:-.05*d('leaked'),terminal};return {...terms,total:clamp(Object.values(terms).reduce((a,b)=>a+b,0),-8,8)};}
class SharedBrain{
 constructor(raw){this.state=normalizeModel(raw);}
 export(){return JSON.parse(JSON.stringify(this.state));}
 predict(f){return clamp(f.reduce((v,x,i)=>v+finite(x)*this.state.weights[i],0),-6,6);}
 experience(key){const s=this.state.actionStats[key];if(!s?.count)return 0;const mean=s.sum/s.count,confidence=Math.min(1,Math.log2(1+s.count)/6);return clamp(mean*confidence,-2.2,2.2);}
 learnExperience(key,reward){if(!key)return;const s=this.state.actionStats[key]||(this.state.actionStats[key]={count:0,sum:0});s.count=Math.min(1000000,s.count+1);s.sum=clamp(s.sum+clamp(finite(reward),-8,8),-1e7,1e7);if(Object.keys(this.state.actionStats).length>12000){const entries=Object.entries(this.state.actionStats).sort((a,b)=>a[1].count-b[1].count).slice(0,1000);for(const [k] of entries)delete this.state.actionStats[k];}}
 update(f,reward,next,trace,seconds=1){if(!Array.isArray(f)||f.length!==DIM)return 0;const gamma=Math.pow(GAMMA,clamp(finite(seconds,1),.05,300)),td=clamp(finite(reward)+gamma*(next?this.predict(next):0)-this.predict(f),-6,6),norm=1+f.reduce((n,x)=>n+x*x,0),decay=Math.pow(GAMMA*LAMBDA,clamp(finite(seconds,1),.05,300));
  for(let i=0;i<DIM;i++){trace[i]=clamp(finite(trace[i])*decay+finite(f[i]),-6,6);this.state.weights[i]=clamp(this.state.weights[i]+ALPHA*td*trace[i]/norm,-WEIGHT_LIMIT,WEIGHT_LIMIT);}
  this.state.updates++;this.state.reward+=clamp(finite(reward),-8,8);return td;
 }
 delta(from){const base=from?.actionStats||{},experience={};for(const [k,v] of Object.entries(this.state.actionStats)){const b=base[k]||{count:0,sum:0},count=v.count-b.count,sum=v.sum-b.sum;if(count||Math.abs(sum)>1e-9)experience[k]={count,sum};}return {weights:this.state.weights.map((w,i)=>w-finite(from?.weights?.[i])),updates:Math.max(0,this.state.updates-num(from?.updates)),reward:this.state.reward-finite(from?.reward),experience};}
}
class Controller{
 constructor(brain,seat,{training=true,seed=1,record=()=>{}}={}){this.brain=brain;this.seat=seat;this.training=training;this.seed=seed>>>0||1;this.trace=new Float64Array(DIM);this.previous=null;this.record=record;this.closed=false;this.decisions=0;this.lastDecision=-100;}
 random(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 select(v,candidates,baseline,frame){
  const unique=[],seen=new Set();for(const a of candidates||[]){const key=a.card+':'+Math.round(a.x/30)+':'+Math.round(a.y/30);if(a.score<2||seen.has(key))continue;seen.add(key);unique.push(a);if(unique.length>=24)break;}
  const pool=[{action:null,prior:2.6,feature:features(v,null),key:experienceKey(v,null,true),genericKey:experienceKey(v,null,false)},...unique.map(a=>({action:a,prior:a.score,feature:features(v,a),key:experienceKey(v,a,true),genericKey:experienceKey(v,a,false)}))];
  const learnedExperience=p=>this.brain.experience(p.key)+.45*this.brain.experience(p.genericKey);
  const waitValue=this.brain.predict(pool[0].feature),waitExperience=learnedExperience(pool[0]);for(const p of pool){p.value=this.brain.predict(p.feature);p.experience=learnedExperience(p);p.score=p.prior+clamp(p.value-waitValue,-3,3)+clamp(p.experience-waitExperience,-2,2);}
  pool.sort((a,b)=>b.score-a.score);let choice=pool[0];
  // Never let exploration throw away an immediate forced win or emergency.
  if(baseline?.score>=24)choice=pool.find(p=>p.action===baseline)||choice;
  else if(this.training&&this.random()<.035){const safe=pool.filter(p=>p.prior>=Math.max(2.6,(baseline?.score||2.6)-1.3)&&p.score>=choice.score-1.6);if(safe.length)choice=safe[Math.floor(this.random()*safe.length)];}
  if(this.previous){const r=rewardDelta(this.previous.frame,frame),dt=v.time-this.previous.time;let error=0;if(this.training){error=this.brain.update(this.previous.feature,r.total,choice.feature,this.trace,dt);this.brain.learnExperience(this.previous.key,r.total);if(this.previous.genericKey&&this.previous.genericKey!==this.previous.key)this.brain.learnExperience(this.previous.genericKey,r.total*.5);}this.record({type:'learning',seat:this.seat,team:v.team,time:v.time,action:this.previous.action?.card||'wait',reason:this.previous.action?.reason||'wait',reward:r,td:error,q:this.brain.predict(this.previous.feature),features:this.previous.feature.map((x,i)=>x?[i,Number(x.toFixed(5))]:null).filter(Boolean),trained:this.training});}
  this.previous={feature:choice.feature,key:choice.key,genericKey:choice.genericKey,frame:{...frame},time:v.time,action:choice.action};this.decisions++;this.lastDecision=v.time;
  return choice.action?{...choice.action,priorScore:choice.prior,learnedValue:choice.value,score:choice.score}:null;
 }
 finish(frame,winner,time){if(this.closed)return;this.closed=true;if(!this.previous)return;const terminal=winner===null||winner===-1?0:winner===(this.seat%2)?4:-4,r=rewardDelta(this.previous.frame,frame,terminal);let error=0;if(this.training){error=this.brain.update(this.previous.feature,r.total,null,this.trace,time-this.previous.time);this.brain.learnExperience(this.previous.key,r.total);if(this.previous.genericKey&&this.previous.genericKey!==this.previous.key)this.brain.learnExperience(this.previous.genericKey,r.total*.5);}this.record({type:'learning',seat:this.seat,team:this.seat%2,time,action:this.previous.action?.card||'wait',reason:this.previous.action?.reason||'wait',reward:r,td:error,terminal:true,trained:this.training});}
}
class MatchRecorder{
 constructor(b){this.b=b;this.compact=b.compactRecording===true;this.eventCounts={};this.seatPlacements=b.seats.map(()=>0);this.commands=[];this.events=[];this.transitions=[];this.snapshots=[];this.dropped=0;this.nextSample=0;this.closed=false;this.status='running';this.initial=b.brain?.export()||new SharedBrain().export();this.started=new Date().toISOString();}
 event(event){if(this.closed)return;this.eventCounts[event.type]=(this.eventCounts[event.type]||0)+1;
  const e=this.compact?{...event}:JSON.parse(JSON.stringify(event));if(this.compact)delete e.features;
  if(e.type==='deploy'){this.commands.push(e);const seat=e.seat??e.owner;if(this.seatPlacements[seat]!==undefined)this.seatPlacements[seat]++;if(this.compact&&this.commands.length>64){this.commands.shift();this.dropped++;}}
  if(e.type==='learning'){this.transitions.push(e);if(this.transitions.length>(this.compact?32:3000)){this.transitions.shift();this.dropped++;}}
  else if(!this.compact){this.events.push(e);if(this.events.length>12000){this.events.shift();this.dropped++;}}
 }
 tick(){const b=this.b;if(b.time+1e-7<this.nextSample)return;this.nextSample=b.time+(this.compact?60:2);this.snapshots.push({time:Number(b.time.toFixed(3)),crowns:[...b.crowns],units:this.compact?[]:b.active.filter(u=>!u.attachedTo).slice(0,256).map(u=>[u.id,u.entity,u.team,u.owner,Number(u.x.toFixed(1)),Number(u.y.toFixed(1)),Math.ceil(u.hp),Math.ceil(u.shield),Number(u.wait.toFixed(2)),u.targetId||0]),elixir:b.elixir.map(x=>Number(x.toFixed(2)))});if(this.snapshots.length>(this.compact?2:180)){this.snapshots.shift();this.dropped++;}}
 end(status='completed'){if(this.closed)return;this.tick();this.closed=true;this.status=status;}
 finish(){const b=this.b;return {recording:this.compact?'compact':'full',eventCounts:{...this.eventCounts},seatPlacements:[...this.seatPlacements],schema:VERSION,engine:ENGINE,snapshot:K.DATA.snapshot,id:b.id,started:this.started,ended:new Date().toISOString(),status:this.status,mode:b.mode,seatCount:b.seatCount,seed:b.seed,initialDecks:b.initialDecks.map(d=>[...d]),levels:{...b.levels},kingLevel:b.kingLevel,quarantined:Object.values(b.cheats).some(Boolean),trainingEnabled:b.learningEnabled!==false,result:b.result?{...b.result}:null,terminalReward:b.result?(b.result.winner===0?4:b.result.winner===1?-4:0):0,duration:Number(b.time.toFixed(3)),metrics:JSON.parse(JSON.stringify(b.metrics)),commands:this.commands.slice(),events:this.events.slice(),transitions:this.transitions.slice(),snapshots:this.snapshots.slice(),dropped:this.dropped,policyUpdates:b.brain?b.brain.state.updates-this.initial.updates:0};}
 packet(){return {record:this.finish(),delta:this.b.brain?this.b.brain.delta(this.initial):{weights:new Array(DIM).fill(0),updates:0,reward:0}};}
}
function mergePacket(raw,packet){const model=normalizeModel(raw),r=packet?.record,d=packet?.delta;if(!r||typeof r.id!=='string'||r.id.length>140||r.snapshot!==K.DATA.snapshot||!d||!Array.isArray(d.weights)||d.weights.length!==DIM)throw Error('Incompatible learning record');if(model.seen.includes(r.id))return model;
 const allowed=!r.quarantined&&r.trainingEnabled!==false;const updates=allowed?num(d.updates,100000):0;
 if(allowed){for(let i=0;i<DIM;i++)model.weights[i]=clamp(model.weights[i]+clamp(finite(d.weights[i]),-WEIGHT_LIMIT*2,WEIGHT_LIMIT*2),-WEIGHT_LIMIT,WEIGHT_LIMIT);for(const [k,v] of Object.entries(d.experience||{})){if(typeof k!=='string'||k.length>100||!v)continue;const s=model.actionStats[k]||(model.actionStats[k]={count:0,sum:0});s.count=Math.min(1000000,s.count+num(v.count,1000000));s.sum=clamp(s.sum+finite(v.sum),-1e7,1e7);}model.updates+=updates;model.reward+=clamp(finite(d.reward),-100000,100000);}
 model.recorded++;if(r.status==='abandoned')model.abandoned++;else model.matches++;if(r.quarantined)model.quarantined++;model.revision++;model.seen.push(r.id);model.seen=model.seen.slice(-20000);model.recent.push({id:r.id,mode:r.mode,status:r.status||'completed',winner:r.result?.winner??null,duration:Math.round(r.duration||0),updates,reward:allowed?finite(d.reward):0});model.recent=model.recent.slice(-40);return model;
}
return {VERSION,ENGINE,WEIGHT_LIMIT,FEATURE_NAMES,DIM,normalizeModel,features,experienceKey,rewardDelta,SharedBrain,Controller,MatchRecorder,mergePacket};});

;
/* Offline base-card lineups inspected on 2026-10-01. Source seeds make no
 * claim about current strength, win rates or evolved mechanics. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleDeckSources=api;})(globalThis,function(){'use strict';
const observedAt='2026-10-01',statsURL='https://statsroyale.com/deckbuilder?sort=count&type=path-of-legends';
function royale(cards){return{provider:'RoyaleAPI',url:'https://royaleapi.com/decks/stats/'+[...cards].sort().join(',')+'?lang=en',observedAt};}
function stats(ids,url=statsURL){return{provider:'StatsRoyale',url,observedAt,copyDeck:'clashroyale://copyDeck?deck='+ids,note:'Published base-card lineup; evolution, hero and tower-troop modifiers are outside this historical engine.'};}
function seed(id,name,archetype,cards,core,evidence){cards=cards.split(' ');return Object.freeze({id,name,archetype,cards:Object.freeze(cards),core:Object.freeze(core.split(' ')),sources:Object.freeze((evidence||[royale(cards)]).map(Object.freeze))});}
const SEEDS=Object.freeze([
 seed('hog-26','Hog 2.6 Cycle','hog-cycle','hog-rider musketeer cannon ice-golem skeletons ice-spirit fireball the-log','hog-rider musketeer',[
  royale('hog-rider musketeer cannon ice-golem skeletons ice-spirit fireball the-log'.split(' ')),stats('26000010;26000014;27000000;26000021;26000038;26000030;28000011;28000000')]),
 seed('pekka-fireball','Pekka Bridge Spam Fireball','bridge-spam','bandit battle-ram electro-wizard magic-archer pekka fireball royal-ghost zap','pekka battle-ram'),
 seed('pekka-poison','Pekka Bridge Spam Poison','bridge-spam','bandit battle-ram electro-wizard magic-archer pekka poison royal-ghost zap','pekka battle-ram'),
 seed('golem-pump','Golem Night Witch Pump','golem-beatdown','baby-dragon elixir-collector golem lumberjack mega-minion night-witch tornado zap','golem night-witch'),
 seed('golem-zap','Golem Lightning Zap','golem-beatdown','baby-dragon golem lightning lumberjack mega-minion night-witch tornado zap','golem night-witch'),
 seed('golem-barrel','Golem Lightning Barrel','golem-beatdown','baby-dragon barbarian-barrel golem lightning lumberjack mega-minion night-witch tornado','golem night-witch'),
 seed('golem-tombstone','Golem Lightning Tombstone','golem-beatdown','baby-dragon golem lightning lumberjack mega-minion night-witch tombstone tornado','golem night-witch'),
 seed('log-bait','Classic Log Bait','barrel-bait','goblin-barrel goblin-gang ice-spirit inferno-tower knight princess rocket the-log','goblin-barrel princess'),
 seed('xbow-29','X-Bow 2.9 Cycle','siege-cycle','archers fireball ice-golem ice-spirit skeletons tesla the-log x-bow','x-bow tesla'),
 seed('xbow-30','X-Bow 3.0 Cycle','siege-cycle','archers fireball ice-spirit knight skeletons tesla the-log x-bow','x-bow tesla'),
 seed('ice-bow','Ice Bow Tornado','siege-control','ice-wizard knight rocket skeletons tesla the-log tornado x-bow','x-bow ice-wizard tornado'),
 seed('lavaloon-lightning','LavaLoon Guards Lightning','lava-beatdown','arrows balloon guards lava-hound lightning mega-minion minions tombstone','lava-hound balloon'),
 seed('lavaloon-barbarians','LavaLoon Barbarians Fireball','lava-beatdown','balloon barbarians fireball lava-hound mega-minion minions tombstone zap','lava-hound balloon'),
 seed('lavaloon-dark-prince','LavaLoon Dark Prince Dragons','lava-beatdown','balloon dark-prince fireball lava-hound mega-minion skeleton-dragons tombstone zap','lava-hound balloon'),
 seed('giant-double-prince','Giant Double Prince Miner','giant-beatdown','arrows dark-prince electro-wizard giant mega-minion miner prince zap','giant prince dark-prince'),
 seed('splashyard','Graveyard Ice Wizard Baby Dragon','graveyard-control','baby-dragon barbarian-barrel graveyard ice-wizard knight poison tombstone tornado','graveyard tornado',[
  royale('baby-dragon barbarian-barrel graveyard ice-wizard knight poison tombstone tornado'.split(' ')),stats('26000015;26000023;27000009;26000000;28000015;28000012;28000009;28000010')]),
 seed('stats-cannon-barrel-wb','StatsRoyale Cannon Barrel Wall Breakers','barrel-bait','skeleton-army valkyrie goblin-barrel princess dart-goblin cannon wall-breakers ice-spirit','goblin-barrel wall-breakers',[
  stats('26000012;26000011;28000004;26000026;26000040;27000000;26000058;26000030')]),
 seed('stats-inferno-bait','StatsRoyale Inferno Barrel Dart Goblin','barrel-bait','skeleton-army knight goblin-barrel inferno-tower princess dart-goblin ice-spirit the-log','goblin-barrel princess',[
  stats('26000012;26000000;28000004;27000003;26000026;26000040;26000030;28000011')]),
 seed('stats-mortar-gang','StatsRoyale Mortar Cart Gang','mortar-bait','skeleton-barrel ice-wizard mortar rascals cannon-cart goblin-gang barbarian-barrel fireball','mortar skeleton-barrel',[
  stats('26000056;26000023;27000002;26000053;26000054;26000041;28000015;28000000')]),
 seed('stats-mortar-minions','StatsRoyale Mortar Cart Minions','mortar-bait','skeleton-barrel ice-wizard mortar rascals cannon-cart minions barbarian-barrel fireball','mortar skeleton-barrel',[
  stats('26000056;26000023;27000002;26000053;26000054;26000005;28000015;28000000')])
]);
return{SEEDS,observedAt};
});

;
/* Shared offline deck catalogue for world opponents, battles and self-play. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog,n?require('./progression.js'):root.RoyaleProgression,n?require('./deck-sources.js'):root.RoyaleDeckSources);if(n)module.exports=api;else root.RoyaleTrainingDecks=api;})(globalThis,function(K,R,S){'use strict';
const WIN_CONDITIONS=new Set(['hog-rider','royal-hogs','battle-ram','ram-rider','balloon','giant','goblin-giant','golem','elixir-golem','lava-hound','royal-giant','wall-breakers','goblin-barrel','graveyard','miner','x-bow','mortar','electro-giant']);
const SEEDS=S.SEEDS,FOUNDATIONS=Object.freeze([Object.freeze({id:'starter-giant',name:'Starter Giant Support',archetype:'giant-beatdown',cards:Object.freeze([...K.DEFAULT_DECK]),core:Object.freeze(['giant','musketeer']),sources:Object.freeze([])})]);
const GROUPS={
 smallSpell:['zap','the-log','barbarian-barrel','giant-snowball','arrows','royal-delivery'],
 damageSpell:['fireball','poison','earthquake','lightning','rocket'],
 utility:['tornado','freeze'],
 cycle:['skeletons','goblins','spear-goblins','bats','ice-spirit','electro-spirit','heal-spirit','fire-spirits'],
 tank:['knight','ice-golem','valkyrie','dark-prince','bandit','royal-ghost','mini-pekka','lumberjack'],
 swarm:['skeleton-army','goblin-gang','guards','goblins','spear-goblins','bats','minions','barbarians'],
 air:['archers','musketeer','mega-minion','minions','flying-machine','dart-goblin','princess','hunter','electro-wizard','magic-archer','ice-wizard','baby-dragon','skeleton-dragons'],
 splash:['bomber','valkyrie','dark-prince','bowler','executioner','wizard','baby-dragon'],
 building:['cannon','tesla','tombstone','goblin-cage','bomb-tower','inferno-tower','furnace'],
 support:['night-witch','witch','battle-healer','electro-dragon','baby-dragon','cannon-cart','rascals','inferno-dragon','mega-minion']
};
const ROLE=Object.fromEntries(Object.entries(GROUPS).flatMap(([role,ids])=>ids.map(id=>[id,role])));
for(const id of GROUPS.cycle)ROLE[id]='cycle';for(const id of GROUPS.smallSpell)ROLE[id]='smallSpell';
for(const id of ['knight','ice-golem','bandit','royal-ghost','mini-pekka','lumberjack'])ROLE[id]='tank';
for(const id of ['skeleton-army','goblin-gang','guards','barbarians'])ROLE[id]='swarm';
for(const id of ['archers','musketeer','mega-minion','minions','flying-machine','dart-goblin','princess','hunter','electro-wizard','magic-archer','ice-wizard','skeleton-dragons'])ROLE[id]='air';
const minArena=Object.fromEntries(K.CARDS.map(c=>[c.id,K.DEFAULT_DECK.includes(c.id)?0:R.cardArenaNumber(c,K.DATA.arenas)]));
const air=id=>{const c=K.CARD_BY_ID[id];return !!(c.entity&&K.entityDef(c.entity,9).targetsAir);};
const signature=cards=>[...cards].sort().join(',');
function rng(seed){let x=(seed>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function hash(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function arenaLimit(value=14){return Math.max(1,Math.min(14,Math.floor(Number(value)||14)));}
function shuffle(cards,random){const out=[...cards];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function coherent(cards){if(!K.validDeck(cards)||!cards.some(id=>WIN_CONDITIONS.has(id))||!cards.some(id=>K.CARD_BY_ID[id].kind==='Spell')||!cards.some(air))return false;const average=cards.reduce((n,id)=>n+K.CARD_BY_ID[id].cost,0)/8;return average>=2.1&&average<=5.2;}
let all=null;const arenaPools=new Map();
function makeRecord(seed,cards,sourceType,index){return Object.freeze({id:sourceType==='genuine'?seed.id:seed.id+'-v'+index,seedId:seed.id,name:seed.name,archetype:seed.archetype,sourceType,cards:Object.freeze([...cards]),minArena:Math.max(...cards.map(id=>minArena[id])),sources:seed.sources});}
function catalogue(arenaNumber=14){
 if(!all){
  const seen=new Set(),genuine=[];
  for(const seed of SEEDS){if(!coherent(seed.cards))throw Error('Invalid source deck '+seed.id);const key=signature(seed.cards);if(seen.has(key))continue;seen.add(key);genuine.push(makeRecord(seed,seed.cards,'genuine',0));}
  const families=[...SEEDS,...FOUNDATIONS],variants=families.map(seed=>{
   const result=[],random=rng(hash(seed.id)),mutable=seed.cards.map((id,i)=>({id,i})).filter(x=>!seed.core.includes(x.id)&&ROLE[x.id]);
   const target=seed.sources.length?512:1024;
   for(let attempt=0;attempt<60000&&result.length<target;attempt++){
    const cards=[...seed.cards],slots=shuffle(mutable,random).slice(0,1+Math.floor(random()*3));
    for(const {id,i}of slots){const pool=GROUPS[ROLE[id]];cards[i]=pool[Math.floor(random()*pool.length)];}
    const key=signature(cards);if(seen.has(key)||!coherent(cards))continue;seen.add(key);result.push(makeRecord(seed,cards,'generated',result.length+1));
   }
   return result;
  });
  const entries=[...genuine];
  // Interleave families so adjacent seeds meet different archetypes. Deduplicate
  // before shuffling: different opening-hand orders are not different decks.
  for(let i=0;i<Math.max(...variants.map(v=>v.length));i++)for(const family of variants)if(family[i])entries.push(family[i]);
  all=Object.freeze(entries);
 }
 const limit=arenaLimit(arenaNumber);if(!arenaPools.has(limit))arenaPools.set(limit,Object.freeze(all.filter(row=>row.minArena<=limit)));
 return arenaPools.get(limit);
}
function select(seed,arenaNumber=14){const pool=catalogue(arenaNumber);if(!pool.length)throw Error('No eligible opponent decks');return pool[(Number(seed)>>>0)%pool.length];}
function build(seed,arenaNumber=14){return shuffle(select(seed,arenaNumber).cards,rng((Number(seed)>>>0)^0x51ab12));}
function forMode(seed,arenaNumber=14,mode='Default'){
 const limit=arenaLimit(arenaNumber),size=K.modeDeckSize(mode),random=rng((Number(seed)>>>0)^0x72be1),base=build(seed,limit).filter(id=>K.allowedInMode(id,mode));
 if(size===8&&mode!=='OneShot')return base;
 const chosen=[],take=id=>{if(id&&!chosen.includes(id))chosen.push(id);};
 // Reduced cycles retain pressure, air defense and a spell. One Shot uses only
 // permitted troops/buildings and replenishes the removed spell slots.
 take(base.find(id=>WIN_CONDITIONS.has(id)));take(base.find(air));if(mode!=='OneShot')take(base.find(id=>K.CARD_BY_ID[id].kind==='Spell'));
 const eligible=K.CARDS.filter(c=>minArena[c.id]<=limit&&K.allowedInMode(c.id,mode)&&c.id!=='mirror').map(c=>c.id);
 if(!chosen.some(id=>WIN_CONDITIONS.has(id)))take(eligible.find(id=>WIN_CONDITIONS.has(id)));
 if(!chosen.some(air))take(eligible.find(air));
 if(mode==='OneShot')take(base.find(id=>K.CARD_BY_ID[id].entity&&K.entityDef(K.CARD_BY_ID[id].entity,9).splash>0));
 for(const id of base)if(chosen.length<size)take(id);
 for(const role of ['air','cycle','tank','building','splash'])if(chosen.length<size)take(shuffle(GROUPS[role].filter(id=>eligible.includes(id)&&!chosen.includes(id)),random)[0]);
 for(const id of shuffle(eligible,random))if(chosen.length<size)take(id);
 if(chosen.length<size)throw Error('Not enough eligible cards for '+mode+' at this arena');
 return shuffle(chosen.slice(0,size),random);
}
function stats(arenaNumber=14){const rows=catalogue(arenaNumber),genuine=rows.filter(row=>row.sourceType==='genuine').length;return{total:rows.length,genuine,generated:rows.length-genuine,archetypes:new Set(rows.map(row=>row.archetype)).size};}
return{WIN_CONDITIONS,SEEDS,FOUNDATIONS,catalogue,select,stats,build,randomDeck:build,forMode};
});

;
/* Cooperative headless concurrency. Active matches are state machines, not OS
   threads. A small worker pool time-slices them; 5000 is not a real-time promise. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleTraining=api;})(globalThis,function(){'use strict';
const MAX_GAMES=5000,MAX_WORKERS=8;
function plan(count=10,concurrent=1,hardware=4,options={}){if(!Number.isInteger(count)||count<1||count>MAX_GAMES||!Number.isInteger(concurrent)||concurrent<1||concurrent>count)throw RangeError('Choose 1–5000 matches and concurrency no greater than the match count');const threads=Math.max(1,Math.min(MAX_WORKERS,concurrent,Math.max(1,Math.floor(Number(hardware)||2)-1)));return{count,concurrent,threads,loop:options.loop===true,lanes:Array.from({length:threads},(_,i)=>({offset:i,stride:threads,count:Math.floor(count/threads)+(i<count%threads?1:0),concurrent:Math.floor(concurrent/threads)+(i<concurrent%threads?1:0)}))};}
class CooperativeScheduler{
 constructor({count,concurrent,create,advance,finish,clock=()=>performance.now()}){plan(count,concurrent,2);Object.assign(this,{count,concurrent,create,advance,finish,clock});this.active=[];this.created=0;this.completed=0;this.cursor=0;this.cancelled=false;this.peak=0;}
 get done(){return this.cancelled||this.completed>=this.count;}
 cancel(){this.cancelled=true;this.active.length=0;}
 status(){return{completed:this.completed,total:this.count,active:this.active.length,queued:this.count-this.created,peak:this.peak,cancelled:this.cancelled};}
 slice(budget=10){if(this.done)return this.status();const start=this.clock();let admitted=0,steps=0;
  while(this.active.length<Math.min(this.concurrent,this.count-this.completed)&&this.created<this.count){this.active.push(this.create(this.created++));this.peak=Math.max(this.peak,this.active.length);admitted++;if(admitted>=32||this.clock()-start>=budget)return this.status();}
  while(this.active.length&&this.clock()-start<budget&&steps++<512&&!this.cancelled){this.cursor%=this.active.length;const instance=this.active[this.cursor];if(this.advance(instance)){this.finish(instance);this.completed++;this.active.splice(this.cursor,1);if(this.created<this.count){this.active.push(this.create(this.created++));this.peak=Math.max(this.peak,this.active.length);}}else this.cursor++;}
  return this.status();
 }
}
class WorkerPool{
 constructor({Worker,info,baseURI,count,concurrent,hardware,model,mode,seed,onmessage=()=>{},onerror=()=>{}}){this.plan=plan(count,concurrent,hardware);this.workers=[];this.states=this.plan.lanes.map(l=>({completed:0,total:l.count,active:0,queued:l.count}));this.doneLanes=new Set();this.onmessage=onmessage;this.onerror=onerror;this.stopped=false;this.cancelled=false;this.config={info,baseURI,model,mode,seed};this.Worker=Worker;}
 start(){const c=this.config,id='train-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);try{this.plan.lanes.forEach((lane,index)=>{const worker=new this.Worker(new URL(c.info.worker,c.baseURI));this.workers.push(worker);worker.onmessage=e=>{if(this.stopped)return;const m=e.data||{};
   if(m.type==='progress'||m.type==='match'){this.states[index]={...this.states[index],...Object.fromEntries(['completed','active','queued','matchSeconds','updates'].filter(k=>m[k]!==undefined).map(k=>[k,m[k]]))};const s=this.status();this.onmessage({data:{...m,...s,worker:index}});}
   else if(m.type==='done'){this.states[index]={...this.states[index],completed:m.completed,active:0,queued:0};this.doneLanes.add(index);worker.terminate();if(this.doneLanes.size===this.workers.length){const s=this.status();this.onmessage({data:{type:'done',...s,cancelled:this.cancelled||m.cancelled}});this.stopped=true;}}
   else if(m.type==='error'){this.cancelled=true;this.terminate();this.onmessage({data:{type:'error',...this.status(),message:m.message}});}
  };worker.onerror=e=>{this.terminate();this.onerror(e);};worker.postMessage({type:'start',...lane,concurrency:lane.concurrent,count:lane.count,batch:id,lane:index,seed:c.seed,model:c.model,mode:c.mode,game:new URL(c.info.game,c.baseURI).href,engine:new URL(c.info.engine,c.baseURI).href});});}catch(e){this.terminate();throw e;}return this;}
 status(){return{completed:this.states.reduce((n,s)=>n+s.completed,0),total:this.plan.count,active:this.states.reduce((n,s)=>n+(s.active||0),0),queued:this.states.reduce((n,s)=>n+(s.queued||0),0),workers:this.plan.threads,concurrent:this.plan.concurrent};}
 postMessage(m){if(m.type==='cancel')this.cancelled=true;for(const w of this.workers)w.postMessage(m);}
 terminate(){this.stopped=true;for(const w of this.workers)w.terminate();}
}
return{MAX_GAMES,MAX_WORKERS,plan,CooperativeScheduler,WorkerPool};});

;
/* Tactical candidate generator with an optional reward-trained value policy.
 * The observation boundary deliberately excludes the opposing hand, queue,
 * exact elixir, unrevealed units, random generator and account data.
 */
(function(root,factory){
 const K=typeof module==='object'&&module.exports?require('./catalog.js'):root.RoyaleCatalog;
 const api=factory(K);if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleAI=api;
})(globalThis,function(K){'use strict';
const {SX,SY,clamp,cardAt,entityDef,DATA}=K;
const distance=(a,b)=>Math.hypot((a.x-b.x)/SX,(a.y-b.y)/SY);
const unitCard=Object.fromEntries(K.CARDS.filter(c=>c.entity).map(c=>[c.entity,c.id]));
const SETTINGS={normal:{reaction:.85,reserve:2.5},hard:{reaction:.6,reserve:2.5},expert:{reaction:.42,reserve:2.5}};
const WIN=new Set(['hog-rider','royal-hogs','battle-ram','ram-rider','balloon','giant','goblin-giant','golem','elixir-golem','lava-hound','royal-giant','wall-breakers','goblin-barrel','graveyard','miner','x-bow','mortar']);
const SWARM_COUNTER=new Set(['arrows','the-log','barbarian-barrel','zap','giant-snowball']);
const point=(x,y)=>({x:x*SX,y:y*SY});
function publicUnit(u){return {id:u.id,entity:u.entity,card:K.CARD_BY_ID[u.card]?u.card:unitCard[u.entity],team:u.team,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,shield:u.shield||0,air:!!u.air,building:!!u.building,king:u.king,active:!!u.active,wait:u.wait||0,born:u.born,level:u.level,heading:u.heading,attacking:u.visualState==='attack',targetId:u.targetId,charged:!!u.charged,cloned:!!u.cloned,def:u.def};}
function observe(b,seat){
 const team=b.teamOf?b.teamOf(seat):seat;
 const own=b.units.filter(u=>u.team===team&&u.hp>0&&!u.dead&&(!b.isPresent||b.isPresent(u))&&!u.attachedTo);
 const enemies=b.units.filter(u=>u.team!==team&&u.hp>0&&!u.dead&&(!b.isPresent||b.isPresent(u))&&!u.attachedTo&&!u.hidden&&!u.invisible);
 const hand=b.hand[seat].map((id,slot)=>{const c=b.card(seat,slot);let real=c?.mirrorCard?{...cardAt(c.mirrorCard,Math.min(14,c.level+1)),cost:c.cost,mirror:true}:c;return {slot,card:real,ready:b.slotReady[seat][slot]<=b.time,available:!!c&&!(id==='mirror'&&!c.mirrorCard)};});
 const allyPlans=(b.seats||[0,1]).filter(s=>s!==seat&&(s%2)===team).map(s=>{const i=b.bots?.[s]?.intent;return i&&i.at>=b.time?{...i.action,seat:s,at:i.at}:null;}).filter(Boolean);
 return {team,seat,allyPlans,enemyRegen:Object.fromEntries((b.seats||[0,1]).filter(s=>s%2!==team).map(s=>[s,b.passiveElixirEnabled?.(s)===false?0:10/(b.timeline.ElixirFullBarMS?.[b.phase]/1000||28)])),maxElixir:b.maxElixir||10,mode:b.mode,layout:b.arenaLayout?.id,...(b.is5v5?{bounds:{left:b.arenaLayout.left,right:b.arenaLayout.right,top:b.arenaLayout.top,bottom:b.arenaLayout.bottom}}:{}),seatCount:b.seatCount||2,time:b.time,secondsLeft:b.secondsLeft,multiplier:b.multiplier,elixir:b.elixir[seat],startingElixir:b.timeline.StartingElixir??6,regen:b.passiveElixirEnabled?.(seat)===false?0:10/(b.timeline.ElixirFullBarMS?.[b.phase]/1000||28),crowns:[...b.crowns],hand,own:own.map(publicUnit),enemies:enemies.map(publicUnit),towers:b.towers.map(publicUnit),events:b.events.filter(e=>e.type==='deploy').map(e=>({...e})),areas:b.areas.map(a=>({...a})),legal:(slot,x,y)=>b.placement(team,b.card(seat,slot),x,y,seat).ok};
}
class TacticalBot{
 constructor({team=1,seat=team,difficulty='expert',seed=1}={}){
  this.team=team;this.seat=seat;this.difficulty=SETTINGS[difficulty]?difficulty:'expert';this.settings=SETTINGS[this.difficulty];this.seed=seed>>>0;
  this.memory={estimate:null,time:0,seen:{},opponents:{},cycle:[],lastEnemyPlay:-100,lane:[1,1]};this.eventCount=0;this.eventKeys=new Set();this.lastPlay=-100;this.decisions=[];
 }
 remember(v){const m=this.memory;if(m.estimate===null)m.estimate=v.startingElixir;
  const elapsed=Math.max(0,v.time-m.time),rates=Object.values(v.enemyRegen||{}),regen=rates.length?rates.reduce((a,b)=>a+b,0)/rates.length:v.regen;m.estimate=clamp(m.estimate+elapsed*regen,0,v.maxElixir||10);for(const k of Object.keys(m.opponents))m.opponents[k]=clamp(m.opponents[k]+elapsed*(v.enemyRegen?.[k]??regen),0,v.maxElixir||10);m.time=v.time;
  for(const e of v.events){if(e.team===v.team)continue;const key=`${e.seat??e.team}:${e.time}:${e.card}:${e.serial??''}`;if(this.eventKeys.has(key))continue;this.eventKeys.add(key);const c=K.CARD_BY_ID[e.card];const seat=e.seat??e.team;m.opponents[seat]=Math.max(0,(m.opponents[seat]??m.estimate)-(e.cost??c?.cost??0));m.estimate=Object.values(m.opponents).reduce((a,b)=>a+b,0)/Object.values(m.opponents).length;m.seen[e.card]=(m.seen[e.card]||0)+1;m.cycle.push(e.card);m.cycle=m.cycle.slice(-8);m.lastEnemyPlay=e.time;if(Number.isFinite(e.x))m.lane[e.x<240?0:1]++;}
  if(this.eventKeys.size>512)this.eventKeys=new Set([...this.eventKeys].slice(-300));
 }
 choose(v){
  this.lastCandidates=[];this.remember(v);if(v.time-this.lastPlay<this.settings.reaction)return null;
  // Transform only placement coordinates so the same policy works from either end.
  const front=y=>v.team?y:640-y,world=y=>v.team?y:640-y;
  const observed=v.enemies.filter(u=>v.time-u.born>=this.settings.reaction);
  const ours=v.towers.filter(t=>t.team===v.team&&t.hp>0),theirs=v.towers.filter(t=>t.team!==v.team&&t.hp>0);
  const primary=theirs.filter(t=>!t.king),targets=primary.length?primary:theirs;
  const weakest=[...targets].sort((a,b)=>a.hp-b.hp||a.x-b.x)[0];if(!weakest||!ours.length)return null;
  const dps=u=>(u.def.damage||0)/Math.max(.2,u.def.interval);
  const canHit=(a,u)=>u.air?a.targetsAir:a.targetsGround;
  const threatInfo=observed.filter(u=>!u.building&&front(u.y)<365).map(u=>{
   const tower=[...ours].sort((a,b)=>distance(a,u)-distance(b,u))[0];
   const d=Math.max(0,distance(tower,u)-tower.def.radiusTiles-u.def.radiusTiles-(u.def.range||0));
   const eta=u.attacking?0:d/Math.max(.4,u.def.speedTiles)+u.wait;
   const inRange=v.own.filter(a=>canHit(a.def,u)&&distance(a,u)<Math.max(5,a.def.range+3));
   const support=inRange.reduce((n,a)=>n+dps(a)*Math.min(1.2,a.hp/(Math.max(1,a.maxHp)*.5)),0);
   const towerDps=ours.filter(t=>(!t.king||t.active)&&distance(t,u)<t.def.range+u.def.radiusTiles+2).reduce((n,t)=>n+dps(t),0);
   const health=u.hp+u.shield,killTime=health/Math.max(1,support+towerDps);
   const pressure=Math.max(.2,(dps(u)*Math.min(health/Math.max(1,towerDps),6)/350)+(u.def.buildingsOnly?2.5:0));
   const urgency=clamp((14-eta)/8,.1,2.0);const covered=support>0&&killTime<Math.max(1.8,eta+1.2);
   return {u,tower,eta,pressure,urgency,covered,weight:pressure*urgency*(covered?.13:1)};
  }).sort((a,b)=>b.weight-a.weight);
  const threats=threatInfo.filter(t=>!t.covered),danger=threats.reduce((n,t)=>n+t.weight,0),main=threats[0];
  const entries=v.hand.filter(e=>e.available&&e.ready&&e.card&&e.card.cost<=v.elixir+1e-7);
  const candidates=[];
  const add=(e,p,score,reason)=>{if(!Number.isFinite(score)||score<=0)return;const radius=Math.max(.6,e.card.entity?K.entityDef(e.card.entity,e.card.level||9).radiusTiles||.6:.6),x=clamp(p.x,v.bounds?(v.bounds.left+radius+.05)*SX:v.layout==='BridgeBattle'?(6+radius)*SX:.75*SX,v.bounds?(v.bounds.right-radius-.05)*SX:v.layout==='BridgeBattle'?(12-radius)*SX:17.25*SX),y=clamp(p.y,v.bounds?(v.bounds.top+radius+.05)*SY:.8*SY,v.bounds?(v.bounds.bottom-radius-.05)*SY:31.2*SY);if(!v.legal(e.slot,x,y))return;for(const plan of v.allyPlans||[]){const ally=K.CARD_BY_ID[plan.card];if(ally&&distance(plan,{x,y})<Math.max(2,e.card.radiusTiles||0)){if(e.card.spell&&ally.spell&&e.card.damage>0&&ally.damage>0)score-=7;else if(e.card.building&&ally.building)score-=6;else if(reason.startsWith('defend')&&(plan.reason||'').startsWith('defend'))score-=3;}}if(score<=0)return;const tie=((e.slot*13+Math.round(x)+Math.round(y)+this.seed)%17)*.0001;candidates.push({slot:e.slot,x,y,score:score+tie,reason,card:e.card.id});};
  const positions=(e,points,score,reason)=>{for(let i=0;i<points.length;i++)add(e,points[i],score-i*.035,reason);};
  for(const e of entries){const c=e.card;
   if(c.spell){this.spells(v,e,observed,threatInfo,weakest,add);continue;}
   const d=entityDef(c.entity,c.level),count=c.count||1;
   if(c.source.CanDeployOnEnemySide){
    if(danger<3&&(v.elixir>=7||v.own.some(u=>front(u.y)>360&&u.hp/u.maxHp>.4))){positions(e,[{x:weakest.x+(weakest.x<240?-1:1)*SX*1.5,y:weakest.y+SY},{x:weakest.x,y:weakest.y+2*SY}],5.5,'pressure: tower distractor');}
   }
   for(const t of threats.slice(0,6)){
    const u=t.u;if(!canHit(d,u)&&!(!u.def.buildingsOnly&&!u.air&&c.cost<=3)&&!(d.building&&u.def.buildingsOnly))continue;
    if(d.buildingsOnly&&!d.building)continue; // Don't defend a tower with a Giant.
    const peers=observed.filter(z=>distance(z,u)<2.4),swarm=peers.length;
    let effectiveDps=d.damage/Math.max(.2,d.interval)*count;
    if(d.source.VariableDamage2)effectiveDps=Math.max(effectiveDps,180);
    if(d.splash>0)effectiveDps*=Math.min(4,1+(swarm-1)*.6);
    if(!d.splash&&swarm>3)effectiveDps*=Math.min(1,u.hp/Math.max(1,d.damage))+.12;
    if(!canHit(d,u))effectiveDps=0;
    const incoming=dps(u)*(u.def.splash>0?Math.min(count,3):1),endurance=(d.hp*count+d.shield*count)/Math.max(30,incoming);
    const timeToKill=(u.hp+u.shield)/Math.max(1,effectiveDps+dps(t.tower));
    let match=clamp(effectiveDps/105,0,6)+Math.min(2,endurance/3)+Math.min(3,6/Math.max(.4,timeToKill));
    if(d.building&&u.def.buildingsOnly)match+=4;
    if(d.air&&!u.def.targetsAir)match+=1.7;
    if(count>2&&u.def.splash>0)match-=4;
    if(count>2&&u.def.interval>1.5&&!u.def.splash)match+=2;
    if(d.splash>0&&swarm>=4)match+=4;
    if(d.range>=4&&t.eta<1&&u.hp>1000)match-=.8;
    const defenseAlready=v.own.filter(a=>distance(a,u)<4).length;
    let score=match+t.weight*1.4-c.cost*.85-defenseAlready*.55;
    if(t.eta<1.5)score+=2;if(d.building&&!d.damage&&!d.source.SpawnCharacter)score-=8;
    if(c.cost>v.elixir-1&&danger<2)score-=3;
    const uy=front(u.y)/SY,ux=u.x/SX,sgn=ux<9?1:-1;
    let points;
    if(d.building)points=[point(9-sgn*.8,world(11*SY)/SY),point(9+sgn*.7,world(10.5*SY)/SY),point(9-sgn*1.1,world(12.5*SY)/SY)];
    else if(d.range>=3){const yy=clamp(uy-(d.range-1),5.1,13.6);points=[point(clamp(ux+sgn*2.3,1,17),world(yy*SY)/SY),point(clamp(ux-sgn*1.7,1,17),world(yy*SY)/SY),point(ux,world((yy-1.2)*SY)/SY)];}
    else {const yy=clamp(uy-.5,5,14.2);points=[point(clamp(ux+sgn*.7,1,17),world(yy*SY)/SY),point(clamp(ux+sgn*2,1,17),world((yy-.5)*SY)/SY),point(clamp(ux-sgn*1.2,1,17),world(yy*SY)/SY)];}
    // Avoid giving an opposing area spell all our defenders at one location.
    for(const p of points){const clustering=v.own.filter(a=>!a.building&&distance(a,p)<1.5).length;add(e,p,score-clustering*1.5,'defend: '+u.entity);}
   }
   if(danger>5)continue;
   const alive=v.own.filter(u=>!u.building&&u.wait<1.6&&u.hp/u.maxHp>.3);
   const advancing=alive.filter(u=>front(u.y)>200&&front(u.y)<470);
   const win=WIN.has(c.id),tank=d.hp*count>=1600&&d.speedTiles<=1.05;
   const friends=advancing.filter(u=>u.hp>450).sort((a,b)=>front(b.y)-front(a.y));
   const focused=weakest.x/SX,enemyInvestment=observed.filter(u=>front(u.y)>440&&u.hp>1800);
   const lane=enemyInvestment.length&&this.memory.estimate<4?(enemyInvestment[0].x<240?14.5:3.5):focused;
   const reserve=this.settings.reserve+(danger>1?1:0),safe=v.elixir-c.cost>=reserve;
   if(win&&friends.length&&safe){const f=friends[0];const yy=clamp(front(f.y)/SY+2,10,14.15);positions(e,[point(f.x/SX,world(yy*SY)/SY),point(f.x/SX+(f.x<240?1:-1),world(yy*SY)/SY)],8+Math.min(4,advancing.length)-danger,'counterpush: support survivors');}
   if(!win&&!d.building&&!d.buildingsOnly&&friends.some(u=>u.def.buildingsOnly||u.hp>1900)&&safe){const f=friends.find(u=>u.def.buildingsOnly||u.hp>1900);if(v.own.filter(u=>u.id!==f.id&&distance(u,f)<4.5).length<2){const yy=clamp(front(f.y)/SY-2.7,4,13.5),xx=clamp(f.x/SX+(f.x<240?2:-2),1,17);positions(e,[point(xx,world(yy*SY)/SY),point(f.x/SX,world((yy-.8)*SY)/SY)],7+(d.range>3?1.6:0)-c.cost*.45-danger,'support: behind tank');}}
   if(d.building&&d.range>=10&&safe&&danger<2)positions(e,[point(lane,world(14*SY)/SY),point(lane+1,world(13.6*SY)/SY)],7,'pressure: siege');
   if(win&&!tank&&!d.building&&safe&&danger<2&&(this.memory.estimate<4||v.elixir>=(v.maxElixir||10)-.7))positions(e,[point(lane,world(14*SY)/SY),point(lane+1,world(13.8*SY)/SY)],8+(this.memory.estimate<3?2:0),'pressure: win condition');
   const ahead=v.crowns[v.team]>v.crowns[1-v.team]&&v.secondsLeft<45;
   if(v.elixir>=(v.maxElixir||10)-.5&&danger<2&&!ahead){
    let score=tank?6.5:(!d.building?4.8:1.5);score-=c.cost*.16;
    if(advancing.length>2)score-=3;
    if(c.id==='elixir-collector')score=v.secondsLeft>75?5:0;
    const y=d.building?10:3.8;positions(e,[point(lane,world(y*SY)/SY),point(lane+(lane<9?1.5:-1.5),world((y+.8)*SY)/SY)],score,'build: bank elixir and start in back');
   }
  }
  candidates.sort((a,b)=>b.score-a.score||a.slot-b.slot);this.lastCandidates=candidates;const choice=candidates[0]||null;
  if(!choice||choice.score<2.6)return null;
  return choice;
 }
 spells(v,e,enemies,threats,weakest,add){
  const c=e.card,id=c.id,r=c.source,own=v.own.filter(u=>!u.building&&u.wait<=0),front=y=>v.team?y:640-y;
  const tower=v.towers.filter(t=>t.team!==v.team&&t.hp>0);
  const danger=threats.filter(t=>!t.covered).reduce((n,t)=>n+t.weight,0);
  const damage=spellDamage(c),rad=Math.max(c.radiusTiles||1,id==='the-log'?1.1:0);
  if(id==='goblin-barrel'||id==='graveyard'){
   const tank=own.some(u=>distance(u,weakest)<7&&u.hp>450);
   const logged=this.memory.cycle.slice(-3).includes('the-log');
   if(danger<3&&(tank||id==='goblin-barrel'&&v.elixir>=8&&logged))add(e,weakest,7+(tank?3:0)+(logged?2:0),'pressure: supported summon');return;
  }
  if(['rage','clone','heal','freeze','tornado'].includes(id)){
   if(id==='rage'||id==='clone'||id==='heal'){
    for(const u of own){const group=own.filter(z=>distance(z,u)<=rad&&z.hp/z.maxHp>.3);const ready=group.filter(z=>z.attacking||front(z.y)>330);if((id==='clone'?ready.length>=3:ready.length>=2)&&danger<3)add(e,u,4+ready.length-c.cost*.5,'support: '+id);}return;
   }
   if(id==='freeze'){for(const t of tower){const friend=own.filter(u=>distance(u,t)<5&&u.hp>200),enemy=enemies.filter(u=>distance(u,t)<rad);if(friend.length&&enemy.length&&v.elixir>=c.cost+2)add(e,t,6+friend.length+enemy.length,'support: freeze defenders');}return;}
   if(id==='tornado'){const splash=own.filter(u=>u.def.splash>0);for(const u of enemies){const group=enemies.filter(z=>distance(z,u)<rad);if(group.length>=3&&splash.some(z=>distance(z,u)<z.def.range+5))add(e,u,7+group.length*.5,'defend: group into splash');}return;}
  }
  if(damage<=0)return;
  const p=DATA.projectiles[c.projectileName]||{},air=p.AoeToAir===true||['zap','arrows','fireball','rocket','poison','lightning','giant-snowball'].includes(id);
  const ground=p.AoeToGround!==false;
  const potential=enemies.filter(u=>(u.air?air:ground));
  const points=[...potential,...tower];
  for(let i=0;i<potential.length&&i<18;i++)for(let j=i+1;j<potential.length&&j<i+6;j++)if(distance(potential[i],potential[j])<2*rad)points.push({x:(potential[i].x+potential[j].x)/2,y:(potential[i].y+potential[j].y)/2});
  for(const target of points){
   let pos={x:target.x,y:target.y};
   if(target.entity&&!target.building&&!target.attacking&&target.wait<=0&&id!=='lightning'){
    const delay=id==='arrows'?1:id==='fireball'?.9:id==='rocket'?1.6:.4;
    // Only visible velocity is extrapolated; no future engine state is inspected.
    pos.x+=Math.cos(target.heading||0)*(target.def.speedTiles||0)*delay*SX;
    pos.y+=Math.sin(target.heading||0)*(target.def.speedTiles||0)*delay*SY;
   }
   if(id==='the-log'||id==='barbarian-barrel')pos.y+=(v.team?-1:1)*1.1*SY;
   if(id==='royal-delivery'){pos.y=clamp(pos.y,v.team?SY:17.5*SY,v.team?14.5*SY:31*SY);}
   const line=id==='the-log'||id==='barbarian-barrel';
   const hits=potential.filter(u=>line?Math.abs(u.x-pos.x)/SX<1.3+u.def.radiusTiles&&(front(u.y)-front(pos.y))>=-.4&&(front(u.y)-front(pos.y))<=10*SY:distance(u,pos)<=rad+u.def.radiusTiles);
   let value=0,urgency=0;
   for(const u of hits){const card=K.CARD_BY_ID[u.card],cost=(card?.cost||3)/Math.max(1,card?.count||1);const removed=Math.min(1,damage/Math.max(1,u.hp+u.shield));value+=cost*removed;const th=threats.find(t=>t.u.id===u.id);if(th&&!th.covered)urgency+=Math.min(3,th.weight*.3)*removed;}
   let finish=0,chip=0,kingPenalty=0;
   for(const t of tower){const hit=line?Math.abs(t.x-pos.x)/SX<1.3+t.def.radiusTiles&&front(t.y)>=front(pos.y)&&front(t.y)<=front(pos.y)+10*SY:distance(t,pos)<=rad+t.def.radiusTiles;if(!hit)continue;const crown=spellCrownDamage(c);if(t.hp<=crown)finish+=t.king?150:65;else{chip+=.8;if(t.king&&!t.active)kingPenalty=16;}}
   if(id==='lightning'){const ranked=hits.concat(tower.filter(t=>distance(t,pos)<=rad+t.def.radiusTiles)).sort((a,b)=>b.hp-a.hp).slice(0,3);if(!ranked.some(t=>t.id===weakest.id))finish=0;}
   let score=finish+value*3.2+urgency+chip-c.cost*2.35-kingPenalty;
   if(!finish&&value<c.cost*.55)score-=5;
   if(id==='poison'&&hits.some(u=>u.building))score+=1.5;
   if(id==='earthquake'&&hits.some(u=>u.building))score+=4;
   if(SWARM_COUNTER.has(id)&&hits.length>=4)score+=3;
   if(!finish&&v.elixir<c.cost+1&&danger<3)score-=2;
   add(e,pos,score,finish?'finish: lethal spell':'spell: '+hits.length+' targets');
  }
 }
 played(v,action){this.lastPlay=v.time;this.decisions.push({...action,time:v.time,enemyElixirEstimate:Number(this.memory.estimate.toFixed(2))});if(this.decisions.length>80)this.decisions.shift();}
 tick(b){const v=observe(b,this.seat);let action;
  if(this.intent){if(b.time<this.intent.at)return null;action=this.intent.action;this.intent=null;}
  else{const baseline=this.choose(v);if(v.time-this.lastPlay<this.settings.reaction)return null;if(this.learner&&v.time-this.learner.lastDecision<.6)return null;
   action=this.learner?this.learner.select(v,this.lastCandidates,baseline,b.rewardFrame(this.seat)):baseline;if(!action)return null;
   if(b.is2v2){this.intent={action,at:b.time+.3};return null;}
  }
  const result=b.deploy(this.seat,action.slot,action.x,action.y);if(result.ok){this.played(v,action);b.record({type:'decision',team:this.team,seat:this.seat,card:action.card,reason:action.reason,score:action.score,learnedValue:action.learnedValue||0});}return result;
 }
}
function spellDamage(c){let damage=c.damage||0;if(c.id==='arrows')damage*=c.source.ProjectileWaves||3;if(c.damageMode==='per second')damage*=Math.min(3,c.duration||1);return damage;}
function spellCrownDamage(c){const d=spellDamage(c);if(c.crownDamage!==null&&c.crownDamage!==undefined&&c.damage>0)return Math.floor(d*c.crownDamage/c.damage);return d;}
return {TacticalBot,observe,SETTINGS,spellDamage,spellCrownDamage};
});

;
/* Non-configurable public queue rules. Test fixtures without a queue retain their explicit inputs. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleMatchRules=api;})(globalThis,function(){'use strict';
const QUEUES=Object.freeze(['trophy-road','challenge','training','friendly','clan-war','2v2','3v3','5v5','bridge','touchdown','self-play','replay']);
function mix(n){n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return(n^(n>>>16))>>>0;}
function difficulty(index=0,seed=77137){index=Math.max(0,Math.floor(Number(index)||0));const cycle=Math.floor(index/20),h=mix(cycle^seed),start=4+h%13,length=1+((h>>>12)%2);return index%20>=start&&index%20<start+length?'hard':'expert';}
function prepare(options,cards){
 if(!options.queue)return options;
 const queue=QUEUES.includes(options.queue)?options.queue:'challenge',trophy=queue==='trophy-road';
 const clean={...options,profile:options.profile?{...options.profile,cheatLevels:{}}:options.profile,queue,aiDifficulty:difficulty(options.profile?.battleSerial||0,options.profile?.world?.seed||77137)};
 if(!trophy){const levels=Object.fromEntries(cards.map(c=>[c.id,9])),count=options.mode==='TeamRumble'?10:['Team3v3','Touchdown3v3'].includes(options.mode)?6:['TeamVsTeam','Touchdown2v2'].includes(options.mode)?4:2;Object.assign(clean,{levels,seatLevels:Array.from({length:count},()=>({...levels})),kingLevel:9,kingLevels:Array(count).fill(9)});}
 else{clean.levels={...options.profile?.cardLevels};clean.seatLevels=[clean.levels,...(options.seatLevels||[]).slice(1)];clean.kingLevel=options.profile?.level||1;clean.kingLevels=[clean.kingLevel,...(options.kingLevels||[]).slice(1)];}
 return clean;
}
const CUSTOM_MODES=Object.freeze(['FourCardDeck','SixCardDeck','RandomDeck','Team3v3','TeamRumble','BridgeBattle','TwelveCardDeck','TwentyElixir','UncappedElixir','OneShot','Touchdown','Touchdown2v2','Touchdown3v3']);
function timelineFor(mode,timelines){if(['Touchdown','Touchdown2v2','Touchdown3v3'].includes(mode))return {...timelines.Default,Name:mode};
 if(mode==='TeamRumble')return {...timelines.Default,Name:'TeamRumble',SectionLength:[300,300],SectionType:['Normal','Overtime'],ElixirRateLength:[120,120,60,120,120,60],ElixirFullBarMS:[28000,14000,28000/3,28000/3,7000,5600],ElixirRateVisible:[10,20,30,30,40,50],NextSpellCooldownMS:[1000,1000,500,500,400,350]};
 if(mode==='OneShot')return timelines.SuddenDeath;
 if(mode==='Team3v3')return {...timelines.Default,Name:'Team3v3',SectionLength:[300,120],SectionType:['Normal','Overtime'],ElixirRateLength:[120,120,60,60,60],ElixirFullBarMS:[28000,28000/1.5,14000,14000,9300],ElixirRateVisible:[10,15,20,20,30],NextSpellCooldownMS:[1000,1000,500,500,350]};
 return null;}
return{QUEUES,difficulty,prepare,CUSTOM_MODES,timelineFor};});

;
/* Deterministic browser battle interpreter for the supplied historical tables.
   The raw native engine is not embedded. See FIDELITY.md for interpretation limits. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog,n?require('./profile.js'):root.RoyaleProfile,n?require('./ai.js'):root.RoyaleAI,n?require('./navigation.js'):root.RoyaleNavigation,n?require('./learning.js'):root.RoyaleLearning,n?require('./training-decks.js'):root.RoyaleTrainingDecks,n?require('./placement.js'):root.RoyalePlacement,n?require('./pathing.js'):root.RoyalePathing,n?require('./formations.js'):root.RoyaleFormations,n?require('./level-model.js'):root.RoyaleLevelModel,n?require('./match-rules.js'):root.RoyaleMatchRules,n?require('./arena-grid.js'):root.RoyaleArenaGrid);if(n)module.exports=api;else root.RoyaleBattle=api;})(globalThis,function(K,P,AI,Nav,Learning,Decks,Placement,Pathing,Formations,Levels,Rules,G){'use strict';
const {DATA,SX,SY,clamp,sec,scaled,entityDef,cardAt}=K,EPS=1e-7;
const dist=(a,b)=>Math.hypot((a.x-b.x)/SX,(a.y-b.y)/SY),isTower=u=>u.king!==undefined;
const edge=(a,b)=>Math.max(0,dist(a,b)-(a.def?.radiusTiles||0)-(b.def?.radiusTiles||0));
function standardCrown(u){if(!u||u.boatPart)return false;const king=u.entity==='KingTower'&&u.king===true,princess=u.entity==='PrincessTower'&&u.king===false;if(!king&&!princess)return false;const y=king?(u.team?3:29):(u.team?6.5:25.5);return Math.abs(u.y/SY-y)<EPS&&(king?Math.abs(u.x/SX-9)<EPS:Math.min(Math.abs(u.x/SX-3.5),Math.abs(u.x/SX-14.5))<EPS);}
const teamOK=t=>Number.isInteger(t)&&t>=0&&t<4;
function rng(seed){let n=seed>>>0||1;const next=()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};next.state=()=>n>>>0;next.restore=value=>{n=value>>>0||1;};return next;}
let serial=0;
class Battle {
 constructor(options={}) {
  options=Rules.prepare(options,K.CARDS);this.queueType=options.queue||null;this.opponent=options.opponent||null;this.warContext=options.warContext||null;
  this.tiebreaker=null;this.tiebreakerEnabled=options.tiebreaker!==false;
  this.compactRecording=options.recording==='compact';this.headless=options.headless===true;this.navigator=new Nav.Navigator();this.snapshot=DATA.snapshot;this.id=Date.now()+'-'+(++serial);this.seed=options.seed||1;this.random=rng(this.seed);this.time=0;this.paused=false;this.result=null;this.overtime=false;this.ai=options.ai!==false;this.gameMode=DATA.modes.find(m=>m.Name===options.mode)||null;this.mode=(DATA.timelines[options.mode]||this.gameMode||Rules.CUSTOM_MODES.includes(options.mode))?options.mode:'Default';this.deckSize=K.modeDeckSize(this.mode);this.maxElixir=this.mode==='UncappedElixir'?Infinity:this.mode==='TwentyElixir'?20:10;this.timeline=Rules.timelineFor(this.mode,DATA.timelines)||DATA.timelines[this.gameMode?.BattleTimeline||this.mode]||DATA.timelines.Default;this.isTouchdown=['Touchdown','Touchdown2v2','Touchdown3v3'].includes(this.mode);this.isFFA=this.mode==='FreeForAll';this.is2v2=this.gameMode?.Players==='TvT'||this.mode.startsWith('TeamVsTeam')||this.mode==='Touchdown2v2';this.is3v3=this.mode==='Team3v3';this.is5v5=this.mode==='TeamRumble';this.isTeamElimination=this.is3v3||this.is5v5;this.arenaId=options.arenaId||this.mode;this.arenaLayout=G.layoutFor(this.arenaId);if(!this.arenaLayout.custom)this.arenaId=options.arenaId||options.profile?.arena||'training';this.seatCount=this.isFFA?4:this.mode==='Touchdown3v3'?6:this.is5v5?10:this.is3v3?6:this.is2v2?4:2;this.seats=Array.from({length:this.seatCount},(_,i)=>i);this.teamCount=this.isFFA?4:2;this.kingShots=0;this.metrics={combat:Array(this.teamCount).fill(0),towerDamage:Array(this.teamCount).fill(0),spent:this.seats.map(()=>0),leaked:this.seats.map(()=>0),kills:Array(this.teamCount).fill(0),lost:Array(this.teamCount).fill(0)};this.overtime=this.timeline.SectionType?.[0]==='Overtime';this.syntheticProfile=options.profile===undefined;const profileInput=this.syntheticProfile?{trophies:1000,cardLevels:Object.fromEntries(K.CARDS.map(c=>[c.id,9])),copies:Object.fromEntries(K.CARDS.map(c=>[c.id,20])),unlockedCards:K.CARDS.map(c=>c.id),decks:P.PRESETS}:options.profile;this.profile=P.normalizeProfile(profileInput);this.kingLevel=clamp(Math.floor(Number(options.kingLevel??this.profile.level??9)),1,13);this.cheats=this.profile.cheats;this.cheatPractice=Object.values(this.cheats).some(Boolean);this.practice=options.practice===true||this.cheatPractice;this.levels={...(options.levels||this.profile.cardLevels),...(this.cheats.overlevels?this.profile.cheatLevels:{})};
  this.elixir=this.seats.map(()=>this.timeline.StartingElixir??6);if(this.cheats.elixir)this.elixir[0]=Number.isFinite(this.maxElixir)?this.maxElixir:10;this.crowns=Array(this.teamCount).fill(0);this.units=[];this.towers=[];this.effects=[];this.projectiles=[];this.areas=[];this.pending=[];this.events=[];this.nextId=20;this.played=this.seats.map(()=>0);this.laneCounts=[0,0];this.lastCard=this.seats.map(()=>null);this.slotReady=this.seats.map(()=>[0,0,0,0]);this.aiClock=1.2;this.aiDifficulty=options.aiDifficulty||this.profile.aiDifficulty||'expert';this.bots=this.seats.map(seat=>new AI.TacticalBot({team:this.isFFA?seat:seat%2,seat,difficulty:this.aiDifficulty,seed:(options.seed||1)+seat*17}));this.memory=this.profile.laneCounts;
  const casual=this.queueType&&this.queueType!=='trophy-road',botArena=casual?14:Math.min(14,Math.max(1,Math.floor(Number(options.arenaNumber)||P.arenaNumber(this.profile))));
  const cfg=(casual||['FourCardDeck','TwelveCardDeck','OneShot'].includes(this.mode))?K.MODE_DECKS[this.mode]:null;
  const supplied=[options.deck,options.enemyDeck,options.allyDeck,options.enemyAllyDeck,options.secondAllyDeck,options.secondEnemyDeck];
  const primary=options.deck||(cfg?this.profile[cfg.key]:this.profile.decks[this.profile.activeDeck]);
  const valid=d=>K.validDeck(d,{...this.cheats,size:this.deckSize})&&d.every(id=>K.allowedInMode(id,this.mode));
  if(['TwelveCardDeck','OneShot'].includes(this.mode))for(const d of [options.deck,options.enemyDeck,...(options.decks||[])])if(d!==undefined&&!valid(d))throw Error('Invalid or prohibited card in '+this.mode+' deck');
  this.initialDecks=this.seats.map(seat=>{const input=options.decks?.length===this.seatCount?options.decks[seat]:seat===0?primary:supplied[seat];return input&&valid(input)?[...input]:Decks.forMode(this.seed+97+seat*193,botArena,this.mode);});
  const suppliedLevels=options.seatLevels||[],suppliedKings=options.kingLevels||[],rankTrophies=Math.max(0,Number(options.progressionTrophies??this.profile.trophies)||0);this.opponentProgression=this.seats.map(seat=>({seat,trophies:seat===0?rankTrophies:Levels.opponentTrophies(rankTrophies,this.random)}));this.seatLevels=this.seats.map(seat=>{if(suppliedLevels[seat])return{...suppliedLevels[seat],...(seat===0&&this.cheats.overlevels?this.profile.cheatLevels:{})};if(seat===0)return{...this.levels,...(this.cheats.overlevels?this.profile.cheatLevels:{})};if(this.syntheticProfile||this.cheatPractice)return Object.fromEntries(K.CARDS.map(c=>[c.id,9]));const cards=this.initialDecks[seat].map(id=>K.CARD_BY_ID[id]).filter(Boolean);return Levels.levelMap({arena:botArena,trophies:rankTrophies,cards,rng:this.random});});this.kingLevels=this.seats.map(seat=>clamp(Math.floor(Number(suppliedKings[seat]??(seat===0?this.kingLevel:(this.syntheticProfile||this.cheatPractice)?9:Levels.kingLevel({arena:botArena,trophies:rankTrophies,rng:this.random})))),1,13));this.kingLevel=this.kingLevels[0];const cycles=this.initialDecks.map(deck=>{
   // The browser enables shuffling. Explicitly ordered fixtures remain supported.
   const order=[...deck];if(options.shuffleDeck===true)for(let i=order.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
   const forbidden=id=>(id==='mirror'&&DATA.globals.LOGIC_MIRROR_NEVER_ON_OPENING_HAND?.BooleanValue)||(id==='elixir-collector'&&DATA.globals.LOGIC_ELIXIR_COLLECTOR_NEVER_ON_OPENING_HAND?.BooleanValue);
   for(let i=0;i<4;i++)if(forbidden(order[i])){const j=order.findIndex((id,k)=>k>=4&&!forbidden(id));if(j>=0)[order[i],order[j]]=[order[j],order[i]];}
   return order;
  });this.hand=cycles.map(d=>d.slice(0,4));this.queue=cycles.map(d=>d.slice(4));
  this.seatSlots=this.isTeamElimination?(G.Layout.validSlots(options.seatSlots,this.seatCount/2)?[...options.seatSlots]:G.Layout.shuffleSlots(this.random,this.seatCount/2)):this.seats.map(()=>0);
  const towerRows=this.isTouchdown?[]:this.isFFA?this.arenaLayout.ffaTeams.flatMap(row=>[['KingTower',row.king[0],row.king[1],0,row.team],...row.princess.map((q,i)=>['PrincessTower',q[0],q[1],i,row.team])]):[1,0].flatMap(team=>G.Layout.towers(team,this.arenaLayout.id).map(row=>[...row,team]));
  for(const [name,x,y,crownSlot,team]of towerRows){
   const owner=this.isFFA?team:this.isTeamElimination?this.seats.find(s=>s%2===team&&this.seatSlots[s]===crownSlot):team;
   const u=this.makeEntity(name,team,x*SX,y*SY,{owner,level:this.is2v2?Math.floor((this.kingLevels[team]+this.kingLevels[team+2])/2):this.kingLevels[owner],wait:0});u.crownSlot=crownSlot;u.localKing=(this.isTeamElimination||this.isFFA)&&name==='KingTower'&&owner===0;u.customCrown=this.arenaLayout.custom;u.king=name==='KingTower';u.skin=team===0?this.profile.selectedTowerSkin:'classic';u.active=!u.king;u.activationAt=Infinity;u.destroyed=false;u.duoKing=!!(this.is2v2&&u.king);if(u.duoKing){u.cannonOffset=1.55*SX;u.cannons=[-1,1].map(side=>({side,targetId:null,windup:null,nextAt:0,heading:team?Math.PI/2:-Math.PI/2}));}if(this.is2v2){const boost=DATA.globals[u.king?'TEAM_VS_TEAM_SUMMONER_HP_INCREASE_PERCENTAGE':'TEAM_VS_TEAM_PRINCESS_TOWER_HP_INCREASE_PERCENTAGE']?.NumberValue||0;u.hp=Math.floor(u.hp*(1+boost/100));}if(this.mode==='OneShot'){u.hp=1;u.def={...u.def,hp:1};}u.maxHp=u.hp;this.towers.push(u);
  }
  this.brain=options.brain||new Learning.SharedBrain(options.model);this.learningEnabled=this.queueType!=='replay';
  this.recorder=new Learning.MatchRecorder(this);const train=this.learningEnabled&&!Object.values(this.cheats).some(Boolean);
  for(const seat of this.seats)this.bots[seat].learner=new Learning.Controller(this.brain,seat,{training:train,seed:this.seed+seat*133,record:e=>this.record(e)});
 }
 teamOf(seat){return Number.isInteger(seat)&&seat>=0&&seat<this.seatCount?(this.isFFA?seat:seat%2):-1;}
 // Ordinary battles retain the catalog policy. Isolated practice subclasses
 // may override these without changing collection or matchmaking limits.
 scaleStat(raw,rarity,level){return scaled(raw,rarity,level);}
 entityDefinition(name,level){return entityDef(name,level);}
 withOwner(owner,action){const before=this._owner;this._owner=owner;try{return action();}finally{this._owner=before;}}
 schedule(event){return this.pending.push({...event,owner:event.owner??this._owner??event.team});}
 // Rumble scores/eliminates Kings only; Princess Towers remain live defenses.
 get victoryScore(){return this.is5v5?[0,1].map(team=>this.towers.filter(t=>t.king&&t.team!==team&&t.hp<=0).length):this.crowns;}
 scheduleKingActivation(t){
  if(!t)return;
  const kings=this.is5v5?this.towers.filter(k=>k.king&&k.team===t.team&&k.hp>0&&!k.dead):[t];
  if(this.is5v5&&kings.some(k=>k.active)){this.activateKing(kings.find(k=>k.active));return;}
  const deadline=Math.min(this.time+sec(DATA.globals.KING_ACTIVATE_TIME_MS?.NumberValue||3300),...kings.map(k=>k.activationAt));
  for(const k of kings)if(!k.active&&k.hp>0&&!k.dead)k.activationAt=Math.min(k.activationAt,deadline);
 }
 activateKing(t){
  const kings=this.is5v5?this.towers.filter(k=>k.king&&k.team===t.team&&k.hp>0&&!k.dead):[t];
  for(const k of kings)if(!k.active&&k.hp>0&&!k.dead){k.active=true;k.activatedAt=this.time;}
 }
 passiveElixirEnabled(seat){return !(this.isTeamElimination||this.isFFA)||this.towers.some(t=>t.king&&t.owner===seat&&t.hp>0&&!t.dead);}
 creditElixir(seat,amount){if(this.teamOf(seat)>=0)this.elixir[seat]=Math.min(this.maxElixir,this.elixir[seat]+amount);}
 get phase(){let elapsed=this.time;const lens=this.timeline.ElixirRateLength||[120,120,60];for(let i=0;i<lens.length;i++){if(elapsed<lens[i]||i===lens.length-1)return i;elapsed-=lens[i];}return 0;}
 get multiplier(){return (this.timeline.ElixirRateVisible?.[this.phase]||10)/10;}
 get section(){let end=0;const lengths=this.timeline.SectionLength||[180,120];for(let i=0;i<lengths.length;i++){end+=lengths[i];if(this.time<end||i===lengths.length-1)return {index:i,end,type:this.timeline.SectionType?.[i]||'Normal'};}return {index:0,end:180,type:'Normal'};}
 get secondsLeft(){return Math.max(0,Math.ceil(this.section.end-this.time));}
 isPresent(u){return !!u&&u.hp>0&&!u.dead&&(this.tiebreaker?.startedAt??this.time)+EPS>=(u.appearsAt??u.born??0);}
 get active(){return [...this.towers,...this.units].filter(u=>this.isPresent(u));}
 getEntity(id){return this.towers.find(u=>u.id===id)||this.units.find(u=>u.id===id);}
 card(team,slot){const id=this.hand[team]?.[slot];if(!id)return null;let c=cardAt(id,this.seatLevels[team]?.[id]??9);if(id==='mirror'&&this.lastCard[team])c={...c,cost:Math.min(10,this.lastCard[team].cost+1),mirrorCard:this.lastCard[team].id};return c;}
 effect(e){if(this.headless)return;this.effects.push({...e,fxId:this.visualSerial=(this.visualSerial||0)+1,born:this.time});if(this.effects.length>220)this.effects.splice(0,this.effects.length-220);}
 record(e){const event={...e,time:this.time};this.recorder?.event(event);if(this.compactRecording&&event.type!=='deploy')return;this.events.push(event);if(this.events.length>(this.compactRecording?64:300))this.events.shift();}
 placement(team,card,x,y,seat=team){return Placement.snapCard(this,team,card,x,y,seat);}
 placementPreview(seat,slot,x,y){return Placement.forecastPlacement(this,seat,slot,x,y);}
 spellAffectedEntities(card,shape,team){
  const r=card.source||{},p=DATA.projectiles[card.projectileName]||DATA.projectiles[r.CustomFirstProjectile]||DATA.projectiles[r.Projectile]||{},a=DATA.areas[r.AreaEffectObject]||{};
  const own=r.OnlyOwnTroops===true,ground=p.AoeToGround!==false&&a.HitsGround!==false,air=p.AoeToAir===true||a.HitsAir===true;
  return this.active.filter(u=>{if(u.effectCarrier||u.attachedTo||!this.isPresent(u)||u.hidden)return false;if(own?u.team!==team:u.team===team)return false;if(u.air&&!air||!u.air&&!ground)return false;if(a.IgnoreBuildings&&u.building)return false;return Placement.affectedByShape(u,shape);});
 }
 deploy(seat,slot,x,y){
  const team=this.teamOf(seat);
  if(this.paused||this.result)return {ok:false,reason:'Battle is paused'};
  if(this.tiebreaker)return {ok:false,reason:'Tiebreaker in progress'};
  if(!teamOK(team)||!Number.isInteger(slot)||slot<0||slot>3)return {ok:false,reason:'Select a card'};
  const c=this.card(seat,slot);if(!c)return {ok:false,reason:'Unknown card'};if(!K.allowedInMode(c.id,this.mode))return{ok:false,reason:'This card is prohibited in '+this.mode};
  if(this.slotReady[seat][slot]>this.time+EPS)return {ok:false,reason:'Card is cycling'};
  if(c.id==='mirror'&&!this.lastCard[seat])return {ok:false,reason:'Play another card before Mirror'};
  const real=c.id==='mirror'?cardAt(this.lastCard[seat].id,Math.min(DATA.globals.MIRROR_CAP_TO_MAX_LEVEL?.BooleanValue?13:14,c.level+(DATA.globals.MIRROR_LEVEL_OFFSET?.NumberValue??1))):c;
  const valid=this.placement(team,real,x,y,seat);if(!valid.ok)return valid;x=valid.x??x;y=valid.y??y;
  if(this.elixir[seat]+EPS<c.cost)return {ok:false,reason:'Not enough elixir'};
  if(this.units.length>450)return {ok:false,reason:'Arena entity limit reached'};
  if(!(seat===0&&this.cheats.elixir)){this.elixir[seat]=Math.max(0,this.elixir[seat]-c.cost);this.metrics.spent[seat]+=c.cost;}else this.elixir[0]=Number.isFinite(this.maxElixir)?this.maxElixir:Math.max(10,this.elixir[0]);const played=this.hand[seat][slot];if(this.deckSize!==4){this.hand[seat][slot]=this.queue[seat].shift();this.queue[seat].push(played);}this.slotReady[seat][slot]=this.time+sec(this.timeline.NextSpellCooldownMS?.[this.phase]??1000);this.played[seat]++;
  this.cast(real,team,x,y,seat,valid.formation);if(c.id!=='mirror')this.lastCard[seat]={id:c.id,level:c.level,cost:c.cost};if(team===0&&!real.spell)this.laneCounts[x<9*SX?0:1]++;
  this.record({type:'deploy',team,seat,slot,playedCard:played,card:real.id,cost:c.cost,x,y,serial:this.played[seat]});return {ok:true,card:real.id};
 }
 cast(c,team,x,y,owner=team,formation=null){return this.withOwner(owner,()=>this.castOwned(c,team,x,y,formation));}
 castOwned(c,team,x,y,formation=null){
  const r=c.source;
  // Card-authored deployment/cast effects are distinct from projectile trails
  // and impact graphs. Render them immediately at the chosen tile so Arrows,
  // Freeze, Graveyard, rolling spells and barrel spells use their source cast FX.
  if(!c.entity&&r.Effect)this.effect({kind:'source',sourceEffect:r.Effect,x,y,team,ttl:6});
  if(c.entity){
   const n=r.SummonNumber||1,sourceEntity=DATA.entities[c.entity],travel=sourceEntity.SpawnPathfindSpeed?dist({x:9*SX,y:(team?3:29)*SY},{x,y})/(sourceEntity.SpawnPathfindSpeed/60):0,extra=(r.CustomDeployTime!==undefined?sec(r.CustomDeployTime):0)+travel;
   const members=formation?.length?formation:Formations.cardMembers(c,x,y,team),levelGroupId=members.length>1?'deploy:'+this.nextId:null;for(const m of members){const md=this.entityDefinition(m.entity,c.level),wait=md.deploy+extra+(m.delay||0),u=this.spawn(m.entity,team,m.x,m.y,{card:c.id,level:c.level,levelGroupId,wait,appearsIn:travel+(m.delay||0),deployed:true,canEnemy:!!r.CanDeployOnEnemySide||(team===0&&this.cheats.placement)});if(u)u.formationIndex=m.index;}
   if(travel>0&&sourceEntity.SpawnPathfindEffect)this.effect({kind:'source',sourceEffect:sourceEntity.SpawnPathfindEffect,team,x,y,startX:9*SX,startY:(team?3:29)*SY,travelDuration:travel,ttl:travel,loop:true});
   const e=DATA.entities[c.entity];if(e.SpawnAreaObject)this.schedule({type:'area',name:e.SpawnAreaObject,team,x,y,level:c.level,due:this.time+sec(e.DeployTime)});
   if(r.Projectile)this.schedule({type:'impact',due:this.time+sec(e.DeployTime),name:r.Projectile,team,x,y,level:c.level});
   this.effect({kind:'spawn',x,y,team,ttl:1});return;
  }
  // One second of flight plus the native embedded-arrow maximum life (1.9s).
  // The visual tail is independent of the three scheduled damage waves.
  if(c.id==='arrows'){for(let i=0;i<(r.ProjectileWaves||3);i++)this.schedule({type:'impact',name:r.CustomFirstProjectile||'ArrowsSpell',team,x,y,level:c.level,due:this.time+1+i*sec(r.ProjectileWaveInterval||200)});for(let i=0;i<(r.ProjectileWaves||3);i++)this.schedule({type:'visual',kind:'arrowsFly',x,y,startX:9*SX,startY:(team?3:29)*SY,team,ttl:2.9,flightDuration:1,wave:i,count:r.MultipleProjectiles||10,radius:(r.Radius||4000)/1000*SX,due:this.time+i*sec(r.ProjectileWaveInterval||200)});return;}
  if(c.id==='the-log'||c.id==='barbarian-barrel'){
   this.effect({kind:'rollingDeploy',projectile:r.Projectile,x,y,team,ttl:.5});this.schedule({type:'rolling',name:c.id==='the-log'?'LogProjectileRolling':'BarbLogProjectileRolling',team,x,y,level:c.level,due:this.time+.5});return;
  }
  if(r.Projectile){const source={id:0,team,x:9*SX,y:(team?3:29)*SY,level:c.level,entity:'Spell',def:{source:{},radiusTiles:0}};this.fireProjectile(r.Projectile,source,null,{x,y,level:c.level,spell:true});return;}
  if(r.AreaEffectObject){this.schedule({type:'area',name:r.AreaEffectObject,team,x,y,level:c.level,due:this.time+(c.id==='royal-delivery'?1:.5)});return;}
  if(r.InstantDamage)this.hitArea({team,x,y,damage:this.scaleStat(r.InstantDamage,c.rarity,c.level),radius:c.radiusTiles,ground:true,air:true});
 }
 makeEntity(name,team,x,y,opt={}){
  const def=this.entityDefinition(name,opt.level??9),r=def.source,limits=G.Layout.limits(this.arenaLayout.id,def.air);const wait=opt.wait!==undefined?opt.wait:def.deploy+(opt.extraWait||0);const hp=opt.cloned?1:(def.hp||1);const effectCarrier=!def.hp&&!!(r.DeathAreaEffect||r.DeathDamage||r.DeathSpawnProjectile||r.DeathSpawnCharacter);
  return {layout:this.arenaLayout.id,effectCarrier,id:this.nextId++,levelGroupId:opt.levelGroupId||null,entity:name,card:opt.card||name,owner:opt.owner??this._owner??team,team,x:clamp(x,(limits.left+.25)*SX,(limits.right-.25)*SX),y:clamp(y,(limits.top+.4)*SY,(limits.bottom-.4)*SY),def,level:def.level,hp,maxHp:hp,shield:opt.cloned?(def.shield?1:0):def.shield,maxShield:def.shield,cloned:!!opt.cloned,radius:def.radius,building:def.building,air:def.air,wait,readyAt:this.time+wait,born:this.time,appearsAt:this.time+(opt.appearsIn||0),alive:true,dead:false,buffs:{},cooldown:0,nextAttackAt:0,windup:null,targetId:null,lockTime:0,lastAttackAt:-Infinity,lastCombatAt:this.time,visualState:'idle',visualStarted:this.time,visualTime:0,animationTime:0,visualDuration:sec(r.VisualHitSpeed)||def.interval,heading:team?Math.PI/2:-Math.PI/2,facing:team?1:-1,walk:0,hit:0,attack:0,chargeDistance:0,charged:false,precharge:r.LoadFirstHit?0:Math.min(def.interval,sec(r.LoadTime)),hidden:!!r.HidesWhenNotAttacking,invisible:r.BuffWhenNotAttacking==='Invisibility',dash:null,drag:null,attachedTo:opt.attachedTo||null,attachmentIndex:opt.attachmentIndex||0,attachmentsStarted:false,nextSpawnAt:this.time+wait+sec(r.SpawnStartTime??r.SpawnPauseTime??r.SpawnInterval??0),spawned:0,manaAt:this.time+wait+sec(r.ManaGenerateTimeMs||1e9),expires:def.life?this.time+wait+def.life:(effectCarrier?this.time+wait:Infinity)};
 }
 spawn(name,team,x,y,opt={}){if(!DATA.entities[name]||this.units.length>=500)return null;const u=this.makeEntity(name,team,x,y,opt);if(u.def.source.HidesWhenNotAttacking)u.hideVisual={progress:0,direction:0};this.units.push(u);if(u.building)this.navigator.sampleTime=-1;if(u.def.source.SpawnEffect){const delay=Math.max(0,u.appearsAt-this.time);this.effect({kind:'source',sourceEffect:u.def.source.SpawnEffect,team,x,y,follow:u.id,delay,ttl:4+delay});}return u;}
 spawnGroup(name,count,team,x,y,level,opt={}){
  const n=clamp(count||1,1,30),d=this.entityDefinition(name,level),radius=opt.radius||Math.max(.55,d.radiusTiles*1.2);const out=[],levelGroupId=opt.levelGroupId||(n>1?'spawn:'+this.nextId:null);
  for(let i=0;i<n;i++){let xx=x,yy=y;if(n>1){if(opt.formation==='barrel'){const angle=(team===0?-Math.PI/2:Math.PI/2)+i*Math.PI*2/n;xx+=Math.cos(angle)*radius*SX;yy+=Math.sin(angle)*radius*SY;}else if(opt.width||opt.fullLane){const width=opt.width||14,center=opt.fullLane?9:clamp(x/SX,.5+width/2,17.5-width/2);xx=(center-width/2+width*i/(n-1))*SX;}else if(n<=3){xx+=(i-(n-1)/2)*radius*2*SX;}else{const a=(i/n)*Math.PI*2;xx+=Math.cos(a)*radius*SX*Math.sqrt(n/3);yy+=Math.sin(a)*radius*SY*Math.sqrt(n/3);}}
   if(opt.deployed&&!opt.canEnemy){
    const side=xx<9*SX?0:1,other=this.towers.filter(t=>t.team!==team&&!t.king).sort((a,b)=>a.x-b.x),opened=other[side]?.hp<=0;
    yy=team===0?Math.max(yy,(opened?10:17)*SY):Math.min(yy,(opened?22:15)*SY);
    if(yy>15*SY&&yy<17*SY)yy=(team===0?17:15)*SY;
   }
   // Source split/spawn radii can put a child in water or through an arena
   // wall. Preserve legal offsets and settle only invalid bodies to the
   // nearest legal bank/bridge candidate; normal walking never gains water access.
   // Zero-health payload carriers retain the parent's exact effect origin.
   if(d.hp>0){const free={air:d.air,water:!!(d.air||d.hover||d.source.JumpEnabled),layout:this.arenaLayout.id},r=d.radiusTiles;
    const obstacles=this.active.filter(v=>v.building&&!v.air&&!v.attachedTo&&!v.effectCarrier).map(v=>({x:v.x/SX,y:v.y/SY,radius:v.def.radiusTiles}));
    // Barrel siblings are settled as a group so edge/river clamping cannot stack them.
    if(opt.formation==='barrel')for(const v of out)obstacles.push({x:v.x/SX,y:v.y/SY,radius:v.def.radiusTiles});
    const point=Nav.nearestClearPoint({x:xx/SX,y:yy/SY},r,obstacles,free,{x:0,y:team?1:-1});
    if(point){xx=point.x*SX;yy=point.y*SY;}
   }
   const wait=opt.wait!==undefined?opt.wait:d.deploy+(opt.extraWait||0)+i*(opt.stagger||0);const u=this.spawn(name,team,xx,yy,{...opt,level,levelGroupId,wait,appearsIn:(opt.travel||0)+i*(opt.stagger||0)});if(u)out.push(u);
  }return out;
 }
 buffs(u){const slow={speed:1,attack:1,spawn:1},boost={speed:1,attack:1,spawn:1};for(const [n,b]of Object.entries(u.buffs)){if(b.until<=this.time){delete u.buffs[n];continue;}const r=DATA.buffs[b.name||n]||{};for(const [key,tag]of [['SpeedMultiplier','speed'],['HitSpeedMultiplier','attack'],['SpawnSpeedMultiplier','spawn']])if(r[key]!==undefined){const v=r[key]<0?Math.max(0,1+r[key]/100):r[key]/100;if(v<1)slow[tag]=Math.min(slow[tag],v);else boost[tag]=Math.max(boost[tag],v);}}return {speed:slow.speed*boost.speed,attack:slow.attack*boost.attack,spawn:slow.spawn*boost.spawn};}
 addBuff(u,name,duration,sourceTeam,level=9,origin=null,sourceTime=null){const r=DATA.buffs[name];if(!u?.buffs||!r||u.hp<=0||u.def.source.IgnoreBuff===name||(r.IgnoreBuildings&&u.building)||(r.NoEffectToCrownTowers&&isTower(u)))return;
  const key=r.EnableStacking&&origin!==null?name+'@'+origin:name,prev=u.buffs[key];u.buffs[key]={name,until:Math.max(prev?.until||0,this.time+duration),sourceTeam,level,nextTick:prev?.nextTick??(sourceTime??this.time)+sec(r.HitFrequency||500)};
  if(r.HitSpeedMultiplier<=-100){this.cancelAttackVisual(u);u.charged=false;u.chargeDistance=0;u.lockTime=0;u.precharge=0;u.windup=null;u.hook=null;u.nextAttackAt=this.time+duration;u.dash=null;}
 }
 damage(u,value,attacker=null,opt={}){
  if(!u||u.effectCarrier||u.hp<=0||u.dead||!Number.isFinite(value)||value<=0)return;
  if(u.dash?.moving&&u.def.source.DashImmuneToDamageTime&&!opt.ignoreImmunity)return;
  if(u.hidden&&!opt.affectsHidden&&!attacker)return;
  let dmg=value;if(isTower(u)&&opt.crownPercent!==undefined)dmg*=Math.max(0,100+opt.crownPercent)/100;
  dmg=Math.max(0,Math.floor(dmg+EPS));if(!dmg)return;
  if(attacker?.def?.source.BuffOnDamage)this.addBuff(u,attacker.def.source.BuffOnDamage,sec(attacker.def.source.BuffOnDamageTime),attacker.team,attacker.level);
  const before=u.hp+u.shield;
  if(u.shield>0){u.shield=Math.max(0,u.shield-dmg);}else u.hp=Math.max(0,u.hp-dmg);
  const actual=before-u.hp-u.shield,credit=attacker?.team??opt.team??(1-u.team);
  if(credit!==u.team&&teamOK(credit)){
   if(isTower(u))this.metrics.towerDamage[credit]+=actual/Math.max(1,u.maxHp);
   else{const card=K.CARD_BY_ID[u.card]||K.CARDS.find(c=>c.entity===u.entity),value=card?(card.cost/Math.max(1,card.count||1)):1;const maximum=Math.max(1,u.maxHp+u.maxShield),credited=Math.min(actual,Math.max(0,maximum-(u.rewardDamageCredited||0)));u.rewardDamageCredited=(u.rewardDamageCredited||0)+credited;this.metrics.combat[credit]+=credited/maximum*value;}
  }
  this.record({type:'damage',team:credit,target:u.id,owner:u.owner,source:attacker?.id||0,entity:u.entity,amount:actual,tower:isTower(u),hp:u.hp,shield:u.shield});
  u.hit=.16;u.lastDamagedAt=this.time;u.lastDamageTeam=credit;u.lastCombatAt=this.time;if(u.king&&!u.active)this.scheduleKingActivation(u);
  const r=u.def.source;
  if(attacker?.buffs&&!opt.reflected&&r.ReflectedAttackDamage&&dist(u,attacker)<=r.ReflectedAttackRadius/1000){this.damage(attacker,this.scaleStat(r.ReflectedAttackDamage,r.Rarity,u.level),u,{reflected:true});this.addBuff(attacker,r.ReflectedAttackBuff,sec(r.ReflectedAttackBuffDuration),u.team,u.level);this.effect({kind:'beam',x:u.x,y:u.y,tx:attacker.x,ty:attacker.y,team:u.team,ttl:.18});}
  if(attacker?.def?.source.BuffOnDamage)this.addBuff(u,attacker.def.source.BuffOnDamage,sec(attacker.def.source.BuffOnDamageTime),attacker.team,attacker.level);
 }
 heal(u,value){if(u&&u.hp>0&&!u.cloned&&!u.building)u.hp=Math.min(u.maxHp,u.hp+value);}
 canTarget(a,b,ignoreHidden=false){if(!b||b.effectCarrier||b.hp<=0||b.dead||b.team===a.team||b.attachedTo||!this.isPresent(b)||(!ignoreHidden&&(b.hidden||b.invisible)))return false;const r=a.def.source;if(b.air&&!a.def.targetsAir)return false;if(!b.air&&!a.def.targetsGround)return false;if(a.def.buildingsOnly&&!b.building)return false;if(a.def.troopsOnly&&b.building)return false;if(r.TargetOnlyTowers&&!isTower(b))return false;if(r.TargetOnlyKingTower&&!b.king)return false;if(r.IgnoreTargetsWithBuff&&b.buffs[r.IgnoreTargetsWithBuff]?.until>this.time&&!r.DeprioritizeTargetsWithBuff)return false;return true;}
 canCompleteHit(u,t){if(!this.canTarget(u,t))return false;const d=edge(u,t);return d+EPS>=u.def.minRange&&(!DATA.globals.LOGIC_CANCEL_HIT_FROM_LONG_DISTANCE?.BooleanValue||d<=u.def.range+(DATA.globals.LOGIC_CANCEL_HIT_FROM_LONG_DISTANCE_RANGE?.NumberValue??1500)/1000+EPS);}
 defaultCrownTarget(u){
  if(this.isFFA){const eligible=this.towers.filter(t=>this.canTarget(u,t)&&edge(u,t)+EPS>=u.def.minRange).sort((a,b)=>edge(u,a)-edge(u,b));return{target:eligible.find(t=>!t.king)||eligible[0]||null,lane:null};}
  if(this.arenaLayout.custom){const slot=G.Layout.lane(u.x/SX,this.arenaLayout.id),eligible=this.towers.filter(t=>this.canTarget(u,t)&&edge(u,t)+EPS>=u.def.minRange),same=eligible.filter(t=>t.crownSlot===slot);const target=same.find(t=>!t.king)||same.find(t=>t.king)||eligible.sort((a,b)=>edge(u,a)-edge(u,b))[0]||null;return{target,lane:slot};}
  const lane=u.x<=9*SX?0:1,eligible=this.towers.filter(t=>this.canTarget(u,t)&&edge(u,t)+EPS>=u.def.minRange),standard=eligible.filter(standardCrown);
  const target=standard.find(t=>!t.king&&(t.x<9*SX?0:1)===lane)||standard.find(t=>t.king)||eligible.sort((a,b)=>edge(u,a)-edge(u,b))[0]||null;
  return{target,lane:standardCrown(target)?(target.king?lane:target.x<9*SX?0:1):null};
 }
 targetDecision(u,candidates=this.active){
  const deprioritized=t=>u.def.source.DeprioritizeTargetsWithBuff&&t?.buffs[u.def.source.IgnoreTargetsWithBuff]?.until>this.time;
  const old=this.getEntity(u.targetId);
  if(u.windup&&DATA.globals.LOGIC_PRESERVE_TARGET_IF_HIT_STARTED?.BooleanValue&&this.canCompleteHit(u,old))return{target:old,kind:'engage',lane:null};
  // An engaged target keeps its lock. Navigation reacquires freely; source
  // priority exceptions (Ram Rider's snare) are tiers, not distance offsets.
  if(this.canTarget(u,old)&&edge(u,old)+EPS>=u.def.minRange&&edge(u,old)<=u.def.range+EPS&&!deprioritized(old))return{target:old,kind:'engage',lane:null};
  let best=null,bestDistance=Infinity,bestPriority=Infinity;
  for(const v of candidates){if(!this.canTarget(u,v))continue;const dd=edge(u,v);if(dd>u.def.sight+EPS||dd+EPS<u.def.minRange)continue;const priority=deprioritized(v)?1:0;if(priority<bestPriority||priority===bestPriority&&dd<bestDistance){bestPriority=priority;bestDistance=dd;best=v;}}
  if(best)return{target:best,kind:edge(u,best)<=u.def.range+EPS?'engage':'chase',lane:null};
  if(u.building||u.attachedTo||u.def.troopsOnly)return{target:null,kind:'idle',lane:null};
  // Default advance is separate from local target pursuit. This lane-based
  // policy favors the current-side Princess, then King when that lane opens.
  const fallback=this.defaultCrownTarget(u);return{...fallback,kind:fallback.target?'advance':'idle'};
 }
 chooseTarget(u,candidates=this.active){return this.targetDecision(u,candidates).target;}
 attackDamage(u){const r=u.def.source;if(u.charged&&r.DamageSpecial)return this.scaleStat(r.DamageSpecial,r.Rarity,u.level);if(r.VariableDamage2){if(u.lockTime>=sec(r.VariableDamageTime1+r.VariableDamageTime2))return this.scaleStat(r.VariableDamage3,r.Rarity,u.level);if(u.lockTime>=sec(r.VariableDamageTime1))return this.scaleStat(r.VariableDamage2,r.Rarity,u.level);}return u.def.damage;}
 push(u,dx,dy,tiles,force=false,interruptAttack=true){
  if(!u||u.building||(!force&&u.def.source.IgnorePushback)||!tiles)return;
  const len=Math.hypot(dx/SX,dy/SY);if(len<EPS)return;
  const move=Pathing.sweptStep(u,dx/len*tiles,dy/len*tiles,this.active.filter(v=>v.id!==u.id&&v.building));
  const limits=G.Layout.limits(this.arenaLayout.id,u.air);u.x=clamp(move.x,(limits.left+.25)*SX,(limits.right-.25)*SX);u.y=clamp(move.y,(limits.top+.4)*SY,(limits.bottom-.4)*SY);
  if(interruptAttack){this.cancelAttackVisual(u);u.charged=false;u.chargeDistance=0;u.lockTime=0;u.precharge=0;u.windup=null;u.hook=null;u.nextAttackAt=this.time;}
  u.navPath=null;
 }
 hitArea(o){for(const v of this.active){if(v.team===o.team||v.attachedTo||!this.isPresent(v)||v.hidden&&!o.affectsHidden)continue;if(v.air&&!o.air||!v.air&&!o.ground)continue;if(o.ignoreBuildings&&v.building)continue;if(dist(v,o)>o.radius+v.def.radiusTiles)continue;this.damage(v,o.damage,o.source,{crownPercent:o.crownPercent,affectsHidden:o.affectsHidden,team:o.team});if(o.buff)this.addBuff(v,o.buff,o.buffTime||.5,o.team,o.level??9);if(o.push)this.push(v,v.x-o.x,v.y-o.y,o.push,o.forcePush);}}
 cancelAttackVisual(u){if(u.hook||u.visualAttack&&u.visualAttack.releasedAt===null){u.visualAttack=null;u.visualHook=null;u.visualAttackCancelled=true;}}
 startAttack(u,t){u.visualHook=null;u.visualAttackCancelled=false;if(u.def.source.AttackStartEffect&&!u.def.source.TargetedHitEffect)this.effect({kind:'source',sourceEffect:u.def.source.AttackStartEffect,team:u.team,x:u.x,y:u.y,follow:u.id,height:20,angle:u.heading,ttl:2});u.heading=Math.atan2((t.y-u.y)/SY,(t.x-u.x)/SX);
  if(!u.def.source.VisualHitSpeed||u.visualState!=='attack'||u.animationTime>=u.visualDuration){u.animationTime=0;u.visualStarted=this.time;}
  u.visualState='attack';u.invisible=false;u.hidden=false;let first=Math.max(u.def.firstHit,u.def.interval-(u.precharge||0));if(u.charged)first=0;if(u.def.source.LoadFirstHit)first=Math.max(0,u.def.interval-u.precharge);if(!u.def.source.VisualHitSpeed)u.visualAttack={windup:first,releasedAt:null};u.attackCycleAt=this.time;u.windup={target:t.id,remaining:first};u.lastAttackAt=this.time;u.lastCombatAt=this.time;}
 strike(u,t){const r=u.def.source,damage=this.attackDamage(u);if(u.visualAttack)u.visualAttack.releasedAt=u.animationTime;if(r.ProjectileEffect)this.effect({kind:'source',sourceEffect:r.ProjectileEffect,x:u.x,y:u.y,team:u.team,follow:u.id,height:u.building?40:24,angle:u.heading,ttl:2});if(r.TargetedHitEffect&&!r.MultipleTargets)this.effect({kind:'beam',sourceBeam:r.TargetedHitEffect,source:u.id,target:t.id,x:u.x,y:u.y,tx:t.x,ty:t.y,team:u.team,ttl:.22});u.lastAttackAt=this.time;u.lastCombatAt=this.time;
  // A multi-target release keeps its committed primary. Extra bolts use the
  // nearest legal secondary boundaries; modulo repeats both bolts on one foe.
  const targets=r.MultipleTargets?[t,...this.active.filter(v=>v.id!==t.id&&this.canTarget(u,v)&&edge(u,v)<=u.def.range+EPS&&edge(u,v)+EPS>=u.def.minRange).sort((a,b)=>edge(u,a)-edge(u,b))]:null;
  if(r.Projectile||r.CustomFirstProjectile){const count=r.MultipleProjectiles||1,shots=r.MultipleTargets||count;
   for(let i=0;i<shots;i++){const target=targets?targets[i%targets.length]:t,projectile=K.projectileForAttack(r,i);if(projectile)this.fireProjectile(projectile,u,target,{angle:count>1?(i-(count-1)/2)*.055:0,index:i});}
  }else if(r.MultipleTargets){for(let i=0;i<r.MultipleTargets;i++){const target=targets[i%targets.length];this.damage(target,damage,u);if(r.BuffOnDamage)this.addBuff(target,r.BuffOnDamage,sec(r.BuffOnDamageTime),u.team,u.level);if(r.DamageEffect)this.effect({kind:'source',sourceEffect:r.DamageEffect,x:target.x,y:target.y,team:u.team,ttl:2});this.effect({kind:'beam',sourceBeam:r.TargetedHitEffect||null,source:u.id,target:target.id,x:u.x,y:u.y-25,tx:target.x,ty:target.y-15,team:u.team,ttl:.22});}}else if(r.AreaDamageRadius){const hx=r.SelfAsAoeCenter?u.x:t.x,hy=r.SelfAsAoeCenter?u.y:t.y;this.hitArea({team:u.team,x:hx,y:hy,radius:r.AreaDamageRadius/1000,damage,source:u,ground:u.def.targetsGround,air:u.def.targetsAir,crownPercent:r.CrownTowerDamagePercent,push:(r.MeleePushback||0)/1000});if(r.DamageEffect)this.effect({kind:'source',sourceEffect:r.DamageEffect,x:hx,y:hy,team:u.team,ttl:2});else this.effect({kind:r.Kamikaze?'blast':'cleave',x:hx,y:hy,radius:r.AreaDamageRadius/1000*SY,team:u.team,ttl:.25});}
  else{this.damage(t,damage,u,{crownPercent:r.CrownTowerDamagePercent});if(r.DamageEffect)this.effect({kind:'source',sourceEffect:r.DamageEffect,x:t.x,y:t.y,team:u.team,ttl:2});else if(!r.VariableDamage2)this.effect({kind:'slash',x:u.x,y:u.y-20,tx:t.x,ty:t.y-15,team:u.team,ttl:.22});}
  if(r.AttackPushBack)this.push(u,u.x-t.x,u.y-t.y,r.AttackPushBack/1000,true);
  if(r.AreaEffectOnHit)this.createArea(r.AreaEffectOnHit,u.team,u.x,u.y,u.level);
  if(r.Kamikaze){u.hp=0;}
  u.charged=false;u.chargeDistance=0;u.precharge=0;u.nextAttackAt=(r.LoadFirstHit?this.time:(u.attackCycleAt??this.time))+u.def.interval;u.cooldown=Math.max(0,u.nextAttackAt-this.time);u.windup=null;
 }
 move(u,t,dt,speedRate=1,intent=null){
  if(!t||u.attachedTo||u.building||!u.def.speedTiles||dt<=0||speedRate<=0)return;
  const charge=u.charged?(u.def.source.ChargeSpeedMultiplier||200)/100:1;
  // Routing has a range-aware goal and smooth line-of-sight segments. The
  // navigator preserves hover/jump water permissions without ignoring buildings.
  const waypoint=this.navigator.next(this,u,t,intent);if(!waypoint)return;
  const dx=waypoint.x-u.x/SX,dy=waypoint.y-u.y/SY,len=Math.hypot(dx,dy);if(len<EPS)return;
  const r=u.def.source;
  // Only jump-enabled ground bodies leap off the bank; bridge travel is ordinary
  // movement and hover permissions do not imply a jump animation.
  const predicted={x:u.x/SX+dx/len*u.def.speedTiles*speedRate*dt,y:u.y/SY+dy/len*u.def.speedTiles*speedRate*dt};
  if(!u.riverJump&&!u.air&&r.JumpEnabled&&Math.abs(dy)>EPS&&!Nav.waterClear(predicted.x,16,u.def.radiusTiles,this.arenaLayout.id)&&predicted.y>15&&predicted.y<17){u.riverJump={direction:Math.sign(dy),progress:0};}
  const speed=u.riverJump?(Number(r.JumpSpeed)||Number(r.Speed))/60:u.def.speedTiles*charge,maxStep=speed*speedRate*dt;
  const step=Math.min(maxStep,len),solids=this.navigator.solids;
  u.motionIntent={time:this.time,x:u.x,y:u.y,dx:dx/len,dy:dy/len,step};
  const moved=u.air?{x:u.x+dx/len*step*SX,y:u.y+dy/len*step*SY,blocked:false}:Pathing.sweptStep(u,dx/len*step*SX,dy/len*step*SY,solids);
  const actual=Math.hypot((moved.x-u.x)/SX,(moved.y-u.y)/SY);u.x=moved.x;u.y=moved.y;
  if(u.riverJump){u.riverJump.progress=clamp(u.riverJump.direction<0?(17-u.y/SY)/2:(u.y/SY-15)/2,0,1);if(u.riverJump.progress>=1){u.riverJump=null;if(r.LandingEffect)this.effect({kind:'source',sourceEffect:r.LandingEffect,x:u.x,y:u.y,team:u.team,ttl:1});}}
  if(actual>EPS){u.heading=Math.atan2(dy,dx);u.facing=dy<0?-1:1;u.walk+=actual;u.chargeDistance+=actual;}
  if(moved.blocked){u.navPath=null;this.navigator.sampleTime=-1;}
  if(u.def.source.ChargeRange&&u.chargeDistance>=u.def.source.ChargeRange/100){if(!u.charged&&u.def.source.ChargeEffect)this.effect({kind:'source',sourceEffect:u.def.source.ChargeEffect,x:u.x,y:u.y,team:u.team,follow:u.id,angle:u.heading,ttl:2});u.charged=true;}
  if(u.visualState!=='run'){u.visualState='run';u.visualStarted=this.time;u.animationTime=0;}
 }
 startDash(u,t){const r=u.def.source;u.visualAttack=null;u.visualHook=null;u.visualAttackCancelled=false;u.dash={target:t.id,windup:this.time+sec(r.DashCooldown||800),moving:false,from:null,progress:0};u.visualState='idle';}
 tickDash(u,dt){const d=u.dash,t=this.getEntity(d.target);if(!t||t.hp<=0){u.dash=null;return;}if(this.time<d.windup)return;
  if(!d.moving){d.moving=true;d.from={x:u.x,y:u.y};const distance=dist(u,t)||1,contact=Math.min(distance,(u.def.radiusTiles+t.def.radiusTiles)+.015);d.to={x:t.x+(u.x-t.x)/distance*contact,y:t.y+(u.y-t.y)/distance*contact};d.duration=sec(u.def.source.DashConstantTime)||Math.max(.1,dist(u,t)/((u.def.source.JumpSpeed||500)/60));u.visualState='dash';u.visualStarted=this.time;u.animationTime=0;if(u.def.source.DashEffect)this.effect({kind:'source',sourceEffect:u.def.source.DashEffect,x:u.x,y:u.y,team:u.team,follow:u.id,angle:u.heading,ttl:d.duration});}
  d.progress=Math.min(1,d.progress+dt/d.duration);u.x=d.from.x+(d.to.x-d.from.x)*d.progress;u.y=d.from.y+(d.to.y-d.from.y)*d.progress;u.heading=Math.atan2((d.to.y-d.from.y)/SY,(d.to.x-d.from.x)/SX);
  if(d.progress>=1){const r=u.def.source,damage=this.scaleStat(r.DashDamage,r.Rarity,u.level);if(r.DashRadius)this.hitArea({team:u.team,x:u.x,y:u.y,radius:r.DashRadius/1000,damage,source:u,ground:true,air:false,push:(r.DashPushBack||0)/1000});else this.damage(t,damage,u);u.dash=null;u.nextAttackAt=this.time+u.def.interval;u.lastAttackAt=this.time;u.visualState='attack';u.animationTime=0;u.visualAttack={windup:0,releasedAt:0};this.effect({kind:'blast',x:u.x,y:u.y,radius:(r.DashRadius||800)/1000*SY,ttl:.3,team:u.team});}
 }
 tickEntity(u,dt){return this.withOwner(u.owner??u.team,()=>this.tickEntityOwned(u,dt));}
 tickEntityOwned(u,dt){
  if(!this.isPresent(u))return;this.tickBuffs(u);if(u.hp<=0)return;u.hit=Math.max(0,u.hit-dt);u.attack=Math.max(0,u.attack-dt);u.wait=Math.max(0,u.readyAt-this.time);if(u.wait>0)return;const r=u.def.source;
  if(u.king&&!u.active){if(this.time>=u.activationAt){this.activateKing(u);}else return;}
  if(this.time>=u.expires){u.hp=0;return;}
  if(u.def.life)u.hp=Math.max(0,u.hp-u.maxHp*dt/u.def.life);
  if(u.attachedTo){const parent=this.getEntity(u.attachedTo);if(!parent||parent.hp<=0){u.hp=0;return;}u.x=parent.x+(u.attachmentIndex?-.45:.45)*SX;u.y=parent.y-.8*SY;u.heading=parent.heading;}
  if(!u.attachmentsStarted&&r.SpawnAttach){u.attachmentsStarted=true;for(let i=0;i<(r.SpawnNumber||1);i++)this.spawn(r.SpawnCharacter,u.team,u.x,u.y,{level:u.level,wait:0,attachedTo:u.id,attachmentIndex:i});}
  const rates=this.buffs(u);
  if(rates.speed||rates.attack){u.visualTime+=dt;u.animationTime+=dt*(u.visualState==='run'?rates.speed:rates.attack);}
  // Buffs affect the remaining portion of the current production cycle, too.
  // Moving its deadline pauses it under Freeze and speeds it up under Rage.
  if(r.ManaGenerateTimeMs)u.manaAt+=dt*(1-rates.spawn);
  if(r.SpawnCharacter&&!r.SpawnAttach)u.nextSpawnAt+=dt*(1-rates.spawn);
  if(r.ManaGenerateTimeMs&&rates.spawn>0&&this.time>=u.manaAt){this.creditElixir(u.owner??u.team,r.ManaCollectAmount||1);u.manaAt+=sec(r.ManaGenerateTimeMs);this.effect({kind:'elixir',x:u.x,y:u.y-30,team:u.team,ttl:.8});}
  if(r.SpawnCharacter&&!r.SpawnAttach&&rates.spawn>0&&this.time>=u.nextSpawnAt&&(!r.SpawnLimit||u.spawned<r.SpawnLimit)){
   const count=r.SpawnNumber||1,children=this.spawnGroup(r.SpawnCharacter,count,u.team,u.x,u.y+(u.team?-1:1)*-.7*SY,u.level,{radius:(r.SpawnRadius||750)/1000,stagger:sec(r.SpawnInterval),wait:.35});if(r.SpawnCharacterEffect)for(const child of children){const delay=Math.max(0,child.appearsAt-this.time);this.effect({kind:'source',sourceEffect:r.SpawnCharacterEffect,x:child.x,y:child.y,team:u.team,delay,ttl:4+delay});}u.spawned+=count;u.nextSpawnAt=this.time+sec(r.SpawnPauseTime||r.SpawnInterval||1000);if(r.DestroyAtLimit&&u.spawned>=r.SpawnLimit)u.hp=0;
  }
  if(!rates.speed&&!rates.attack)return;
  if(u.duoKing){this.tickKingCannons(u,dt,rates.attack);return;}
  if(u.drag){const v=u.drag.to,dd=dist(u,v),step=u.drag.speed*dt;if(dd<=step){u.x=v.x;u.y=v.y;u.drag=null;}else{u.x+=(v.x-u.x)/dd*step;u.y+=(v.y-u.y)/dd*step;}return;}
  if(u.dash){this.tickDash(u,dt);return;}
  if(u.hook){const target=this.getEntity(u.hook.target);if(!this.canTarget(u,target)){this.cancelAttackVisual(u);u.hook=null;u.targetId=null;u.nextAttackAt=this.time;return;}
   u.hook.remaining-=dt*rates.attack;
   if(u.hook.remaining<=EPS){this.fireProjectile('FishermanProjectile',u,target);u.visualHook={phase:'outbound'};u.hook=null;u.nextAttackAt=this.time+u.def.interval;u.lastAttackAt=this.time;u.lastCombatAt=this.time;}
   return;
  }
  if(!u.windup)u.precharge=Math.min(r.LoadFirstHit?u.def.interval:Math.min(u.def.interval,sec(r.LoadTime)),(u.precharge||0)+dt*rates.attack);
  // The same actor may remain the nearest navigation destination after its
  // pending hit becomes invalid. Cancel the hit independently of target ID.
  if(u.windup&&!this.canCompleteHit(u,this.getEntity(u.windup.target))){this.cancelAttackVisual(u);u.windup=null;u.lockTime=0;}
  const intent=this.targetDecision(u),t=intent.target;if(t?.id!==u.targetId){this.cancelAttackVisual(u);u.targetId=t?.id||null;u.lockTime=0;u.windup=null;}else if(t&&edge(u,t)<=u.def.range)u.lockTime+=dt;else u.lockTime=0;
  if(r.BuffWhenNotAttacking==='Invisibility')u.invisible=this.time-u.lastAttackAt>=sec(r.BuffWhenNotAttackingTime||1600);
  if(r.BuffWhenNotAttacking&&r.BuffWhenNotAttacking!=='Invisibility'&&this.time-u.lastCombatAt>=sec(r.BuffWhenNotAttackingTime))this.addBuff(u,r.BuffWhenNotAttacking,1,u.team,u.level);
  if(r.HidesWhenNotAttacking){
   u.hidden=!t||edge(u,t)>u.def.range;
   // A separate transition clock keeps the combined appear/hide artwork out
   // of the attack cycle. Freeze/stun pause this clock along with attacks.
   const visual=u.hideVisual||(u.hideVisual={progress:u.hidden?0:1,direction:0}),goal=u.hidden?0:1,duration=sec(u.hidden?r.HideTimeMs:r.UpTimeMs)||.8;
   visual.direction=Math.sign(goal-visual.progress);visual.progress=clamp(visual.progress+visual.direction*dt*rates.attack/duration,0,1);
   if(Math.abs(goal-visual.progress)<EPS){visual.progress=goal;visual.direction=0;}
  }
  if(!t){if(this.isTouchdown&&!u.building&&!u.attachedTo){const goalY=(u.team===0?this.arenaLayout.goalTop:this.arenaLayout.goalBottom)*SY,goal={x:u.x,y:goalY,def:{radiusTiles:0}};this.move(u,goal,dt,rates.speed,{kind:'touchdown'});return;}u.visualState='idle';return;}
  const d=edge(u,t);u.heading=Math.atan2((t.y-u.y)/SY,(t.x-u.x)/SX);
  if(r.DashDamage&&dist(u,t)>=r.DashMinRange/1000&&dist(u,t)<=r.DashMaxRange/1000&&this.time>=u.nextAttackAt){this.startDash(u,t);return;}
  if(r.ProjectileSpecial==='FishermanProjectile'&&d>=r.SpecialMinRange/1000&&d<=r.SpecialRange/1000&&this.time>=u.nextAttackAt){u.hook={target:t.id,remaining:sec(r.SpecialLoadTime)};u.visualHook={phase:'windup'};u.visualAttackCancelled=false;u.visualState='attack';u.visualStarted=this.time;u.animationTime=0;return;}
  if(u.windup){u.windup.remaining-=dt*rates.attack;if(u.windup.remaining<=0){if(this.canCompleteHit(u,t))this.strike(u,t);else{this.cancelAttackVisual(u);u.windup=null;u.nextAttackAt=this.time+.1;}}return;}
  if(d<=u.def.range+EPS&&d+EPS>=u.def.minRange){if(u.visualState!=='attack'||u.animationTime>=u.visualDuration)u.visualState='idle';if(this.time>=u.nextAttackAt&&rates.attack>0){this.startAttack(u,t);if(u.windup.remaining<=0)this.strike(u,t);}else if(rates.attack!==1)u.nextAttackAt-=dt*(rates.attack-1);}
  else this.move(u,t,dt,rates.speed,intent);
  u.cooldown=Math.max(0,u.nextAttackAt-this.time);
 }
 tickBuffs(u){for(const [name,b]of Object.entries(u.buffs)){if(b.until+EPS<this.time)continue;const r=DATA.buffs[b.name||name]||{};if((r.DamagePerSecond||r.HealPerSecond)&&this.time+EPS>=b.nextTick){const interval=sec(r.HitFrequency||500);if(r.DamagePerSecond){let n=this.scaleStat(r.DamagePerSecond,r.Rarity,b.level)*interval;if(u.building&&!isTower(u)&&r.BuildingDamagePercent)n*=r.BuildingDamagePercent/100;this.damage(u,n,null,{crownPercent:r.CrownTowerDamagePercent,affectsHidden:(b.name||name)==='Earthquake',team:b.sourceTeam});}if(r.HealPerSecond)this.heal(u,this.scaleStat(r.HealPerSecond,r.Rarity,b.level)*interval);b.nextTick+=interval;}}}
 // Both barrels use their own position, range, target lock and first-hit delay.
 tickKingCannons(u,dt,rate){
  if(rate<=0)return;
  for(const cannon of u.cannons){
   cannon.cooldown=Math.max(0,(cannon.cooldown||0)-dt*rate);
   const controller={...u,duoKing:false,x:u.x+cannon.side*u.cannonOffset,targetId:cannon.targetId,heading:cannon.heading,windup:cannon.windup===null?null:{target:cannon.targetId,remaining:cannon.windup}};
   if(controller.windup&&!this.canCompleteHit(controller,this.getEntity(cannon.targetId))){cannon.windup=null;cannon.cooldown=0;controller.windup=null;}
   const target=this.chooseTarget(controller);
   if(!target){cannon.targetId=null;cannon.windup=null;continue;}
   if(cannon.targetId!==target.id){cannon.targetId=target.id;cannon.windup=null;}
   if(cannon.windup===null&&edge(controller,target)>u.def.range+EPS){cannon.targetId=null;continue;}
   cannon.heading=Math.atan2((target.y-u.y)/SY,(target.x-controller.x)/SX);controller.heading=cannon.heading;
   if(cannon.windup!==null){cannon.windup-=dt*rate;if(cannon.windup<=EPS){this.fireProjectile(u.def.projectile,controller,target,{secondary:cannon.side>0});cannon.windup=null;this.effect({kind:'source',sourceEffect:u.def.source.ProjectileEffect,x:controller.x,y:controller.y,height:35,team:u.team,ttl:1});}}
   else if(cannon.cooldown<=EPS){cannon.windup=u.def.firstHit;cannon.cooldown=u.def.interval;}
  }
  u.targetId=u.cannons[0].targetId;u.secondaryTargetId=u.cannons[1].targetId;u.heading=u.cannons[0].heading;
 }
 fireProjectile(name,source,target,opt={}){
  if(name==='KingProjectile'&&source.king)this.kingShots++;
  const r=DATA.projectiles[name];if(!r)return null;const goal=target||opt;let dx=(goal.x-source.x)/SX,dy=(goal.y-source.y)/SY,len=Math.hypot(dx,dy);if(len<EPS){dx=0;dy=source.team?1:-1;len=1;}
  const angle=Math.atan2(dy,dx)+(opt.angle||0),vx=Math.cos(angle),vy=Math.sin(angle),range=(r.ProjectileRange||0)/1000;
  const p={id:this.nextId++,name,owner:source.owner??this._owner??source.team,source:source.id,attacker:source,team:source.team,level:opt.level??source.level??9,x:source.x,y:source.y,previousX:source.x,previousY:source.y,startX:source.x,startY:source.y,target:target?.id||null,tx:range?source.x+vx*range*SX:goal.x,ty:range?source.y+vy*range*SY:goal.y,vx,vy,speed:(r.Speed||800)/60,range,travel:0,previousTravel:0,lastStepDt:0,radius:(r.ProjectileRadius||r.Radius||200)/1000,line:!!range,hit:new Set(),done:false,born:this.time,spell:!!opt.spell,returning:false,damageOverride:isTower(source)?source.def.damage:undefined};
  p.constantHeight=Number(r.ConstantHeight)>0?Number(r.ConstantHeight)/1000*SY:null;p.launchHeight=p.line?0:opt.spell?52:(source.def?.source?.FlyingHeight||0)/1000*SY+(source.def?.source?.AttachedCharacterHeight?source.def.source.AttachedCharacterHeight/1000*SY:source.building?32:20);p.gravity=r.Gravity||0;
  p.launchDistance=dist(source,{x:p.tx,y:p.ty});
  this.projectiles.push(p);return p;
 }
 projectileDamage(p,t){const r=DATA.projectiles[p.name];const damage=p.damageOverride??this.scaleStat(r.Damage,r.Rarity||'Common',p.level);this.damage(t,damage,p.attacker,{crownPercent:r.CrownTowerDamagePercent});if(r.TargetBuff)this.addBuff(t,r.TargetBuff,sec(r.BuffTime||500),p.team,p.level);if(r.Pushback)this.push(t,t.x-p.x,t.y-p.y,r.Pushback/1000,r.PushbackAll);}
 projectileImpact(p,target){return this.withOwner(p.owner??p.team,()=>this.projectileImpactOwned(p,target));}
 projectileImpactOwned(p,target){const r=DATA.projectiles[p.name];const radius=(r.Radius||0)/1000;
  if(radius&&r.Damage){this.hitArea({team:p.team,x:p.x,y:p.y,damage:p.damageOverride??this.scaleStat(r.Damage,r.Rarity,p.level),radius,ground:r.AoeToGround!==false,air:r.AoeToAir===true,source:p.attacker,crownPercent:r.CrownTowerDamagePercent,push:(r.Pushback||0)/1000,forcePush:r.PushbackAll,buff:r.TargetBuff,buffTime:sec(r.BuffTime||500),level:p.level});}
  else if(target&&target.hp>0)this.projectileDamage(p,target);
  if(r.ChainedHitCount&&target){const visited=new Set([target.id]);let current=target;for(let i=1;i<r.ChainedHitCount;i++){const next=this.active.filter(u=>u.team!==p.team&&!u.attachedTo&&!u.hidden&&!visited.has(u.id)&&dist(u,current)<=(r.ChainedHitRadius||3500)/1000).sort((a,b)=>dist(a,current)-dist(b,current))[0];if(!next)break;visited.add(next.id);this.projectileDamage(p,next);this.effect({kind:'beam',x:current.x,y:current.y-15,tx:next.x,ty:next.y-15,team:p.team,ttl:.3});current=next;}}
  if(r.SpawnCharacter)this.spawnGroup(r.SpawnCharacter,r.SpawnCharacterCount||1,p.team,p.x,p.y,p.level,{formation:p.name==='GoblinBarrelSpell'?'barrel':null,card:p.name==='GoblinBarrelSpell'?'goblin-barrel':r.SpawnCharacter,radius:(r.Radius||1000)/1000,wait:r.SpawnCharacterDeployTime!==undefined?sec(r.SpawnCharacterDeployTime):.5});
  if(r.SpawnAreaEffectObject)this.createArea(r.SpawnAreaEffectObject,p.team,p.x,p.y,p.level);
  if(r.SpawnProjectile){const child=DATA.projectiles[r.SpawnProjectile]||{},count=Math.max(1,Math.min(30,r.SpawnCount||child.SpawnCount||1));for(let i=0;i<count;i++){const angle=(i-(count-1)/2)*.19;const origin={...p.attacker,x:p.x,y:p.y,team:p.team,level:p.level};this.fireProjectile(r.SpawnProjectile,origin,null,{x:p.x+p.vx*6*SX,y:p.y+p.vy*6*SY,angle,level:p.level});}}
  if(r.DragBackSpeed&&target){const source=this.getEntity(p.source);if(source){if(target.building){const d=dist(source,target)||1,margin=(target.def.radiusTiles+source.def.radiusTiles+.4)/d;source.drag={to:{x:target.x+(source.x-target.x)*margin,y:target.y+(source.y-target.y)*margin},speed:(r.DragSelfSpeed||450)/60};}else{const d=dist(source,target)||1,margin=(source.def.radiusTiles+target.def.radiusTiles+.25)/d;target.drag={to:{x:source.x+(target.x-source.x)*margin,y:source.y+(target.y-source.y)*margin},speed:r.DragBackSpeed/60};target.charged=false;target.windup=null;}const dragged=target.building?source:target,duration=dist(dragged,dragged.drag.to)/dragged.drag.speed;source.visualHook={phase:'pull',startedAt:source.animationTime,duration};this.effect({kind:'beam',sourceBeam:r.DragEffect||null,source:source.id,target:target.id,x:source.x,y:source.y,tx:target.x,ty:target.y,team:p.team,ttl:Math.max(.1,duration)});}}
  else if(r.DragBackSpeed){const source=this.getEntity(p.source);if(source)source.visualHook=null;}
  this.effect({kind:'impact',sourceEffect:r.HitEffect||null,projectile:p.name,x:p.x,y:p.y,team:p.team,angle:Math.atan2(p.vy,p.vx),radius:Math.max(8,radius*SY),ttl:r.HitEffect?6:.35});
 }
 tickProjectiles(dt){for(const p of this.projectiles){if(p.done)continue;const r=DATA.projectiles[p.name],t=this.getEntity(p.target);if(p.returning){const source=this.getEntity(p.source);if(source){p.tx=source.x;p.ty=source.y;}}else if(r.Homing&&t?.hp>0&&!p.line){p.tx=t.x;p.ty=t.y;}
   p.previousX=p.x;p.previousY=p.y;p.previousTravel=p.travel;p.lastStepDt=dt;let dx=(p.tx-p.x)/SX,dy=(p.ty-p.y)/SY,d=Math.hypot(dx,dy),step=Math.min(d,p.speed*dt),old={x:p.x,y:p.y};if(d>EPS){p.vx=dx/d;p.vy=dy/d;p.x+=p.vx*step*SX;p.y+=p.vy*step*SY;}p.travel+=step;
   if(p.line){const hits=[];for(const v of this.active){if(v.team===p.team||v.attachedTo||!this.isPresent(v)||v.hidden||v.air&&!r.AoeToAir||!v.air&&r.AoeToGround===false||p.hit.has(v.id))continue;const vx=(p.x-old.x)/SX,vy=(p.y-old.y)/SY,wx=(v.x-old.x)/SX,wy=(v.y-old.y)/SY,l=vx*vx+vy*vy,dot=wx*vx+wy*vy,q=l?clamp(dot/l,0,1):0,near=Math.hypot(wx-vx*q,wy-vy*q),radius=p.radius+v.def.radiusTiles;if(near<=radius){const perpendicular=l?Math.max(0,wx*wx+wy*wy-dot*dot/l):0,entry=l?clamp((dot-Math.sqrt(Math.max(0,(radius*radius-perpendicular)*l)))/l,0,1):0;hits.push({v,entry});}}
    // Collision-stopping pellets must hit the front body, independent of spawn order.
    hits.sort((a,b)=>a.entry-b.entry||a.v.id-b.v.id);for(const {v} of hits){p.hit.add(v.id);this.projectileDamage(p,v);if((p.name==='EliteArcherArrow'||p.name==='FirecrackerExplosion')&&r.HitEffect)this.effect({kind:'impact',sourceEffect:r.HitEffect,projectile:p.name,x:v.x,y:v.y,team:p.team,angle:Math.atan2(p.vy,p.vx),radius:8,ttl:.35});if(r.CheckCollisions){p.done=true;break;}}
   }
   if(d<=step+EPS||p.travel>35){if(p.line){const boomerang=/AxeMan/.test(p.name)||r.PingpongDeathEffect;if(boomerang&&!p.returning){p.returning=true;p.hit.clear();const a=this.getEntity(p.source);if(a){p.tx=a.x;p.ty=a.y;}else p.done=true;}else{if(r.SpawnCharacter||r.SpawnProjectile||r.SpawnAreaEffectObject)this.projectileImpact({...p,damageOverride:0},null);if(r.DeathEffect)this.effect({kind:'source',sourceEffect:r.DeathEffect,x:p.x,y:p.y,team:p.team,ttl:6});p.done=true;}}
    else{this.projectileImpact(p,t?.hp>0?t:null);p.done=true;}}
  }this.projectiles=this.projectiles.filter(p=>!p.done);
 }
 createArea(name,team,x,y,level=9){const r=DATA.areas[name];if(!r)return null;const duration=sec(r.LifeDuration||1)+Math.max(0,level-K.baseLevel(r.Rarity))*sec(r.LifeDurationIncreasePerLevel||0),a={id:this.nextId++,name,owner:this._owner??team,team,x,y,level,born:this.time,ends:this.time+duration,nextTick:this.time,nextSpawn:this.time+sec(r.SpawnInitialDelay||0),applied:false,spawned:0,radius:(r.Radius||0)/1000};this.areas.push(a);if(r.OneShotEffect)this.effect({kind:'source',sourceEffect:r.OneShotEffect,x,y,team,ttl:6});return a;}
 areaTargets(a){const r=DATA.areas[a.name];return this.active.filter(u=>!u.effectCarrier&&!u.attachedTo&&this.isPresent(u)&&(!u.hidden||r.AffectsHidden)&&(!r.OnlyEnemies||u.team!==a.team)&&(!r.OnlyOwnTroops||u.team===a.team)&&(!r.IgnoreBuildings||!u.building)&&(!u.air||r.HitsAir)&& (u.air||r.HitsGround!==false)&&dist(u,a)<=a.radius+u.def.radiusTiles);}
 tickAreas(dt=1/60){for(const a of this.areas)this.withOwner(a.owner??a.team,()=>this.tickArea(a,dt));this.areas=this.areas.filter(a=>!a.applied||this.time<a.ends+EPS);}
 tickArea(a,dt=1/60){const r=DATA.areas[a.name],targets=this.areaTargets(a);if(!a.applied){a.applied=true;
    if(r.Clone){for(const u of targets.filter(u=>u.team===a.team&&!u.building&&!u.cloned)){const clone=this.spawn(u.entity,u.team,u.x+.7*SX,u.y,{level:u.level,wait:.5,cloned:true,card:u.card});if(clone){clone.shield=u.shield>0?1:0;clone.buffs={};}}}
    else if(a.name==='Lightning'){for(const [i,t]of targets.filter(t=>t.team!==a.team).sort((x,y)=>y.hp-x.hp).slice(0,3).entries())this.schedule({type:'target-impact',name:r.Projectile,team:a.team,target:t.id,level:a.level,due:this.time+i*.3});}
    else if(a.name==='RoyalDeliveryArea'){this.schedule({type:'impact',name:r.Projectile,team:a.team,x:a.x,y:a.y,level:a.level,due:this.time+sec(r.SpawnInitialDelay||2050)});}
    else if(r.Damage)for(const u of targets)this.damage(u,this.scaleStat(r.Damage,r.Rarity,a.level),null,{crownPercent:r.CrownTowerDamagePercent,affectsHidden:r.AffectsHidden});
   }
   if(this.time<=a.ends+EPS&&r.SpawnCharacter&&this.time>=a.nextSpawn&&(!r.SpawnMaxCount||a.spawned<r.SpawnMaxCount)){
    const ang=this.random()*Math.PI*2,rad=(r.SpawnMinRadius||500)/1000+this.random()*((r.SpawnMaxRadius||r.Radius||3000)-(r.SpawnMinRadius||500))/1000,sx=a.x+Math.cos(ang)*rad*SX,sy=a.y+Math.sin(ang)*rad*SY;this.spawn(r.SpawnCharacter,a.team,sx,sy,{level:a.level,wait:sec(r.SpawnTime||400)});if(r.SpawnEffect)this.effect({kind:'source',sourceEffect:r.SpawnEffect,x:sx,y:sy,team:a.team,ttl:4});a.spawned++;a.nextSpawn+=sec(r.SpawnInterval||500);
   }
   if(this.time<=a.ends+EPS&&this.time>=a.nextTick&&!r.Clone){
    if(r.Buff)for(const u of targets){let duration=sec(r.BuffTime||500);if(r.CapBuffTimeToAreaEffectTime||r.ControlsBuff)duration=Math.min(duration,Math.max(0,a.ends-this.time));this.addBuff(u,r.Buff,duration,a.team,a.level,a.id,DATA.buffs[r.Buff]?.HitTickFromSource?a.born:null);}
    a.nextTick=r.HitSpeed?this.time+sec(r.HitSpeed):Infinity;
   }
   // Preserve the existing 60 Hz pull speed at every simulation step size.
   // Attraction is not knockback: its source buff does not disable attacks.
   if(a.name==='Tornado'&&this.time<=a.ends){for(const u of targets.filter(u=>!u.building)){const d=dist(u,a);if(d>.15){const pull=Math.min(4.5*dt,d);this.push(u,a.x-u.x,a.y-u.y,pull,true,false);}}}

 }
 tickPending(){const due=this.pending.filter(p=>p.due<=this.time+EPS);this.pending=this.pending.filter(p=>p.due>this.time+EPS);for(const p of due)this.withOwner(p.owner??p.team,()=>this.resolvePending(p));}
 resolvePending(p){
  if(p.type==='visual'){this.effect(p);return;}
  if(p.type==='area'){this.createArea(p.name,p.team,p.x,p.y,p.level);return;}
  if(p.type==='hook'){const a=this.getEntity(p.source),t=this.getEntity(p.target);if(a?.hp>0&&t?.hp>0)this.fireProjectile('FishermanProjectile',a,t);return;}
  if(p.type==='rolling'){const r=DATA.projectiles[p.name];if(r)this.fireProjectile(p.name,{id:0,team:p.team,x:p.x,y:p.y,level:p.level,entity:'Spell',def:{source:{},radiusTiles:0}},null,{x:p.x,y:p.y+(p.team?1:-1)*10*SY,level:p.level,spell:true});return;}
  if(p.type==='impact'||p.type==='target-impact'){const t=this.getEntity(p.target),x=t?.x??p.x,y=t?.y??p.y;if(!Number.isFinite(x)||!Number.isFinite(y))return;this.projectileImpact({name:p.name,team:p.team,x,y,level:p.level,vx:0,vy:p.team?1:-1,source:0,attacker:null},t);}
 }
 deaths(){const priorOwner=this._owner;try{this.deathsOwned();}finally{this._owner=priorOwner;}}
 deathsOwned(){let passes=0;while(passes++<8){const dead=this.active.filter(()=>false);for(const u of [...this.towers,...this.units])if(u.hp<=0&&!u.dead)dead.push(u);if(!dead.length)break;
   for(const u of dead){this._owner=u.owner??u.team;u.dead=true;u.alive=false;if(!u.effectCarrier){if(this.metrics.lost[u.team]!==undefined)this.metrics.lost[u.team]++;const killer=Number.isInteger(u.lastDamageTeam)&&u.lastDamageTeam!==u.team?u.lastDamageTeam:null;if(killer!==null&&this.metrics.kills[killer]!==undefined)this.metrics.kills[killer]++;}this.record({type:'death',team:u.team,owner:u.owner,entity:u.entity,card:u.card,id:u.id,tower:isTower(u)});const r=u.def.source;
    if(isTower(u)){u.destroyed=true;const winner=this.isFFA?(Number.isInteger(u.lastDamageTeam)?u.lastDamageTeam:null):1-u.team,before=winner===null?0:(this.crowns[winner]||0);if(winner!==null&&!this.isFFA)this.crowns[winner]=this.is5v5?Math.min(5,before+(u.king?1:0)):this.isTeamElimination?Math.min(this.seatCount,before+1):u.king?(this.mode==='BridgeBattle'?2:3):Math.min(3,before+1);const awarded=winner===null||this.isFFA?0:this.crowns[winner]-before;const king=this.towers.find(t=>t.king&&t.team===u.team&&(!this.isTeamElimination||t.owner===u.owner));if(king)this.scheduleKingActivation(king);
     // The shipped data has dedicated crown-tower death graphs. Keep the tower
     // collapse cloud as a separate layer, then launch the visible crown above
     // the destroyed tower just like the native crown-award sequence.
     this.effect({kind:'towerDown',x:u.x,y:u.y,team:u.team,ttl:1.5});
     this.effect({kind:'source',sourceEffect:u.king?'crown_tower_death2':'crown_tower_death1',x:u.x,y:u.y,team:u.team,ttl:4});
     if(awarded>0)this.effect({kind:'crownAward',x:u.x,y:u.y,team:winner,amount:awarded,ttl:3.55});
     if(awarded>0)this.record({type:'crown',team:winner,amount:awarded,tower:u.king?'king':'princess',towerId:u.id});
     continue;}
    const curse=u.buffs.VoodooCurse;if(curse&&curse.until>this.time&&!u.building)this.spawn('VoodooHog',curse.sourceTeam,u.x,u.y,{level:curse.level,wait:.5});
    if(r.DeathDamage)this.hitArea({team:u.team,x:u.x,y:u.y,radius:(r.DeathDamageRadius||1000)/1000,damage:this.scaleStat(r.DeathDamage,r.Rarity,u.level),source:u,ground:r.AttacksGround!==false,air:!!r.AttacksAir,push:(r.DeathPushBack||0)/1000});
    if(r.DeathAreaEffect)this.createArea(r.DeathAreaEffect,u.team,u.x,u.y,u.level);
    for(const [f,n]of [['DeathSpawnCharacter','DeathSpawnCount'],['DeathSpawnCharacter2','DeathSpawnCount2'],['DeathSpawnCharacter3','DeathSpawnCount3']])if(r[f]){
     const morph=f==='DeathSpawnCharacter'&&r.MorphKeepTarget,morphTime=morph?DATA.entities[r[f]]?.MorphTime:undefined;
     const children=this.spawnGroup(r[f],r[n]||1,u.team,u.x,u.y,u.level,{radius:(r.DeathSpawnRadius||700)/1000,cloned:u.cloned,wait:morphTime!==undefined?sec(morphTime):r.DeathSpawnDeployTime!==undefined?sec(r.DeathSpawnDeployTime):undefined});
     if(morph)for(const child of children){child.targetId=u.targetId;child.heading=u.heading;}
    }
    if(r.DeathSpawnProjectile)this.schedule({type:'impact',name:r.DeathSpawnProjectile,team:u.team,x:u.x,y:u.y,level:u.level,due:this.time});
    if(r.ManaOnDeath){if(this.isTeamElimination&&/^ElixirGolem/.test(u.entity)){this.creditElixir(u.owner??u.team,r.ManaOnDeath);}else{const enemies=this.seats.filter(s=>this.teamOf(s)!==u.team);for(const seat of enemies)this.creditElixir(seat,r.ManaOnDeath/enemies.length);}}
    for(const child of this.units)if(child.attachedTo===u.id)child.hp=0;
    this.effect({kind:'poof',sourceEffect:r.DeathEffect||null,x:u.x,y:u.y,team:u.team,ttl:r.DeathEffect?4:.55});
   }
  }this.units=this.units.filter(u=>!u.dead);
 }
 separate(dt=1/60){
  if(dt<=0)return;
  const us=this.units.filter(u=>this.isPresent(u)&&!u.building&&!u.attachedTo&&!u.dash?.moving&&!u.drag);
  // Position constraints remove actual penetration along the normal. The old
  // tangential-only correction changed lanes but left bodies inside each other.
  // Source masses govern which body yields; air and ground never push each other.
  for(let pass=0;pass<6;pass++){let penetrated=false;for(let i=0;i<us.length;i++)for(let j=i+1;j<us.length;j++){
   const a=us[i],b=us[j];if(a.air!==b.air)continue;
   let dx=(b.x-a.x)/SX,dy=(b.y-a.y)/SY,min=a.def.radiusTiles+b.def.radiusTiles;
   // An axis beyond the existing penetration threshold cannot overlap. Keep
   // the original pair order and exact distance test for every possible hit.
   if(Math.abs(dx)>=min-.003||Math.abs(dy)>=min-.003)continue;
   let d=Math.hypot(dx,dy);
   if(d>=min-.003)continue;
   // Prolonged friendly obstruction gets a small, terrain-checked sideways
   // yield before penetration resolution. No radius reduction or phasing.
   if(pass===0&&a.team===b.team){for(const [u,v]of [[a,b],[b,a]]){
    const m=u.motionIntent;if(!m||m.time!==this.time||(u.crowdWait||0)<.18||u.yieldAt===this.time)continue;
    const rx=(v.x-u.x)/SX,ry=(v.y-u.y)/SY,forward=rx*m.dx+ry*m.dy;if(forward<.05)continue;
    const across=rx*(-m.dy)+ry*m.dx,preferred=Math.abs(across)>.03?-Math.sign(across):((u.id^v.id)&1?1:-1),amount=Math.min(.012,.65*dt);
    for(const sign of [preferred,-preferred]){const point={x:u.x-m.dy*sign*amount*SX,y:u.y+m.dx*sign*amount*SY};if(this.navigator.allows(this,u,point)){u.x=point.x;u.y=point.y;u.yieldAt=this.time;break;}}
   }dx=(b.x-a.x)/SX;dy=(b.y-a.y)/SY;d=Math.hypot(dx,dy);if(d>=min-.003)continue;}
   penetrated=true;
   if(d<EPS){const angle=((a.id*73856093^b.id*19349663)>>>0)%6283/1000;dx=Math.cos(angle);dy=Math.sin(angle);d=1;}
   const nx=dx/d,ny=dy/d,actual=dist(a,b),correction=Math.min(.3,(min-actual)*.7);
   const mass=Math.max(1,a.def.mass+b.def.mass),wa=b.def.mass/mass,wb=a.def.mass/mass;
   const apply=(u,sign,w)=>{const limits=G.Layout.limits(this.arenaLayout.id,u.air),x=clamp(u.x+sign*nx*correction*SX*w,(limits.left+.3)*SX,(limits.right-.3)*SX),y=clamp(u.y+sign*ny*correction*SY*w,(limits.top+.4)*SY,(limits.bottom-.4)*SY);if(this.navigator.allows(this,u,{x,y})){u.x=x;u.y=y;return true;}return false;};
   const aa=apply(a,-1,wa),bb=apply(b,1,wb);
   // A body against a wall cannot absorb its share. Let the free one yield.
   if(!aa&&bb)apply(b,1,wa);else if(aa&&!bb)apply(a,-1,wb);
  }if(!penetrated)break;}
  for(const u of us){const m=u.motionIntent;if(!m||m.time!==this.time){u.crowdWait=0;continue;}const forward=((u.x-m.x)/SX)*m.dx+((u.y-m.y)/SY)*m.dy;u.crowdWait=forward<m.step*.92?Math.min(2,(u.crowdWait||0)+dt):Math.max(0,(u.crowdWait||0)-dt*2);}
 }
 legacyAIPlay(team=1){if(this.paused||this.result||this.tiebreaker)return;const own=this.units.filter(u=>u.team===team&&u.hp>0),enemy=this.units.filter(u=>u.team!==team&&u.hp>0&&!u.attachedTo),threat=enemy.filter(u=>team?u.y<16*SY:u.y>16*SY).sort((a,b)=>a.hp-b.hp)[0];const entries=this.hand[team].map((id,slot)=>({c:this.card(team,slot),slot})).filter(o=>o.c&&o.c.cost<=this.elixir[team]&&this.slotReady[team][o.slot]<=this.time&&!(o.c.id==='mirror'&&!this.lastCard[team]));if(!entries.length)return;
  let pick=entries[Math.floor(this.random()*entries.length)];if(threat){const defend=entries.filter(o=>!o.c.spell&&(threat.air?this.entityDefinition(o.c.entity,o.c.level).targetsAir:true));if(defend.length)pick=defend[Math.floor(this.random()*defend.length)];}
  const c=pick.c;let x=(this.random()<.5?3.5:14.5)*SX,y=(team?10:22)*SY;
  if(threat&&!c.spell){x=clamp(threat.x+(this.random()-.5)*2*SX,SX,17*SX);y=clamp(threat.y+(team?-1:1)*2*SY,team?8*SY:18*SY,team?14*SY:25*SY);}
  if(c.building){x=9*SX+(this.random()-.5)*2*SX;y=(team?11:21)*SY;}
  if(c.spell||c.source.CanDeployOnEnemySide){let target=enemy[Math.floor(this.random()*enemy.length)];if(['rage','clone','heal'].includes(c.id)){target=own.filter(u=>!u.building)[0];if(!target)return;}if(!target)target=this.towers.filter(u=>u.team!==team&&u.hp>0&&!u.king)[0]||this.towers.find(u=>u.team!==team&&u.hp>0);if(target){x=target.x;y=target.y;}}
  if(c.id==='royal-delivery'){if(!threat)return;x=threat.x;y=clamp(threat.y,team?SY:17.5*SY,team?14.5*SY:31*SY);}
  for(let n=0;n<6;n++){const result=this.deploy(team,pick.slot,x,y);if(result.ok)return;x=clamp(x+(this.random()-.5)*4*SX,SX,17*SX);y=team?(8+this.random()*6)*SY:(18+this.random()*6)*SY;}
 }
 specialModeAIPlay(seat){if(this.paused||this.result||this.tiebreaker)return;const team=this.teamOf(seat),entries=this.hand[seat].map((id,slot)=>({slot,c:this.card(seat,slot)})).filter(x=>x.c&&x.c.cost<=this.elixir[seat]+EPS&&this.slotReady[seat][x.slot]<=this.time&&!(x.c.id==='mirror'&&!this.lastCard[seat]));if(!entries.length)return;const pick=entries[Math.floor(this.random()*entries.length)],c=pick.c,a=this.arenaLayout;let x=9*SX,y=team===0?24*SY:8*SY;if(this.isFFA){const q=a.ffaTeams.find(r=>r.team===team),kx=q?.king?.[0]??9,ky=q?.king?.[1]??16,xdir=kx<9?1:-1,ydir=ky<16?1:-1;x=(kx+xdir*(2+this.random()*3))*SX;y=(ky+ydir*(2+this.random()*4))*SY;}else{x=(a.left+1+this.random()*Math.max(1,a.right-a.left-2))*SX;y=(team===0?(20+this.random()*7):(5+this.random()*7))*SY;}if(c.spell||c.source.CanDeployOnEnemySide){const enemies=this.active.filter(u=>u.team!==team&&u.hp>0),target=enemies[Math.floor(this.random()*enemies.length)]||this.towers.find(t=>t.team!==team&&t.hp>0);if(target){x=target.x;y=target.y;}}for(let i=0;i<10;i++){const r=this.deploy(seat,pick.slot,x,y);if(r.ok)return r;x+=(this.random()-.5)*2*SX;y+=(this.random()-.5)*2*SY;}}
 aiPlay(team=1){if(this.paused||this.result||this.tiebreaker)return;if(this.isTouchdown||this.isFFA)return this.specialModeAIPlay(team);return this.bots[team].tick(this);}
 rewardFrame(seat){const team=this.teamOf(seat),m=this.metrics,enemies=Array.from({length:this.teamCount},(_,i)=>i).filter(i=>i!==team),boardValue=side=>this.units.filter(u=>u.team===side&&this.isPresent(u)&&!u.attachedTo&&!u.effectCarrier).reduce((sum,u)=>{const card=K.CARD_BY_ID[u.card],cost=card?.cost||2,count=Math.max(1,card?.count||1),health=(u.hp+u.shield)/Math.max(1,u.maxHp+(u.def.shield||0));return sum+cost/count*clamp(health,0,1);},0);return {dealt:m.combat[team]||0,taken:enemies.reduce((n,i)=>n+(m.combat[i]||0),0),towerFor:m.towerDamage[team]||0,towerAgainst:enemies.reduce((n,i)=>n+(m.towerDamage[i]||0),0),boardFor:boardValue(team),boardAgainst:enemies.reduce((n,i)=>n+boardValue(i),0),crownsFor:this.crowns[team]||0,crownsAgainst:enemies.reduce((n,i)=>n+(this.crowns[i]||0),0),spent:m.spent[seat],leaked:m.leaked[seat]};}
 completeRecording(status){if(this.recorder?.closed)return;for(const seat of this.seats)this.bots[seat].learner?.finish(this.rewardFrame(seat),this.result?.winner??null,this.time);this.recorder?.end(status);}
 abortRecording(reason='left match'){this.record({type:'abandoned',reason});this.completeRecording('abandoned');}
 finish(winner,reason){if(!this.result){this.result={winner,reason,time:this.time};this.record({type:'result',winner,reason});
   // End-screen confetti is a source effect too. visualTime continues after the
   // simulation freezes so the source emitters can finish during the result reveal.
   if(winner>=0){this.effect({kind:'source',sourceEffect:'win_battle_confetti_gold',x:9*SX,y:15*SY,team:winner,ttl:12,delay:1.4});this.effect({kind:'source',sourceEffect:'win_battle_confetti_gold_top',x:9*SX,y:8*SY,team:winner,ttl:12,delay:1.4});}
   this.completeRecording('completed');}}
 startTiebreaker(hp){
  const winner=Math.abs(hp[0]-hp[1])<.5?-1:hp[0]>hp[1]?0:1;
  // Older replay inputs retain their recorded immediate resolution. Equal minima
  // also retain the existing draw and crown count, without inventing free crowns.
  if(!this.tiebreakerEnabled||winner<0)return this.finish(winner,'Tiebreaker');
  // This four-second presentation cadence is local; native cadence is unverified.
  this.tiebreaker={startedAt:this.time,elapsed:0,duration:4,delay:1,drainDuration:3,minimumHp:Math.min(...hp),damage:0,winner,initialHp:this.towers.filter(t=>t.hp>0&&!t.dead&&(!this.is5v5||t.king)).map(t=>({id:t.id,hp:t.hp}))};
  for(const bot of this.bots)bot.intent=null;
  for(const u of this.units){u.previousX=u.x;u.previousY=u.y;}
  this.record({type:'tiebreaker',duration:4,delay:1,drainDuration:3});
 }
 tickTiebreaker(dt){
  const t=this.tiebreaker;t.elapsed=Math.min(t.duration,t.elapsed+dt);if(t.duration-t.elapsed<EPS)t.elapsed=t.duration;
  this.time=t.startedAt+t.elapsed;t.damage=t.minimumHp*clamp((t.elapsed-t.delay)/t.drainDuration,0,1);
  // Set from the frozen initial values, so frame subdivision cannot change which
  // tower loses. The drain is not spell/combat damage and earns no damage reward.
  for(const initial of t.initialHp){const tower=this.getEntity(initial.id);tower.hp=Math.max(0,initial.hp-t.damage);}
  this.effects=this.effects.filter(e=>this.time-e.born<e.ttl);
  if(t.elapsed>=t.duration){this.deaths();this.finish(t.winner,'Tiebreaker');}
  this.recorder?.tick();
 }
 checkTouchdowns(){if(!this.isTouchdown)return;const top=this.arenaLayout.goalTop*SY,bottom=this.arenaLayout.goalBottom*SY;for(const u of this.units){if(u.dead||u.hp<=0||u.building||u.effectCarrier||u.attachedTo)continue;const scored=u.team===0?u.y<=top:u.y>=bottom;if(!scored)continue;u.hp=0;this.crowns[u.team]=(this.crowns[u.team]||0)+1;this.effect({kind:'crownAward',x:u.x,y:u.y,team:u.team,ttl:2});this.record({type:'touchdown',team:u.team,amount:1,unit:u.entity});if(this.crowns[u.team]>=3){this.finish(u.team,'Three touchdowns');return;}}}
 checkResult(){
  if(this.result||this.tiebreaker)return;
  const kings=this.towers.filter(t=>t.king),score=this.victoryScore;
  if(this.isFFA){
   const alive=[0,1,2,3].filter(team=>kings.some(k=>k.team===team&&k.hp>0&&!k.dead));
   if(alive.length===1)return this.finish(alive[0],'Last King standing');
   if(!alive.length)return this.finish(-1,'Draw');
   const lengths=this.timeline.SectionLength||[180,120],normalEnd=lengths[0],total=lengths.reduce((a,b)=>a+b,0);
   if(normalEnd>0&&this.time>=normalEnd&&!this.overtime&&this.timeline.SectionType?.[0]!=='Overtime'){this.overtime=true;this.record({type:'overtime'});}
   if(total>0&&this.time>=total){
    const ratios=alive.map(team=>{const king=kings.find(k=>k.team===team&&k.hp>0&&!k.dead);return{team,ratio:king?king.hp/Math.max(1,king.maxHp):0};}).sort((a,b)=>b.ratio-a.ratio);
    return ratios.length>1&&Math.abs(ratios[0].ratio-ratios[1].ratio)<1e-6?this.finish(-1,'FFA draw'):this.finish(ratios[0].team,'FFA tiebreak');
   }
   return;
  }
  if(this.isTouchdown){const lengths=this.timeline.SectionLength||[180,120],normalEnd=lengths[0],total=lengths.reduce((a,b)=>a+b,0);if(normalEnd>0&&this.time>=normalEnd&&!this.overtime){if(score[0]!==score[1])return this.finish(score[0]>score[1]?0:1,'Touchdown advantage');this.overtime=true;this.record({type:'overtime'});}if(this.overtime&&score[0]!==score[1])return this.finish(score[0]>score[1]?0:1,'Touchdown sudden death');if(total>0&&this.time>=total)return this.finish(-1,'Touchdown draw');return;}
  if(kings.every(k=>k.hp<=0))return this.finish(-1,'Draw');
  if(this.isTeamElimination){const dead=[0,1].find(team=>kings.filter(k=>k.team===team).every(k=>k.hp<=0));if(dead!==undefined)return this.finish(1-dead,'All King towers destroyed');}
  else{const deadKing=kings.find(k=>k.hp<=0);if(deadKing)return this.finish(1-deadKing.team,'King tower destroyed');}
  if(this.overtime&&score[0]!==score[1])return this.finish(score[0]>score[1]?0:1,this.is5v5?'King tower sudden death':'Sudden death');
  const lengths=this.timeline.SectionLength||[180,120],normalEnd=lengths[0],total=lengths.reduce((a,b)=>a+b,0);
  if(normalEnd>0&&this.time>=normalEnd&&!this.overtime&&this.timeline.SectionType?.[0]!=='Overtime'){
   if(score[0]!==score[1])return this.finish(score[0]>score[1]?0:1,this.is5v5?'King tower advantage':'Crown advantage');
   this.overtime=true;this.record({type:'overtime'});
  }
  if(total>0&&this.time>=total){const hp=[0,1].map(team=>Math.min(...this.towers.filter(t=>t.team===team&&t.hp>0&&(!this.is5v5||t.king)).map(t=>t.hp)));this.startTiebreaker(hp);}
 }

 step(dt){if(!Number.isFinite(dt)||dt<=0||this.paused||this.result)return;dt=Math.min(dt,.1);if(this.tiebreaker){this.tickTiebreaker(dt);return;}this.time+=dt;const bar=this.timeline.ElixirFullBarMS?.[this.phase]||28000;for(const t of this.seats){const gained=this.passiveElixirEnabled(t)?dt*10000/bar:0;if(Number.isFinite(this.maxElixir))this.metrics.leaked[t]+=Math.max(0,this.elixir[t]+gained-this.maxElixir);this.elixir[t]=(t===0&&this.cheats.elixir)?(Number.isFinite(this.maxElixir)?this.maxElixir:Math.max(10,this.elixir[t])):Math.min(this.maxElixir,this.elixir[t]+gained);}
  for(const u of this.units){u.previousX=u.x;u.previousY=u.y;}this.tickPending();this.tickAreas(dt);for(const u of [...this.towers,...this.units])this.tickEntity(u,dt);this.tickProjectiles(dt);this.deaths();this.checkTouchdowns();this.separate(dt);this.effects=this.effects.filter(e=>this.time-e.born<e.ttl);if(this.ai&&this.time>=this.aiClock){for(const seat of this.seats)if(seat!==0)this.aiPlay(seat);this.aiClock=this.time+.25;}this.checkResult();this.recorder?.tick();
 }
}
Battle.SX=SX;Battle.SY=SY;return {Battle,rng,dist,edge};});

;
/* Public facade retained for the browser UI and the existing test interface. */
(function(root,factory){const n=typeof module==='object'&&module.exports;const api=factory(n?require('./catalog.js'):root.RoyaleCatalog,n?require('./profile.js'):root.RoyaleProfile,n?require('./battle.js'):root.RoyaleBattle);if(n)module.exports=api;else root.RoyaleCore=api;})(globalThis,function(K,P,B){'use strict';
const W=540,H=960,AW=480,AH=640;
function fitViewport(width,height){if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw RangeError('Viewport dimensions must be positive');const scale=Math.min(width/W,height/H);return {width:W*scale,height:H*scale,x:(width-W*scale)/2,y:(height-H*scale)/2,scale};}
function pointInViewport(x,y,width,height){const v=fitViewport(width,height);if(x<v.x||y<v.y||x>v.x+v.width||y>v.y+v.height)return null;return {x:(x-v.x)/v.scale,y:(y-v.y)/v.scale};}
return {...K,...P,...B,W,H,AW,AH,fitViewport,pointInViewport};});

;
/* Playable offline boat-defense adapter. Simulation uses the uploaded boat
   entities/timeline; its display composes the available original atlas sprites. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./core.js'):root.RoyaleCore);if(n)module.exports=api;else root.RoyaleBoatBattle=api;})(globalThis,function(C){'use strict';
let art={};
async function load(urls){if(typeof Image==='undefined')return;await Promise.all(['boat-body','boat-defense-gun','boat-player-gun'].map(key=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{art[key]=image;resolve();};image.onerror=()=>reject(Error('Boat asset failed: '+key));image.src=urls[key];})));}
function configure(b,configuration){if(b.time!==0)throw Error('Configure a boat battle before simulation');if(!configuration||!Array.isArray(configuration.hp)||configuration.hp.length!==3||!Array.isArray(configuration.cards)||configuration.cards.length!==3)throw Error('Invalid boat defense');
 const cards=configuration.cards.map(d=>{if(!Array.isArray(d)||d.length!==4||d.some(id=>!C.CARD_BY_ID[id]?.entity||C.CARD_BY_ID[id].kind!=='Troop'))throw Error('Boat defenses require four troop cards');return d.slice();});
 b.boatConfiguration=JSON.parse(JSON.stringify({...configuration,cards}));b.boatBonus=false;b.boatEnd=120;b.ai=false;b.practice=true;
 const own=b.makeEntity('KingTowerClanBoatAttacker',0,9*C.SX,28*C.SY,{level:9,wait:0});Object.assign(own,{king:true,boatPart:'attacker',active:true,activationAt:0,skin:'classic'});
 const defenders=[3.5,9,14.5].map((x,i)=>{const t=b.makeEntity('ClanWarsTowerXbow',1,x*C.SX,6*C.SY,{level:9,wait:0});Object.assign(t,{king:false,boatPart:'defender',boatIndex:i,active:false,boatCards:cards[i],boatCycle:0,nextBoatSpawn:Infinity});t.hp=Math.max(0,Math.min(t.maxHp,Number(configuration.hp[i])||0));if(t.hp<=0){t.dead=true;t.destroyed=true;}return t;});
 b.towers=[own,...defenders];const initialDead=defenders.filter(t=>t.hp<=0).length;b.boatInitialDead=initialDead;
 const damage=b.damage;b.damage=function(u,...args){const before=u.hp;const result=damage.call(this,u,...args);if(u.boatPart==='defender'&&u.hp<before&&u.hp>0&&!u.active){u.active=true;u.nextBoatSpawn=this.time+.8;}return result;};
 const tick=b.tickEntity;b.tickEntity=function(u,dt){if(u.boatPart==='defender'){if(!u.active||u.hp<=0)return;if(this.time>=u.nextBoatSpawn){const id=u.boatCards[u.boatCycle++%4],c=C.cardAt(id,9);this.cast(c,1,u.x,u.y+3*C.SY,1);u.nextBoatSpawn=this.time+4.5;}return tick.call(this,u,dt);}return tick.call(this,u,dt);};
 Object.defineProperty(b,'phase',{configurable:true,get(){return this.boatBonus?2:0;}});
 Object.defineProperty(b,'secondsLeft',{configurable:true,get(){return Math.max(0,Math.ceil(this.boatEnd-this.time));}});
 Object.defineProperty(b,'multiplier',{configurable:true,get(){return this.boatBonus?3:1.5;}});
 b.boatHp=()=>defenders.map(t=>Math.max(0,Math.ceil(t.hp)));
 b.checkResult=function(){const dead=defenders.filter(t=>t.hp<=0).length;if(own.hp<=0)return this.finish(1,'Attacker tower destroyed');if(dead===3)return this.finish(0,'Boat defense destroyed');if(dead>initialDead&&!this.boatBonus){this.boatBonus=true;this.boatEnd=this.time+60;this.elixir[0]=10;this.record({type:'boat-bonus'});for(const u of this.units)if(u.team===0&&!u.building)u.hp=0;this.deaths();}if(this.time>=this.boatEnd)return this.finish(dead>initialDead?0:1,dead>initialDead?'Boat attack victory':'Boat attack timed out');};return b;
}
function draw(c,t,time){const body=art['boat-body'],gun=art[t.boatPart==='defender'?'boat-defense-gun':'boat-player-gun'];if(!body||!gun)return false;c.save();c.translate(t.x,t.y);const width=t.boatPart==='defender'?82:65,height=width*body.height/body.width;if(t.hp<=0){c.globalAlpha=.6;c.translate(0,10);c.scale(1,.38);c.drawImage(body,-width/2,-height,width,height);}else{c.drawImage(body,-width/2,-height,width,height);c.save();c.translate(0,-height*.65);const rotation=(t.heading||Math.PI/2)-Math.PI/2;c.rotate(rotation);const pulse=t.visualState==='attack'?Math.sin(time*25)*1.2:0,gw=t.boatPart==='defender'?45:40;c.drawImage(gun,-gw/2,-gw*.4+pulse,gw,gw*gun.height/gun.width);c.restore();}c.restore();return true;}
return{configure,load,draw};});

})(legacy,undefined,undefined);
const api={...legacy.RoyaleCore,BoatBattle:legacy.RoyaleBoatBattle};
if(common)module.exports=api;else root.RoyaleLegacyCore051=api;
})(globalThis);
