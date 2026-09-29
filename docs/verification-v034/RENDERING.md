# Rendering performance changes

The battle canvas previously reused the text renderer's minimum2x backing scale. At the measured DPR1 desktop size, a461x1000 displayed arena used1080x2344 backing pixels. Text benefits from extra sampling; repainting the entire animated arena at that minimum was unnecessary work.

`RoyaleUI.prepareBattleCanvas` now uses device pixel ratio times viewport scale, with a1.25x logical minimum and the existing3x maximum. The1.0x candidate was rejected after screenshot inspection because it softened small artwork. The selected1.25x floor retains modest supersampling. Text/UI canvases keep their existing policy. The application uses this helper for the battle and result canvases; camera, world geometry, animation timing, and simulation are unchanged by this optimization.

| Measured surface | Before backing pixels | Final backing pixels | Reduction |
|---|---:|---:|---:|
| Desktop1200x1000, DPR1 | 2,531,520 | 988,875 | 60.9% |
| Desktop1200x1000, DPR2 | 2,531,520 | 1,844,000 | 27.2% |
| Touch phone390x844, DPR3 | 2,956,011 | 2,433,600 | 17.7% |

The phone reduction comes from the separately implemented compact540x960 composition. The renderer continues to supply the phone's full physical resolution; its final canvas is1170x2080 for390x693.33 CSS pixels at DPR3.

## Reusing still HUD geometry

Health bars were the largest per-unit JavaScript drawing cost in the48-unit profile. `Scene.drawStill` now caches their resolved source frames, transforms, colors, and draw order, with a maximum128 plans per scene. It draws the original texture shapes directly at the current canvas resolution. Live HP/level text is bound on every draw. Fill keys use the source's actual discrete bar frame rather than every fractional HP change. Masked clips and replacement-node callbacks use the ordinary interpreter. Animated units, effects, and tower characters continue using their normal timelines.

The cached and ordinary renderers produced **byte-identical pixels in480/480 comparisons**:24 original health exports, root frames0/31, five fill values, level99 and large HP text, and full/58% parent opacity. The cache remained within128 plans. Focused renderer/presentation/native tests passed25/25.

## Measurements and limits

The browser probe uses headless Edge, a paused but fully rendered48-unit source-art scene,2500ms requestAnimationFrame samples, and24 forced-readback draws. It records both empty and crowded scenes. Readback times are a synthetic rendering-cost comparison; they are not device frame rates. Other agents ran browser loading tests concurrently during some after samples, so wall-clock timings are noisy.

- DPR1 desktop forced-readback crowded median:30.6ms before,27.9ms at the final1.25x floor; empty25.9ms to22.2ms.
- DPR2 desktop crowded median:31.8ms to24.1ms in the initial after profile; density is the same in the final policy.
- Narrow DPR3 rendering at unchanged old geometry: health-call mean0.0193ms to0.0143ms; whole draw JavaScript2.62ms to2.25ms. This viewport lacked touch emulation and is not the compact-phone result.
- The subsequent true touch-phone cache-on/off check reduced health-call mean0.0201ms to0.0183ms, but total draw timings varied in the opposite direction because unrelated unit/arena costs also changed. That sample does **not** establish a whole-frame phone speedup. Pixel count reduction, exact HUD output, bounded reuse, and the reduced isolated HUD work are the stronger conclusions.

Raw reports are `renderer-baseline.json`, `renderer-desktop-final.json`, `renderer-after-initial.json`, `renderer-phone-ab.json`, and `renderer-pixel-parity.json`. Screenshots remain under `docs/qa/v034/render-*`. Reproducible browser probes are `tests/browser_renderer_perf_v034.cjs` and `tests/browser_renderer_cache_v034.cjs`; `RENDER_SOURCE_ONLY=1` runs the pixel comparison in an isolated local page with original presentation assets, avoiding unrelated application loading work.

No phone GPU timing, sustained thermal behavior, or performance on physical low-end hardware is established by these local emulations. Initial source-shape rasterization still occurs on first use; the separate asset preload work handles network/cache readiness but is not a proof that every later first-use raster hitch is eliminated.
