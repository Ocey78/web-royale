# Web Royale v0.41.0 — Crown Road, custom arenas, learning and Treasure Chests

## Install or update

This is a full source-and-runtime build based on `Web-Royale-v0.40.1-Rebuilt-Full-Build.zip`.
Export your save in the old game's Settings, close the old tab and launcher, extract
this entire ZIP, and run `Web-Royale/open offline.bat`. `Web-Royale/dist/` is already
built and ready to serve. Use the same browser and origin to retain the same local
save. Do not clear website data to refresh assets. The save key is unchanged:
`web-royale-classic-v4`.

This package has **not** been published to the live website. The Windows launchers
are retained byte for byte; they have not been executed on Windows for this release.

## Crown Level and Crown Road

Crown Level starts at 1 and increases for every ten lifetime crowns:
`1 + floor(lifetimeCrowns / 10)`. At 10 crowns the first reward unlocks, for Level 2.
The top-left level button now opens Crown Road and has a yellow outline whenever
there is an unclaimed earned reward. The player's name still opens their profile.
Crown Level is independent of King Level, experience, card levels and tower stats.

Older accounts are automatically placed at the level supported by their saved crown
counters. Migration takes the maximum of lifetime crowns, earned crowns, crowns
already used for Crown Chests, and the recoverable non-practice crown history. It
never adds overlapping counters together or invents crowns for missing history.
Previously reached Crown Road rewards are available to claim, not silently collected.
Claiming Crown Chests or Crown Road rewards never spends lifetime crowns.

The road has no short fixed end: it is paged in groups of 25 rewards to keep old or
high-level accounts responsive. Claims are saved as merged intervals, and duplicate,
future, non-integer or invalid claims cannot grant items. Existing currency and item
balance caps still apply.

Rewards grow sharply with progress. Every milestone grants gold and Common Wild
Cards; even milestones add Rare Wild Cards. Every fifth adds gems and Epic Wild
Cards. Every tenth includes premium chest contents, and every twenty-fifth adds
Legendary Wild Cards and Books. At higher milestones, the books and chest rewards
improve too, including the Treasure Chest and Book of Books. Here "milestone 10"
means the tenth earned ten-crown reward, at Crown Level 11 (100 crowns).

For example, ordinary base gold grows from 675 at 10 crowns to 4,500 at 100 crowns,
70,500 at 500 crowns, and 265,500 at 1,000 crowns, before the extra chest contents
at those milestones. Premium chest contents are included directly in that claim's
reward receipt and do not occupy a battle chest slot. A Legendary milestone uses a
Magical Chest instead when the account has not reached any Legendary card arena.

## Custom 3v3

Other Modes now includes 3v3: the player and two AI teammates versus three AI opponents.
The custom purple-stone arena follows the supplied three-lane reference, with three
crossings and three Princess Towers plus three King Towers on each side. Native tower
models and appropriate local scenery are combined with new terrain; this is not a
stretched normal arena or a claim of pixel-identical source artwork.

Each of the six seats owns its own deck, elixir bank and King/Princess pair. Each team
independently shuffles its player-to-slot assignment every match. All three slots are
equally likely for each player; assignments are saved for deterministic replay.
The local player's King health is always displayed in gold, even while undamaged.
The player/teammate bank strip is sorted left, center and right so ownership is clear.

When a player's King is destroyed, that player stops gaining **passive** elixir.
Their stored elixir is not erased; they can save or spend it and continue deploying.
Their existing or newly placed Elixir Collectors can still add elixir. In this custom
3v3 rule, their Elixir Golem's death-spawn chain returns its generated elixir to its
owner, including when that owner's King is already destroyed. This owner-return
rule is exclusive to 3v3; normal modes keep Elixir Golem's opposing-team payout.
All banks retain the normal ten-elixir cap. Other players' passive income is unaffected.

Destroying all three opposing Kings ends the match immediately. Otherwise the normal
clock, crown advantage, overtime and tiebreak rules decide the winner. Each of the
six towers can award a crown; result animation, history and permanent crown progress
support all six. This mode is non-ranked and level 9, with normal battle rewards and
chest-win progress, without changing ranked trophies or ranked streaks.

## Custom Bridge mode

