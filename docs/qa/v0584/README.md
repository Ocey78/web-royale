# 0.58.4 release record

Added Ultimate Elixir Pump for 15 elixir, with a production interval of the normal Collector's `ManaGenerateTimeMs / 2.5` (currently 6,000 ms). The new entity inherits the native Collector and uses the existing generic production, ownership, building and rendering paths.

**No tests, battle simulations or browser gameplay checks were run**, following the user's explicit instruction. Existing catalog-count and price expectations were updated for the new card but were not executed. This release does not claim tested gameplay behavior.

`build.txt` records the required static-site build. `deployment.json` records the GitHub Pages publication status and published version. The prior release's test results remain historical evidence for that release only.
