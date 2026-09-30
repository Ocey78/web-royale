# Web Royale v0.46.0 Modes and Arena Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v0.46.0 with detailed custom locations, official-Touchdown visual treatment, Online Coming Soon, FFA removal, Six Card Deck, Uncapped Elixir, and reorganized Other Modes.

**Architecture:** Extend the existing declarative mode/deck registries and custom arena renderer. Preserve historical v0.45 behavior in a frozen legacy bundle before changing current rules. Keep visual scenery cached and separate from navigation/collision geometry.

**Tech Stack:** Browser JavaScript, Canvas 2D, CSS, Node test runner, headless Chromium verification.

**Spec:** `docs/superpowers/specs/2026-09-30-v046-modes-and-arena-refresh-design.md`

## Global Constraints
- Save key stays `web-royale-classic-v4`.
- Existing ranked progression and card ownership are unchanged.
- Custom-mode decks expose all eligible cards without unlocking them for ranked play.
- Current FFA is removed from UI/current engine but v0.45 FFA replay compatibility is preserved.
- Custom scenery must not change gameplay collision bounds.

## Review Focus
- Six-card cycle always has 4 hand + 2 queue and survives replay.
- Uncapped elixir never clips/NaNs UI or AI state at large values.
- Online nav fully replaces Clan entry without dead nav actions.
- Touchdown map has no towers/river and 3v3 field width remains playable.
- Detailed custom scenery does not introduce pathing obstacles or uncached per-frame redraws.

---

### Task 1: Freeze v0.45 and extend current mode registries
- [ ] Add regression tests for engine 0.46, v0.45 replay fallback, SixCardDeck, UncappedElixir, and FFA removal.
- [ ] Freeze current v0.45 modules as `legacy-core-v045.js` and wire replay fallback.
- [ ] Add mode/deck registry entries and six-card validation/cycle support.
- [ ] Add uncapped-elixir simulation behavior.
- [ ] Run focused tests.

### Task 2: Replace Clan UI and reorganize Other Modes
- [ ] Add source/UI tests for Online nav and new groups.
- [ ] Replace Clan nav with Online and add Coming Soon screen.
- [ ] Reorganize mode groups and remove FFA.
- [ ] Run focused tests.

### Task 3: Rebuild Touchdown arena visuals
- [ ] Add renderer tests for official-style stadium layers and widened 3v3 dimensions.
- [ ] Rework touchdown renderer using local arena/prop assets plus stadium-specific canvas details.
- [ ] Verify no tower/river geometry and correct 1v1/2v2/3v3 layouts.

### Task 4: Upgrade all custom arena themes
- [ ] Add tests that each arena reports distinct detailed layers/floor/backdrop theme metadata.
- [ ] Add source-arena-derived floor/backdrop decoration and theme-specific scenery.
- [ ] Verify cache reuse and pathing geometry unchanged.

### Task 5: Full regression/build/package
- [ ] Run new-feature tests and representative historical regressions.
- [ ] Run browser screenshots/checks for Online, Other Modes, Six Card, Uncapped, Touchdown and every custom map family.
- [ ] Build dist, package ZIP, CRC-check, clean-extract rebuild, and verify runtime hashes.
