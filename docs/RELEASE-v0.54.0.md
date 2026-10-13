# Web Royale 0.54.0

Updates the published 0.53.0 build with arena progression and presentation fixes.

- Trophy Road arenas 15–32 have distinct original arena floor textures. Opponent card and King levels develop through the new arenas using their source King-level gates and the current level cap.
- Deck slots, variant roofs, active Evolution/Hero portraits, and battle cycle diamonds follow the supplied UI references. All 69 original variant portraits are available.
- Shop cards use cleaner rarity, quantity, progress, and price placement. Tower previews fit their complete painted bounds above their labels. Other mode cards use saturated blue and purple surfaces.
- The 540-pixel logical battle frame now has a minimum 1080-pixel backing width. Layout coordinates and control sizes remain unchanged; existing high-density menu text and previews retain their density.
- Modern spell definitions and source scene dependencies are included. Buff visuals follow their targets through start, loop, hit, and removal, with source timing and scale. Vines, Void, and Goblin Curse are covered by browser checks for both teams.
- Void was cross-checked against actual in-game footage from BaleGG (August 9) and FinalClash (August 27), alongside Supercell's August 4/26 balance notes. Its field starts once and stays at the cast point; separate tier-specific beams and source color filters follow each target. Three current one-second strikes use level-11 troop damage 696/294/153 and Crown Tower damage 97/51/35. Hover previews include flying targets. The August 9 footage predates the change from 1.2-second to one-second strikes.
- Evo Skeleton, Evo Electro Giant, and Hero Electro Wizard use their missing source sprite mappings. Model ability states use source animation metadata, with hidden-mesh state reset between poses. Source billboard particles retain bounded presentation history through animation transitions.
- Only referenced sprite pixels are packed into the new effect atlases. Lossless packing reduced these textures from 268,813,062 to 19,896,804 bytes, preserving geometry and sampled source pixels. Publishing retains the existing compressed scene format.

Existing profile and replay storage keys remain unchanged. Visual state is separate from simulation random state and saved battle digests. Frozen historical source and fixtures are protected from Windows line-ending conversion.

The 3D renderer still interprets source billboard particles rather than the complete native VFX engine. Shader-only meshes, native material/timeline graphs, packed particle curves, and cone/deceleration emitters remain unsupported; their source references and limits are recorded in the model manifest. This release does not claim exact native-engine parity.

Verification evidence lives in `docs/qa/v054/` and `docs/qa/v540/ui/`. Browser scripts use isolated profiles and the delivered bundle, without substituting runtime modules or artwork.

Final verification: 1,689 Node tests passed, zero failed, one existing test skipped; 802 Void browser checks passed across ten scenarios. All 2,119 release file hashes were verified. The delivered build is 965,241,729 bytes.

Void references: [BaleGG, single-target preview at about 1:07](https://www.youtube.com/watch?v=AMr1cJDkvaw&t=67s), [BaleGG, five-target preview at about 1:26](https://www.youtube.com/watch?v=AMr1cJDkvaw&t=86s), [FinalClash, live-match example at about 0:23](https://www.youtube.com/watch?v=m-fPmsTVm7E&t=23s), and [Supercell's current August balance changes](https://supercell.com/en/games/clashroyale/blog/news/final-august-balance-changes-826/). Video frame evidence establishes placement, color tiers, and field behavior; edited footage is not treated as a millisecond timing oracle or proof of pixel-identical rendering.
