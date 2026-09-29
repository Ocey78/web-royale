# v0.36.0 verification — 2026-09-28

## Scope

Tested the supplied project after implementing the requested reward, UI, level,
shop and rendering changes. No physical Windows, iPhone/iPad, or user-PC gameplay
session was available. This report distinguishes automated behavior checks from
those unperformed platform tests; it does not claim all possible lag is eliminated.

## Automated results

- **`npm test`: 943 tests passed, 0 failed, 0 cancelled, 0 skipped.**
  Duration: 260.879 seconds. This includes the long all-card stress and event-mode
  simulation tests. Complete TAP output is in `node-tests.tap.txt`.
- **24 new v0.36.0 regression tests** cover save/timer migration, per-result trophy
  rolls, crown spending, Lightning reset/receipt safety, level grouping, shield and
  health damage, graphics persistence/policy, real sprite raster quality,
  alpha/tint compositing, essential FX when particles are disabled, and bounded
  Fireball prewarming. The tests were observed failing before their respective
  implementations and passing afterward.
- **16 Chromium browser/Canvas checks passed; no uncaught page errors.** See
  `browser-qa.json` and the PNG screenshots alongside this document. Desktop:
  1280×1040; emulated narrow viewport: 390×844.
- **Build:** `node tools/build-web.js --compact-scenes` succeeded for v0.36.0,
  producing 1,200 manifest-listed output files, including all 102 cards.

The full suite initially had an obsolete test that asserted package version
0.34.0, despite the supplied package already being 0.35.0. That assertion was
updated for 0.36.0. An earlier bounded run cancelled the existing long stress test
at its 90-second limit; the final unbounded `npm test` completed it successfully.
No runtime failure was hidden or a functional regression test removed.

## Browser test method and limits

`tools/verify-v036-browser.py` runs the actual generated JavaScript, Canvas
renderers, UI CSS and bundled game assets in Chromium. A file-backed asset
transport on `about:blank` and an in-memory localStorage fixture avoid depending
on local HTTP navigation in the managed test browser. The fixture omits bulk
preload scheduling, not game logic. HTTP server, asset/preload and service-worker
behavior have separate Node tests; this was **not** a full interactive HTTP/PWA
or OS-launcher end-to-end run. Graphics storage was verified through the profile
repository, not a physical browser restart. Narrow viewport screenshots are not
physical mobile-device performance measurements.

Reproduce (Python 3.10+ with Playwright and an installed Chromium):

```text
node tools/build-web.js --compact-scenes
python tools/verify-v036-browser.py --browser /path/to/chromium
```

Omit `--browser` when using Playwright's installed Chromium. The browser harness
writes fresh reports/screenshots to this directory; use `--output <folder>` to
preserve the recorded evidence. Baseline native/FX modules from the supplied
v0.35.0 archive are retained only as test fixtures in `tests/fixtures/v035/`.

## Isolated Fireball performance comparison

Method: headless Chromium software Canvas 2D, 1080×1920 output, 60 sampled
Fireball-impact frames at identical times and with the same source artwork.
One pixel read per frame forces draw completion and is excluded from the counts.
The updated renderers use the new default particle budget (Minimal). Thus this
comparison includes both cache improvements and reduced decorative-particle work.
Raw results: `fireball-performance.json`.

| Renderer | Mean render time | 95th percentile | Max sample | Pixel-buffer readbacks |
| --- | ---: | ---: | ---: | ---: |
| v0.35.0 baseline | 13.39 ms | 19.30 ms | 32.80 ms | 329 |
| v0.36.0 cold | 6.02 ms | 9.40 ms | 10.60 ms | 42 |
| v0.36.0 prewarmed | 5.96 ms | 8.90 ms | 9.60 ms | 34 |

This is about 55% less mean isolated rendering time and
87% fewer pixel readbacks in the cold comparison.
It is **not a whole-game FPS claim** or a guarantee on the user's hardware.
Simulation damage, timing and knockback were not weakened to obtain these results.
An experimental whole-frame sprite cache was measured and removed because it
worsened percentile rendering time; it is not part of the delivered build.

## Review

Local code/diff review covered save migration, reward/purchase idempotency,
separate deployment identities, per-troop damage/healing, hidden/dead entities,
quality-cache invalidation, essential spell visuals, and build module order.
No independent reviewer/subagent was available; this was a self-review supported
by the tests above, not an independent audit.

## Archive verification

The download is a standard complete ZIP, not split parts. Its separate
`Web-Royale-v0.36.0-Full-Build.verification.json` records CRC/extraction checks,
all release-file SHA-256 checks, source restoration, a deterministic independent
rebuild, original-launcher byte comparisons, and the final archive SHA-256.
The accompanying `.sha256` file can be used for local download verification.
The original uploaded ZIP was also checked and had no CRC errors.
