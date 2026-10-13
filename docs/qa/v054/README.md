# 0.54.0 verification

The final source and frozen release passed 1,689 Node tests; one existing test was skipped and none failed. `final-bundle.json` verifies all 2,119 delivered file hashes and the current source modules in the app bundle.

`void-built/report.json` records 802 passing checks across ten actual-browser scenarios. Contact sheets and four representative full-resolution frames are retained here; the browser script generates every event-timed full-resolution frame when rerun. The complete local frame sequence and preliminary diagnostics were archived outside the repository to avoid adding hundreds of megabytes of duplicate screenshots.

`void-reference/` records actual frames from two dated real-game videos, with explicit limits on observations. August 9 footage uses the earlier 1.2-second cadence; the current one-second cadence and damage tiers are verified against Supercell's August 4/26 changes and the game's source controller. Comparison establishes the tested behavior and visual corrections, not pixel-identical equivalence to every native-engine frame.

The other reports cover 161 model actors, seven representative compressed-scene cold loads, all 18 modern Trophy Road platforms, all 69 original form portraits, Vines/Void/Goblin Curse for both teams, and twelve UI views. The model actor report retains all observations; full per-actor images can be regenerated with `tests/browser_modern_models_v054.cjs`. Earlier UI/model reports identify their tested bundle, and the final bundle proof records unchanged modules alongside the later Void changes.

The existing skipped test is `production Custom never gains Hero/Evo or tower content from shared progression`.
