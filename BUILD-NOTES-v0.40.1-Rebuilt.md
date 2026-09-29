# Web Royale v0.40.1 — rebuilt replacement download

The original v0.40.1 ZIP was no longer present in the retained conversation files
or personal Library. This is **a rebuilt replacement, not a byte-identical copy**
of that expired archive. The preserved v0.40.0 full build was used as the base;
the arena-rendering changes were re-created from the retained Hog Mountain fix
notes and checked again. This ZIP has its own checksum and verification report.

## Included

- The ready-to-serve game in `Web-Royale/dist/`, full development source, tests,
  original local game artwork and audio, and both offline Windows launchers.
- All v0.40.0 stacking streak rewards, reward boxes, emote/tower-skin prices,
  Gem Shop quantities and chest prices remain unchanged.
- Only `src/native.js` differs from the retained v0.40.0 production source.
  Combat, pathfinding, AI, rewards, graphics presets and saved deck formats were
  not changed for this reconstruction.
- Stationary scenery inside animated arena assemblies is cached separately from
  moving clouds/decorations, preserving source painter order and animated clips.
- Offscreen arena shapes are skipped before raster allocation. Large untinted
  single-polygon backdrops are drawn directly into the visible-area cache rather
  than oversized intermediate images.
- Background caches are prepared during battle loading. Normal/overtime art
  shares a cache when it is identical, camera/quality variants are bounded, and
  cached background surfaces are released on arena changes.

Old verification screenshots are omitted from the ZIP to reduce its size; the
actual game artwork and source are not omitted. Test scripts can regenerate the
screenshots. This replacement has not been deployed to the live website.

## Launch / update

Export a save from the old game, close its tab and offline launcher, then extract
this entire archive. Run **`Web-Royale/open offline.bat`**. Keep the same browser
and localhost address/port for the same browser save. The save key remains
`web-royale-classic-v4`. Do not clear browser website data just to refresh assets.

For the hosted site, publish the new contents of `Web-Royale/dist/` through the
existing Site editor. This download alone does not update the live deployment.

## Verification

See `docs/verification-v0401-rebuilt/VERIFICATION.md` and the separately supplied
JSON verification report. These are fresh reconstruction checks, not the test
counts or performance measurements from the unavailable original ZIP.

Testing uses Node and headless Chromium with local original assets. No physical
iPhone/Safari test, Windows-launcher execution, or live-site deployment was done.
