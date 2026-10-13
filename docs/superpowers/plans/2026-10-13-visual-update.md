# Web Royale visual update implementation plan

> **For agentic workers:** Use systematic debugging and parallel implementation; parent integrates and verifies the shipped bundle.

**Goal:** Update the current v0.53.0 build with the user's arena, spell, model and screenshot-based interface fixes, then publish the verified release to the existing GitHub site.

**Architecture:** Preserve the current browser engine, profile format and layout. Repair missing source asset routing and animation state handling, update the existing menu components, and raise raster backing density independently of layout dimensions.

**Tech stack:** Buildless browser JavaScript, Canvas 2D, Three.js, source SC scenes, Node tests and Playwright.

**Spec:** User request in this chat; ten screenshots in `C:/Users/Oceyi/Downloads/Photos-1-001` are visual references only.

## Constraints and decisions

- Start at latest GitHub main `7b6f453ec70711cc50953117a213c4bcdb104597` using the clean existing checkout on `fix/arena-visuals-v054`.
- Preserve synced project files, existing saves, camera geometry, and UI positions/sizes.
- Use original source imagery when available; describe any source limitations accurately.
- Existing GitHub deployment is explicitly authorized by the user. No additional approval step is necessary.
- Independent domains run in parallel with disjoint edits; shared asset JSON is merged by the parent.

## Tasks

- [x] Arena progression: reproduce the repeated road texture after arena 14, map all modern arena road visuals, and test increasing opponent strength through all arenas while preserving historical rules. Owner: arena_levels. Files: progression/level-model and road rendering integration.
- [x] Models: reproduce missing assets/render readiness and incorrect animation state routing; fix evo/hero visibility, timing, bounds, lighting where evidence supports it, and particle dependencies. Owner: models. Files: modern-3d/native model paths and regression tests.
- [x] Menus: implement the reference slot backplates, independent active variant borders, collection roofs, cycle diamonds, cleaner shop layout, unclipped tower previews, and themed mode cards. Owner: reference_review. Files: app.js menu functions, v540.css, menu/shop helpers as necessary.
- [x] Spells and density: restore missing modern spell effect definitions/scenes and verify both teams, lifetimes, target attachments, and lazy loading; preserve layout while raising raster density to at least 1080 across the 540-wide logical frame. Owner: parent. Files: fx.js, native dependency integration, ui-polish.js and assets.
- [x] Integration: include stylesheet, update release version, run regression suite/build, inspect representative browser screens and animated combat, review combined diff, publish main and dispatch existing Pages workflow, verify live release.

## Review focus

- Modern final arenas must use distinct textures and level-16-capable progression.
- Activated form and special slot styling must remain separate, including locked/unlocked variants.
- Cold-loaded models and source effects must stay visible without requiring a second battle.
- Particle and animation changes must not change simulation random state or replay results.
- Raster resolution must not change CSS geometry or drop transparent edges beneath labels.

## Progress

- Baseline test run launched before edits; reference screenshots inspected.
- Missing modern spell FX catalog entries confirmed; old road platform fallback confirmed.

- Source review found no remaining renderer/replay blockers. The new effect atlas pack was independently compared against all 5,923 original retained shape commands.
- Actual bundled browser checks cover 161 actors, both teams, four states, three animation samples; seven representative actors also pass compressed-scene cold loading.
- All 18 new Trophy Road platform URLs load with distinct hashes. Twelve reference UI screens, tower preview bounds, phone layout, and 1080 backing density were checked in the built browser.
- Void particle tails were corrected and regression tested, including moving projectile and rising-spark history.
- The user requested multiple-video verification before publishing. Actual BaleGG and FinalClash footage exposed repeated field creation, cast-center damage beams, missing source target filters, and field blending with terrain. These were corrected, with current official damage rounding, one-second timing, and flying-target previews covered by focused tests.
- Final source and frozen build passed 1,689 regression tests, with one existing skip; 802 Void browser checks passed across ten scenarios. All 2,119 release hashes and current source modules were verified.
- Published release commit `9f1af5e1912d54be1204ef92b41f8bde01233c2b` to `main`. Pages workflow `38364602173` completed successfully. A fresh browser loaded live version 0.54.0 with no JavaScript errors; the live release, app, runtime, stylesheet, modern portrait, arena platform, model manifest, and modern effect atlas match verified local hashes. Evidence: `docs/qa/v054/deployment.json`.
