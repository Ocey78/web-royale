# Web Royale v0.47.0 — deck UI, shop scaling, UI shader polish, distinct custom arenas

## Update / launch

This is a complete build based on v0.46.0. It retains the existing save key
`web-royale-classic-v4`, older replay engines, Trophy/Crown progression, all current
modes, shop purchase receipts, graphics preferences and the Windows offline launchers.

Export a save before replacing an older build. Extract the full ZIP and run
`Web-Royale/open offline.bat`. Keep using the same browser/profile and localhost
origin to access the same browser save.

This package has not been published to the live Site.

## Shared Clash-Royale-style deck screens

The regular Battle Deck page is now the visual template for custom-mode decks.
The 4 Card, 6 Card, 12 Card and One Shot editors use a full Cards-style screen rather
than the old compact modal builder. Modes backed by the shared custom deck library
reuse this structure and keep their independent saved deck contents.

The shared deck presentation includes:

- native-style blue deck panel and collection region;
- deck paging / add / remove controls;
- editable deck name;
- average elixir displayed alongside deck metadata;
- correctly sized card frames, costs and level labels;
- the mode-specific rules summary;
- full Card Collection beneath the deck;
- Back and Battle controls in a persistent footer;
- compact layouts intended to stay usable on narrow phone viewports.

The ordinary Battle Deck page received the same surface/panel treatment so normal and
custom decks read as one system instead of two unrelated interfaces.

## UI surface / shader polish

v0.47 adds a reusable Royale-style presentation layer rather than individually
restyling each page. Major panels now use brighter upper rim highlights, a darker
lower bevel, subtle internal gradients, specular/gloss passes, inner highlights,
drop shadows and clearer pressed/selected states.

The treatment is applied to deck panels, shop offers, Custom Modes groups, Settings,
Crown Road/Trophy Road surfaces, reward/result boxes, major modal panels, headers and
Online Play. The implementation deliberately avoids expensive full-screen blur or
backdrop-filter effects.

## Shop quantities and King-Level scaling

Card offer prices are unchanged. Card *quantities* now scale slightly with King Level:

`multiplier = 1 + 0.025 × (King Level - 1)`

King Level 13 therefore receives a 1.30× card-quantity multiplier relative to King
Level 1. Rounding is Common to the nearest 10, Rare to the nearest 5, and Epic /
Legendary to the nearest whole card.

### Daily Shop paid-card bases at King Level 1

- Common: 500 cards
- Rare: 150 cards
- Epic: 30 cards
- Legendary: 8 cards

The six paid Daily Shop slots use those bases. The free Gold Chest, Gem Chest and free
Wild Card slot keep their existing reward rules.

The same modest King-Level multiplier is also applied to Hour Shop, Lightning Shop and
Gem Shop card quantities. Their prices and refresh behavior do not change. Gem Shop
still refreshes after two successful purchases.

The displayed quantity is now part of the purchase receipt validation. If a King-Level
change or stale page would make the live offer quantity differ from the amount shown,
the purchase is rejected and the shop must refresh rather than granting a different
quantity from the one displayed.

## Distinct custom arena environments

The custom maps no longer depend on one generic tiled-floor / recolor treatment.
Gameplay geometry remains compatible with the existing modes, while each environment
has its own floor construction, backdrop architecture, perimeter treatment, props,
raised foreground scenery and ambient detail.

- **Castle Crown** — fortified royal courtyard, masonry paving, crowns and castle trim.
- **Moon Keep** — dark lunar fortress, moon backdrop, spires, runic paving and misty
  purple-blue architecture.
- **Four Bridges** — fortified river complex with water, docks/fortifications, four
  substantial masonry crossings and river-side structures.
- **Royal Bastion** — three-lane fortress with regimented stonework, lane inlays and
  bastion architecture.
- **Jungle Citadel** — overgrown ruined temple, mossy paving, vines, canopy depth and
  jungle stone monuments.
- **Ember Fortress** — obsidian/forge complex with basalt floors, lava fissures,
  foundry structures and volcanic perimeter scenery.
- **Frozen Causeway** — icy canyon, gold-framed causeway, snowbanks and frozen cliffs.
- **Lava Causeway** — volcanic forge bridge with dark metal/stone decking, lava glow,
  furnaces and basalt perimeter walls.
- **Royal Garden** — palace garden with pale stone paving, hedges, flower beds,
  fountains and garden architecture.
- **Touchdown Stadium** — retains the v0.46 Clash-Royale-style stadium field, stands,
  end zones, trapdoors and football-statue perimeter treatment.

Static arena layers remain cached. Ambient animation remains separate so detailed maps
are not rebuilt every frame. Potato Mode still bypasses detailed arena rendering.

## Screenshots / visual QA

The v0.47 screenshot set contains 21 images:

1. regular Battle Deck
2. 4 Card Deck
3. 6 Card Deck
4. 12 Card Deck
5. One Shot Deck
6. Daily Shop at King Level 13
7. Custom Modes
8. Settings / Graphics
9. Crown Road
10. Castle Crown
11. Moon Keep
12. Four Bridges
13. Royal Bastion
14. Jungle Citadel
15. Ember Fortress
16. Frozen Causeway
17. Lava Causeway
18. Royal Garden
19. Touchdown Stadium
20. result / reward UI
21. Potato Mode

The heaviest frozen/lava/garden/Touchdown environment previews are rendered through the
same shipped `custom-arena.js` code in an isolated Canvas fixture so visual QA does not
need to decode every unrelated troop scene. The earlier custom-map screenshots are from
the generated game browser fixture itself. This distinction affects only screenshot
fixture cost, not product code.

## Verification

- v0.47 economy/deck/arena targeted tests pass.
- Split historical Node regression groups pass after updating two obsolete balance
  assertions to the explicitly requested King-Level-scaled quantities.
- 1,210 historical/current cases pass outside the intentionally separated long stress
  case, plus the bounded event-timeline stress test.
- The sustained all-102-card stress test remains excluded from the completion count
  because it is known to exceed this environment's single-command execution budget.
- Generated browser QA confirms Daily/Gem/Hour/Lightning scaling, polished Shop,
  Custom Modes, Settings and Crown Road, with no page exceptions in the completed
  browser phase.
- 21 screenshot artifacts were produced for the approved visual checklist.
- A clean archive extraction/rebuild and runtime-hash comparison is performed for the
  final delivery and reported in the verification JSON.

No physical iPhone/Safari test, Windows BAT execution, or live-site deployment was
performed in this environment.
