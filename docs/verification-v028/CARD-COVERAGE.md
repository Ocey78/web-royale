# 102-card behavior and movement coverage — v0.28

Pinned source: **3.2557.2**. This ledger records executable evidence, not a claim that every card matches the native game.

All **102/102** cards pass basic deployment. **57** have at least one mapped behavior, formation, or placement-rule scenario; **45** do not. A selected scenario is not full coverage.

The movement report follows **98** source-reachable entities. **77** independently mobile entities each pass four oblique team/lane crossings. Attached-only, stationary, and effect-carrier entities are listed separately. See [the movement report](pathing-report.json).

The new combat suite covers 13 primary card repairs: impact-only Mother Witch curse; Ram Rider snare preference; Hunter first blocker; Elixir Collector production under Freeze/Rage and six other spawn cycles under Freeze; stationary Cannon Cart and morph state; Fisherman hook windup; and timestep-independent Tornado that does not repeatedly interrupt attacks. Golem, Elixir Golem, and Battle Ram also receive legal child-spawn placement at river/wall boundaries.

## How to read the table

Every row has baseline deployment coverage: one legal placement, three simulated seconds, and finite-state checks. “Cases” lists dedicated evidence IDs, including formation/placement cases where applicable. “Routes” counts distinct independently mobile source entities and their four oblique crossing cases, not complete combat paths. A dash means no dedicated behavior case mapped here.

