# Web Royale v0.44.0 — Castle Siege arches, King-only 5v5, Mirror repair

## Install and preserve progress

This is a complete build based on Web-Royale-v0.43.0-Full-Build.zip, not a patch.
Export your save, close the old game and offline launcher, extract the whole ZIP,
and run `Web-Royale/open offline.bat`. The prebuilt static website is in `dist/`.
The existing `web-royale-classic-v4` save key is unchanged. Keep the same browser
and origin. Do not clear website data to refresh the game.

No live website was deployed. A hosted deployment needs the new `dist/` contents.
Windows launchers are included unchanged; they were not executed in this session.

## 5v5 tower arches and castle arena

Team Rumble now has two broad, mirrored arches per side: five King Towers and
five Princess Towers. The middle of each arch recedes toward that team's keep;
the outer ends sit closer to midfield. Horizontal spacing is five tiles instead
of the old approximately three, with gentle vertical offsets between neighbors.

The river-free playable court is 28 tiles wide by 40 tall. Its origin remains
centered on the existing simulation so mirrored positions sum to x=18, y=32.
The increased side/rear aisles retain original collision radii, including the
largest radius-one ground troops. AI placement candidates now use these expanded
5v5 bounds instead of being clamped to the old standard arena.

The custom castle environment includes limestone paving, arched team inlays,
a carved crown seal, masonry halls, fortified gatehouses, portcullises, crenellated
walls, corner turrets, native Royal Arena props, wall banners and animated torches.
Ground foundations are derived from the same coordinates as actual towers.
Walls and tall decorations are outside the playfield, not hidden obstacles.

Stationary scenery and foreground props are cached. Only ambient flames and
pennants animate; Low backgrounds stop ambient animation and Potato Mode bypasses
the detailed castle renderer. 3v3, Bridge and standard arena geometry are unchanged.
These are locally assembled custom graphics, not pixel-identical official assets.

## 5v5 timing and income

Regulation is five minutes, followed by at most five minutes of overtime:

| Phase | Clock remaining | Passive income |
| --- | --- | --- |
| Regulation | 5:00 to 3:00 | 1x |
| Regulation | 3:00 to 1:00 | 2x |
| Regulation | Final minute | 3x |
| Overtime | 5:00 to 3:00 | 3x |
| Overtime | 3:00 to 1:00 | 4x |
| Overtime | Final minute | 5x |

The transition happens at the listed remaining time. It changes the real elixir
generation rate and its displayed label. Three minutes *remaining* in overtime is
the 4x trigger, superseding the earlier three-minutes-elapsed rule.

A destroyed King's owner loses passive generation at every multiplier, keeps
stored elixir, and can still receive the established Collector and custom 5v5
Elixir Golem payouts. Banks still cap at 10. Other modes keep their own schedules.

## Only King Towers determine 5v5 results

Princess Towers still defend, take damage, die, and open their normal deployment
areas. Their destruction does not grant a Team Rumble crown or decide the match.
Each destroyed King awards one crown; the maximum for a new 5v5 match is five.

- Destroying all enemy Kings ends regulation immediately.
- At regulation's end, the side with more surviving Kings wins. Equal surviving
  Kings enter overtime even if the Princess Tower counts differ.
- In overtime, the next unequal King loss ends the match. Equal simultaneous
  losses do not arbitrarily favor an update order; losing every King on both
  teams simultaneously is a draw.
- At the end of five overtime minutes, the existing health-drain tiebreak compares
  and drains **only living Kings**. Princess HP cannot decide that tiebreak.

An activation trigger on one King schedules every surviving King on that side
for the same activation deadline. When that deadline is reached they all activate
together. Losing any Princess triggers the same-side group as well. Repeated hits
do not restart/delay the countdown, enemies are unaffected, and dead Kings are
never revived. The local King's always-visible gold health display is retained.

## Mirror artwork

The previous effect used a full-face gradient whose transparent center depended
on CSS masks. With masking absent that gradient could cover the copied card.
The replacement uses actual edge borders and shadows with no full-face shine
plane or mask dependency. Copied card art remains visible, including Legendary
cards and spells. The distinctive rim and the correct one-extra-elixir cost are
retained; hand level labels remain absent.

Pixel comparisons check real Knight, Princess and Fireball images with masking
enabled and deliberately disabled. This checks the failure mode; it is not a
claim of physical Safari/iPhone verification.

## Compatibility and verification

The old v0.43 simulation is frozen in `legacy-core-v043.js`. Old replay files use
its flat tower rows and prior timing/scoring; new replays use engine tag `0.44`.
Existing decks, names/pages, ownership, Crown Road claims, lifetime crowns,
stacking streak rewards, shop balances, magic items, Play Again, and graphics
settings are retained. Imported old history can retain its old ten-crown results.

See `docs/verification-v044/VERIFICATION.md` and the supplied JSON verification
report for the executed commands, counts, failure notes and artifact checks.
No device-specific frame-rate guarantee is made. Browser checks use generated
JavaScript/CSS and packaged native art in a file-backed Chromium fixture, not a
live deployment, Service Worker upgrade, Windows execution or physical iPhone.
