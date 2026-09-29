# Web Royale v0.29.0

This build adds the requested sandbox, presentation fixes, chest opening flow, and original event tower styles to v0.28. It retains the supplied 102-card snapshot and existing custom progression rules.

## Sandbox

Use **Sandbox** beside Battle on the home screen, or open it from Settings/Menu. Select any of the 102 cards, Blue or Red, and a level from **0 to 99**, then tap the arena. Placement is allowed on either side. Mirror uses that team's previous card.

There is no time limit, AI opponent, win/loss result, elixir cost, or change to your collection, rewards, learning history, or saved replays. Pause permits placement while stopped; Clear removes troops and active effects. Towers lets you independently enable each King and Princess Tower for both teams and set tower level. Reset reapplies those choices. Show targets draws each unit's actual chosen target.

Levels outside the original data are debug extrapolations using the existing 10% growth convention, not official game levels. Normal collection and match level rules remain unchanged.

## Visual and gameplay presentation changes

- Corrected Legendary Book, Book of Books, and Chest Key orientation using the original source transforms.
- Kept the entire selected-deck banner inside its scroll area.
- Removed the plus and caption from empty home chest slots.
- Aligned authored attack contact frames with simulated damage/projectile release; restored source-speed recovery instead of stretching it across reload time.
- Made Giant and other ground-unit walking cycles follow actual distance, stopping their feet when blocked. Flying wingbeats retain a separate clock.
- Restored source charge, spawn, dash, readiness, underground movement and Fisherman hook effects/poses. Fixed the stationary Cannon Cart recoil being mistaken for a rotation pose atlas.

Normal combat mechanics remain replay engine **0.28**. Historical 0.26/0.27 playback remains available. See `docs/verification-v029/ANIMATION-FX.md` for the source markers and mechanical comparison evidence.

## Chests and tower styles

Free, Crown, earned, shop and Trophy Road chests now show an opening, sequential actual rewards, card rarity/new-card labels, remaining reward count, and summary. Tap to reveal or continue; Skip jumps to the summary. The reward is saved before presentation, so closing or reloading cannot duplicate or erase the grant.

The source chest/card timelines and seven opening/reveal sounds were recovered from the supplied APK. Lightning, Legendary King's and Royal Wild use the nearest available source chest presentation; those three are not claimed as exact visual matches. The supplied YouTube page loaded, but its player failed after seeking, so frame-by-frame timing against that video remains unverified.

**Gold Rush, Gem Rush and Elixir Pump** use complete original King/Princess assemblies and team colors. They are available in the local shop for 750 gems each and can be equipped in Collection → Tower Skins. These are original event variants exposed as local cosmetics. Complete seasonal tower artwork was not present in the inspected source; this is not the full seasonal skin catalogue.

## Baby Dragon and fidelity limits

Baby Dragon stays idle when no enemy targets exist. With both Princess Towers intact, the tested empty-board placements selected the nearer one. A cross-lane route can occur after a Princess Tower falls: current fallback navigation compares tower centers, which can prefer the opposite Princess over the larger, nearer-edge King. That case is documented, but the original engine's preference is not established, so this release does not claim to fix it. Use **Show targets** in Sandbox to inspect the destination.

The existing per-card coverage ledger remains in `docs/verification-v028/CARD-COVERAGE.md`. Presentation, regression tests, and scripted card scenarios do not establish complete 1:1 native behavior for every interaction.

## Verification

The complete regression run passed **759 tests, 0 failures**. Desktop and phone browser checks passed for the marked UI, sandbox, chest lifecycle, all three tower purchases/equips, card screens, normal deployment, preserved custom shop rules, tiebreak, all fifteen arenas, reload and historical replays. The accepted camera, arena CSS and original native/presentation data retain their original hashes. Evidence is included in `docs/verification-v029/`.

## Opening the build

Extract the whole ZIP and run `Web-Royale/open offline.bat`. The archive contains editable source, the complete built website and local assets; no prior version or asset download is required. Source image/audio copies can be restored automatically from the verified `dist/` files before rebuilding. The existing save format and customary offline origin are retained.

Use Settings → Export Save before changing browser or localhost port. The sandbox itself never changes progression.
