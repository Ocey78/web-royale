# Web Royale v0.33.0 - iPhone web app

Live private app: [Open Web Royale](https://web-royale-iphone.oceyt.chatgpt.site). Sign in with the same ChatGPT account if prompted.

Open the hosted link in iPhone Safari, sign in with the owner account if prompted, then choose **Share → Add to Home Screen**. Keep **Open as Web App** enabled if Safari shows that option. Launch Web Royale from the new Home Screen icon.

The hosted site runs without the Windows PC. It uses an internet connection to load the game's assets; this release does not promise complete offline play. Assets load as needed, without forcing the whole collection to download for offline use. Use an up-to-date iPhone (iOS 16.4 or later is required for compressed scene loading).

## Changes

- Standalone web-app manifest, Apple metadata and 180/192/512-pixel icons.
- Safe areas for the notch and Home indicator, without changing the logical arena/camera.
- Correct visible-viewport dimensions and offsets when Safari's keyboard or browser bars move; orientation changes refit the game.
- Pinch zoom remains available. Phone form controls use a minimum 16-pixel font to avoid automatic focus zoom.
- An iPhone-specific Home Screen instruction replaces the desktop fullscreen fallback.
- Hosting build compresses native animation data losslessly, reducing the complete static folder from 296 MB to 258.5 MB. All artwork and audio remain byte-identical.

Game data, combat, card movements, progression and replay simulation are unchanged from v0.32. New replays still use engine 0.32; all earlier replay routes remain supported.

## Saves

Progress is saved on the device, in that browser/web app. It is not automatically synchronized with your PC. Safari and a Home Screen installation should not be assumed to share the same progress. Use **Settings → Export Save** and **Import Save** to move player progress; replay and AI-learning archives are separate. Install the Home Screen version before starting your main phone save.

## Verification

- 44 relevant platform, asset, UI, layout, compact-scene and release regression tests passed.
- Compressed and ordinary scene-loading regression checks passed. All 111 compressed scenes roundtrip without changing the animation data.
- Desktop WebKit 26.5 with iPhone 13 touch/viewport emulation passed: served manifest/icons, safe-area fitting, level-99 touch deployment, keyboard viewport height/offsets, rotation and changing Safari toolbar height.
- The same browser check failed on v0.32's missing Home Screen metadata before the change.
- Screenshots were inspected at phone dimensions. This is browser-engine emulation, not a physical iPhone memory/performance test.

References: [Apple Home Screen instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios), [WebKit Home Screen support](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/), [safe areas](https://webkit.org/blog/7929/designing-websites-for-iphone-x/), and [Home Screen storage behavior](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/).

## Rebuild

Use `node tools/build-web.js --compact-scenes` for the hosted build and `node tools/serve.cjs` for a local preview. Ordinary `npm run build` keeps uncompressed scene JSON for the existing Windows launcher. Both deliveries use the same game and art.
