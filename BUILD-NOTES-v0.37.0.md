# Web Royale v0.37.0 — decks, modes, Daily Shop and Gem Chests

Based on the supplied v0.36.0 full build. This is a complete source + prebuilt website archive, not a patch. The established arena artwork/camera, card collection, AI learning, offline launchers and local save key are retained.

## Start or update

Export a save in Settings before updating. Close the old tab and offline launcher, extract the entire new ZIP, then run `Web-Royale/open offline.bat`. Do not run from inside the ZIP. The packaged `dist/` is ready to serve; Unity, Node and a rebuild are not required to play. Keep the same browser profile and localhost address for existing browser saves, or import your exported save. Do not clear website storage merely to update game files.

The profile storage key remains `web-royale-classic-v4`. Profile schema 11 adds independent four-card decks, dynamic deck counts, and Daily Shop receipts. Existing v0.36.0 saves, including purchases, currencies, decks, chest progress and graphics settings, are normalized without a reset.

## Home, decks and game modes

Sandbox has moved from the home screen into **Other Modes**. The existing sandbox features remain available there.

The regular deck library now supports **one to ten** saved eight-card decks. The `+` button adds a copy of the selected deck, selects the new slot, and saves it. **Deck options → Remove deck** asks for confirmation. The last deck cannot be deleted. Removed decks do not reappear on save normalization or import, and deck numbers above five remain selectable. Existing five-deck saves keep all five decks.

**4 Card Deck** opens a separate four-slot builder before battle. Pick a slot and then a card from your unlocked collection; choosing a card already in the deck swaps the two slots. The separate deck saves automatically and is restored next time. Both combatants have four cards, without a Next queue. Playing a card keeps it in its slot, with the normal one-second cycling cooldown and normal elixir cost. Both sides use level-nine challenge rules. Normal eight-card decks are not modified.

**Random Deck** generates fresh eight-card decks for the next match without overwriting any saved deck. The player's pool uses unlocked cards; the AI pool follows reached-arena eligibility. Early accounts with only the eight starter cards can receive those same eight in a different order. Both new modes are non-ranked: they do not add/remove trophies or change ranked win streaks, but do award normal non-practice battle rewards and chest-win progress.

## Battle and graphics

- Removed level text from battle-hand cards. Collection/deck card details still show levels.
- Hidden King Tower level text. Princess Tower HP remains visible at full health on both sides, along with its level. Existing grouped-troop badges remain unchanged.
- Verified Magic Archer arrows pierce aligned ground troops, air troops and Crown Towers, damaging each once and ignoring allies/out-of-line targets. The previous engine already performed line penetration. This update corrects the arrow's authored constant-height rendering and adds impact feedback at every struck target, without changing its damage or travel distance.
- Added **Full** to particle settings. It enables all emitter categories with the full existing rendering safety budgets (48 particles per emitter, 850 per frame). Off, Spells only and Minimal remain available; the existing default stays Minimal. Settings persist and apply immediately.

## Match results

Uses the bundled original red/blue result banners, animated crowns, player/clan names and native Winner! label, plus a centered VS, compact trophy delta, actual earned chest/gold display and a faster OK button. Fixed the native Winner! text binding and kept rewards clear of the player banner. OK becomes available at **2.65 seconds**, instead of 3.45 seconds; it no longer has an additional CSS animation delay. Win, loss, draw and non-ranked results are covered.

**Reference limitation:** the supplied Pinterest image could not be fetched in this session. The end screen has been revised and visually checked, but an exact pixel-for-pixel match to that inaccessible image is not verified. A directly uploaded image is needed to compare against that precise reference.

## Gem Chests

The Gem Chest uses the Golden Chest's geometry and animation. A separate palette turns its blue parts dark gray and its gold parts green, both on the small icon and on the animated opening model. Regular Golden Chests and reward-card artwork are unchanged.

A Gem Chest gives **5–250 gems, in increments of 5**, with equal weight for each of the 50 amounts. It contains no cards or gold. A battle Gem Chest needs **two subsequent eligible wins** to open; the win that awarded it does not also advance its counter.

When a non-practice win awards a chest and a slot is available, the chest roll is:

| Chest | Chance |
| --- | ---: |
| Gem | 1/12 (about 8.33%) |
| Magical | 1/12 (about 8.33%) |
| Golden | 2/12 (about 16.67%) |
| Silver | 8/12 (about 66.67%) |

This replaces the former fixed win-count chest cycle while preserving the Magical Chest's one-in-twelve rate. Each result has a stable receipt-derived roll, so reopening the result or reloading cannot reroll or duplicate the award. These are Web Royale's custom probabilities, not a claim about the current official game's chest cycle.

## Daily Shop

The Daily Shop has **nine slots** and refreshes at **00:00 UTC**. Its three top-row rewards are always free and each can be claimed once per day. “Always free” does not mean unlimited repeated claims. The free chests open immediately and do not occupy battle chest slots.

| Free slot | Reward |
| --- | --- |
| Gold Chest | Gold only: **100–10,000**, in increments of **10**, all amounts equally weighted. |
| Gem Chest | **5–250 gems**, in increments of **5**. |
| Wild Cards | One rarity bundle, using the table below. |

| Wild-card rarity | Chance | Quantity |
| --- | ---: | ---: |
| Common | 60% | 50–250 |
| Rare | 30% | 25–75 |
| Epic | 9% | 5–19 |
| Legendary | 1% | 1 |

Quantities within a selected rarity are uniformly selected, inclusively. The 1% Legendary rate makes the unspecified “super rare” roll explicit. The six unspecified lower slots are implemented as gold-priced card offers from reached arenas, at the existing shop's rarity prices and quantities. Each offer can be purchased once per day. Expired offers, stale card identifiers, duplicate claims and insufficient funds are rejected without granting rewards.

The existing twelve-slot **Hour Shop** and three-slot **Lightning Shop** are retained. The new free row replaces the old separate 250-gold Daily Gift button. Previous free-chest, crown-chest and streak changes from v0.36.0 remain.

## Build and verification

See `docs/verification-v037/VERIFICATION.md`, the accompanying JSON reports, and screenshot checks for the exact test results. The automated checks cover reward bounds, equal chest drop weights, one-time purchases, deck migration/add/remove, four-card hand cycling/replays, graphics persistence, Princess/King labels, native result text and Magic Archer penetration.

The browser fixture uses the actual generated game runtime, DOM, Canvas and local source artwork in Chromium at desktop and phone viewport sizes. This environment blocks ordinary browser HTTP navigation; the fixture substitutes a local file transport/storage adapter. It is not a physical iPhone/Safari or live ChatGPT Site deployment test. The project's separate Node tests exercise the static server, cache manifests, save adapters and workers. The existing Windows BAT launchers were retained, not executed on Windows in this session.
