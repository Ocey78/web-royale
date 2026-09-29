# v0.31 verification

The final full automated suite passed **857/857**, with no failures, skips or cancellations. It ran after the final runtime build. The old negative-heading assumption in the animation test was updated to compare facing with actual displacement, since horizontal lane entry is now valid; all native/animation checks also passed independently.

- `LANE-ADVANCE.md`: behavior, implementation decisions, focused checks and native-parity limits.
- `AIR-ROUTING-EVIDENCE.md`, `air-routing-evidence.json`, `source/`: original source fields, tilemap, hashes and Supercell's primary statement about historical lanes.
- `trajectories-before.json`, `lane-trajectory-comparison.json`: 34 complete simulations before and after the correction. Unintended crossings changed from 20 to 0; all corrected runs reached a Crown attack.
- `INDEPENDENT-REVIEW.md`, `independent-lane-review.json`: 61 passing probes, including the independently discovered ground detour loop and its fix.
- `browser-pathing.json`: real Sandbox controls and complete flights for both teams and lanes, off-lane alignment, and pursuit across open water.
- `browser-targeting.json`: attack locks, loss of range, building-only acquisition and Electro Wizard's primary bolt in the emitted browser bundle.
- `browser-replay.json`: 14 exact replay checks, with historical fixtures and repeated seeking. Expected optional static-host 404s are recorded separately from application errors.
- `browser-gameplay.json`, `browser-sandbox.json`: normal pointer deployment and adjacent behavior, plus level 0–99/team/tower/no-time-limit controls without progression or recording side effects.
- `node-tests.txt`: complete final automated regression run, executed after building the final runtime.

All browser checks use isolated temporary contexts. The player's profile and saved browser data are not used by tests. The final ZIP is independently extracted and rebuilt after these checks; its integrity report is delivered beside the archive.
