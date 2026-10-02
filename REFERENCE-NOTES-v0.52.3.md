# UI and acquisition references — v0.52.3

The supplied client is snapshot 16.402.2. Source tables and original pixels are
the artwork reference; newer official pages clarify inventory and slot rules.
Imported artwork alone does not prove complete native menu or battle parity.

## Supplied footage

Both supplied recordings were inspected through extracted contact sheets:
`clash royale spells.mp4` and `web royale spells.mp4`. The former shows
the battle hand, standard/Legendary card shapes, elixir affordance and spells;
the latter shows the older Web Royale battle/selector presentation. These clips
do not show a modern Hero inventory, shop or Tower Troop menu. Those menu rules
are checked against source exports and the support/wiki references below.

## Original UI exports

`sc/ui_card_items.sc` and its matching SCTX supply purple Evolution,
gold Hero, Champion and Tower Troop frames. Normal and Legendary variants,
locked/unlocked/active labels, battle headers and original portrait masks are
used where available. The source Hero category symbol is a gold diamond.
Frame geometry and original mask alpha remain in the source assets. At display
time the partial source stencil alpha becomes full CSS mask coverage, preserving
its edge coverage and portrait colour. This avoids visibly dim portraits from
treating native stencil pixels as CSS opacity. Each imported PNG and source stream
has SHA256 provenance in the UI asset manifest.

Category badges have explicit locked/unlocked/active source labels. Frame clips
use numeric 0/1/3 labels; their native interaction semantics are not established
by those names alone. The local presentation uses original thin and glow artwork
without inventing a separate paid-outline inventory.

Frames identify a card's selected type automatically. A normal card copy
retains its base presentation even when another form of that card is owned.
The physical deck slot border is separate from the selected card's own frame.

## Rules consulted

- [Heroes](https://support.clashroyale.com/hc/en-us/articles/49484957323163-Heroes): 200 Hero Coins chooses a Hero; ownership and equip eligibility are distinct.
- [Card Evolution](https://support.supercell.com/clash-royale/en/articles/card-evolution-8.html): six matching shards unlock a form; its assigned slot enables battle use.
- [Evolution Shards](https://support.supercell.com/clash-royale/en/articles/evolution-shards-6.html): Wild Shards add matching progress and duplicates use inventory conversions.
- [Tower Troops](https://support.clashroyale.com/hc/en-us/articles/49484890719515-Tower-Troops): a separate selection outside the eight-card deck; copies and gold upgrade it up to the King Tower cap.
- [Pass Royale](https://support.supercell.com/clash-royale/en/articles/pass-royale-11.html) and [Tower Skins](https://support.supercell.com/clash-royale/en/articles/tower-skins-3.html): rewards connect card inventory, form currencies and cosmetic equip collections.
- [Clash Royale Wiki: Shop](https://clashroyale.fandom.com/wiki/Shop), [Cards](https://clashroyale.fandom.com/wiki/Cards?page=3) and [Card Overviews](https://clashroyale.fandom.com/wiki/Card_Overviews):cached descriptions of daily offers, Evolution indicators and Tower Troop roles. Some direct wiki pages returned access errors; historical entries were not treated as current official recipes.

## Local adaptation

This is an offline practice economy. Existing 50 gem emotes and 100 gem tower
skins are retained. Hero choice uses 200 Hero Coins; Evolution exchange spends
one Wild Shard per named shard. Tower-copy offers share existing local card-shop
pricing. Supplemental Pass/Crown rewards are deterministic local recipes;
the 217 native Main Trophy Road reward rows remain unchanged. There are no
real-money offers, Supercell service connections or live human matchmaking.
Unsupported voluntary purchases fail before spending. Cosmetic receipts map
to rendered/equippable items, and frames are never sold as separate unlocks.

Custom retains 102 historical cards and zero registered production forms or
Tower Troops. It shares the future form/reward APIs without adding Main content.
Classic remains unchanged at 0.50.3.
