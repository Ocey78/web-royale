# Web Royale v0.46.0 — detailed arenas, Online Play placeholder, 6-card and uncapped-elixir modes

## Start / update

This is a complete build, not a patch. Export your save first, close the old game and offline launcher, extract the entire archive, and run `Web-Royale/open offline.bat`. Keep using the same browser/profile and localhost origin for the same local save. The save key remains `web-royale-classic-v4`.

For hosted Web Royale, publish the contents of `Web-Royale/dist/` through the existing host. This package does not publish the site automatically.

## Detailed custom arena pass

The custom arena renderer now treats each map as a place rather than a flat color theme. Every custom arena uses a source-backed distant arena texture plus separate cached layers for architecture, the playable floor, tower foundations, raised foreground scenery, theme props, and ambient animation. The stationary layers remain cached so the additional detail does not require rebuilding the whole arena each frame.

### Team Rumble / 5v5

The three existing 5v5 geometries remain:

- **Castle Crown** — the arched castle courtyard.
- **Moon Keep** — the opposite-curving arch with a darker moon-castle treatment.
- **Four Bridges** — straight tower rows, river fortifications and four two-tile-wide bridges.

They now use stronger castle masonry, gatehouse/turret silhouettes, paved courtyards, banners, rails, raised scenery and themed backdrops instead of simple colored geometry. Existing King-only 5v5 victory/elixir rules are unchanged.

### 3v3

- **Royal Bastion** — fortified royal masonry.
- **Jungle Citadel** — jungle/temple background, darker stone floor, foliage and ruins.
- **Ember Fortress** — volcanic/PEKKA-inspired background, ember stone and lava accents.

All keep the working 3-lane geometry, tower clearance and bridge movement from prior versions.

### Bridge

- **Frozen Causeway** — ice cliffs, snow, gold frame and raised frozen center structure.
- **Lava Causeway** — dark volcanic floor/backdrop with lava fissures and glowing props.
- **Royal Garden** — garden floor, hedges/topiary, fountains/flowers and gold-trimmed path.

All three keep the narrow single-route gameplay geometry while changing the floor, background, foreground and ambient details.

## Touchdown

Current Touchdown modes are:

- **1v1 Touchdown**
- **2v2 Touchdown**
- **3v3 Touchdown** (wider field)

They now share one Clash-Royale-style Touchdown stadium treatment: green checker turf, goal/end-zone markings, full red/blue sideline stands, spectator rails, trapdoor details, corner football-statue motifs, banners and stadium trim. The 3v3 version widens the playable field while retaining the same stadium language.

The supplied Clash Royale 3.5.0 asset inventory references `sc/level_touchdown_arena_highres_tex.sc`, but that scene is explicitly marked as **not present in the uploaded APK/assets**. Therefore this package reconstructs the official-style Touchdown stadium from the original arena artwork already available in Web Royale; it does not claim to contain the missing original `.sc` scene file.

Touchdown scoring rules from v0.45 are retained: no Crown Towers; get a troop across the opposing goal line; first team to three touchdowns wins, with sudden scoring advantage in tied overtime.

## Modes / navigation cleanup

### Clan removal → Online Play

The bottom navigation no longer exposes Clans. The shipped Clan/Clan Chat DOM screens are removed and the button is now **Online**. It opens an **Online Play — Coming Soon** page for future 1v1/2v2/3v3/5v5 networking. Old internal links that still reference Clan screens safely redirect to Online rather than opening a dead screen.

### FFA removal

The current **1v1v1v1 FFA** mode, card and current-mode registrations are removed. The v0.45 simulation remains frozen for compatibility so existing v0.45 FFA replays can still load.

### Other Modes organization

The Custom Modes page is grouped into:

- Team Battles
- Touchdown
- Deck Modes
- Elixir
- Other Modes

The former **Practice** heading is gone. The old **Elixir & Rules** category is now simply **Elixir**. Sudden Death and One Shot are under **Other Modes**.

### 6 Card Deck

Adds a separate saved **6-card deck** mode. Four cards are in hand and two remain in the cycle. It uses the existing custom-mode deck library system and all-card casual-mode collection rules.

### Uncapped Elixir

Adds **Uncapped Elixir**. Elixir starts and regenerates at the ordinary rate and the rest of battle rules remain normal, but there is no storage ceiling. AI estimates, grants and the HUD read the uncapped bank without clamping it to 10/20.

## Custom-mode decks

The multi-deck libraries introduced in v0.45 remain active for selectable custom modes: independent active deck, editable names, five decks per page, add/remove/select controls, and up to 100 saved decks per mode. Eligible cards are available in casual mode builders without changing ranked card ownership.

## Trophy Road / leagues

The post-Serenity-Peak progression fix remains: Trophy Road advances into the Challenger/Master/Champion leagues instead of continuing to display Serenity Peak after the player has crossed its upper threshold.

## Replay / save compatibility

New recordings use simulation tag **0.46**. The complete v0.45 engine is frozen as `src/legacy-core-v045.js`, preserving old Touchdown and retired FFA replay behavior. New save fields remain additive and the local save key is unchanged.

## Verification

Fresh final verification for this package:

- Generated web build: **v0.46.0**, **1,206 runtime files**.
- Split Node regression runs, excluding the very long all-102-card stress case: **1,205 tests passed, zero failed/skipped/cancelled**.
- Short event-timeline stress test: **1 passed**.
- Total completed automated cases across those disjoint runs: **1,206 passed**.
- Fresh Chromium verification produced **33 unique checks** across Online Play, mode-page organization, 6 Card Deck, Uncapped Elixir, league transition, both Touchdown geometries, all three Team Rumble geometries, all three 3v3 geometries, and all three Bridge geometries, with **zero uncaught page exceptions**.
- The extremely long `all 102 cards take part in sustained deterministic fights` stress case is not counted as passed here; earlier attempts exceed the environment time budget.

No physical iPhone/Safari or Windows-launcher execution was performed in this environment. No live-site deployment is included.
