# Web Royale v0.42.0 — modes, custom arenas, map selection and Potato Mode

## Start / update

This is the complete game, editable source, tests, original local assets and the
ready-to-serve `dist/`, based on the supplied v0.41.0 full build. It is not a patch.
Export your save first, close the old game and offline launcher, extract the
entire archive and run `Web-Royale/open offline.bat`. Continue using the same
browser/profile and localhost address for your existing browser save. The save
key is still `web-royale-classic-v4`. Do not clear website data to force an update.

For a hosted website, deploy the new contents of `Web-Royale/dist/` through its
existing editor/host. This ZIP has not been deployed to the live Site. Node 22+
is needed for development/rebuilding, not for the retained Windows launcher.

## King Level button / Crown Road

The menu's top-left level badge now displays **King Level** and its King XP
progress, including MAX at King Level 13. It still opens Crown Road and retains
the yellow outline while earned Crown Road rewards remain unclaimed. Crown Level
and lifetime crown progress remain visible inside Crown Road. The player name
still opens the profile. Neither progression system is reset or combined.

## 3v3 timing

Regulation is **300 seconds**, followed by the existing **120-second overtime**.
At the start the clock reads 5:00. Passive regeneration is 1x for the first 120
seconds, 1.5x at 3:00 remaining, and 2x at 1:00 remaining. Overtime starts at 2x;
its final minute uses the existing 3x profile. These are actual regeneration
changes, not just labels.

The earlier 3v3 rules remain: independent six-player banks, randomized tower
ownership, gold health for the local King, stored elixir retained after its King
falls, and passive income stopped only for that King's owner. Collector and
custom 3v3 Elixir Golem grants remain available. The 20-cap modifier is a separate
mode; ordinary 3v3 still has a ten-elixir capacity.

## Three additional playable modes

### 12 Card Deck

A separate saved twelve-slot deck builder. Four cards remain visible in the hand,
with eight waiting in the cycle. Deck edits auto-save and do not alter regular
battle decks, the Four Card Deck, or the One Shot deck. The Play/Battle control is
disabled with an explanation when the player lacks twelve unlocked cards.

### 20 Elixir

Increases the bank capacity to **20** for both players. Starting elixir stays at
**6**, and regeneration follows the normal 1v1 timeline, not a doubled income
rate. Passive income, Elixir Collectors, other grants, overflow tracking and AI
estimates respect the cap. The HUD shows `Max 20`, has twenty bar divisions, and
an 18-elixir bank fills 90% of the meter.

### One Shot

Sudden death from the beginning; all towers have **1 current HP and 1 maximum HP**.
The first tower destroyed wins. Uses the existing Sudden Death timing/elixir
profile (2x initially, then 3x), a separate saved eight-slot builder, and only
unlocked eligible cards. **All spells, Mortar and X-Bow are prohibited** for both
sides, including the real deployment entrypoint; this is not only a UI filter.
Incomplete eligible collections see a disabled Battle control and an explanation.

These three modes are in Other Modes, use Level 9 cards/towers, and retain normal
non-ranked battle rewards without advancing or breaking ranked trophy streaks.
They are also available in the Learning Center. All fifteen selectable match
modes completed an actual worker-driven self-play match and produced learning
updates in verification. The worker time guard now follows the selected mode's
timeline so a five-minute 3v3 game is not stopped at the old 1v1 guard.

## Custom-arena and interface polish

Frozen Causeway/Bridge is rebuilt with ridged and bevelled gold framing, an
elongated purple-stone spine, triangular snow inlays, a recessed crossbeam,
ornamental corner/center details, snow caps, original ice props, layered cliffs,
and drifting snow. The geometry remains a single valid ground route.

Royal Bastion/3v3 adds stone rails, lane inlays, tower foundations, original
statues/stands, masonry surroundings, waving banners and torch animation. A
uniformly wider 3v3 camera makes the exterior scenery visible. Rendering and
pointer conversion share that camera; battlefield coordinates, collision radii
and bridge paths are unchanged. Classic arena cameras remain unchanged.

