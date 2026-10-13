# Native Hero and Evo effect assets — v0.56

The importer follows the existing 53 Hero FX roots, the four gameplay-action FX
roots actually present in the client database, and the Hero body material
overrides. It does not select assets from filenames alone. All references in
that closure are resolved; two gameplay-action roots absent from the source
database remain explicitly listed as missing.

## Result

| Output | Count |
| --- | ---: |
| Original prefab / particle / timeline records | 90 |
| Timelines | 33 |
| Original effect meshes | 13 |
| Mesh triangles | 2,610 |
| Materials, including inherited parents | 61 |
| Original textures decoded to lossless PNG | 85 |
| Shader families | 3 |
| Hashed binary dependencies | 165 |

`assets/modern-heroes/fx-manifest.json` is 648,136 bytes. The GLB and PNG files
total 13,356,686 bytes. Each output has a SHA-256 digest. Each original database
record and original binary dependency has a separate source digest.

The meshes contain the source nodes, transforms, triangle indices, positions,
normals, tangents and UVs. The previously unhandled native vertex format 29 is
float32 UV2; format 22 is signed-normalized int16 UV2. Original mesh materials
are retained as metadata. Prefab overrides determine the actual FX materials;
debug UV materials are not substituted for them.

Materials preserve the complete original `.rmat` bytes as base64, directly
decoded typed variables, the source inheritance chain, resolved variables and
the exact integer render-state fields. The importer handles native float,
vec2, vec3, vec4, texture and boolean variables and rejects unknown types.

All 28 distinct normal/reflection texture paths referenced by the current actor
GLB material extras are covered, including the original Giant, Mini Pekka and
Evo Elite Barbarians normal maps and shared sky reflection. This adds 27 previously absent
textures. `bodyTextureReferences` identifies the actor, part, material and
uniform responsible for each dependency; no normal map is synthesized.

Every texture carries `vkFormat`, `transferFunction` and `colorSpace` from its
original KTX2 header and DFD. The 85 FX textures include 83 linear maps and two
sRGB maps: `chr_hero_glowy_eye_diff.ktx` and
`chr_hero_glowy_eye_pupil_diff.ktx`. The Vulkan format and DFD transfer function
agree for every entry. Decoding preserves RGBA values without applying gamma
correction; the renderer applies the declared transfer function once.

Shader masks come from the native FlatBuffer variant tables, not the order of
text found in the binary. All `vfx_mask` and `vfx_mask2` vertex and fragment
variants are included. The source flag spelling `MASK_2_DISSOVE` is retained.
Eight `uber_pbr` fragment masks are included: 128, 130, 132, 134, 144, 146, 148,
150. These cover TINT with the FRESNEL, RIMLIGHT and LOD1 combinations.

The source compiler eliminates fresnel and rim equations in LOD1 variants.
Material effects therefore select the preserved LOD0 variant when their
authored lighting flag is enabled. The actor renderer remains responsible for
merging each override over the actor's own original material and choosing
skinned versus unskinned vertex execution.

## Runtime contract

- `records[path]`: original source graph or timeline. Paths and native property
  names remain unchanged.
- `meshes[path].file`: ordinary GLB; primitive extras identify the source
  material index and vertex descriptor group.
- `materials[path]`: `variables`, `variableTypes`, `resolvedVariables`,
  `resolvedVariableTypes`, `resolvedShader`, `resolvedRenderStateFields` and
  `selectedVariants`.
- `textures[path].file`: source top-level RGBA decoded to PNG, with explicit
  source color-space metadata. Texture references retain source sampler
  suffixes in material variables.
- `shaders[name].vert/frag.variants[mask]`: exact `source`, `sha256`, `flags`.
  `sourceVariantCount` records the complete native count even when only the
  relevant Uber variants are exported.
- `actionRoots`: four source gameplay action names and their prefab paths.
- `missingActionRoots`: two referenced paths that are absent from this database.

