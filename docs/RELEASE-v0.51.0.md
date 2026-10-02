# v0.51.0 — independent projects and machine animations

Main and Custom share the existing v0.50.0 game plus these fixes:

- Cannon Cart, Sparky, Flying Machine, Broken Cannon and Dart Barrel use all 18 authored directional views. Mortar uses its five views. Moving, attacking and propeller animation continue while facing the correct direction; leftward views mirror once.
- Tesla plays one rise/lower transition using the source durations and holds the raised/underground endpoint. Damage, hit timing, freeze, stun and pause behavior stay consistent.
- Every 3v3 theme positions its Princess row at x = 1.5, 9, 16.5 tiles. Outer towers move two tiles outward. Lanes, bridges, Kings and seat ownership remain in place. A Rocket's two-tile radius plus tower hitboxes cannot overlap two Princess towers.
- Jungle and Volcano side monuments sit beyond the railings so the wider Princess row keeps its original health numbers readable. Single-view spirit jump attacks retain their authored animation.
- Each project uses its own profile, learning and replay namespaces, default port and offline AppData AI folder. Old v0.46 replays use the frozen older simulation.

Classic is the unmodified v0.50.0 release. Main is the development base for future modern/online work; Custom is the private development base for new cards and abilities. This release does not implement those future features.
