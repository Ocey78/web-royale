# Web Royale v0.35.0

- Phone battles draw at 30 fps with a 1.25-pixel logical canvas cap. The simulation still advances at 60 ticks per second. Desktop rendering is capped at 60 fps.
- Reuses alpha-mask canvases, separates bounded color-variant caches from base sprites, and skips impossible troop collision pairs and unnecessary collision passes.
- Enemy troop and tower health bars stay hidden until the first damaging hit, including shield damage. Friendly health display is unchanged.
- Ranked win streaks persist across sessions. Each ranked win awards 30 trophies plus the accumulated streak bonus. Wins 3, 6 and 9 each add 10–15 to that bonus; wins 12, 15, 18 and every subsequent third win add another 5–15. The bonus applies immediately on the milestone win and continues on later wins. A ranked loss or draw resets it. Practice, replays and non-ranked games do not change the ranked streak.
- Home and result screens show the streak and trophy reward. Existing profiles start with a zero streak.

Minimal checks requested: changed JavaScript syntax and direct streak checks through 18 wins, duplicate results, practice games, losses and draws passed. Builds completed. No browser suite or physical iPhone performance test was run; rendering limits reduce work but are not a measured device frame-rate guarantee.

Refresh Safari or close and reopen the Home Screen app to load this version. Existing saves and asset caching are retained.
