"""Import complete original event tower assemblies from the supplied CR 3.5 APK.

Usage: python tools/extract-tower-skins.py path/to/supplied.apk
No network requests, APK execution, reconstructed artwork, or Classic replacement.
"""
from pathlib import Path
import csv, hashlib, io, json, sys, zipfile
from PIL import Image
from sc_codec import parse, unpack, textures
from extract_game_assets import trim

ROOT = Path(__file__).resolve().parents[1]
APK = Path(sys.argv[1])
OUT = ROOT / 'assets/tower-skins'
OUT.mkdir(parents=True, exist_ok=True)
sha = lambda data: hashlib.sha256(data).hexdigest()
with zipfile.ZipFile(APK) as archive:
    scene_bytes = archive.read('assets/sc/building_tower.sc')
    texture_bytes = archive.read('assets/sc/building_tower_tex.sc')
    skin_bytes = archive.read('assets/csv_logic/skins.csv')
    sets_bytes = archive.read('assets/csv_logic/skin_sets.csv')
rows = {row['Name']: row for row in csv.DictReader(io.StringIO(unpack(skin_bytes).decode()))}
sets = {row['Name']: row for row in csv.DictReader(io.StringIO(unpack(sets_bytes).decode()))}
variants = []
keep = set()
for id, name, source_set in [('source-gold-rush', 'Gold Rush', 'GoldRush'),
                             ('source-gem-rush', 'Gem Rush', 'GemRush'),
                             ('source-elixir-pump', 'Elixir Pump', 'ElixerPump')]:
    source = sets[source_set]
    king = rows[source['KingTowerSkin']]
    princess = rows[source['PrincessTowerSkin']]
    names = {'king': [king['ExportName'], king['ExportNameRed']],
             'princessBase': [princess['ExportName'], princess['ExportNameRed']]}
    if princess['TopExportName']:
        names['princessTop'] = [princess['TopExportName'], princess['TopExportNameRed']]
    for pair in names.values():
        keep.update(pair)
    variants.append({'id': id, 'name': name, 'sourceSet': source_set,
                     'sourceKind': 'original-event', 'exports': names})
scene = parse(unpack(scene_bytes), pixels=False)
missing = keep - scene['exports'].keys()
if missing:
    raise ValueError('Incomplete source tower assemblies: ' + ', '.join(sorted(missing)))
scene = trim(scene, keep)
decoded = textures(unpack(texture_bytes))
outputs = {}
scene['textures'] = []
for index, texture in enumerate(decoded):
    filename = f'tower-skins-{index}.webp'
    target = ROOT / 'assets/native' / filename
    image = Image.fromarray(texture.pop('pixels'))
    image.save(target, 'WEBP', lossless=True, method=6)
    scene['textures'].append({**texture, 'file': filename})
    outputs['assets/native/' + filename] = sha(target.read_bytes())
scene['rasterScale'] = 2
scene['source'] = {'file': 'assets/sc/building_tower.sc', 'sha256': sha(scene_bytes),
                   'textureFile': 'assets/sc/building_tower_tex.sc',
                   'textureSha256': sha(texture_bytes)}
scene_file = OUT / 'scene.json'
scene_file.write_text(json.dumps(scene, separators=(',', ':')) + '\n', encoding='utf-8')
outputs['assets/tower-skins/scene.json'] = sha(scene_file.read_bytes())
evidence = {'sourceArchive': APK.name, 'sourceArchiveSha256': sha(APK.read_bytes()),
            'sourceVersion': 'Clash Royale 3.5.0 (499)', 'scene': scene['source'],
            'skinDefinitions': {'file': 'assets/csv_logic/skins.csv', 'sha256': sha(skin_bytes)},
            'skinSets': {'file': 'assets/csv_logic/skin_sets.csv', 'sha256': sha(sets_bytes)},
            'variants': variants, 'outputs': outputs,
            'scope': 'Original special-mode variants exposed as local cosmetics. This is not the seasonal tower-skin catalogue.',
            'excluded': ['Xmas: source CSV rows exist but their live tower exports are absent.',
                         'Seasonal tower SC bundles inspected contain debris, not complete equippable assemblies.']}
(OUT / 'provenance.json').write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'variants': len(variants), 'exports': sorted(keep), 'outputs': outputs}, indent=2))
