# Web Royale v0.43.0 — Team Rumble, separate decks, custom-map clearance and Play Again

## Install and save compatibility

This is the complete game and development source, based on the delivered
`Web-Royale-v0.42.0-Full-Build.zip`, not a patch. The ready-to-serve web game is in
`Web-Royale/dist/`. Export your old save, close the old game/launcher, extract the
entire ZIP into a fresh folder, then run `Web-Royale/open offline.bat`. Keep the
same browser and localhost address for the same browser save. Do not clear browser
website data merely to refresh the game. The save key remains
`web-royale-classic-v4`; importing an exported save is also supported.

The ZIP has NOT been deployed to the user's live website. Windows launchers are
retained but were not executed on Windows. No physical iPhone or Safari testing
was performed. Node 22+ is only required for development/rebuilding, not for the
retained Windows opener. The packaged runtime contains all original game art;
source assets are restored locally from its verified files by the build script.
Historical QA screenshots and font binaries are excluded from the ZIP.

## Separate, full-catalog Other Modes decks

Every selectable-deck casual mode has an independent saved deck and a full-catalog
builder. Editing a 2v2, 3v3, Team Rumble, Bridge, elixir-variant or challenge deck
does not edit the ranked Trophy Road deck or any other mode's deck. Four Card,
Twelve Card and One Shot keep their separate 4-, 12- and 8-card decks. Existing
custom decks migrate rather than reset. Casual cards remain level 9.

All 102 cards in this build's catalog can be selected in eligible Other Modes
decks without unlocking them for ranked play or adding collection copies. Random
Deck likewise draws from the full catalog and generates a fresh deck each match.
Mode-specific bans still apply. One Shot excludes every spell, Mortar, X-Bow and
Miner, and explicitly excludes Goblin Drill if that card is added to the catalog
later. Goblin Drill itself is not present in this build's source card snapshot.
Restrictions apply to actual deployments and AI-generated decks, not only the UI.

Ranked collection unlocks, costs, card levels, inventory and arena gates remain.

## Paged, named ranked decks

The deck toolbar shows five decks per page, with previous/next arrows and a page
counter. Additional pages appear for decks 6–10, 11–15, etc., with up to 100 saved
decks supported. Adding a deck selects its page automatically. Removing a deck
preserves the remaining contents/names and prevents deleting the last deck.

The small editable name beside average elixir is saved per deck, up to 24
characters. Existing unnamed decks receive ordinary numbered names. Names and
page selection were checked at desktop and narrow-phone viewport sizes.

## Team Rumble — 5v5

A ten-player match: the local player plus four AI teammates against five AI
opponents, with independent decks, hands and ten-elixir banks. There are five
Princess Towers and five King Towers on each side. Team ownership is shuffled
uniformly over five slots. The local King's health is gold and remains visible,
including after destruction.

The arena is wider than the standard field, has no river, and is symmetrical from
red to blue. No 5v5 reference image was attached; its five-pair arrangement is an
original symmetrical layout, not a claimed reconstruction of an unseen image.

### Confirmed timing

| Phase / clock | Passive elixir |
|---|---:|
| Regulation 5:00 to 3:00 | 1x |
| Regulation 3:00 to 0:00 | 2x |
| Overtime 5:00 to 2:00 | 3x |
| Overtime 2:00 to 1:00 | 4x |
| Overtime final minute | 5x |

Regulation and overtime are each 300 seconds. The 4x boundary is three minutes
*elapsed* in overtime, at 2:00 remaining. A destroyed King stops only that owner's
passive regeneration. Stored elixir can still be saved/spent; Collector income
and the custom team-elimination Elixir Golem owner-return rule remain available.
The elixir capacity is still ten, not the separate Twenty Elixir mode's capacity.

Destroying all five enemy Kings immediately wins. Otherwise the existing
crown/timer/overtime/tiebreak rules apply. Up to ten crowns are represented in
results, history and Crown Road earnings. Team Rumble is non-ranked, appears in
Other Modes and Sandbox, and participates in mode-correct AI learning. The other
modes' previously agreed timers and rewards remain unchanged.

## Aligned custom arenas and real movement clearance

Middle Princess Towers are now on the same row as their outer towers in both
team arenas. Custom towers no longer inherit a side-dependent horizontal art
offset intended for classic arenas. Tower artwork and foundations share the
actual simulation coordinates.

