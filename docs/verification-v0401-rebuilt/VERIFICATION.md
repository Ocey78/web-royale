# Fresh verification of the rebuilt v0.40.1 distribution

This is a reconstructed replacement, not the unavailable original archive. Old
v0.40.1 performance numbers/test counts do not serve as verification of this ZIP.

## Final results

- `npm test`: **1,050 passed; 0 failed/skipped/cancelled**.
- `python tools/verify-rebuilt-ui.py --browser /usr/bin/chromium --output docs/verification-v0401-rebuilt/ui`: **190 UI checks passed**, no uncaught errors.
- `python tools/verify-rebuilt-arena.py`: **47 before/after comparisons passed across 15 arenas**, including moving Hog Mountain layers and overtime states. Maximum mean absolute channel difference was 0.8786 on a 0–255 scale. Exact pixel identity is not claimed; caching changes antialiasing/resampling at some edges.
- All **1,203** generated runtime-file hashes match `dist/release.json`.
- **85** other production source/launcher files are byte-identical to v0.40.0; only `src/native.js` changed.

The isolated Hog Mountain comparison measured 185 versus 25 draw calls/frame and
149,880,008 versus 48,862,592 bytes in arena shape caches. Thirty headless
Chromium samples with GPU readback averaged 19.57 ms versus 10.29 ms. These are
local comparisons with unchanged graphics settings, not whole-game or physical
iPhone FPS promises. The unavailable original build had a different implementation
and different measurements; those have not been reused.

## Recorded intermediate issues

The first short suite invocation was interrupted by the tool timeout. The first
complete suite found two compatibility checks: the distribution name suffix did
not match the existing numeric-version rule, and a legacy fake scene lacked the
new release method. The release version now stays numeric (the filename/notes
mark it as rebuilt) and the existing cache-clear fallback is retained. The fresh
complete suite then passed.

The initial arena-only browser fixture exceeded the 4 GiB container memory limit
after two arenas. It had unnecessarily transferred the full gameplay runtime to
each test page. The fixture was reduced to the native manifest and image URLs;
the subsequent run passed all 15 arenas without changing product drawing logic.

## Packaging

Old and new verification screenshots are omitted from the ZIP to keep the
replacement smaller. Numerical reports, regression tests, and the scripts that
regenerate screenshots remain included. Actual game images, scene data and audio
are retained in the prebuilt `dist/`; the existing source-restoration tool
restores deduplicated development artwork when rebuilding.

No physical iPhone/Safari, Windows launcher, or live website deployment was tested.
