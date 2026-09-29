# Web Royale — Complete Project Handoff for Codex

**Prepared:** 2026-09-27  
**Owner:** Nano  
**Project:** Web Royale  
**Current continuation baseline:** `Web-Royale-v0.26.0-Repacked-Full-Build.zip`  
**Application version:** `0.26.0`, archive-recovery edition  
**Purpose:** Continue the existing browser game without losing the requirements, accepted visuals, progression rules, assets, implementation history, or known limitations from the project conversations.

> **Start with the existing project. Do not start another game, switch engines, replace the accepted arena, or reintroduce superseded settings.** The target is the Clash Royale experience with local AI participants and persistent learning, not a vaguely similar card battler.
>
> **Read Sections 1–5 before editing.** Section 4 resolves contradictory older instructions. Requirements, implementation reports, and independently inspected source are deliberately distinguished.

## Contents

1. [Instructions for the receiving agent](#1-instructions-for-the-receiving-agent)
2. [Current package and the archive-corruption incident](#2-current-package-and-the-archive-corruption-incident)
3. [Source precedence and evidence labels](#3-source-precedence-and-evidence-labels)
4. [Final decisions and superseded instructions](#4-final-decisions-and-superseded-instructions)
5. [Project identity, platform, and historical reference](#5-project-identity-platform-and-historical-reference)
6. [Arena appearance: accepted and protected](#6-arena-appearance-accepted-and-protected)
7. [UI, text, icons, and button presentation](#7-ui-text-icons-and-button-presentation)
8. [Decks, Collection, and card ownership](#8-decks-collection-and-card-ownership)
9. [Dynamic AI card levels and King progression](#9-dynamic-ai-card-levels-and-king-progression)
10. [Player XP and upgrades](#10-player-xp-and-upgrades)
11. [Win-based chests](#11-win-based-chests)
12. [Hour Shop, currencies, and cosmetic rotations](#12-hour-shop-currencies-and-cosmetic-rotations)
13. [Magic items and original artwork](#13-magic-items-and-original-artwork)
14. [Emotes and missing tower skins](#14-emotes-and-missing-tower-skins)
15. [Soft-grid placement, formations, and previews](#15-soft-grid-placement-formations-and-previews)
16. [Pathing, collision, target selection, and attack timing](#16-pathing-collision-target-selection-and-attack-timing)
17. [Card-specific mechanics and spell animation requirements](#17-card-specific-mechanics-and-spell-animation-requirements)
18. [Match states, elixir, crowns, and results](#18-match-states-elixir-crowns-and-results)
19. [Modes and non-configurable match rules](#19-modes-and-non-configurable-match-rules)
20. [Learning AI, fair information, and self-play](#20-learning-ai-fair-information-and-self-play)
21. [Persistent AI identities and world simulation](#21-persistent-ai-identities-and-world-simulation)
22. [Clans, friends, recruitment, and chat](#22-clans-friends-recruitment-and-chat)
23. [Donations and trading](#23-donations-and-trading)
24. [Clan Wars II](#24-clan-wars-ii)
25. [Battle logs and actual replays](#25-battle-logs-and-actual-replays)
26. [Saves, migration, local hosting, and failure handling](#26-saves-migration-local-hosting-and-failure-handling)
27. [Verified repository map and build workflow](#27-verified-repository-map-and-build-workflow)
28. [Acceptance tests and release discipline](#28-acceptance-tests-and-release-discipline)
29. [Known gaps, follow-up priorities, and misleading old documentation](#29-known-gaps-follow-up-priorities-and-misleading-old-documentation)
30. [Chronological requirement and release history](#30-chronological-requirement-and-release-history)
31. [Older master-prompt ambitions: retain as history, not automatic scope](#31-older-master-prompt-ambitions-retain-as-history-not-automatic-scope)
32. [Asset and reference transfer inventory](#32-asset-and-reference-transfer-inventory)
33. [Source-derived card roster](#33-source-derived-card-roster)
34. [Source-derived configuration tables and baseline hashes](#34-source-derived-configuration-tables-and-baseline-hashes)
35. [Evidence/source index](#35-evidencesource-index)
36. [Suggested first Codex task](#36-suggested-first-codex-task)

---

## 1. Instructions for the receiving agent

Continue **Web Royale**, the existing offline browser project. The human player is Nano; opponents, teammates, friends, clanmates, and rival clans are simulated AI identities.

### Working agreement

- Inspect the actual supplied source and current files before explaining that something is unavailable. Earlier sessions repeatedly claimed the project was missing even when its ZIP or files were accessible.
- Preserve completed work and save compatibility. Do not reset the project to an eight-card demo or an unrelated starter template.
- The user expects implementation and a runnable full build when requesting changes. A checklist or isolated patch is not an acceptable substitute for a requested build.
- Do not ask routine approval questions. Make reasonable, documented decisions, implement, and verify. Ask only for genuinely missing information that cannot be resolved from the code, supplied references, or recorded decisions, or for a consequential external/destructive action.
- Deliver the **full ZIP**, including source, data/assets, ready-to-play `dist/`, and `open offline.bat`. Do not require a previous version to make an update usable.
- The accepted v0.25 arena appearance must remain intact. Later combat/economy/social changes are not permission to alter that camera again.
- Use the original supplied artwork and animations when available. Do not pass off a recolor, generic icon, bouncing static image, placeholder, or screenshot backdrop as the requested original asset.
- Do not copy the phone's Dynamic Island, recording overlays, home indicator, browser chrome, or a user-drawn annotation into the game.
- Do not claim complete 1:1 parity, a working model, a successful build, a passing suite, or a finished archive without the relevant evidence.
- Separate a desired feature from code that exists and from behavior tested against the real game. A catalog entry is not proof that its mechanic works.
- Keep the runtime local. No Supercell login, public-match connection, official store integration, paid inference dependency, or human multiplayer service is required for this project.
- The user describes this as a private project and says the material is free use. That is the user's stated context, **not a verified license grant**. Preserve asset provenance; do not change the task into a licensing debate or silently publish/monetize the project.

### Practical continuation sequence

1. Open the repaired v0.26 archive, not the truncated first v0.26 attachment.
2. Read `RECOVERY-NOTES.md`, this document, `README.md`, `FIDELITY.md`, and `LEARNING.md`.
3. Check `package.json`, module order, source restoration, and the actual available tests.
4. Establish a new local baseline with the real test/build commands. Historical test totals are not a fresh result.
5. Reproduce the specific issue, write a useful regression, make a narrow fix, and check the rendered game.
6. Preserve the accepted arena and all original animated emotes while making unrelated changes.
7. Package to a temporary filename, close the archive, test it, extract it independently, and only then deliver it.

---

## 2. Current package and the archive-corruption incident

### Correct file to transfer

| Field | Current baseline |
|---|---|
| Filename | `Web-Royale-v0.26.0-Repacked-Full-Build.zip` |
| Exact size | `237277416` bytes |
| SHA-256 | `fe82128360ae2501634e14ffce420430656f60fe27a7440f9ef37ce43766c133` |
| ZIP entries | `1513` |
| Root directory | `Web-Royale/` |
| Runtime files in `dist/release.json` | `1181` |
| App bundle | `app.4edeb8d0c883.js` |
| App-bundle SHA-256 | `4edeb8d0c883ef1548f8d64e089546ae6f2506bf09d873e98c2348f80ebbd246` |
| Compression | Standard Deflate; no encryption or split volumes; no ZIP64 requirement |

**Freshly checked while preparing this handoff:** the exact size and SHA-256 above, all ZIP-entry CRCs, and all 1,181 manifest-listed runtime hashes. All passed. This handoff task did **not** rerun gameplay tests, browser tests, the Windows launcher, or a clean source build.

### What happened

The initial `Web-Royale-v0.26.0-Full-Build.zip` delivered to the conversation was only **71,821,678 bytes**, rather than the **286,387,854 bytes** in its original packaging receipt. It had no ZIP central directory and ended inside a compressed file. This was actual attachment corruption, not evidence that the user's extractor was wrong.

The recovery retained the complete, CRC-checked v0.26 JavaScript bundle and reconstructed its **44 bundled modules** without changing their game code. Source data and emote scenes before the cutoff were recovered. Unchanged art, launchers, and scaffolding were restored from v0.25.

The trailing original v0.26 HTML, CSS, tools, and tests were not all recoverable. The repaired package therefore uses reconstructed compatible support/layout files. Seven magic-item images and three boat components were recreated from the original atlas regions recorded in provenance files. PNG encoding/padding may differ, but these were not replaced with invented artwork.

**Consequences for Codex:**

- The recovered game-code bundle is identical to the intact original v0.26 bundle.
- The full repaired ZIP is **not** byte-identical to the unavailable complete first package.
- Original v0.26 UI screenshots are references for checking reconstructed CSS, not proof that every original layout file survived.
- The original reported **603-test** Node suite was beyond the corrupt cutoff. The available recovered suite was reported as **522 passing tests**, not the same 603 tests rerun.
- The repair report records **18 distinct packaged-browser checks**, including an eight-test recovery suite repeated from the extracted archive.
- Old test reports are historical evidence. Do not silently promote them to current verification.
- Keep the corrupt archive only as a forensic artifact, never as the development baseline.

The repair did not justify clearing the user's profile, browser storage, replay database, or AppData learning files.

---

## 3. Source precedence and evidence labels

### Precedence

1. The user's **latest explicit project instruction**.
2. An explicitly accepted visual reference/result, particularly the v0.25 arena.
3. The repaired v0.26 source and assets, for what is actually implemented.
4. Current build/repair notes, interpreted as reports rather than automatic proof.
5. Earlier implementation plans, build notes, and screenshots.
6. The older general all-AI master prompt, **only where it does not conflict with the browser project's later decisions**.

The original broad master prompt targeted a contemporary Windows/Unity game. The actual project later chose a historical browser implementation. Do not accidentally import the master prompt's Unity setup, 2026 balance, modern special slots, payment provider, or Pass Royale into the active browser build.

### Evidence labels used in this document

- **REQUIRED:** explicit user request or a continuing project requirement.
- **ACCEPTED:** the user explicitly approved this result; protect it from regression.
- **OBSERVED:** directly read from the repaired archive/source while preparing this handoff.
- **REPORTED:** a prior assistant/build report says it was implemented or tested; rerun relevant checks before claiming it now.
- **OPEN:** missing, partial, unverified, or not accepted as complete.
- **SUPERSEDED:** an old instruction/implementation that must not override the newer rule.
- **INHERITED DESIGN:** engineering intent from the older master prompt, not proof of an implemented feature or permission to change the historical scope.

This is a consolidated continuation specification, not a verbatim export of every chat. Earlier project-specific instructions were recovered through available conversation context and documents. Any unavailable material is not silently invented.

---

## 4. Final decisions and superseded instructions

| Topic | Final active decision | Older instruction/implementation to avoid |
|---|---|---|
| Platform | Existing JavaScript browser game; offline Windows launcher | New Unity/native rewrite or emulator dependency |
| Visual target | Accepted v0.25 reference-matched arena | Repeated estimated zoom adjustments, short 9:16 battle frame |
| Arena detail | Full original scenery is loaded; camera crops naturally | Remove details, draw a second enlarged board behind the first, zoom out to contain every prop |
| Menus/battle aspect | Menus `540×960`; battle `540×1172` | Force all screens into `540×960` |
| Main ladder levels | Trophy Road uses collection card and King levels | User-switchable equal levels on the ladder |
| Other queues | Every non-Trophy-Road mode uses Level 9 cards and Kings | Collection levels in friendly/challenge/2v2/war queues |
| Difficulty | Expert normally; occasional one- or two-game Hard streaks | Persistent user-selected Normal/Hard/Expert switch |
| Placement previews | Always on | User setting to turn them off |
| Reward learning | Always on for eligible legal matches; exclude cheats/replays | Disable-learning switch or training on cheat matches |
| Card ownership | First actual eligible copy unlocks it, regardless of acquisition source | Chest-only unlocking or automatic ownership merely for reaching an arena |
| Eligible missing-card label | `Not Found` | `Shop / Chests / Road...` overflowing labels or `Find in Chests` |
| Decks page | Deck at top; card browser below excludes cards already in that deck | Hide the browser entirely, or show duplicate in-deck entries below |
| Collection → Cards | All cards, including in-deck and undiscovered entries | Reuse the deck-exclusion filter |
| Collection categories | Cards, Emotes, Tower Skins, Magic Items subpages | One enormous appended list under the deck |
| Collection in Shop | Remove it | Inventory/Collection panels between Shop sections |
| Card Shop title | `Hour Shop` | `Daily Deals` |
| Card Shop size | 12 slots, 3 per rarity row | 6 daily offers or 9 three-hour offers |
| Card Shop reset | Hourly, with seconds visible | Daily or three-hour refresh |
| Currency counters | No `+` purchase buttons | Plus icons that lead to currency packs |
| Currency sales/grants | Remove purchasable currency and practice top-up controls | Gem packs, coin packs, repeated free practice-currency buttons |
| Other economy | Earned currency, existing daily gift, and gem-priced items remain | Remove all gems or all spending just because currency packs were removed |
| Held chests | Unlock through wins | Timers for newly held battle chests |
| Chest labels | `Locked`; remaining `1 Win`, `2 Wins`, etc. | `Win to unlock`, `0/3 Wins`, or visually collapsed `2Wins` |
| Emotes | Original animated character timelines inside white bubbles | Only nine static icons; bubble bounce presented as character animation |
| Tower skins | Actual original skin assets; front-facing previews | Custom recolors sold as official skins |
| Retired skins | Preserve once-per-ID refunds and fallback to Classic | Re-add recolors or refund them repeatedly |
| Friends | Empty by default; add manually from encountered profiles | Automatically populate friends or friend every clanmate |
| New player clan | Creator only, no backdated history; recruit over time | Instant fabricated members/chat in a brand-new clan |
| AI population | Stable identities across encounters and social features | Reroll a new anonymous bot on every profile opening |
| Wars | Historical post-summer-2021 Clan Wars II with Level 9 override | Mix in removed midweek boat repair or unrelated modern systems |
| Delivery | Tested full ZIP with both launchers | Patch-only delivery or links to unverified/truncated archives |
| Pass Royale | Earlier browser-specific request was to remove it | Reintroduce premium pass solely because the older master prompt requested it |

**Pass nuance:** legacy pass fields/functions still exist in source. Their existence is not a new user request to restore Pass Royale. Preserve compatibility data unless safely migrated; do not re-enable a paid-pass screen by accident.

---

## 5. Project identity, platform, and historical reference

### Desired experience

A close, recognizable recreation of Clash Royale: real card identities, arena presentation, deployment feel, unit interactions, elixir/cycle decisions, progression, clans, wars, and events. The deliberate difference is that other participants are local AI identities, with persistent learning and a convincing simulated world.

The user repeatedly rejected answers that offered a generic inspired game, another implementation checklist instead of a build, static placeholder content, or a claim of exactness unsupported by the result.

### Active technical reference

**OBSERVED:** the runtime reports card/data snapshot **`3.2557.2`**, with **102 cards** and a normal owned-card/King cap of **13**. The asset archives were named `Clash Royale-3.5.0.apk` and `CR-3.5.0-Graphics.zip`; filenames and data fingerprints are different identifiers, not a reason to silently replace the loaded catalog.

The progression module deliberately uses the **June-2021-style 14-arena road through Serenity Peak**, followed by leagues. Clan Wars uses post-summer-2021 rules. The accepted arena screenshot comes from a differently balanced reference presentation; its visible HP values are not instructions to overwrite the pinned historical stats.

This is a documented composite reference:

- Card balance and original data: `3.2557.2`.
- Progression order: 14 arenas ending at Serenity Peak, then leagues.
- War lifecycle: post-summer-2021 Clan Wars II.
- Visual composition: supplied screenshots/video, especially `IMG_4991.png` and accepted v0.25.
- Custom departures: AI world, learning, win-based chests, Hour Shop, fixed Level 9 alternate queues, and tailored bot-level distributions.

Do not add current balance changes, Champions, Evolutions, Heroes, modern tower troops, or later card rosters merely because an online page or older 2026 master prompt mentions them.

### Platform

- Browser-first, same-origin static `dist/` assets.
- Windows 10/11 desktop use is central; input should also remain touch-compatible.
- No Unity installation, Android emulator, official game client, account login, or first-run asset download is required for playing the packaged build.
- The Windows BAT starts a local host for the browser. Source development uses Node 22+.
- A landscape desktop window may have black side margins. Never stretch competitive geometry to occupy widescreen space.
- Preserve suitable existing code rather than migrating frameworks to avoid debugging it.

---

## 6. Arena appearance: accepted and protected

### Acceptance milestone

After v0.25, the user explicitly said:

> “the arena is exactly how it should be visually”

The subsequent request was about placement, bridge movement, targeting, items, economy, and the AI ecosystem—not another redesign of the arena.

### Protected files

The v0.26 report identifies these as unchanged from v0.25:

- `src/battle-view.js`
- `src/v250.css`
- `src/draw.js`
- `assets/native/data.json`
- `assets/presentation/data.json`

The recovery also retained the normal tower renderer behavior. A separate boat-battle adapter is not permission to change ordinary Crown Towers.

### Exact observed coordinate contract

`src/battle-view.js` contains:

```js
const layout = {
  width: 540,
  height: 1172,
  handTop: 960,
  handHeight: 212
};

const k = 540 / 944;
const camera = {
  x: -6.51802815 * k,
  y: 298.390736 * k,
  scale: 1.99612373 * k
};
```

Game geometry remains **480×640** logical world units. The battlefield is **18×32 tiles**, so `SX = 480/18` and `SY = 640/32`. Menu framing remains **540×960**.

The camera maps world coordinates into the battle layout with one uniform transform:

```text
screen.x = camera.x + world.x * camera.scale
screen.y = camera.y + world.y * camera.scale

world.x = (screen.x - camera.x) / camera.scale
world.y = (screen.y - camera.y) / camera.scale
```

Rendering, cached backgrounds, pointer conversion, drag previews, placement validation, health labels, and effects must agree on that transform. CSS viewport scaling is a separate outer transform. Do not invert only one of the two.

### Visual requirements

- Original arena terrain, side scenery, bridge structures, lava/water, torches, banners, walls, background props, and normal/overtime variants load from their source scenes.
- Decorative regions can extend beyond the camera view and be naturally cropped. Do not zoom out just to contain the entire source canvas.
- Do not render a duplicate board at a different scale as a fake background extension.
- Tower artwork, attached King/Princess characters, health bars, crown level badges, shadows, and occluding battlements must have consistent scale and anchors.
- Original character animation should not look like a portrait sliding over the arena.
- Keep the King activation timeline, attachment point/layer, and sleeping/active distinctions.
- The original renderer correction used source-to-world conversion based on **32 source pixels to 26.666... world pixels**; avoid unrelated per-tower scaling multipliers.
- A Princess's attachment height must not be doubled. The reference-fidelity spec records source field `2200` and the corrected `26.4` logical offset used by the implementation.
- The top HUD overlays scenery; do not restore the solid oversized header strip from earlier versions.
- The card hand, Next area, chat button, and elixir meter follow the taller battle composition.
- Keep all 15 available arenas, including Training Camp, loaded correctly in both normal and overtime states.

### Evidence boundary

The v0.25 implementation report records **568 terrain feature matches** against `IMG_4991.png` and approximately **0.377 px median registration residual** in its measurement. This is a historical reported landmark comparison, not proof that every rendered pixel equals the native game. Only the P.E.K.K.A arena supplied the precise new composition reference; the other arenas share the camera and were checked for their referenced scene assets.

The active requirement is to preserve that accepted result, not keep experimenting with guessed `+12%` or `+18%` zoom changes from obsolete releases.

---

## 7. UI, text, icons, and button presentation

### Global style

Make the interface look like part of Clash Royale rather than a technical AI dashboard. Use the supplied original imagery, frames, glyph artwork, panels, icons, and animation exports where available. All normal controls need appropriate selected, disabled, pressed, loading, empty, error, and success states.

### Text and scaling

- Crisp text at the actual displayed size and device pixel ratio.
- Correct spaces, punctuation, baselines, and letter proportions.
- No horizontal squeezing to force a long string into a box.
- Wrap long labels or reduce their size proportionally when appropriate.
- Redraw canvas-backed text after viewport/display-scale changes.
- Prevent overlapping digits, elixir drops, currency icons, quantity labels, progress bars, or card names.
- Keep `1 Win` and `2 Wins` visibly spaced, not merely containing a whitespace character that the layout collapses.
- Use exact requested strings: `Hour Shop`, `Not Found`, and `Locked`.
- Do not let a previous word-by-word text wrapper clip multiword player/clan names.

### Buttons and icons

- Preserve icon and frame aspect ratios.
- Use segmented/nine-slice-like button scaling where appropriate so the original corners and bevels are not stretched.
- Give text, icons, and decorative frame padding separate layout space.
- Do not use arbitrary Unicode symbols in place of an available source icon for clan actions.
- Do not enlarge a tiny texture and describe it as a genuinely new high-resolution asset. Report source-resolution limits.
- Use real item/skin/emote previews, not a nonexistent manifest key hidden behind a blank rectangle.
- Button hitboxes should match their visible controls and not allow click-through onto the battlefield.

### Specific pages and recurring problems

- Battle header: opponent name, clan, applicable trophies, pause/fullscreen controls, and timer must not collide or clip. Controls remain comfortably clickable.
- Timer/multiplier: enough canvas/layout bounds for `2×`, `3×`, overtime labels, and the source artwork. It must remain above scenery.
- Resource bar: compact, legible gold/gems/XP; no `+` purchase buttons.
- Deck/card tiles: portrait/frame/cost/level/copy progress have independent space and consistent scale.
- Shop: rarity rows, remaining-time display, quantity, ownership, price, and icon do not overlap. No inventory Collection section.
- Cosmetics: names only beneath tower previews; omit the invented descriptive filler formerly shown under skin names.
- Magic items: real icons, inventory count, functional use dialogs.
- Clan chat: a clean message list, request/trade cards, action bar, composer, scrolling, and original icons. Do not cover the composer with the bottom navigation.
- Modal dialogs, reward reveals, long names, large balances, phone-like windows, and high-DPI desktop windows all need visual checks.
- Do not reintroduce obsolete Shop currency pack controls just to make an empty page look full.

**Important recovery caution:** v0.26's support/layout files were reconstructed. Review the repaired social/shop/war layouts against screenshots rather than assuming the first v0.26 screenshots exactly match the repaired CSS.

---

## 8. Decks, Collection, and card ownership

### Decks versus Collection

**Decks page:** show the selected eight-card deck and, below it, the available card browser. Exclude cards already present in the selected deck from that lower list. Switching decks or replacing a card updates the list immediately. Normal decks remain eight unique cards, except in explicit cheat practice.

**Collection → Cards:** show every catalog card, including cards already in the current deck and locked/not-yet-found cards. Do not share the deck-exclusion filter here.

Preserve multiple saved decks, switching, reordering, replacement, average elixir, details, upgrade progress, search, rarity filter, sort, and separate remembered scroll positions. The implementation historically uses five saved deck slots.

**Collection subpages:** Cards, Emotes, Tower Skins, Magic Items. These are actual navigable categories, not simply four long sections appended beneath the deck.

### Eligibility is not ownership

The user supplied this progression example:

1. The player has not reached the arena containing Bats: Bats cannot be received from ordinary gated rewards.
2. The player reaches that arena: Bats becomes eligible but is still not owned.
3. The player receives at least one actual Bats card: Bats becomes discovered and usable.

That third step is **source-agnostic**. An eligible first copy from a chest, Shop, Trophy Road, trade, valid event reward, or other card-copy grant unlocks the card. Do not require a chest specifically.

### Active rules

- Use the card's source `UnlockArena` mapping, not a nonexistent or ambiguous column.
- The accepted implementation uses the highest reached arena/peak trophies for eligibility. Dropping trophies should not revoke an already reached arena's collection.
- Starter deck ownership is retained.
- Merely reaching an arena does not grant all its cards.
- Shop offers can include eligible undiscovered cards; purchasing the first copy discovers them.
- Generic Wild Cards and Books are not a specific first card copy; they require an already discovered target.
- Bots need arena-legal decks, but do **not** need a simulated chest-opening history to unlock each card.
- Eligible undiscovered cards display **`Not Found`**.
- Future-arena cards remain locked with an appropriate arena requirement.
- Card details and Use/Upgrade state agree with the same ownership predicate.
- Existing eligible copies in old saves are recognized even if the old chest-only flag left them locked.
- Upgrades consume actual copies and gold and preserve atomicity; no repeated claim/upgrade through rapid clicks.

Held chest card pools expand as the player's highest arena increases. A chest earned earlier must not stay permanently restricted to its old arena pool when opened later.

---

## 9. Dynamic AI card levels and King progression

### User intent

AI card levels must be believable distributions, not the player's levels copied back, a fixed arena number, always-max decks, always-minimum cards, or arbitrary raw random levels.

Account strength, individual card preference, rarity, acquisition difficulty, and how long a card has been available should influence the result. Normal variation should coexist with occasional unusually underleveled or overleveled cards/accounts.

### Rarity floors and normal cap

| Rarity | Starting displayed level | Normal owned maximum |
|---|---:|---:|
| Common | 1 | 13 |
| Rare | 3 | 13 |
| Epic | 6 | 13 |
| Legendary | 9 | 13 |

A Level 9 Legendary is a newly acquired Legendary, not a Common with eight upgrades. Do not treat all raw displayed levels as the same amount of collection development.

Do not globally clamp a source-defined generated unit or special Mirror output just because the owned card's normal cap is 13. Verify the pinned source mechanic separately. Explicit cheat overlevels are also outside ordinary progression.

### Firm Master I requirement

At **Master I**, every bot deck card should be **13**, except an occasional **0–4 cards at 12**. Above Master I, Level 12 cards become less frequent and their maximum count decreases. Do not allow lower levels under this rule. This is an explicit custom calibration target, not a claimed measured real-player statistic.

**Use Master I at 6,000 trophies in this project's current progression module.** An early assistant cited 4,900 from an older league system. That older value is wrong for the active 14-arena road.

**OBSERVED latest `level-model.js` ceilings:**

| League | Start trophies | Maximum Level 12 cards; others Level 13 |
|---|---:|---:|
| Master I | 6000 | 4 |
| Master II | 6300 | 3 |
| Master III | 6600 | 2 |
| Champion | 7000 | 1 |
| Grand Champion | 7300 | 1 |
| Royal Champion | 7600 | 0 |
| Ultimate Champion | 8000 | 0 |

The code also reduces the probability of a Level 12 within each rank band. Scarcer/newer cards are more likely to occupy lagging slots. Preserve the hard rank constraints when refining distributions.

### Current algorithm versus desired realism

**OBSERVED:** the model uses normalized development, source rarity `ChanceWeight`, arena-unlock age, account bias, ordinary card noise, favorite/neglected adjustments, and a rare outlier term. It uses reproducible identities when called from the world system.

The exact curves are local design calibration, **not an official per-card/per-arena population dataset**. Earlier assistant-generated averages and equal-percentage examples were rejected as insufficiently realistic. Do not revive them as authoritative data.

The code's acquisition difficulty primarily combines rarity and unlock age. It is not a complete card-specific economy model or an empirically measured average level for every card in every arena. That remains an improvement area if the user finds the resulting distribution implausible.

### King levels

Bot King Tower levels are separately dynamic, trophy/arena-aware, and bounded by the normal 1–13 progression. Do not merely copy the human's King level or force the King to the deck's average.

The current high-league model strongly favors King 13, with a decreasing chance of King 12 from Master I upward. At the highest rank bands it uses King 13. Actual Crown Tower stats must use the selected King level; a number painted above an otherwise fixed-stat tower is not sufficient.

### Stability and fairness

Choose the opponent identity, deck, level profile, and difficulty for the match before gameplay. Keep them stable through a match and across a profile inspection. Do not alter them to force a comeback or loss. A Duel keeps one opponent identity across its rounds.

Decision quality, actual learned knowledge, and card collection strength are separate dimensions. A higher card level must not be described as improved AI intelligence.

---

## 10. Player XP and upgrades

Implement and preserve actual XP-driven King levels, not a decorative badge.

**OBSERVED cumulative XP table:**

| King level | Total XP to reach level | XP from this level to next |
|---|---:|---:|
| 1 | 0 | 20 |
| 2 | 20 | 50 |
| 3 | 70 | 100 |
| 4 | 170 | 200 |
| 5 | 370 | 400 |
| 6 | 770 | 1000 |
| 7 | 1770 | 2000 |
| 8 | 3770 | 5000 |
| 9 | 8770 | 10000 |
| 10 | 18770 | 30000 |
| 11 | 48770 | 40000 |
| 12 | 88770 | 80000 |
| 13 | 168770 | Max |

Source: `src/player-xp.js`. These are the active implementation values, not a fresh historical-data audit.

Requirements and implementation notes:

- Fresh profiles begin at King 1 with zero XP.
- Upgrade XP comes from the source rarity's `UpgradeExp` table at the correct relative upgrade index.
- Donation XP comes from source rarity `DonateXP` multiplied by the legal donation quantity.
- Keep `experience`, `level`, `kingLevel`, and XP-into-level synchronized.
- Overflow XP after King 13 becomes Star Points under the implemented historical progression.
- Show an accurate XP progress bar and `MAX` state.
- Books provide the missing copies; they do not silently pay upgrade gold.
- A Magic Coin performs a valid upgrade without spending gold and still follows the real upgrade/XP path.
- Migrate legacy level-plus-partial-XP saves without losing progress or double-counting XP.
- Preserve learned AI state when upgrading cards or migrating the profile.
- Tournament-level games temporarily use Level 9 towers without permanently overwriting the user's King progression.

---

## 11. Win-based chests

### Required unlock costs

| Chest | Wins required |
|---|---:|
| Silver | 1 |
| Gold / Golden | 3 |
| Magic / Magical | 4 |
| Legendary | 10 |
| Every other supported held chest | 5 |

### UI contract

An unready chest shows:

```text
Locked
1 Win
```

or `2 Wins`, `3 Wins`, etc., based on wins **remaining**, not accumulated progress. Do not show `0/3 Wins`, `Win to unlock`, or `2Wins` without visual spacing.

A ready chest shows `Open now!` and an appropriate ready label. Preserve its current expanded reward-pool arena display.

### Rules and migrations

- Progress advances from qualifying wins, not elapsed wall-clock time.
- Practice/cheat/replay outcomes cannot farm chest wins.
- The current result path advances chests already held before awarding the new victory chest. The newly awarded chest starts at zero progress; document rather than silently change this sequencing.
- Reprocessing the same battle result must not advance progress again.
- A Chest Key makes a locked chest ready; opening/reward consumption is a separate action. Do not write tests assuming the key immediately deletes the chest.
- A ready legacy timed chest can migrate to ready rather than taking its already-earned availability away.
- `unlockAt` is not a live timer for newly held win-gated chests; normalization removes it from that role.
- Retain four held chest slots unless later explicitly changed.
- Chest kind canonicalization handles `golden`/`magical` aliases.
- Pools use the highest arena reached at opening, not only the arena where the chest was earned.
- Direct Shop/Trophy Road reward reveals are separate from held-chest unlock progress. Do not impose an extra held-chest gate on an instant reward accidentally.

**Observed scope distinction:** Free/Crown chest cooldown functions still exist separately, along with the daily gift. The recorded custom win rule primarily replaced held battle-chest timers. Treat a request to remove *all* reward clocks as a separate change rather than assuming it already happened.

**Open economy detail:** the implementation supports more chest kinds in `chest-rules.js` than it has distinct complete loot tables in `economy.js`. Some other kinds fall back to common loot logic. A supported label/icon and a five-win requirement do not establish exact native rewards for that chest.

---

## 12. Hour Shop, currencies, and cosmetic rotations

### Exact requested card layout

The title is **Hour Shop**. The grid has exactly 12 positions:

```text
Common     | Common     | Common
Rare       | Rare       | Rare
Epic       | Epic       | Epic
Legendary  | Legendary  | Legendary
```

- Reset on hourly boundaries, not every three hours or at midnight only.
- Show seconds. The implemented display is `HH:MM:SS`.
- The open page updates its countdown and offers at rollover without requiring a restart.
- Within an hour, the selected offers and purchase state remain stable.
- A stale or changed offer is rejected without charging for a different card.
- Three locked positions remain if that rarity has no arena-eligible cards.
- If fewer than three cards of a rarity are eligible, the current implementation may repeat a card within that row while keeping separate slot purchase state.
- Unfound but eligible cards can appear. Purchasing one must discover the card.
- Never sell higher-arena cards early.

**Observed local tuning:** Common offers are 20 copies for 100 gold, Rare 5 for 250, Epic 1 for 500, Legendary 1 for 1000. These are project prices, not certified official Shop pricing.

### Currency changes

Remove:

- Gem-pack purchases.
- Coin/gold-pack purchases.
- Practice currency top-up/grant controls.
- The `+` icons beside the top gold/gem counters and their hidden purchase entry paths.
- The inventory/Collection section formerly inserted in the Shop.

Retain:

- Actual earned gold and gems.
- Existing free Daily Gift behavior.
- Valid purchases **using** in-game gold/gems, including card copies, emotes, applicable chests, and supported Trader rerolls.
- Honest insufficient-currency, already-owned, purchased, expired, and unavailable states.

No real payment checkout is active scope. The old master prompt's microtransaction provider design was superseded by the browser project's later currency-removal decision.

### Cosmetic rotations

- Three emote offers rotate every hour from the available eligible catalogue.
- The user also wants three actual tower-skin offers every hour, positioned beneath emotes.
- Tower skin offers must use real original skin assets, proper front-facing previews, names, and price—no fake recolors and no filler descriptive text.
- The current code cannot populate a real non-default tower-skin shop because those models are still missing. Keep that limitation explicit rather than adding misleading placeholders.

---

## 13. Magic items and original artwork

### Required categories

- Common/Rare/Epic/Legendary Wild Cards.
- Common/Rare/Epic/Legendary Books of Cards.
- Book of Books.
- Magic Coin.
- Chest Key.
- Trade tokens remain part of the inventory/trade systems even where not presented as a Magic Items tile.

### Actual behavior

- Wild Cards: apply only to an owned, arena-eligible matching-rarity card; deduct the requested available amount and increase real copies.
- Book of Cards: fill missing copies for the next upgrade of an owned non-max card of the matching rarity. Do not consume a book if the target already has enough copies.
- Book of Books: same copy-filling behavior without a rarity restriction, still requiring an owned non-max target.
- Magic Coin: requires the necessary copies; upgrades through the real upgrade path without reducing gold; consumes one coin and awards normal upgrade XP.
- Chest Key: selects a locked held chest, sets its win progress to ready, and consumes one key. It does not itself need to open and remove the chest.
- All actions validate ownership, quantity, eligible target, max level, and duplicate clicks before changing inventory.

### Artwork

The v0.26 import isolated **seven original item sprites** from `assets/native/fx-ui_spells-1.webp`. Four rarity books plus Book of Books, Magic Coin, and Chest Key use these images. Wild Cards/tokens use their own previously bundled rarity-specific source icons.

Relevant provenance:

- `assets/ui/v260-atlas-provenance.json`
- `docs/recovery/image-recovery.json`
- `assets/ui/manifest.json`

Do not regress these back to CSS books, generic key/coin symbols, blank cards, or unrelated existing icons. These are source sprites, not evidence of recovered 3D magic-item models.

**Open check:** item use and textures were exercised; that does not prove that every magic item already has a complete natural acquisition/drop path in ordinary progression. Audit both earning and consumption before claiming a complete item economy.

---

## 14. Emotes and missing tower skins

### Genuine animated emotes

The user directly uploaded `CR-3.5.0-Graphics(1).zip`. Its dedicated emote inventory was decoded rather than inferred solely from filenames:

- **97 dedicated emote asset bundles**.
- **206 named original animation clips** imported into the browser project, with matching preview/icon entries.
- Each clip's original frame timing, transforms, textures, and masks should be used.
- Example inspection: P.E.K.K.A Boombox has 150 frames at 60 FPS; a Goblin bundle has four clips of approximately 145–154 frames.

**Do not equate 206 clips with a verified count of distinct live-game shop emotes.** That is the historical archive/import count, not the full contemporary catalogue.

Requirements:

- White speech-bubble presentation in Shop, Collection, previews, clan chat, and battle messages.
- Actual character-frame animation, not just translating/scaling one static icon.
- Replay control in an emote preview.
- An equipped set of up to eight and an expanded picker for additional owned emotes.
- Preserve ownership and equipped selections across releases and legacy source-ID aliases.
- Newly imported paid emotes are not automatically all owned.
- Hourly three-offer rotation uses the expanded catalogue.
- Newly sent clan emotes and battle emotes animate; cap concurrent playback and stop offscreen/unneeded work.
- No broken masks showing red construction shapes, especially the Prince rainbow-type effect.
- Render original `Mask → Masked → Unmasked` behavior, not just arbitrary clipping bounds.

Primary implementation: `src/emote-data.js`, `src/emote-player.js`, `src/cosmetics.js`, and imported `assets/emotes/` scene metadata/textures.

### Tower skins: still an open feature

The user explicitly rejected the six custom recolors that were previously sold as skins. Those substitutes were retired in v0.22. **The latest catalogue contains Classic Tower only.** `src/cosmetics.js` explicitly records `originalSkinCount: 0` for additional original skins.

Retired IDs retained only for migration/refunds:

```text
lava-fortress
royal-blue
bone-crypt
jungle-ruins
electro-station
frozen-keep
```

Existing owners receive **750 local gems per retired style, once per ID**, and an equipped retired style returns to Classic. Preserve the migration receipts; do not refund every load.

The original graphics ZIP mainly contains downloadable assets absent from the base APK. Inspection found 21 seasonal bundles but no confirmed complete equippable King/Princess skin sets. `holiday_tower` and `holiday_tower2` are arena-scene objects, not proof of a full skin. A texture file with a skin-like name, such as `fx-building_towerskin_season_15a-0.webp`, is a lead to inspect—not proof that all required exports and assembly metadata exist.

Future work must locate/decode the actual skin source files, map the correct blue/red and King/Princess exports, wire them into both preview and battle rendering, and keep stats/collisions unchanged. A front-facing preview is required. A complete skin is not established merely because a card tile can show a texture atlas.

Do not misstate a failed Project-file materialization as proof the archive contains no asset. Direct attachments were usable in later turns. Inspect the actual bytes first.

---
## 15. Soft-grid placement, formations, and previews

### Required interaction

The user wants Clash Royale's **soft-grid** placement feel, not completely free positioning, a rigid visual checkerboard, or an arbitrary snap to a distant legal tile.

- Troops use tile-aligned anchors with small legal adjustments around obstructed formations.
- Buildings use the proper footprint-based grid rules.
- Area spells retain continuous aiming unless the source card explicitly behaves as a ground-deployed/rolling object.
- Distinguish deploy-anywhere cards from normal friendly-territory placement.
- Losing a Princess Tower expands only the applicable placement lane/region.
- Preview positions and the actual accepted command must come from the **same calculation**.
- Multi-unit cards preview every member in the correct formation, not a single ghost followed by an unrelated spawn.
- Obstructed formation adjustments cannot move a card across the river or into strategically different enemy territory.
- Dragging does not spend elixir. A rejected placement does not charge, cycle, or partially spawn the card.
- One pointer release creates at most one accepted deployment.
- Mouse and touch use the accepted camera conversion; resizing cannot offset the placement from the cursor.
- All legal matches have placement previews on; the user-facing toggle was removed.

### Visual preview components requested

- Translucent original troop/building ghosts, with the correct orientation/scale.
- Card name and level placed legibly near the preview.
- Friendly/enemy placement-zone shading where applicable.
- Range/radius/footprint or rolling/line preview appropriate to the card.
- Affordable, unaffordable, cycling, invalid-ground, and invalid-zone feedback.
- Highlight enemy cards affected by the selected spell.
- Exclamation marks above entities that will target/retarget to the placement, matching the reference intent.
- No misleading warning on a target that cannot legally interact with the placed unit.
- Cosmetic forecast drawing must not mutate simulation state, random state, or target selection.

### Source ownership

- `arena-grid.js`: 18×32 geometry, tile/world conversion, terrain/deployment regions.
- `formations.js`: source-derived multi-member spawn arrangements.
- `placement.js`: legal placement and preview/deployment agreement.
- `battle.js`: authoritative validation and accepted deployment.
- `battle-view.js`: screen/world transform.
- `draw.js`, `presentation.js`: ghost, range, highlight, label, and warning presentation.

### Test expectations

Check both teams, both lanes, both bridge edges, destroyed Princess Towers, friendly/hostile buildings, insufficient elixir, delayed card cycling, current/dead targets, and multi-unit formations close to obstructions. Test a real browser pointer path, not only an internal `deploy()` call. Preview correctness is a gameplay contract, not just an image check.

---

## 16. Pathing, collision, target selection, and attack timing

### Recurring user-reported failures

Cards walked through one another, orbited/spun from collision correction, got stuck at bridges or river banks, followed inappropriate routes, and remained locked onto a distant target while ignoring a closer enemy they could attack. These complaints recurred after earlier builds; do not treat a previous “fixed” statement as proof of complete resolution.

### River and bridge movement

**REQUIRED:** legal ground units should cross appropriate bridge corridors naturally, including large bodies, swarms, angled approaches, and collisions with other units. Air, hover, river-jump, and special movement categories must follow their own source flags.

**REPORTED v0.26 correction:** the planner previously checked only the center of a unit while the movement collider checked the swept radius. A planned bank route could therefore be impossible to execute. Both now use a radius-aware passability predicate, and cached blocked routes are recalculated.

Preserve these constraints:

- Planner and live movement agree on obstacle inflation and river clearance.
- Route validity includes the body's radius, not only tile center occupancy.
- Do not teleport a stuck unit, switch off collision, or let ordinary ground units walk through the river to make a test pass.
- Recompute invalid routes after tower/building destruction or a blocked path, without thrashing every frame.
- Smooth legal path segments without cutting corners through impassable geometry.
- Check an entire movement/knockback segment, not just whether the endpoint is free.
- Units blocked temporarily by a crowd should not be treated as permanently unable to reach the lane.
- A bridge crossing stays grounded; source-enabled river jumps use the jump presentation only when appropriate.
- Floating/hovering units are not incorrectly forced onto bridge-only routes.
- Preserve accepted arena visuals while changing competitive geometry interpretation.

### Collision and pushing

- Troops have accurate source collision radii and appropriate soft separation rather than no collision or immovable walls.
- Buildings/towers retain hard collision/footprints.
- Resolve contact along the contact normal and account for mass or the corresponding source behavior.
- Contact correction must be time-step-scaled, not repeated excessive pushes that induce spin.
- Do not add an artificial sideways bias that causes endless circling.
- Let troops pass naturally when a legal gap exists; avoid one stopped troop permanently sealing a bridge.
- Preserve spawn separation, multi-unit formations, displacement resistance, and special movement.
- Dash endpoints use contact edges, not the target center.
- Knockback paths must not tunnel through structures.
- Shadows, health labels, projectiles, and effects follow a jumping unit's elevation consistently.

### Targeting: chase versus committed swing

The user's key instruction is that a melee unit must not permanently “lock on” to a distant target while ignoring closer valid enemies it could attack.

**Required distinction:**

1. **Searching/chasing:** reassess valid candidates and allow a closer appropriate target to interrupt a distant chase.
2. **Committed in-range attack:** preserve a valid swing rather than cancelling it every frame because some other unit moved fractionally closer.
3. **Target invalidation/interruption:** apply source-specific rules for death, range loss, stun, invisibility, untargetability, displacement, and other interruptions.

Do not interpret the request as “all units always choose the nearest object.” Respect building-only, tower-only, ground-only, air-capable, minimum-range, chain, dash, hook, and attached-attacker restrictions. Likewise, do not interpret stable windup as permission to preserve an invalid chase indefinitely.

Source behavior to retain/audit:

- Separate sight/acquisition range from attack range and minimum range.
- Compute contact/range using collision radii consistently.
- Keep source first-hit/load/preload timing distinct from repeat hit interval.
- A valid projectile already launched is not automatically erased when its shooter dies.
- Knockback/disable events reset or preserve preload according to the actual source mechanic; do not grant a free accelerated next hit.
- A nearer exposed King Tower can be a legitimate target instead of automatically crossing to the remaining far Princess Tower.
- Special attached attackers can have different target classes from their carrier.
- Building pulls and kiting should arise from actual rules, not AI-specific target overrides.
- Human, AI, replay, and headless self-play must run the same movement and combat rules.

### Verification boundary

The current code is a browser reimplementation. Its path cost function, collision solver convergence, simultaneous-event ordering, every special interaction, and native timing equivalence are not all verified tick-for-tick. Keep a fidelity matrix of measured interactions and uncertainty; copied stats alone are insufficient.

Priority regression scenarios include Knight/Giant/Golem/P.E.K.K.A bridge crossings in both directions, angled river-bank approaches, crowded swarms, central defensive buildings, opposite-lane pulls, targets moving in/out of range, and a melee chaser encountering a closer target.

---

## 17. Card-specific mechanics and spell animation requirements

### Shared rule

Use the pinned data fields and real behavior families. A named card must not silently fall back to “walk forward and deal generic melee damage.” Rendering is driven by authoritative events; visual particles must not create or remove damage.

Maintain source-specific speed, mass, collision radius, deploy delay, lifetime, sight/attack/minimum range, first-hit/load time, interval, projectile selection, area size, crown damage, shield pool, charge, status, spawn, and death effects.

### Named recurring fixes

| Card or family | Requirement / regression to retain |
|---|---|
| Princess | Must actually deal damage. Use the damage-bearing `CustomFirstProjectile` where present, not a harmless visual wrapper. Preserve range and area behavior. |
| Fireball | Original moving projectile, correct heading, curved flight, trail, hit effect, damage timing, and push; not a static orange mark or sideways sprite. |
| Rocket | Use the source pose atlas/orientation during flight, not looping through directional poses as a spin. Preserve travel and impact timing. |
| Arrows | Three visible waves from the casting side, appropriate heading/trails and per-wave damage; not one instant radial flash. |
| The Log | Correct rolling/drop presentation, perpendicular log body orientation, ground hit/push along travel, and appropriate repeated-hit prevention. |
| Barbarian Barrel | Correct deploy/drop and rolling orientation, hit resolution, barrel end/break, and Barbarian spawn; do not orient the barrel along the wrong sprite axis. |
| Goblin Barrel | Delivery projectile/arc and the correct resulting Goblin formation, not immediate stationary spawns. |
| Royal Delivery | Source delay, area impact, legal deployment rules, and spawned Recruit. |
| Mirror | Opening-hand exclusion, last-card cost-plus-one rule, and Mirror's own level plus source offset rather than copying the prior card's level. |
| Rage / Lumberjack | Correct friendly speed/attack buff and death/spawn effect. Earlier Rage bugs were explicitly reported. Do not substitute a different era's damage mechanic. |
| Cannon | Correct source animations, attack rules, placement, and functional damage; earlier Cannon issues were explicitly reported. |
| Earthquake / Poison | Correct ground/building restrictions, tick counts, duration, and overlapping-effect behavior. Preserve expiry-boundary ticks where required. |
| Lightning / Electro Dragon / Electro Spirit | Correct highest-HP/chain rules as applicable. Chain counts include the source-defined primary target, not an accidental extra hit. |
| Inferno Tower / Inferno Dragon | Ramping damage and reset behavior; do not fake it with one fixed-damage projectile. |
| Prince / Dark Prince / Battle Ram / Ram Rider | Correct charge/loading/contact and reset rules; respect shields, riders, carrier targeting, and death spawn where applicable. |
| Bandit / Mega Knight / river-jump units | Source dash/jump gating, contact endpoint, timing, airborne presentation, and valid target selection. |
| Fisherman | Hook target legality, displacement/arrival and attack transitions, rather than ordinary ranged damage. |
| Cannon Cart | Moving troop versus building transition and separate shield/health state. |
| Skeleton Barrel / Giant Skeleton / Balloon / Golem family | Source-defined death effects, delivered/death-spawned entities, delay, and damage. |
| Tesla / Royal Ghost / Miner | Concealment, burrowing, appearance, targetability, and deployment behavior must remain distinct. |
| Goblin Giant / Ram Rider | Attached attacker state cannot be collapsed into the carrier's targeting or HP rules. |
| Mother Witch / Electro Giant | Curse/transform and reflected-response rules need their actual mechanisms. |
| Battle Healer / Heal Spirit / Clone / Tornado | Healing, one-shot jump, clone health, and pull behavior must not use generic damaging-spell shortcuts. |
| Multi-unit cards | Correct source member count, mix, spacing, and formation. Examples include Archers, Goblins, Spear Goblins, Skeletons, Barbarians, Royal Hogs, Recruits, Goblin Gang, Rascals, and Three Musketeers. |

The table is a set of implementation/verification obligations and historical regression targets. It is **not** a statement that every native interaction for every listed card is certified exact.

### Original source playback

Relevant files are `native.js`, `fx.js`, `presentation.js`, `draw.js`, imported scene JSON, texture atlases, and effect definitions. Retain matrix-bank interpretation, texture UVs, original directional animation, source blend/mask behavior, and the distinction between a directional pose timeline and a looping motion timeline.

Use the original uploaded gameplay recording and screenshots to verify animation timing/placement. Do not claim to have watched a reference video that was unavailable.

---

## 18. Match states, elixir, crowns, and results

### Requested match presentation

The game needs proper introductions, phase banners, countdowns, and result screens, not a pause menu at the end.

Preserve or complete:

- Fight/start announcement.
- `60 Seconds Left!` and the corresponding remaining-time announcement.
- The later `30 Seconds Left!` announcement already requested/reported.
- Final second-by-second countdown text.
- Double and triple elixir announcements and multiplier badge.
- Overtime / Sudden Death announcement.
- `Sudden Death` with `Get next Crown to WIN!` subtitle.
- Tiebreaker presentation and correct result resolution.
- Tower-destruction crown travel/touchdown animation and sound cues.
- Actual match-end screen, banners, per-side crowns, winner/draw state, and delayed OK/reveal sequencing.
- Source end-screen confetti/effects can finish after simulation freezes; continuing visual time must not continue gameplay or grant a result twice.

Announcements must be queued/deduplicated and cannot continuously overwrite each other. Reset them between matches. Their elapsed display time and visual RNG must not modify battle logic.

### Observed normal timeline

The retained `Default` source timeline currently stores:

```text
Sections: Normal 180 seconds, Overtime 120 seconds
Starting elixir: 6
Elixir phase lengths: 120, 120, 60 seconds
Visible multipliers: 1×, 2×, 3×
Full-bar generation milliseconds: 28000, 14000, 9300
Next-spell cooldown milliseconds: 1000, 500, 350
```

These are active source-data values. Do not replace them with a remembered current-game starting value or generation schedule. Special modes have separate timelines.

Use eight-card decks, four-card hands, a real next card, the correct shuffle/cycle constraints, fractional elixir accumulation, a cap of 10, and authoritative spending. Rendering speed must not change the effective generation or attack rate.

### Tiebreaker: important open parity detail

**OBSERVED in `battle.js::checkResult()`:** when total match time is reached, the code compares each team's **lowest surviving tower HP**. It finishes immediately with winner determined by that comparison, treating a difference under `0.5` as a draw. The reason is `Tiebreaker`.

This is **not an implemented continuous native-style tower-drain phase** in the inspected simulator. Earlier chat descriptions suggested a drain animation, but that must not be mistaken for current code. Audit the desired reference presentation and damage/crown resolution before claiming exact tiebreaker parity.

Do not replace the rule with total combined tower HP or a vague “closest HP wins” label. Keep simultaneous King destruction and valid draws explicit.

### Result safety

One match produces one progression transaction, one world outcome, one replay finalization, and one learning ingestion. Reopening the result screen, sharing/replaying the battle, or navigating away must not duplicate any of them. Interrupted matches need explicit abandonment/forfeit semantics, especially in Clan Wars.

---

## 19. Modes and non-configurable match rules

### Final level policy

| Queue | Card levels | King/Tower level policy |
|---|---|---|
| Trophy Road / main Battle button | Player collection; opponent identity collection model | Player actual King; opponent dynamic identity King |
| Challenge | 9 | 9 |
| Training / practice | 9 | 9 |
| Friendly | 9 | 9 |
| 2v2 | 9 for all seats | 9 under fixed queue policy |
| Clan War, Duel, boat-related queue | 9 | 9 under the applicable mode's tower definitions |
| Headless self-play | 9 | 9 |
| Replay | Reproduce recorded battle state | Reproduce recorded levels; never silently renormalize a past ladder battle |

The user asked for **every mode other than Trophy Road** to be fixed at Level 9, and Trophy Road to be collection-only. Remove the choice to change this. Replay is read-only historical playback, not a new competitive queue; it must reproduce the original record.

`src/match-rules.js` centralizes queue handling. Unit tests that instantiate a battle without a public queue may retain explicit fixture levels; that testing affordance is not a public setting.

### Difficulty, previews, learning

- Expert is the normal opponent setting.
- Hard is allowed occasionally for one or two games, chosen before a match.
- No normal user setting to select Normal/Hard/Expert, equal-level ladder, disable previews, or turn off legal-match learning.
- `profile.js` forces `placementHints: true` and `learningEnabled: true`.
- The current difficulty function chooses a one- or two-match Hard interval inside each deterministic 20-match block. This is a current local implementation choice, not an official-game mechanic.
- Do not modify difficulty mid-battle to achieve a forced win rate.
- Active cheats exclude normal progression/learning and are rejected by war launch.
- Replay playback is read-only and must not train.

### Mode coverage and distinction

Already exposed/reported modes include ordinary 1v1, 2v2, Double Elixir, Triple Elixir, Ramp Up, Sudden Death, 7×/Infinite Elixir, training/friendly play, and the implemented war loops. Classic/Grand Challenge runs, full tournaments, draft variants, and more complete event systems were requested in the broader vision.

A button that launches a single Level 9 Default match is not a complete Classic/Grand Challenge run. Track run entry, wins/losses, termination, rewards, restart, and offline participants before declaring that mode finished. Do not claim every requested mode is complete because its name appears in `DATA.modes`.

For 2v2, preserve four independent decks, hands, queues, elixir pools, and seat ownership with team-shared towers/crowns. A teammate may communicate a declared placement intent; that is not permission to expose opponents' private hands.

---

## 20. Learning AI, fair information, and self-play

### Non-negotiable AI intent

The defining feature is learning opponents. A trophy-dependent difficulty switch, rising match count, fixed counter deck, or stronger cards alone is not genuine learning.

The inherited design separates:

1. A competent legal tactical baseline.
2. Persistent public-observation/habit evidence.
3. A learned action-value/decision-scoring component.
4. Trophy/mode-based capability and individual style.
5. Headless self-play/evaluation using the production simulation.

### Current implementation and limits

`LEARNING.md` describes a tactical candidate generator plus a shared reward-trained **TD(lambda)-style action-value learner** with persisted parameter updates. It is not a newly trained deep network, an unrestricted strategic search, or a remote language-model dependency.

The historical documentation mentioned a small 60-match training / 32-match held-out experiment with an 18–14 score against a neutral tactical prior. That is a **historical small experiment**, not a guarantee of stronger play, nor evidence rerun during this handoff. Learning can regress.

The latest requirement is to keep reward learning enabled for legal eligible matches, excluding cheat matches and replays. Retain model export/import/reset and diagnostics where useful without adding a normal disable-learning toggle back.

### Fair information boundary

The inherited design requires own private state plus public enemy observations and legitimate beliefs. Audit actual source compliance rather than trusting comments.

Do not feed a live policy:

- The human's unrevealed hand/deck/cycle.
- Exact hidden opponent elixir when it is not public.
- Hovered/dragged cards, pointer position, pending placement, or future input.
- Future RNG outcomes or the global seed as an oracle.
- Developer-only/replay state or unshared collection/commerce information.

Infer likely enemy resources/cycle from visible events and known rules, with uncertainty. Choose prediction spells before the new event is revealed; predictions must be able to miss. Higher skill should improve choices, not grant illegal knowledge, extra health, free elixir, or direct control of troop targeting.

Human, AI, training, and replay commands use compatible authoritative validation. A rejected AI command is not counted as a successful placement.

### Continuing design goals

Preserve tactical intent such as defense, counterpush, positive trades, bait sequencing, saving a counter, opposite-lane pressure, avoiding spell value, tracking cycles, spell finishing, and protecting a lead. Learning should influence relevant decisions rather than only an on-screen number.

Habit evidence should carry context, sample count, uncertainty, decay, and versioning. A player's deck/style change weakens mismatched history rather than letting a bot behave as though it knows the hidden new deck. Stable rivals retain personalities and legitimate histories without every opponent converging on an exact hard counter.

Model updates must remain finite and bounded. Keep rollback/fallback behavior, prevent repeated ingestion, distinguish unfinished episodes from valid losses, and evaluate complete held-out matches rather than adjacent frames from one match.

### Persistence

Current documentation describes:

- Hosted-browser fallback through IndexedDB/localStorage.
- Loopback offline opener discovery at `/__webroyale_ai__/capabilities`.
- A session token and compare-and-swap state operations.
- Fixed storage under local application data: `WebRoyale/AI`.
- One-time migration when disk state is absent.
- Learning data and raw record archives kept separate from the ordinary player profile.
- Failed writes leave pending packets in the page and expose **Retry AI Save**; closing the page can lose unsaved packets.
- Revisions prevent one tab blindly overwriting another tab's model.

### Self-play and capacity

The user earlier requested persistence in AppData, ongoing learning/self-play, and support for as many as **5,000 concurrent games**.

**Reported/observed implementation:**

- Scheduler accepts 1–5,000 requested matches/concurrent state machines.
- Uses 1–8 workers, not 5,000 OS threads.
- Round-robin headless games with nominal 10 ms slices or 512 steps before yielding.
- Admission is sliced so creating a large pool does not freeze the page all at once.
- Packet persistence in batches of at most 32.
- Unique receipts prevent duplicate gradient merges; historical receipt window is 20,000 matches.
- Compact self-play recordings retain bounded decision samples and snapshots.
- Stop/error handling releases unfinished games and preserves finished packets.
- New runs can receive the merged model; already active games keep their starting policy state.
- Model export includes a recent 40-record / 24 MiB window; the offline raw archive rotates at 512 MiB / 10,000 records.

**Important distinction:** the current `app.js` still initializes accelerated self-play preferences with `count: 10`, `concurrent: 1`, and `loop: false`, and exposes an explicit start/loop flow. Mandatory legal-match learning is not the same as 5,000 games automatically running forever. Automatic always-on accelerated self-play has not been established as complete. Do not claim it runs while the application and trainer are closed.

The maximum accepted scheduler value is not a performance guarantee. A full 5,000-game resource benchmark on the user's PC was not established. Main-game responsiveness comes first.

---

## 21. Persistent AI identities and world simulation

### User requirement

Millions of AI player identities scattered across Trophy Road and thousands of varied clans should make the world feel populated and persistent. The same identity should make sense in a battle, profile, log, clan, donation, and war.

The user's “you shouldn't be able to tell the difference” describes the desired immersion. Do not falsely connect to or impersonate actual human accounts. The delivered local world identifies its simulation provenance in Settings while keeping normal screens game-like.

### Current scope

**OBSERVED/REPORTED:**

- `4,000,000` addressable player identities.
- `50,000` generated clans.
- Stable seeded names, tags, rank/trophy bands, decks, level profiles, membership, and activity styles.
- Identity lookup on demand, not millions of fully serialized rows or running simulations.
- Stored deltas for observed ladder outcomes and donations so reopening a known profile does not discard its recent activity.
- Cheap metadata filtering for clan search before expanding member rosters.

The code reserves a large clan-associated identity population and a further clanless/recruitment pool. Do not assume every one of four million identities already occupies one of 50,000 clans, or that a generated clan exceeds the 50-member-style capacity simply to fit them all.

### Identity consistency

- Stable IDs are persistence keys; names are not unique keys.
- A match opponent selected from the world has a profile that corresponds to that actual opponent's deck, levels, trophies, and clan.
- Battle Log profiles must not be freshly rolled unrelated bots.
- Duels keep one opponent across rounds.
- Friends refer to actual encountered world IDs.
- Clan actions and donor messages refer to valid members at that time.
- Recruitment should not clone the same AI into incompatible memberships.
- Catch-up must preserve causality and not generate impossible pre-creation activity.
- Different profiles/clans need enough variation in names, bios, badges, activity, and deck style to avoid obvious repetition.

### Open realism limits

The current world is procedural with bounded detailed caches. Unobserved ladder/war contributions are sampled; every NPC does not have a complete individually simulated collection economy or ongoing real battle. Chat is contextual templates. An impressive population count is not proof of an indistinguishable human ecosystem.

Preserve the efficient generator/delta architecture while improving the specific realism weaknesses rather than materializing four million full accounts in memory.

---

## 22. Clans, friends, recruitment, and chat

### Friends

- Start with **no pre-added AI friends**.
- Add encountered players manually from their Battle Log profile or clan-member profile.
- Joining a clan does not automatically friend every member.
- Preserve friend IDs, removal, and profile navigation.
- Do not create fake prior friendships during a migration.

### Generated clans

Clans should have varied names, available original badge choices, descriptions/bios, requirements, recruitment type, roles, membership, and activity. Search/browse/profile actions must be functional. Open, Invite-only, and Closed should not all behave as automatically joinable.

**Asset limitation:** the report states only eight available original clan badge images were used. The complete native badge catalogue is not bundled; do not claim that thousands of clans imply thousands of distinct original badge assets.

### New player-created clan

This is a firm requirement:

- Creator only at creation.
- No older members injected by default.
- No backdated conversations, donations, wars, or fabricated history.
- Subsequent joining is scheduled after creation.
- Some clans grow slowly over several weeks; some pick up quickly.
- Recruitment depends on allowed type/capacity and should remain stable after reopening.
- Offline elapsed time is processed when the user returns; it is not a real background service running while the app is closed.

The current source has seeded fast/slow recruitment intervals. Those are local simulation settings, not official player-population data.

### Existing-clan migration

Preserve the user's existing local clan name, own messages, and relevant donation data without charging another creation fee. Remove the old shell's automatically fabricated members/history rather than treating them as genuine prior activity. Do not erase real user-authored text to fix placeholder history.

### Chat

The desired screen includes:

- Text messages.
- Animated original emotes in white bubbles.
- Real card requests and donation progress.
- Token trade offers/state.
- Member-profile links and relevant roles.
- Shared replay cards linked to real recordings.
- Friend/friendly/war actions where implemented.
- Join/leave or other system events generated at the correct time.
- A working composer/action bar, legible timestamps, proper scrolling, and original button icons.

Messages should be grounded in actual world events and the author's identity, not contradictory filler. A message claiming a donation must correspond to a transfer. A new clan has no older conversation to “catch up.” Keep bounded history without losing active request/trade objects.

The current implementation uses local contextual templates, not an unrestricted chat model. Do not claim human-quality natural dialogue as complete. Keep player-written content safely escaped and imports validated.

---

## 23. Donations and trading

### Requests/donations

The system must exchange actual card copies and award correct XP/gold, rather than instantly adding a generic bundle with decorative chat.

Preserve:

- The implemented seven-hour request cooldown and applicable Epic Sunday rule.
- Source rarity-based quantities, per-donor limits, gold, and XP.
- Card eligibility and actual owned/spare copies.
- Correct total requested, contributed, remaining, expired, and filled state.
- AI donors contribute over time rather than every request being filled immediately.
- Per-request donor accounting survives repeated updates and reloads.
- A donation deducts donor copies and increases the intended recipient's copies once.
- Multiple windows/catch-up calls cannot duplicate a contribution.
- Observed donor identity statistics and chat remain consistent with transfers.
- No future-arena unlock leak through donations.

Do not preserve the early prototype's “Request Cards adds 10 copies immediately” shortcut as the final system. Similarly, donation gold cannot be a universal `+5` for every rarity while XP uses the proper rarity table.

### Token trades

- A valid matching rarity token is reserved for a posted trade.
- Correct card bundles are exchanged, not just a message marked Accepted.
- Ownership, copies, eligibility, balance, and limits are checked at posting/settlement.
- An AI member may accept later according to the local system.
- Acceptance is idempotent and cannot settle twice.
- Unaccepted token reservations are refunded on cancellation, expiry, or leaving the clan.
- Receiving an eligible first copy through a trade discovers the card.
- Future-arena cards remain unavailable.
- UI and inventory use the same persistent offer state.

The war Trader is a related but distinct daily exchange system. Do not conflate clan token offers with a Trader reroll.

---

## 24. Clan Wars II

### Reference and deliberate override

Use **post-summer-2021 Clan Wars II**, not an inconsistent mixture of 2020 and current rules. The user's fixed **Level 9** requirement overrides historical collection-level war matching.

The reports reference Supercell's 2021 “Clan Wars: What Has Changed?” over the earlier 2020 launch rules where they differ. In particular, **do not re-add obsolete midweek boat repair**.

### Implemented/reported core loops

- Three Training Days and four Battle Days.
- Entry gated by King Level 6 and at least ten clan members in the current implementation.
- Four unique daily war decks, with cross-deck uniqueness and usage state.
- Ordinary war battles and rotating battle modes.
- Best-of-three Duels.
- Five-clan River standings, medals, movement, and alive-defense movement bonuses.
- Weekly rewards for participating members and clan-trophy changes.
- Final-week Colosseum Duels.
- Boat defense editing/testing and playable boat attacks.
- Daily Trader exchange choices and rerolls.
- Local UTC scheduling and catch-up.

These are working browser interpretations according to prior reports; they are not a recovered native Clan Wars client or proof of every official screen and interaction.

### War-deck/Duel requirements

- Only decks actually used in played rounds are consumed.
- Used decks cannot be edited until the appropriate reset.
- Unplayed unused decks are not consumed just because a Duel series ends.
- Preserve one opponent identity across a Duel and use distinct legal opponent/player decks per round.
- Return from a war match to its actual pending war activity, not a disconnected normal battle result.
- An unfinished started war battle can be forfeited explicitly rather than endlessly rerolled for a new opponent without spending a deck.
- Rewards, medals, standings, participation, and consumption commit once.
- Active cheats are rejected for war launch; replays cannot contribute war points.

### Boat defenses and attacks

- Three boat towers.
- Four troop cards assigned to each tower.
- Defenses activate when damaged and summon their assigned defenders.
- Persistent defense damage after a real boat attack.
- Destroyed defenses remain destroyed for the week.
- Defense test battles must not be confused with permanent scored attacks.
- Boat attacks use their own two-minute clock and destruction-bonus phase.
- Card limits, deployment, activation, defenders, clock, and results need separate mode logic, not a reskinned ordinary six-tower arena.

Boat visuals currently assemble **three original atlas components** from `fx-building_clanwars_towers-0.webp`; they are not a complete original boat scene/rig. Provenance is in `assets/ui/v260-boat-provenance.json` and recovery notes.

### Trader

The reported implementation offers three receive/give choices, matching-token card-bundle trades, limited daily settlement, and gem-paid give-option rerolls. Exchanges must use actual copies and support first-copy arena-eligible discovery. Daily reset, rerolls, and trade limits are local configuration unless independently verified against the pinned historical reference.

### Open completeness issues

The user asked for all features of the real Clan Wars experience. Current caveats explicitly include browser-adapted River/boat presentation, sampled rival contributions, some spawning/scheduling/reward tuning, incomplete badge assets, and some management interactions. Maintain a concrete coverage list instead of calling every part exact.

---

## 25. Battle logs and actual replays

### Required distinction

A genuine replay reconstructs **recorded actions and initial conditions**. Rerunning today's AI policy with an old seed is not the same match and must not be presented as its replay.

The current recorder/player stores or uses:

- Match and content/version identity.
- Initial shuffled hands and queues.
- Decks, actual card levels, and King levels.
- Seed and applicable RNG state.
- Arena, queue/mode, and boat configuration where relevant.
- Timestamped accepted deployments/commands.
- Results and sufficient metadata to show the corresponding opponent profile.

### Playback/UI

- Battle Log retains the actual opponent ID/profile link.
- Add a friend from that profile.
- Replay a newly recorded match.
- Pause/resume, change speed, and restart playback.
- Share a real replay into clan chat.
- Playback is read-only: no trophies, gold, XP, chest wins, war rewards, donations, new results, or learning ingestion.
- Do not let replay tools leak hidden information into the live AI policy.
- Old log entries without recorded inputs remain in history but cannot be converted into genuine replays.
- Validate imported/loaded data and version compatibility; reject malformed/unbounded recordings.

### Storage

Replays use a **separate IndexedDB store**, retaining the newest 40 recordings up to 4 MB each. When persistent storage is blocked, the fallback is session-only. The standard profile export **does not include this replay database**.

This is a significant handoff warning: moving the source/build and importing only the profile does not necessarily transfer old replay recordings. Do not clear browser storage during archive repair. A combined backup/export tool is a reasonable future improvement, but is not claimed present.

---

## 26. Saves, migration, local hosting, and failure handling

### Profile data

Keep stable IDs and versioned normalization for:

- Player name, trophies/highest trophies, arena, wins/losses/draws/history.
- Card levels, copies, discovered cards, saved decks, active deck.
- Gold, gems, XP, King level, Star Points.
- Chests/progress, Trophy Road claims, gifts, inventory, tokens, magic items.
- Emote ownership/equipped selections and retired-skin refund receipts.
- World seed, friend/encounter IDs, clan state, member changes, chat, requests, trades, recruitment/catch-up timing, and war/trader state.
- Relevant settings, match receipts/serials, and migrations.

**OBSERVED:** the profile schema returns version `9`; the browser storage key remains **`web-royale-classic-v4`**. A schema-version bump is not a reason to change the key and make the user's save appear missing.

### Bounded detailed state

The v0.26 reports document:

| Data | Retention/limit |
|---|---:|
| Friends | 200 |
| Recent encounters | 200 |
| Observed identity deltas | 4000 |
| Detailed clan records | 12 |
| Replay recordings | 40, up to 4 MB each |
| Recent learning export records | 40 / 24 MiB |
| Offline raw learning archive | 512 MiB / 10000 records |

Procedural base identities remain reproducible outside these caches. Verify eviction behavior so an observed identity does not lose an important pending transaction or contradict a still-visible chat record.

### Migration rules accumulated through the project

- Chest-only ownership → source-agnostic eligible first-copy discovery.
- Older eligible copies must not remain incorrectly locked.
- Legacy deck/ownership evidence must be sanitized without losing legitimate collection progress.
- Old XP fields → cumulative XP/King level without double grants.
- Timed held chests → win-gated chests, preserving already-ready availability.
- Recolored tower skins → one-time refunds and Classic selection.
- Legacy imported emote IDs → only unambiguous original scene/export IDs; preserve owned/equipped state.
- Old fabricated clan shell → preserve name/player-authored messages without prepopulating false history or recharging creation cost.
- Removed settings cannot reactivate unequal alternate modes or disable mandatory previews/learning after an old save is imported.
- Old battle logs without replay data remain non-replayable, not silently reconstructed.
- Preserve active-model compatibility separately from ordinary player progression.

### Windows offline opener

`open offline.bat` should be at `Web-Royale/` and normally calls `offline build opener.bat`.

The bundled opener uses Windows PowerShell and C# to serve `dist/` on loopback, default **port 8080**, then opens the browser. It does not require Node, Python, Unity, or an emulator just to play the already-built game.

Keep the launcher window open during play. Close an older host before opening an updated copy. Running from inside the ZIP or merging a partial broken extraction is unsupported.

A different port, host spelling, browser, or browser profile can mean a different save origin. The source launcher explicitly warns that choosing another port uses a separate browser save. Export progress before changing origins; do not suggest clearing storage as a generic troubleshooting step.

### Development host versus offline opener

`npm run serve` is the Node static development host and also defaults to 8080. The Windows opener additionally has its existing AppData learning host behavior. Do not assume every host supports the disk learning API.

Opening `dist/index.html` directly as a `file:` URL is not the supported runtime: the bootstrap expects HTTP(S). The wrapper BAT contains emergency direct-file fallbacks; a complete build should include the real opener so it uses the correct host path.

### Failure handling

Keep errors visible rather than silently closing the BAT or claiming successful persistence. Validate save imports, fail safely on malformed data, preserve good state on storage errors, and keep result/claim/trade/reward IDs idempotent. A model write failure must not destroy the player's cards or trophies. A graphics import failure must not replace valid source files with placeholders unnoticed.

No Windows machine was used in the prior Linux test sessions. The BAT, Windows Explorer extraction, ordinary persistent IndexedDB on a real Windows origin, and AppData integration require actual Windows verification before those paths are claimed tested there.

---
## 27. Verified repository map and build workflow

### Repository shape

The repaired archive extracts to this project structure. Some source media files are intentionally restored from `dist/assets/` before a build; their absence from the un-restored source directory is not itself a missing-content bug.

```text
Web-Royale/
├── open offline.bat
├── offline build opener.bat
├── package.json
├── README.md
├── RECOVERY-NOTES.md
├── FIDELITY.md
├── LEARNING.md
├── CARD-COVERAGE.md
├── OFFLINE-OPENER.md
├── THIRD-PARTY-ART.md
├── SERVER-ROADMAP.md
├── src/                    # Browser shell, renderer, shared simulation, data services
├── assets/                 # Manifests, source data, converted SC scene descriptions
├── dist/                   # Complete static game; includes the single packaged media copy
├── tools/                  # Build, restoration, host, imports, packaging, benchmarks
├── tests/                  # Actual recovered Node and browser suites
└── docs/                   # Plans, source/asset provenance, recovery notes
```

### Source ownership map

| Files | Responsibility / continuation notes |
|---|---|
| `catalog.js`, `game-data.js`, `assets/game/data.json` | Stable card/entity definitions, source statistics, rarity offsets, behavior fields. Validate references rather than guessing missing stats. |
| `arena-grid.js`, `formations.js`, `placement.js` | Competitive geometry, footprints, spawn arrangements, soft-grid deployment. Keep human/AI/preview legality consistent. |
| `pathing.js`, `navigation.js` | Routes, clearance, river/bridge traversal, movement intent. Inspect both when diagnosing bridge stalls. |
| `battle.js`, `core.js` | Authoritative battle stepping and exported shared game API; targeting, attacks, projectiles, elixir, results. |
| `road-data.js`, `progression.js` | Arena and league thresholds, Trophy Road reward metadata and eligibility. |
| `player-xp.js`, `level-model.js` | Player cumulative XP/King progression and dynamic opponent collection/King levels. |
| `chest-rules.js`, `economy.js` | Win requirements, opening/claims, Shop grants, magic-item consumption, atomic local rewards. |
| `profile.js`, `platform.js` | Profile validation/migration, saved collections/decks/settings, repository and viewport/session adapters. |
| `match-rules.js` | Fixed queue-level policies and automatic Expert/Hard selection. Do not revive UI overrides here. |
| `ai.js`, `learning.js`, `learning-store.js`, `appdata-store.js` | Policy decisions, actual reward updates, browser persistence, and the loopback AppData adapter. |
| `training-decks.js`, `training-scheduler.js`, `training-worker.js` | Legal self-play decks, bounded scheduling, worker training. Same simulation as normal battles. |
| `emote-data.js`, `cosmetics.js`, `emote-player.js` | Imported emote metadata, ownership/equipped selection/cosmetic migrations, original SC-timeline animation playback. |
| `native.js`, `assets.js`, `fx.js` | Original scene/texture playback, asset loading/caching, spell/combat effects. |
| `battle-view.js`, `draw.js` | Accepted battle coordinate mapping/camera and entity/arena drawing. Protected appearance baseline. |
| `text.js`, `ui-polish.js`, `presentation.js`, `audio.js` | Glyph/image text rendering, proportional UI layout, source HUD timelines, local sounds. |
| `menu-model.js`, `announcements.js`, `app.js`, `index.template.html` | Menu models, match banners, application lifecycle/event handlers, DOM shell. |
| `world-state.js`, `world.js` | Versioned world state, deterministic player/clan lookup, encounter/friend/clan activity. |
| `clan-war.js`, `boat-battle.js` | War calendar/transactions/decks/duels/defenses and separate boat-battle adaptation. |
| `replay.js` | Recording persistence and action-based playback, separated from training and rewards. |
| `social-ui.js` | Clan/friend/profile/chat/war/replay screens and actions. |
| `v*.css` | Accumulated styling layers. Later versions override earlier rules; changing an old selector alone may do nothing. |

Most files are ordinary JavaScript modules wrapped for both the browser global namespace and CommonJS tests. The browser build concatenates them in a deliberate dependency order; this is not a Vite/React/TypeScript project. Do not introduce a new stack just to make a small fix.

### Actual browser module order

`tools/build-web.js` assembles these 44 modules:

```text
catalog → arena-grid → formations → placement → pathing → road-data
→ progression → player-xp → emote-data → cosmetics → chest-rules
→ world-state → profile → level-model → navigation → learning
→ learning-store → appdata-store → training-scheduler → ai → audio
→ training-decks → match-rules → battle → core → economy → assets
→ native → emote-player → battle-view → text → ui-polish → presentation
→ platform → menu-model → fx → draw → announcements → world
→ clan-war → boat-battle → replay → social-ui → app
```

The headless training bundle has a smaller explicit order ending with `ai`, `match-rules`, `battle`, and `core`. New simulation dependencies must be added to **both** relevant bundles, not just the browser application. The worker itself is emitted separately.

The stylesheet sequence is the HTML template's base styles followed by:

```text
v050 → v060 → v070 → v090 → v100 → v110 → v120 → v130 → v180
→ v200 → v210 → v220 → v240 → v250 → v260
```

There is no requirement that every release number have its own stylesheet. Do not infer a missing CSS file merely from a numbering gap.

### Actual package scripts

The inspected package requires **Node.js 22 or newer** for source builds/tests. It declares no external runtime package dependencies.

```json
{
  "build": "node tools/build-web.js",
  "test": "node tools/restore-source.cjs && node --test tests/*.test.cjs",
  "serve": "node tools/serve.cjs",
  "test:browser": "python -m unittest discover -s tests -p browser_v250.py",
  "test:ai": "node tools/benchmark-ai.cjs",
  "test:learning": "node tools/benchmark-learning.cjs"
}
```

The browser tests require their Python/Playwright/Chromium test environment. Inspect their imports/setup before installing tools. No such development environment is required for the user to launch the already-built Windows-hosted browser game.

### Source restoration and a safe build sequence

1. Keep a backup of the repaired archive and its checksum.
2. Extract to a fresh directory; put this handoff at the repository root.
3. Read the checked-in manifests and `tools/restore-source.cjs`.
4. Run source restoration before any external cleanup that deletes `dist/`.
5. Run the actual tests and build.
6. Serve the **new** `dist/` and inspect the pages, not an older still-running host.
7. Package only after browser checks and integrity checks complete.

```bash
# From the extracted Web-Royale repository:
node tools/restore-source.cjs
npm test
npm run build
npm run serve
```

`build-web.js` already invokes restoration **before** clearing its dedicated output directory. `npm test` also invokes restoration. An unrelated cleanup script that deletes `dist/assets/` first can destroy the only packaged copy of source media.

Restoration reads `dist/release.json`, validates required missing media against its hashes, and restores source PNG/WebP/WAV files. Existing source files are not blindly replaced. Source JSON, metadata, and code must still be present separately.

### Build products and versioning

A build writes hashed `runtime.*.json`, `app.*.js`, `styles.*.css`, `bootstrap.*.js`, training assets, `index.html`, media, and `release.json`. The runtime manifest points to actual emitted files; query-string revision hashes are stripped before accessing the corresponding local source image paths.

Application version appears in `package.json` **and** a build-tool constant. Update both intentionally for a new release. Rebuilding identical inputs should reproduce identical runtime file bytes; it does not have to reproduce the archive's timestamp or compression metadata unless that is separately controlled.

Do not delete old user storage, learning files, or replay records as part of a version bump.

### Browser commands that actually refer to present files

The default `npm run test:browser` targets only `browser_v250.py`. It is **not** the complete recovery/economy/social test suite.

These named suites are present in the repaired archive:

```bash
PYTHONPATH=tests python -m unittest -v \
  browser_v240 browser_v241 browser_v250 browser_recovery
```

PowerShell equivalent:

```powershell
$env:PYTHONPATH = "tests"
py -m unittest -v browser_v240 browser_v241 browser_v250 browser_recovery
```

Environment/browser binaries must be installed and the tests' fixture requirements met before those commands can succeed. Running every historical browser suite blindly is not automatically useful: some encode deliberately superseded interface contracts. Classify any failure rather than hiding it.

**Important stale command:** the recovered README mentions `browser_v260`; that file is **not present** in this repaired archive. Restore genuine v0.26 coverage or add equivalent regressions; do not report running a nonexistent suite.

### Packaging tool

The actual recovered packaging script accepts:

```bash
python tools/package-archive.py --root . --output ../Web-Royale-NEXT-Full-Build.zip
```

Use a new final name; the script refuses to overwrite an existing output. It writes `.partial`, closes the ZIP, checks CRCs/unique paths/manifest consistency, and only then renames it to the final path. It omits duplicate source media that can be restored from `dist/assets/`, large QA screenshots, development caches, input APKs/ZIPs, and font binaries.

This built-in check does not replace an independent extraction and verification of all runtime hashes. Test the actual final ZIP and, when possible, the downloaded delivery copy. The prior failure happened despite an earlier receipt describing a larger intended file.

---

## 28. Acceptance tests and release discipline

### Separate five kinds of evidence

1. **Source inspection:** a function or catalog entry exists.
2. **Regression behavior:** an executable test demonstrates the intended behavior.
3. **Browser integration:** the built game actually uses that behavior and displays its assets correctly.
4. **Native-reference parity:** measured outcomes agree with a specific reference clip or screenshot at matched conditions.
5. **Delivery integrity:** the shipped bytes are complete and reproducible after extraction.

Passing one is not proof of all the others. Neither an image filename nor a green static/source test proves a skin renders correctly. Neither copied card stats nor a successful battle proves all interactions are native-equivalent.

### Protected visual acceptance

Preserve or explicitly compare the accepted v0.25 camera, terrain, tower assembly, bridge position, portrait composition, and overlay-style battle HUD. Use the same viewport/reference conditions. Verify input coordinates, deployment ghosts, spell areas, health bars, projectiles, and pointer releases after any camera/layout edit.

Check all fifteen arenas in regulation and overtime, not only P.E.K.K.A's Playhouse. Confirm every needed source scene/texture is loaded. Inspect compact and tall screens, fullscreen, high-DPI rendering, resize, long names, and large currency values. Do not fix overflow by stretching text or shrinking a whole unrelated view.

### Combat regression minimum

- Troop soft-grid selection and actual formation equal the preview.
- Invalid deployment changes neither elixir nor card cycle.
- Buildings respect footprints; ordinary area spells have continuous aiming.
- Destroying one Princess Tower expands only the correct placement lane.
- Ground units cross either bridge in either direction at oblique angles, including large troops and crowded groups.
- Planner clearance and actual movement use compatible radius-aware geometry.
- Knockback and large movement steps cannot tunnel through buildings or forbidden terrain.
- Melee chase retargets to a nearer legal attack opportunity; valid committed swings do not endlessly restart.
- Building-only, flying, ground-only, minimum-range, invisibility, charge, dash, and jump rules remain distinct.
- First-hit preload, repeat hit interval, attack interruption, projectile impact, and status expiry are tested separately.
- Princess's real damage projectile is not replaced by its decorative volley projectiles.
- Fireball, Rocket, Arrows, Log, and Barbarian Barrel match their authoritative effect timing and source orientation.
- Mirror opening-hand restriction and level offset remain intact; clone, shields, chained hits, delayed spawns, and overlapping spell ticks do not duplicate or disappear.
- Simultaneous destruction, crowns, overtime, tiebreak decisions, result persistence, and replay reward suppression execute once.

### Economy/progression acceptance

Test new and migrated saves at arena boundaries. Bats must remain unobtainable before its arena, eligible-but-Not-Found at the gate, and owned after the first eligible copy from any valid grant. A Wild Card or Book must not bypass first-copy ownership. Old chest pools expand when a higher arena is reached.

Verify the twelve Hour Shop slots, exact rarity row order, locked future rarities, one-hour rollover, second-by-second countdown, stale-offer rejection, independent purchased slots, and no duplicate charge on rapid clicks. Currency packs and top-counter plus icons remain absent.

Check remaining-win labels at 1, 2, and 10 wins; wins/losses/practice/replay behavior; ready-state persistence; new chests not advancing from the win that first awards them; Chest Keys marking ready once; normal opening consuming a chest once. Test Books and Coins against real copies/gold/XP and insufficient-resource cases.

Verify dynamic rarity floors, acquisition difficulty, stable identity variation, Master I's 0–4 level-12 rule, higher-rank tightening, King-level variation, and the XP table. Separate Trophy Road collection levels from fixed alternate-mode Level 9.

### Social/world acceptance

A new player has no pre-added friends. Joining a clan does not befriend everybody. Profiles reached from a genuine Battle Log encounter or member list permit manual friendship.

Creating a clan leaves one member and no invented earlier chat. Reopening after elapsed time produces consistent recruitment rather than a different random history. Donations use real copies, limits, cooldowns and XP; repeated small catch-up ticks cannot refill a request repeatedly. Trades settle once and refund reserved unused tokens where appropriate. Leaving or switching a clan handles pending transactions coherently.

Use stable identity lookup across Battle Log, friends, clans, opponents, and wars. Check bounded retention and long-absent catch-up without allocating millions of active accounts or freezing the UI.

War tests need more than opening the screen: play sequential Duel rounds with different decks, preserve the opponent/series, spend only actual used decks, apply boat damage, prevent dead defenses returning midweek, claim a participating member's reward once, and settle Trader exchanges using real inventory.

### AI, replay, and persistence acceptance

Prove that legal match rewards update and persist the learner and can change future legal choices. A learning counter alone is insufficient. Test fresh saves, imports, multiple tabs, storage denied/full, model corruption, repeated match receipts, and version compatibility.

Keep live policy observations separate from hidden opponent variables and omniscient replay/debug state. Test that mouse movement/dragged cards/unrevealed hands do not leak into opponent actions. Do not accept cheating merely because it makes an Expert bot win.

Replays must reproduce recorded inputs/initial conditions with pause/speed/restart and no progression/learning grants. Old records lacking inputs cannot be reconstructed as genuine matches. Profile export is not a complete replay-database backup.

Verify the real Windows host, AppData writes, and normal-origin IndexedDB separately when a Windows environment becomes available; previous intercepted Chromium fixtures do not establish these integrations on Windows.

### Archive-release gate

Write an archive only after the game has been built, then:

1. Close and flush the archive before exposing its final name.
2. Record exact byte size and SHA-256.
3. Run a ZIP CRC check over **every entry**.
4. Reject duplicate paths, unsafe Windows filenames, symlinks, or unexpected archive nesting.
5. Independently extract into an empty directory.
6. Verify all files in `dist/release.json` against their hashes.
7. Run the served game from that extraction.
8. Restore source media and rebuild from the clean extraction; compare runtime hashes.
9. Include both offline launchers, editable source, manifests/data, assets, and the prepared `dist/`.
10. Check the actually delivered/downloaded copy when possible. If its size/hash differs, investigate truncation rather than blaming the user or asking them to clear game data.

Publish accurate results, commands, failures, and remaining limitations with each release. Avoid indiscriminate “all tests passed” when only one suite ran or inherited tests were unavailable.

---

## 29. Known gaps, follow-up priorities, and misleading old documentation

This is a continuation backlog, not a declaration that the user has approved a redesign. Preserve working accepted features while addressing it.

| Priority / topic | Current evidence and required follow-up |
|---|---|
| Archive integrity | The repaired ZIP is the verified baseline. The first v0.26 ZIP is genuinely truncated. Re-test the delivery artifact, not merely the pre-upload working folder. |
| Lost v0.26 coverage | Original 603-test suite and trailing support files were lost. The repaired 522-test suite is a different available set. Recreate regressions for all v0.26 contracts instead of repeating the original larger count. |
| Reconstructed social/war CSS | Game-code bundle survived unchanged, but some HTML/CSS was rebuilt. Compare the actual repaired UI to original v0.26 screenshots; do not assume complete visual preservation outside the specifically protected arena files. |
| Actual tower skins | Only Classic is available. Six recolor substitutes were removed/refunded. Full original equippable King/Princess skin sets, animation states, names, forward previews, and rotations remain open. |
| Native behavior parity | Targeted bridge/targeting/collision/attack fixes exist; universal tick-for-tick card interaction parity is not proven. Gather matched reference clips and regression scenarios rather than labeling all behavior exact. |
| Tiebreak presentation | Source performs an immediate lowest-surviving-tower-HP comparison; it does not implement the complete visible native tower-drain sequence requested earlier. See Section 18. |
| Individual AI economies | Four million identities are procedural, with bounded observed deltas. Every account does not independently earn/spend cards/currency and play all matches continuously. |
| Human-like conversation | Clan dialogue is contextual/template-driven. It is not demonstrated indistinguishable from humans, nor a fully general conversational system. |
| Clan Wars completeness | Main historical loops exist, but River/boat screens and parts of social management are browser adaptations. Exact all-feature native equivalence is not established. |
| Clan badge coverage | The v0.26 report describes only eight available original badge images, not the complete badge catalogue. |
| Dynamic card-level calibration | The model honors the user's upper-rank rule and progression factors, but per-card/per-arena population means are local calibration, not an official measured statistical dataset. |
| Trophy gain/loss fidelity | The recovered profile result code retains local flat win/loss changes (normally +30 / −20, subject to floors and queue rules). Do not call those universally exact native ladder calculations. |
| Reward catalogue breadth | Win requirements cover chest categories, but actual loot tables/content for every possible chest have not all been established. Unsupported reward kinds must not silently masquerade as complete correct tables. |
| Free/Crown chest timing | Separate inherited cooldown-based free/crown systems remain. The explicit win-unlock changes concern held battle chests; determine scope before replacing unrelated reward timing. |
| Full emote catalogue | 206 imported animation entries come from this historical downloadable archive. That does not prove the entire historical APK catalogue or current live catalogue has been imported. |
| Emote temporal/per-pixel parity | Prior sampled-frame audits prove visible changing animations; they are not exhaustive native comparisons of every frame/audio behavior. Keep original masks/transforms intact. |
| Modern content | Evolutions, Heroes, Champions, modern tower troops, Merge Tactics, Clan Voyage, and later balance systems are not part of the currently pinned 102-card historical browser snapshot. Do not import them accidentally from an older general prompt. |
| Challenge/tournament breadth | Some event modes exist, but the older full wishlist of Draft/Grand runs/tournaments/spectating is not demonstrated complete by a mode button. Record per-mode coverage. |
| Learning quality | Genuine reward updates and persistence are present; consistently increasing competence or human-level Expert play needs controlled evaluation. Difficulty naming and millions of identity IDs are not benchmarks. |
| Training while closed | Ordinary local training does not continue after the game and trainer stop. World catch-up is not continuous training. Earlier “always self-play” ambitions need an explicit scheduler design if resumed. |
| Windows validation | BAT execution, Windows Explorer extraction, disk-host behavior and regular persistent browser storage on Windows have not been verified by the previous Linux runs. |
| Full-save portability | Profile exports omit the separate replay store, and AI export is distinct. A single consolidated portable backup remains a possible improvement, not an existing promise. |
| Real asset/audio coverage | Preserve known original assets and inspect remaining source references. Older ad hoc repairs once substituted silent WAV files to make a build complete; that history is not permission to do so silently again. Audit actual audio rather than assuming names prove authenticity. |

### Documentation traps

- **Old broad master prompt:** contemporary September 2026 Windows/Unity/payment/pass assumptions conflict with the actual historical browser project.
- **Old league answers:** Master I was once incorrectly associated with 4900 trophies. The active source threshold is **6000**, with the full modernized 2021-era league ladder listed below.
- **Old rarity math:** shared raw level means or equal normalized percentages alone do not satisfy the final scarcity-aware distribution requirement.
- **Old ownership text:** “Find in Chests” and chest-only discovery are superseded by any eligible specific-card grant and the short label **Not Found**.
- **Old shop docs:** six daily offers, nine offers/three-hour reset, Daily Deals, purchasable/practice-grant currency, and resource plus icons are superseded.
- **Old custom skins:** lists of seven “tower styles” meant Classic plus six recolors, not seven original native skins. Those recolors are retired, not a completed cosmetic catalogue.
- **Old emotes:** nine static images plus CSS bounce were an intermediate workaround, not the final original animation import.
- **Old camera formulas:** 12%/15% zoom estimates and “fit all decorations” framing are superseded by the accepted measured v0.25 composition.
- **Old attack locking:** preserving a valid swing must not become indefinite target lock while chasing.
- **Old Pass UI:** callable remnants or saved pass fields are not authorization to restore the removed Pass Royale interface.
- **`README.md` test command:** references a missing `browser_v260` file. Use present tests and rebuild lost coverage.
- **`CARD-COVERAGE.md`:** includes an old coverage/static-stat presentation. Use the actual source definitions/current interaction tests, especially for historically corrected cards such as Princess.
- **`SERVER-ROADMAP.md`:** future architecture notes, not a requirement to add live human multiplayer, accounts, or a mandatory remote server to this offline game.
- **Repair app-hash test:** proving the recovered app matches the original bundle was a recovery-specific contract. A legitimate new code release will have a different hash; preserve the old receipt as provenance and revise the relevant test deliberately rather than disabling integrity verification entirely.

### Suggested engineering order after the handoff

First establish a local runnable baseline and restore lost v0.26 regression coverage. Keep arena geometry/appearance protected. Next reproduce reported remaining combat/UI defects with specific evidence. Treat complete original tower-skin import as a real missing-content task with a verified asset manifest, not another recolor pass. Deeper independent AI economies, richer dialogue, and full mode/war coverage should have explicit acceptance criteria and measured resource budgets.

---

## 30. Chronological requirement and release history

The dates of individual artifact metadata can reflect a tool/session clock; **version order and the user's successive corrections are the reliable precedence chain**. The table records meaningful decisions rather than claiming every intermediate chat was retrieved verbatim.

| Stage | What was requested, reported, or corrected | What survives / what was superseded |
|---|---|---|
| Original all-AI concept | Entire Clash Royale-like experience, learning opponents, trophies, clans, donations, wars, alternate modes and progression. A broad standalone Windows master prompt also included modern content and payments. | Preserve the experience/learning goal; later browser-specific decisions replace engine, snapshot and currency-purchase assumptions. |
| Browser project establishment | Run in a web browser, preserve actual named cards/art/UI, offline build and simple Windows launcher, full source ZIP updates. | Active platform contract. Do not move to Unity/Replit or an emulator. |
| Early progression/UI iterations | Training camp plus fourteen arenas through Serenity Peak, then leagues; original-looking menus and source images. Pass Royale later explicitly removed from browser UI. | Preserve the historical browser scope and removal, despite lingering old fields. |
| v0.10–v0.13 era | Trophy Road/reward eligibility, legal roster, 2v2, local learning, AppData persistence, self-play/worker scheduling, and always-on legal learning refinements. | Keep shared simulation and persistent learning; distinguish explicit self-play controls from match-driven updates. |
| v0.14 | Fresh account, starter ownership and rarity-based starting levels. | Do not seed a new player with an arbitrary fully level-9 collection. |
| v0.15 | Arena-gated chest discovery; old chests expand pools after a new arena. | Arena and pool rules survive; **chest-only** ownership restriction does not. |
| v0.16 | Tile placement, preview formations, spell-hit highlighting, targeting exclamation marks, collisions, Princess damage correction. | Retain as baseline behaviors and test cases. |
| v0.17 | Soft contact/formations, Fireball/rolling fixes, concerns about passing through troops and spinning. | Later collision/pathing work refines this; do not revive old shortcuts. |
| v0.18 | Spell/crown/end-flow work, native result presentation, anti-spin fixes. | Final flow still needs precise native comparison; earlier screenshots are references. |
| Initial dynamic-level patches | Arena-average card levels were proposed, then normalized by rarity. User rejected their inaccurate acquisition assumptions. | Those interim numeric means are not final authoritative empirical tables. |
| v0.19 | Acquisition-aware dynamic bot collection levels; Master I maxed-deck rule with a few level-12 cards; dynamic King levels; player XP; any-source eligible first-copy unlocking; eventual full build rather than just a patch. | Active progression contract with later fixed queue rules. |
| Initial arena/cosmetics expansion | User requested full surroundings, unclipped multipliers, match banners, tiebreak, cosmetics, win chests, high-quality graphics. One early implementation duplicated arena drawing and used incomplete cosmetic placeholders. | These were bugs/workarounds, not the desired fidelity reference. |
| v0.20 | Separate Collection subpages, Not Found text, tower previews, renderer crop/timer/spell/pathing fixes. Seven custom styles included recolors. | Collection split survives; later Decks list correction and real-skin requirement supersede cosmetic workaround. |
| v0.21 | Decks again shows non-deck cards below; Collection shows all. Locked/remaining-win labels, white emote bubbles, front-facing previews, cleaner battle header. | Active navigation/labels; original animation import comes later. |
| v0.22 | Visible chest-word spacing; another 12% zoom change; removed/refunded six recolors after user requested actual skins. | Refund and no-fake-skin policy survives; exact zoom estimate superseded. |
| Graphics ZIP inspection | Actual `CR-3.5.0-Graphics(1).zip` decoded: 97 dedicated bundles/206 named emote animation clips. Seasonal files did not establish complete equippable tower skins. | Verified historical asset source, not yet an import at that inspection moment. |
| v0.23 | Imported 206 original animation entries/icons, SC masks/transforms, white bubbles, equipped/expanded picker and hourly rotation. Restored user's earlier closer zoom while keeping scenery. | Imported animations survive. Subsequent v0.25 camera is the final accepted arena. |
| v0.24 | Proportional high-DPI text, non-stretched icon/frame scaling, sliced button backgrounds, layout cleanup. Prior missing v0.23 full source artifact meant some restoration/reverification occurred. | Preserve UI polish and accurate evidence about reconstructed history; not all old ZIPs are reliable sources. |
| v0.25 | Measured native screenshot camera and tall battle proportions; corrected tower assembly/character anchors, native HUD composition; movement sweeps, mass/contact, attack commitment, dash contact edges and river jumps. | **User explicitly accepted arena visuals.** Protect them. Combat still requested further fixes. |
| v0.26 | Soft placement, shared bridge clearance, nearer-melee retargeting, twelve rarity-row Hour Shop with seconds, removed currency packs/plus controls, genuine magic-item sprites, 4M players/50K clans, manual friends/recruitment/donations/trades/replays/war loops, fixed queue levels/Expert/previews/learning. | Latest active feature set; original report describes implementation but does not prove universal parity. |
| First v0.26 delivery | Intended 286 MB archive arrived truncated at about 72 MB. User correctly reported corruption. | Never use this truncated file as the base or blame extraction software. |
| v0.26 recovery | Intact original app bundle preserved; missing support files/media/tests reconstructed from previous complete sources/provenance. New 237,277,416-byte ZIP and checksum delivered. | **Current continuation baseline.** Repaired layouts/tests are not identical to the lost complete original package. |
| This handoff | Consolidation of latest requirements, exact baseline/hash/source map, history, asset gaps, and validation needs for Codex. | Documentation only; no new gameplay code or newly executed game test suite. |

### Historical test reports, not interchangeable guarantees

Reported Node/browser totals varied by release and test selection: v0.20 484/16; v0.21 488/26; v0.22 495/31; v0.23 506/40; v0.24 504/49; v0.25 518/59; original v0.26 603/44; repaired v0.26 522/18 distinct browser checks. These numbers are historical reports, **not one monotonic coverage metric**, and this document does not claim to have rerun them.

The recovery record, actual available tests, and fresh execution results in the receiving environment matter more than reproducing a prior headline number.

---

## 31. Older master-prompt ambitions: retain as history, not automatic scope

The retrieved `Clash_Royale_All_AI_Master_Prompt_v2.md` is a much broader, older 86-section design under the working title **Royale Adaptive Arena**. It expected a contemporary September 2026 Windows game and covered many systems not demonstrated complete in the current historical browser implementation.

### Valuable inherited principles

- A complete integrated game, not a battle demo plus unrelated social mockups.
- Stable content IDs, a pinned reference version, and an explicit fidelity/coverage ledger.
- One authoritative deterministic simulation and action validator for player, AI, replay, and self-play.
- Honest differences between an original asset, a substitute, an unverified interaction, and a missing feature.
- Fair observable information for live AI; hidden-state beliefs rather than omniscient access.
- Competent baseline behavior plus genuine persistent learning, rather than renamed difficulty presets or artificial stat advantages.
- Transactional economy/rewards/saves and exactly-once result processing.
- Bounded computation/storage, reproducible tests, quality evidence, and accessible local play.
- Stable AI identities used consistently across opponents, clans, friends and wars.
- Working menus and interactions rather than inert buttons that imply completed systems.

### Broader ambitions not established as completed here

Preserve these as a **historical wishlist** in the coverage ledger; do not invent implemented status:

| Area | Older ambition |
|---|---|
| AI behavior | Rich player-habit beliefs, archetype knowledge, opponent-specific memory, bounded tactical lookahead, human-plausible reaction variation, adaptation that responds when the human changes strategies. |
| Learning evaluation | Frozen baselines, held-out seeds, side/deck swaps, independent candidate-model promotion, forgetting/regression control, explicit proof that learned weights change useful decisions. |
| Optional advanced learning | Actual behavior cloning/PPO/recurrent policies and optional ONNX inference, only if genuinely implemented; never call a simple scorer PPO. |
| Individual simulated lives | Per-AI inventories, currency, deck-upgrade preferences, schedule, resource-backed requests, stable personal history, and an evolving rated population. |
| Rich social management | Clan discovery/settings/leadership/roles, clan mail, invites, richer context-grounded chat, moderation, and coherent relationship memories. |
| Challenges/drafting | Full Classic and Grand Challenge runs, Draft, Triple Draft, Mega Draft and an AI that actually makes their selection decisions. |
| Tournaments/ranked | Local equivalents of global/private tournaments, ranked progression, season/event registries, proper participant/reward state. |
| Friends/spectating | Functional friendly invitations and spectating connected to real simulated matches, not a fabricated video or replay mislabeled live. |
| Full audio/presentation | Appropriate original deployment/attack/destruction/elixir/timer/result sounds, complete animation states and matching native visual hierarchy. |
| Diagnostics | Reproducible interaction scenarios, event/elixir/target traces, optional decision explanations based on real scoring terms, model/observation versioning and export. |
| World catch-up | Multiscale simulation that advances offscreen activity coherently without replaying millions of full battles. |

### Explicitly superseded or outside the pinned version

Do **not** automatically act on these older directions:

- Switch to a Unity/C# native Windows game or require an editor/emulator to play.
- Upgrade the current 102-card historical roster to the contemporary 2026 live roster.
- Add Evolutions, Heroes, Champions, modern tower troops, or special deck slots merely because the generic prompt mentions them.
- Add Merge Tactics or Clan Voyage to this snapshot without a deliberate version/scope decision.
- Reintroduce purchasable gems/gold, free practice currency buttons, top-counter `+`, real checkout, or payment-provider/merchant infrastructure.
- Reintroduce the removed Pass Royale page or a paid pass solely because the original master prompt required it.
- Reinstate ordinary switches to disable previews/learning or select unequal challenge levels/manual difficulty.
- Treat original equal-level “practice only” wording as permission for alternate queues to use collection levels; the latest rule fixes all non-Trophy Road queues to Level 9.

The historical master prompt also required reporting unsupported source assets, benchmark evidence, and real runtime limitations honestly. Its breadth is not permission to claim those features were already shipped.

---

## 32. Asset and reference transfer inventory

### Recommended minimum transfer

Copy the following into the receiving workspace or make them accessible alongside it:

| File / material | Why it matters |
|---|---|
| `WEB_ROYALE_CODEX_HANDOFF.md` | This consolidated specification and evidence map. |
| `Web-Royale-v0.26.0-Repacked-Full-Build.zip` | Exact current game/source baseline; checksum in Section 2. |
| `Web-Royale-v0.26.0-Repacked-SHA256.txt` | Independent delivery checksum for that specific repaired ZIP. |
| `Web-Royale-v0.26.0-Archive-Repair-Report.md` | Explains what was preserved/reconstructed and the smaller available test suite. |
| `IMG_4991.png` | Actual-game reference that guided the accepted tall arena/tower/HUD composition. |
| `Web-Royale-v0.25.0-Arena-Preview.png` and `Web-Royale-v0.25.0-Comparison.jpg` | Accepted arena output and comparison; preserve instead of resuming arbitrary zoom changes. |
| `CR-3.5.0-Graphics(1).zip` | Original downloadable source assets, especially actual emote animation bundles, for future reimports. |
| `CR-3.5.0-Graphics-Cosmetics-Inspection.txt` | Original decoded bundle/clip inventory and tower-skin findings. |

The Markdown document is not the game, the original SC asset archive, or a complete replay/AI-data backup. Transfer the relevant real files as well; filenames alone are not substitutes for their bytes.

### Additional useful references

- `Web-Royale-v0.26.0-Build-Report.md` and original UI preview: record the intended pre-corruption scope/layout. Treat original test totals as historical.
- `Web-Royale-v0.25.0-Full-Build.zip`: last complete pre-v0.26 arena/source baseline, useful for comparison, not for discarding v0.26 functionality.
- Earlier v0.20–v0.24 reports: explain intermediate fixes and misleading workaround claims.
- `Photos-1-001(1).zip` and earlier collection/shop screenshots: normal-style Collection and menu references.
- `48cadd2c-8a0b-476c-becb-bb1631cfa250.png`: user-marked old **zoom** reference.
- `91a15069-f805-4f2c-9c52-e90ae5c20683.png`: user-marked **detail** reference with excessive zoom-out; keep detail, not its rejected framing.
- `ab6045c5-5b61-4ab2-9fc0-5dbf6e02f3e7.png`: earlier Web Royale comparison screenshot, not the final accepted output.
- `9eea83f7-9d89-4ede-a411-af2eba62afab.png`, `dfc2bc6e-18b7-4328-b31d-dd45fa9d590e.png`, `d04004b6-f48d-42c6-b8c1-117f2c8db0e3.png`: Decks/Collection, overlapping Not Found precursor text, blank skin previews/unwanted Shop inventory complaints.
- `2d41b3f5-b8dd-4645-bcc3-daf027202f7c.png`: earlier clipped battle-header complaint.
- The base `Clash Royale-3.5.0.apk`, if independently accessible: next potential source to inspect for missing complete skins. Its existence in a project listing does not prove readable bytes, and the repaired game ZIP does not include it.
- Earlier source-captured match video, if available: useful for spell timing, attack cadence, crowns and result-flow measurements. Do not fabricate behavior inferred from an unavailable recording.

The long `user-.../mnt/data/...` paths visible in earlier chat tools were temporary container locations, not repository-relative paths. Preserve the useful images under sensible local `references/` names, with their purpose recorded; do not hardcode transient chat paths into the game.

### Original graphics archive findings

The uploaded downloadable graphics archive contains **97 dedicated emote SC bundles with 206 named animation clips**, embedded graphics, and seasonal files. `emotes_PEKKA_boombox_dl.sc` includes a 150-frame/60-FPS clip; `emotes_goblin_01_dl.sc` contains four clips, each 145–154 frames, according to the earlier decoded inspection.

There are 21 seasonal bundles, but seasonal names alone do not establish equippable tower skins. `holiday_tower` and `holiday_tower2` are arena-scene objects, not a verified complete King-plus-Princess cosmetic set. A file such as `fx-building_towerskin_season_15a-0.webp` is likewise not, by filename alone, proof that every needed animated skin assembly is available.

The archive's README identifies it as downloadable files absent from the base APK. It is **not** a full self-contained copy of every asset in the base game.

### Provenance and extraction policy

Retain source archive hashes, scene/export IDs, crop bounds, atlas hashes, conversion tool versions, and output hashes. The current original magic-item and boat extraction records are:

```text
assets/ui/v260-atlas-provenance.json
assets/ui/v260-boat-provenance.json
docs/recovery/image-recovery.json
```

Inspect `tools/sc_codec.py`, `tools/import-animated-emotes.py`, `tools/render-emote-icons.py`, `tools/verify-emote-import.py`, existing native renderer behavior, and masks before replacing an import pipeline.

Do not flatten real animated content into a single PNG and call the animation complete. Do not package source font binaries; preserve the existing rendered glyph/image approach. Original input APKs/ZIPs stay separate from the normal game release unless the user separately requests an asset-source transfer and it is appropriate to provide it.

---

## 33. Source-derived card roster

**OBSERVED from the repaired v0.26 source:** 102 playable catalog entries: 72 Troops, 12 Buildings, and 18 Spells. This list uses normalized `RoyaleCatalog.CARDS` and `RoyaleProgression.cardArenaNumber()`, rather than inferring behavior or unlock order from screenshots.

The unlock column is the source arena index as interpreted by the active eligibility function. **0 = Training Camp**. Source arena indices are mapped onto the retained browser road; do not substitute current live-game unlock locations. Starter ownership is an additional explicit rule. Inclusion in this table does not establish complete native interaction fidelity.

| # | Card | Stable ID | Type | Elixir | Rarity | Unlock arena index |
|---:|---|---|---|---:|---|---:|
| 1 | Knight | `knight` | Troop | 3 | Common | 0 |
| 2 | Archers | `archers` | Troop | 3 | Common | 0 |
| 3 | Goblins | `goblins` | Troop | 2 | Common | 1 |
| 4 | Giant | `giant` | Troop | 5 | Rare | 0 |
| 5 | P.E.K.K.A | `pekka` | Troop | 7 | Epic | 4 |
| 6 | Minions | `minions` | Troop | 3 | Common | 0 |
| 7 | Balloon | `balloon` | Troop | 5 | Epic | 6 |
| 8 | Witch | `witch` | Troop | 5 | Epic | 2 |
| 9 | Barbarians | `barbarians` | Troop | 5 | Common | 3 |
| 10 | Golem | `golem` | Troop | 8 | Epic | 3 |
| 11 | Skeletons | `skeletons` | Troop | 1 | Common | 2 |
| 12 | Valkyrie | `valkyrie` | Troop | 4 | Rare | 2 |
| 13 | Skeleton Army | `skeleton-army` | Troop | 3 | Epic | 0 |
| 14 | Bomber | `bomber` | Troop | 2 | Common | 2 |
| 15 | Musketeer | `musketeer` | Troop | 4 | Rare | 0 |
| 16 | Baby Dragon | `baby-dragon` | Troop | 4 | Epic | 0 |
| 17 | Prince | `prince` | Troop | 5 | Epic | 0 |
| 18 | Wizard | `wizard` | Troop | 5 | Rare | 5 |
| 19 | Mini P.E.K.K.A | `mini-pekka` | Troop | 4 | Rare | 0 |
| 20 | Spear Goblins | `spear-goblins` | Troop | 2 | Common | 1 |
| 21 | Giant Skeleton | `giant-skeleton` | Troop | 6 | Epic | 2 |
| 22 | Hog Rider | `hog-rider` | Troop | 4 | Rare | 1 |
| 23 | Minion Horde | `minion-horde` | Troop | 5 | Common | 4 |
| 24 | Ice Wizard | `ice-wizard` | Troop | 3 | Legendary | 8 |
| 25 | Royal Giant | `royal-giant` | Troop | 6 | Common | 7 |
| 26 | Guards | `guards` | Troop | 3 | Epic | 7 |
| 27 | Princess | `princess` | Troop | 3 | Legendary | 7 |
| 28 | Dark Prince | `dark-prince` | Troop | 4 | Epic | 7 |
| 29 | Three Musketeers | `three-musketeers` | Troop | 9 | Rare | 7 |
| 30 | Lava Hound | `lava-hound` | Troop | 7 | Legendary | 4 |
| 31 | Ice Spirit | `ice-spirit` | Troop | 1 | Common | 8 |
| 32 | Fire Spirits | `fire-spirits` | Troop | 2 | Common | 5 |
| 33 | Miner | `miner` | Troop | 3 | Legendary | 4 |
| 34 | Sparky | `sparky` | Troop | 6 | Legendary | 11 |
| 35 | Bowler | `bowler` | Troop | 5 | Epic | 8 |
| 36 | Lumberjack | `lumberjack` | Troop | 4 | Legendary | 8 |
| 37 | Battle Ram | `battle-ram` | Troop | 4 | Rare | 3 |
| 38 | Inferno Dragon | `inferno-dragon` | Troop | 4 | Legendary | 6 |
| 39 | Ice Golem | `ice-golem` | Troop | 2 | Rare | 8 |
| 40 | Mega Minion | `mega-minion` | Troop | 3 | Rare | 4 |
| 41 | Dart Goblin | `dart-goblin` | Troop | 3 | Rare | 9 |
| 42 | Goblin Gang | `goblin-gang` | Troop | 3 | Common | 9 |
| 43 | Electro Wizard | `electro-wizard` | Troop | 4 | Legendary | 11 |
| 44 | Elite Barbarians | `elite-barbarians` | Troop | 6 | Common | 10 |
| 45 | Hunter | `hunter` | Troop | 4 | Epic | 1 |
| 46 | Executioner | `executioner` | Troop | 5 | Epic | 12 |
| 47 | Bandit | `bandit` | Troop | 3 | Legendary | 9 |
| 48 | Royal Recruits | `royal-recruits` | Troop | 7 | Common | 7 |
| 49 | Night Witch | `night-witch` | Troop | 4 | Legendary | 5 |
| 50 | Bats | `bats` | Troop | 2 | Common | 5 |
| 51 | Royal Ghost | `royal-ghost` | Troop | 3 | Legendary | 12 |
| 52 | Ram Rider | `ram-rider` | Troop | 5 | Legendary | 10 |
| 53 | Zappies | `zappies` | Troop | 4 | Rare | 11 |
| 54 | Rascals | `rascals` | Troop | 5 | Common | 9 |
| 55 | Cannon Cart | `cannon-cart` | Troop | 5 | Epic | 10 |
| 56 | Mega Knight | `mega-knight` | Troop | 7 | Legendary | 7 |
| 57 | Skeleton Barrel | `skeleton-barrel` | Troop | 3 | Common | 6 |
| 58 | Flying Machine | `flying-machine` | Troop | 4 | Rare | 6 |
| 59 | Wall Breakers | `wall-breakers` | Troop | 2 | Epic | 0 |
| 60 | Royal Hogs | `royal-hogs` | Troop | 5 | Rare | 7 |
| 61 | Goblin Giant | `goblin-giant` | Troop | 6 | Epic | 9 |
| 62 | Fisherman | `fisherman` | Troop | 3 | Legendary | 10 |
| 63 | Magic Archer | `magic-archer` | Troop | 4 | Legendary | 5 |
| 64 | Electro Dragon | `electro-dragon` | Troop | 5 | Epic | 11 |
| 65 | Firecracker | `firecracker` | Troop | 3 | Common | 10 |
| 66 | Elixir Golem | `elixir-golem` | Troop | 3 | Rare | 11 |
| 67 | Battle Healer | `battle-healer` | Troop | 4 | Rare | 12 |
| 68 | Skeleton Dragons | `skeleton-dragons` | Troop | 4 | Common | 12 |
| 69 | Mother Witch | `mother-witch` | Troop | 4 | Legendary | 9 |
| 70 | Electro Spirit | `electro-spirit` | Troop | 1 | Common | 11 |
| 71 | Electro Giant | `electro-giant` | Troop | 8 | Epic | 11 |
| 72 | Cannon | `cannon` | Building | 3 | Common | 3 |
| 73 | Goblin Hut | `goblin-hut` | Building | 5 | Rare | 1 |
| 74 | Mortar | `mortar` | Building | 4 | Common | 6 |
| 75 | Inferno Tower | `inferno-tower` | Building | 5 | Rare | 4 |
| 76 | Bomb Tower | `bomb-tower` | Building | 4 | Rare | 10 |
| 77 | Barbarian Hut | `barbarian-hut` | Building | 7 | Rare | 3 |
| 78 | Tesla | `tesla` | Building | 4 | Common | 11 |
| 79 | Elixir Collector | `elixir-collector` | Building | 6 | Rare | 8 |
| 80 | X-Bow | `x-bow` | Building | 6 | Epic | 6 |
| 81 | Tombstone | `tombstone` | Building | 3 | Rare | 2 |
| 82 | Furnace | `furnace` | Building | 4 | Rare | 5 |
| 83 | Goblin Cage | `goblin-cage` | Building | 4 | Rare | 12 |
| 84 | Fireball | `fireball` | Spell | 4 | Rare | 0 |
| 85 | Arrows | `arrows` | Spell | 3 | Common | 0 |
| 86 | Rage | `rage` | Spell | 2 | Epic | 10 |
| 87 | Rocket | `rocket` | Spell | 6 | Rare | 6 |
| 88 | Goblin Barrel | `goblin-barrel` | Spell | 3 | Epic | 1 |
| 89 | Freeze | `freeze` | Spell | 4 | Epic | 8 |
| 90 | Mirror | `mirror` | Spell | Last card + 1 | Epic | 12 |
| 91 | Lightning | `lightning` | Spell | 6 | Epic | 4 |
| 92 | Zap | `zap` | Spell | 2 | Common | 4 |
| 93 | Poison | `poison` | Spell | 4 | Epic | 5 |
| 94 | Graveyard | `graveyard` | Spell | 5 | Legendary | 12 |
| 95 | The Log | `the-log` | Spell | 2 | Legendary | 6 |
| 96 | Tornado | `tornado` | Spell | 3 | Epic | 5 |
| 97 | Clone | `clone` | Spell | 3 | Epic | 11 |
| 98 | Earthquake | `earthquake` | Spell | 3 | Rare | 9 |
| 99 | Barbarian Barrel | `barbarian-barrel` | Spell | 2 | Epic | 3 |
| 100 | Heal Spirit | `heal-spirit` | Troop | 1 | Rare | 10 |
| 101 | Giant Snowball | `giant-snowball` | Spell | 2 | Common | 8 |
| 102 | Royal Delivery | `royal-delivery` | Spell | 3 | Common | 12 |

**Mirror:** the source stores a base cost field of 1, but its effective played cost is the previous card plus one. **Heal Spirit:** normalized as a Troop even though its source record is in the other-spells table. Keep these exceptions when regenerating catalogs, filters, shop eligibility, or tests.

---

## 34. Source-derived configuration tables and baseline hashes

These tables capture **the current implementation**, not a claim that every value is official, statistically measured, or the final answer to all fidelity questions. They are useful to detect unintended changes during transfer.

### Arena and league thresholds

| Arena | Name | ID | Entry trophies |
|---:|---|---|---:|
| 0 | Training Camp | `training` | Separate training scene/queue |
| 1 | Goblin Stadium | `goblin` | 0 |
| 2 | Bone Pit | `bone` | 300 |
| 3 | Barbarian Bowl | `barbarian` | 600 |
| 4 | P.E.K.K.A’s Playhouse | `pekka` | 1000 |
| 5 | Spell Valley | `spell` | 1300 |
| 6 | Builder’s Workshop | `builder` | 1600 |
| 7 | Royal Arena | `royal` | 2000 |
| 8 | Frozen Peak | `frozen` | 2300 |
| 9 | Jungle Arena | `jungle` | 2600 |
| 10 | Hog Mountain | `hog` | 3000 |
| 11 | Electro Valley | `electro` | 3400 |
| 12 | Spooky Town | `spooky` | 3800 |
| 13 | Rascal’s Hideout | `rascals` | 4200 |
| 14 | Serenity Peak | `serenity` | 4600 |

| League | Entry trophies | Maximum level-12 cards in an 8-card generated deck | Level-12 per-card draw probability at band start → end | Bot King level-12 probability |
|---|---:|---:|---|---:|
| Challenger I | 5000 | Normal dynamic model | Not this rule | Normal dynamic model |
| Challenger II | 5300 | Normal dynamic model | Not this rule | Normal dynamic model |
| Challenger III | 5600 | Normal dynamic model | Not this rule | Normal dynamic model |
| Master I | 6000 | 4 | 0.220 → 0.170 | 0.220 |
| Master II | 6300 | 3 | 0.150 → 0.110 | 0.120 |
| Master III | 6600 | 2 | 0.100 → 0.070 | 0.060 |
| Champion | 7000 | 1 | 0.060 → 0.040 | 0.025 |
| Grand Champion | 7300 | 1 | 0.030 → 0.015 | 0.010 |
| Royal Champion | 7600 | 0 | 0.000 → 0.000 | 0.000 |
| Ultimate Champion | 8000 | 0 | 0.000 → 0.000 | 0.000 |

The level-12 count uses draws followed by the specified maximum cap and weighted card selection. Thus the probability column is **not** a direct guarantee of exactly that fraction of final cards. From Master I upward, generated ordinary deck cards are exclusively 12 or 13 under this model. Royal Champion and Ultimate Champion are fully level 13 in the current configuration.

### Current local development and King centers

| Arena | Collection-development center | King-level center before league rules |
|---:|---:|---:|
| 1 | 0.10 | 2.0 |
| 2 | 0.17 | 3.0 |
| 3 | 0.24 | 4.0 |
| 4 | 0.31 | 5.0 |
| 5 | 0.39 | 6.0 |
| 6 | 0.47 | 7.0 |
| 7 | 0.55 | 7.7 |
| 8 | 0.62 | 8.4 |
| 9 | 0.69 | 9.0 |
| 10 | 0.75 | 9.6 |
| 11 | 0.80 | 10.1 |
| 12 | 0.85 | 10.6 |
| 13 | 0.89 | 11.0 |
| 14 | 0.92 | 11.4 |

`level-model.js` further applies account variation, card noise/favorites/neglect, unlock-age lag, rarity-derived scarcity, and rare outliers. Display level is rounded/clamped between the rarity floor and 13. Challenger-band interpolation and Master-plus rules override the arena table. These are model parameters, **not verified average levels for every card/arena**.

### Source rarity upgrade/donation data

Arrays below are indexed from that rarity’s starting displayed level. Terminal zero entries correspond to the maxed state. Use the actual current-level offset when awarding XP or quoting upgrades; do not index a Legendary’s level directly into a Common array.

#### Common — starting level 1

```json
{
  "ChanceWeight": 194,
  "DonateReward": 5,
  "DonateXP": 1,
  "UpgradeMaterialCount": [
    2,
    4,
    10,
    20,
    50,
    100,
    200,
    400,
    800,
    1000,
    2000,
    5000,
    0
  ],
  "UpgradeCost": [
    5,
    20,
    50,
    150,
    400,
    1000,
    2000,
    4000,
    8000,
    20000,
    50000,
    100000,
    0
  ],
  "UpgradeExp": [
    4,
    5,
    6,
    10,
    25,
    50,
    100,
    200,
    400,
    600,
    800,
    1600,
    0
  ]
}
```

#### Rare — starting level 3

```json
{
  "ChanceWeight": 10,
  "DonateReward": 50,
  "DonateXP": 10,
  "UpgradeMaterialCount": [
    2,
    4,
    10,
    20,
    50,
    100,
    200,
    400,
    800,
    1000,
    0
  ],
  "UpgradeCost": [
    50,
    150,
    400,
    1000,
    2000,
    4000,
    8000,
    20000,
    50000,
    100000,
    0
  ],
  "UpgradeExp": [
    6,
    10,
    25,
    50,
    100,
    200,
    400,
    600,
    800,
    1600,
    0
  ]
}
```

#### Epic — starting level 6

```json
{
  "ChanceWeight": 1,
  "DonateReward": 500,
  "DonateXP": 10,
  "UpgradeMaterialCount": [
    2,
    4,
    10,
    20,
    50,
    100,
    200,
    0
  ],
  "UpgradeCost": [
    400,
    2000,
    4000,
    8000,
    20000,
    50000,
    100000,
    0
  ],
  "UpgradeExp": [
    25,
    100,
    200,
    400,
    600,
    800,
    1600,
    0
  ]
}
```

#### Legendary — starting level 9

```json
{
  "ChanceWeight": 1,
  "DonateReward": 50,
  "DonateXP": 25,
  "UpgradeMaterialCount": [
    2,
    4,
    10,
    20,
    0
  ],
  "UpgradeCost": [
    5000,
    20000,
    50000,
    100000,
    0
  ],
  "UpgradeExp": [
    250,
    600,
    800,
    1600,
    0
  ]
}
```

`ChanceWeight` is one input to the local scarcity model; it is not by itself a complete chest-drop probability or a measured time-to-upgrade model.

### Release identity and protected-file hashes

```json
{
  "version": "0.26.0",
  "target": "web",
  "snapshot": "3.2557.2",
  "cards": 102,
  "scenes": 109,
  "runtime": "runtime.04dabe7db8ed.json",
  "app": "app.4edeb8d0c883.js",
  "bootstrap": "bootstrap.923c55511a18.js",
  "styles": "styles.d17d053caa01.css"
}
```

SHA-256 hashes of the actual baseline files read for this handoff:

| Repository-relative file | SHA-256 |
|---|---|
| `src/battle-view.js` | `02ab31393150533987053d118377259f2e753cc278cd4ca26cb81ade6fd00c8a` |
| `src/v250.css` | `158fa80b5635ad9724375eac6dce9279af097b269051f5e666c70ca72e0125f4` |
| `src/draw.js` | `114079e49d10a60ef68d6e11c0c9b1afe3837d8778debc1556e9dbd8556272f0` |
| `assets/native/data.json` | `6186085a4ccde9e979ec01493cf6e113888292d46c6f1514ad85c69fbe7428ee` |
| `assets/presentation/data.json` | `b53fd1dac1c080300457f513ac8ab8ad2ed0972c0a159e2bb4e93c9ffe04d26b` |
| `src/native.js` | `3b1a672e23403d2c1e47ea0967a3a793c4f69be1edefb4bd5e9844a7b898ab10` |
| `src/placement.js` | `690348b07239b94f978896f31ce306ceccbbd302cac011fcec5df9f5db4dede0` |
| `src/pathing.js` | `7e9a43c04ad2acda73dfcd13a38f1b28c9d4c9b53f3054a0481848c324a7bdb6` |
| `src/navigation.js` | `b2fe8c8b6e6b80e6e2e5001931dbe030948d95f958c7cc7ade0dc567d3a61b75` |
| `src/battle.js` | `123afc4f646c0ebd5b2f2ff70a420312dd0c6827682ae51a1aee11242e478367` |
| `src/profile.js` | `8b72158cdc9566725c54ec1266576809c67b49bff6a8c18a9b33b33ffdf80259` |
| `src/match-rules.js` | `756cfa8e72515c9070d84d5fbb7d96dfa01caf89e183927d77b4dae50962096f` |
| `assets/game/data.json` | `56c4be256a0690372880b24f26e715ea3eb5f1474834e3227c2d093ad68c6b2a` |
| `assets/emotes/catalog.json` | `78c1154660993d3457f8b7dc6f3f9b75d1d0d243efac67a76597451e6657b5f6` |
| `dist/app.4edeb8d0c883.js` | `4edeb8d0c883ef1548f8d64e089546ae6f2506bf09d873e98c2348f80ebbd246` |

The emote manifest contains **206 entries** referencing **97 dedicated scenes**. The release manifest lists **1181 emitted runtime files**; its `scenes` field of 109 is not the same thing as total emote count or a count of playable arenas.

The first five hashes identify the expressly protected arena/camera/data baseline. Hash changes can be legitimate when intentionally fixing those files, but should trigger a visual/input regression review, not be hidden. For ordinary shop/clan changes, preserving them exactly is the safest baseline.

### Source archive fingerprints for transfer

| File | Bytes | SHA-256 |
|---|---:|---|
| `Web-Royale-v0.26.0-Repacked-Full-Build.zip` | 237277416 | `fe82128360ae2501634e14ffce420430656f60fe27a7440f9ef37ce43766c133` |
| `CR-3.5.0-Graphics(1).zip` | 159308987 | `870e6f50be30526bccdc444ffde5c2756691cd3bc526de48b75f2a4a759d2b81` |
| `IMG_4991.png` | 2866021 | `f334f7023296607c64a26b55b3f8cc2ac2c6f8cb1880bb9f0420daa79e1cc56c` |

These fingerprints refer to the copies available during handoff preparation. They are not replaced by a similarly named older ZIP, an incomplete download, or a screenshot of a filename.

---

## 35. Evidence/source index

The references below are filenames, repository paths, and descriptions usable outside this chat. Chat-only tool IDs and temporary download URLs are not required to understand this handoff.

| Evidence ID | Source | How it was used / confidence boundary |
|---|---|---|
| E1 | User instructions and corrections in the Web Royale conversation | Primary authority for goals, accepted arena appearance, rejected workarounds, latest shop/chest/collection/mode/AI/social rules, and full-build delivery expectations. |
| E2 | Available earlier Web Royale project conversation context | Recovered browser-specific requests such as Serenity Peak progression, removal of Pass Royale, original UI, local learning/AppData, and self-play ambitions. Not treated as a complete verbatim transcript. |
| E3 | `Web-Royale-v0.26.0-Repacked-Full-Build.zip` | Directly inspected current source, manifests, configuration, module order, package scripts, available tests and tool interfaces. Whole ZIP CRCs and 1,181 runtime hashes checked for this handoff. |
| E4 | `Web-Royale-v0.26.0-Archive-Repair-Report.md`, `RECOVERY-NOTES.md`, `docs/recovery/` | Explains exact original truncation, unchanged recovered app bundle, reconstructed scaffolding/styles, regenerated original-image crops, and historical repair test results. |
| E5 | `Web-Royale-v0.26.0-Build-Report.md` / retained prior report | Detailed intended pre-corruption feature scope and historical verification. Used to distinguish the original suite from the smaller recovered suite. |
| E6 | v0.25 build report, arena preview/comparison, `IMG_4991.png`, accepted source files | Final accepted arena/tower/HUD composition and measured camera history. User acceptance outranks the earlier competing zoom adjustments. |
| E7 | v0.19–v0.24 reports and screenshots | Progression/cosmetic/UI implementation history; identifies superseded chest-only discovery, recolors, static-bounce emotes, old framing, and intervening source-restoration work. |
| E8 | `CR-3.5.0-Graphics(1).zip`, `CR-3.5.0-Graphics-Cosmetics-Inspection.txt`, `assets/emotes/catalog.json` | Dedicated original animation bundle inventory, imported scene/export identities, original-asset versus full-catalog distinction, and lack of verified complete equippable tower skins. |
| E9 | `assets/ui/v260-atlas-provenance.json`, `v260-boat-provenance.json`, `docs/recovery/image-recovery.json` | Original sprite crops/hashes for Books, Key, Coin and boat components; recovery versus placeholder distinction. |
| E10 | `Clash_Royale_All_AI_Master_Prompt_v2.md`, text equivalent and changes note | Older broad design intent; used only where compatible and otherwise retained as superseded/history or an uncompleted wishlist. Not the active platform/version/payment specification. |
| E11 | `README.md`, `LEARNING.md`, `FIDELITY.md`, `CARD-COVERAGE.md`, `OFFLINE-OPENER.md`, `THIRD-PARTY-ART.md`, `SERVER-ROADMAP.md` | Repository documentation with explicit cautions about age, unsupported commands, old stats, future plans, and incomplete fidelity. Actual inspected code/available tests take precedence for current implementation. |

### Historical external references already recorded in project materials

No new external research was needed to create this consolidation. The following references are **historical pointers from the project**, not freshly fetched authorities for current live-game rules. Pin the historical effective version before using them for future implementation.

```text
Supercell — Clan Wars: What Has Changed? (5 July 2021)
https://supercell.com/en/games/clashroyale/blog/fun/clan-wars-what-has-changed/

Supercell — CLAN WARS 2 IS HERE! (31 August 2020)
https://supercell.com/en/games/clashroyale/blog/release-notes/clan-wars-2-is-here/
2021 changes supersede incompatible launch-era boat-repair rules.

RoyaleAPI — Secret Stats
https://royaleapi.com/blog/secret-stats
Historical project reference for attack/load/preload and displacement discussion;
not an assertion that every source statistic or current behavior was verified.

Supercell Make — Tower Skin assets
https://make.supercell.com/en/create/clash-royale/tower-skin/assets
Earlier attempts did not produce an importable complete original skin pack.
Do not claim this URL alone supplies the missing assets or required permission.

SC format tools / documentation
https://github.com/jeanbmar/sc-tools
https://github.com/Daniil-SV/SupercellSWF-JS
Used historically to understand scene/movie-clip/mask structures.
Keep original Mask → Masked → Unmasked behavior when decoding emotes.
```

Do not replace private project references with unrelated web results. A connection/search result showing a file title is not proof of an accessible asset archive. Check real local bytes first. A source-stat reference is evidence for its specific claim, not blanket evidence of a native engine reimplementation.

---

## 36. Suggested first Codex task

Place this Markdown file in the extracted `Web-Royale/` repository. Keep the repaired ZIP/checksum and key reference images accessible outside the output directory. Do not assume the receiving environment can open old `sandbox:` chat links or transient container paths.

The following is a ready-to-use continuation instruction:

```text
Read WEB_ROYALE_CODEX_HANDOFF.md completely, with particular attention to
Sections 1–6, 27–29, and the repair/provenance notes.

Continue the existing Web Royale browser project. Do not restart it or switch
engines. Use Web-Royale-v0.26.0-Repacked-Full-Build.zip as the continuation
baseline, not the truncated original v0.26 archive.

First verify the local source/artifact inventory and establish a reproducible
build/test baseline. Check source restoration before deleting dist assets.
Report which tests actually exist; the original browser_v260/603-test suite
was partly lost in archive recovery. Do not repeat old test totals as new
results. Keep a fidelity/coverage ledger distinguishing required, implemented,
tested, accepted, approximated and missing features.

Preserve the explicitly accepted v0.25 arena composition and current pointer
mapping, all 206 original imported emote animations, profile compatibility,
Hour Shop/12 rarity slots/hourly countdown, win-based chests, source-agnostic
card discovery, fixed queue levels, and always-on legal-match learning.
Do not reintroduce recolored tower skins, currency packs/plus buttons, removed
settings, or the removed Pass Royale interface.

When implementing the next requested change, inspect the actual relevant
modules, reproduce the issue, add a meaningful regression, make the smallest
coherent fix, and test the built browser game. Use original supplied assets;
missing actual tower skins remain a real missing-content task, not permission
to add recolors or placeholders and call them complete.

Do not ask routine approval questions. Preserve working features and document
important assumptions. Do not publish, connect official accounts, clear user
saves, or enable live services/payment systems as part of local development.

For any requested release, deliver a full self-contained source + dist ZIP with
open offline.bat. Finish writing/closing the archive before announcing it;
verify CRCs, exact size, checksum, all runtime hashes, an independent clean
extraction and source rebuild. State actual test environments and remaining
limitations, particularly unverified native combat parity and Windows paths.
```

### What this handoff does not do

It does not add new gameplay changes, prove every native interaction, supply missing official tower-skin models, simulate four million accounts continuously, restore unavailable original tests, or replace the user's real source/assets/save backups. It records what to preserve, what changed, what exists, what still needs verification, and how to continue without repeating the project's earlier regressions.

**End of handoff.**