| Card | Cases | Routes (entities / crossings) | Changed |
|---|---|---:|---|
| Knight | knight-source, ground-targeting, windup-period | 1 / 4 | — |
| Archers | archer-formation | 1 / 4 | — |
| Goblins | triangles | 1 / 4 | — |
| Giant | buildings-only, cart-building | 1 / 4 | — |
| P.E.K.K.A | — | 1 / 4 | — |
| Minions | — | 1 / 4 | — |
| Balloon | death-payload-origin, balloon-preload | 1 / 4 | — |
| Witch | spawner-types, spawner-freeze | 2 / 8 | primary behavior repair |
| Barbarians | barbs-recruits | 1 / 4 | — |
| Golem | golem-split, spawn-terrain, source-spread | 2 / 8 | ground death-spawn terrain repair |
| Skeletons | triangles | 1 / 4 | — |
| Valkyrie | — | 1 / 4 | — |
| Skeleton Army | army-formation | 1 / 4 | — |
| Bomber | — | 1 / 4 | — |
| Musketeer | air-targeting | 1 / 4 | — |
| Baby Dragon | — | 1 / 4 | — |
| Prince | charge-reset | 1 / 4 | — |
| Wizard | — | 1 / 4 | — |
| Mini P.E.K.K.A | bank-rounding | 1 / 4 | — |
| Spear Goblins | triangles | 1 / 4 | — |
| Giant Skeleton | — | 1 / 4 | — |
| Hog Rider | hog-jump | 1 / 4 | — |
| Minion Horde | — | 1 / 4 | — |
| Ice Wizard | — | 1 / 4 | — |
| Royal Giant | — | 1 / 4 | — |
| Guards | shield | 1 / 4 | — |
| Princess | princess-projectile | 1 / 4 | — |
| Dark Prince | — | 1 / 4 | — |
| Three Musketeers | — | 1 / 4 | — |
| Lava Hound | — | 2 / 8 | — |
| Ice Spirit | — | 1 / 4 | — |
| Fire Spirits | — | 1 / 4 | — |
| Miner | — | 1 / 4 | — |
| Sparky | recoil | 1 / 4 | — |
| Bowler | bowler-deploying | 1 / 4 | — |
| Lumberjack | death-payload-origin, lumberjack-rage | 1 / 4 | — |
| Battle Ram | spawn-terrain | 2 / 8 | ground death-spawn terrain repair |
| Inferno Dragon | inferno-reset | 1 / 4 | — |
| Ice Golem | bank-rounding | 1 / 4 | — |
| Mega Minion | — | 1 / 4 | — |
| Dart Goblin | — | 1 / 4 | — |
| Goblin Gang | secondary-members | 2 / 8 | — |
| Electro Wizard | split-bolts | 1 / 4 | — |
| Elite Barbarians | — | 1 / 4 | — |
| Hunter | pellet-blocker | 1 / 4 | primary behavior repair |
| Executioner | — | 1 / 4 | — |
| Bandit | dash-contact | 1 / 4 | — |
| Royal Recruits | barbs-recruits | 1 / 4 | — |
| Night Witch | spawner-freeze | 2 / 8 | primary behavior repair |
| Bats | — | 1 / 4 | — |
| Royal Ghost | ghost-hover | 1 / 4 | — |
| Ram Rider | snare-choice | 1 / 4 | primary behavior repair |
| Zappies | — | 1 / 4 | — |
| Rascals | secondary-members | 2 / 8 | — |
| Cannon Cart | cage-cart-death, cart-building, cart-morph | 1 / 4 | primary behavior repair |
| Mega Knight | — | 1 / 4 | — |
| Skeleton Barrel | death-payload-origin | 2 / 8 | — |
| Flying Machine | — | 1 / 4 | — |
| Wall Breakers | — | 1 / 4 | — |
| Royal Hogs | — | 1 / 4 | — |
| Goblin Giant | — | 2 / 8 | — |
| Fisherman | hook-windup | 1 / 4 | primary behavior repair |
| Magic Archer | — | 1 / 4 | — |
| Electro Dragon | dragon-chain | 1 / 4 | — |
| Firecracker | recoil | 1 / 4 | — |
| Elixir Golem | blob-elixir, spawn-terrain | 3 / 12 | ground death-spawn terrain repair |
| Battle Healer | — | 1 / 4 | — |
| Skeleton Dragons | — | 1 / 4 | — |
| Mother Witch | curse-death, curse-impact | 2 / 8 | primary behavior repair |
| Electro Spirit | — | 1 / 4 | — |
| Electro Giant | reflection | 1 / 4 | — |
| Cannon | — | 0 / 0 | — |
| Goblin Hut | spawner-types, spawner-freeze | 1 / 4 | primary behavior repair |
| Mortar | — | 0 / 0 | — |
| Inferno Tower | — | 0 / 0 | — |
| Bomb Tower | — | 1 / 4 | — |
| Barbarian Hut | spawner-freeze | 1 / 4 | primary behavior repair |
| Tesla | — | 0 / 0 | — |
| Elixir Collector | collector, collector-freeze, collector-rage | 0 / 0 | primary behavior repair |
| X-Bow | — | 0 / 0 | — |
| Tombstone | spawner-types, spawner-freeze | 1 / 4 | primary behavior repair |
| Furnace | spawner-freeze | 1 / 4 | primary behavior repair |
| Goblin Cage | cage-cart-death | 1 / 4 | — |
| Fireball | fireball-travel | 0 / 0 | — |
| Arrows | — | 0 / 0 | — |
| Rage | collector-rage, rage-team | 0 / 0 | — |
| Rocket | — | 0 / 0 | — |
| Goblin Barrel | — | 1 / 4 | — |
| Freeze | freeze-team, collector-freeze, spawner-freeze | 0 / 0 | — |
| Mirror | mirror-repeat, mirror-level | 0 / 0 | — |
| Lightning | — | 0 / 0 | — |
| Zap | — | 0 / 0 | — |
| Poison | poison-stack | 0 / 0 | — |
| Graveyard | — | 1 / 4 | — |
| The Log | own-side-spells | 0 / 0 | — |
| Tornado | tornado-rate | 0 / 0 | primary behavior repair |
| Clone | clone, cart-building | 0 / 0 | — |
| Earthquake | earthquake-ticks | 0 / 0 | — |
| Barbarian Barrel | own-side-spells | 1 / 4 | — |
| Heal Spirit | — | 1 / 4 | — |
| Giant Snowball | — | 0 / 0 | — |
| Royal Delivery | own-side-spells, delivery-tower | 1 / 4 | — |

## Evidence index

