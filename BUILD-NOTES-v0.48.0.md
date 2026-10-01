# Web Royale v0.48.0 — five-tier graphics and Safari first-launch defaults

## Launch / update

This is a complete build based on v0.47.0. Export your save first, close the old
game tab/launcher, extract the full ZIP, then run `Web-Royale/open offline.bat`.
The browser save key remains `web-royale-classic-v4`. Existing progression,
decks, shops, maps, modes, replays and v0.47 UI polish are retained.

## Five-tier graphics

All four saved graphics categories now use the same five quality names:

- **Low**
- **Medium**
- **Good**
- **High**
- **Max**

The previous **High** preset is migrated to **Good**, so existing saves retain
the same effective quality instead of unexpectedly jumping to the new expensive
tiers.

### Textures / source sprite-model rendering

- Low: 0.5x source raster scale
- Medium: 0.75x
- Good: 1x (the previous High behavior)
- High: requests **4x** supersampled source rasterization
- Max: requests **8x** supersampled source rasterization

The native scene renderer re-rasterizes the original source geometry, texture
mapping, models, sprite exports and animation frames at the requested density.
No gameplay geometry, frame sequencing, source UVs, palette data or animation
rules are changed. Oversized arena/background surfaces retain safety bounds so
Max cannot allocate a single canvas beyond practical browser limits.

This intentionally uses faithful source supersampling rather than a generative
AI repaint. A neural image model would invent or change pixels, conflicting with
the requirement to leave the source artwork/animations unchanged. High and Max
therefore increase render/raster resolution without redesigning any asset.

### Animations

- Low: 12 FPS presentation sampling
- Medium: 24 FPS
- Good: 60 FPS (previous High behavior)
- High: 90 FPS
- Max: 120 FPS

Combat simulation tick rate and timing are unchanged; this affects presentation
sampling only.

### Particles

- Low: decorative particles off
- Medium: spell-focused/light particle budget
- Good: previous Minimal behavior
- High: previous Full-class budget
- Max: expanded decorative budget

Core damage/effect logic remains independent of particle visibility.

### Arena backgrounds

- Low: 0.75x cache scale, static ambience
- Medium: 1.25x
- Good: 2x (previous High behavior)
- High: requests 4x cached arena rendering
- Max: requests 8x cached arena rendering

Large custom/standard arena caches are bounded by browser canvas and memory
limits. Stationary custom scenery remains cached separately from animation.

## Safari first-launch defaults

On a truly new save, Safari is detected from its user agent and starts with:

- Textures: Medium
- Animations: Medium
- Particles: Medium
- Arena backgrounds: Medium

The detection excludes Chromium, Chrome on iOS, Firefox on iOS, Edge on iOS,
Opera on iOS, Samsung Browser and Android Chrome-like user agents.

This applies **only when no Web Royale save exists yet**. Existing Safari users
keep their saved graphics settings. Non-Safari fresh profiles start at Good.

## Save migration

Profile version is now 14. v13 and older graphics values migrate as follows:

- old `high` Textures / Animations / Arena backgrounds -> `good`
- old `off` particles -> `low`
- old `spells-only` -> `med`
- old `minimal` -> `good`
- old `full` -> `high`

After migration, reloading the v14 save does not migrate the new High/Max tiers
again.

## Performance safeguards

High/Max are intentionally expensive desktop-quality options. Scene rasterizers,
custom arena caches and standard arena caches enforce bounded maximum dimensions
and pixel budgets. On the existing mobile-performance path the battle canvas
retains its conservative density/FPS cap; Safari's automatic Medium first-launch
preset avoids selecting High/Max by default.

Potato Mode is unchanged and still overrides the detailed renderer without
changing the user's stored quality-tier selections.

## Verification

- v0.48 graphics feature tests: 6 passed.
- Historical regression suite (excluding the known long sustained 102-card stress
  case): **1,217 passed**, 0 failed/skipped/cancelled across four bounded runs.
- Event-timeline stress test: 1 passed.
- Generated-browser graphics/defaults verification: **14 checks passed**, including
  Safari all-Medium persistence and a separate non-Safari fresh-profile boot.
- Historical graphics assertions were updated only where the new tier names are
  the requested behavior; the underlying legacy effective-quality behavior is
  still covered.

The sustained all-102-card stress test is not counted here because prior release
verification already established that it can exceed this environment's bounded
single-command execution window. No physical iPhone/Safari or Windows launcher
execution was performed in this container.
