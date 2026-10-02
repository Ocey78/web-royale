# Web Royale Main v0.52.1

This presentation patch fixes repeated 3D model reloads and replaces the earlier
Touchdown reference texture with original stadium artwork from the supplied
Clash Royale **16.402.2** XAPK. Card balance, simulation version, catalogue,
progression and availability remain those of [v0.52.0](BUILD-NOTES-v0.52.0.md).
Final built-package checks passed; the release is live on GitHub Pages with its
published bundle verified in Chrome.

## Visible 3D actor retention

The previous cache could evict a visible actor whenever more than 16 actor types
were drawn. Subsequent frames reloaded models that were still on screen, causing
repeated work and missing drawings during those loads.

The renderer now pins the current frame's actor cohort, including previews and
asynchronous loads that finish after the frame. Only inactive models are evicted.
New frames replace the cohort; battle exit, Potato rendering and reconfiguration
clear old pins. An exact cached source pose can be drawn after its inactive mesh
is evicted. A different pose still loads and samples the original model.

The **16-actor / 128 MiB** limits are soft resident targets when active artwork
exceeds them. The current manifest contains **36 actors**. Model bytes estimate
geometry and decoded textures; animation arrays, browser overhead and GPU driver
allocations are additional. Pose rasters retain a separate **48 MiB LRU budget**.
This is neither a total browser-memory cap nor a universal Ultra FPS guarantee.

## Original Touchdown stadium and markings

The source `level_touchdown_arena` scene replaces the earlier 551×647 supplied
stadium screenshot in current rendering. It preserves the original pitch,
stands, team entrances, statues, flags and audience artwork. All **168 source
placements** retain their authored location/layer metadata, with zero unresolved
export references. The three scene dependencies are `level_touchdown_arena`,
`source_touchdown_decos` and `source_touchdown_bootcamp`; their lossless texture
files total **2,545,130 bytes per product**.

Composition wrappers separate pitch/turf, backdrop and lighting using unchanged
source frame entries. Decorations retain their source animation where authored.
The actual **white goal-strip centers 56.8333333 / 578.5** map to the existing
logical scoring lines **25 / 615**. Colored end-zone band centers are distinct
from these scoring lines. Normal and wide Touchdown presentations preserve their
existing playable geometry.

The source markings contain **1,902 triangle chunks with a flat UV sample**.
An affine-only texture path skipped that geometry. The renderer now samples the
original texel and fills its authored polygon, restoring source white goals,
transverse lines and yard ticks without drawing replacement markings.

Animation-mode cache invalidation applies only to the original source stadium.
Other maps retain their static scenery caches when ambient animation is toggled.

These imports supersede earlier statements that complete original 2D Touchdown
stadium art was unavailable. Original scene geometry is not proof of full native
material shaders, dynamic shadows, ambient cloud/blimp effects or separate light
emitters. Source animation where present does not imply every backdrop animates.

## Preserved scope and source provenance

Main retains **123 base cards**, **67 form records** (17 Heroes, 42 Evolutions,
8 Champions), **32 Trophy Road arenas plus Training Camp**, **217 road steps**,
card/Tower Power levels through **16** and account levels through **90**. The
previous dependency audit recognized **121/123 base cards** and **51/67 forms**
(30 Evolutions, 13 Heroes, 8 Champions); unsupported choices remain unavailable.
The three complete original seasonal tower styles remain Shark Tank, Sandcastle
and Fortress. The AI deck pool and separate save/replay namespaces are unchanged.

The updated [native source provenance](assets/native/source-data.provenance.json)
records the following source pack, separately from final release hashes:

- `assets/native/data.json`: **125,595,841 bytes**, SHA-256
  `b45dd03668b824f2371eb7f91f072a480f20a2472b2d9c7f4795f5cec55040ae`.
- `assets/native/source-data.json.gz`: **18,687,008 bytes**, SHA-256
  `5503806722ccf8901c52bce0382b3058b9bc461d1ba1dc498f8963f5812bcd9a`.

Touchdown mappings and measured goals are in
[`assets/native/touchdown-arena.json`](assets/native/touchdown-arena.json).
[FIDELITY.md](FIDELITY.md) and
[source model notes](assets/modern-heroes/README.md) describe remaining limits.
Complete 1:1 native-game fidelity remains incomplete. Battles, AI, rewards and
social systems are local; no live online matchmaking or Supercell services are
included.

## Verification status

The final Node suite passed **1,500/1,500 tests**, with zero failures or skips.
The focused scenery/flat-UV/source-stadium checks passed **14/14 tests**; source
cache checks passed **16 tests**.

Actual Chrome checks of `app.a1fa6f9edfbd.js` passed **384 directional poses**,
**22 animation-clock probes**, **12 authored spirit attack poses**, **62 Tesla
samples**, and **six full/compact 3v3 arena compositions**. Engines **0.46, 0.51
and 0.52** reproduced their recorded replay states exactly. Separate save/learning/
replay namespaces and profile persistence passed; browser errors and failed
requests were empty.

The actual built 3D renderer retained **17 and all 36 actor types** across ten
changing source-pose frames per cohort, drawing both teams with **zero model
reloads after warming**. Menu exit released active pins, inactive models pruned,
and an exact cached raster remained drawable after mesh eviction. This is a
retention regression check, not a universal Ultra FPS or total-memory claim.

All three Touchdown modes passed four viewport sizes, including phone touch
deployment, source animation clocks and original goal-mark pixels. These proofs
use the shipped bundle without source overlays or replacement renderers.

The verified website contains **1,864 files / 915,117,535 bytes**. Its release
digest is
`e50ebe3097fe26bfbffbade7785c153ac5fb3c5075b34cbdddf2781fec6ec87f`.
Source restoration and release-file integrity checks passed. This identifies the
website payload, separately from an editable project archive.

The patch is [live on GitHub Pages](https://ocey78.github.io/web-royale/).
[Deployment run 37003065530](https://github.com/Ocey78/web-royale/actions/runs/37003065530)
succeeded for runtime commit `15409d954752eb128455be5e5091efd281c708bb`. The
published `app.a1fa6f9edfbd.js` and release digest matched the verified local build.

Actual Chrome checks of the public site passed **21 spell commands**, **six
Rocket/Fireball flight and impact cases**, all three Touchdown modes across four
viewports, phone touch deployment, source animation clocks and original goal-mark
pixels. Knight Hero's ability succeeded, changing its shield from **0 to 818**;
Trophy Road and form-interface checks also passed. The live build reported
**v0.52.1 / 123 cards / snapshot 16.402.2**, with no browser or asset errors.
These cases do not certify complete native behavior for every card or form.
