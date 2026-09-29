# Fidelity update — v0.28.0

The deck tray, card-detail frame/elixir/progress artwork and bitmap text are sourced
from the supplied original assets. All 102 detail sheets are checked for layout fit.
Exact native screen identity is not established: the separately named native menu
reference captures were not included in the supplied files.

Movement verification follows source references into spawned, death-spawned, attached
and transformed entities. The movement report distinguishes mobile, flying, hovering,
river-jumping, stationary and attached entities and records deterministic route tests.
It verifies legal geometry and progress, not the inaccessible native pathfinder's exact
choice of route or timing. New per-card combat cases are listed in the evidence ledger.

Historical replays retain their original simulation; current live battles use the
corrected engine 0.28. The accepted camera, draw module, arena CSS and source scene and
presentation data retain their five original hashes. Native Cannon Cart facing is fixed
without changing original art. The prior tiebreak cadence remains a local choice.

Known open fidelity work includes precise Hunter pellet spread/random delay, Tornado's
native attraction curve/mass response, Tesla rise/hide timings, full interaction parity,
and official non-Classic tower skins. Existing local AI/social approximations remain.
The 102-card snapshot is retained rather than adding modern balance/card changes.

The historical notes below are superseded by this update where applicable.

# Fidelity update — v0.27.0

Implemented and tested in this update: a visible decisive tiebreak phase, deployment and
combat freeze during that phase, existing destruction/crown/result presentation, compatible
old replays, social menu scrolling/layout, and bounded recent result-receipt protection.
The accepted camera, arena renderer, arena CSS, native scene data and presentation data
remain byte-for-byte identical to the supplied baseline. The built browser check loads
all fifteen arena scenes in regulation and overtime.

The tiebreak has a one-second announcement hold and three-second equal absolute HP drain.
The weakest surviving tower decides the winner. This timing is locally selected; universal
native timing is unverified. Minima differing by less than 0.5 HP retain the prior immediate
draw behavior. No claim of complete 1:1 combat or visual parity is made.

Profile receipts retain 512 recent distinct match IDs and migrate IDs available in legacy
Battle Log/last-result fields. Older IDs already absent from those saves cannot be recovered.
The existing reward amounts and practice/queue exclusions are unchanged.

Original equippable tower skins beyond Classic, exact native interactions, full individual
AI economies, open-ended conversations and full historical mode coverage remain open.
No new balancing snapshot, recolored skins or remote services are added.

The following sections are historical and are superseded by this update where applicable.

# Fidelity and remaining differences — v0.26.0

## Current verified implementation scope

The accepted v0.25 arena camera, normal tower assembly and scene data are preserved.
The new fixes are shared bridge/bank geometry, cache invalidation for blocked routes,
nearest legal soft-grid adjustments and retargeting a distant melee chase. A committed
valid attack and source targeting categories still take priority. Regression tests are
not proof that every native combat interaction or pathfinding heuristic is identical.

Original magic-item atlas sprites replace the CSS item placeholders. Source rectangles,
checksums and extraction scripts are supplied. Available original UI icons are reused for
clan actions. The eight seeded clan emblem options are not the complete official badge
catalogue. Boat art composes three available original sprites; it is not the full recovered
native boat arena, camera or animation rig. Normal Trophy Road arena visuals are unaffected.

The social population is procedural: 4,000,000 stable IDs and 50,000 seeded clans, not
4,000,000 active worker processes. Chat is generated from context-aware templates, and
unobserved ladder/war activity is sampled rather than fully simulated as live matches.
NPC resources are not a complete individually simulated economy. Observed ladder results
and donations update bounded per-identity deltas. The world has no human accounts.

The main post-summer-2021 Clan Wars II loops are functional, with Level 9 fixed by the
user's rule. River presentation, simulated opponents' participation, UTC event reset,
local reward amounts, defense spawning cadence and some social-management details are
adaptations. Native network matchmaking, invitations to real accounts, full official clan
badge assets and unrestricted dialogue are not implemented. This is not a claim that all
features from every version of Clan Wars are identical. Obsolete 2020 midweek repairs are
intentionally absent, because the chosen July 2021 rules removed them.

