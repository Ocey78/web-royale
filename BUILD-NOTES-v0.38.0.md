# Web Royale v0.38.0 — deployment fixes, shields and Gem Shop

Based on the uploaded **v0.37.0 Full Build**. This is a full source + prebuilt website archive. Existing arena art/camera, modes, decks, progression, audio, graphics settings and offline launchers are retained.

## Start / update

Export your save from Settings first. Close the old tab and launcher, extract the entire ZIP, and run `Web-Royale/open offline.bat`. Do not run from inside the archive. No Unity, Node installation or rebuild is required to play the packaged `dist/`.

The local save key remains **`web-royale-classic-v4`**. Existing currencies, decks, card progress, chests, shop receipts and graphics settings are retained. Stay on the same browser profile and localhost address to access the same browser save, or import the exported backup. Do not clear site storage just to update cached game files.

For a hosted update, serve the contents of `Web-Royale/dist/` using the existing host/editor. This archive has **not** been published to the live ChatGPT Site.

## Stuck troops and deployment

The live deployment path previously discarded the safe member positions calculated by the placement preview and rebuilt the original formation. This could leave troops inside the riverbank or a Crown Tower footprint. Live deployment now uses those actual validated positions, including the mixed members of Rascals, Skeleton Army and Royal Recruits. Mirror validates and deploys the mirrored card's footprint rather than treating it as an ordinary spell.

Placement and navigation now use the same building clearance. Invalid summoned positions are settled outside terrain and solid buildings. A pre-existing stranded troop gets a nearby legal recovery waypoint and walks toward it at its normal movement speed; it is not teleported across the river. Existing air, hover and jump permissions are retained.

Static-target routes are cached until their target moves, a structure changes, the path becomes blocked or the detour is exhausted. Empty detours retry after a bounded delay instead of freezing indefinitely. Live building obstacles are shared within a simulation tick rather than filtering all actors again for every moving troop.

These fixes cover the reproduced placement, bank and structure cases; they are not a guarantee that every possible crowded battle configuration can never stall.

## Goblin Barrel

The former generic three-unit spawner placed goblins in a straight row, including one inside a directly targeted tower. Goblin Barrel now uses a mirrored three-point formation around its landing point. Invalid positions are moved outside tower/building footprints, water and arena walls. Earlier goblins in the same landing are considered when settling later ones, so edge clamping does not stack the group.

The source deployment delay, unit level, ownership and grouped level-label identity are retained. Off-center aims still use the actual aimed landing point.

## Shield indicators

Guards, Dark Prince and Royal Recruits now use shield HUD artwork while their current shield is greater than zero, including full/partly damaged shields and grouped level badges. Breaking a shield switches to the ordinary health/level artwork; subsequent HP damage cannot bring the shield icon back. Both teams and the bundled native small/medium/number exports are covered.

## Daily Shop: five times the cards

The Daily Shop still has **nine slots**, including the same three free rewards, and still refreshes at 00:00 UTC. Card quantities are multiplied by five without raising the gold prices:

| Paid rarity | Cards | Gold price |
| --- | ---: | ---: |
| Common | 100 | 100 |
| Rare | 25 | 250 |
| Epic | 5 | 500 |
| Legendary | 5 | 1,000 |

The free wild-card bundle is also multiplied by five: **250–1,250 Common**, **125–375 Rare**, **25–95 Epic**, or **5 Legendary**, in steps of five. The rarity probabilities remain 60% / 30% / 9% / 1% respectively. Free Gold Chest and Gem Chest currency amounts are unchanged. Existing daily claims remain claimed; installing the update does not create an extra claim.

## Gem Shop

A new **six-slot card shop** sits below the Daily Shop. Offers use earned gems, not gold or real-money purchases:

| Rarity | Cards | Gem price |
| --- | ---: | ---: |
| Common | 100 | 20 |
| Rare | 25 | 50 |
| Epic | 5 | 100 |
| Legendary | 1 | 200 |

Each rotation has six distinct eligible cards, using rarities available in the reached arenas. One purchase collects that slot and shows **1 / 2**. Buying a second distinct slot grants that offer, then refreshes all six slots and returns the counter to **0 / 2**. The other four unbought offers expire at that refresh. A refreshed rotation may include cards seen previously.

There is no time-based reset. Rotation and first-purchase receipts persist in saves. Reaching another arena does not change the current offers halfway through a rotation; the expanded pool becomes available at the next two-purchase refresh. Insufficient funds, duplicate clicks and stale offers do not spend gems, grant cards or advance the counter. Purchases in other shops do not count. The Hour Shop, Lightning Shop, Daily Shop and existing chest/emote offers remain separate.

## Deck builder and previous features

Removed the stretched blue-wood image behind the regular eight-card deck. The cards, upgrade indicators, add/remove controls and collection remain in their existing positions over the plain deck surface. Four-card and Random Deck modes, hidden hand/King levels, always-visible Princess HP, Full particles and the faster result OK button remain.

## Performance and replay compatibility

The optimization reduces repeated path searches, building-list allocation and square-root work in navigation clearance. It does not reduce card damage, collision radii, AI update rules or simulation tick rate. Existing graphics options remain available.

`tools/benchmark-v038-navigation.cjs` compares the frozen v0.37 engine with this release on an isolated 900-step Knight detour. The included report records **13 searches before versus 1 after**, with exact CPU samples. This is a navigation microbenchmark, not a whole-game FPS or physical-device guarantee.

New recordings use simulation tag **0.38**. The previous **0.32** engine and its boat adapter are frozen from the supplied v0.37 build, so existing recordings are not replayed under the changed spawn/path rules. Earlier historical engines remain available. Recorded-input fixtures, repeated seeks and original source hashes verify compatibility, including four-card and boat recordings.

## Verification scope

See `docs/verification-v038/VERIFICATION.md` and its JSON reports for the release test results. The tests cover the changed behavior plus the full existing suite, including all 102 cards and the event-mode timelines. Desktop and phone-size UI checks use the actual generated JavaScript, DOM, Canvas and native art in Chromium, with a file-backed asset/storage adapter because ordinary browser HTTP navigation is blocked in this environment.

No physical iPhone/Safari, real Windows launcher, live-site deployment or real browser service-worker upgrade was exercised during this update. The retained Node tests cover the static host, manifest, save-adapter and worker code separately.
