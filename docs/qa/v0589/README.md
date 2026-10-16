# 0.58.9 release record

Updated Frostbite's central price and Hero descriptions/configuration. The ability retains its three-elixir cost and one charge, extends the owned field and controller expiry by four seconds, and schedules five owned Ice Spirit spawns during that extension. The ordinary spawn deadline stays fixed to avoid extra unintended spawns.

Evolved Lightning Storm now starts at 0.25 seconds with seeded 0.3–0.6 second gaps. Its base variant retains its original delay and random gaps.

**No tests, battle simulations or browser gameplay checks were run**, following the user's instruction. Source changes were reviewed; existing expectations were updated but not executed. The required website build was run.

`build.txt` records the website build. `deployment.json` records GitHub Pages publication status and the published version.

Release `9c2e37f7ec0dbf0a24ac646bf56ad8a377a03a69` was published by [GitHub Pages workflow 38958651680](https://github.com/Ocey78/web-royale/actions/runs/38958651680). The workflow completed successfully and the public release manifest reports 0.58.9. No gameplay or browser tests were performed.
