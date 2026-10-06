Electro Giant Evolution and Hero Electro Wizard interpreter update

The verified package is 16.402.17, with the manually applied October 6, 2026 numeric balance overlay. These changes interpret the decoded gameplay tables. They do not embed, recover, or reproduce the complete native engine.

Electro Giant Evolution now executes its starting action, 250 ms action delay, 2500 ms initial interval delay, 6000 ms subsequent interval, pause tag, and hit-speed adjustment. Its emitted pulse uses Radius=1, MaxRadius=6000, LifeDuration=550 ms, HitSpeed=50 ms, one hit per target, and parent following. The simulator grows the radius linearly over the lifetime; the native curve is unavailable. An emitted pulse remains alive after its source dies. Inherited Electro Giant reflected damage and stun remain active.

Pulse buffs execute the authored starting and stacked callbacks, reduce the target level, update level-scaled stats while preserving current health proportion, and record the authored counter. Clones retain one-point health and an unbroken one-point shield through reduction and restoration; a destroyed shield remains destroyed. Removing the buff restores the recorded reductions and resets the counter. Crown towers are excluded by the source expression. The interpreter treats character_level as zero-based, allowing the minimum-level guard to stop at public level one. Native indexing and multi-source stacked-buff removal ordering have not been recovered.

Hero Electro Wizard retains all three source attack sequences. CustomMultipleTargets overrides the number of bolts, sequence damage overrides base damage, HitSpeedMultiplier=360 supplies a 3.6 attack-rate factor, and CustomOnAttackAction switches from the initial spin sequence to the later sequence. Its ability spends two elixir once, has one charge, triggers after 250 ms, casts for 450 ms, and applies the source three-second ability buff. The native recovery buffs impose a 500 ms attack lock and conditional movement lock. PlaybackDuration controls a visual duration; the interpreter uses explicit ForcedDuration for a gameplay animation lock. The battle engine consumes AttackStartDelay=500 as an attack-speed-scaled windup. The native scheduling phase and CustomRememberMultipleTargets scope remain unverified; remembered targeting retains the existing committed-primary model.

Golden Knight now validates the initial dash target against its source resolver, so a distant current target does not bypass the five-tile target-edge reach. Secondary range continues to measure distance to the target collision edge. The tests cover a reachable edge exactly at five tiles and an edge just outside it.

Capability traversal follows SpawnPathfindMorph from card and action spawn dependencies. Evo Goblin Drill therefore reports its unsupported ActionGoblinDrillEvoRelocate action before deployment. Unimplemented native actions remain unsupported. Resolved filter inheritance metadata (Base and Name) is permitted without weakening checks on gameplay fields.

The full native import also exposed missing integer context in Ice Wizard Hero. The interpreter recognizes self as the current object ID and uses the source sentinel -1 when as_int reads an absent context key without an explicit fallback. Explicit fallback values and recorded resolver defaults are preserved. The existing live test verifies the correct cube position, freeze effect, and thaw lifecycle.

canDeployCard returns executionFidelity='source-interpreted' and exactReady=false. New-form reports include interpretationLimits describing the unrecovered semantics above. This field is intentionally false for all cards because local JavaScript verification cannot establish complete native-engine parity.

Persistent state added:
- buffs entries: modernApplicationHandled, a boolean that prevents the same instance from invoking a lifecycle callback twice.
- entities: modernAnimationPlaybackUntil, the visual playback deadline.
Existing modernActions buff lifecycle records, variables, timers, area radius, and attackSequenceIndex continue to carry the gameplay state.

Validation: tests/forms-live-v17.test.cjs has thirteen tests using actual imported data and actual Battle effects. The focused run of that file, tests/modern-actions.test.cjs, tests/modern-action-live-v052.test.cjs, and tests/movement-v054.test.cjs passed 68/68. The parent integration task owns full-suite verification and packaging.