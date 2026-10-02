# Main v0.52.2

The deck builder uses real special positions: Evolution first, Hero/Champion second, Wild third. Arena gates are 3/5/10 on Trophy Road; casual modes expose all three. Normal and mode deck screens include type-specific framing, slot status and form selection. Cards with both owned forms can switch in Wild.

Hero choice uses 200 Hero Coins. A receipt below the coin limit can overflow once; subsequent receipts while at/above 200 convert to Gems at 1:1. Six named Evolution Shards unlock immediately; a Wild Shard contributes one named shard. Unlock inventory, card ownership, supported behavior and equipped-slot gates are checked by shared transactions.

Profile migration retains card rosters and form selections where eligible. Generated opponent forms move before shuffling. Replays record the positional rule explicitly, retain their content fingerprint, and preserve old 0.52 virtual-slot records.

Main retains its supplied 16.402.2 data and available/unsupported behavior distinction. 121/123 base cards and 51/67 forms pass existing dependency preflight; this patch does not implement the remaining native behaviors.

The visual, Touchdown, source-art and performance changes from v0.52.1 remain included. Classic remains frozen at v0.50.3. This patch does not add online matchmaking or claim full native-engine fidelity.

Rules: [Supercell deck slots](https://support.supercell.com/clash-royale/en/articles/cards-and-decks-6.html), [Heroes](https://support.clashroyale.com/hc/en-us/articles/49484957323163-Heroes), [Card Evolution](https://support.supercell.com/clash-royale/en/articles/card-evolution-8.html), and [inventory conversions](https://support.supercell.com/clash-royale/en/articles/conversions-8.html).

Validation: full Node run 1,530 passed, zero failures. Following the final text-color-only rebuild, packaging, source-bundle and local host checks passed again. The compiled offline launcher passed 134 integration/header checks, and the opponent review passed 1,200 battles and 5,600 seat loadouts. Actual Chrome desktop/mobile checks cover special-slot placement, owned form switching, Hero choice, six-shard unlocks, save reload, normal/mode builders and seeded Random decks. Main additionally verifies Hero ability use, Evolution cycles and exact battle replay. Local embedded 3D textures are permitted by the offline host's content policy.

Website publication is being verified for this exact build.
