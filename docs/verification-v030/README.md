# v0.30 verification

The final full suite passed **817/817**, with no failures, skips or cancellations. See `node-tests.txt` for the complete final run. Build and tests were run sequentially against the finished runtime.

`TARGETING.md` documents the selected targeting policy, source fields, reproductions, focused tests and limits. `browser-targeting.json` records real Sandbox control checks plus the compiled Electro Wizard regression. `browser-sandbox.json` records level 0–99, team, tower, time and progression isolation checks. `browser-gameplay.json` records pointer deployment and adjacent gameplay behavior. `browser-replay.json` records exact historical/current browser playback and reverse/forward seeking; its two expected optional static-host 404s are listed separately from application failures.

The independent reviewer passed 26 additional general targeting probes before the final multi-target change and 24 additional Electro Wizard probes afterward, with no remaining blocker. All browser checks used separate temporary contexts rather than the user's saved profile.

Source and runtime use v0.30.0. Historical replay fixtures and their provenance are in `tests/fixtures/replay-v028/`. ZIP extraction and rebuild integrity are verified separately after packaging, with the report delivered beside the archive.
