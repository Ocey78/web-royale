# Clash Placement, Collision, Targeting, and Combat-Fidelity Design

## Goal

Upgrade Web Royale v0.15 so card placement, unit collision/pathing, placement previews, target warnings, projectile damage, and spell-hover feedback behave and look like Clash Royale rather than a debug-style browser recreation.

The historical game-data snapshot remains `3.2557.2`. Existing progression, local learning, 2v2, AppData AI storage, cheats, and arena/card-unlock rules remain intact unless this spec explicitly changes them.

## Reference behavior

The build must match the attached Clash Royale examples and native gameplay conventions:

- troop/building placement is based on visible Arena tiles rather than unrestricted pixel coordinates;
- buildings snap to legal tile-centered footprints and cannot overlap blocked geometry, Crown Towers, or other occupied placement cells;
- troop formations preserve source spacing while spawning from a legal anchor;
- when a troop/building card is held over the Arena, its card name and level appear above the ghost and a translucent white attack-range circle is shown when appropriate;
- spell placement shows the spell's translucent white affected-radius circle;
- valid ghosts use the native-like translucent blue/neutral presentation, while illegal placement is visibly rejected;
- troops that would select the pending unit as a target show the Clash-style warning marker above them;
- spell hover highlights units/buildings that would actually be affected by that spell;
- the warning/highlight forecast and actual post-deploy combat use the same targeting predicates and geometry;
- deployment delay does not make ordinary troops/buildings intangible: once present, they can be targeted and damaged while waiting to activate;
- underground/unspawned entities remain unavailable as targets until their source rules say they exist;
- units body-block one another using source collision radii rather than walking through occupied bodies;
- river crossing for ground units occurs through legal bridge/crossing geometry;
- unit movement and path selection must account for unit radius, target radius, blockers, bridges, buildings, and occupied bodies;
- Princess and other units using `CustomFirstProjectile` must deal damage from the correct projectile while any decorative projectile remains visual-only.

Official Supercell documentation describes arena squares as tiles that affect troop placement and range. The attached Cannon screenshot is the primary placement-visual reference; attached spell and exclamation-mark screenshots are the primary spell-hover and target-warning references.

## Arena tile model

Create a canonical 18 × 32 logical Arena grid. A tile stores enough information to answer placement and traversal questions without renderer-specific coordinates.

Each tile has flags for:

- ground;
- river/water;
- bridge/crossing;
- blocked/scenery;
- Crown Tower footprint;
- blue deployment zone;
- red deployment zone;
- temporarily extended deployment zone after Princess Tower destruction where the selected game rules permit it.

The model converts between tile coordinates and the existing battle coordinate system (`SX`, `SY`). The tile map must be the authority for placement legality. The renderer may derive visual overlays from it, but must never independently decide legality.

Placement for ordinary 1v1 uses the player's currently legal deployment territory. The existing “place anywhere” cheat bypasses team-zone restrictions but still respects immutable world geometry and entity footprints unless an explicit debug-only collision override is introduced later.

## Placement footprints and snapping

A placement request first converts the pointer to logical Arena coordinates and then selects a legal anchor.

Troops use their source collision radius to ensure their initial body does not overlap blocked world geometry or another solid body beyond the source-appropriate allowance. Buildings reserve a footprint derived from their source collision radius/size and snap to a stable tile-centered anchor so placement visually agrees with Clash Royale's grid.

Multi-unit cards use the card/entity source summon radius, summon width, full-lane flags, count, and stagger fields to produce the formation around the legal anchor. Individual formation members cannot be silently moved across the river or into blocked geometry; the formation-placement resolver must choose legal nearby positions or reject the anchor if the card cannot fit.

Spells remain continuously aimable but their center is still represented in Arena coordinates and their effect geometry is computed in tile units from the source radius.

## Shared placement forecast

Add a single `forecastPlacement()` result consumed by both the UI and actual deployment validation. It contains:

