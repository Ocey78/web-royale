# Web Royale v0.36.0 — rewards, level labels, Lightning Shop, graphics

Based on the supplied **Web-Royale-v0.35.0-Full-Build.zip**. This is a full build,
not a patch. The accepted arena camera/art, local save key, card mechanics,
ranked/non-ranked rules, and both offline BAT launchers are retained.

## Start or update

1. In the old build, export a save from Settings as a backup.
2. Close the old game tab and stop its offline launcher/server.
3. Extract the entire new ZIP into its own folder. Do not run from inside the ZIP.
4. Run **open offline.bat** in the extracted Web-Royale folder. Keep the launcher
   window open while playing.

Use the same browser and the same localhost address/port as before to access the
existing browser save. Changing the origin, browser profile, or clearing browser
data creates a separate save; the exported save can be imported instead.
The save key remains `web-royale-classic-v4`. No save-reset step is required.
If an old tab remains cached, close it and reopen the game from the new launcher.

The packaged `dist/` is ready to serve. Node, Unity, and a rebuild are not needed
for the existing Windows offline launcher. The Windows BAT launchers are unchanged
from v0.35.0 and were not executed on Windows during this update.

## Rewards and home screen

- **Free chest:** 10 minutes after each claim. Existing four-hour deadlines are
  migrated once to the corresponding ten-minute deadline, rather than restarting
  the wait or deleting progress.
- **Trophy bonuses:** every ranked victory gets a fresh per-match roll for its
  unlocked streak tiers. The existing +30 base and tier ranges are preserved:
  tiers at 3, 6 and 9 wins each add 10–15; later tiers every three wins add 5–15.
  Identical result receipts remain idempotent, so reopening a result does not
  reroll or award it again. A random roll can naturally repeat a previous value.
- **Crown chest:** no cooldown. At ten available crowns, its label reads exactly
  **Ready!**. Claiming consumes ten crowns; accumulated surplus remains available.
- **Home win streak:** visible only at three or more wins, directly under trophies.
  Removed the old streak explanation/banner above the chests. Battle result
  reward details are retained.

## Levels

- Visible troops/buildings and Princess Towers show their levels even before
  taking damage. The four cards in the battle hand also show their battle levels.
- For a multi-unit deployment with more than two survivors, untouched troops share
  one level box over their group. Damaged troops get their own level boxes while
  remaining untouched members keep the shared box.
- Damage to shields counts. Once damaged, a troop retains its own level box even
  if healed. At two or fewer survivors, each survivor has its normal individual
  level box. Separate deployments of the same card do not merge into one group.
- Group badges are presentation-only. Unit collision, damage, attacks, elixir,
  spell effects, and simulation timings are unchanged by this feature.

## Shops

The existing **Hour Shop** remains at twelve slots and its one-hour reset.
The new **Lightning Shop** has three independently purchasable card slots, any
arena-eligible rarity, and a ten-minute reset with seconds in the countdown.
Both shops use the existing gold-price/quantity rules. Lightning purchases are
tracked separately, cannot be claimed twice, and reject an expired displayed
rotation rather than buying a different card after reset. No currency sales added.

## Settings → Graphics

| Setting | Choices | Effect |
| --- | --- | --- |
| Textures | Low / Med / High | Cached native-sprite raster quality and display-density budget |
| Animations | Low / Med / High | 12 / 24 / 60 render/animation cadence, without changing simulation updates |
| Particles | Off / Spells only / Minimal | Decorative emitter/trail budgets; essential spell art and damage cues remain |
| Arena backgrounds | Low / Med / High | Background raster quality; Low is static, Med uses reduced animation cadence, High retains the original scene |

Settings save with the profile and apply immediately. Defaults are High textures,
High animations, Minimal particles, and High arena backgrounds. Lower quality does
not alter troop levels, targeting, pathfinding, collision, elixir, or damage.

## Fireball and general rendering performance

- Reuse native RGB tint rasters and apply opacity during drawing instead of
  rebuilding/re-reading pixel buffers for every alpha value.
- Cache deterministic particle samples and enforce emitter/frame particle limits
  before doing sampling or drawing work.
- Prepare common Fireball rendering caches during battle loading when Fireball is
  in an initial deck, yielding periodically rather than doing all work in one turn.
- Cache damage-filter scene node lists rather than rebuilding them for each troop
  every frame. Avoid rewriting unchanged chest DOM and text. Added independent
  background and animation rendering budgets through the graphics settings.

See **docs/verification-v036/VERIFICATION.md** for measured results, exact test
coverage, screenshots, reproduction commands, and platform limitations.

## Build/source layout

`src/`, `tools/`, `tests/`, editable asset metadata, and the ready-to-run `dist/`
are included. To avoid duplicating hundreds of megabytes, each identical runtime
PNG/WebP/WAV is stored once under `dist/`. Before a source build or test,
`tools/restore-source.cjs` verifies the release hashes and restores missing source
copies automatically. This is the same distribution scheme as the supplied build.

For development with Node 22+: `npm test`, then `npm run build`.
For a compact-scene build matching this release:
`node tools/build-web.js --compact-scenes`.
No font binaries or downloaded dependencies are included.
