# Web Royale 0.20.0 — Collection and Battle Fixes

## Requirements
Full offline package, no follow-up approval gates requested by user. Keep the historical 102-card/level-13 simulation, XP, bot leveling and save key. Keep wins-based battle chests, 9 card offers / 3 hours, hourly 3-emote and 3-skin shelves. No Collection inventory in the shop. Separate Decks and Collection; Collection has Cards, Emotes, Tower Skins and Magic Items subpages following the supplied screenshots. Eligible undiscovered cards say Not Found. Tower skins have working, distinct previews and actual equipped battle rendering; names only on shop tiles. Fix clipped HUD, full arena decoration framing, smooth radius-aware movement and Fireball/Rocket/Arrows/Log/Barbarian Barrel presentation.

## Investigation evidence
- Decks/Collection shares one scrollable DOM tree; selection only calls scrollTo.
- Latest packaged tower previews request `classic-king`, absent from the UI image manifest; no equipped-skin connection to drawTower.
- Timer pixel probe drawn into a larger canvas reaches y=274 while the shipped canvas is only 230 pixels high.
- Arena runs are cached in a fixed world crop [-30,-10,540,700], discarding decorations before display.
- Battle.move uses a second 18x32 route implementation rather than the radius-aware Navigator, discards hover/jump permission and makes unsmoothed grid turns.
- Projectile sprite rotation follows the ground ray rather than the airborne tangent. Arrows always enter from the upper-left independent of team. Rolling spells skip the authored launch stage.

## Implementation / verification
- [x] Add failing Node tests for shelf intervals, collection model, skin ownership, wins migration, straight river crossings, closest exposed tower, projectile pose and view-coordinate round-trip.
- [x] Implement dependency-free cosmetic/chest data and narrow model APIs; preserve saved owned IDs and clamp inputs. Magic items consume atomically and reject invalid targets.
- [x] Refactor existing app functions (no appended monkey-patch wrappers): separate views, subnav, per-view scroll memory, short labels, name-only preview tiles, active hourly refresh and stale-offer validation.
- [x] Connect same source tower renderer to skin previews and battle; no nonexistent assets, no screenshot pages as backdrops. Preserve custom skin names from the previous release.
- [x] Fix timer canvas extent, camera/input shared transform, static cache clipping and arena dependency checks. Test all fifteen arenas normal/overtime.
- [x] Use existing smoothed radius-aware navigation for ground units; ensure hovering/jumping cross water directly without crossing buildings. Correct fallback after tower destruction. Pin tests for speed, no spin, deterministic replay and target retention.
- [x] Fix projectile tangent/pose, symmetric spell launch and rolling landing animation; preserve one authoritative damage path and explicit three Arrows waves.
- [x] Build to new hashes/version, restore real audio from original build, run Node suite and packaged Chromium UI/render/interaction tests. Inspect screenshots; report parity limits honestly.
- [x] Package source plus dist, both BAT launchers, docs and checksum; omit duplicate source images and all font binaries. Verify archived release hashes and clean rebuild.