- snapped logical position and rendered position;
- legality + rejection reason;
- card/entity footprint;
- attack range and minimum range;
- spell/effect radius;
- predicted affected entities;
- enemies predicted to retarget to the pending troop/building;
- current target locks that would remain unchanged;
- whether the ghost is air/ground/building/spell;
- source deployment time;
- card display name and effective level.

The preview must never claim an enemy will retarget when the real target-selection rules would keep an existing lock. Air/ground restrictions, hidden/invisible state, buildings-only targeting, minimum range, sight range, and source target filters are shared with the live engine.

## Clash-style placement rendering

Replace debug text/rings with native-like presentation.

For troop/building placement:

- render a translucent source sprite/model ghost at the snapped anchor;
- display card name and `lvl.X` above the placement in game-style lettering;
- draw a soft translucent white circular range boundary when the card has a meaningful attack range;
- show footprint/anchor emphasis matching the supplied Cannon reference rather than a debug grid;
- display warning markers above enemies predicted to target the placement;
- retain elixir affordability/illegal-placement feedback without cluttering the Arena.

For spell placement:

- show name and level over the aim point;
- draw a translucent white spell-radius bubble;
- highlight every unit/building that the live spell resolver says would be hit;
- do not highlight immune/ineligible entities;
- area spells with lingering duration show the same initial hit footprint used by resolution;
- line/rolling spells use their actual path/width rather than pretending they are radial when source data says otherwise.

The renderer must use original exported UI/effect assets whenever a matching source asset exists. Custom canvas primitives are fallback-only for geometry not represented in the source assets.

## Target-warning marker

The exclamation warning is a gameplay forecast, not decoration. It appears over an enemy only when placing the pending non-spell unit/building would change that enemy's selected target under current battlefield state.

The forecast evaluates the same `canTarget`, sight, range, priority, buildings-only, existing target-lock, and lane/geometry rules used by live targeting. It must not reveal hidden hand information or future bot decisions.

The warning is removed immediately when the pointer moves to a position that no longer causes the retarget, the selected card changes, or placement ends.

## Collision and movement

Replace post-movement overlap cleanup as the primary body-collision strategy with swept movement checks.

For every ground movement step:

1. determine the desired path direction toward the current waypoint/target;
2. test the swept body against immutable Arena blockers and bridge constraints;
3. test against live solid units/buildings using both bodies' source collision radii;
4. shorten or slide the step when partially blocked;
5. update path/waypoint when persistent blockage requires rerouting;
6. preserve small source-like separation forces so formations can flow around each other without tunneling.

Air units ignore ground obstacles but retain air-body separation where applicable. Buildings never move except through explicit source mechanics.

Path planning uses the 18 × 32 tile graph and radius-aware passability. Ground units route to the appropriate bridge/crossing unless their source behavior explicitly bypasses the river. Buildings can pull/chase targets only according to the existing source target/sight fields.

Combat range uses edge-to-edge distance based on source collision radii, not center-to-center distance.

## Deployment-state combat

An entity that has appeared on the battlefield but still has `wait > 0`:

- has its actual collision body;
- can be targeted when source rules permit;
- can receive damage, buffs, knockback, or death effects;
- cannot move, attack, spawn periodic troops, or perform active abilities until deployment completes.

Entities with future `appearsAt`, underground travel, delayed projectile payloads, or source rules that make them absent remain non-targetable until present.

## Projectile correctness

Projectile selection is split into damaging projectile logic and optional visual/decorative exports.

When a source entity has `CustomFirstProjectile`, its first damaging shot uses that projectile's damage/flight definition. `Projectile` remains the subsequent/default shot unless source data says otherwise. Decorative projectile definitions with no damage may be rendered but cannot replace the damage-bearing projectile in the combat resolver.

Princess is an explicit regression case: her first source projectile must damage a valid troop/tower and the visual decoration cannot suppress that damage.

