# 0.58.6 release record

Static investigation traced the blockage to `UltimateBowlerGiant.CollisionRadius: 1050`, converted to a 1.05-tile radius by the catalog. Classic bridges span 2.5–4.5 and 13.5–15.5 tiles. Both point and swept terrain clearance correctly reject a 2.1-tile body. The existing navigator explicitly includes bridge centerlines for one-tile-radius bodies.

Changed only the custom actor's collision radius to 1000. Its independent visual scale and projectile enlargement remain 1.4.

**No tests, battle simulations or browser gameplay checks were run**, following the user's instruction. The source and geometry were reviewed; the required static-site build was run. This release does not claim tested gameplay behavior.

`build.txt` records the website build. `deployment.json` records GitHub Pages publication status and the published version.
