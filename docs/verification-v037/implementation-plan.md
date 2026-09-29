# Web Royale 0.37.0

Base: supplied full 0.36.0 archive; retain historical card dataset, arena, source assets and profile storage key.

- Move Sandbox from home to Other modes. Add/remove normal decks (1–10, retain existing five). A new deck copies the selected deck; deleting requires confirmation and cannot delete the last deck.
- Four Card Deck: independent persistent four-slot builder, owned cards, both seats use four cards, immediate return of the played card after the normal slot cooldown, no misleading Next preview. Non-ranked level-9 rules. Random Deck: new eight-card decks for both seats each battle without modifying saved decks. Both modes award ordinary battle rewards without ranked trophy/streak changes.
- Remove hand level labels and all King Tower level badges. Princess Tower HP/level remain visible on both sides including at full health. Retain troop group labels.
- Verify Magic Archer line penetration for ground/air/towers and once-per-projectile damage; correct its constant-height presentation and add hit feedback at every pierced target. Preserve damage/range and old replay simulation.
- Result UI: original native red/blue result banners with clan labels, centered VS, visible score crowns, trophy/reward presentation and faster OK. The linked Pinterest image failed to load; do not claim a verified exact match.
- Full particle option restores 48-per-emitter / 850-per-frame engine budgets; lower settings remain unchanged.
- Gem Chest uses the same Golden Chest geometry/timeline and a separate palette (blue -> dark gray; gold -> green). Battle drops: Gem and Magical each 1/12 per available awarded chest, Gold 2/12, Silver 8/12. Every roll is stable per result and profile seed, not per render/reload. Two subsequent wins unlock Gem Chests. Gem rewards are uniform in 5-gem steps from 5 through 250.
- Daily Shop: nine offers with a UTC-midnight reset. Top row always free and independently claimable once/day: gold-only Golden Chest (100–10,000 in steps of 10), instantly opened Gem Chest, one wild-card bundle. Wild rarity weights: Common 60%, Rare 30%, Epic 9%, Legendary 1%; quantity ranges as requested. Bottom six: paid card offers. Atomic persisted claims, expiry checks, ownership/arena validation. Retain Hour and Lightning shops, replace the old standalone 250-gold Daily Gift UI.
- Validate old saves, reward receipt idempotency, source restoration/build, actual browser UI/rendering at desktop and mobile sizes, replays for four-card games, all project Node tests, and archive CRC.