- **knight-source** (combat): Knight source HP/speed/range/first-hit values. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **ground-targeting** (combat): Knight rejects flying targets. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **air-targeting** (combat): Musketeer acquires a flying target. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **buildings-only** (combat): Giant ignores defending troops. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **shield** (combat): Guards shield absorbs a complete hit without HP overflow. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **golem-split** (spawn): Golem creates two Golemites on death. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **cage-cart-death** (spawn): Cage releases Brawler; Cart changes to BrokenCannon. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **spawner-types** (spawn): Source child type appears during live simulation. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **collector** (spawn): Collector produces elixir. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **charge-reset** (combat): Prince charge and movement reset under stun. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **freeze-team** (buff): Freeze affects enemies and leaves allied troops unbuffed. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **mirror-repeat** (deployment-rule): Mirror repeats last card with cost and level changes. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **clone** (spawn): Clone creates one-HP troop copies and excludes buildings. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **curse-death** (spawn): Curse death creates an allied Voodoo Hog. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **blob-elixir** (combat): Final Elixir Golem stage grants opponent elixir on death. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **inferno-reset** (combat): Inferno Dragon ramp increases damage and stun resets lock. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **reflection** (combat): Electro Giant retaliates with damage and stun without recursion. [tests/expanded-battle.test.cjs](../../tests/expanded-battle.test.cjs).
- **curse-impact** (combat): No early curse; lethal projectile applies curse even after caster death. [tests/card-behavior-v271.test.cjs](../../tests/card-behavior-v271.test.cjs).
- **snare-choice** (combat): Unsnared preference; committed target retained; expired snare ignored. [tests/card-behavior-v271.test.cjs](../../tests/card-behavior-v271.test.cjs).
- **pellet-blocker** (combat): Nearest body takes pellet independent of entity insertion order. [tests/card-behavior-v271.test.cjs](../../tests/card-behavior-v271.test.cjs).
- **collector-freeze** (buff): Freeze pauses current remaining production time. [tests/card-behavior-v271.test.cjs](../../tests/card-behavior-v271.test.cjs).
- **collector-rage** (buff): Rage speeds current remaining production time. [tests/card-behavior-v271.test.cjs](../../tests/card-behavior-v271.test.cjs).
- **spawner-freeze** (buff): Freeze pauses each of six source spawn cycles, retaining remaining time. [tests/card-behavior-v271.test.cjs](../../tests/card-behavior-v271.test.cjs).
- **cart-building** (combat): Broken Cart is stationary, attracts Giant, and is excluded by Clone. [tests/card-behavior-v271.test.cjs](../../tests/card-behavior-v271.test.cjs).
- **cart-morph** (combat): Source 150ms morph delay and retained attack target. [tests/card-behavior-v271.test.cjs](../../tests/card-behavior-v271.test.cjs).
- **hook-windup** (combat): Source hook windup is stationary; stun/push/death/invisibility cancel it. [tests/card-behavior-v271.test.cjs](../../tests/card-behavior-v271.test.cjs).
- **tornado-rate** (combat): Equal-time displacement at 20Hz, 60Hz, and 10Hz; attacks continue. [tests/card-behavior-v271.test.cjs](../../tests/card-behavior-v271.test.cjs).
- **spawn-terrain** (spawn): 16 bridge death cases cover four split stages, two teams, two lanes. [tests/card-pathing-v271.test.cjs](../../tests/card-pathing-v271.test.cjs).
- **source-spread** (spawn): Valid Golemite spread retained; whole-body wall bounds repaired. [tests/card-behavior-v271.test.cjs](../../tests/card-behavior-v271.test.cjs).
- **death-payload-origin** (spawn): Death bomb deals199 damage at origin; skeleton container settles later children; Rage remains at death origin. [tests/card-behavior-v271.test.cjs](../../tests/card-behavior-v271.test.cjs).
- **bank-rounding** (spawn): Fractional body radii settle to nearby bank without distant-bridge teleport. [tests/card-behavior-v271.test.cjs](../../tests/card-behavior-v271.test.cjs).
- **windup-period** (combat): Attack period includes windup without adding it twice. [tests/mechanics.test.cjs](../../tests/mechanics.test.cjs).
- **recoil** (combat): Attack recoil changes caster position. [tests/mechanics.test.cjs](../../tests/mechanics.test.cjs).
- **split-bolts** (combat): Two enemies split bolts; one enemy receives both. [tests/mechanics.test.cjs](../../tests/mechanics.test.cjs).
- **fireball-travel** (combat): Delayed Fireball damages ground and air. [tests/mechanics.test.cjs](../../tests/mechanics.test.cjs).
- **princess-projectile** (combat): Damage-bearing CustomFirstProjectile deals damage. [tests/projectile-v160.test.cjs](../../tests/projectile-v160.test.cjs).
- **dragon-chain** (combat): Chain target count includes primary target. [tests/source-timing.test.cjs](../../tests/source-timing.test.cjs).
- **poison-stack** (combat): Independent Poison areas stack; refresh of one area does not. [tests/source-timing.test.cjs](../../tests/source-timing.test.cjs).
- **earthquake-ticks** (combat): Three ground-only ticks including expiry boundary. [tests/source-timing.test.cjs](../../tests/source-timing.test.cjs).
- **balloon-preload** (combat): Displacement clears Balloon preload. [tests/v250-fidelity.test.cjs](../../tests/v250-fidelity.test.cjs).
- **dash-contact** (combat): Bandit dash ends at target body edge. [tests/v250-fidelity.test.cjs](../../tests/v250-fidelity.test.cjs).
- **hog-jump** (movement): Open-river jump uses source speed; bridge crossing stays grounded. [tests/v250-fidelity.test.cjs](../../tests/v250-fidelity.test.cjs).
- **ghost-hover** (movement): Ghost can hover across water without a jump animation. [tests/v250-fidelity.test.cjs](../../tests/v250-fidelity.test.cjs).
- **lumberjack-rage** (spawn): Death bottle resolves Rage after its source delay. [tests/fixes-v120.test.cjs](../../tests/fixes-v120.test.cjs).
- **rage-team** (buff): Rage affects both allied seats and creates no targetable bottle. [tests/fixes-v120.test.cjs](../../tests/fixes-v120.test.cjs).
- **mirror-level** (deployment-rule): Mirror uses own source level offset; opening hand exclusion. [tests/source-card-rules.test.cjs](../../tests/source-card-rules.test.cjs).
- **own-side-spells** (deployment-rule): Own-territory deployment restriction. [tests/source-card-rules.test.cjs](../../tests/source-card-rules.test.cjs).
- **delivery-tower** (deployment-rule): Royal Delivery can be placed on allied tower. [tests/source-card-rules.test.cjs](../../tests/source-card-rules.test.cjs).
- **archer-formation** (formation): Preview/live member count, horizontal placement, source stagger. [tests/v170-movement-formations.test.cjs](../../tests/v170-movement-formations.test.cjs).
- **triangles** (formation): Three-member mirrored formations. [tests/v170-movement-formations.test.cjs](../../tests/v170-movement-formations.test.cjs).
- **barbs-recruits** (formation): Barbarian radial spread and full-lane Recruits. [tests/v170-movement-formations.test.cjs](../../tests/v170-movement-formations.test.cjs).
- **army-formation** (formation): 15 members distributed over multiple radii. [tests/v170-movement-formations.test.cjs](../../tests/v170-movement-formations.test.cjs).
- **secondary-members** (formation): Primary/secondary member composition and front/back roles. [tests/v170-movement-formations.test.cjs](../../tests/v170-movement-formations.test.cjs).
- **bowler-deploying** (combat): Bowler projectile damages a deploying troop. [tests/deployment-v110.test.cjs](../../tests/deployment-v110.test.cjs).

