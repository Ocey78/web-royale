# Web Royale v0.38.0 — release verification

## Complete regression suite

`npm test` completed with **999/999 tests passing**, zero failures, zero cancelled and zero skipped. Elapsed time: **184.63 seconds**. This is the complete existing suite plus 35 new regression tests, including the all-102-card sustained-combat and event timeline stress tests. No test file was excluded. Raw output and status: `full-suite.txt`, `full-suite.exit`.

New coverage includes safe multi-member deployment on both banks, Mirror's real footprint, speed-limited recovery, static-route reuse, exhausted-route retries, Goblin Barrel formations at towers/water/edges, shield state on both teams, fivefold Daily quantities, Gem Shop purchases/saves/stale requests/arena progression, and frozen old-replay compatibility. TDD red runs and the implementation review are retained separately.

## Final browser verification

**70 Chromium interface/rendering checks passed**, with no uncaught application errors. The final sequential run used the generated release JavaScript/CSS and original local artwork at **1280×1040** and **390×844**. See `browser-report.json`, `browser-run.txt`, and the screenshots.

Checks include the actual Gem Shop purchase buttons, gem/card accounting, one-purchase persistence, full refresh after the second purchase, insufficient funds, fivefold Daily quantities, existing Hour/Lightning shops, three free rewards, deck add/remove, the cleaned deck background, four-card/random modes, grouped/native shield exports, barrel tower clearance, Full particles, Princess/King/hand labels and result screens. Gem Shop, mobile deck and shield screenshots were visually reviewed.

The harness substitutes file-backed fetch/image transport and saved storage on an about:blank document because ordinary browser HTTP navigation is blocked in this environment. It is not a live-site, physical iPhone/Safari or real service-worker upgrade test. One earlier concurrent repeat hit a browser-loading timeout during environment memory pressure; the subsequent sequential run passed all 70 checks. See `suite-diagnostics.md` for the timeout and OOM evidence, not hidden test exclusions.

## Build and archive inputs

`npm run build` succeeded: **1203 runtime files**, version **0.38.0**. Every generated file matches its release-manifest SHA-256. A fresh copy of exactly the archive-selected source/runtime files, omitting duplicate source image/audio files, restored those assets from verified `dist/` and rebuilt an **identical release manifest and all 1203 runtime hashes**. See `rebuild-report.json` and `rebuild.txt`.

The release selection includes **zero font binaries**. The unchanged Windows launchers, game data and graphics-policy file were checked against the supplied v0.37 archive; see `preserved-files.json`. The actual distribution ZIP is separately closed, CRC-tested, checked for duplicate/unsafe entries and hashed before publication. Its external verification JSON contains the final archive size, entry count and checksum.

## Navigation performance sample

`tools/benchmark-v038-navigation.cjs` compares a single Knight detour over 900 movement steps, without AI or drawing. Fifteen measured runs follow warm-up. The old engine performed **13 path searches**, versus **1** here. Median CPU time was **6.938 ms** before and **4.411 ms** after. These timings are for this isolated workload, not a frame-rate or physical-device guarantee.

A separate deterministic movement audit completed **62 legal start/target cases without a stall**, and the deployment sweep found **zero preview/live/terrain mismatch cases** after the fixes. See `movement-audit.json` and `deployment-audit.json`.

## Limits

Existing saves use `web-royale-classic-v4`. New replays use engine `0.38`; old `0.32` and earlier supported records retain frozen engines. This build has not been deployed to the user's live Site. Windows launcher execution, physical iPhone/Safari operation and browser network/cache upgrades were not performed here. Node tests cover the static server, manifests, storage adapters and worker code separately.
