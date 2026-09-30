# Web Royale v0.44.1 — custom arena clipping and rear-court polish

## Changes
- Team Rumble's castle board is taller (`top -8`, `bottom 40`) and its five King/Princess pairs are pushed farther toward their castle ends while preserving the symmetric arch.
- The enlarged rear space is real arena space, not CSS padding; tower foundations and navigation use the same updated coordinates.
- Custom King health presentation is detached from the tower sprite. The local gold King HP now sits above the King instead of through its artwork; custom enemy/player King bars use detached anchors as well. This applies to Bridge, 3v3 and 5v5 custom crowns.
- Added symmetrical rear-courtyard stonework, crests, benches/plinths and paving detail to the 3v3 and 5v5 maps so the extra top/bottom space is visually occupied without adding collision obstacles.
- Existing 5v5 King-only victory, synchronized King activation, 5+5 minute timing, Mirror fix, Play Again, movement clearance, Potato Mode, and reward/shop changes are retained.

## Verification
- New v0.44.1 geometry/presentation tests pass together with v0.44 Rumble/renderer regressions: 20/20.
- Generated v0.44.1 build boots in Chromium and the 390px castle screenshot keeps the full tower rows inside the arena viewport.
- The repository-wide test command was started and reached 650 passing tests with no observed failures before this environment's 300-second execution limit stopped the command. This is not claimed as a completed full-suite run.
- The broader v0.44.1 browser regression command was also started and passed its boot, real-battle, native castle asset, foundation, arch and 1280/390 viewport checks before the same execution limit. This is not claimed as a completed browser-suite run.
