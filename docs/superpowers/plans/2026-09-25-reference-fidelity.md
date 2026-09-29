# Reference Fidelity Implementation Plan

**Goal:** Match the supplied arena reference geometrically and correct confirmed combat interpreter errors.
**Architecture:** Keep the 18x32 simulation grid unchanged. BattleView owns a 540x1172 portrait layout and its camera; the menu layout remains independent. Rendering uses original SC assets. Correct combat state transitions and collision math in place.
**Spec:** ../specs/2026-09-25-reference-fidelity.md
**Tech Stack:** JavaScript, Canvas2D, native Node tests, Python Playwright/OpenCV validation.

## Global constraints
Full source build, original data retained, no font binaries, no automatic paid unlocks, no approval checkpoints requested by user.

## Tasks
- [x] 1. Test camera landmark projection and aspect ratio; change battle-view.js and shell fit/input/Canvas sizing, append v250.css. Test mobile/desktop result screens and card placement. Measured terrain must align within 1 reference pixel median after normalization.
- [x] 2. Test and correct original source asset scale/assembly (native.js, presentation.js); character layers sit inside towers, inactive King does not open its turret, full tower levels appear. Capture all arena states and compare crops.
- [x] 3. Write failing physical sweep/contact and target-lock/preload/dash tests in v250-fidelity.test.cjs. Fix pathing.js and battle.js one behavior at a time; preserve baseline regressions except obsolete camera values.
- [x] 4. Add sourced river-jump elevation and validate logic/render consistency. Audit all source cards' supported mobility/timing without treating an audit as proof of proprietary engine identity.
- [x] 5. Run npm test, browser suites and archive hash verification; review diffs; package v0.25 with source and a candid build report.

## Review focus
Short screens cannot cause stretched terrain; navigation/placement coordinates cannot depend on UI aspect ratio; long names and 2x/3x timer must remain in bounds; spells/knockbacks cannot pass through structures; all emotes and XP save fields must survive. No additions to current live game's stats or imaginary assets.

## Ledger
Baseline: 504/504 Node tests pass; extracted v0.24 source and original assets are available. Battlefield registration 568 inliers, 0.377 px median. Current screenshot mismatch includes aspect ratio, underscaled/incorrectly layered tower characters, and source health-bar anchoring, not solely zoom.

Ruling: Continue without approval gates, as explicitly requested in the conversation; use an isolated extraction of the unchanged v0.24 ZIP, not a shared checkout.
Ruling: Keep simulation positions, level tables and roster data unchanged. Registered source art pivots differ from collision centers, so sprite offsets must not move physics bodies.
Ruling: Preserve the actual original King dummy hierarchy rather than using manual offsets; this fixes red/blue depth order and the activation barrel animation together.
Ruling: Cap large native shape caches before allocation. Giant single-color source backdrop polygons do not require doubled pixel density; small actor sprites still receive it.
Ruling: Replace old camera-only test constants and the legacy test's 960-pixel input conversion with the new battle layout height. Keep actual mouse deployment and bounds assertions.
Verification: the full final Node suite passed 518/518. The first combined browser run exposed one obsolete v200 input-conversion assertion; production pointer placement passed its independent new test. The old test now uses the same declared battle layout and is rerun with the entire browser suite.
Review: compared all changed src files to the original full ZIP. No source game-data bytes changed; source movement stats, profiles, shop/chest rules and emote assets were not replaced. Input, render, result-board and overlay transforms were reviewed together. No fresh reviewer tool exists; this was an inline whole-diff review, not a fabricated agent review.

Final browser run: 59/59 passing after updating the obsolete v200 coordinate conversion. Final Node run: 518/518 passing. Package rebuilding and hash comparison are verified by package_release.py.
