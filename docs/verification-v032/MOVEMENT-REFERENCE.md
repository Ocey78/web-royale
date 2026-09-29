# Movement reference audit — v0.32

Research date: 27 September 2026. This audit changes no product code.

## Primary written evidence

[Supercell, April Update, 31 March 2025](https://supercell.com/en/games/clashroyale/blog/release-notes/april-update/) explicitly describes a change from horizontal lane entry followed by forward travel to diagonal travel with less dependence on lanes. It also describes noticing buildings ahead of time and navigating around them before contact. The stated goal is greater consistency while preserving existing interactions.

This is evidence against imposing horizontal-then-vertical lane entry as a universal current-game rule. It is not a numerical specification for turning speed, acceleration, collision avoidance, or air-unit waypoints. The public article HTML contains no video, iframe, GIF, MP4, or WebM demonstration.

## Actual official video inspected

[Clash Royale, TV Royale: NO MORE CHEST TIMERS?! New Champion, and more!](https://www.youtube.com/watch?v=mgtVaUE2d8s&t=182s), published 28 March 2025, official channel `UC_F8DoJf9MZogEOU51TpTbQ`. The public page reports a duration of approximately 3:31; its player labels the last chapter “General game improvements”.

Method: normal public YouTube playback in an isolated Edge browser, with screenshots of the visible player. No remote video/audio files were downloaded. Playback succeeded around 2:21–2:58 and 3:00–3:30. A first run failed at 3:00; a fresh public-page load played that section successfully. Captions were not available in the captured player state, so no spoken quotation or transcript claim is made.

The following was visually inspected in consecutive frames:

- **About 3:03–3:05:** a blue Battle Ram advances through the center toward the exposed red King Tower while both red Princess Towers are destroyed. It does not first turn sideways to the left or right Princess lane. This is a concrete counterexample to mandatory lane entry for every advance toward a Crown Tower. [Earlier frame](official-video/ram-182.98s.png), [later frame](official-video/ram-184.58s.png).
- **About 3:06–3:07:** a red P.E.K.K.A proceeds past an allied Cannon Cart beside its Princess Tower. This is a short, zoomed obstacle-navigation example. It does not establish an exact clearance radius or smoothing curve. [Earlier frame](official-video/pekka-185.66s.png), [later frame](official-video/pekka-186.73s.png).
- **About 3:07–3:08:** a Knight and Skeletons move near the right bridge. This edited fragment is too short to establish an uncontested Crown approach or a universal turn rule.

The screenshots' filename times are sampled player times immediately before capture; the visible frame can be slightly later. Camera framing changes between some cuts. These images must not be treated as calibrated trajectory measurements. This section does **not** show Baby Dragon; it does not prove an air-specific turn rate. The strongest explicit evidence for diagonal travel remains Supercell's written release note, while the Battle Ram footage independently demonstrates that lateral lane entry is not mandatory in the shown King approach.

## Original 3.5.0 source tables

The retained, unpacked original `characters.csv` was checked again. Its SHA-256 is `3a2bda280a5e2244851796157d4a1a248707377e7180ab0ac6cc67b7bd5d0ee0`. See [extracted parameters](native-movement-parameters.json) and the [v0.31 source evidence](../verification-v031/AIR-ROUTING-EVIDENCE.md).

- Baby Dragon has `Speed=90` and `FlyingHeight=3500`. `RotateAngleSpeed`, `HasRotationOnTimeline`, `TurretMovement`, and `WalkingSpeedTweakPercentage` are blank.
- Only five rows explicitly set `RotateAngleSpeed`: ZapMachine, MiniZapMachine, MovingCannon, and BrokenCannon use 600; DartBarrell uses 224. Their units, defaults, and whether they govern visual rotation or movement are not established by the CSV. Applying 600 universally, or to Baby Dragon, would be an unsupported assumption.
- SkeletonBalloon alone explicitly sets `FlyDirectPaths=true`. The older lane/default-target flags and tilemap establish historical source data, not the full native routing algorithm or the later 2025 behavior. A blank field is not a proved runtime default.

The supplied APK predates the March 2025 movement change. Preserving its custom content and balance while using the later diagonal movement principle is a deliberate reconstruction choice, not a claim of exact 3.5.0 runtime parity.

## Recommendation and uncertainty

Removing the v0.31 mandatory horizontal/vertical advance guide while retaining the corrected same-lane Princess/King destination policy is consistent with the primary current-era evidence. A clear path can approach that chosen destination diagonally; ground troops still need their existing bridge and building routes. Free pursuit of a local eligible enemy should remain distinct from default Crown selection.

The evidence supports avoiding unnecessary right-angle detours. It does not justify arbitrary inertia, a universal turn-rate cap, or a promise that every native path is a continuous curve. Exact Baby Dragon trajectories, historical default-target ordering after each tower-loss case, and the native smoothing algorithm remain unverified.
