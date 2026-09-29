# v0.9.0 coverage note
The following roster/behavior inventory is inherited from the earlier implementation;
it is not proof of native-game parity. The v0.9.0 changes are in BUILD-REPORT.md and
FIDELITY.md. Default card balance stays 3.2557.2. Optional practice overlevels are
outside that snapshot. Original high-resolution textures and source HUD playback
replace additional earlier rendering substitutions.

# Card roster and source interpretation — v0.5.0 (unchanged source roster)

Source fingerprint **3.2557.2**. All 102 visible/enabled records are playable. The roster has 72 troops, 12 buildings and 18 spells; Heal Spirit is treated as a troop despite its historical spell-table location. Numbers below are level 9 and use source rarity-level multipliers. Damage is per hit, wave, or second as explicitly labeled, not an aggregate spell total. Spawned troops have separate stats in the card dialog.

For every unmodified source field, use the in-game **View Source Data** button or `assets/game/data.json`. The feature column is a guide to interpreted mechanic families, not native-matchup parity certification. `FIDELITY.md` explains the distinction.

| Card | Type | Elixir | HP | Damage record | Tiles/sec | Hit interval | Source mechanic families |
|---|---|---:|---:|---|---:|---:|---|
| Knight | Troop | 3 | 1380 | 167 per hit | 1 | 1.2 s | Direct attack |
| Archers | Troop | 3 | 252 | 89 per hit | 1 | 1.2 s | Targets air |
| Goblins | Troop | 2 | 167 | 99 per hit | 2 | 1.1 s | Direct attack |
| Giant | Troop | 5 | 3275 | 211 per hit | 0.75 | 1.5 s | Buildings only |
| P.E.K.K.A | Troop | 7 | 3125 | 678 per hit | 0.75 | 1.8 s | Direct attack |
| Minions | Troop | 3 | 190 | 84 per hit | 1.5 | 1 s | Flying; Targets air |
| Balloon | Troop | 5 | 1396 | 798 per hit | 1 | 3 s | Flying; Buildings only; Death spawn |
| Witch | Troop | 5 | 696 | 111 per hit | 1 | 1.1 s | Targets air; Troop spawner; Area damage |
| Barbarians | Troop | 5 | 555 | 159 per hit | 1 | 1.4 s | Direct attack |
| Golem | Troop | 8 | 4256 | 259 per hit | 0.75 | 2.5 s | Buildings only; Targets air; Death spawn; Death effect |
| Skeletons | Troop | 1 | 67 | 67 per hit | 1.5 | 1 s | Direct attack |
| Valkyrie | Troop | 4 | 1654 | 221 per hit | 1 | 1.5 s | Area damage |
| Skeleton Army | Troop | 3 | 67 | 67 per hit | 1.5 | 1 s | Direct attack |
| Bomber | Troop | 2 | 275 | 184 per hit | 1 | 1.8 s | Area damage |
| Musketeer | Troop | 4 | 598 | 181 per hit | 1 | 1.1 s | Targets air |
| Baby Dragon | Troop | 4 | 957 | 133 per hit | 1.5 | 1.5 s | Flying; Targets air; Area damage |
| Prince | Troop | 5 | 1669 | 325 per hit | 1 | 1.4 s | Charge |
| Wizard | Troop | 5 | 598 | 234 per hit | 1 | 1.4 s | Targets air; Area damage |
| Mini P.E.K.K.A | Troop | 4 | 1129 | 598 per hit | 1.5 | 1.7 s | Direct attack |
| Spear Goblins | Troop | 2 | 110 | 67 per hit | 2 | 1.7 s | Targets air |
| Giant Skeleton | Troop | 6 | 2793 | 222 per hit | 1 | 1.5 s | Death spawn |
| Hog Rider | Troop | 4 | 1408 | 264 per hit | 2 | 1.6 s | Buildings only |
| Minion Horde | Troop | 5 | 190 | 84 per hit | 1.5 | 1 s | Flying; Targets air |
| Ice Wizard | Troop | 3 | 590 | 75 per hit | 1 | 1.7 s | Targets air; On-hit status; Area damage |
| Royal Giant | Troop | 6 | 2544 | 254 per hit | 0.75 | 1.7 s | Buildings only |
| Guards | Troop | 3 | 67 | 90 per hit | 1.5 | 1 s | Shield / second form |
| Princess | Troop | 3 | 216 | — | 1 | 3 s | Targets air; Area damage |
| Dark Prince | Troop | 4 | 1030 | 206 per hit | 1 | 1.3 s | Shield / second form; Charge; Area damage |
| Three Musketeers | Troop | 9 | 598 | 181 per hit | 1 | 1.1 s | Targets air |
| Lava Hound | Troop | 7 | 3150 | 45 per hit | 0.75 | 1.3 s | Flying; Buildings only; Targets air; Death spawn |
| Ice Spirit | Troop | 1 | 190 | 91 per hit | 2 | 0.3 s | Targets air; On-hit status; One-shot attack; Area damage |
| Fire Spirits | Troop | 2 | 91 | 178 per hit | 2 | 0.3 s | Targets air; One-shot attack; Area damage |
| Miner | Troop | 3 | 1000 | 160 per hit | 1.5 | 1.2 s | Direct attack |
| Sparky | Troop | 6 | 1200 | 1100 per hit | 0.75 | 4 s | Area damage |
| Bowler | Troop | 5 | 1729 | 239 per hit | 0.75 | 2.5 s | Line projectile; Area damage |
| Lumberjack | Troop | 4 | 1060 | 200 per hit | 2 | 0.8 s | Death spawn |
| Battle Ram | Troop | 4 | 756 | 220 per hit | 1 | 0.4 s | Buildings only; Charge; Death spawn; One-shot attack |
| Inferno Dragon | Troop | 4 | 1070 | 30 per hit | 1 | 0.4 s | Flying; Targets air; Ramping damage |
| Ice Golem | Troop | 2 | 994 | 70 per hit | 0.75 | 2.5 s | Buildings only; Targets air; Death effect |
| Mega Minion | Troop | 3 | 695 | 258 per hit | 1 | 1.6 s | Flying; Targets air |
| Dart Goblin | Troop | 3 | 216 | 100 per hit | 2 | 0.7 s | Targets air |
| Goblin Gang | Troop | 3 | 167 | 99 per hit | 2 | 1.1 s | Direct attack |
| Electro Wizard | Troop | 4 | 590 | 91 per hit | 1.5 | 1.8 s | Targets air; On-hit status |
| Elite Barbarians | Troop | 6 | 1110 | 318 per hit | 1.5 | 1.4 s | Direct attack |
| Hunter | Troop | 4 | 696 | 70 per hit | 1 | 2.2 s | Targets air; Line projectile; Area damage |
| Executioner | Troop | 5 | 1010 | 140 per hit | 1 | 0.9 s | Targets air; Line projectile; Area damage |
| Bandit | Troop | 3 | 750 | 160 per hit | 1.5 | 1 s | Dash / jump |
| Royal Recruits | Troop | 7 | 440 | 110 per hit | 1 | 1.3 s | Shield / second form |
| Night Witch | Troop | 4 | 750 | 260 per hit | 1 | 1.5 s | Death spawn; Troop spawner |
| Bats | Troop | 2 | 67 | 67 per hit | 2 | 1.3 s | Flying; Targets air |
| Royal Ghost | Troop | 3 | 1000 | 216 per hit | 1.5 | 1.8 s | Concealment; Area damage |
| Ram Rider | Troop | 5 | 1461 | 220 per hit | 1 | 1.8 s | Buildings only; Charge; Attached attacker |
| Zappies | Troop | 4 | 440 | 96 per hit | 1 | 2.1 s | Targets air; On-hit status |
| Rascals | Troop | 5 | 1515 | 110 per hit | 1 | 1.5 s | Direct attack |
| Cannon Cart | Troop | 5 | 742 | 176 per hit | 1 | 1 s | Shield / second form; Death spawn |
| Mega Knight | Troop | 7 | 3300 | 222 per hit | 1 | 1.7 s | Dash / jump; Area damage |
| Skeleton Barrel | Troop | 3 | 440 | — | 1.5 | 0.3 s | Flying; Buildings only; Death spawn; One-shot attack |
| Flying Machine | Troop | 4 | 510 | 142 per hit | 1.5 | 1.1 s | Flying; Targets air |
| Wall Breakers | Troop | 2 | 275 | 325 per hit | 2 | 1.2 s | Buildings only; Line projectile; One-shot attack; Area damage |
| Royal Hogs | Troop | 5 | 695 | 59 per hit | 2 | 1.2 s | Buildings only |
| Goblin Giant | Troop | 6 | 2616 | 146 per hit | 1 | 1.5 s | Buildings only; Attached attacker |
| Fisherman | Troop | 3 | 720 | 160 per hit | 1 | 1.3 s | Hook |
| Magic Archer | Troop | 4 | 440 | 111 per hit | 1 | 1.1 s | Targets air; Line projectile; Area damage |
| Electro Dragon | Troop | 5 | 790 | 159 per hit | 1 | 2.1 s | Flying; Targets air; On-hit status; Chain hit |
| Firecracker | Troop | 3 | 252 | — | 1.5 | 3 s | Targets air |
| Elixir Golem | Troop | 3 | 1196 | 211 per hit | 0.75 | 1.3 s | Buildings only; Death spawn |
| Battle Healer | Troop | 4 | 1425 | 123 per hit | 1 | 1.5 s | On-hit area effect |
| Skeleton Dragons | Troop | 4 | 440 | 133 per hit | 1.5 | 1.9 s | Flying; Targets air; Area damage |
| Mother Witch | Troop | 4 | 560 | 110 per hit | 1 | 1.1 s | Targets air; On-hit status |
| Electro Spirit | Troop | 1 | 190 | 82 per hit | 2 | 0.3 s | Targets air; On-hit status; Chain hit; One-shot attack |
| Electro Giant | Troop | 8 | 3591 | 159 per hit | 0.75 | 2.1 s | Buildings only; Damage reflection |
| Cannon | Building | 3 | 742 | 175 per hit | — | 1 s | Direct attack |
| Goblin Hut | Building | 5 | 844 | — | — | 10 s | Death spawn; Troop spawner |
| Mortar | Building | 4 | 1219 | 220 per hit | — | 5 s | Area damage |
| Inferno Tower | Building | 5 | 1452 | 35 per hit | — | 0.4 s | Targets air; Ramping damage |
| Bomb Tower | Building | 4 | 1126 | 184 per hit | — | 1.6 s | Death spawn; Area damage |
| Barbarian Hut | Building | 7 | 1144 | — | — | 10 s | Death spawn; Troop spawner |
| Tesla | Building | 4 | 954 | 190 per hit | — | 1.1 s | Targets air; Concealment |
| Elixir Collector | Building | 6 | 888 | — | — | 1 s | Elixir generation |
| X-Bow | Building | 6 | 1330 | 34 per hit | — | 0.3 s | Direct attack |
| Tombstone | Building | 3 | 440 | — | — | 10 s | Death spawn; Troop spawner |
| Furnace | Building | 4 | 844 | — | — | 10 s | Troop spawner |
| Goblin Cage | Building | 4 | 800 | — | — | 10 s | Death spawn |
| Fireball | Spell | 4 | — | 572 per hit | — | — | Projectile travel, area damage and push |
| Arrows | Spell | 3 | — | 101 per wave | — | — | Three projectile waves |
| Rage | Spell | 2 | — | — | — | — | Friendly speed/attack buff |
| Rocket | Spell | 6 | — | 1232 per hit | — | — | Projectile travel and area damage |
| Goblin Barrel | Spell | 3 | — | — | — | — | Projectile delivery and Goblin spawn |
| Freeze | Spell | 4 | — | 95 per hit | — | — | Enemy freeze and damage |
| Mirror | Spell | Last + 1 | — | — | — | — | Excluded from opening hand; last card, own level + offset |
| Lightning | Spell | 6 | — | 877 per hit | — | — | Three high-HP targets |
| Zap | Spell | 2 | — | 159 per hit | — | — | Area damage, stun/reset |
| Poison | Spell | 4 | — | 75 per second | — | — | Periodic damaging area |
| Graveyard | Spell | 5 | — | — | — | — | Timed Skeleton area spawner |
| The Log | Spell | 2 | — | 240 per hit | — | — | Rolling ground hit and push |
| Tornado | Spell | 3 | — | 140 per second | — | — | Pulling periodic area |
| Clone | Spell | 3 | — | — | — | — | One-HP friendly troop copies |
| Earthquake | Spell | 3 | — | 68 per second | — | — | Ground periodic damage, building multiplier |
| Barbarian Barrel | Spell | 2 | — | 200 per hit | — | — | Rolling hit and Barbarian spawn |
| Heal Spirit | Troop | 1 | 191 | 91 per hit | 2 | 0.3 s | Targets air; One-shot attack; Area damage |
| Giant Snowball | Spell | 2 | — | 159 per hit | — | — | Area damage, push and slow |
| Royal Delivery | Spell | 3 | — | 362 per hit | — | — | Delayed ground delivery and Recruit spawn |
