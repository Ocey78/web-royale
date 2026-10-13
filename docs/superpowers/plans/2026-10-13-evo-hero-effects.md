# Evo and Hero source effects

Continue from published 0.55.0 (`62801c8`). User authorizes direct comparison with the real client, source-based particle/material fixes, and the existing GitHub publication workflow. Synced `sources/` remains read-only.

- [x] Inspect missing effect components and original prefab, emitter, material, mesh and timeline records. Capture accessible live-client previews and record differences.
- [x] Extend deterministic billboard sampling for supported original curves and emitters; test real source fixtures.
- [x] Import referenced effect meshes, textures, materials and timelines with provenance, then implement animated source material/mesh presentation and body overrides.
- [x] Integrate effect lifetime, team color, bone attachments, depth, caches and quality budgets without modifying simulation or replay state.
- [x] Compare before/after motion and both teams, check all relevant Evo/Hero coverage, review independently, run regressions and production browser checks.
- [x] Publish and verify the live release; document concrete remaining limitations instead of claiming unsupported native parity.

Ownership: fx_assets_v056 handles extraction; particles_v056 handles source particle sampling; live_fx_reference_v056 handles real-client evidence; root handles material/mesh rendering, integration, verification and deployment.
