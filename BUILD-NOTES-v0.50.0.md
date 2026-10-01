# Web Royale v0.50.0

This build replaces the v0.49 spell presentation after comparison with the supplied
Clash Royale and Web Royale recordings. It includes the earlier Ultra graphics,
swarm level setting, custom arena themes, shop presentation and opponent deck library.

Rocket uses a larger body calibrated against the field, its pitch atlas follows
the flight orientation, and its exhaust deposits smoke and fire along the curved
path. Fireball has a larger silhouette, a short trailing flame and a timed burst
with separated smoke clouds. Both impacts clear their smoke promptly.

Rage, Poison, Graveyard and Freeze have persistent translucent floor bodies within
the actual spell radius. Particle birth positions and drift are handled separately
so particles fill the interior instead of collecting on one edge. Dense Poison
cast/loop skull clusters are replaced with three small native skull clips. Earthquake
keeps its source delay before cracks appear. Tornado uses softer warm dust bands.
Log, Barbarian Barrel, Goblin Barrel and Snowball bodies have calibrated spell sizes.
Embedded Arrows remain below troops for their full life; damage waves are unchanged.
Zap, Lightning, Clone and Royal Delivery retain their source effects and timing.

Touchdown now frames the playable pitch at roughly 90% of screen width. Turf,
distant backdrop and raised stadium decorations render on separate cached surfaces.
Field boundaries, scoring lines and troop paths are unchanged.

The duplicate practice option works in all 20 saved mode deck registries. Repeated
cards survive editing, saving, reloading, opening hands and card cycles. Disabling
the option repairs decks to unique cards. Mode card restrictions still apply.

Visual QA samples every available spell before, during and after its effect, with
projectile captures relative to actual impact time. Rocket orientation is checked
from both sides, including diagonal/horizontal casts. Independent browser checks
cover Touchdown framing and duplicate mode editor-to-battle launches.

Extract this ZIP into a new folder, close the older launcher and run `open offline.bat`.
Keep the same browser and localhost address for the same browser save; export a
save from the older game before changing browsers or addresses.
