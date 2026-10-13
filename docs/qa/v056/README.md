# Evo and Hero effects — 0.56.0

This release continues the published 0.55.0 build. The real client was inspected through read-only card previews for Knight Hero, Knight Evolution, Dark Prince Hero, Balloon Hero and Wizard Hero. The native preview area is only 299 × 182 pixels; it establishes visible appearance and behavior, not numerical equivalence for every particle trajectory.

## Changes

- Imported original mesh effects, material inheritance, shader variants and timelines. Mesh slashes, colored wakes, Wizard wings, glowing eyes and timed Fresnel effects now render instead of being silently skipped.
- Preserved source UV scrolling, masks, distortion, dissolve, material curves, team variants, geometry visibility, bone attachments and depth against the troop body. Transient effects finish after attack animation changes, and material effects do not change troop shadows.
- Added the original Evolution Elite Barbarians rig for both source entities, including all seven clips, prop selectors, spear throw visibility and the spear-ready material effect. The existing 36 actor definitions are unchanged.
- Connected source action prefab effects, including Bowler and Magic Archer. Their lifetime uses battle time even when a troop is deployed late. Cached poses distinguish different material targets and action instances.
- Added missing original particle curve/emitter types. Single-frame smoke images now last for the particle lifetime. Particle dimensions use the same model-to-screen conversion as their positions. Non-following smoke retains its birth attachment and position as the troop moves; following particles remain attached.
- Corrected visible 2D particles receiving shadow displacement. Directional clips select the correct source frame without also rotating the bitmap around its anchor.
- Isolated each animated material's nested uniforms so simultaneous effects keep their own fade, color and UV values while sharing immutable textures. Prefab lifetime bookkeeping stays outside replay-serialized gameplay state.

## Evidence

Source assets and offline reproduction: [assets/README.md](assets/README.md), [assets/verification.json](assets/verification.json). Texture transfer functions are decoded from KTX headers: sRGB diffuse overrides are decoded once, while masks, normals, ramps and reflection data remain linear.

Native comparisons and the Knight shield correction: [reference/observations.json](reference/observations.json). Particle interpretation, regression coverage and moving-emitter comparison: [particle-sampler.md](particle-sampler.md).

GPU checks use the actual original assets and both teams. The all-actor/action check covers 38 actors, 532 body/shadow samples, five real source action events, 36 Evolution prop/throw samples and ten Charge samples. The separate effect sweep covers 224 attack/ability samples plus expiry checks, with targeted Bear Form transformation and moving Dark Prince Charge runs. Source results are recorded in [action-gpu-source.json](action-gpu-source.json) and `effects/source*`; built results are recorded separately. Presentation checks compare entity state before and after drawing, test shader/asset errors, and verify ability stop restores the original appearance.

The full regression run passed 1,736 tests with no failures and one existing skipped Custom-progression test. After the final uniform-isolation and replay-safe lifetime changes, 111 focused mesh, particle, action, selector and replay checks passed. Three saved 0.53 Hero/Evo fixtures recorded with the previous interpreter retain their exact serialized gameplay digests, including after replay seeking. The production build contains 2,244 files; every release hash and source effect asset copy is verified in [release-checksums.json](release-checksums.json).

The final `app.13d922b94aac.js` passes fresh source and built GPU sweeps. All 252 effect frames, 532 actor body/shadow samples and 25 action images match between source and production. Simultaneous-material isolation, effect stop/restoration, late deployment, both teams and Evolution throw visibility pass with no shader or missing-asset errors. Detailed built evidence is in [action-gpu-built.json](action-gpu-built.json) and [effects/source-built-comparison.json](effects/source-built-comparison.json).

## Publication

Release commit `f4129b97165c379a6d17dac7bc0c439dba8e3511` was pushed to `main` and published by [Pages workflow 38450960899](https://github.com/Ocey78/web-royale/actions/runs/38450960899). Live verification matched the release manifest and 129 application, material, mesh and texture files to their local SHA-256 values. A fresh Chrome session reached the home screen with version 0.56.0, native assets ready and no page errors. See [deployment.json](deployment.json) and [live-site.png](live-site.png).

An initial asset request received a transient CDN 503 immediately after publication; it returned 200 on a later direct check. The successful complete verification needed no retries. A parallel 30-second diagnostic was still downloading the existing 841 MB cold-start asset set; the full verification allowed it to finish. These observations do not establish a first-load performance improvement.

## Practical limits

The source data is exact; the browser's particle integration is a bounded interpretation, not recovered native engine code. Unseen birth poses clamp to the earliest observed pose. Billboard compositing, native blend enum equivalence, advanced trail/gradient controllers and lower-level native timing are not established as bit-identical. Mesh normal/additive blending follows preserved material render-state values, with the enum interpretation documented in the import notes.

Two action prefab paths are absent from this client database: Electro Giant Evolution's pulse and Electro Wizard Hero's continuous aura. They remain listed in `missingActionRoots`; no unrelated asset is substituted. Two ribbon bones referenced by the Elite Barbarians throw animation are absent from its source LOD1 rig and are explicitly recorded as omitted LOD bones. Linked action effects handle explicit duration, stop conditions and actor death; inheritance from an enclosing action-duration context is not implemented.

These changes substantially improve visible fidelity but do not establish complete 1:1 parity. No live matches, purchases, rewards, account settings or decks were changed during reference capture.
