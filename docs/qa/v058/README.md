# v0.58.0 verification

The checked release adds Ultimate Clash to the existing Web Royale main project. Browser evidence uses the actual built files in `dist/`, with no source-module injection or network response replacement.

## Automated checks

The final build and regression results are recorded in `validation.json`. The suite includes all existing normal-card stress battles, historical replay fixtures, the shipped training engine and packaging checks, plus 50 new Ultimate Clash and rendering tests. One pre-existing test remains skipped.

Two catalog-size assertions from older releases were updated: the built registry must contain the original 69 forms plus three Ultimate forms, and the artwork map must exactly match all 123 normal and 20 Ultimate card IDs. The training check also compares built/source fingerprints and generated Ultimate decks. The independent reviewer confirmed these updates preserve and strengthen coverage.

## Browser evidence

- `ultimate/report.json`: all 20 portraits load; independent decks and names persist; normal builders and collection exclude Ultimate cards; the actual battle starts with a four-minute clock and 20-elixir HUD. Screenshots include a 390-pixel phone layout.
- `visuals/report.json`: actual original Builder clips, four evolved Princess shooters, raised Evo Tesla, authored Egg idle, custom fields and Fireball/Rocket/Snowball artwork. All 52 required scenes load, with no missing effects or JavaScript errors.
- `ultimate-card-portraits.png`: the final 20 custom card illustrations.

The browser scripts require Playwright. Set `BROWSER_EXECUTABLE` when using an installed browser instead of Playwright's managed Chromium; `NODE_PATH` can select a shared Playwright installation. Run from the repository root:

```text
npm run build
npm test
node tests/browser_ultimate_v058.cjs
node tests/browser_ultimate_effects_v058.cjs
```

The separate `browser_ultimate_visuals_v058.cjs` script generates source-based portrait artwork and verifies animated Builder frames. It writes artwork and should be run before the card-art generator and build, not against a frozen release.

## Rendering measurements

`performance-summary.json` compares identical 12-actor workloads on the same AMD Radeon RX 6600/ANGLE setup. Direct packed-buffer bounds and bounded pose reuse reduce synchronous draw cost by 34.9% for repeated idle poses and 38.2% for mixed effects. Pixel comparison reports zero changed channels. These figures are workload measurements, not full-game FPS claims. The underlying reports, CPU profiles and comparison images are in `performance/`.

## Independent review

`independent-review.md` records the specification review, six corrected findings and 41 passing focused checks. Additional independent checks cover both-team spell scaling, Builder ownership, native troop formations, and Hero Frostbite replay seeking. No unresolved material review findings remain.

Builder source provenance is recorded in `assets/ultimate-clash/builder-provenance.json`; the imported animation comes from Supercell's public asset CDN. Temporary extraction files and local diagnostic logs are excluded from the release commit.

## Live GitHub Pages deployment

The manual Pages workflow published release `e3ec67008c676c90413fcab7a88df607f2a0cc66` as v0.58.0. `deployment.json` records the successful workflow and public asset checks. `live/report.json` and screenshots verify the actual Events button, all 20 Ultimate cards, saved decks, phone layout, and a live battle with a four-minute timer and 20-elixir HUD. Browser verification ran with the service worker enabled and controlling the page; no JavaScript errors occurred.

Set `WEB_ROYALE_URL` to the public site URL and `ULTIMATE_QA_OUT` to a separate report directory when running `tests/browser_ultimate_v058.cjs` against a deployment. The local preview remains the default. Already-open older tabs need reloading; the `?release=0.58.0` URL bypasses a cached entry page without clearing saved progress.
