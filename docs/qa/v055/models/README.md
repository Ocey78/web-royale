# Model materials and motion

The installed Clash Royale Bowler Hero information screen and its built-in preview were compared with the browser renderer. The frontal card camera and overhead battle camera differ, so their frames are not treated as pixel-identical targets. `bowler-before-after.png` and the matching five-actor `before/` and `after/` sheets use identical browser viewpoints instead.

The browser now uses the original LOD1 `uber_pbr` material equations, 23 verified packed MRA textures, source mask channels, ambient-specular strength and output transfer. The original LOD1 shader deliberately omits normal-map sampling. Material inputs and extracted shader/default records retain source hashes in the manifest; the importer is reproducible. Full native material overrides and higher-detail reflection/normal paths are outside this change.

Pose sampling interpolates original glTF keyframes and blends authored transition durations. Integer visibility and attack event frames are preserved. Both body and ground shadow reuse a single sampled pose; bone-anchored effects follow that same blend. Regression tests cover texture accounting/disposal and visibility changes that occur inside one quantized raster interval.

`built/gpu-check.json` verifies the actual 0.55.0 app bundle: 40 GPU samples, half-frame motion, transition start/mid/end, native-to-modern shadow/body cache reuse on both teams, and the Bowler weapon visibility boundary. There are no WebGL/page errors or missing material/model requests. The optional static-host AI capability probe and browser favicon requests are explicitly listed separately rather than silently discarded.

`all-actors-built.json` records 3,864 samples across 161 actors, including all 36 modern actors, both teams and four states. Every expected visible pose paints. The two invisible Tombstone controllers and Ice Wizard cube ability frame zero match the same nonpainting poses in the 0.54.0 baseline. This diagnostic establishes coverage, not complete native animation-graph or particle-engine parity.

Repeat the focused delivered-renderer test with `node tests/browser_model_polish_v055.cjs --built http://127.0.0.1:8087/`. `MODEL_POLISH_QA_OUT` selects an alternate evidence directory. The broader actor diagnostic is `tests/browser_modern_models_v054.cjs --built URL`, with `MODEL_DIAG_OUT` directing its larger set of image sheets outside the repository.
