# Web Royale 0.55.0

Improves the existing 0.54.0 build using direct comparisons with the installed Clash Royale client, the supplied menu screenshots, and original model/material/animation data.

- Deck cards fill more of the screen: portraits grow from 86 to 113 logical pixels while all eight slots fit on desktop and phone. Deep navy backgrounds, cobalt tabs, bounded Evolution/Hero highlights and restored source text outlines give the deck and collection a clearer hierarchy.
- Daily shop offers have larger portraits and labels, with progress and price rows contained within each panel. The home screen uses a teal diamond background, stronger chest panel depth and consistent blue/gold navigation.
- Ground shadows now use current troop silhouettes instead of generic blobs when source artwork is available. Facing and animation match the body, flying shadows remain on the ground, and every shadow is painted before actors. Health and deployment labels are painted above the crowded battlefield.
- Modern heroes use source LOD1 material equations and 23 verified packed textures for metal, roughness, occlusion, mask channels and eye glow. Continuous skeletal sampling and authored transition durations improve movement without shifting simulation attack markers.
- Shadow and body passes share pose rasters. Bounded caches release texture memory, and visibility-event frames remain distinct even within one raster sampling interval.

Gameplay rules, profile storage and simulation/replay state are unchanged. Comparison fixtures assert that drawing does not change the battle digest. The prior 0.54.0 arena, spell, form and resolution fixes remain included.

Evidence and repeatable browser checks are in `docs/qa/v055/`. The delivered bundle was checked on phone and desktop, in a crowded battle with native and modern actors on both teams, and across 3,864 model samples covering 161 actors. Forty additional GPU samples verify motion interpolation, transitions, visibility events and shared shadow/body poses. Two source-invisible Tombstone controllers and the Ice Wizard cube's initial ability frame retain their documented 0.54 behavior.

Native scene shadowmaps, complete animation graphs, shader-only particle meshes and material/timeline overrides remain outside the browser adapter. Shadow projection and some scene/camera uniforms are interpretations. This release improves the observed presentation; it does not claim pixel-identical native-engine output.

Final regression result: 1,702 tests passed, zero failed, one existing test skipped. Production UI, model, shadow and replay-state checks passed. The final bundle and deployment checksums are recorded alongside the evidence.