Replays use versioned actual input streams, not a regenerated AI match. Old log entries
without recordings cannot be replayed. Recordings are stored separately in IndexedDB;
profile export does not include them. When storage is blocked, the fallback is session-only.
Detailed retention is bounded (40 replays, 200 friends, 4,000 observed identity deltas,
12 detailed clan records); base procedural identities stay stable beyond those caches.

Verification uses Node simulations and Chromium rendering of the packaged files. This
sandbox blocks normal top-level navigation; Chromium tests use the existing intercepted
same-origin fixture. Its storage fallback was exercised, along with profile JSON/repository
round-trips. Normal persistent IndexedDB on a real Windows origin and the Windows BAT
were not executed here. No independent reviewer agent was available: code review was inline,
followed by new regression tests. Full logs are supplied rather than inferred test results.

Everything below is historical documentation, superseded where the current rules differ.

# Fidelity and remaining differences — v0.25.0

## v0.25 verified scope

The supplied reference determines the portrait battle frame, camera, original
source-art scale and tower pivots. Terrain registration and before/after source
assembly measurements are in `docs/qa/v025/`. These are landmark measurements,
not proof of all-pixel equivalence. Only the P.E.K.K.A arena was supplied as the
new precise composition reference. The other fourteen arenas use the same world
camera and were checked for complete referenced scene loading in both phases.

The current battle frame is 540 × 1172; menu framing remains 540 × 960. Rendering
and pointer conversion share the measured transform. Princess attachment height
uses the source 2200 field, not the older doubled offset. The King follows the
source `king_dummy` layer and activation timeline. The ground shadow projection
is an approximation using source silhouette/parameters, not a recovered original
shadow shader. Source card/tower HP statistics were not changed to force the
numbers in a screenshot from a different balance snapshot.

Full movement sweeps, contact-normal mass separation, committed target retention,
knockback/preload reset, contact-edge dash endpoints and source-enabled river
jump elevation are now regression-tested. Original pathfinder cost functions,
collision solver convergence, every special ability interaction, particle blend
modes and native server scheduling remain unverified. This is a browser
implementation, not the native game executable. No claim of all-card tick-
identity is made. All 206 imported emote clips and the custom progression rules
remain included; non-default original tower skins are not added by this release.

The sections below document inherited systems and earlier releases. Where an old
section describes lateral contact bias or a 9:16 battlefield, the v0.25 behavior
above supersedes it.

## v0.18 additions

- Completed matches use the decoded original `ui_battle_end` scene for result boards/crown presentation rather than the old CSS result modal.
- Tower crown awards use the source crown touchdown clips and crown sound cues.
- Non-Mirror spells are regression-checked for a visible source animation path; Fireball specifically uses the moving source projectile, trail emitter, gravity arc, and impact graph.
- Troop soft separation is now time-step scaled to prevent high-frequency orbit/spin feedback while preserving spawn push and hard building collision.


## Learning, team mode and new quality-of-life scope

The shared TD(lambda) action-value learner has real, persisted parameter updates.
It uses a tactical candidate generator; it is not a neural network or an unlimited
strategy search. A 60-match training / 32-match held-out experiment scored 18-14
against the neutral tactical prior. This small experiment is not proof of a reliable
strength increase. Learning can regress. Local models begin at neutral weights;
there is no silently substituted "proven" pretrained model or global learning pool.
Data capture, retention, failure cases and the actual reward formula are in LEARNING.md.

2v2 is local human+AI versus two AIs. Four decks/elixir/cycles and ownership are
independent, with shared crowns/towers and the source team elixir timeline. The
compound King is rendered by composing two original king assemblies, not a claimed
recovered native 2v2 assembly. Shared collision footprint, tower-level averaging,
spawn geometry, elixir-golem refund allocation and all special interactions have
not been compared tick-for-tick against native 2v2. Party reward amounts retain
the project's practice economy, not an exact historical server economy.

