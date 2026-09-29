# Web Royale v0.28.0

Full offline browser build, based on the supplied v0.26.0 archive and the verified
v0.27.0 recovery/polish milestone. Extract the whole ZIP and run
`Web-Royale/open offline.bat`. Keep the launcher window open while playing.

## UI changes

- Original deck-tray artwork, kept at its source aspect ratio with eight aligned slots.
- Original reorder glyph, card frames, elixir symbol and progress artwork.
- Rebuilt card details with one title, owned level/copies, independent level preview,
  readable stats, Upgrade/cost button and expandable secondary details.
- Melee range labels follow the historical Short/Medium/Long categories documented
  in [Supercell’s July 2019 notes](https://supercell.com/en/games/clashroyale/blog/release-notes/july-update-patch-notes-2/).
- Fixed blank Collection bitmap labels after navigating from Decks.
- Fixed stationary Cannon Cart double mirroring when facing left.
- Includes the prior social menu scrolling, chat layout and resource-bar fixes.

## Gameplay changes

- Large troops can use both bridge centerlines. Planner and movement use shared exact
  body clearance at river-bank corners; routes respect troop radius at arena walls.
- Death/spawn troop formations settle invalid river/wall positions onto legal terrain.
  Effect payloads retain their death location; mobile children are settled separately.
- Mother Witch applies her curse on projectile impact, including a lethal hit.
- Ram Rider prioritizes an unsnared target between attacks.
- Hunter pellets hit the first physical blocker along their travel segment.
- Freeze pauses current troop-spawner and Elixir Collector progress; Rage affects the
  Collector's current production cycle.
- Fisherman stands still for his source-timed hook windup, which cancels on stun,
  knockback, target death or invisibility.
- Cannon Cart's broken stage is a building, preserves its target through the source
  150 ms morph and attracts building-targeting troops.
- Tornado pull scales with elapsed time and no longer repeatedly cancels attacks.
- Includes the previous visible tiebreak phase and persistent result-reward receipts.

## Preserved custom changes

The 102-card historical snapshot 3.2557.2, level cap 13, accepted camera/arena,
206 emotes and 15 arenas remain. The Hour Shop keeps 12 hourly slots, three per
rarity. Battle chests unlock through wins. Eligible first copies are discovered
regardless of reward source. Alternate queues stay at Level 9; the ladder uses
collection levels. Local AI, its learning/saves and the existing local world remain.
No modern balancing snapshot, new currency packs or Pass UI was introduced.

New replays use engine 0.28. Existing 0.26 and 0.27 records run inside a frozen,
isolated historical simulation. Its verified training-engine hash is recorded in
`src/legacy-core-v027.js`. This prevents the new pathing and combat corrections from
changing input-only historical replays. Save keys and the normal launcher origin
are unchanged; use the same browser/origin to retain browser saves.

## Verification

Final full suite: **683 tests passed, 0 failed, 0 skipped** (Node 24.20.0 / Windows,
220.3 seconds). This includes sustained deterministic fights using all 102 cards and
completion checks for six event modes. There are 118 additional tests beyond v0.27.

Movement report: **345/345 recorded scenarios**, covering 77 independent movers,
308 team/lane crossings, 8 crown-tower approaches, 12 crowded crossings, 16 death-spawn
crossings and an aggregate probe of 1,250 route segments. The new combat file contains
26 focused cases. Across the retained and new suites, 57 cards have mapped dedicated
behavior/formation/placement scenarios; 45 have no dedicated behavior scenario mapped.
All 102 have deployment coverage, which does not prove all special interactions.

Built Edge checks pass for all 102 card sheets, 111 Collection labels, actual upgrades,
deck-slot containment, mouse deployment, river children, Cannon Cart targeting and
historical replay playback. Built Chrome checks pass for the Hour Shop, saves, battle
frame, full tiebreak/result flow and all 30 arena/phase combinations. Social UI checks
pass at desktop and phone sizes. No uncaught browser errors or missing assets occurred.
Independent review found and verified the death-effect-origin fix; no blocker remains.
The source-based per-card coverage ledger and movement evidence are included in
`docs/verification-v028/`. Baseline deployment coverage is separated from focused
behavior coverage; neither is labeled as exhaustive native equivalence.

The five protected original camera/arena/render-data hashes are unchanged. A clean
independent extraction and source rebuild verifies every packaged runtime file.
Windows launcher integration checks from v0.27 remain applicable: the host and
launchers are unchanged in this pass (17 AppData and 27 static-host checks passed).

For source work: Node 22 or newer, `npm test`, `npm run build`, `npm run serve`.
Browser checks require Node Playwright and Chrome or Edge. Restart the development
host after a rebuild. Current browser suites are `browser_cards_v280.cjs`,
`browser_gameplay_v280.cjs`, `browser_v270.cjs` and `browser_menu_recovery.cjs`.
Set `WEB_ROYALE_URL` to the fresh local server origin.

## Remaining fidelity limits

This release is closer to the supplied historical game, but is not a verified 1:1
copy. The separately named native menu captures and gameplay reference clips were
not included, so exact screen matching and frame-by-frame interaction comparisons
remain unverified. Original components are retained rather than inventing replacements.

Specific remaining checks include Hunter spread/random delays, Tornado's exact native
attraction curve and mass response, Tesla rise/hide timings, and the full combination
of card interactions. Legal routes and absence of tested stalls do not establish the
native engine's exact route choice. The tiebreak's one-second hold and three-second
drain remain locally selected; minima within 0.5 HP retain the prior immediate draw.
Official tower skins beyond Classic and existing AI/social approximations remain open.
