# Web Royale v0.40.0 — stacking win-streak rewards and shop updates

## Install / update

This is a complete build based on v0.39.1, not a patch. Export your current save,
close the old game and offline launcher, and extract the entire new ZIP. Run
`Web-Royale/open offline.bat`. The ready-to-serve website is in `Web-Royale/dist/`;
Node is only needed for development/rebuilding, not for the Windows launcher.

The save key remains `web-royale-classic-v4`. Keep the same browser and origin to
access the same browser save. Your existing collection, decks, cosmetics, chest
progress, trophies and ongoing streak remain. No retrospective currency payout
or automatic refund for the new lower prices is applied.

This download is not deployed to the live website.

## Stacking ranked streak rewards

Currency bonuses now pay on **every ranked win** once their first tier is reached,
not only on the milestone wins themselves. The new win is included when selecting
the tier:

- Gold tier = `floor(current ranked win streak / 3)`.
  Bonus range = `100 × tier` through `300 × tier`, inclusive.
- Gem tier = `floor(current ranked win streak / 5)`.
  Bonus range = `1 × tier` through `10 × tier`, inclusive.

| Current winning streak | Extra gold on this win | Gems on this win |
|---|---:|---:|
| 1–2 | 0 | 0 |
| 3–4 | 100–300 | 0 |
| 5 | 100–300 | 1–10 |
| 6–8 | 200–600 | 1–10 |
| 9 | 300–900 | 1–10 |
| 10–11 | 300–900 | 2–20 |
| 12–14 | 400–1,200 | 2–20 |
| 15–17 | 500–1,500 | 3–30 |

The pattern continues without a new tier cap. The existing currency balance cap
still applies. The normal 50 win gold is added to the gold bonus. Each completed
match rolls a whole-number amount within the tier's aggregate range. The same
receipt always produces the same roll; drawing the result or loading a save never
rerolls it or grants it again. The existing trophy-bonus rules are unchanged.

A ranked loss or draw resets the streak and its tiers. Non-ranked games retain
normal rewards, neither advance nor break the ranked streak, and do not receive
ranked currency bonuses. Practice, replay and training results do not award them.

Existing result boxes remain: chest when one is awarded, gold including the full
credited bonus, and gems when credited. No extra reward popup or visible streak
sentence was added. Save/result normalization now supports higher-tier amounts
instead of truncating displayed totals to the old 350 gold / 10 gem limits.
Previously completed result receipts are not recalculated on loading the update.

## Cosmetic prices

- Paid emotes: **50 gems** each.
- Paid original tower styles: **100 gems** each.
- Starter emotes and the Classic tower remain free/owned as before.

Shop tiles, preview purchase buttons, actual transactions and generated runtime
metadata use the new prices. Existing ownership, equipped items, stale-offer and
insufficient-funds checks remain. Historical imported cosmetic metadata and the
old retired-recolor refund policy are retained separately from live prices.

## Gem Shop bundles

| Rarity | Cards in a bundle | Gems per bundle |
|---|---:|---:|
| Common | 150–500 | 20 |
| Rare | 50–100 | 50 |
| Epic | 10–15 | 100 |
| Legendary | 2–3 | 200 |

Prices are unchanged; quantities are larger. Each slot rolls an inclusive integer
quantity and shows the exact count before purchase. The count, card and price
remain stable through redraws, saving, loading and the first purchase. The second
successful purchase grants that displayed offer, then refreshes all six slots.

The quantity roll is separate from card selection. Updating an existing partial
rotation preserves its card IDs, prices, slot positions, arena pool and purchased
marker. Its remaining slots display the new quantities; already bought slots are
not granted again. Cosmetic and chest purchases do not advance this counter.

Daily Shop, Hour Shop and Lightning Shop quantities/timers are unchanged.

## Treasure Chests

Six slots in a three-column, two-row grid:

| Chest | Gems |
|---|---:|
| Silver | 15 |
| Golden | 35 |
| Magical | **50** |
| Giant | **65** |
| Epic | **80** |
| Legendary | **100** |

All use their existing original chest icon and opening animation. Shop chests
open immediately and do not consume a battle chest slot or require battle wins.
The Gem Shop's two-purchase counter is unaffected.

Giant loot now has its own Common/Rare reward path rather than the prior Silver
fallback: the bundled Giant base card count, gold-per-card and reached-arena
multiplier determine its amounts. Epic and Legendary chests retain their existing
20-Epic / 1-Legendary loot. Existing Silver, Golden and Magical contents are not
rebalanced in this update. All card pools continue to respect reached arenas.
A rarity-only chest with no eligible cards is shown locked and cannot charge gems
for an empty reward.

## Preserved scope

Arena artwork, troop movement/targeting/collision, shields, spell behavior,
particle settings, deck-frame fixes, Trophy Road cleanup, replay engines, chest
win requirements, and the Windows launchers are unchanged. This is an economy
update, not a rendering-performance update.

See `docs/verification-v040/VERIFICATION.md` for the completed test commands,
initial failures, browser screenshots, compatibility audit and build evidence.
Browser testing uses Chromium with a file-backed local asset/storage fixture;
it is not physical iPhone/Safari, a live hosting update, or Windows execution.

## Verification summary

**1,035 automated tests** and **190 Chromium browser checks** passed. A clean
rebuild reproduced all **1,203 runtime-file hashes**. Initial outdated price
assertions and the final full passing run are retained in the verification folder.
