# Web Royale v0.46.0 Modes and Arena Refresh Design

## Intent
Ship one release that removes the 1v1v1v1 FFA and clan-facing UI, replaces the social nav destination with an Online Play Coming Soon page, expands deck/elixir modes, reorganizes Other Modes, and upgrades every custom arena from flat geometric styling to detailed location-style environments with distinct floor materials, layered backgrounds, foreground scenery, and restrained animation.

## Mode changes
- Remove FreeForAll from current mode menus, training mode selection, current queue/rules registry, and new replay creation. Historical v0.45 FFA replays remain playable through a frozen v0.45 legacy engine.
- Add SixCardDeck with its own named paged deck library and 6-card cycle (4 hand + 2 queue).
- Add UncappedElixir with ordinary timing/generation and no storage cap.
- Rename the former Practice group to Other Modes.
- Rename Elixir & Rules to Elixir.
- Move Sudden Death and One Shot into Other Modes.

## Online Play
- Remove Clan as a navigation destination.
- Replace its bottom-navigation slot with Online.
- Online opens a simple Coming Soon page. No clan chat/browse/war entry points remain reachable from current UI.
- Legacy social/save structures remain data-compatible and dormant rather than deleting user data.

## Touchdown
- Use the official Clash Royale Touchdown arena visual language for 1v1 and 2v2: green checker turf, white yard/end-zone lines, red/blue stadium seating, horns, spectators, corner Elite Barbarian-style statues, castle end gates, and no river/towers.
- 3v3 uses the same Touchdown stadium appearance, only widened to fit six players.
- Because the historical Touchdown `.sc` asset is not present in the supplied APK/assets, the build uses the official arena as the visual reference and reproduces its stadium structure from local assets rather than claiming byte-identical source art.
- Keep existing Web Royale Touchdown gameplay rules unless explicitly changed elsewhere.

## Detailed custom arenas
Every custom family uses a distinct place-like theme with different base-floor material and background structure, plus cached foreground/background layers:
- 3v3 Bastion: royal stone fortress courtyard.
- 3v3 Jungle Citadel: jungle temple floor, ruins, canopy, vines.
- 3v3 Ember Fortress: volcanic fortress, basalt floor, lava fissures.
- Bridge Frozen Causeway: ice cliffs and gold-framed frozen stone bridge.
- Bridge Lava Causeway: volcanic chasm and basalt bridge.
- Bridge Royal Garden: palace garden, hedge/flower terraces and pale stone.
- Team Rumble Castle Crown: castle courtyard and battlements.
- Team Rumble Moon Keep: moonlit keep with celestial floor accents.
- Team Rumble Four Bridges: river fortress with riverbank masonry and four actual bridges.

Use local source arena scenes/props where available and keep collision geometry independent of decorative scenery.

## Save/replay compatibility
- Existing save key remains `web-royale-classic-v4`.
- Add SixCardDeck and UncappedElixir deck fields through normal profile migration.
- Freeze current v0.45 engine as `legacy-core-v045.js`; bump new replay engine to 0.46.
