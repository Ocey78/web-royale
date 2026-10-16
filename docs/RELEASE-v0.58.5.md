# Web Royale 0.58.5 — Ultimate spell Evolutions

Three spell Evolutions are available in the Ultimate Clash, Ultimate 2v2 and Ultimate 3v3 deck builders:

- **Meteor Shower — 3 cycles:** the fourth cast rains 50 meteors over 10 seconds. Each deals one quarter of a normal Fireball's damage.
- **CODE RED — 2 cycles:** the third cast fires 25 full-damage Rockets per wave across 10 waves over 6 seconds, for 250 Rockets total.
- **Lightning Storm — 3 cycles:** the fourth cast strikes every eligible enemy troop and building in range across eight waves. The first wave uses the base radius; each following wave multiplies the radius by 1.2. The storm field grows with the strikes, retaining the random 0.9–2 second gaps.

The spells retain their existing elixir prices and base behavior. Evolution selectors and details display each card's cycle count. Evolved falling projectiles create their visuals shortly before impact to avoid filling the active effect pool with future Rockets.

Tests and gameplay/browser checks were intentionally skipped at the user's request. The required website build and publication record are under `docs/qa/v0585/`.
