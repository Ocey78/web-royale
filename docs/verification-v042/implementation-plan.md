# v0.42.0 implementation plan — approved in chat

Goal: deliver a full compatible build implementing the approved modes, 3v3 clock, map selection/polish, Potato Mode and menu changes.
Base: Web-Royale-v0.41.0-Full-Build.zip. Work only in this extracted workspace. No live deployment.

- [x] 1. Freeze v0.41 replay engine; add catalog mode/deck validation, independent saved 12-card and One Shot decks. Reject prohibited cards in the real battle entrypoint. Test save migration and full cycle.
- [x] 2. Implement 300-second 3v3 regulation (1x -> 1.5x at elapsed 120 -> 2x at 240), existing 120-second overtime (2x then 3x). Mode-local 20 elixir capacity; One Shot 1-HP sudden death. Test boundaries, income, cap, per-seat shutdown and replay round trips.
- [x] 3. Expose builders, modes and King Level/Crown Road badge. Add all new modes to real learning factory; extend worker time guard using selected timeline. Validate menu reward-range removal and private saved decks.
- [x] 4. Sandbox map switch clears entities safely, retains level/pause/options, and prepares assets. Random standard maps for casual modes; fixed custom layouts and trophy-based ranked map. Record arena selection in replays.
- [x] 5. Saved Potato Mode overrides rendering only, preserving chosen graphics preset. Use primitive battle renderer with identity/health/shield/placement feedback and skip native battle/FX rendering. Low-resolution menu card cache. Test combat parity and rendering calls.
- [x] 6. Cached multi-layer custom scenery, reference-aligned Bridge geometry, detailed materials, native props, isolated ambient animation and restrained UI panel polish. Test cache reuse and quality/animation toggle paths; visually inspect desktop/390/320 layouts.
- [x] 7. Full Node suite, real browser smoke/UI tests, learning runs, archive CRC/hash integrity and clean archive rebuild. Preserve movement fixes, save key, battle rewards and old replay engines. Report untested hardware and actual results only.

Rulings: One Shot uses the existing SuddenDeath elixir/timer profile; disables spells, Mortar and X-Bow for both seats. TwelveCardDeck retains four visible cards and an eight-card queue. New casual modes retain Level 9 and normal non-ranked rewards. Sandbox map resets affect battlefield only, never collection or learning saves. Cosmetic arena randomization uses an independent seed and never perturbs simulation RNG. No fonts are packaged.


Completion: implemented and checked all seven deliverables. Final archive validation is recorded in the attached release verification report.

Ruling: 3v3 needs a uniform 0.84 scenic camera scale to show its exterior layers; shared world-to-screen and pointer conversion use the same transform, leaving physical geometry unchanged. Classic camera composition is preserved.
