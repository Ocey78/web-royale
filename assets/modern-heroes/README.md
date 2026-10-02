# Source model rendering

These assets were converted locally from the user-supplied Clash Royale XAPK.
The package's own fingerprint identifies client version **16.402.2**. The archive
was retained without modification. `manifest.json` records each original prefab,
model, texture, animation, source entity, source hash, and animation marker.

The live cohort contains **36 actual actors**, including the hero visual actors,
their authored auxiliary forms, Ronin, Minion Giant, and the broken Tombstone
visual. The two Tombstone controller prefabs with no geometry are listed explicitly
as controllers; they are not represented by invented replacement images.

The ordinary glTF files retain original mesh geometry, joints, skin weights,
diffuse textures, full source animation frames, prefab transforms and mount-bone
attachments. The source's single-frame Tombstone idle pose retains its original
node transforms and holds still. The static pose has no source frame rate; its
30 Hz metadata timebase only supplies a holding frame.

The renderer uses local MIT-licensed Three.js 0.180.0 modules. Their license and
source checksums are in `../vendor/three`. The source FLA2/Odin decoder remains an
isolated build tool under `work/modern-xapk`; its GPL-licensed dependency is not
bundled into the browser product.

The original blue-channel team-mask formula is retained. The exact native client
team color constants were unavailable; the local game supplies its blue/red
uniforms. Source sun rotation, intensity, color and ambient color are used with
Three.js PBR lighting. The proprietary `uber_pbr` shader, unconverted prefab
material overrides, normal maps and some prefab particles/VFX are not reproduced.
This is source model rendering, not a claim of pixel-identical native engine output.

The source ASM clips and markers are preserved. Generic battle states select
matching source clips, including shield selectors and simulation-synchronized
release poses. Source transition graphs and particle event controllers are
retained as metadata; the local battle controller supplies active states rather
than running the complete native ASM interpreter.

Actors load on demand. At most 16 decoded actor groups are retained under a
128 MiB estimated geometry/texture budget. Animation arrays, browser overhead
and GPU driver allocations are additional to that estimate. Sampled canvas poses have a separate 48 MiB LRU
budget. Higher texture quality increases raster density while preserving field
scale, pivots, collision geometry and scoring rules. The previously generated
Knight atlas remains a lazy fallback; other generated hero atlas pages are not
bound into the production build.

The live payload contains 37 glTF models (52,261,680 bytes), 24 mask PNGs
(706,848 bytes), a 315,757-byte manifest and 2,157,944 bytes of MIT runtime modules.

The modern arena import uses all 32 original Trophy Road location mappings and
their SC5 floor/deco exports. Five blank initial decoration coordinates remain
listed in `unmappedObjects` rather than assigned invented positions. The source
SC5 objects supply animation where present; five arena samples are static. The
three additional seasonal tower styles are complete original Shark Tank,
Sandcastle and Fortress assemblies with both teams and all 98 King activation
frames. Their source mappings are in `../tower-skins/seasonal.json`.
