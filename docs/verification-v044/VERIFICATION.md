# Web Royale v0.44.0 verification

## Base and scope
Based on `Web-Royale-v0.43.0-Full-Build.zip` (SHA-256
`24a0549d6f49ca4a682744d5ad92779b9e97702574b6777fcaed9e7572874b0c`).
Only Team Rumble receives the new arched geometry, castle presentation, King-only
score and activation group, and the revised five-plus-five-minute timeline.
Mirror is repaired in all hands. No live deployment was performed.

## Executed checks

| Check | Command / evidence | Result |
| --- | --- | --- |
| Full baseline | `npm test`, `baseline.txt` | 1,151 passed |
| Full final suite | `npm test`, `full-suite.txt` | 1,171 passed, zero failed/skipped/cancelled |
| Build | `npm run build`, `build-final.txt` | Exit 0, 1,206 runtime files |
| New browser behavior | `python tools/verify-v044-browser.py --browser /usr/bin/chromium` | 36 checks, zero uncaught errors |
| UI regressions | `python tools/verify-v044-regression.py --browser /usr/bin/chromium --phase ui` | 73 checks |
| Combat regressions | same script, `--phase combat` | 54 checks |
| Play Again regressions | same script, `--phase repeat` | 56 checks |
| Mirror mask fallback | `python tools/verify-v044-mirror.py` | 3 real-asset pixel comparisons passed |
| Movement and crossings | `node tools/audit-v044-movement.cjs` | 35 scenarios, none stuck |
| Behind-tower clearance | `node tools/audit-v044-rear-clearance.cjs` | 144 scenarios passed |
| Actual 10-seat training | `node tools/verify-v044-worker.cjs` | Rumble completed at 604 simulation seconds; 7,613 learning updates |

Browser total: **219 checks**, at 1280x1040, 390x844 and 320x568 viewport
sizes. These are file-backed headless Chromium checks with the generated product
JavaScript, stylesheet and native assets, not physical Safari/iPhone or a live
Service Worker upgrade. Repeated UI, combat and replay suites ran sequentially.

The 604-second worker match includes the four-second, King-only health tiebreak
presentation after ten minutes. The run proves this mode executes and updates
learning; it is not a measure of trained playing strength.

The full-suite wall time was 171.272 seconds. The lengthy stress test was allowed
to finish; no tests were skipped to obtain a green result.

## Red/green evidence and corrected assertions

`initial-red.txt`, `render-red.txt`, `replay-red.txt` and `ai-red.txt` contain the
pre-fix rule/layout, scenery-cache, replay and outer-lane AI failures. The final
full suite includes all 20 new feature tests. `mirror-red.txt` reproduces copied
art being covered when the earlier CSS masks are absent. `mirror-final/report.json`
records zero interior pixel error for Knight, Princess and Fireball once the
mask-independent border is used.

The first full post-change suite had 15 failures from historical tests expecting
the old current-engine tag, flat Rumble foundations, old fixed side-aisle x
coordinates, old rate intervals or exact floating-point equality. Assertions now
check the requested geometry/timing and numeric tolerance. A subsequent full run
found two more old current-engine stamp assertions (`tiebreak-v270` and
`v038-replay`), corrected explicitly to `0.44` without changing historical replay
fixtures. Both intermediate logs are retained. The fresh final complete suite
passed with zero failures.

## Preservation and limits

`preservation.json` records 89 byte-identical original source/launcher files,
10 modified original source files, and 1,195 unchanged runtime asset files.
The new legacy v0.43 module preserves old replay simulation. All original card,
troop, spell, tower, UI and audio assets remain; no source font binaries are sent.

`review.md` is a scoped inline review, not an independent/subagent review.
Static castle layers are cached and the normal/Potato renderers are exercised,
but no numerical FPS improvement or device-specific frame-rate guarantee is made.
Movement evidence covers the tested open aisles; it cannot prove every possible
player-built obstruction will be traversable. Windows launchers are retained but
not executed on Windows.

## Actual delivered-archive verification

After the ZIP is closed, run:

```sh
python tools/verify-v044-package.py Web-Royale-v0.44.0-Full-Build.zip \
  --extract-to FRESH_DIRECTORY --report archive-report.json
```

This verifies CRCs, unique/safe paths, font exclusion, every packaged runtime
hash, a clean rebuild from the actual archive, and the 20 new-feature tests from
that extracted source. Final results are attached separately as
`Web-Royale-v0.44.0-Full-Build.verification.json`; they cannot be included as an
archive checksum inside the same archive.
