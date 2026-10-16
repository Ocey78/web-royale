# Web Royale 0.58.0 — Ultimate Clash

Ultimate Clash is available from Other Modes. It has its own saved decks, 20 custom cards with individual portraits and descriptions, two Hero choices and a one-cycle Royale Escort Evolution. These cards do not enter normal collections, rewards, shops or decks.

## Battle rules

- Store up to 20 elixir.
- Four minutes of regulation followed by three minutes of overtime, then the existing visible tiebreaker.
- Elixir generation: 1× initially, 2× at 2:00, 2.5× at 3:00, 3× at 4:00, and 4× at 6:00.
- Princess Towers have eight times their standard health and use evolved Princess attacks and artwork. King Towers have ten times their standard health.

## Cards

| Cost | Card |
|---:|---|
| 8 | Mega Minion Horde, with Hero form |
| 10 | Lightning Storm |
| 4 | Heal Spell |
| 12 | Balloon Parade |
| 9 | Executioner Cage |
| 5 | Builder |
| 7 | Magic Trio |
| 6 | Frostbite, with a three-elixir Hero Snowball ability |
| 5 | Harvest |
| 6 | Overcharged Tesla |
| 15 | Three P.E.K.K.As |
| 4 | Meteor Shower |
| 18 | CODE RED |
| 14 | Royale Escort, with one-cycle Evolution |
| 9 | King's Dropoff |
| 8 | Elite Barbarians |
| 4 | Elixir Witch |
| 5 | Unstable Egg |
| 3 | Fisherman |
| 4 | Bomb Squad |

The card information panel describes each custom mechanic. Opponents, the Learning Center and replay seeking support the new mode. Spell waves and random egg outcomes use the match's seeded random generator.

## Artwork and rendering

The Builder uses original Clash of Clans worker artwork and building animations obtained from Supercell's public asset CDN. Ultimate effects use the existing source artwork, with grey storm clouds, pink Harvest fields and beams, orange meteor fields, source Fireball/Rocket/Snowball flight sprites, and an exposed evolved Tesla. The cage and egg portraits use their source sprites.

The renderer now computes exact skinned mesh bounds directly from packed buffers and reuses bounds for identical animation poses. The measured 12-actor workload improved from 3.28 to 2.14 ms for repeated idle poses and from 22.85 to 14.12 ms for mixed effects. Those are synchronous drawing costs on the test machine, not full-game FPS. The before/after workload images were pixel-identical.

## Interpreted details

Balloon Parade contains six Balloons, matching Royal Recruits. The second Builder heals 1% of building maximum health per second. Frostbite uses the native Freeze duration and a nine-second Graveyard-style spirit-spawning field. Harvest uses the listed basic troop families, including their native evolutions; distinct units such as Guards, Mega Minions and Elite Barbarians receive the 1-elixir catch-all reward. Unspecified unit stats come from the named native card counterpart.

## Verification

The final rebuilt release passed 1,816 tests with zero failures and one pre-existing skip. Fifty new tests cover every custom card, timing boundaries, real Evo Princess damage, exact Harvest reward families, independent deck saves, replay seeking, two complete AI matches, source asset loading and exact rendering bounds. Both browser checks passed with no JavaScript errors or missing assets. Independent review resolved six findings and passed 41 focused checks. Build hashes, reports and screenshots are recorded in `docs/qa/v058/`.
