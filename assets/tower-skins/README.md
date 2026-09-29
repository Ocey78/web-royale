# Original event tower variants

Gold Rush, Gem Rush, and Elixir Pump use complete King and Princess assemblies
from the supplied Clash Royale 3.5.0 APK. The source `skins.csv` and
`skin_sets.csv` identify them as event variants. Web Royale exposes those actual
assemblies as local cosmetics; it does not claim they were the seasonal shop
catalogue in the original game.

Both team colors and the 98-frame King activation timelines are retained.
Gold Rush and Gem Rush retain the source Princess base/top layers. Elixir Pump
uses its single authored Princess assembly. Classic remains separate and
unchanged. No canvas recolor filter or replacement artwork is used.

`provenance.json` records archive, scene, definition, and texture hashes, exact
source export names, and output hashes. Reproduce the conversion with
`python tools/extract-tower-skins.py path/to/supplied.apk` using Pillow and NumPy.
The APK is not executed, installed, downloaded, or included in the build.

The inspected seasonal SC files contain destroyed-ground/debris exports rather
than complete live tower assemblies. The stale Xmas definition has no matching
live export in this APK. Those incomplete variants are not offered.

Original game artwork remains associated with its respective rights holders.
This source conversion is not a claim of publisher endorsement or a new license.
