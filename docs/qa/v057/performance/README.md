# v0.57 rendering performance

The retained-graphics comparison is v0.56 (`ab7e0b0`) versus `source-final`.
Both use the same original models, textures, effects and **Good** settings:
60 Hz animation sampling, 2× battle raster density, 120 particles per frame.

Chrome 155.0.8059.40 ran on an AMD Radeon RX 6600 through ANGLE/D3D11.
The benchmark renders 12 unit instances and their shadows into a 1280×1080
canvas, after 45 warmup frames, for 60 timed frames. The mixed case uses Knight,
Mini P.E.K.K.A, Dark Prince, Wizard, Ice Wizard and Ronin heroes on both teams.
Models and effect atlases are preloaded; initial downloads and shader compilation
are excluded. Each CPU profile is a separate 60-frame run.

These numbers measure synchronous renderer work, **not complete-game FPS**.
They are a repeatable crowded-actor workload, not a claim about all hardware.

| Workload | v0.56 mean | v0.57 mean | v0.56 p95 | v0.57 p95 |
|---|---:|---:|---:|---:|
| Twelve idle Giant heroes | 11.69 ms | 4.83 ms | 16.90 ms | 7.20 ms |
| Twelve mixed heroes with effects | 113.08 ms | 32.22 ms | 155.80 ms | 36.60 ms |

Mixed-actor mean cost fell **71.5%**, with **1145 billboard sprites and 594 mesh
effects in both runs**. Pose rasterizations fell from 1311 to 711. Canvas dimension
assignments fell from 5245 per axis to 2376. The prepared actor-memory estimate
fell from 55.55 MB to 44.36 MB after unrelated action assets were excluded.
Both runs have zero draw failures, page errors or GPU warnings.

The v0.56 profile identified synchronous `getImageData`, repeated drawing-buffer
resizing and per-vertex bone-matrix multiplication as major costs. The fixes reuse
immutable particle source pixels, reuse the WebGL drawing buffer with a cleared
sampling border, share eligible body/shadow rasters, preserve static material
cache keys, and compute each bone matrix once per bounds calculation.

`v056-exact-tint-cache` isolates the native tint-cache change with the immutable
v0.56 renderer: mean mixed cost fell from 113.08 to 97.18 ms, and `getImageData`
disappeared from the dominant profile samples. Source pixels are shared across
scenes with an 8 MiB / 64-image cap and are invalidated when source rasters are
released. This changes no source color precision.

## Visual preservation

`visual-comparison.json` compares the same final workload frame. Eight of twelve
actor regions are pixel-identical in the primary capture. Dark Prince's two
translucent smoke regions have small canvas-conversion differences. The two
Wizard wing regions showed a separate fresh-load variation described below.

The bounded fresh-load check in `flame-order-check.json` reproduced baseline
Wizard flames exactly in a second final-source run. In that matched repeat,
ten of twelve actor regions are pixel-identical; only Dark Prince smoke differs.
Its visible-channel mean difference is 0.036/255, with maximum premultiplied RGB
difference 2.68/255 after multiple translucent layers.

The two Wizard wing meshes use different normal/additive blend modes but have
exactly equal projected sort depth and render order. Three breaks that tie using
object allocation ids, which GLTFLoader assigns after independent asynchronous
material/geometry loads. That mechanism is consistent with the localized
141-pixel brightness variation between final-source loads. It already exists in
v0.56; **variation was observed in the candidate, while both measured baseline
loads matched**. Baseline variability is therefore an inference, not an observed
result. No further runtime change was made for this ordering limitation. All
252 separate actor/effect frames match between the final source and built app.

`browser_tint_cache_v057.cjs` separately compares the original and optimized
color operations using 40 RGBA gradient fixtures (163,840 channels). Every input
byte supplied to `putImageData` is identical, as is final alpha. Canvas backing
store conversion changes some final RGB channels by at most one byte. No colors,
particle quantities, shapes or source textures were quantized or reduced.

The intermediate `source-candidate` report predates the sampling-border fix and
is retained as diagnostic evidence; **`source-final` is the final source proof**.
The v0.55 report is historical context only: that version did not render the new
billboard and mesh effects and therefore is not an equal-graphics comparison.

Reproduce with `tests/browser_performance_v057.cjs --baseline ab7e0b0` or
`--source`, setting `PERF_QA_FRAMES=60`, `PERF_QA_WARMUP=45`,
`PERF_QA_UNITS=12` and a unique `PERF_QA_LABEL`. Source reports include hashes of
the runtime files snapshotted at benchmark startup. Do not run concurrent GPU
workloads or the simulation stress suite while collecting timed results.
