"""Pack only referenced SC sprite pixels into lossless effect atlases.

Geometry, frame timelines, and the sampled original pixels are unchanged. Run
after importing modern effects; existing legacy scene atlases are untouched.
"""
from pathlib import Path
import json, math, hashlib, gzip
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
native_path = ROOT / 'assets/native/data.json'
native = json.loads(native_path.read_text())
report = []
for name, scene in native['scenes'].items():
    if not name.startswith('modernfx_') or scene.get('atlasCompaction'):
        continue
    textures = scene['textures']
    commands = [c for shapes in scene['shapes'].values() for c in shapes]
    crops = {}
    for c in commands:
        t = textures[c['texture']]
        xs = [uv[0] * t['w'] for uv in c['uv']]
        ys = [uv[1] * t['h'] for uv in c['uv']]
        box = (max(0, math.floor(min(xs)) - 2), max(0, math.floor(min(ys)) - 2),
               min(t['w'], math.ceil(max(xs)) + 2), min(t['h'], math.ceil(max(ys)) + 2))
        if box[2] <= box[0] or box[3] <= box[1]:
            raise ValueError('Invalid source UV bounds: ' + name)
        key = (c['texture'], *box)
        crops.setdefault(key, {'box': box, 'source': c['texture'], 'commands': []})['commands'].append(c)
    ordered = sorted(crops.values(), key=lambda r: (r['box'][3] - r['box'][1], r['box'][2] - r['box'][0]), reverse=True)
    pages = []
    for r in ordered:
        w, h = r['box'][2] - r['box'][0], r['box'][3] - r['box'][1]
        chosen = None
        for page in pages:
            if w > page['size'] or h > page['size']:
                continue
            x, y, row = page['x'], page['y'], page['row']
            if x + w > page['size']:
                x, y, row = 0, y + row, 0
            if y + h <= page['size']:
                chosen = page
                break
        if chosen is None:
            size = max(2048, 2 ** math.ceil(math.log2(max(w, h))))
            chosen = {'size': size, 'x': 0, 'y': 0, 'row': 0, 'width': 0, 'height': 0, 'items': []}
            pages.append(chosen)
            x = y = row = 0
        r.update(x=x, y=y)
        chosen['items'].append(r)
        chosen.update(x=x + w, y=y, row=max(row, h), width=max(chosen['width'], x + w), height=max(chosen['height'], y + h))
    images = {}
    packed = []
    original_bytes = sum((ROOT / 'assets/native' / t['file']).stat().st_size for t in textures)
    for i, page in enumerate(pages):
        atlas = Image.new('RGBA', (page['width'], page['height']))
        for r in page['items']:
            ti = r['source']
            if ti not in images:
                images[ti] = Image.open(ROOT / 'assets/native' / textures[ti]['file']).convert('RGBA')
            pixels = images[ti].crop(r['box'])
            atlas.paste(pixels, (r['x'], r['y']))
            for c in r['commands']:
                original = c['uv']
                w, h = textures[ti]['w'], textures[ti]['h']
                c['uv'] = [[(uv[0] * w - r['box'][0] + r['x']) / atlas.width,
                            (uv[1] * h - r['box'][1] + r['y']) / atlas.height] for uv in original]
                for before, after in zip(original, c['uv']):
                    assert abs(after[0] * atlas.width - r['x'] + r['box'][0] - before[0] * w) < 1e-8
                    assert abs(after[1] * atlas.height - r['y'] + r['box'][1] - before[1] * h) < 1e-8
                c['texture'] = i
        filename = name.replace('modernfx_', 'modernfx-') + '-packed-' + str(i) + '.webp'
        path = ROOT / 'assets/native' / filename
        atlas.save(path, 'WEBP', lossless=True, method=4, exact=True)
        # Lossless validation covers all sampled pixels, including alpha edges.
        restored = Image.open(path).convert('RGBA')
        assert restored.tobytes() == atlas.tobytes(), 'Atlas changed source pixels: ' + filename
        packed.append({'w': atlas.width, 'h': atlas.height, 'code': 0, 'file': filename})
    scene['textures'] = packed
    if 'counts' in scene:
        scene['counts'][2] = len(packed)
    scene['atlasCompaction'] = 'lossless referenced UV crops with 2px original margins'
    report.append({'scene': name, 'crops': len(crops), 'originalBytes': original_bytes,
                   'packedBytes': sum((ROOT / 'assets/native' / t['file']).stat().st_size for t in packed)})
    print(name, report[-1]['originalBytes'], '->', report[-1]['packedBytes'], flush=True)

data = json.dumps(native, separators=(',', ':')).encode()
native_path.write_bytes(data)
packed = gzip.compress(data, compresslevel=9, mtime=0)
(ROOT / 'assets/native/source-data.json.gz').write_bytes(packed)
proof = {'schema': 1, 'compression': 'gzip',
         'raw': {'path': 'assets/native/data.json', 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()},
         'archive': {'path': 'assets/native/source-data.json.gz', 'bytes': len(packed), 'sha256': hashlib.sha256(packed).hexdigest()}}
(ROOT / 'assets/native/source-data.provenance.json').write_text(json.dumps(proof, indent=2) + '\n')
(ROOT / 'docs/qa/v054/fx-atlas-compaction.json').write_text(json.dumps(report, indent=2) + '\n')
print('Lossless texture bytes', sum(r['originalBytes'] for r in report), '->', sum(r['packedBytes'] for r in report), flush=True)
