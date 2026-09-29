# Web Royale v0.32.0 — Diagonal Crown approaches

v0.31 introduced overly rigid lane guides. An off-lane Baby Dragon made a measured 90-degree corner when it reached the guide; a fallen-lane approach made a further 48-degree turn when the King entered sight. These were changes to the actual route, not sprite lag.

Troops now take a clear diagonal toward the selected Crown. Selecting the appropriate Princess or King remains separate from navigating to it. This removes the forced sideways leg and the turn caused solely by the same tower entering sight. Ground units still use radius-aware routes around river banks and buildings; nearby enemies can still pull troops away. No rotation delay, acceleration, speed change or artificial curved-flight rule has been introduced.

## Reference comparison

Supercell's [31 March 2025 pathfinding update](https://supercell.com/en/games/clashroyale/blog/release-notes/april-update/) describes replacing horizontal lane entry with more diagonal movement and anticipating buildings before collision. The official [TV Royale update video](https://www.youtube.com/watch?v=mgtVaUE2d8s) covers general gameplay improvements near 3:00. Detailed evidence and any playback limitations are recorded under `docs/verification-v032/`.

This release adopts the documented modern diagonal approach within the existing classic card roster and custom progression. The supplied older APK tables do not provide the native waypoint algorithm or a universal turning-speed value. This is an independently implemented approximation; exact native timing, collision costs and every possible interaction are not claimed.

## Preserved behavior

- Nearest valid enemies inside sight, committed attack locks, target categories, minimum ranges and existing attack timing.
- Same-lane Princess preference and King fallback after that Princess is absent; custom boat target layouts.
- Free aerial pursuit, ground bridge constraints, source speeds, slow/freeze effects and knockback.
- Sandbox with all 102 cards, either team, levels 0–99, configurable towers and unlimited time.
- Custom progression, chest opening, tower skins, original art, camera and UI.
- Historical replays: the exact delivered v0.31 engine is frozen alongside earlier engines; new recordings use 0.32.

## Verification

- The complete automated suite passed **893/893** tests with no failures, cancellations or skips.
- All 28 new diagonal-movement regressions failed on v0.31 and passed after the correction. The built-browser regression also reproduced the old King-approach snap before passing on v0.32.
- Independent geometry checks passed 616/616 routes across 77 mobile source entities, both teams and lanes, with open routes and persistent obstacles. These checks move the tested entity while keeping obstacles fixed; they are geometry coverage, not 616 complete matches.
- Twelve additional controls passed for nearby aerial pursuit, slow, freeze, knockback resumption, attack lock and tower-free idle.
- Browser checks passed mirrored King approaches, diagonal entry and nearby-enemy pursuit on desktop and phone. No application errors or missing game assets occurred.
- All 19 browser replay cases passed, including 14 stored historical fixtures. Normal pointer deployment, Cannon Cart targeting, Golem death spawns and Sandbox controls also passed.

The full automated run is recorded in `docs/verification-v032/node-tests.txt`. Archive extraction, source rebuild and runtime hash checks are reported in the integrity file beside the downloadable ZIP.

## Open

Extract the complete ZIP and run `Web-Royale/open offline.bat`. The ready-to-play site, editable source, local assets and Windows launcher are included. Keep the same browser and localhost origin to retain your save.
