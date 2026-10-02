# Web Royale Forks Implementation Plan

**Goal:** Deliver frozen Classic and independent Main/Custom projects with the requested shared fixes.

**Architecture:** Extract Classic unchanged from the verified v0.50.0 archive. Work on a separate Main source copy, then fork Custom after shared verification. Project metadata defines names, ports and save namespaces; a frozen v0.46 simulator preserves old replay results.

**Tech Stack:** Existing JavaScript Canvas renderer, Node build/tests, Windows PowerShell/C# offline launcher, standard ZIP.

**Spec:** `../specs/2026-10-01-project-forks.md`

## Constraints and review focus

Classic must match the delivered archive at every file. Main/Custom ports are 8081/8082. Check both teams' views, animation clocks, missing directional exports, frozen/stunned Tesla, all 3v3 themes/cameras/skins, large-body routes and actual Rocket damage. Check same-origin namespace isolation and historical replay digests. Online and user-created content remain future work.

## Tasks

- [x] Extract and freeze Classic; create separate Main source.
- [x] Reproduce direction errors; fix `src/native.js`; check authored 18/9/5-view counts, mirrored directions and animation clocks in unit tests and browser.
- [x] Reproduce Tesla loop; track `hideVisual` transitions in `src/battle.js`, map labeled frames in `src/native.js`; check combat timing, idle, freeze/stun and pause.
- [x] Add dedicated `princessXs` in `src/arena-layout.js`, align `src/custom-arena.js` foundations; prove separation with real impact tests, navigation and sprite bounds.
- [x] Wire `project.json` through build, app persistence and launcher; reproduce namespace collisions before fixing configurable store names.
- [x] Freeze v0.46 simulation; route old imports to it in `src/replay.js`; verify a genuine old Rocket replay and current spacing records.
- [x] Build Main, run complete tests and inspect actual built browser behavior.
- [x] Fork Custom, configure its own identity/saves/port, build and check its actual browser behavior.
- Package separate projects, CRC/hash-check every distribution, verify Classic unchanged and fresh ZIP extraction rebuilds identically. Final results are recorded in the separate outputs/Project-verification-v0.51.0.json report.
