# Web Royale v0.26.0 — build report

## Delivered scope

Full offline browser build based on the supplied v0.25.0 project. Includes the game,
updated editable source, converted assets, original 206 imported emote animations,
regression tests, both Windows offline launchers and ready-to-play `dist/`.

The accepted standard arena appearance is preserved. `src/battle-view.js`,
`src/v250.css`, `src/draw.js`, `assets/native/data.json` and
`assets/presentation/data.json` are byte-identical to the supplied v0.25.0 archive.
Hashes are recorded in `docs/qa/v026/preservation.json`. Normal tower assembly is
unchanged; the renderer adds a separate adapter for boat battles only.

## Combat and placement

- Radius-aware navigation and movement share one river/bridge passability predicate.
  The former center-only planner could route through a bank position the swept body
  collider rejected. Bridge paths now agree with actual motion; blocked cached routes
  are recalculated without teleports or disabling collisions.
- Soft troop placement tries nearby legal tile anchors and adjusts obstructed formation
  members. Buildings retain footprint-based grid placement; area spells retain continuous
  targeting. Preview and live command use the same result and existing camera transform.
- Melee chasers can retarget from a distant living target to a closer legal enemy. A
  committed in-range swing remains stable rather than continually cancelling itself.
  Building-only, air/ground and special source targeting categories remain enforced.
- Tests include oblique bridge entries in both directions, Knight/Giant/Golem/P.E.K.K.A,
  six crowded crossing scenarios with fifteen units each, and preview/deploy agreement.
  These are targeted regressions, not proof of every native-game combat interaction.

## Hour Shop and original item art

- Exactly twelve card slots, arranged in four three-card rarity rows: Common, Rare,
  Epic, Legendary. Refreshes on hourly UTC boundaries and displays HH:MM:SS.
- Three locked slots remain for a rarity not yet available in the player's arena.
  Fewer than three eligible cards in a rarity may produce repeated offers in that row.
  Higher-arena cards cannot leak into the shop. The purchased slot remains bought for
  that hour; stale-window or changed-card purchases fail without charging.
- Removed currency purchase/practice-grant UI and resource-counter plus buttons.
  Existing earned currency, the free daily gift and gem-priced item offers remain.
- Books for four rarities, Book of Books, Chest Key and Magic Coin use seven original
  sprites isolated from the bundled `fx-ui_spells-1.webp` atlas. Source bounds, output
  and source hashes are recorded in `assets/ui/v260-atlas-provenance.json`.
- Source images remain images with their aspect ratios intact, not generated imitation
  item models or CSS book/key/coin placeholders. Functional item consumption is retained.

## Fixed game rules

- Main Trophy Road queue uses the player's collection card and King levels.
- Challenges, Training, Friendly, 2v2 and Clan War queues use Level 9 cards and Kings.
- Removed public level-mode, preview, learning and bot-difficulty switches. Legal-match
  learning and previews are forced on. Cheat/replay matches cannot contribute training
  rewards; war launch rejects active cheats.
- Expert difficulty is the standard, with deterministic occasional one- or two-game
  Hard streaks. Headless self-play remains fixed at Level 9.

## Offline world and social transactions

- 4,000,000 reproducible player identities and 50,000 generated clans are addressable
  through deterministic lookup, not four million simultaneous workers or stored rows.
  Profiles carry names/tags, trophies, decks, levels, clan membership and activity style.
  Observed opponent ladder results and donation contributions update stored identity
  deltas, rather than discarding the outcome when a profile is reopened.
- Friends start empty. Players manually add encountered Battle Log opponents or current
  clanmates. Joining a clan never automatically befriends its members.
- Clans have generated names, original-image badge choices, descriptions, member lists
  and recruitment settings. Search filters cheap metadata before building full rosters.
  The no-match search benchmark improved from about 5.49 seconds to 71 milliseconds in
  one local run; that is not a device-independent performance guarantee.
- Creating a clan starts with only the creator and no backdated chat. Open clans recruit
  on seeded fast or slow schedules; slow recruitment spans weeks. Elapsed time catches
  up when the game next opens. Existing local clan names and player-written posts migrate
  without charging a second creation cost or retaining the old shell's fabricated history.
- Requests use cooldowns, Epic Sunday and per-donor limits. Donations deduct actual card
  copies and award source rarity XP/gold. AI contributions arrive over time and maintain
  their per-request donor accounting even across repeated small updates.
- Token trades reserve tokens, settle actual rarity-sized card bundles once, and refund
  unaccepted tokens on cancel/expiry/leave. An eligible undiscovered received card is
  unlocked immediately. Future-arena cards remain unavailable.
- Clan chat integrates text, original animated emotes, requests, trades, member profiles
  and shared recorded replays. Original available action icons replace text-only symbols.

## Clan Wars II — functional offline interpretation

The calendar follows the post-summer-2021 structure rather than combining incompatible
2020 and 2021 rules. The user's Level 9 rule overrides historical collection-based war
levels. Entry requires King Level 6 and ten clan members.

