# Web Royale Main v0.52.0

Main imports the modern **16.402.2** client snapshot from the user-supplied Clash
Royale XAPK. The package's own fingerprint determines that version. This is a
local browser game using recovered source data and art; the native game engine
and Supercell's online services are not included.

## Modern content and progression

- **123 base-card catalogue entries**, with original card portraits and imported
  client rule/stat records.
- **67 form entries:** 17 Heroes, 42 Evolutions and 8 Champions. Decks have
  Evolution, Hero/Champion and Wild slots; supported forms use source cycle and
  ability data. Unlocks and inventory are local practice progression.
- **32 Trophy Road arenas** with their original location mappings, source field
  and decoration scenes, and original arena icons.
- **217 imported Trophy Road reward steps**, on a road capped at 14,000 trophies.
- Cards and Tower Power support levels through **16**. Account XP supports
  levels through **90**; account level and Tower Power are separate values.
- Tower Princess, Cannoneer, Dagger Duchess and Royal Chef have separate original
  portraits, source spawn groups and defender artwork.

These are imported catalogue totals, not a promise that every entry has complete
battle behavior. A card, form or ability whose required behavior is incomplete
is **Unavailable**. Available choices run the browser's source-data interpreter;
they have not been proven identical to every native interaction. The final
per-entry availability audit is separate from the content counts above.

The final dependency audit recognizes **121/123 base cards** and **51/67 forms**:
**30/42 Evolutions**, **13/17 Heroes** and **8/8 Champions**. Two base cards and
16 forms remain unavailable. These counts establish recognized interpreter
dependencies, not native-client gameplay or visual parity. The detailed report
is [`docs/modern-source/source-behavior-coverage.md`](docs/modern-source/source-behavior-coverage.md).

The maximum-arena AI pool contains **10,989 unique eight-card decks**, including
**179 native/reference seed lineups** and **10,810 generated variants** across
11 families. Selection uses local data and excludes unavailable cards. These
lineups do not establish current competitive strength or native matchmaking.

## Original artwork and motion

The live 3D renderer covers **36 actual source actors**, including Hero bodies,
their authored auxiliary forms, Ronin, Minion Giant and the broken Tombstone
visual. The converted models preserve original geometry, joints, skin weights,
diffuse textures, complete source motion frames, prefab transforms, mount-bone
attachments and animation action markers. Models load on demand. Higher graphics
quality increases their rendered detail while keeping the same battle scale.
Knight retains a lazy source-atlas fallback. New 3D artwork requires browser
WebGL support.

The source Tombstone debris idle is a single authored pose and stays still. Two
Tombstone prefabs are geometry-free visual controllers; the renderer uses their
actual authored visual actors rather than replacing them with portraits.

**Shark Tank, Sandcastle and Fortress** add three complete original seasonal
tower styles alongside the existing tower options. Each retains both teams,
Princess base/top layers and the 98-frame King activation assembly. The game's
cosmetic prices and ownership are local settings.

The 32 arena fields retain source floor, background and foreground decoration
layers. Source animation is used where authored. Five source decoration rows
have blank initial coordinates and are retained as unresolved metadata; no
position has been invented for them.

Source versions, hashes, conversions and rendering limits are documented in
`assets/modern-heroes/README.md`, `assets/modern-heroes/manifest.json`, native scene
provenance, and `assets/tower-skins/seasonal.json`.

## Remaining differences

**Complete 1:1 Clash Royale fidelity remains unfinished.** The browser controls
movement, targeting, collisions, ability execution, AI and match scheduling.
Source-table imports and successful regressions establish specific behavior,
not universal native-engine equivalence. Some modern action controllers remain
unavailable, and the complete native animation state machine is not reproduced.

Source meshes, motion and team masks are retained, but the renderer uses local
team-color uniforms and Three.js lighting. The proprietary material shader,
some material overrides, normal maps and prefab particles are not reproduced.
Original artwork does not establish all-pixel equivalence with the native game.

Trophy Road rewards and unlocks are local practice systems. Client tables do not
recover all server-side reward decisions, live economy, offers or event schedules.
Opponents and clans are simulated. There is no live online matchmaking, human
account service, Supercell ID connection, payment processing or cloud account sync.

## Saves, replays and opening the game

Extract the complete Main package, close an older launcher, and run
`open offline.bat`. Main opens at `http://127.0.0.1:8081` and uses its own browser
profile, learning archive and replay storage. Offline AI files use
`%LOCALAPPDATA%\WebRoyaleMain\AI`. Export a save before changing browser or origin.

Historical replay simulations remain packaged separately from the modern live
engine. Main's content and save namespaces are separate from Classic and Custom;
installing Main does not turn either project into the modern catalogue.

## Release verification

Art verification covers all 36 live 3D actors on both teams through idle, run and
attack samples in eight headings, all 32 source arena fields, and both teams of
the three complete seasonal tower assemblies. Static source poses are checked
without requiring invented motion. Runtime and packaged-game checks are recorded
separately from these art checks.

The final complete suite passed **1,482 tests, zero failures**. Eleven additional
source-restoration and publication checks passed, including exact recovery of
the 124,542,186-byte native source file from its 18,605,837-byte lossless archive.
Corrupt archives and false checksums are rejected before any files are restored.

The exact built browser game passed 384 machine-direction drawings, 22 animation
clock probes, six arena/HUD compositions, stable Tesla behavior and replays from
engines 0.46, 0.51 and 0.52. Its source data is 123 cards and 67 forms. Separate
menu checks exercised form selection, unlock inventory, modern Trophy Road and
Hero Knight's successful shield ability. No browser errors or unresolved assets
were found. Offline opponents now match throughout the 14,000-trophy range.

The built website contains 1,859 files totaling **914,540,646 bytes**. Its release
manifest SHA-256 is `7b4c8bb2a98044f1a02a71bc6469b98618196f85534050e859531571ab286cd1`.
The GitHub publication process preserves and verifies every generated Git blob
before upload. Publication status is recorded separately from these local checks.
