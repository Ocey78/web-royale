# Web Royale 0.58.14 — Performance and Ultimate balance

Musketeer joins the Ultimate pool at 4 elixir, with the Princess's 9-tile attack range and 9.5-tile sight range. She keeps the native Musketeer model, portrait, projectile and other stats. All Ultimate deck builders and Sandbox include her, bringing the pool to 34 cards.

Elixir Witch's Golemite spawn rate is reduced by 55%: pairs now arrive every 11.11 seconds instead of every 5 seconds. The first pair arrives about 2.22 seconds after deployment readiness instead of 1 second. Her kill conversions and movement speed are unchanged.

Evolved Lightning Storm now grows 5% per wave after its first wave. It keeps eight rapid waves, its two-cycle Evolution and its 10-elixir cost.

Lightning Storm draws one native bolt at every struck position using a single visual event per wave. Core bolts no longer compete with smoke and sparks for the decorative particle budget, and active wave visuals are protected from decorative-event eviction. The lightweight renderer also draws every strike. Damage and status effects use the existing impact logic.

Performance changes remove unnecessary work in several places:

- Hero Horde ability status is calculated once per deployment per UI refresh instead of once per minion. Unchanged Sandbox control text and attributes are left alone.
- Null target lookups return immediately; living-entity snapshots use one output array; target selection reuses its existing Horde group.
- Goblin Hut detection stops at the first eligible enemy, and area effects resolve their source only when following, lifetime links or deflection need it.
- Ultimate style records and source emitter metadata are reused. Particle samples avoid an extra object copy, and the unit-filter map is reused each frame.

No tests, simulations, benchmarks or gameplay/browser checks were run at the user's request. These are source-based reductions in repeated work, not a measured FPS claim. Build and publication records are under docs/qa/v05814/.