Texture presence selects the distortion variant so a timeline can animate
weights which begin at zero. Source boolean variables select color-as-alpha,
dissolve and second-mask dissolve. Every source variant is still available for
the FX families; these selections are an adapter decision, not a claim that
the native shader selector has been recovered.

## Repeatable import

Use Python 3.12+ with SQLite STRICT support, NumPy, Pillow, and the separately
preserved `modern_3d` decoder. The decoder's provenance remains in the existing
reference cache; no decoder code is delivered to the browser.

```text
python tools/import-modern-mesh-fx.py
  --database <verified-cache>/raw/assets/assets.scdb
  --cache <writable-cache>
  --source-cache <verified-cache>/raw
  --source-cache <model-source-v055>
  --decoder <verified-cache>
  [--reader <verified-range-reader>/inspect_remote_xapk.py]
```

Supply arguments on one line or use the current shell's continuation syntax.
The optional range reader is used only for missing referenced members of the
same version-code 160402017 archive. Once cached, the entire import runs
offline; the verified final run transferred zero bytes. `--output` can target
a scratch directory for reproducibility checks.

New PNG/GLB files match the repository's existing ignored asset patterns.
Release staging must explicitly include all files referenced by this manifest.

## Verification

`test_import.py` passed ten checks using the original database and source
caches: complete graph dependencies; raw material bytes and inheritance;
native shader masks and source program bytes; ordinary GLB attributes and
buffers; lossless PNG pixels; preserved non-finite source records; every
original database-record digest; every original binary-dependency digest;
complete body normal/reflection dependencies; original texture transfer functions.

An independent offline rebuild reproduced all 99 output files byte for byte
and transferred zero bytes. `verification.json` records the final digest,
coverage, sizes, source gaps and test totals.

Run the eight portable artifact checks with:

```text
python docs/qa/v056/assets/test_import.py
```

To also check original sources, set `WEB_ROYALE_FX_DATABASE` to the original
SCDB and `WEB_ROYALE_FX_CACHES` to cache roots separated by the operating
system's path-list separator (`;` on Windows). Each cache root contains
`assets/`.

## Original Evo Elite Barbarians actors

The old staging selector selected Hero prefabs only. The source contains a
complete Evo Elite Barbarians actor; the inherited 2D `FileName` field did not
mean its 3D model was absent. `import-modern-evo-actors.py` imports only explicitly
selected source Evo prefabs and merges them into the existing manifest. All
36 original actor records remain unchanged; `AngryBarbarian_EV1` and
`AngryBarbarian_EV1_2` bring the total to 38. Their source entity records remain
distinct while they share the same original prefab, rig, and seven animations.

The new ordinary GLB has 4,998 triangles and is 969,332 bytes. It preserves the
source skeleton, skin weights, prefab transforms, sun settings, complete ASM,
animation frames, source transition times, markers, audio event references and
mesh visibility events. Original diffuse pixels are embedded; the original
team mask and MRA map are external PNGs. All material texture references carry
source metadata. The actor's diffuse texture is **sRGB** (Vulkan format 172,
DFD transfer function 2); no gamma conversion is baked into its PNG pixels.
The actor's original normal map also joins the FX texture closure.

The Idle, Walk and Attack selectors use source Parameter 2 and switch values
0/1. Corresponding gameplay actions set `PropState` to 0/1, so
`ActionSetAnimationModifier` now retains named parameter values in
`animationModifiers`. This supports the Evo actor, Barbarian Log Hero and
Electro Wizard Hero without treating their prop state as shield state.
`Attack2` is the spear throw: action marker at frame 14, ASM end at frame 27,
and an authored `weapon2_lod1` hide event from frame 14 through frame 31.
Mapping attack sequence index 1 to `Attack2` follows the source action and ASM
convention; native dispatch code is unavailable. Two throw-animation ribbon
bones absent from the source LOD1 model are explicitly reported as omitted.
Separate projectile prefabs remain outside this actor conversion.

