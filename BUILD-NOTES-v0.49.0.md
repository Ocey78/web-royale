# Web Royale v0.49.0 release notes

This build updates spell presentation, graphics performance, swarm labels, custom arenas, Touchdown, shop cards and AI deck variety. Extract the entire ZIP and run `Web-Royale/open offline.bat`. The ready-to-play website, editable source and Windows launchers are included.

## Spell animation changes

The two supplied videos were used to compare cast timing, floor footprints, particles and projectile trails. Rage, Poison and Graveyard now size their floor artwork from visible animation frames instead of empty first frames. Rage's central cast flash fades promptly. Area particles spread across the spell footprint, Earthquake cracks reach their visible frames and cover the affected ground, and Tornado has visible moving wind bands. Continuous projectile trails emit without the gaps introduced by restarting truncated particle batches. One-shot ground effects do not restart indefinitely. Initial-deck spell graphics are prepared during battle loading to reduce first-cast work.

The existing source art and game rules remain the basis of the spells. The supplied build uses historical game data; this update does not import modern spell balance, new card mechanics or current app animation assets. The visual corrections move the browser effects closer to the reference videos, but they are not pixel-perfect recreations of the current app. Tornado includes procedural wind bands because the available native wind export is faint and small.

## Graphics and performance

Ultra is available for each graphics category in Settings. It uses denser source rendering, smooth animation, more particles and a WebGL finishing shader with restrained sharpening, color and glow. The shader falls back to the existing canvas renderer if WebGL is unavailable. This renderer uses authored scene meshes and texture atlases; Ultra does not add new 3D models or detail absent from the supplied texture assets.

High, Max and Ultra avoid the previous oversized intermediate rasters. Tinted images use a larger bounded reuse cache, and particle workloads have explicit frame limits. Source textures and animation definitions are preserved; bounded sampling reduces repeated or excessive particle work.

A local headless Chrome comparison used a fresh page for every tier, the same seeded 40-Knight battle with active Rage and Poison, and an 810 by 1758 canvas. After seven warmup frames, thirty frames were measured:

| Setting | Original median drawing time | Updated median drawing time | Updated time including readback |
| --- | ---: | ---: | ---: |
| Good | 3.9 ms | 3.8 ms | 22.3 ms |
| High | 105.6 ms | 5.9 ms | 28.3 ms |
| Max | 474.1 ms | 5.9 ms | 34.0 ms |
| Ultra | Not available | 7.4 ms | 35.3 ms |

Drawing time measures submission of the canvas work. The readback column also forces completion of queued rendering. These measurements demonstrate reduced rendering overhead in this workload, not a guaranteed frame rate or complete removal of lag on every device. Cold scene rendering still has startup cost. Ultra's shader executed all 37 measured frames without a reported error.

## Swarm levels and shop

Settings includes **Compact swarm levels**. Turn it off to show the level above each visible bat, minion, skeleton, goblin and other swarm member. The switch works from both the main menu and battle settings, persists in the profile and also applies in Potato Mode. Compact labels remain the default.

Shop cards retain their native card art and rarity frames with calmer accents, separated quantity labels, clearer upgrade progress and aligned purchase buttons. Desktop and narrow phone layouts were checked, including free rewards and purchases.

## Maps and Touchdown

Custom environments now use distinct floors, perimeter architecture and props with filled outer scenery. Animated snow, embers, petals, fireflies, water glints and banners match their themes. Static scenery stays cached while animation is drawn separately. Ultra retains Max's bounded ambient detail.

Touchdown uses the complete stadium image supplied with the request, including the stands, statues, horns, entrances and pitch. The image is mapped to the existing playable field and scoring lines for each Touchdown layout. Its original resolution is 551 by 647 pixels; this is a reference-image stadium, not a recovered high-resolution native stadium model. If that image cannot load, the existing native Touchdown pitch is used as a fallback.

## AI decks

The full opponent pool contains **11,284 distinct eight-card decks** across ten archetypes: **20 documented source lineups** and **11,264 generated variants**. Six seeds have StatsRoyale evidence and sixteen have RoyaleAPI evidence, with two overlapping lineups. Variants keep protected deck cores and make bounded support-card substitutions. Counts use unique card sets rather than different card orders.

The catalogue is used by matchmaking, casual AI, battle seats and training. Arena unlocks and special-mode restrictions still apply, so earlier arenas have smaller eligible pools. The complete catalogue is available from arena 12 in the supplied card data. Unsupported modern cards and mechanics are excluded. Source composition evidence does not imply a current win rate or meta ranking. See `docs/DECK_CATALOGUE.md` for lineups, source links and generation rules.

## Verification

All 1,244 regression checks passed. Browser checks exercised all 17 independently rendered spells for both teams and a mirrored Fireball, Ultra shader execution, live swarm-label switching, saved settings and shop purchases at desktop and phone widths. Unit and integration checks cover spell sizing, trails, tint reuse, custom environments, catalogue legality and training consumption. The final regression results are recorded in `docs/verification-v049/verification.json`.

The local development server now invalidates compressed responses when a file changes, so rebuilding cannot leave it serving an old entry point. No new external runtime dependency or asset download is required to play.
