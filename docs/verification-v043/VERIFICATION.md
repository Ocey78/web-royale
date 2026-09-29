# v0.43.0 verification

## Product / scope

Base: the delivered v0.42.0 full ZIP. This is a source and static-runtime update,
not a live-site deploy. The approved additions include Play Again and the late
aligned Princess rows / extended custom-map rear passages.

## Fresh checks on final source and generated runtime

- `npm test`: **1,151 passed**, 0 failed/skipped/cancelled.
  Log: `full-suite-release.txt` (exit file 0).
- `python tools/verify-v043-browser.py --browser /usr/bin/chromium --phase ui`:
  **73 checks passed**, no uncaught errors.
- Same command with `--phase combat`: **53 checks passed**, no uncaught errors.
- Same command with `--phase repeat`: **56 checks passed**, no uncaught errors.
  Combined: **182 Chromium interface checks**, real emitted JavaScript/CSS/native
  artwork, at 1280x1040, 390x844 and 320x568. Reports: `browser/browser-report-*.json`.
- Additional focused real-browser CSS regression: magic-item caption stays inside
  its reward box (`caption-red.txt`, `caption-green.txt`).
- `node tools/audit-v043-movement.cjs`: **35 scenarios passed**. Normal/custom
  crossings, large-unit side passages and the 18-Barbarian pack.
- `node tools/audit-v043-rear-clearance.cjs`: **144 scenarios passed**. Giants,
  Golems, P.E.K.K.A and Giant Skeletons behind every live tower in all three custom
  arenas reach midfield with no tower-footprint or boundary violations.
- `node tools/verify-v043-workers.cjs`: **all 16 mode workers completed actual
  self-play and produced nonzero learning updates**. Real ten-seat Rumble is
  included. Records and update counts: `all-mode-workers.json`.
- New feature-specific tests fail on missing features and pass after implementation;
  the individual red/green logs are retained. Exact prior v0.42 replay engine is
  frozen, and historical replay checks are part of the full Node suite.

## Artifact verification

`tools/package-archive.py` creates a standard Deflate ZIP and verifies its CRC
before exposing the final filename. `tools/verify-v043-package.py` subsequently
checks every packaged runtime hash, extracts the actual deliverable into a fresh
directory, runs `npm run build`, checks the rebuilt manifest/hashes for identity,
and runs all v043 feature tests from that extracted source. Results are supplied
beside the delivered ZIP in the final verification JSON.

The base comparison verifies **1,195 unchanged asset files** and all seven earlier
legacy engine files plus both Windows launchers (`preservation.json`). No original
asset is omitted or replaced. Historical screenshot binaries and font binaries
are excluded from the delivery; the test scripts can reproduce the screenshots.

## Issues found, resolved and retained as evidence

- Initial full-suite failures included historical assertions that expected old
  deck caps, ownership rules, version tags or presentation fixtures. Appropriate
  expectations/fixtures were updated for the requested behavior; frozen replay
  engines were not modified. The complete suite was rerun to green.
- The first compact browser pass found old grid-column sizes forcing deck-toolbar
  overlap. Corrected the real CSS and verified nonoverlap at compact width.
- Expanding the floor invalidated an old hardcoded surface-width assertion. The
  test now checks actual worldRect width against each graphics density; it still
  proves that low/high settings change rendering allocation.
- Navigation tests exposed a legal narrow rear aisle that the half-tile search
  samples could not see. Radius-specific clearance samples and the actual rear
  spacing fix address that case; final movement probes pass without shrinking
  collision radii.
- The first Play Again browser test incorrectly marked a live LocalMatchSession
  as a replay, producing missing `record.duration` errors. Replaced that invalid
  test setup with a real captured/stored replay through the actual playReplay
  entrypoint. Final run verifies no replay rewards and no repeat button/errors.
- A magic-item caption was positioned against the entire reward row, not its own
  box. The focused browser test caught it; the corrected caption stays inside the
  box and the complete combat interface run passes.

## Limits

The browser fixture replaces asset transport/storage origin with file-backed
adapters on about:blank. It is not an HTTP deployment, Service Worker upgrade,
physical iPhone/Safari or Windows launcher test. The tests do not establish a
whole-game FPS increase or prove that every possible player-built blockade can
be navigated. Cached static scenery reuse is verified; rendering quality and
combat remain separately configurable. Review was inline; no independent reviewer
agent was available. The user's 5v5 image was not received, so the symmetrical
river-free five-pair map is an original layout, not a claimed reference match.
