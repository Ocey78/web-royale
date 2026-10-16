/* Mode-only content. Source cards/forms stay untouched for normal play and replays. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleUltimateClash=api;})(globalThis,function(){'use strict';
const MODE='UltimateClash',MODES=Object.freeze([MODE,'UltimateClash2v2','UltimateClash3v3']),isMode=mode=>MODES.includes(mode),row=(slug,name,cost,base,kind,description,artDescription)=>Object.freeze({id:'ultimate-'+slug,slug,name,cost,base,kind,description,artDescription,exclusiveMode:MODE});
const CARDS=Object.freeze([
 row('mega-minion-horde','Mega Minion Horde',14,'mega-minion','Troop','Six armored Mega Minions take to the skies. The Hero form deploys six Hero Mega Minions; they choose different targets whenever enough enemies are available.','Six steel-blue armored Mega Minions sweeping toward the viewer beneath a violet storm sky.'),
 row('lightning-storm','Lightning Storm',14,'lightning','Spell','Six strike waves hit 1–3 randomly chosen enemies or towers in a storm cloud. Each wave arrives 0.9–2 seconds after the last. Its radius is 15% smaller than Graveyard.','A dense grey storm cloud crackling with three branching white and violet lightning bolts.'),
 row('heal-spell','Heal Spell',3,'heal-spirit','Spell','Place a healing field anywhere in the Arena. It has twice a Heal Spirit’s healing radius and lasts twice as long, restoring nearby friendly troops.','A smiling golden Heal Spirit rising from a radiant emerald-and-gold healing ring.'),
 row('balloon-parade','Balloon Parade',20,'balloon','Troop','Six Balloons deploy in a broad Royal Recruits formation across your side of the Arena. Each carries its usual bomb and death damage.','Six red bomb-carrying Balloons advancing in formation against a sunset-orange sky.'),
 row('executioner-cage','Executioner Cage',16,'goblin-cage','Building','A reinforced grey cage throws Executioner axes at up to three different enemies at once, with Inferno Tower range. When destroyed, it releases three Executioners.','A steel-grey Goblin Cage surrounded by three spinning double-headed Executioner axes.'),
 row('builder','Builder',5,'goblin-cage','Spell','Assign a Builder to one friendly building, excluding Princess and King Towers. One prevents lifetime decay; a second adds gradual healing. Maximum two Builders per building. Enemy attacks still damage it.','A cheerful mustached Builder wearing a brown leather cap, gripping a wooden mallet beside a small wooden construction hut.'),
 row('magic-trio','Magic Trio',10,'wizard','Troop','Deploys an Ice Wizard, Electro Wizard and Wizard in a tight three-troop formation. Fire, frost and lightning arrive together.','The blue Ice Wizard, electric-haired Electro Wizard and fireball-wielding Wizard together in a triangular portrait.'),
 row('frostbite','Frostbite',11,'freeze','Spell','Freezes a field 15% larger than Freeze and summons Ice Spirits throughout it using Graveyard-style spawning. Hero ability: spend 3 elixir to launch 10 Giant Snowballs at nearby positions.','A frozen blue spell bottle surrounded by tiny glowing Ice Spirits and a spiral of snow.'),
 row('harvest','Harvest',3,'void','Spell','A pink field lasts 1.25× as long as Void with a 1.5× radius. Enemy troop deaths inside grant 0.1 elixir per Skeleton, 0.2 per Minion, Bat, Spirit or Goblin, 0.35 per Barbarian, and 1 for other troops. Pink beams mark each harvest.','A luminous pink elixir vortex with rose-coloured beams rising from a dark magical circle.'),
 row('overcharged-tesla','Overcharged Tesla',6,'tesla','Building','An evolved Tesla that stays above ground. It charges and fires a Sparky-style blast instead of lightning bolts, with a harmless sky zap one second before each shot. No opening pulse.','An evolved purple Tesla coil above ground, overloaded with white electricity and a huge charged energy sphere.'),
 row('three-pekkas','Three P.E.K.K.As',17,'pekka','Troop','Three heavily armored P.E.K.K.As deploy together. Three swords, three sets of glowing eyes, and a very expensive problem for the enemy.','Three black-armored P.E.K.K.As with purple horns and glowing pink eyes advancing together.'),
 row('meteor-shower','Meteor Shower',6,'fireball','Spell','An orange field 50% larger than Void rains eight Fireballs at random positions over 4.5 seconds. Each Fireball deals one third of normal Fireball damage.','Eight fiery meteors descending into a glowing orange ring with bright impact sparks.'),
 row('code-red','CODE RED',18,'rocket','Spell','Launches 25 Rockets in rapid waves over 3 seconds, striking random locations across the enemy’s half of the Arena.','A chaotic red sky filled with a fan of rockets, blazing orange exhaust trails and a central warning flare.'),
 row('royale-escort','Royale Escort',20,'royal-giant','Troop','Two Knights and a Prince lead a Royal Giant, with two Cannon Carts behind. One-cycle Evolution upgrades the Knights and Royal Giant and replaces the Prince with a Dark Prince.','A golden Royal Giant in the middle, Knights and a mounted Prince in front, and two Cannon Carts at the rear.'),
 row('kings-dropoff','King’s Dropoff',13,'royal-delivery','Spell','Four Royal Deliveries drop around a boxed Cannon Cart in a plus shape. The Cannon Cart lands in the centre while the recruits secure all four sides.','Four falling wooden Royal Delivery crates surrounding a larger central crate with a cannon peeking out.'),
 row('elite-barbarians','Elite Barbarians',12,'elite-barbarians','Troop','Five Elite Barbarians deploy in the familiar Barbarians formation. Their fast movement and heavy swords make this a powerful group attack.','Five furious blond Elite Barbarians with steel helmets and raised swords charging through gold dust.'),
 row('elixir-witch','Elixir Witch',5,'mother-witch','Troop','A Mother Witch who moves 5% slower and periodically summons middle-stage Elixir Golemites. Her kills turn enemy troops into tiny friendly Elixir Golemites instead of Hogs.','A purple-robed Mother Witch holding a pink elixir lantern, surrounded by small smiling elixir golemites.'),
 row('unstable-egg','Unstable Egg',3,'phoenix','Troop','Place a Phoenix Egg on your side. On hatching: 30% Baby Dragon, 20% evolved Baby Dragon, 5% three Baby Dragons, or 45% a Goblin Demolisher-style explosion that damages both teams.','A cracked golden Phoenix Egg glowing green and orange from within, with dragon eyes visible between the cracks.'),
 row('fisherman','Fisherman',4,'fisherman','Troop','Hooks an enemy immediately on deployment when one is in hook range. Later hooks charge in half the normal time. Fish Slapping remains complimentary.','A grinning blue-capped Fisherman casting a gleaming anchor hook toward the viewer with a turquoise motion streak.'),
 row('bomb-squad','Bomb Squad',6,'bomber','Troop','Two Bombers hide behind a Guard. They remain faintly visible like the Archer Queen during her cloak ability, but cannot be targeted until their Guard falls; then they become fully visible.','A shield-bearing skeleton Guard protecting two shadowy Bombers with glowing bombs behind him.')
]);
const CARD_IDS=Object.freeze(CARDS.map(c=>c.id)),DEFAULT_DECK=Object.freeze(['ultimate-royale-escort','ultimate-mega-minion-horde','ultimate-frostbite','ultimate-bomb-squad','ultimate-heal-spell','ultimate-fisherman','ultimate-executioner-cage','ultimate-meteor-shower']);
const clone=x=>JSON.parse(JSON.stringify(x));
function install(data){
 if(data.ultimateCards?.length===CARDS.length)return data;
 const native=id=>data.cards.find(c=>c.id===id),entity=(name,base,patch={})=>{data.entities[name]={...clone(data.entities[base]||{}),Name:name,NativeActor:base,...patch};return data.entities[name];};
 const axe=data.entities.AxeMan||{},zap=data.entities.ZapMachine||{},night=data.entities.DarkWitch||{},inferno=data.entities.InfernoTower||{};
 const cage=entity('UltimateExecutionerCage','GoblinCage',{Range:inferno.Range||6000,SightRange:inferno.Range||6000,Projectile:axe.Projectile,HitSpeed:axe.HitSpeed,LoadTime:axe.LoadTime,AttacksAir:true,AttacksGround:true,MultipleTargets:3,DeathSpawnCharacter:'AxeMan',DeathSpawnCount:3,OnStartingAction:'',UltimateTint:'#a6aab0'});delete cage.Damage;
 const tesla=entity('UltimateOverchargedTesla','Tesla_EV1',{Projectile:zap.Projectile,AttackStartEffect:'',TargetedHitEffect:'',ProjectileEffect:zap.ProjectileEffect,HitSpeed:4000,LoadFirstHit:true,LoadTime:3000,AttacksAir:false,HidesWhenNotAttacking:false,OnStartingAction:'',OnAppearAction:'',OnDisappearAction:'',AppearEffect:'',HideEffect:''});delete tesla.Damage;
 data.projectiles.UltimateElixirWitchProjectile={...clone(data.projectiles[data.entities.WitchMother.Projectile]),Name:'UltimateElixirWitchProjectile',TargetBuff:''};
 entity('UltimateElixirWitch','WitchMother',{Projectile:'UltimateElixirWitchProjectile',Speed:(data.entities.WitchMother.Speed||60)*.95,BuffOnDamage:'',SpawnCharacter:'ElixirGolem2',SpawnStartTime:night.SpawnStartTime,SpawnPauseTime:night.SpawnPauseTime,SpawnNumber:night.SpawnNumber,UltimateTint:'#e965d3'});
 entity('UltimateUnstableEgg','PhoenixEgg',{SpawnCharacter:'',DestroyAtLimit:false,Speed:0});
 entity('UltimateFisherman','Fisherman',{SpecialLoadTime:650});
 entity('UltimateFrostbiteHero','IceSpirits',{Hitpoints:1,Speed:0,Damage:0,Projectile:'',Kamikaze:false,Range:0,AttacksAir:false,AttacksGround:false});
 const area=(name,base,radius,duration)=>data.areas[name]={...clone(data.areas[base]||{}),Name:name,Radius:radius,LifeDuration:duration};
 area('UltimateLightningStorm','Graveyard_rework',3400,10000);
 area('UltimateHealSpell','HealSpirit',5000,2000);
 area('UltimateFrostbite','Freeze',3450,9000);
 area('UltimateHarvest','DarkMagicAOE',3750,(data.areas.DarkMagicAOE?.LifeDuration||4000)*1.25);
 area('UltimateMeteorShower','DarkMagicAOE',3750,4500);
 const overrides={
  'mega-minion-horde':{SummonNumber:6,SummonRadius:1000},
  'lightning-storm':{Projectile:'',AreaEffectObject:'UltimateLightningStorm',Radius:3400,CanDeployOnEnemySide:true},
  'heal-spell':{SummonCharacter:'',SpellAsDeploy:false,AreaEffectObject:'UltimateHealSpell',Radius:5000,CanDeployOnEnemySide:true,CanPlaceOnBuildings:true,CanPlaceOnWater:true},
  'balloon-parade':{SummonNumber:6,SummonWidth:14000,SummonRadius:500,SummonDeployDelay:100,DeployWTileMargin:6,FullLaneDeploy:true},
  'executioner-cage':{SummonCharacter:'UltimateExecutionerCage'},
  builder:{SummonCharacter:'',Radius:1000,CanPlaceOnBuildings:true,SpellAsDeploy:true},
  'magic-trio':{SummonCharacter:'',SummonCharactersList:['IceWizard','ElectroWizard','Wizard'],SummonNumber:3,SummonRadius:700},
  frostbite:{AreaEffectObject:'UltimateFrostbite',Radius:3450,UltimateVisualDependencies:['IceSpirits','SnowballSpell']},
  harvest:{AreaEffectObject:'UltimateHarvest',Radius:3750},
  'overcharged-tesla':{SummonCharacter:'UltimateOverchargedTesla'},
  'three-pekkas':{SummonNumber:3,SummonRadius:1000},
  'meteor-shower':{Projectile:'',AreaEffectObject:'UltimateMeteorShower',Radius:3750},
  'code-red':{Radius:9000,CanDeployOnEnemySide:true},
  'royale-escort':{SummonCharacter:'',SummonCharactersList:['Knight','Knight','Prince','RoyalGiant','MovingCannon','MovingCannon'],SummonNumber:6},
  'kings-dropoff':{Radius:4000,UltimateVisualDependencies:['MovingCannon','Recruit']},
  'elite-barbarians':{SummonNumber:5,SummonRadius:700},
  'elixir-witch':{SummonCharacter:'UltimateElixirWitch'},
  'unstable-egg':{SummonCharacter:'UltimateUnstableEgg',UltimateVisualDependencies:['BabyDragon','BabyDragon_EV1','GoblinDemolisher']},
  fisherman:{SummonCharacter:'UltimateFisherman'},
  'bomb-squad':{SummonCharacter:'',SummonCharactersList:['Bomber','Bomber','SkeletonWarrior'],SummonNumber:3,SummonRadius:700}
 };
 data.ultimateCards=CARDS.map(config=>{const base=native(config.base);if(!base)throw Error('Ultimate Clash source card missing: '+config.base);const source={...clone(base.source),...overrides[config.slug],Name:'Ultimate_'+config.slug.replace(/-/g,'_'),ManaCost:config.cost,UltimateMechanic:config.slug};delete source.EvolvedSpells;return{...clone(base),id:config.id,name:config.name,cost:config.cost,kind:config.kind,description:config.description,artDescription:config.artDescription,exclusiveMode:MODE,ultimate:{kind:config.slug,baseCardId:config.base},source};});
 const card=id=>data.ultimateCards.find(c=>c.id===id),source=(id,patch)=>({...clone(card(id).source),...patch}),hero=data.forms?.find(f=>f.baseCardId==='mega-minion'&&f.kind==='hero');
 data.ultimateForms=[
  {id:'ultimate-mega-minion-horde-hero',baseCardId:'ultimate-mega-minion-horde',kind:'hero',name:'Hero Mega Minion Horde',cycles:0,requiredShards:0,exclusiveMode:MODE,source:source('ultimate-mega-minion-horde',{SummonCharacter:'MegaMinionHero',SummonNumber:6}),abilityCharacter:'MegaMinionHero',ability:hero?.ability?clone(hero.ability):null,description:'Six Hero Mega Minions divide their attention between different enemies whenever possible.'},
  {id:'ultimate-frostbite-hero',baseCardId:'ultimate-frostbite',kind:'hero',name:'Hero Frostbite',cycles:0,requiredShards:0,exclusiveMode:MODE,source:source('ultimate-frostbite',{}),abilityCharacter:'UltimateFrostbiteHero',ability:{id:'UltimateFrostbiteSnowballs',ManaCost:3,MaxCharges:1,CastTime:0,TriggerDelay:0},description:'Spend 3 elixir to launch 10 Giant Snowballs at nearby locations.'},
  {id:'ultimate-royale-escort-evolution',baseCardId:'ultimate-royale-escort',kind:'evolution',name:'Royale Escort Evolution',cycles:1,requiredShards:0,exclusiveMode:MODE,source:source('ultimate-royale-escort',{SummonCharactersList:['Knight_EV1','Knight_EV1','DarkPrince','RoyalGiant_EV1','MovingCannon','MovingCannon']}),ability:null,description:'Every second deployment: two evolved Knights and a Dark Prince lead an evolved Royal Giant and two Cannon Carts.'}
 ];
 return data;
}
return{MODE,MODES,isMode,CARDS,CARD_IDS,DEFAULT_DECK,install};
});
