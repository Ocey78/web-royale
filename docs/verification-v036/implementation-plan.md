# Web Royale v0.36.0 Implementation Plan

**Goal:** Implement the user's September 28 changes in the supplied full v0.35.0 game.
**Architecture:** Extend the existing economy/profile, rendering and menu modules. Add isolated graphics-policy and group-label helpers; retain the simulation, assets, arena camera, save key and launchers.
**Tech Stack:** Plain JavaScript, Canvas 2D, Node 22 tests, Chromium/Playwright.
**Spec:** User request in this chat; this file records resolved details.

## Constraints and decisions
- Free chest: 600,000 ms after claim. Migrate old 4-hour deadlines from the last claim without resetting saves.
- Crown chest: every ten unspent earned crowns, no time lock, exact ready text `Ready!`.
- Streaks: retain +30 base and tiers at 3/6/9 then each third win; reroll every unlocked tier for each ranked win (first three tiers 10–15, later 5–15). Receipts keep retries deterministic. Non-ranked/practice/replays do not alter ranked streaks.
- Show home streak only at >=3, directly below trophies, never above chests.
- All visible individual troops/buildings and Princess Towers show levels. Each deployment/spawn group has one shared badge for untouched members when >2 survive; damaged members get individual badges, including shield damage and after healing. At <=2 survivors use individual badges. Separate same-card deployments stay separate.
- Graphics: Textures Low/Med/High; Animations Low/Med/High; Particles Off/Spells only/Minimal; Arena backgrounds Low/Med/High. Persist in profile and apply immediately. No changes to simulation tick rate, spell damage or timings. Retain original high-quality arena.
- Lightning Shop: three card offers, any arena-eligible rarity, 10-minute UTC windows, one purchase per slot/window, gold prices consistent with Hour Shop, no currency sales; independent receipts, stale offer rejection and seconds countdown.
- Full ZIP with dist/assets/source and both original BAT launchers. No font binaries.

## Tasks (RED → GREEN → regression)
- [x] Economy/profile: tests/v036-rewards.test.cjs; src/economy.js, src/profile.js.
- [x] Group level policy: tests/v036-level-labels.test.cjs; src/level-labels.js, src/battle.js, src/presentation.js, src/draw.js.
- [x] Graphics/performance: tests/v036-graphics.test.cjs; src/graphics.js, src/fx.js, src/native.js, src/presentation.js. Compare actual fireball getImageData calls and render time before/after.
- [x] Menus: src/app.js, src/streak-ui.js, src/webapp.css; browser tests for settings persistence, 3/12 shop counts, duplicate/stale purchases, crown/free labels, streak location, hand levels.
- [x] Build v0.36.0; full Node suite with time limits, browser QA, screenshots, archive CRC check, independent extraction and runtime-manifest hashes.

## Review focus
Old save timers; duplicate reward/purchase submissions; two same-card groups and mixed troop groups; damage/healing/shields; particles disabled without losing projectile/area gameplay cues; hot settings changes without cache leaks; archive integrity.

## Ledger
- Uploaded ZIP passes CRC; work is in a separate extraction, original remains untouched.
- Baseline npm test reached 635 reported tests without completion before the 200-second command timeout. Final suite will record bounded failures rather than claim a clean baseline.
- Ruling: execute directly without another approval round per user continuation and project handoff.

- Economy, levels, graphics, rendering and menu tasks completed. 24 new regressions passed.
- Full unbounded npm test: 943/943 passed in 260.879 seconds; earlier stress timeout resolved by allowing the existing long test to finish.
- Browser fixture: 16 checks passed, no uncaught errors; 390-pixel layout and native battle badges inspected.
- Fireball RGB/alpha cache separation and sample reuse retained. Experimental sprite-frame cache removed after worse measured p95.
- Release built with compact scene data; independent ZIP verification is recorded in the download-side verification JSON.
- Self-review only: no separate reviewer/subagent was available. Windows launchers retained byte-for-byte, not executed on Windows.
