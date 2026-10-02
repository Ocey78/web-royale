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
