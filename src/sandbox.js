/* Isolated manual practice. Normal Battle rules and persistent profile data are
   untouched; the sandbox has no AI controller, match outcome or recorder. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./core.js'):root.RoyaleCore,n?require('./platform.js'):root.RoyalePlatform,n?require('./arena-selection.js'):root.RoyaleArenaSelection);if(n)module.exports=api;else root.RoyaleSandbox=api;})(globalThis,function(C,Platform,Maps){'use strict';
function towerConfig(value={}){return Object.fromEntries(['blue','red'].map(team=>[team,Object.fromEntries(['left','right','king'].map(key=>[key,value[team]?.[key]!==false]))]));}
function validLevel(value,fallback=9){return Number.isFinite(Number(value))?C.clamp(Math.floor(Number(value)),0,99):fallback;}
// Source levels retain their recorded multipliers. Debug levels below a
// rarity's base extrapolate backward with the same 10% growth convention.
function scaleStat(raw,rarity,level){const n=validLevel(level),base=C.baseLevel(rarity);return n>=base?C.scaled(raw,rarity,n):Math.floor((Number(raw)||0)*Math.pow(1.1,n-base)+1e-7);}
function entityDefinition(name,level=9){
 const n=validLevel(level),d=C.entityDef(name,Math.max(1,Math.min(30,n))),r=d.source,p=C.projectileDamageDef(C.projectileForAttack(r))||{},tower=['KingTower','PrincessTower'].includes(name);
 const towerStat=(raw,damage=false)=>Math.floor((raw||0)*C.towerFactor(name,Math.max(1,n),damage)*(n===0?1/1.1:1));
 const hp=tower?towerStat(r.Hitpoints):scaleStat(r.Hitpoints,r.Rarity,n),damageRaw=r.Damage??p.Damage??0;
 return{...d,level:n,hp:r.Hitpoints?Math.max(1,hp):0,damage:tower?towerStat(damageRaw,true):scaleStat(damageRaw,r.Damage!==undefined?r.Rarity:p.Rarity||r.Rarity,n),shield:scaleStat(r.ShieldHitpoints,r.Rarity,n)};
}
function cardDefinition(id,level=9){
 const n=validLevel(level),card=C.cardAt(id,n);if(!card)return null;
 if(card.entity){const e=entityDefinition(card.entity,n);return{...card,hp:e.hp,damage:e.damage};}
 const r=card.source,a=C.DATA.areas[r.AreaEffectObject]||{},p=C.DATA.projectiles[card.projectileName]||{},buff=C.DATA.buffs[a.Buff]||{};
 const damage=scaleStat(p.Damage??a.Damage??r.InstantDamage??buff.DamagePerSecond??0,p.Rarity||a.Rarity||card.rarity,n),percent=p.CrownTowerDamagePercent??a.CrownTowerDamagePercent??buff.CrownTowerDamagePercent;
 return{...card,damage,crownDamage:percent!==undefined?Math.floor(damage*(100+percent)/100):null};
}
class SandboxBattle extends C.Battle{
 constructor(options={}){
  const mapId=Maps.valid(options.mapId)?options.mapId:'training',mode=['Team3v3','TeamRumble','BridgeBattle'].includes(mapId)?mapId:'Default',level=validLevel(options.level??9),levels=Object.fromEntries(C.CARDS.map(c=>[c.id,level]));
  super({mode,arenaId:mapId,seed:options.seed||1,ai:false,practice:true,headless:options.headless===true,levels,seatLevels:[levels,levels],kingLevels:[level,level],kingLevel:level});
  this.isSandbox=true;this.queueType='sandbox';this.learningEnabled=false;this.recorder=null;this.replayInitial=null;this.sandboxLevel=level;
  for(const bot of this.bots)bot.learner=null;
  this.sandboxTowers=towerConfig(options.towers);
  this.towers=this.towers.filter(t=>this.sandboxTowers[t.team?'red':'blue'][t.king?'king':t.x<240?'left':'right']);
  // Ordinary Battle construction clamps king levels to 1–13. Restore only
  // this isolated battle's requested tower definitions after construction.
  this.kingLevel=level;this.kingLevels=this.seats.map(()=>level);for(const t of this.towers){t.def=entityDefinition(t.entity,level);t.level=level;t.hp=t.maxHp=t.def.hp;t.shield=t.maxShield=t.def.shield;}
  if(options.towerSkin)for(const t of this.towers)if(t.team===0)t.skin=options.towerSkin;
 }
 checkResult(){}
 finish(){}
 record(){}
 completeRecording(){}
 abortRecording(){}
 scaleStat(raw,rarity,level){return scaleStat(raw,rarity,level);}
 entityDefinition(name,level){return entityDefinition(name,level);}
 get multiplier(){return 1;}
 get secondsLeft(){return 0;}
}
class Session extends Platform.LocalMatchSession{
 constructor(options={}){super(new SandboxBattle(options));this.options={...options,mapId:Maps.valid(options.mapId)?options.mapId:'training',level:validLevel(options.level??9),towers:towerConfig(options.towers)};}
 spawn(cmd){
  if(!cmd||!C.CARD_BY_ID[cmd.card]||![0,1].includes(cmd.team)||!Number.isFinite(cmd.x)||!Number.isFinite(cmd.y)||cmd.x<this.battle.arenaLayout.left*C.SX||cmd.x>this.battle.arenaLayout.right*C.SX||cmd.y<this.battle.arenaLayout.top*C.SY||cmd.y>this.battle.arenaLayout.bottom*C.SY)return{ok:false,reason:'Choose a card, team and position inside the arena'};
  const b=this.battle,team=cmd.team,level=validLevel(cmd.level??b.sandboxLevel,b.sandboxLevel);
  if(b.units.length>=450)return{ok:false,reason:'Clear the arena before adding more troops'};
  let card=cardDefinition(cmd.card,level);
  if(cmd.card==='mirror'){
   const last=b.lastCard[team];if(!last)return{ok:false,reason:'Place another card for this team before using Mirror'};
   card=cardDefinition(last.id,Math.min(99,level+(C.DATA.globals.MIRROR_LEVEL_OFFSET?.NumberValue??1)));
  }
  b.cast(card,team,cmd.x,cmd.y,team);
  if(cmd.card!=='mirror')b.lastCard[team]={id:card.id,level:card.level,cost:card.cost};
  b.played[team]++;return{ok:true,card:card.id,team};
 }
 clear(){const b=this.battle;for(const key of ['units','pending','projectiles','areas','effects'])b[key]=[];b.lastCard=[null,null];for(const t of b.towers){t.targetId=null;t.windup=null;t.buffs={};t.visualAttack=null;t.visualHook=null;t.visualAttackCancelled=false;t.visualState='idle';t.animationTime=0;}this.accumulator=0;}
 setMap(mapId){if(!Maps.valid(mapId))throw RangeError('Unknown sandbox map');this.options.mapId=mapId;return this.reset();}
 reset(towers=this.options.towers,level=this.options.level){
  this.options.towers=towerConfig(towers);this.options.level=validLevel(level);const paused=this.battle.paused;
  // Keep the object identity already installed in the renderer and app shell.
  Object.assign(this.battle,new SandboxBattle(this.options));this.battle.paused=paused;this.accumulator=0;this.sequence=0;this.replies.clear();return this.battle;
 }
}
return{Session,SandboxBattle,towerConfig,validLevel,scaleStat,entityDefinition,cardDefinition};});
