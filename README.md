<!-- project-identity -->
# Web Royale Main — v0.52.2

Main uses supplied client snapshot 16.402.2: 123 base cards, 67 special forms, 32 Trophy Road arenas and 217 road reward steps. Imported totals do not imply that every entry is playable.

Both deck builders now show Evolution, Hero/Champion and Wild in the first three positions. Trophy Road unlocks those slots at Arenas 3, 5 and 10; casual battles open all three. The Wild slot switches between an owned Hero and Evolution on a card with both forms. Collection and Magic Items expose Hero choice for 200 Hero Coins and six-shard Evolution progress, including one Wild Shard at a time. Saved decks migrate card/form pairs into proper positions while retaining their roster; older replays keep their recorded rules.

The original Touchdown stadium, spell fixes, actor orientations, stable Tesla transitions, 3v3 spacing and distinct custom environments remain included. Full 1:1 native-game fidelity is incomplete. Battles, rewards and social features run locally, with no live human matchmaking, Supercell connection or real payment.

[Play Web Royale](https://ocey78.github.io/web-royale/). Live v0.52.2 is verified by exact release hash and actual desktop/mobile browser checks.

See [BUILD-NOTES-v0.52.2.md](BUILD-NOTES-v0.52.2.md) and [FIDELITY.md](FIDELITY.md) for scope and validation. Rules reference: [Supercell deck slots](https://support.supercell.com/clash-royale/en/articles/cards-and-decks-6.html), [Heroes](https://support.clashroyale.com/hc/en-us/articles/49484957323163-Heroes), [Card Evolution](https://support.supercell.com/clash-royale/en/articles/card-evolution-8.html), and [inventory conversions](https://support.supercell.com/clash-royale/en/articles/conversions-8.html).

Double-click **open offline.bat** to play at http://127.0.0.1:8081. Saves, learning archives and replays use this project's own namespace. Develop with Node.js 22+, npm run build, npm run serve, and npm test. Source assets omitted from the portable tree are restored from verified dist files by build/test commands.
<!-- /project-identity -->

# Historical baseline — Web Royale v0.50.0

**Full build:** revised spell animation timing, body sizes, Rocket orientation,
stable fire/smoke trails and impacts, filled area effects, zoomed Touchdown pitch
with separate stadium decorations, and duplicate practice decks in all saved modes.
Includes Ultra graphics, individual swarm levels, animated custom environments,
cleaner shop cards and 11,284 opponent decks from v0.49.

Export your save, close the old game/launcher, extract the entire ZIP, and run
`open offline.bat`. The ready-to-serve website is in `dist/`. Keep the same browser
and localhost address to keep accessing the same browser save.

See **BUILD-NOTES-v0.50.0.md** for changes and validation. Earlier replay engines remain packaged. No live
deployment is performed by downloading or extracting this archive.

For development, use Node 22+, `npm test`, `npm run build`, and `npm run serve`.
The source restore step recovers duplicated source image/audio files from the
verified `dist/` to keep this full-build download smaller.

---

## Historical release and project documentation

The sections below describe earlier releases. v0.52.2 build notes take precedence
where behavior, versions, prices, mode lists, or timing differ.

# Rebuilt v0.40.1 distribution

See `BUILD-NOTES-v0.40.1-Rebuilt.md` for recovery scope, launch instructions and fresh verification. This is a rebuilt replacement for the expired archive.

# Web Royale v0.40.0 - stacking streak rewards and shop updates

Ranked win-streak bonuses now stack and pay on every ranked win: each completed
three-win tier adds a 100–300 gold range, and each completed five-win tier adds a
1–10 gem range. For example, wins 6–8 award 200–600 extra gold; wins 10–14 award
2–20 gems. The actual reward rerolls per match and appears in the existing gold
and gem boxes. Losing or drawing a ranked battle resets the tiers. Non-ranked
battles neither advance nor break the ranked streak, and cannot earn its bonuses.

Paid emotes cost 50 gems; paid tower skins cost 100. Gem Shop bundle ranges are
150–500 Common, 50–100 Rare, 10–15 Epic, and 2–3 Legendary cards, at the existing
20/50/100/200 gem prices. Its two-purchase refresh remains unchanged.

Treasure Chests: Silver 15, Golden 35, Magical 50, Giant 65, Epic 80, and Legendary
100 gems. Shop chests open immediately and do not occupy a battle chest slot.
Rarity-only chests require an eligible card pool; a locked offer never charges
gems for an empty chest. Existing collected cosmetics, saves, currency, partial
Gem Shop purchases, card frames, result boxes, and Trophy Road cleanup are kept.

See `BUILD-NOTES-v0.40.0.md` and `docs/verification-v040/VERIFICATION.md` for the
changes and verification. Existing saves use `web-royale-classic-v4`. Export a
save before replacing an old build. This package is not deployed to the live site.

## Retained v0.38 features

This update fixes the reproduced bank/structure deployment stalls, corrects live shield HUD indicators, gives the Daily Shop five times as many cards, adds a six-slot gem-priced card shop that refreshes after two purchases, removes the stretched deck background, and spreads Goblin Barrel troops safely around the landing point. It also reuses navigation routes/obstacles and preserves old replay simulations. See `BUILD-NOTES-v0.38.0.md` and `docs/verification-v038/VERIFICATION.md` for the exact rules, prices and test scope.

This version supports Safari's **Share → Add to Home Screen** with its own icon and standalone display. The outer frame respects iPhone safe areas, Safari toolbars, rotation and keyboard viewport changes. New recordings use simulation 0.38, with historical 0.32 recordings routed to their frozen engine. See `BUILD-NOTES-v0.33.0.md` for phone setup and validation.

Extract the complete ZIP and run `Web-Royale/open offline.bat`. Editable source, original local assets, the ready-to-play website and Windows launchers are included.

Troops now approach their selected Crown diagonally instead of first moving sideways to an exact lane center and then turning forward. Lane preference still chooses the appropriate Princess Tower, or King when that Princess is absent. Ground troops route around river banks and live buildings; flyers can cross water and buildings. Nearby eligible enemies still distract troops.

Nearest eligible enemies inside sight, attack locks, card-specific target categories, Mortar's blind spot and Electro Wizard's committed primary bolt remain in effect.

Use **Other Modes → Sandbox** to select any card, team and **level 0–99**, configure individual towers, and inspect target lines without a time limit. The previous UI, chest-opening, animation and original event-tower improvements remain.

New replays use engine 0.38; historical 0.32, 0.31, 0.30, 0.28 and 0.26/0.27 simulations are preserved for existing recordings. See `BUILD-NOTES-v0.32.0.md` for the movement correction, reference evidence and verification.

## Open the full game

Extract the entire ZIP and run `Web-Royale\open offline.bat`. Close an older Web Royale
launcher first; keep the current launcher window open while playing. The included
Windows PowerShell/C# opener serves the ready-made `dist/` over localhost. No Unity,
emulator, Node installation, account login, or first-run asset download is needed to play.
The launchers are unchanged from the supplied build. This update was checked on Linux
with Node and Chromium; the Windows opener was not executed on a Windows machine in
this session. Historical launcher checks remain recorded in earlier release notes.

Use Settings → Export Save before changing browser, localhost port, or clearing data.
The profile key and usual localhost origin remain unchanged. Old cards, XP, trophies,
chests, emotes and retired-skin refunds remain supported. A former local clan is migrated
without charging again: its name, donation count and the player's own messages are
preserved, but the old shell's automatically fabricated members/history are removed.
A newly created clan starts with its creator alone and no previous messages.

## Arena and combat

The accepted v0.25 camera, portrait proportions, original arena scene graphs and normal
Crown Tower renderer are retained. No new zoom or tower scaling is introduced here.
All 15 arenas keep their detailed normal/overtime layers. Placement and drawing still
share the same screen/world transform.

Troops and buildings use tile-aligned deployment. Obstructed troop formations receive
small legal adjustments rather than snapping across the river or into enemy territory;
area spells retain continuous aiming. The deployment preview uses the same placement
result as the command. Radius-aware path planning and movement now agree about river
banks and both bridge corridors. Stale blocked routes are recalculated without teleporting.
Melee chasers can switch from a distant target to a closer valid target; a legal committed
swing is not repeatedly cancelled simply because another unit moves closer.

## Fixed match rules

Trophy Road is the main Battle button: player cards and King Tower use collection levels.
Challenge, Training, Friendly, 2v2 and Clan War games use Level 9 cards and Kings. The
choice to change level mode is removed. Opponents are Expert, with deterministic occasional
one- or two-game Hard streaks. Placement previews and legal-match reward learning are
always on. Cheat matches are excluded from learning/rewards; replay playback is read-only
and cannot award trophies, gold, XP, chest wins or learning updates.

## Hour Shop and items

Twelve card slots refresh on hourly UTC boundaries:

| Slot 1 | Slot 2 | Slot 3 |
|---|---|---|
| Common | Common | Common |
| Rare | Rare | Rare |
| Epic | Epic | Epic |
| Legendary | Legendary | Legendary |

The timer displays HH:MM:SS and refreshes visible offers at rollover. Future-arena cards
are never sold. An unavailable rarity retains three locked slots; where a rarity has fewer
than three eligible cards, offers may repeat within that row. Purchased slots remain
purchased for that hour. An expired or changed offer is rejected rather than charging for
a different card. The first copy from any eligible card reward, including a trade, discovers
that card. Wild cards/books still require an already discovered card.

Currency packs, practice currency grants and resource-counter plus buttons are removed.
The Daily Shop free row, earned currency and gem-priced chest/emote offers remain.
Emotes still rotate three offers hourly. The complete 206 imported animation/icon pairs
remain local, with their original timelines, masks and white bubble presentation.

Books, Book of Books, Chest Key and Magic Coin now use the original sprites cropped from
the bundled game atlas, not CSS placeholders. Crop rectangles, alpha processing and
checksums are in `assets/ui/v260-atlas-provenance.json`. Existing item use still spends
inventory through the real card-upgrade/chest paths. Gold Rush, Gem Rush and Elixir Pump use recovered original event assemblies;
retired recolors remain retired. Complete seasonal assemblies are not available.

Held chest requirements: Silver 1 win, Gold 3, Gem 2, Magical 4, Legendary 10,
other supported types 5. Locked chests show remaining wins with a space: “1 Win”, “2 Wins”.

## Offline identities, clans and friends

The world addresses 4,000,000 stable player IDs and 50,000 generated clans across the
historical road through Ultimate Champion. IDs, names, tags, rank bands, decks, upgrade
profiles, activity tendencies and membership are seeded, not freshly invented every time
an opponent's profile is opened. Lookup is on demand: four million games do not run in
parallel, and the population is not a four-million-row browser save. Observed opponent
ladder results and donor contributions update the affected identities' stored statistics.

Friends starts empty. Open an opponent in Battle Log or a current clanmate's profile to
add them. Joining a clan does not automatically add its members as friends. Search and
browse clans, inspect their names/badges/descriptions/members, join Open clans, create a
new clan, manage its description/recruitment/roles, and manually remove friends. The
badges and action buttons use available original game imagery; the complete native badge
catalogue is not bundled.

Open new clans recruit on seeded schedules: some pick up quickly, others grow over weeks.
Offline elapsed time is caught up on the next open, with bounded recent chat history.
There are no members or backdated conversations inserted at clan creation. Invite-only
and Closed clans do not automatically accept the player through Open-clan joining.

Requests respect a seven-hour cooldown and Epic Sunday. Donation quantities, limits,
gold, XP and actual card-copy deductions are tracked. Other members can fill requests
later, subject to arena eligibility and per-donor limits. Trades reserve a matching token,
settle actual card bundles once, and refund an unaccepted token on cancellation, expiry
or leaving. Clan chat supports text, animated emotes, requests, trades and shared replays.
The dialogue is a local contextual template simulation, not an unrestricted language model.

## Clan Wars II

Open Clan → Clan Wars. This implements the post-summer-2021 structure, with the player's
requested Level 9 override: three Training Days, four Battle Days, four unique daily
war decks, battles, rotating modes, best-of-three Duels, boat attacks, defense editing/
testing, five-clan medal/movement standings, weekly rewards and final-week Colosseum.
King Level 6 and at least ten clan members are required. The local event calendar uses UTC.

Only decks actually played are consumed. Opponents keep the same identity during a Duel
and use different war decks each round. Decks reset daily; used decks cannot be edited.
A started unfinished war battle can be forfeited from the River page, not rerolled for free.

Three boat towers each hold four troop cards, wake on damage and summon defenders.
Damage persists after real boat attacks; destroyed defenses stay down for the rest of the
week. There is no obsolete midweek boat-repair task. A boat attack has its own two-minute
clock and destruction bonus phase. The Trader offers daily card bundles, token exchanges
and gem rerolls. Rewards are applied once and respect arena gates.

This is a working offline interpretation of the main war systems, not a recovered native
Clan Wars client. River UI and boat presentation are adapted to the browser; some scheduling,
reward calibration, opponent activity and interactions remain simulations. See FIDELITY.md.

## Replays and storage

New battles store their actual shuffled initial cycles, seed, levels, arena and timestamped
card deployments. Battle Log → Replay plays that recording without rerunning the AI policy.
Playback supports pause/resume, speed changes and restart. Share a recorded battle into
clan chat. Matches from older releases without a recording remain in the log but cannot
be reconstructed into genuine replays.

Profiles use the existing browser/local save. Replays use a separate IndexedDB store,
retaining the latest 40 recordings (up to 4 MB each); a session-only fallback is used when
IndexedDB is unavailable. Settings → Export Save exports the profile, not that separate
replay database. Clearing browser storage removes both. Social state is bounded: 200 friends,
200 recent encounters, 4,000 observed identity deltas, and 12 detailed clan records. Seeded
identity/clan metadata remains reproducible outside those detailed caches. Raw match
learning archives retain their existing AppData/browser storage behavior.

No real humans, accounts, payments, external chat services or Supercell connections are
part of this local world. Simulation provenance is stated in Settings.

## Rebuild and verify

Node 22+ is required for source work, not for the Windows offline opener:

```text
npm run build
npm test
npm run serve
npm run test:browser
```

Full current browser checks (Python, Playwright, Chromium):

```text
PYTHONPATH=tests python -m unittest -v browser_v240 browser_v241 browser_v250 browser_recovery
```

The archive contains source, converted JSON, tools, tests, both launchers and `dist/`.
To avoid duplicate asset copies, source PNG/WebP/WAV bytes are stored once in `dist/assets/`;
`tools/restore-source.cjs` restores verified source copies before rebuilding/testing. Original
input APKs/ZIPs and font binaries are not included. This remains a historical 102-card,
Level-13 reimplementation; universal tick-for-tick native parity has not been established.