## Remaining native fidelity work

- Passing deployment means the card dispatches and remains finite for three simulated seconds; it does not prove correct combat behavior.
- The route sweep isolates movement from combat. It does not prove every aggro, retarget, push, crowd, building-placement, or battle interaction.
- The engine is an independent interpreter of pinned 3.2557.2 tables, not the native binary. No modern balance values were introduced.
- There is no matched historical video/reference trace for every card; native attack cadence, hit ordering, special interactions and visual identity are not certified.
- Exact Hunter pellet spread, native Tornado attraction/mass response, and Tesla hide/rise timing remain known fidelity gaps.
- The source graph includes attached-only and stationary entities; these are not falsely counted as independently mobile routes.
- Legal spawn settling is a deterministic browser-engine repair, not a claim of exact native collision resolution.

Card-specific limitations and exact source-reachable entities are retained in [the JSON ledger](card-coverage.json). In particular, cards with only deployment/route coverage still need dedicated attacks and special-ability scenarios. Passing shared engine tests must not be relabeled as an exhaustive 102-card native comparison.

## Regeneration

`node tests/report-card-coverage-v028.cjs` reads the current catalog and the saved movement report, checks that cited test-title fragments exist, and writes both ledgers. Run the cited suites before refreshing; generation alone does not execute their assertions.
