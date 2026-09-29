# Web Royale v0.40.0 — verification

## Full automated suite

Command: `npm test`

Final result: **1,035 tests passed**, **0 failed**, **0 skipped**, **0 cancelled**.
Elapsed: **177.65 seconds**. See `full-suite.txt` and `full-suite.exit`.
The original v0.39.1 baseline also passed all **1,012 tests** before implementation.
No test file was excluded; sustained all-card battle stress tests ran in full.

The new regression tests cover stacking at/between tiers, per-match variation,
save/receipt bounds beyond a single tier, wallet caps, duplicate settlement,
old saves without backpay, ranked resets and non-ranked exclusions. Economy
coverage includes actual cosmetic charges, larger Gem Shop quantities and range
endpoints, exact quantities on purchase/reload/refresh, all six chest charges,
rarity restrictions, valid card grants, unknown/prototype keys and Giant loot.

The first full updated suite passed 1,033/1,035. Two historical tests still expected
old prices: `Shop chest rewards reveal immediately without occupying held chest
slots` and `classic emote purchases persist, reject duplicates and insufficient
gems`. Their expected balances were updated to the explicitly requested new
prices, with the insufficient-funds case now using 49 gems for a 50-gem emote.
Both tests were retained and the entire suite rerun. See `full-suite-initial.txt`,
`legacy-price-tests.txt`, and `review.md`.

New-feature tests were run before implementation and failed on the absent rules;
see `new-tests-red.txt`. The initial small endpoint sample was expanded from 650
to 2,000 deterministic rotations, without changing the production range formula;
see `review.md`. `focused-tests.txt` records the passing focused 48-test run.

## Chromium browser checks

Command: `python tools/verify-v040-browser.py --browser /usr/bin/chromium`

**190 checks passed**, **0 uncaught application errors**. See `browser-report.json`,
`browser-run.txt`, `browser.exit`, and the screenshots.

The harness loads the generated release JS/CSS and actual bundled artwork. It
checks 1280×1040, 390×844 and 320×568 layouts, including the existing result reward
boxes at streak 15, between tiers at streak 17, and a high streak of 60. Actual
credited totals match both saved receipts and displayed boxes. Repeated result
rendering, OK navigation, full chest slots, ordinary wins, losses/draws and
non-ranked/practice results are checked.

Shop interactions verify the larger displayed Gem Shop counts, successful first
and second purchases, save/reload, all new prices in both catalogue and previews,
cosmetic ownership and duplicate prevention. All six chest icons decode. The four
updated/new shop chest types open with their own existing native animation,
grant card rewards at the advertised price, do not use battle chest slots, and
do not advance the Gem Shop counter. Closing/skipping does not grant again.

Deck/collection frame alignment and the removed Trophy Road shortcut were also
rechecked. No new graphics or combat changes were made.

This is a file-backed about:blank asset/storage fixture, not live HTTP browser
navigation, a Service Worker upgrade test, or physical iPhone/Safari execution.
The ordinary Node static-host tests run in the full suite separately.

## Save compatibility and preserved source

An old/new Gem Shop card-selection comparison checked **1,008 rotations** across
14 arenas and three seeds. Card IDs and prices stayed identical, as did saved
partial-purchase markers. Quantities intentionally increased. See
`old-save-gem-shop-audit.json`.

`preserved-files.json` records byte-identical simulation, pathing, renderer,
graphics, chest presentation, replay, source game data and Windows launcher
files. The save key is unchanged. `runtime-inputs.json` records tested source
hashes, and `runtime.diff` contains the implementation changes.

## Build and archive reconstruction

`npm run build` succeeded as **v0.40.0**, producing **1,203 runtime files**.
A clean reconstruction using the archive's exact file-selection rules restored
omitted duplicate source artwork from `dist/`, ran the ordinary builder, and
produced an identical release manifest and all **1,203 matching file hashes**.
See `build.txt`, `rebuild.txt`, and `rebuild-report.json`.

The full ZIP is created into a temporary file, closed and CRC-tested before its
final output name is made available. The sibling `.verification.json` and
`.zip.sha256` record the final package checksum and archive verification. Font
binaries and node_modules are not included.

## Limitations

No physical iPhone/Safari or Windows launcher execution was performed. No live
site was changed. No new frame-rate improvement is claimed. Review was inline,
not an independent/subagent code review. Giant loot is a Common/Rare source-amount
implementation, not a claim to reproduce every live-game loot probability.