Both custom maps cache their stationary terrain/props and their raised foreground
separately. Ambient movement does not rebuild that scenery every frame. Background
and texture quality settings affect cache resolution; Low arena backgrounds stop
ambient animation. These are custom assembled arenas, not pixel-identical official
arena assets.

The new mode builders use framed panels, consistent card spacing, cost badges,
search, saved-state labels and matching native-style buttons. Other Modes cards
have more consistent heading, body, spacing and button treatment. The regular
card-border correction from v0.39.1 is preserved.

The Daily Shop's free Gold Chest and Gem Chest retain names, artwork and
Free/Collected controls but no longer show their visible reward-range sentences.
Their reward amounts and the Wild Card offer's quantity text are unchanged.

## Map selection

Sandbox has a selector for **15 standard arenas and both custom layouts**. Changing
maps clears/resets the sandbox battlefield and rebuilds its towers for the correct
layout, while preserving the paused state, selected card level and tower settings.
The chosen map is saved. Touch placement was checked after switching between 3v3,
Bridge and a standard arena, in the actual compact/coarse-pointer composition.

Regular casual modes select a random standard arena per battle. The map choice
uses a separate seed calculation, not the battle simulation's RNG. Trophy Road
keeps its trophy-based arena. 3v3 and Bridge keep their purpose-built maps; a random
cosmetic map cannot give them incompatible navigation geometry. New replays record
the chosen arena so playback does not choose another background.

## Potato Mode

A saved on/off graphics override. When enabled, battles render troops as circles,
buildings/towers as rectangles, and attacks/projectiles as lines and dots. Short
unit identifiers, health, shields, levels, spell areas and placement feedback stay
visible. The local 3v3 King's HP stays gold. Detailed native battlefield sprites,
scenery rendering and decorative particle emitters are bypassed.

Menu/hand card portraits and the next-card portrait use cached **40-pixel-wide**
textures. The battle surface also uses a low pixel density. The selected texture,
animation, particle and arena-background tiers are retained and restored when
Potato Mode is disabled; it does not overwrite them or change combat simulation.
This is a rendering optimization, not a promised frame rate on every device.

## Save / replay / asset preservation

Existing decks, collection, Crown Road claims, rewards, shop rotations/prices,
chest behavior, movement fixes and Hog Mountain caching remain. The new deck
fields and Sandbox map are compatible additions to the current save format.

New replays use simulation tag **0.42**. The exact earlier v0.41 engine is frozen
as `src/legacy-core-v041.js` so older 3v3 replays keep the earlier 180-second
regulation and card-cycle behavior. Earlier frozen engines are retained too.
Original card, troop, spell, tower and UI artwork/audio are not replaced.

## Verification

- `npm test`: **1,110 passed, zero failed/skipped/cancelled**.
- Generated browser build: **81 new-feature checks + 190 prior-feature regression
  checks + 18 touch/compact-layout checks = 289**, with zero uncaught page errors.
- Real worker self-play: **15 modes completed and produced learning updates**.
- The archive has standard ZIP Deflate compression, no duplicate paths, no source
  font binaries, and a CRC check. Its runtime hashes and clean rebuild are checked
  separately in the supplied JSON verification report.

Initial runs caught three obsolete current-engine version assertions, a visible
`Max 1020` label, and hidden 3v3 exterior layers. The assertions, label, and shared
camera composition were corrected and rerun. A browser test helper initially
mistook a closed Settings panel for an open one; its visibility check was fixed.
An initial touch verification command exceeded the tool's 120-second call limit;
the same complete test subsequently passed in a longer-running process.

Browser verification uses generated product JS/CSS and real local artwork through
a file-backed Playwright fixture. This is **not** a physical iPhone/Safari test,
a Windows-launcher execution test, or a live-site/Service Worker update test. Code
review was performed inline, not by an independent reviewer. QA screenshots are
excluded from the ZIP to keep it smaller; scripts and logs are included, and
selected previews are supplied as separate attachments.
