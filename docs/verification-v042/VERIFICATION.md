# v0.42.0 verification

## Generated release

`npm run build` succeeds with version 0.42.0, source snapshot 3.2557.2, and
1,206 content-hashed runtime files. `source-inputs.json` records 98 release source
and launcher inputs. `preserved-assets.json` confirms all 1,195 original runtime
art/audio/data assets retain the v0.41.0 hashes.

## Automated suite

`npm test` — 1,110 passed, 0 failed, 0 skipped, 0 cancelled.
See `full-suite.txt` and `full-suite.exit` (0). Baseline v0.41.0: 1,089 passed.
The first full run had three obsolete current-engine-tag assertions. All three
were updated to 0.42 without changing historical fixture tags or data; the full
suite was then rerun. See `initial-full-suite.txt`.

## Browser and touch checks

- `python tools/verify-v042-browser.py --browser /usr/bin/chromium` — 81 checks.
- `python tools/verify-v042-regression-browser.py --browser /usr/bin/chromium` — 190 checks.
- `python tools/verify-v042-touch.py --browser /usr/bin/chromium` — 18 checks.

Total: 289 successful checks; no uncaught page errors. Generated product JS/CSS
and real local artwork are used, with file-backed fetch/Image/storage transport
on about:blank. Tests include 1280x1040, 390x844 and 320x568 viewports. The touch
suite uses has_touch/is_mobile and validates the actual compact composition and
real touchscreen placement after Sandbox map changes.

One initial new-feature run had a test-helper visibility error when reopening a
closed Settings panel. The helper was corrected and the complete test rerun.
The first touch command hit the tool's 120-second call limit near the end. The
same full script subsequently completed successfully in a longer-running process.
Both initial logs are preserved.

## Actual learning workers

`node tools/verify-v042-workers.cjs` — all fifteen selectable match modes completed
one real worker-driven self-play match and produced nonzero learning updates.
The log and per-mode durations, seats, update counts and commands are in
`workers.txt` and `all-mode-workers.json`. In particular the 3v3 worker reached
300 simulated seconds without the former 1v1 time-limit guard aborting it.

## Regression coverage and scope

New tests cover 3v3 boundaries and real income, independent lost-King shutdown,
20-cap grants/passive income/AI observation, twelve-card cycles, private saved
decks, One Shot banned-card enforcement and immediate first-tower victory,
mode-specific learning contexts, current and frozen-0.41 replays, cosmetic map
selection, Sandbox resets, primitive rendering and static custom-map cache reuse.

The new scenic 3v3 camera is round-trip tested together with real touch placement.
Classic camera values are asserted unchanged. Render-only Potato policy is
checked against simulation state/RNG and against native rendering calls.

## Package verification

The standard ZIP packager closes the archive, tests every member's CRC, checks
for duplicate paths and verifies its release manifest before exposing the final
filename. The separately supplied `Web-Royale-v0.42.0-Full-Build.verification.json`
contains final archive size, SHA-256, runtime member hash checks and the result of
rebuilding from a fresh extraction of the actual delivered ZIP.

## Limitations

No physical iPhone/Safari test, Windows launcher execution, production HTTP/
service-worker update test, or live deployment was performed. No new numerical
FPS promise is made. Code review was inline, not an independent agent review.
Test screenshots are excluded from the ZIP to keep its size down; their scripts
and logs remain and selected preview images are attached separately.
