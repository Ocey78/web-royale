# v0.43.0 approved update — implementation ledger

Base: delivered v0.42.0 archive. User approved the previous scope and confirmed
Team Rumble timing. Work is isolated in work043; no live deploy requested.

## Constraints / decisions
- Other Modes decks use all catalog cards at level 9, without unlocking ranked cards.
- Separate stored decks per selectable casual mode, retaining 4/12/One Shot saves.
- Ranked deck names are 24 characters and page size is five; 100 saved decks maximum.
- One Shot bans spells, Mortar, X-Bow, Miner, and Goblin Drill (even if added later).
- 5v5 has ten seats, five Kings and Princess Towers per side, no river.
- No supplied 5v5 image found; use mirrored five-pair layout, not claim image fidelity.
- 5v5 regulation 300s: 1x until t120, then 2x. Overtime 300s: 3x at t300,
  4x at t480 (three overtime minutes elapsed), 5x at t540. Existing 3v3 unchanged.
- Dead owner King disables passive elixir only; owner Collector/Golem refunds remain.
- Legendary chest chance 0.1% of eligible battle chest awards. Separate battle item
  category roll: 0.1% each wilds/books/coin, granted even with full chest slots.
- Keep old Trophy/Crown claims, receipts, original assets, graphics options and caching.
- Freeze exact v042 simulation for old replays before modifying geometry/damage.

## Tasks (each has regression tests)
1. [x] Casual deck registry/full catalog eligibility and paged named ranked decks.
2. [x] Rumble seats/timing/geometry, large-unit passage routes, old replay preservation.
3. [x] Custom tower anchors/background alignment, layered maps, mirrored hand border.
4. [x] Firecracker secondary fan and impact effects.
5. [x] Permanent magic rewards and receipt-stable rare battle items.
6. [x] UI wiring for decks/5v5/results; viewport checks and screenshots.
7. [x] Full tests, self-play/movement/performance checks, build and verified ZIP.

## Progress / verification rulings
- Core deck, Rumble timing/seats, Firecracker, rewards and renderer tests watched fail then pass.
- Exact v0.42 simulation frozen for old records, separate current 0.43 tag.
- First full suite: 24 failures; old replay-version assertions, deck cap/ownership expectations, row fixture lacking classList, original magic icon provenance. The appropriate contracts/fixtures were updated; no old engine behavior changed.
- Browser caught old grid track widths overruling new deck controls; corrected grid template, then compact overlap test passed.
- Ruling: a battle-earned Legendary Chest opened before any Legendary card is eligible yields one Legendary Wild Card, never an empty chest or a future-arena card. Existing shop eligibility is retained.
- Ruling: no final FPS promise; profile crowded simulation and cache reuse without replacing combat with graphics-only benchmarks.

## Approved late additions
- Center Princess Towers are moved onto their outer towers' row in both team maps.
- Rumble expands to x=-2..20 / y=-2..34. Other custom maps also gain rear aisles;
  3v3 Kings move back for real clearance and Bridge ground widens to 7.5 tiles.
- Radius-aware navigation includes wall-clearance samples; no troop radius shrunk.
- All decorative layers, pointer math, spawn limits and Potato drawing use true bounds.
- Play Again appears beside OK after the normal reveal; same mode/queue/deck, fresh
  opponent/map/seed. Random Deck regenerates. Replays, Sandbox and war tickets excluded.
- One-use reward receipts settle before repeat; the button itself never grants currency.

- Late full suite: only an obsolete hardcoded custom surface width failed. The quality test now checks the actual expanded worldRect multiplied by each density, retaining its purpose.
- Repeat-browser failure traced to test fabrication: marking a live LocalMatchSession as a replay lacks record.duration. Replaced that fixture with an actual captured/stored replay and actual playReplay entry point; no production guard hides the error.
- Corrected the rare magic-item caption to stay within its own reward box (browser red then green).

## Final source checks
- Full suite 1,151/1,151; Chromium UI/combat/repeat 73+53+56, zero uncaught errors.
- All 16 real workers completed learning; 35 crossings/pack probes and 144 rear-tower movement probes pass.
- All 1,195 baseline asset files and protected historical engines/launchers are unchanged.
- Packaging and clean-rebuild results are recorded in the external final delivery report; no deployment performed.
