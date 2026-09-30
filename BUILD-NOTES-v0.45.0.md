# Web Royale v0.45.0 — map expansion, Touchdown, FFA and custom-mode deck libraries

## Update / launch
This is a complete build based on v0.44.1. Existing save data remains under
`web-royale-classic-v4`. Export a save first, close the previous tab/server,
extract the whole archive, and run `Web-Royale/open offline.bat`. The ready-to-
serve site is already in `Web-Royale/dist/`.

This package is not deployed to the live website.

## Three-map families
### Team Rumble (5v5)
Team Rumble now randomly selects among three real geometry variants:
- **Castle Crown** — the retained wide arched castle layout.
- **Moon Keep** — a distinct moonlit castle theme with the formation arch curved
  in the opposite direction.
- **Four Bridges** — straight tower rows, a river, and exactly four two-tile-wide
  bridges.

All three layouts use dedicated cached backdrop, playfield, themed-detail,
raised-scenery and ambient layers. Visual decorations remain outside movement
geometry.

### 3v3
Three detailed layouts are available:
- Royal Bastion
- Jungle Citadel
- Ember Fortress

The two added themes retain the proven three-lane collision geometry while using
distinct scenery, foreground decorations and ambient presentation.

### Bridge
Three detailed single-route layouts are available:
- Frozen Causeway
- Lava Causeway
- Royal Garden

Each retains the narrow valid ground route while using its own backdrop,
architecture, foreground props and ambient particles.

## Touchdown
Added playable **Touchdown**, **2v2 Touchdown**, and **3v3 Touchdown**.
- No Crown Towers are spawned.
- A non-building troop scores when it crosses the enemy goal line.
- First team to 3 touchdowns wins.
- A tied regulation game goes to touchdown sudden-death overtime.
- 3v3 uses a purpose-built wider field.
- Touchdown has dedicated field markings, goal zones, center crest, stands,
  banners and side structures.
- All variants use the real selected team size in AI/self-play and replay data.

## 1v1v1v1 FFA
Added a four-team Free For All with **Blue, Red, Green and Yellow** teams in the
four corners.
- Each corner has a King Tower with adjacent Princess Towers.
- Horizontal and vertical waterways form a cross-shaped center obstacle with
  brown bridge crossings.
- Each team is independent; the last surviving King wins early.
- If multiple Kings survive regulation, the mode enters overtime instead of
  applying ordinary blue-vs-red logic.
- Four-team result receipts and replays preserve all four teams.
- The arena has dedicated corner forts, team-colored floor accents, banners,
  central bridge architecture and raised scenery.

## Trophy Road league progression
Trophy Road now uses the combined arena/league progression state. Reaching past
Serenity Peak changes the displayed current progression to Challenger I and then
subsequent leagues instead of leaving Serenity Peak selected.

## Multiple named custom-mode decks
Every selectable custom/casual deck mode now owns its own independent deck
library.
- Up to 100 decks per mode.
- Five deck tabs per page, with page navigation as more decks are created.
- Each deck has a saved editable name.
- The active deck is saved per mode.
- Builders expose the full eligible card catalog without unlocking cards in the
  ranked collection.
- Existing mode decks migrate into the first deck of the matching library.

## Custom Modes page
Other Modes is reorganized into Team Battles, Touchdown, Deck Modes, Elixir &
Rules, and Practice sections. Existing modes remain available while the new
modes are easier to scan on compact screens.

## Map/detail rendering
All custom maps now report and render a full layered presentation stack:
backdrop, architecture, playable surface, theme detail, raised scenery and
ambient animation. Touchdown adds dedicated spectator-stand layers; FFA adds
corner-fort layers. Stationary layers stay cached to preserve the performance
work from previous releases.

## Replay compatibility
Current simulation/replay tag is **0.45**. The exact v0.44 engine is retained as
`src/legacy-core-v044.js`, so existing v0.44 Team Rumble matches continue to use
their historical rules. Expansion-only modes require the v0.45 simulation.

## Verification
- v0.45 focused expansion/replay/presentation tests: 16 passed.
- v0.45 pathing tests: 7 passed.
- Historical/main suite files before the stress test reached 650 passing tests
  with zero observed failures before the environment's command time limit.
- Remaining non-stress suite files were run separately: 143 + 402 tests passed.
- The shorter event-timeline stress test passed. The long all-102-card sustained
  stress subtest was not completed in this environment.
- Browser verification was split into independent runs to avoid process memory
  buildup: 11 + 11 + 6 checks passed with zero page exceptions.
- Browser screenshots verify the two new 5v5 layouts, two new 3v3 themes, two new
  Bridge themes, Touchdown, wide 3v3 Touchdown, FFA and the reorganized modes UI.
- Physical iPhone/Safari and Windows launcher execution were not performed.
