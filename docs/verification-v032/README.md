# v0.32 verification record

The release removes the v0.31 forced horizontal/vertical advance guide. It retains lane-aware Crown selection and the existing radius-aware ground navigator.

- `MOVEMENT-REFERENCE.md`: inspected official gameplay timestamps, visible-player screenshots and interpretation limits. The footage shows Battle Ram and P.E.K.K.A; it is not a controlled Baby Dragon trajectory.
- `SHARP-TURN-REVIEW.md`: measured v0.31 corners, rejected steering experiments and independent review.
- `sharp-turn-diagnostics.json`: 48 mirrored scenarios for each diagnostic variant, including full route samples.
- `independent-diagonal-review.json`: 616 geometry probes across 77 mobile entities and 12 status/pursuit controls. Includes exact source hashes.
- `diagonal-red.txt` / `diagonal-green.txt`: 28 movement regression failures before the correction and 28 passes afterward.
- `browser-pathing.json`: actual Sandbox control/pointer placements on desktop and phone, full mirrored King approaches, diagonal entry and aerial pursuit.
- `browser-replay.json`: 19 successful replay checks, including 14 historical stored fixtures.
- `browser-gameplay.json` / `browser-sandbox.json`: ordinary deployment, combat and Sandbox checks against the built site.
- `node-tests.txt`: final complete automated suite and its result summary.

The browser pathing harness also fails against the separately served, frozen v0.31 release on its King-approach corner assertion. Browser screenshots and temporary captures are under `docs/qa/v032/` in the working source; key official reference frames are retained here.

Full geometry probes deliberately keep obstacles alive and stationary to expose route stalls. They complement complete-match regression tests; they do not prove exact Clash Royale simulation parity. The official evidence supports diagonal movement and avoiding mandatory lane detours, not arbitrary smooth curves or a measured universal turn rate.
