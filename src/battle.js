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
  this.compactRecording=options.recording==='compact';this.headless=options.headless===true;this.navigator=new Nav.Navigator();this.snapshot=DATA.snapshot;this.id=Date.now()+'-'+(++serial);this.seed=options.seed||1;this.random=rng(this.seed);this.time=0;this.paused=false;this.result=null;this.overtime=false;this.ai=options.ai!==false;this.gameMode=DATA.modes.find(m=>m.Name===options.mode)||null;this.mode=(DATA.timelines[options.mode]||this.gameMode||Rules.CUSTOM_MODES.includes(options.mode))?options.mode:'Default';this.deckSize=K.modeDeckSize(this.mode);this.maxElixir=this.mode==='TwentyElixir'?20:10;this.timeline=Rules.timelineFor(this.mode,DATA.timelines)||DATA.timelines[this.gameMode?.BattleTimeline||this.mode]||DATA.timelines.Default;this.isTouchdown=['Touchdown','Touchdown2v2','Touchdown3v3'].includes(this.mode);this.isFFA=this.mode==='FreeForAll';this.is2v2=this.gameMode?.Players==='TvT'||this.mode.startsWith('TeamVsTeam')||this.mode==='Touchdown2v2';this.is3v3=this.mode==='Team3v3';this.is5v5=this.mode==='TeamRumble';this.isTeamElimination=this.is3v3||this.is5v5;this.arenaId=options.arenaId||this.mode;this.arenaLayout=G.layoutFor(this.arenaId);if(!this.arenaLayout.custom)this.arenaId=options.arenaId||options.profile?.arena||'training';this.seatCount=this.isFFA?4:this.mode==='Touchdown3v3'?6:this.is5v5?10:this.is3v3?6:this.is2v2?4:2;this.seats=Array.from({length:this.seatCount},(_,i)=>i);this.teamCount=this.isFFA?4:2;this.kingShots=0;this.metrics={combat:Array(this.teamCount).fill(0),towerDamage:Array(this.teamCount).fill(0),spent:this.seats.map(()=>0),leaked:this.seats.map(()=>0),kills:Array(this.teamCount).fill(0),lost:Array(this.teamCount).fill(0)};this.overtime=this.timeline.SectionType?.[0]==='Overtime';this.syntheticProfile=options.profile===undefined;const profileInput=this.syntheticProfile?{trophies:1000,cardLevels:Object.fromEntries(K.CARDS.map(c=>[c.id,9])),copies:Object.fromEntries(K.CARDS.map(c=>[c.id,20])),unlockedCards:K.CARDS.map(c=>c.id),decks:P.PRESETS}:options.profile;this.profile=P.normalizeProfile(profileInput);this.kingLevel=clamp(Math.floor(Number(options.kingLevel??this.profile.level??9)),1,13);this.cheats=this.profile.cheats;this.cheatPractice=Object.values(this.cheats).some(Boolean);this.practice=options.practice===true||this.cheatPractice;this.levels={...(options.levels||this.profile.cardLevels),...(this.cheats.overlevels?this.profile.cheatLevels:{})};
  this.elixir=this.seats.map(()=>this.timeline.StartingElixir??6);if(this.cheats.elixir)this.elixir[0]=this.maxElixir;this.crowns=Array(this.teamCount).fill(0);this.units=[];this.towers=[];this.effects=[];this.projectiles=[];this.areas=[];this.pending=[];this.events=[];this.nextId=20;this.played=this.seats.map(()=>0);this.laneCounts=[0,0];this.lastCard=this.seats.map(()=>null);this.slotReady=this.seats.map(()=>[0,0,0,0]);this.aiClock=1.2;this.aiDifficulty=options.aiDifficulty||this.profile.aiDifficulty||'expert';this.bots=this.seats.map(seat=>new AI.TacticalBot({team:this.isFFA?seat:seat%2,seat,difficulty:this.aiDifficulty,seed:(options.seed||1)+seat*17}));this.memory=this.profile.laneCounts;
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
  if(!(seat===0&&this.cheats.elixir)){this.elixir[seat]=Math.max(0,this.elixir[seat]-c.cost);this.metrics.spent[seat]+=c.cost;}else this.elixir[0]=this.maxElixir;const played=this.hand[seat][slot];if(this.deckSize!==4){this.hand[seat][slot]=this.queue[seat].shift();this.queue[seat].push(played);}this.slotReady[seat][slot]=this.time+sec(this.timeline.NextSpellCooldownMS?.[this.phase]??1000);this.played[seat]++;
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
  if(c.id==='arrows'){for(let i=0;i<(r.ProjectileWaves||3);i++)this.schedule({type:'impact',name:r.CustomFirstProjectile||'ArrowsSpell',team,x,y,level:c.level,due:this.time+1+i*sec(r.ProjectileWaveInterval||200)});for(let i=0;i<(r.ProjectileWaves||3);i++)this.schedule({type:'visual',kind:'arrowsFly',x,y,startX:9*SX,startY:(team?3:29)*SY,team,ttl:1.35,flightDuration:1,wave:i,count:r.MultipleProjectiles||10,radius:(r.Radius||4000)/1000*SX,due:this.time+i*sec(r.ProjectileWaveInterval||200)});return;}
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
 spawn(name,team,x,y,opt={}){if(!DATA.entities[name]||this.units.length>=500)return null;const u=this.makeEntity(name,team,x,y,opt);this.units.push(u);if(u.building)this.navigator.sampleTime=-1;if(u.def.source.SpawnEffect){const delay=Math.max(0,u.appearsAt-this.time);this.effect({kind:'source',sourceEffect:u.def.source.SpawnEffect,team,x,y,follow:u.id,delay,ttl:4+delay});}return u;}
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
  if(r.HidesWhenNotAttacking)u.hidden=!t||edge(u,t)>u.def.range;
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

 step(dt){if(!Number.isFinite(dt)||dt<=0||this.paused||this.result)return;dt=Math.min(dt,.1);if(this.tiebreaker){this.tickTiebreaker(dt);return;}this.time+=dt;const bar=this.timeline.ElixirFullBarMS?.[this.phase]||28000;for(const t of this.seats){const gained=this.passiveElixirEnabled(t)?dt*10000/bar:0;this.metrics.leaked[t]+=Math.max(0,this.elixir[t]+gained-this.maxElixir);this.elixir[t]=(t===0&&this.cheats.elixir)?this.maxElixir:Math.min(this.maxElixir,this.elixir[t]+gained);}
  for(const u of this.units){u.previousX=u.x;u.previousY=u.y;}this.tickPending();this.tickAreas(dt);for(const u of [...this.towers,...this.units])this.tickEntity(u,dt);this.tickProjectiles(dt);this.deaths();this.checkTouchdowns();this.separate(dt);this.effects=this.effects.filter(e=>this.time-e.born<e.ttl);if(this.ai&&this.time>=this.aiClock){for(const seat of this.seats)if(seat!==0)this.aiPlay(seat);this.aiClock=this.time+.25;}this.checkResult();this.recorder?.tick();
 }
}
Battle.SX=SX;Battle.SY=SY;return {Battle,rng,dist,edge};});
