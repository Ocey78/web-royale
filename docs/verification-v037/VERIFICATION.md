# Web Royale v0.37.0 — final verification

## Complete regression run

`npm test` completed successfully: **964/964 passing**, 0 failures, 0 cancelled and 0 skipped. Total elapsed: 373.70 seconds. The final raw report is `full-suite.txt` and its exit status is `full-suite.exit`.

The test runner caps test-file concurrency at two. It runs the full existing suite, including all 102 cards in sustained combat, training workers and cancellation, save migrations, static-server behavior, scene loading, chest rewards and replay conformance. No fixture was excluded to obtain a passing run.

`targeted-suite.txt` separately records **69/69 passing** targeted release, reward, graphics, level-display, deck/mode, native result, replay, packaging and archive-recovery checks. These are overlapping regression tests, not additional unique tests beyond the full suite. The current request adds 21 tests in `tests/v037-*.test.cjs`.

The first full run exposed an outdated hardcoded v0.36.0 release assertion and a worker deadline under concurrent artifact/CPU load. The version assertion was updated to check v0.37.0 and manifest agreement; the unchanged worker passed in isolation and in the final complete run. Test-file concurrency was limited, without altering the worker timeout or gameplay. See `suite-diagnostics.md` and its initial log for the exact diagnostic history. Intentional TDD red runs are retained as pre-change evidence, not final failures.

## Browser and visual verification

**51 Chromium checks passed**, with no uncaught application errors. The game uses the final generated release bundle, actual Canvas/DOM and native game artwork. The harness substitutes file-backed transport and in-memory saved storage because this environment blocks ordinary HTTP navigation. It does not prove live-network browser loading or physical iPhone/Safari compatibility.

The checks cover all three free Daily Shop transactions and saved receipts, existing Hour/Lightning shops, 1–10 deck management, independent persistent four-card decks, both sides' four-card cycling, random-deck rerolls, non-ranked rewards, Full particle persistence, faster OK, and win/loss/draw/normal ranked result views. Viewports: 1280×1040 and 390×844. See `browser-report.json`, `browser-run.txt`, and the accompanying screenshots.

The final ranked-result and phone-result screenshots were manually inspected: native Winner! text is present, the clan name and trophy reward do not overlap, the earned reward panel fits, and OK remains visible. The Princess HP/King label, shop, four-slot builder and Gem Chest screenshots were also reviewed.

## Build and artwork

`node tools/build-web.js --compact-scenes` succeeded. A fresh source-archive selection, without duplicate raw image files, restored its artwork from `dist/` and reproduced **all 1203 generated runtime-file hashes**. The current manifest still matches that rebuilt manifest exactly. See `rebuild-report.json` and `build.txt`.

Gem Chest icon and opening atlas retain the original image sizes and exact alpha channels. Only RGB palettes changed. See `gem-alpha-verification.json`; the recoloring source is `tools/recolor-gem-chest.py`. Gold Chest and reward-card artwork were not globally recolored.

The release packager closes and CRC-tests the standard ZIP before exposing the final filename. The separate distribution verification JSON and SHA-256 file record the archive hash, size and entry count. The archive excludes font binaries and unsafe Windows filenames.

## Limitations

The Pinterest reference could not be retrieved, so the revised result screen is not claimed to match that precise image pixel-for-pixel. Windows BAT launchers are retained, not run on Windows here. The game has not been pushed to the live Site. Exporting a save before updating remains recommended; the storage key stays `web-royale-classic-v4`.
