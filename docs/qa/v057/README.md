# Rendering performance and sampling — 0.57.0

This release addresses poor performance reported after the visual updates, while retaining the graphics presets, source models, effects, particle counts and rendering density. The user's open in-app tab was still running 0.55.0 with every graphics option set to Good; the published 0.56.0 renderer also had a measurable additional regression. Both versions were measured as immutable baselines.

## Changes

- Static troop appearances no longer depend on the global effect clock. Unmodified body/shadow poses share cached images; animated materials and actual overlay targets retain distinct keys.
- The antialiased WebGL drawing buffer grows to reusable capacity instead of resizing for every body and effect. Exact-size viewports preserve pixel density, with cleared guard pixels preventing neighboring render content from bleeding into scaled crops.
- Skinning bounds use the same arithmetic as Three, with bone matrices computed once per pose rather than repeatedly per vertex. Morph targets and binding transforms are preserved.
- Each actor prepares its own source action effects. Material bindings and timeline samples are cached, and mesh transforms are evaluated once before the camera-only refresh.
- Changing particle tints reuse bounded original pixel data instead of repeatedly reading back the GPU. The source color formula is unchanged. Browser canvas premultiplication can produce negligible byte-level rounding differences.
- Home arena framing and identical source animation frames are reused, with high-quality image sampling. Resolution, layout and authored animation timing are unchanged.
- Underlying troop materials receive current team lighting even while temporarily covered by an ability material.
- Returning actors reload their meshes and effects even when their last body pose is still cached. Rounded raster sizes stay within the 1536-pixel buffer limit.

## Verification

The selected rendering and UI suite passes all 460 tests with no skips (`tests.json`). The production build passes and all 2,244 packaged file hashes verify (`release-checksums.json`); its payload is 982,221,841 bytes. The unrelated gameplay simulation stress suite was not rerun for this renderer-only change.

Browser checks of the actual production bundle pass for 38 actors / 532 body-and-shadow samples, five action overlays, 36 Evo weapon poses, ten charge samples and opposing-team material restoration. All 252 built effect frames are pixel-identical to the corresponding source frames (`effects/source-built-comparison.json`). There are no rendering or shader errors; optional favicon and local AI-capability requests return expected 404s on the static host.

See `performance/` for measured rendering workloads and CPU profiles, `menu-quality/` for matching menu screenshots, and the GPU reports for complete actor/action/effect coverage. These timing numbers measure rendering work, not end-to-end game FPS, and depend on hardware. The 0.55.0 baseline lacks effects restored in 0.56.0; comparisons against 0.56.0 are the retained-graphics comparison.

The Good preset has no global noise or sharpening filter. Menu smoothing improves sampling subtly; it cannot recover missing detail from original small bitmap icons. No claim of a complete grain-removal fix or exact native-game parity is made.
