# Web Royale v0.34.0 — performance and phone battle layout

Phone app: https://web-royale-iphone.oceyt.chatgpt.site

## What changed

- Phone battles now use the same outer width as the home screen. The mobile composition makes room for both sides of the arena and the card bar; it keeps the world's proportions and touch placement aligned. Desktop battle composition is unchanged.
- The first launch preloads the complete game asset collection with a progress indicator. Verified compressed files are saved in browser storage and reused by images, animations, audio, emotes and training. Retry resumes completed downloads. Browsers that deny storage still load through their ordinary HTTP cache.
- Preloading stores encoded files rather than keeping every decoded texture in RAM. Only active battle scenes are decoded, and unused scene textures can still be released.
- The Windows opener now reuses versioned static assets. Documents and local data endpoints still refresh normally.
- Desktop battle canvases avoid unnecessary supersampling; text keeps its original sharp rendering. Still health-bar geometry is cached with a fixed limit, and unchanged battle labels no longer rebuild repeatedly.

Card targeting, pathing, levels, progression, combat and replay simulation are unchanged. New replays continue to use engine 0.32.

## Loading and saves

The first phone launch downloads the collection (about 250 MB including startup data). Later launches reuse the saved assets. The browser may clear its asset cache when storage is low; missing files will download again. The game does not cache the hosted sign-in page or its main document, so an internet connection is still needed to open the private hosted app.

Player progress remains device-local. Use Settings > Export Save / Import Save to move progress between desktop and phone. The Windows ZIP runs with `Web-Royale/open offline.bat` after extraction; no Node installation is required to play.

## Verification

- WebKit read and SHA-verified every preloaded asset after the test server was stopped, then opened a newly selected card in Sandbox. Warm startup made zero game-asset downloads.
- Health-bar geometry reuse keeps the original source textures and live HP/level text.
- Mobile framing, safe areas, touch placement, landscape changes and battle controls are checked in desktop WebKit with phone emulation. This is not a physical iPhone frame-rate measurement.
- Renderer, preload, cache recovery, worker routing, Windows opener and game regression checks are recorded under `docs/verification-v034` and `docs/qa/v034`.

The final build was published without additional checks at the user's request. Earlier verification records describe the builds identified in their reports.

## Rebuild

Run `node tools/build-web.js` for the Windows build. Use `node tools/build-web.js --compact-scenes` for the smaller hosted build, which losslessly compresses scene JSON. Run `node tools/serve.cjs` for a local preview. After changing the C# opener source, run `node tools/sync-offline-host.cjs` to update its embedded copy.
