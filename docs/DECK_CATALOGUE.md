# Opponent deck catalogue

The maximum-arena opponent pool contains **11,284 unique eight-card decks**: **20 documented source lineups** and **11,264 generated variants**, across ten archetypes. Runtime selection uses only local data. No source website, API, network connection, or third-party package is required to play or train.

`src/deck-sources.js` records each source lineup, its protected core, the source URLs, and the observation date of 2026-10-01. Six seeds have StatsRoyale evidence and sixteen have RoyaleAPI evidence; Hog 2.6 and Splashyard have both, so these are twenty distinct seeds. StatsRoyale's published `copyDeck` identifiers are retained with its source records. The requested [meta overview](https://statsroyale.com/meta/decks) and [ranked deck builder](https://statsroyale.com/deckbuilder?sort=count&type=path-of-legends) were inspected in the browser after an initial security verification cleared automatically.

These sources document base-card compositions. They do not establish how strong those decks are in this historical game snapshot. Evolution, hero, champion and tower-troop mechanics from modern decks are outside this engine; source lineups containing unsupported card identities were excluded. Published win rates, rankings and claims of current meta strength are not imported.

## Documented seed lineups

| Seed family | Evidence |
| --- | --- |
| Hog 2.6 | [RoyaleAPI](https://royaleapi.com/decks/stats/cannon,fireball,hog-rider,ice-golem,ice-spirit,musketeer,skeletons,the-log?lang=en), [StatsRoyale](https://statsroyale.com/deckbuilder?sort=count&type=path-of-legends) |
| Pekka Bridge Spam Fireball | [RoyaleAPI](https://royaleapi.com/decks/stats/bandit,battle-ram,electro-wizard,fireball,magic-archer,pekka,royal-ghost,zap?lang=en) |
| Pekka Bridge Spam Poison | [RoyaleAPI](https://royaleapi.com/decks/stats/bandit,battle-ram,electro-wizard,magic-archer,pekka,poison,royal-ghost,zap?lang=en) |
| Golem Night Witch Pump | [RoyaleAPI](https://royaleapi.com/decks/stats/baby-dragon,elixir-collector,golem,lumberjack,mega-minion,night-witch,tornado,zap?lang=en) |
| Golem Lightning Zap | [RoyaleAPI](https://royaleapi.com/decks/stats/baby-dragon,golem,lightning,lumberjack,mega-minion,night-witch,tornado,zap?lang=en) |
| Golem Lightning Barrel | [RoyaleAPI](https://royaleapi.com/decks/stats/baby-dragon,barbarian-barrel,golem,lightning,lumberjack,mega-minion,night-witch,tornado?lang=en) |
| Golem Lightning Tombstone | [RoyaleAPI](https://royaleapi.com/decks/stats/baby-dragon,golem,lightning,lumberjack,mega-minion,night-witch,tombstone,tornado?lang=en) |
| Classic Log Bait | [RoyaleAPI](https://royaleapi.com/decks/stats/goblin-barrel,goblin-gang,ice-spirit,inferno-tower,knight,princess,rocket,the-log?lang=en) |
| X-Bow 2.9 | [RoyaleAPI](https://royaleapi.com/decks/stats/archers,fireball,ice-golem,ice-spirit,skeletons,tesla,the-log,x-bow?lang=en) |
| X-Bow 3.0 | [RoyaleAPI](https://royaleapi.com/decks/stats/archers,fireball,ice-spirit,knight,skeletons,tesla,the-log,x-bow?lang=en) |
| Ice Bow Tornado | [RoyaleAPI](https://royaleapi.com/decks/stats/ice-wizard,knight,rocket,skeletons,tesla,the-log,tornado,x-bow?lang=en) |
| LavaLoon Guards Lightning | [RoyaleAPI](https://royaleapi.com/decks/stats/arrows,balloon,guards,lava-hound,lightning,mega-minion,minions,tombstone?lang=en) |
| LavaLoon Barbarians Fireball | [RoyaleAPI](https://royaleapi.com/decks/stats/balloon,barbarians,fireball,lava-hound,mega-minion,minions,tombstone,zap?lang=en) |
| LavaLoon Dark Prince Dragons | [RoyaleAPI](https://royaleapi.com/decks/stats/balloon,dark-prince,fireball,lava-hound,mega-minion,skeleton-dragons,tombstone,zap?lang=en) |
| Giant Double Prince Miner | [RoyaleAPI](https://royaleapi.com/decks/stats/arrows,dark-prince,electro-wizard,giant,mega-minion,miner,prince,zap?lang=en) |
| Splashyard | [RoyaleAPI](https://royaleapi.com/decks/stats/baby-dragon,barbarian-barrel,graveyard,ice-wizard,knight,poison,tombstone,tornado?lang=en), [StatsRoyale](https://statsroyale.com/deckbuilder?sort=count&type=path-of-legends) |
| Cannon Barrel Wall Breakers | [StatsRoyale](https://statsroyale.com/deckbuilder?sort=count&type=path-of-legends) |
| Inferno Barrel Dart Goblin | [StatsRoyale](https://statsroyale.com/deckbuilder?sort=count&type=path-of-legends) |
| Mortar Cart Goblin Gang | [StatsRoyale](https://statsroyale.com/deckbuilder?sort=count&type=path-of-legends) |
| Mortar Cart Minions | [StatsRoyale](https://statsroyale.com/deckbuilder?sort=count&type=path-of-legends) |

## Generated variants and legality

Each documented seed contributes 512 generated variants. A separate Starter Giant foundation contributes 1,024 generated decks for progression. Generated variants keep the family's protected core and change at most three support slots using role-specific pools for air defense, melee defense, swarm, cycle, splash, building, damage spell and small spell. Every eight-card entry has eight distinct supported identities, a win condition, a spell, air defense and average elixir between 2.1 and 5.2 under the local historical card costs.

Deck identity uses the sorted card set, so different opening-hand orders never inflate the count. Generation, catalogue order and opening-hand shuffling are deterministic. Families are interleaved to keep adjacent match seeds varied. Arrays and metadata are immutable; selection returns a fresh card array.

Arena selection filters the catalogue using the existing progression rules, including the starter-deck card exception. Lower arenas have fewer eligible decks; the full pool is available from arena 12 in these source tables. Four- and six-card modes retain a win condition, air defense and a spell. Twelve-card mode adds distinct legal support cards. One Shot removes spells and prohibited siege/miner cards, then replenishes legal troop and building slots.

## Runtime use and verification

`RoyaleTrainingDecks.build` and its `randomDeck` alias select from this catalogue. `world.js` uses that alias for AI player decks, which reach Trophy Road matchmaking. Casual matches and unsupplied battle seats use `forMode`. The Learning Center and headless worker use the same module through `training-modes.js`. Both browser and worker bundles load `deck-sources` before `training-decks`.

The focused tests cover every catalogue record, exhaustive catalogue reachability, deterministic regeneration in a fresh browser worker context, arena and special-mode restrictions, and real Battle, World and self-play factory consumption. A local check selected 40,000 decks in approximately 45 ms after approximately 81 ms of catalogue construction, reaching all 11,284 identities. These measurements describe this machine and are not a cross-device performance guarantee.

Run the focused checks with `node --test tests/deck-catalogue-v490.test.cjs tests/training-decks-v130.test.cjs`. The repository's `npm test` remains the full regression check.
