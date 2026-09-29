# Crown Road and custom battle modes implementation plan

**Goal:** Ship the user's approved Crown Road, congestion fixes, 3v3 and Bridge modes,
all-mode training, and Treasure Chest in a full v0.41.0 browser/offline build.

**Architecture:** Keep normal arenas and historical simulations intact. Add an immutable
arena-layout module, threaded through placement, sweep and navigation for new maps.
Generalize current per-seat battle state to six seats. Separate Crown Road entitlement
logic from rendering. All entitlements commit through normalized save state exactly once.

**Spec:** User requirements in the current conversation, including the two arena images
and latest 3v3 ownership/elixir rules, approved by 'build all those changes'.

**Constraints:** Keep the existing save key, Hog Mountain renderer cache, shop prices,
stacking streak rewards, deck library, classic game art, old replays and launchers.
No remote deployment or real purchases. Never reduce physics accuracy for performance.

## Decisions resolving unspecified details
- Crown Level starts at 1; level = 1 + floor(lifetime crowns / 10). Rewards start at 10
  crowns (level 2). Old saves use max(saved lifetime, earned crowns, spent crown-chest
  crowns, retained non-practice history crowns); never sum overlapping counters.
- Rewards combine rapidly scaling gold and wild cards; gems at 5-level milestones,
  premium chests at 10, Books at 25. Claimable on migration, not silently auto-collected.
- Treasure weight 4, Gem 5, Magic 5, Gold 10, Silver 36. Treasure is 20% rarer than Gem,
  grants 10,000–100,000 integer gold; five subsequent battle wins unlock it.
- 3v3 ends immediately only when all three enemy Kings are destroyed. At timeout,
  normal crown advantage / overtime rules apply (six tower crowns possible).
- Each side independently shuffles its three player-to-tower assignments. Ownership
  follows the seat, not left/center/right. Lost King stops only passive generation.
- Card-generated elixir still works. In this custom 3v3 rule, an owner's Elixir Golem
  death payout credits that owner (including descendants) as requested, not the enemies.
  Other modes retain the original opponent-payout rule. The ten-elixir cap remains.
- Both modes are non-ranked, level 9, support rewards and replay. Sandbox remains a
  free-placement test environment, not automated reward self-play.

## Tasks and per-task verification
- [x] 1. Freeze v0.38 replay interpreter from current engine. Add layout registry and
  geometry hooks; verify classic behavior remains unchanged and new crossing geometry.
- [x] 2. Six-seat 3v3, shuffled ownership, one-lane Bridge, passive/pump/golem rules,
  per-owner gold King health. Test seating permutations, elixir, crowns and victory.
- [x] 3. Diagnose stuck routes; add bounded lateral yielding and bridge recovery. Test
  unopposed heavy bodies and blocked packs, terrain compliance and deterministic replays.
- [x] 4. Crown progression, migration, escalating deterministic rewards, compact claim
  ranges, yellow header indicator, Crown Road UI. Test migration, duplicate and future
  claims, chest independence, level boundaries and high-level reward growth.
- [x] 5. Treasure Chest drop/receipt and exact palette variant of wooden source scene.
  Test weight parity, frequency, reward bounds, save persistence and opening exports.
- [x] 6. Custom cached arena rendering, map-specific placement overlays, six-seat HUD,
  mode menu and result crown counts. Render at 390px and 320px as well as desktop.
- [x] 7. All-mode training selector and worker factory; geometry-aware bot placement,
  mode-keyed learning experience and six-seat replay validation/reproduction. Test
  every selectable mode completes real simulations and emits learned updates.
- [x] 8. Run full suite and browser checks. Audit artifact changes. Build complete ZIP,
  integrity and runtime hashes; rebuild extracted archive; document limits and results.

## Review focus
- Save re-normalization must never grant crowns/rewards again.
- Six seats must be independent even after a King is destroyed; no owner-vs-team mixups.
- Buildings, terrain and all three bridge lanes must use the same geometry.
- No new mode may silently become Default in training, replay or reward history.
- Mobile UI must fit three reward boxes, six crowns and three King towers cleanly.

Ruling: Keep Gem and Magical odds at 1/12; add Treasure at 1/15 by reducing the Silver share only. This avoids an unrelated nerf to existing rare chest odds.

Review ruling: custom arenas obey both texture and arena-background quality; cache identity includes raster density. Native props come only from the selected custom theme.

Final review: all eight tasks implemented; 1,089 automated tests, 229 browser checks and 12 mode-worker matches passed. Actual ZIP integrity and extraction rebuild are recorded in the external release verification JSON.
