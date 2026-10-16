# Web Royale 0.58.3 — Ultimate polish, Mirror and Bandit Squad

All three Ultimate Clash deck builders now contain 32 exclusive cards.

- **Mirror** replays the last non-Mirror card at its played level plus three. It costs one extra elixir, capped at twenty; a twenty-elixir card still costs twenty to mirror. The hand shows the copied portrait, cost and boosted level. Copies use the base card form and repeated Mirrors do not compound the boost. The ordinary Mirror retains its existing rules.
- **Bandit Squad — 18 elixir:** four Bandits and one Boss Bandit deploy together and retain their native dash attacks. The squad has no separate Champion ability.
- **Builder:** up to three per friendly non-Crown building. One prevents lifetime decay, two heal 1.5% of maximum HP per second, and three heal 3% per second. Enemy damage still applies, and Builders cannot revive or overheal buildings.
- **Battle Kitchen:** its Chef now uses the original Royal Chef model, including matching upper and lower animation layers. Ground movement adds a subtle step to the original idle pose; melee gameplay remains unchanged.
- **Bowler Giant:** steadier carrying poses and hand-aligned stones improve the two-boulder animation. The actor and both stones remain 40% larger, with building-only targeting and ground-unit collision along the boulders' paths.
- **Spell artwork:** Lightning Storm, Harvest, Royale Recall, Dark Pact and Elixir Spell have new original illustrations. Mirror and Bandit Squad also have portraits. Other existing card artwork is unchanged.

The new cards remain exclusive to Ultimate Clash, Ultimate 2v2 and Ultimate 3v3. Existing team timers, elixir progression, Princess Tower health bars and protected Bomber translucency are retained. Generated spell art sources, prompts and hashes are included in the repository so the portrait generator can reproduce the shipped images.

Ultimate replays fingerprint the updated content. Recordings from older Ultimate content are rejected as incompatible; the historical normal replay engines remain packaged.

Verification and deployment evidence are recorded under `docs/qa/v0583/`.
