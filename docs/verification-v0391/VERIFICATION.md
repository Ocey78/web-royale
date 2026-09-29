# Web Royale v0.39.1 — final verification

## Complete automated suite

`npm test` completed with **1012/1012 tests passing**, zero failures, zero
skips and zero cancellations. Elapsed time: **327.45 seconds**. No test file was
excluded; the all-102-card sustained battle and event deadline stress tests ran
in full. See `full-suite.txt` and `full-suite.exit`.

The new regression file covers exact gold/gem milestone intervals and bounds,
stable varying receipt rolls, both rewards at streak 15, actual credited totals,
zero-gem omission, full chest slots, losses/draws and restarted streaks,
non-ranked/practice/replay exclusions, save round-trips, duplicate settlement,
read-only repeated rendering, currency caps, old saves and Trophy Road markup.

The initial full run was 1011/1012 because an older test hard-coded package
version 0.38.0. The consistency test now checks a semantic version and equality
between package, builder and generated release. See `full-suite-initial.txt`,
`full-suite-initial.exit`, `version-regression-green.txt`, and `review.md`.
New-feature red tests and the original portrait-mask failure are also retained.

## Browser UI and screenshot checks

**109 Chromium interface checks passed**, with **zero uncaught application
errors**, using the final generated JavaScript/CSS and original local artwork.
See `browser-report.json`, `browser-run.txt`, and the result/deck screenshots.

Checked desktop 1280×1040, phone 390×844 and narrow 320×568 result layouts.
The tests settle real application battles, compare the boxes to actual balance
changes, exercise each milestone and a simultaneous gold/gem reward, test full
chest slots and non-ranked/practice/loss/draw cases, repeat result rendering,
and confirm OK returns home. Boxes and icons fit within the panel without
intersecting one another or the OK button. Deck/collection frame proportions
and level-label bounds are checked as well. Trophy Road still renders reward
tiles but no longer exposes the wild-card inventory shortcut.

Browser HTTP navigation is blocked in this container
(`ERR_BLOCKED_BY_ADMINISTRATOR`), so the harness replaces only asset transport
and storage with a file-backed fixture on about:blank. This is **not** a real
HTTP, live-site, Safari or Service Worker upgrade verification.

## Portrait silhouette diagnostic

`python tools/verify-v0391-card-frames.py --browser /usr/bin/chromium` passed all
**8 frame checks**. A solid test portrait allows counting pixels outside the
native frame silhouette (with a one-pixel anti-alias tolerance). The original
layout had 654–655 exterior diagnostic pixels per normal card. After the fit
correction, every tested card, including a Legendary, has **zero** exterior
diagnostic pixels. See `card-frame-red.txt`, `card-frame-green.txt`, and
`card-frame-mask.json`. The actual artwork remains unchanged.

## Build and clean reconstruction

`npm run build` succeeded as version **0.39.1** with **1,203 runtime files**.
A fresh copy using the distribution's file-selection rules restored omitted
duplicate source artwork from the verified dist assets, ran the normal builder,
and produced an identical release manifest and all **1,203 matching hashes**.
See `build.txt`, `rebuild.txt`, and `rebuild-report.json`.

Protected v0.38 simulation, graphics, economy, replay, game-data, and both offline
launcher files were compared byte-for-byte. The original save key is retained.
`runtime-inputs.json` records the source hashes for this tested runtime.
The final ZIP checksum/CRC metadata is provided alongside the downloadable
archive; font binaries are excluded by the packaging selection.

## Limits

The full build is prepared for download; it is not deployed to the user's live
website. Windows launchers and a physical iPhone/Safari were not executed.
This patch makes no new frame-rate claim. The review is an inline implementation
review, not an independent external review.