Other Modes also includes Bridge: one player against one AI, one Princess Tower and
one King Tower per side, and a narrow central route across an icy gold-trimmed arena.
This layout follows the second supplied reference's single-lane topology. The custom
art, legal deployment region, river crossing, tower footprints, ground collision and
route finding all use the same layout definition. Ground troops cannot deploy into
or walk through the side voids. Flying troops retain their ability to fly over terrain.
Bridge is also non-ranked and level 9 with normal battle rewards.

Custom backgrounds are cached instead of rebuilt for every troop or frame. They obey
the saved texture/background quality policy, keep a bounded two-surface cache, and do
not load an unrelated Trophy Road arena. Existing Hog Mountain caching is retained.

## Movement and bridge recovery

Friendly units that have spent time obstructing each other can yield gradually sideways
in small, terrain-checked steps. They keep their physical collision size: this does not
turn collision off or let them phase through towers or riverbanks. Opposing units still
fight normally rather than being allowed to slide through one another.

A reproduced bridge stall came from skipping a close corner waypoint before a troop's
full collision radius had cleared the rounded bank corner. The navigator now skips
that waypoint only when the following segment is clear for the whole body. This fixes
the reproduced approach/repath loop while retaining swept collision and route caching.

The 25-scenario movement audit covers normal bridge approaches, all three custom
crossings, the narrow crossing, and a pack of 18 Barbarians. All unopposed troops
crossed in the final audit. Route searches fell from 1,049 to 48 across those same
scenarios. These are navigation-work measurements, not a promised FPS improvement
or a claim that every possible crowded interaction is impossible to stall.

## Learning and replay

The Learning Center offers all 12 match modes: 1v1, 2v2, 3v3, Bridge, 4 Card Deck,
Random Deck, Double Elixir, Triple Elixir, Ramp Up, Sudden Death, Infinite Elixir,
and Boat Battle. Self-play runs their real deck sizes, seat counts, timelines and
arena rules; it does not silently replace them with Default. Sandbox remains a
manual test environment rather than a self-play match or reward source.

New-mode experience is tagged by mode and, for 3v3, by lane. Bots use the correct
custom deployment region and public King-destruction state for passive-elixir
estimates. All six seats can learn. Training never awards player currency or crowns.
Twelve actual generated-worker runs completed matches with nonzero learning updates.

New replays use simulation tag 0.41 and preserve all six decks and randomized slots.
Old 0.38 recordings now use a frozen pre-update simulation so changes to geometry and
crowd behavior do not corrupt old playback. Earlier historical interpreters remain
unchanged. Six-seat records reject invalid ownership assignments or old-engine labels.

## Treasure Chest

The Treasure Chest uses the wooden Free Chest's exact model and opening animation,
with only its silver/blue-gray metal recolored gold. Wood, geometry and alpha are
retained. It grants 10,000–100,000 gold, no cards or gems, in whole-gold amounts fixed
for that chest receipt.

Its battle-drop weight is 4 out of 60 (about 6.67%), compared with Gem's 5 out of 60
(about 8.33%): Treasure is 20% rarer than Gem. Magical odds also remain 5 out of 60.
These are conditional on an eligible winning battle with a free chest slot, not
promised intervals between drops. Existing battle chests are not rerolled on upgrade.

A battle-earned Treasure Chest unlocks after **five subsequent wins**; the win that
awards it does not count. Chest Keys work normally. Crown Road Treasure contents are
part of that immediate milestone reward and do not need five wins.

## Preserved features

The v0.40.0 stacking per-win gold/gem streak bonuses and result reward boxes, 50-gem
emotes, 100-gem tower skins, expanded Gem Shop bundles, all six shop chest prices,
Daily/Hour/Lightning/Gem Shops, saved decks, card-frame fixes, native art and audio,
graphics options, and v0.40.1 Hog Mountain cache work remain in the build.

## Verification

See `docs/verification-v041/VERIFICATION.md` and the supplied JSON report for exact
final commands, test totals, initial failures and fixes, preservation and archive
rebuild results. Browser checks run the generated product JavaScript/CSS and local
native artwork through a file-backed Chromium transport at desktop, 390px and 320px
viewports. This is not a physical iPhone/Safari test, live-site deployment or Service
Worker upgrade test. Review was performed inline; no independent reviewer was available.
