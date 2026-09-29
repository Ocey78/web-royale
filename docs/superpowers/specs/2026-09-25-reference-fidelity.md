# Reference arena and combat corrections

Continue from the actual v0.24 full archive; keep menus, progression, imported animated emotes and offline launcher intact. No license determination is made by this implementation.

Visual target: user IMG_4991.png (944 x 2048). Exclude the phone's Dynamic Island, home indicator and screen-recorder overlay. Retain the surrounding source scenery rather than zooming out to contain it. Use a separate taller battle viewport; menus stay 540 x 960. One uniform camera must serve render, placement, pointer conversion and cached backgrounds. The terrain was independently registered with 568 matching features: world->reference scale 1.99612373, x -6.518, y 298.3907, median feature residual 0.377 px. Do not distort the terrain to fit a short viewport.

Correct source tower assembly, original source-to-world scale (32 source pixels to 26.666 world pixels), character/occluding rim ordering, healthy sleeping King presentation, tower health anchors, and displayed tower levels. Avoid absolute phone overlays or screenshot backdrops.

Combat target: source-defined per-card speeds, collision radii, timing and ability fields. Fix measurable interpreter bugs: swept movement tunneling; incorrect contact resolution direction/strength; loss of attack target during committed windup; lost attack preload under knockback; dash landing at target center; visually flat river jumps. Preserve source card values and custom progression rules. Undocumented native algorithms must not be claimed recovered or proven identical.

Verification: red/green focused regressions, full baseline and final Node suite, real browser interaction and screenshots against fixed dist, terrain registration after rendering, all fifteen arena variants and roster traversal/timing audits. Full ZIP with source, data, compiled dist and both launchers; no font binaries.