Working loops include three Training Days and four Battle Days; four unique daily war
decks; ordinary and rotating-mode battles; best-of-three Duels; five-clan medal and
movement standings; alive-defense movement bonuses; weekly participating-member chest
claims; clan trophy changes; and final-week Colosseum Duels.

Duels retain the same opponent and use distinct opponent/player war decks. Only decks
actually played are consumed, and used decks cannot be edited. Pending war battles can
be explicitly forfeited rather than rerolled without spending a deck.

Boat defense editing/testing uses three towers with four troop cards apiece. Real boat
attacks activate defenses on damage, spawn defenders, apply their own clock/elixir
phases, and preserve resulting defense HP. Destroyed defenses stay down for the week;
obsolete midweek boat repair is intentionally absent. The boat display is assembled
from three original atlas components, not a recovered full native boat scene. The
component extraction is documented in `assets/ui/v260-boat-provenance.json`.

The daily Trader provides three receive/give choices, matching-token card-bundle trades,
limited daily settlement and gem-paid give-option rerolls. Transactions use actual
player copies and preserve first-copy arena-eligible discovery.

## Replays and save behavior

New match recordings save initial shuffled hand/queue, seed, RNG state, actual card and
King levels, arena, boat configuration when present, and timestamped deployment commands.
Playback reconstructs recorded inputs instead of rerunning the opponent policy. Pause,
speed and restart work; playback cannot grant progression or learning rewards. Old log
entries without recordings are kept but cannot be turned into genuine replays.

Profiles retain the existing save origin/key. Replays have a separate IndexedDB store
and a session-only fallback when storage is blocked. Profile export does not include
that separate database. Bounded retention: forty replays up to four MB each, two hundred
friends/recent encounters, four thousand observed player deltas, twelve detailed clan
records. Unobserved base procedural identities are reproducible outside those caches.

## Fresh verification results

| Check | Result | Evidence |
|---|---|---|
| Full current Node suite | **603 passed, 0 failed, 0 skipped** | `docs/qa/v026/release-tests.txt` |
| Current packaged Chromium suites | **44 passed** | `docs/qa/v026/release-browser.txt` |
| Browser errors/missing assets | **0 / 0** | `docs/qa/v026/browser/errors.json` |
| Original arena preservation | **5 identical source/data hashes** | `docs/qa/v026/preservation.json` |
| Build | **0.26.0, 1,181 runtime files, 283,705,032 bytes** | `docs/qa/v026/release-build.txt` |
| Full package integrity | **ZIP CRC, unique paths and 1,181 runtime hashes passed** | Separate package-verification receipt |
| Clean archive extraction rebuild | **Exit 0; all runtime files byte-identical** | `Web-Royale-v0.26.0-Clean-Rebuild.txt` |
| Original boat sprite extraction | **3 pixel-identical verified crops** | `assets/ui/v260-boat-provenance.json` |

Node run: 286.420 seconds. Chromium run: 191.368 seconds. Browser checks span UI/DPI,
original emote timelines and masking, all fifteen arenas in normal/overtime states,
real pointer placement, and sixteen new end-to-end economy/social/war/replay scenarios.
These include two sequential Duel rounds with different decks, a playable boat attack,
persistent boat damage, a token trade accepted by an AI member, request filling, donation
XP, hour rollover, manual friends and a genuinely empty newly created clan.

Earlier QA logs contain failed pre-fix tests and superseded-contract assertions. The
current results above come from new complete runs after the last production-code changes.
Tests for removed gem grants, old dummy clan interfaces and 9-slot/3-hour offers were
updated to their explicitly requested replacements, not silently skipped.

The release's separate package-verification receipt records ZIP integrity, individual
runtime hashes and rebuilding from a fresh archive extraction. PNG/WebP/WAV source bytes
are stored once under `dist/assets`; `restore-source.cjs` verifies and restores them before
rebuilding. Input archives/APKs, generated scratch probes and font binaries are excluded.

## What is not claimed

This does not prove universal tick-for-tick native combat parity, every feature from every
Clan Wars version, or an AI ecosystem indistinguishable from humans. Clan conversation
uses contextual templates, unobserved activity/war contributions are sampled, and there
is no fully simulated individual resource economy for four million accounts. River and
boat presentation, UTC reset schedules, local reward tuning and some social-management
features are browser adaptations. Only eight available original badge images are used;
missing official tower-skin models are not added.

No Windows machine was available to execute the BAT. Chromium's sandbox blocks ordinary
top-level navigation, so packaged-browser verification used the project's intercepted
same-origin fixture. The storage fallback plus profile JSON/repository round-trips were
tested; normal-origin persistent IndexedDB on Windows was not. Code review was inline;
no independent reviewer agent was available.

## Historical primary references

- Supercell, 5 July 2021, “Clan Wars: What Has Changed?”
  https://supercell.com/en/games/clashroyale/blog/fun/clan-wars-what-has-changed/
- Supercell, 31 August 2020, “CLAN WARS 2 IS HERE!” (2021 changes supersede its repair rules)
  https://supercell.com/en/games/clashroyale/blog/release-notes/clan-wars-2-is-here/

No Reddit claims were used as verification. All world and gameplay runtime behavior is
local: there are no human accounts, payments, public lobbies or Supercell connections.