Deployment is no longer immunity. Delayed underground/formation appearance remains
separate. Radius-inflated half-tile A* and smoothed swept waypoints replace the crude
bridge routing; original pathfinder/collision math is not embedded. Building shapes
are simplified discs; some pushback/dash and river-jump presentation remains custom.
The route finder does not provide proof of all-card native pathing or crowded-map parity.

Range and aggro previews use the current engine state and locked targets; they do
not look into future bot decisions, opponent hands or future placements. Multi-unit
placement previews now use the same formation members and offsets as live deployment,
including staggered appearance timing. Highlighted potential targets are not a promise
that they remain in range when deployment ends.
Only the named quality-of-life features are implemented. This is not every native
social, trading, replay, account, seasonal or networking feature.

## Original assets and data

The game uses the uploaded 3.2557.2 card statistics; original card portraits,
character/arena scenes, high-resolution textures, directional/team animation clips,
health/shield bars, tower numbers, loading artwork and rendered game lettering.
There are no distributed font programs. Editable controls and unsupported Unicode
retain browser-font fallbacks. The native font rasterizer is not reproduced.

This update imports the original effects and particle_emitters tables, selected
scene exports, trophy_road and trophy_road_season, and the two-index emote lookup.
Original token, wildcard and specialty-chest icons are rasterized from source SC
exports, not recreated icons or screenshot overlays. Road tile cropping removes
transparent export margins; original visible pixels are retained. Controls remain
live and update the local save, rather than displaying a static reference picture.

## Progression rules actually enforced

Arena selection is derived from current trophies; read-only road previews cannot
select an arena. Regular and practice matches use the trophy-selected arena.
Arena gates protect ordinary losses; 5,000 is the configured league floor. Existing
imported progress is preserved, not silently erased. Rewards record a high-water
mark and once-per-save claims. Chest card pools are evaluated when a chest opens from the highest arena the player
has reached; the arena in which a chest was earned does not freeze its card pool.
Every chest path filters card eligibility independently of the active deck or visual
scene. Reaching an arena makes its cards discoverable in chests, while player deck use
still requires at least one discovered copy. Bots use arena legality without chest ownership.

## Road data provenance

The source APK reward table predates the requested June-2021 expansion. `road-data.json`
marks every row as original, remapped to the requested gate, local extension, or a
shifted source seasonal row. It contains 109 steps: 68 original regular rows, 14
explicit additional-arena steps using source reward types, and 27 shifted source
seasonal rows. Do not call this a recovered exact June-2021 server reward schedule.
The original snapshot unlock assignments are retained, not invented later changes.

Reward choice, locked/claimed states and persistence are implemented. Two emotes
are resolved by BOTH CSV indices (Emote58 and Emote71), not mistaken for default
King emotes with the same low index. Token balances are stored; actual trading is
not implemented. Chests use simplified practice contents/odds. Legendary King's
chests honor the source guaranteed-legendary flag, but drafting and Lightning
rerolls are not implemented. There are no online seasons or automatic league resets.

## Rendering and simulation boundaries

The original effect graphs now supply trails, impacts, ground spell symbols, source
particle sprites, deployment and muzzle effects, and Tesla/Electro Wizard/Inferno
beams. Particles are deterministic with an independent visual ID, lifetime/fading,
rotation, sampled velocity, interpreted height/gravity, and bounded budgets.
Parabolic projectile presentation preserves combat positions and event timing.
Three Arrows volleys use the existing three impact times; rolling spells remain
at ground level. Short one-shot clips stop at their source duration.

Remaining differences include the emitter coordinate conversion, simplified bounce
and inertia, additive/filter blend modes, source sound scheduling, some targeting
beam anchoring, residual fallback effects, and special effect state machines.
Seven literal source references in the extracted dependency scan do not resolve;
see fx-extraction.json. Some occur on rows whose actual graphic is instead supplied
by the particle emitter. The seven exercised spell-effect families render with no
missing symbols, but this is not proof for every effect and matchup in the game.