Rumble's playable bounds expand to x=-2..20, y=-2..34 in classic tile coordinates.
The other custom arenas also gain rear space to y=-2..34. 3v3 Kings move back to
leave an aisle behind their Princess row; Bridge ground widens to 7.5 tiles so
large ground bodies can pass around Kings. The Bridge remains a central crossing,
not a normal two-lane map.

No troop collision radii are reduced. Radius-aware path search includes precise
wall-clearance tracks that the old half-tile-only grid could miss. Placement,
entity clamps, camera/pointer conversion, scenery, foreground and Potato Mode
use the actual extended bounds. Air units retain their outboard flight permission.

Both team arenas and Bridge have layered surroundings and raised scenery, with
rails/props outside the playable lanes. Ground patterns, foundations, railings
and mirrored surroundings were cleaned up. The Bridge retains its icy,
gold-framed design. Cached stationary layers are reused while ambient details
animate; existing graphics settings and Potato Mode remain supported. These are
custom assembled arenas, not pixel-identical official assets.

The movement audit covers all lane crossings, both directions, an 18-Barbarian
pack and large-unit side passages. Additional real-movement probes start Giants,
Golems, P.E.K.K.A and Giant Skeletons behind every tower in all three custom maps,
retaining the real tower obstacles and unchanged unit collision sizes. These are
reproduced test cases, not a guarantee about every possible player-built blockade.

## Mirror and Firecracker

After Mirror copies a card, its hand portrait is framed with a distinct reflective
blue/silver rim and shine. Copied Legendary portraits also use that mirrored
frame. The actual +1 elixir cost is preserved; hand-level text remains absent.

Firecracker's impact now reads the source secondary-projectile count and releases
all five fan projectiles. Each has its own direction/collision path, damages
eligible ground/air units, and displays the existing source impact/trail effects.
Tests include targets spread across all five rays. Disabling decorative particles
does not disable the damage; Potato Mode continues to show simple projectile marks.

## Trophy Road, Crown Road and rare items

Trophy Road arena icons are larger and centered with appropriate surrounding
space. Fourteen new Wild Card milestones, fourteen Books milestones and fourteen
Magic Coin milestones are inserted between old rewards using new stable IDs.
Old reward IDs/claims are retained. Existing high-trophy accounts can claim newly
introduced rewards at already-reached thresholds without re-earning trophies.

Crown Road grants Epic Wild Cards more often, Books at every tenth reward step,
and Magic Coins at every seventh step, alongside existing larger milestone rewards
and higher-level scaling. Existing claimed Crown Road steps stay claimed; the
update does not pay previously claimed rewards a second time.

An eligible battle win makes an independent rare-item roll:
- Wild Card bundle: 0.1%.
- Book: 0.1%.
- Magic Coin: 0.1%.

At most one such item category drops per win. Legendary Chests are also added to
the battle chest table at 0.1% per eligible chest award; their share comes from
Silver, leaving Gem, Treasure, Gold and Magical weights unchanged. Unlike chests,
magic items can be received even with four occupied chest slots. Each category's
rate is 0.1%; it is not a 0.1% combined rate for all three.

Battle items go directly into inventory and appear in their own result reward
box. Receipts retain the awarded item across reloads and prevent duplicate payout.
Replays/practice/losses cannot receive these win rewards. Opening an early battle
Legendary Chest before any Legendary card is eligible grants a Legendary Wild
Card instead of an empty chest or a future-arena card.

## Play Again

Results now have Play Again beside OK, appearing with the existing fast reveal.
It starts a new match with the same mode, queue and selected deck, but a fresh
opponent/seed and mode-appropriate map selection. Random Deck rolls a fresh deck;
ranked play stays ranked and casual 1v1 cannot become ranked inadvertently.

The old result settles exactly once before repeating. The button grants no extra
rewards; rapid double-clicks start only one match. Training repeats stay practice.
Recorded replays, Sandbox, automated self-play and used Clan War tickets do not
offer a reward-bearing repeat. OK remains available to return to the menus.

## Verification

See `docs/verification-v043/VERIFICATION.md` and the accompanying delivery JSON for
fresh suite counts, movement probes, worker self-play, browser results, archive
integrity, asset preservation and extraction/rebuild evidence. Browser tests use
real generated JavaScript/CSS and native local assets through a file-backed
Chromium fixture at 1280x1040, 390x844 and 320x568. This is not a live-site HTTP,
Service Worker upgrade, physical iPhone or Windows-launcher test. There is no
whole-game FPS guarantee or claim that lowering art quality fixed simulation.
