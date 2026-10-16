# Ultimate Clash implementation plan

> **For agentic workers:** Execute the assigned component with tests, then review integration before release.

**Goal:** Add a complete Ultimate Clash mode, its exclusive 20-card pool and deck builder, improve rendering, and push the verified update to GitHub.

**Architecture:** Retain the existing browser engine and normal card catalog. Add an isolated custom catalog and combat module, sharing existing formations, source models, effects, and deck/form controls. Keep all random outcomes seeded for replay.

**Tech Stack:** Existing buildless JavaScript UMD modules, Canvas/WebGL rendering, Node test runner, static GitHub build.

**Spec:** User request in this chat, represented by the requirements below.

## Global constraints

- Do not edit project mirror `sources/` or historical engine snapshots.
- Mode ID `UltimateClash`; custom card IDs prefixed `ultimate-`.
- Normal collections, rewards, shop and deck builders exclude custom cards. Ultimate Clash uses only its custom pool and independently saved decks.
- Maximum elixir 20. Regulation 240 seconds, overtime 180 seconds, then tiebreaker.
- Elixir multipliers at elapsed seconds 0/120/180/240/360: 1/2/2.5/3/4.
- Princess towers use evolved Princess and 8× health; King towers have 10× health.
- Use native card art framing and distinct custom portrait compositions/descriptions. Preserve asset provenance and report unavailable requested assets honestly.

## Card requirements

| Card | Elixir | Required behavior |
|---|---:|---|
| Mega Minion Horde | 8 | Six Mega Minions; hero form gives six heroes and distributes targets while possible. |
| Lightning Storm | 10 | Grey Graveyard-sized cloud at 85% radius; six waves, 1–3 random targets per wave, random 0.9–2 second intervals. |
| Heal Spell | 4 | Anywhere placement; Heal Spirit heal effect with double duration and radius. |
| Balloon Parade | 12 | Balloons deployed across the arena using Royal Recruits formation. |
| Executioner Cage | 9 | Grey Goblin Cage model, Inferno Tower range, three independent axe targets; releases three Executioners when destroyed. |
| Builder | 5 | Attaches to a non-crown building, max two; one halts decay, two also heal. Use Clash of Clans Builder art/model when obtainable. |
| Magic Trio | 7 | Ice Wizard, Electro Wizard, Wizard in Skeletons formation. |
| Frostbite | 6 | Freeze at 115% radius spawning Ice Spirits over time; hero ability costs 3 and fires ten Giant Snowballs nearby. |
| Harvest | 5 | Pink Void at 150% radius, 125% duration; enemy deaths pay skeleton .1, minion/bat/spirit/goblin .2, barbarian .35, other 1; pink beam on death. |
| Overcharged Tesla | 6 | Evolved Tesla appearance, stays above ground, no emergence pulse; Sparky charge/fire with cosmetic sky zap one second before firing. |
| Three PEKKAS | 15 | Three P.E.K.K.As. |
| Meteor Shower | 4 | Orange Void floor at 150% radius; eight random Fireballs across 4.5 seconds at one-third normal damage. |
| CODE RED | 18 | Twenty-five rockets in waves across enemy half within three seconds. |
| Royale Escort | 14 | Front two Knights and Prince, middle Royal Giant, rear two Cannon Carts. One-cycle evo uses evolved Knights/Royal Giant and Dark Prince. |
| Kings Dropoff | 9 | Four Royal Deliveries plus boxed Cannon Cart in a plus formation, Cart at center. |
| Elite Barbarians | 8 | Five Elite Barbarians in Barbarians formation. |
| Elixir Witch | 4 | Mother Witch, 5% slower, summons middle Elixir Golemites like Night Witch bats; kills transform into tiny Golemites. |
| Unstable Egg | 5 | Own-half Phoenix Egg; hatch odds 30% Baby Dragon, 20% evolved Baby Dragon, 5% three Baby Dragons, 45% Demolisher explosion damaging both teams. |
| Fisherman | 3 | Immediate deploy hook when target in range; hook charge 50% faster. |
| Bomb Squad | 4 | Two Bombers and a Guard; Bombers invisible and untargetable until Guard dies. |

## Review focus

- Normal-mode saves, card pools and rewards stay isolated after switching mode and reloading.
- Both teams obey building attachments, invisible unit targeting, credit ownership and enemy-half rocket placement.
- Hero/evolution controls and custom ability events survive replay seeking.
- Expensive cards are affordable and both players generate the intended elixir at every timeline boundary.
- Heavy spell/army battles preserve rendering limits and finish without errors.

## Tasks

1. **Catalog/deck/UI** — `src/ultimate-clash.js`, catalog, profile, deck manager, training deck generation, card forms, app, build: add custom data without changing base source rows; test exclusive pools, save migration and forms; compose 20 portraits and expose mode builder.
2. **Combat** — `src/ultimate-combat.js`, battle, match rules, placement/form hooks: implement exact mode timing/towers and all card behaviors; test seeded waves, formations, healing/decay/deaths, ability cost, evolution and AI deployment.
3. **Presentation/performance** — renderer modules and `src/draw.js`: measure a baseline, optimize a proven hot path without lowering quality, implement custom effect presentation and source model mapping, research Builder source assets; verify cache correctness and image output.
4. **Integration/release** — replay, browser QA, version/release notes: preserve historical replay fingerprints and include custom state in Ultimate replay proof; run full tests/build and browser gameplay/deck tests, review changes, commit and push existing repository branch.

## Execution notes

- Existing checkout `E:/Projects/WebRoyale`, baseline `06652d7`, branch `fix/arena-visuals-v054`, initially clean.
- User explicitly authorizes implementation and GitHub push; no additional confirmation needed for those actions.
- Parallel agents have separate file ownership; root owns replay and release integration.
- Balloon Parade uses six Balloons to match the six-unit Royal Recruits formation.
- Unspecified base stats use their named native card counterpart; Builder double-stack healing is a small bounded percentage of building maximum health.
