# v0.41.0 verification

## Final executed checks

- `npm run build`: passed, release 0.41.0, 1,206 hashed runtime files.
- `npm test`: **1,089 passed, 0 failed, 0 skipped, 0 cancelled**.
  Full output: `release-tests.txt`; exit code: `release-tests.exit`.
- `python tools/verify-v041-browser.py --browser /usr/bin/chromium`:
  **39 checks passed**, 0 uncaught errors. See `browser-report.json`.
- `python tools/verify-v041-regression-browser.py --browser /usr/bin/chromium`:
  **190 checks passed**, 0 uncaught errors. See `regression/browser-report.json`.
  Combined sequential browser log: `release-browser.txt`.
- `node tools/verify-v041-workers.cjs`: **12 real generated-worker matches
  completed**, every mode reporting nonzero weight changes and learning updates.
  See `all-mode-workers.json` and `workers-run.txt`.
- `node tools/audit-v041-movement.cjs`: **25 unopposed movement scenarios
  crossed**, including a pack of 18 Barbarians and every custom crossing.
  See `movement-before.json` and `movement-after.json`.
- Existing runtime art audit: **1,192 assets unchanged** against the exact base
  ZIP. See `preserved-files.json` for launchers, graphics and historical engines.
- `release-inputs.json` records **404 source/build/test input hashes** for
  checking that the distributed inputs are the inputs tested here.

## Focused red-to-green evidence

`tests/v041-*.test.cjs` covers migration/claim idempotence, premium rewards,
Treasure frequency and range, independent banks, King death, normal versus custom
Golem payout, randomized ownership, real geometry, close bridge corners, gentle
sideways yielding, all-mode factories, all six replay command seats, legacy replay
compatibility, rendering cache policy, six-crown timing and the gold King's
foreground health display. Initial failing outputs and green reruns are kept in
this directory. `review.md` explains initial obsolete assertions and browser
fixture corrections; they are not omitted from the record.

## Browser and platform limits

The two browser suites use the actual generated JavaScript/CSS and native local
artwork in headless Chromium at 1280x1040, 390x844 and 320x568, with file-backed
fetch/image transport and an in-memory storage fixture on about:blank. They do
not test a physical iPhone/Safari, real HTTP deployment, multi-process browser
persistence or a live Service Worker upgrade. The retained Windows launchers
were not executed on Windows. No FPS guarantee is made. Review was inline,
not by an independent reviewer.

## ZIP validation

The packager closes the standard Deflate ZIP before checking every entry's CRC,
duplicate names, Windows-safe paths, excluded font binaries and the embedded
release manifest. The separately delivered verification JSON records the final
archive hash and the rebuild from a fresh extraction of that actual ZIP.
Historical verification screenshots are intentionally omitted from the archive
to keep the full game download smaller; the game artwork is included. The four
current preview images are provided separately. Test scripts regenerate images.