Other projectile regression coverage includes Musketeer, Archers, Spear Goblins, Cannon/Tower projectiles, Firecracker/area projectiles where present in the snapshot, and spell projectiles.

## Spell hit highlighting and resolution

The preview obtains affected entities from the same spell resolver geometry that deployment uses. Radial, line, rolling, chained, multi-wave, lingering, target-selected, and delivery-style spells each expose a forecast shape.

The UI highlights only entities that would actually be affected at the current cursor position. Highlight style should mimic native Clash Royale's brightened/outlined hit feedback from the supplied reference instead of placing debug labels on targets.

The combat engine continues to apply source damage, Crown Tower modifiers, buffs/debuffs, knockback, waves, spawn payloads, and durations from the historical data tables.

## Files/components

Expected responsibilities:

- `src/arena-grid.js` — 18 × 32 tile map, coordinate conversion, passability, deployment zones, tile/footprint queries.
- `src/placement.js` — snapping, building/troop footprints, formation fit, shared placement forecast, spell forecast geometry.
- `src/pathing.js` — radius-aware tile routing and swept movement helpers.
- `src/battle.js` — consume placement/pathing modules, deployment presence rules, collision integration, projectile selection, target forecast/live targeting consistency.
- `src/draw.js` — Clash-style ghost/range/spell-highlight/warning presentation only; no independent legality logic.
- `src/native.js` / `src/fx.js` — source warning/effect/highlight assets where available.
- `src/catalog.js` — projectile metadata helpers including first-vs-default damaging projectile.
- `tests/` — targeted engine, placement, pathing, projectile, browser visual-interaction, and regression coverage.

Existing modules may be extended instead of creating every file if a focused existing abstraction already owns that responsibility; do not duplicate logic solely to match this proposed filename list.

## Error handling and compatibility

The new grid/forecast modules must fail closed: unknown tile/footprint data rejects placement instead of spawning a unit in invalid geometry.

Existing saves remain compatible. No profile schema migration should be required for these gameplay/rendering changes.

The “place anywhere” practice cheat continues to bypass team deployment territory but not immutable map geometry/body overlap.

2v2 uses the same tile model and placement/target forecast for all four seats.

## Testing requirements

Tests must be written before each production behavior change and observed failing for the intended reason.

Minimum automated regression coverage:

- building placement snaps to legal tile center;
- river/water placement rejected for ordinary ground card;
- bridge tiles permit ground crossing;
- building footprint rejects Crown Tower overlap;
- two ground bodies cannot tunnel through one another during a large frame step;
- opposing bodies body-block while formations can still flow around blockers;
- flying units ignore ground blocker geometry;
- deployed/waiting troop can be damaged before activation;
- not-yet-appeared underground unit cannot be targeted;
- pending Cannon preview uses source range and native-like circular range visualization;
- target-warning forecast agrees with live target selection after placement;
- warning respects existing target lock and air/ground filters;
- spell hover highlight set equals spell resolver affected set;
- line/rolling spell forecast uses a line/path shape rather than radial-only approximation;
- Princess first shot damages the target using `CustomFirstProjectile`;
- subsequent Princess shots use the source-defined default projectile as appropriate;
- placement cheat bypasses zone restriction but not map/body collision;
- 2v2 placement/pathing uses the same legality/collision rules;
- all existing progression, chest-unlock, learning, AppData, and self-play tests remain green.

Browser QA must capture at least: Cannon placement, troop placement with target warning, radial spell highlighting, a live Princess shot dealing damage, crowded body collision at a bridge, and 2v2 placement.

## Fidelity boundary

The goal is to replicate the observable Clash Royale behavior shown in supplied/native references as closely as possible using the historical assets and source tables. The release report must separately list any placement, pathing, targeting, particle, or timing behavior that remains approximated. Passing tests is not sufficient evidence for claiming pixel/tick-identical native parity.
