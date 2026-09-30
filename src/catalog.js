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
function validDeck(deck,options={}){const size=[4,12].includes(options.size)?options.size:8;return Array.isArray(deck)&&deck.length===size&&(options.duplicates===true||new Set(deck).size===size)&&deck.every(id=>!!CARD_BY_ID[id]);}
function modeDeckSize(mode){return mode==='TwelveCardDeck'?12:mode==='FourCardDeck'?4:8;}
function allowedInMode(id,mode){const c=CARD_BY_ID[id];return !!c&&(mode!=='OneShot'||c.kind!=='Spell'&&!['mortar','x-bow','miner','goblin-drill'].includes(id));}
// Casual deck storage never implies collection ownership. Keep this registry below
// the catalog, so profile migration, builders, battles and workers share one rule.
const MAX_DECKS=100,DECK_PAGE_SIZE=5;
const MODE_DECKS=Object.freeze(Object.fromEntries([
 ['Default','challengeDeck','Classic Challenge'],['TeamVsTeam','duoDeck','2v2'],
 ['Team3v3','tripleDeck','3v3'],['TeamRumble','rumbleDeck','Team Rumble'],
 ['BridgeBattle','bridgeDeck','Bridge'],['FourCardDeck','fourCardDeck','4 Card Deck'],
 ['TwelveCardDeck','twelveCardDeck','12 Card Deck'],['TwentyElixir','twentyElixirDeck','20 Elixir'],
 ['OneShot','oneShotDeck','One Shot'],['DoubleElixir','doubleElixirDeck','Double Elixir'],
 ['TripleElixir','tripleElixirDeck','Triple Elixir'],['RampUp','rampDeck','Ramp Up'],
 ['SuddenDeath','suddenDeck','Sudden Death'],['7xElixir','infiniteDeck','Infinite Elixir'],
 ['ClanWar_BoatBattle','boatPracticeDeck','Boat Battle'],['Touchdown','touchdownDeck','Touchdown'],
 ['Touchdown2v2','touchdown2v2Deck','2v2 Touchdown'],['Touchdown3v3','touchdown3v3Deck','3v3 Touchdown'],
 ['FreeForAll','ffaDeck','1v1v1v1 FFA']
].map(([mode,key,name])=>[mode,Object.freeze({key,name,size:modeDeckSize(mode)})])));
function deckName(value,index=0){return (typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24):'')||'Deck '+(index+1);}
function normalizeDeck(deck,options={}){const size=[4,12].includes(options.size)?options.size:8;return validDeck(deck,options)?[...deck]:[...new Set([...DEFAULT_DECK,...CARDS.map(c=>c.id)])].slice(0,size);}
function cardAt(id,level=9){const c=CARD_BY_ID[id];return c?cardDef(c,level):null;}
function features(c){const r=c.source,e=DATA.entities[r.SummonCharacter]||{},p=DATA.projectiles[e.Projectile||r.Projectile]||{},a=DATA.areas[r.AreaEffectObject]||{};const f=[];if(e.FlyingHeight)f.push('Flying');if(e.TargetOnlyBuildings)f.push('Buildings only');if(e.AttacksAir)f.push('Targets air');if(e.ShieldHitpoints||c.id==='cannon-cart')f.push('Shield / second form');if(e.ChargeRange)f.push('Charge');if(e.DashDamage)f.push('Dash / jump');if(e.DeathSpawnCharacter)f.push('Death spawn');if(e.SpawnCharacter)f.push(e.SpawnAttach?'Attached attacker':'Troop spawner');if(e.DeathDamage||e.DeathAreaEffect)f.push('Death effect');if(e.VariableDamage2)f.push('Ramping damage');if(e.BuffOnDamage||p.TargetBuff)f.push('On-hit status');if(e.HidesWhenNotAttacking||e.BuffWhenNotAttacking==='Invisibility')f.push('Concealment');if(e.ReflectedAttackDamage)f.push('Damage reflection');if(e.ProjectileSpecial==='FishermanProjectile')f.push('Hook');if(p.ProjectileRange)f.push('Line projectile');if(p.ChainedHitCount)f.push('Chain hit');if(a.Buff)f.push('Area status');if(a.SpawnCharacter)f.push('Area spawner');if(e.ManaGenerateTimeMs)f.push('Elixir generation');if(e.AreaEffectOnHit)f.push('On-hit area effect');if(e.Kamikaze)f.push('One-shot attack');if(e.AreaDamageRadius||p.Radius)f.push('Area damage');if(r.Mirror)f.push('Copies last card');if(c.id==='clone')f.push('One-HP copies');return f.length?f:['Direct attack'];}
return {MAX_DECKS,DECK_PAGE_SIZE,MODE_DECKS,deckName,DATA,CARDS,CARD_BY_ID,SOURCE_CARD,DEFAULT_DECK,SX,SY,sec,clamp,scaled,baseLevel,levelFactor,towerFactor,projectileForAttack,projectileDamageDef,entityDef,cardDef,cardAt,validDeck,normalizeDeck,modeDeckSize,allowedInMode,features};
});