Use the same database, cache, decoder and optional reader arguments with
`tools/import-modern-evo-actors.py`. Its default selection is the two source
Evo Elite Barbarians entities; `--entity` can specify an explicit source Evo
entity. `--manifest`, `--game` and `--output` allow an isolated repeatable run.
The importer reloads the current manifest at its final merge point, preserving
unrelated existing actor and renderer metadata.

`test_evo_actor.py` passed all seven checks, including a direct comparison of
every converted source vertex, index and retained animation frame. Set
`WEB_ROYALE_FX_DECODER` as well as the two source audit variables above to run
the direct decoder comparison. The source selector/visibility Node suite
passed both checks. An offline rebuild reproduced the new GLB, two PNGs and
merged manifest byte for byte with zero network transfer.

## Gameplay action event connection

The `ActionPlayEffect` branch now emits `PrefabAsset` references as
`sourcePrefab` together with `sourceActor`, `sourceAction`, and a unique
`sourceActionToken`. A legacy `Effect` companion remains on the same event.
Follow flags, looping, particle-follow intent, scale and authored duration are
preserved. Renderers read the current `battle.effects` list; they do not write
graphics state onto actors.

For prefab-bearing actions, a battle-keyed `WeakMap` with weak actor keys
enforces singleton behavior and expires the matching presentation event on
override duration, force-stop, or linked actor death. No visual timer or serial
enters `modernActions`, which is serialized into replay digests. Visual
conditions read existing gameplay state without initializing it. Linked
looping effects without an override remain alive until an explicit stop
condition or death. Unlinked effects retain the existing four-second fallback.
Gameplay `GameTagsToSet` keeps its existing `effect` token, four-second fallback,
repeated-call behavior and authored override duration.

Five focused action tests first failed against the old dropped-prefab behavior
and then passed. Those tests plus the existing action interpreter and live
action suites and named parameter/lifecycle isolation tests passed all 60 checks. The tests cover combined native/legacy
events, exact delay and duration, singleton restart, forced stopping, actor
death, preserving unresolved source references without substitution, unchanged
serialized gameplay state, weak battle/actor ownership, legacy game tags and
stateless projectile/area effect expiration.

Three engine-0.53 replay fixtures were recorded using the baseline commit's
original action interpreter and replayed with the current one. Bowler Hero,
Electro Wizard Hero and Evo Elite Barbarians all exercise prefab-bearing
actions while retaining their exact serialized end digests, including after
replay seek. Fixture hashes and baseline interpreter provenance are saved in
`tests/fixtures/replay-v053-prefab-effects/provenance.json`.

The current action context does not carry a surrounding `ActionWithDuration`
owner handle. Therefore linking to an enclosing action's lifetime is not
implemented beyond the explicit override, force-stop and actor-death cases.

## Source and fidelity limits

- Electro Giant Evo pulse and Electro Wizard Hero aura gameplay actions name
  prefab paths absent from both source `asset` and `meta` tables. No replacement
  graph is inferred.
- Four original timelines contain bare `Inf`, `-Inf` or `NaN` control-point
  tokens: Giant custom swipe, Tombstone blue deployment, Bowler material pulse
  and Bowler boulder-in-range pulse. The manifest represents these tokens as
  strings and preserves the full original source text and digest. Runtime
  handling must be explicit; the importer does not invent finite curves.
- Material root fields 6/7/8 retain their original integers. Field 6 values 5
  and 6 correlate with source materials named normal and additive. The native
  enum schema is unavailable, so semantic render-state mappings are inference.
- PNGs preserve decoded top-level pixels. GPU compression and authored lower
  mip levels are retained only in the hashed source cache.
- Source shader math is preserved. Native scene lighting, object matrices,
  camera-facing transforms, uniform packing, draw ordering, clocks and scene
  shadow maps still depend on the browser adapter.
- Knight Hero's large taunt shape is the existing 2D
  `vfx_knight_hero_taunt_ground` composition (front/back cylinders, particles,
  ground area). Its mustache overlay is the source
  `vmc_knight_hero_buff_acitve_mustache` spelling. It is not a missing native 3D
  dome and should not be replaced by invented mesh geometry.