Native game simulation is not running. Collision, pathfinding, deployment, damage
orchestration, bot decisions and UI layout are browser reimplementations. Source
frames and numerical tables alone do not prove pixel-/tick-identical parity.
The older home and 9:16 menus are retained; the battlefield now follows the
reference portrait aspect. The source pack,
old home, and expanded ladder are not one historically identical released client.

The 102-card roster, original baseline statistics, tactical bot, cheats and fifteen
renderable scenes (Training Camp plus fourteen arenas) are retained. No server,
account service, official-game account integration or real transactions exist.

## v0.12.0 correction boundary

The Rage bottle lifecycle, Cannon rotation-pose selection, two King-barrel attack clocks, and source 2v2 timeline interpretation are fixed and regression-tested. This does not establish exact native matchmaking, shared King structure geometry, all card-interaction details, particle composition or movement parity. The card-count bar uses original source fill/arrow images with browser-driven counts; the Max visual reuses the full green fill without an upgrade arrow. Settings layout is a functional recreation, not a native menu scene. The disk AI adapter exists only in the Windows offline opener; public websites cannot use that local API. Resource use at 5,000 actual active full matches has not been measured.

## v0.16 placement / collision / targeting fidelity

- Placement legality and ground routing now share one logical 18×32 arena tile map.
- Troops and buildings snap through the same placement engine used by live deployment; the renderer no longer guesses separate legal positions.
- Ground movement uses source collision radii and radius-aware bridge routing. Buildings/towers remain hard blockers; troop-to-troop contact is resolved separately as soft mass-weighted separation so moving units can slide/run past each other. Air units remain independent of ground terrain.
- Present troops/buildings can be targeted and damaged during deploy delay. Future-spawn and underground entities remain absent until their appearance time.
- Placement previews use the live target selector for retarget warnings and the live spell-hit predicate for spell highlighting.
- Non-radial rolling/line spells forecast their swept width/path rather than pretending to be circular.
- Princess first-shot damage now follows `CustomFirstProjectile`; decorative projectile data is not used as the damage source.
- The targeting warning is rendered as the floating outlined exclamation mark from the supplied native reference rather than the previous debug badge.

Remaining approximation: Web Royale is still not the original Supercell server simulation. Exact native tie-breaking, undocumented route costs, hidden collision constants, and some effect timing may differ even when the same source tables/assets are used.


## v0.17 soft contact / formations / Fireball fidelity

- Troops are no longer inserted into the hard path-obstacle set. Buildings and towers remain hard obstacles; ground troops may continue moving through contact and are separated after movement using source collision radius and source mass. That release used a lateral bias for head-on contact; v0.25 replaces it with contact-normal correction to avoid tangential orbit feedback.
- Visible newly deployed troops participate in soft separation immediately, reproducing spawn-push behavior during deploy delay. Staggered members that have not appeared yet remain non-collidable until their appearance time.
- Multi-unit cards use one shared formation resolver for both placement preview and live deployment. The resolver supports horizontal pairs, triangle groups, five-unit star/ring formations, arena-spanning Royal Recruits, Skeleton Army scatter, and mixed primary/secondary formations such as Goblin Gang and Rascals. Source `SummonRadius`, `SummonNumber`, `SummonDeployDelay`, secondary-unit fields and team mirroring drive the result where available.
- Fireball is presented as a moving source projectile rather than a delayed impact marker. The renderer uses the original animated projectile export, aligns the source Fireball emitter/trail to the projectile's parabolic visual path, and plays the full source `Fireball_explosion` graph at impact. Projectile history is retained only for rendering and does not alter combat coordinates.

The shipped data supplies collision radius, mass, movement speed, summon radius/count/delay and effect graphs, but it does not fully expose Supercell's native collision-solver procedure or every authored formation offset. The soft-separation solver and several inferred formation geometries therefore remain clean-room approximations even though preview and deployment now share the same implementation.
