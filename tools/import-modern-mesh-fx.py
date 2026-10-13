"""Extract source Hero FX geometry, materials, shaders and animation records.

Build-only converter. Uses the separately preserved modern_3d decoder; none of
that decoder is bundled into the game. Source database and cache are read-only
except --cache, which receives only explicitly referenced remote assets.
"""
from pathlib import Path
import argparse, base64, hashlib, json, re, sqlite3, struct, sys, zipfile


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def reference(value):
    return value.split(' | ')[0].split('#')[0]


class Flat:
    """Bounded FlatBuffer field access; retain unknown fields rather than guess."""
    def __init__(self, raw):
        self.raw = raw

    def number(self, fmt, pos):
        if pos < 0 or pos + struct.calcsize(fmt) > len(self.raw):
            raise ValueError('FlatBuffer read outside source')
        return struct.unpack_from(fmt, self.raw, pos)[0]

    def offset(self, pos):
        return pos + self.number('<I', pos)

    def fields(self, pos):
        table = pos - self.number('<i', pos)
        return [self.number('<H', table + i) for i in range(4, self.number('<H', table), 2)]

    def string(self, pos):
        start = self.offset(pos)
        length = self.number('<I', start)
        if start + 4 + length > len(self.raw):
            raise ValueError('FlatBuffer string outside source')
        return self.raw[start + 4:start + 4 + length].decode()

    def vector(self, pos):
        start = self.offset(pos)
        return [start + 4 + 4 * i for i in range(self.number('<I', start))]


def decode_material(raw):
    b = Flat(raw); root = b.number('<I', 0); fields = b.fields(root)
    result = {'sourceFields': fields, 'variables': {}, 'variableTypes': {}}
    if len(fields) > 0 and fields[0]: result['flags'] = b.number('<I', root + fields[0])
    if len(fields) > 1 and fields[1]: result['parent'] = b.string(root + fields[1])
    if len(fields) > 5 and fields[5]: result['sourceShader'] = b.string(root + fields[5])
    result['renderStateFields'] = {str(i): b.number('<I', root + f) for i, f in enumerate(fields) if i >= 6 and f}
    if len(fields) > 2 and fields[2]:
        for entry in b.vector(root + fields[2]):
            node = b.offset(entry); f = b.fields(node)
            name = b.string(node + f[0]); kind = b.number('<B', node + f[1])
            value = b.offset(node + f[2]); v = b.fields(value)
            result['variableTypes'][name] = kind
            if kind == 1:
                result['variables'][name] = b.number('<f', value + v[0]) if v and v[0] else 0
            elif kind in (2, 3, 4):
                result['variables'][name] = [b.number('<f', value + v[i]) if i < len(v) and v[i] else 0 for i in range(kind)]
            elif kind == 6:
                result['variables'][name] = b.string(value + v[0])
            elif kind == 7:
                result['variables'][name] = bool(b.number('<B', value + v[0])) if v and v[0] else False
            else:
                result['variables'][name] = {'unknownType': kind, 'fields': v, 'offset': value}
    return result


def decode_shader(raw):
    """Read the native variant mask, flag order and GLSL source tables."""
    b = Flat(raw); root = b.offset(4); fields = b.fields(root)
    flags = [b.string(p) for p in b.vector(root + fields[2])]
    variants = {}
    for ref in b.vector(root + fields[4]):
        entry = b.offset(ref); f = b.fields(entry)
        mask = b.number('<I', entry + f[0]) if f[0] else 0
        programs = []
        for ref2 in b.vector(entry + f[1]):
            program = b.offset(ref2); p = b.fields(program)
            code = b.string(program + p[10])
            if not code.startswith('#version 300 es'):
                raise ValueError('Unsupported native shader language')
            programs.append(code)
        if len(programs) != 1: raise ValueError('Multiple native shader programs')
        variants[str(mask)] = {'source': programs[0], 'sha256': sha(programs[0].encode()),
                               'flags': [flag for i, flag in enumerate(flags) if mask & (1 << i)]}
    if sorted(map(int, variants)) != list(range(1 << len(flags))):
        raise ValueError('Native shader variant masks are not complete')
    return {'flags': flags, 'variants': variants, 'sourceSha256': sha(raw)}


def mesh_attributes_exact(doc, binary, info_index, count):
    """Decode every descriptor used by this dependency closure without dropping UVs."""
    import numpy as np
    odin = doc['extensions']['SC_odin_format']
    view = doc['bufferViews'][odin['bufferView']]
    start = view.get('byteOffset', 0)
    data = memoryview(binary)[start:start + view['byteLength']]
    formats = {12: ('i1', 4, True), 22: ('<i2', 2, True),
               29: ('<f4', 2, False), 30: ('<f4', 3, False)}
    names = {'a_pos': 'POSITION', 'a_normal': 'NORMAL', 'a_tangent': 'TANGENT', 'a_uv0': 'TEXCOORD_0'}
    result = {}
    for descriptor in odin['meshDataInfos'][info_index]['vertexDescriptors']:
        for attribute in descriptor['attributes']:
            if attribute['format'] not in formats or attribute['name'] not in names:
                raise ValueError('Unverified FX vertex attribute ' + str(attribute))
            dtype, width, normalized = formats[attribute['format']]
            offset = descriptor.get('offset', 0) + attribute.get('offset', 0)
            stride = descriptor['stride']; size = np.dtype(dtype).itemsize
            if count < 1 or offset + (count - 1) * stride + width * size > len(data):
                raise ValueError('FX vertex attribute outside source buffer')
            values = np.ndarray((count, width), dtype=dtype, buffer=data, offset=offset,
                                strides=(stride, size)).copy()
            if normalized: values = np.maximum(values.astype(np.float32) / np.iinfo(values.dtype).max, -1)
            if attribute['name'] == 'a_normal': values = values[:, :3]
            if not np.isfinite(values).all(): raise ValueError('Non-finite FX mesh attribute')
            result[names[attribute['name']]] = values
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', required=True)
    parser.add_argument('--cache', required=True)
    parser.add_argument('--source-cache', action='append', default=[])
    parser.add_argument('--reader', help='Optional verified range-reader script for missing referenced members')
    parser.add_argument('--decoder', required=True)
    parser.add_argument('--output', default=None)
    parser.add_argument('--probe', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    out = Path(args.output) if args.output else root / 'assets/modern-heroes'
    out.mkdir(parents=True, exist_ok=True)
    cache = Path(args.cache)
    caches = [cache] + [Path(p) for p in args.source_cache]
    sys.path.insert(0, args.decoder)
    from modern_3d import read_glb, accessor, GltfBuilder, decode_ktx2
    remote = archive = outer = None
    source_files = {}

    def source(name):
        nonlocal remote, archive, outer
        name = reference(name)
        for folder in caches:
            path = folder / 'assets' / name
            if path.exists(): break
        else:
            if not args.reader: raise FileNotFoundError(name)
            if archive is None:
                scope = {'__file__': args.reader}
                exec(Path(args.reader).read_text().split('def save(')[0], scope)
                remote = scope['Remote'](scope['URL'])
                outer = zipfile.ZipFile(remote)
                archive = zipfile.ZipFile(scope['stored_slice'](remote, outer.getinfo('install_time_asset_pack.apk')))
            path = cache / 'assets' / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(archive.read('assets/' + name))
        raw = path.read_bytes()
        source_files[name] = {'sha256': sha(raw), 'bytes': len(raw)}
        return raw

    db = sqlite3.connect('file:' + Path(args.database).as_posix() + '?mode=ro', uri=True)
    manifest = json.loads((root / 'assets/modern-heroes/manifest.json').read_text())
    records = {}; record_proof = {}; nonfinite_records = {}; mesh_names = set(); material_names = set()

    def visit(value):
        if isinstance(value, list):
            for child in value: visit(child)
        elif isinstance(value, dict):
            for key, child in value.items():
                if isinstance(child, str) and child.startswith('sc3d/'):
                    name = reference(child)
                    if key == 'Model': mesh_names.add(name)
                    elif key in ('MaterialOverride', 'MaterialAsset'): material_names.add(name)
                    elif key in ('Particle', 'Effect', 'Prefab', 'BlueVfx', 'RedVfx', 'asset'): record(name)
                else: visit(child)

    def record(name):
        if name in records: return
        row = db.execute('SELECT data, extref FROM asset WHERE path=?', (name,)).fetchone()
        if not row or row[0] is None: raise ValueError('Missing source JSON record ' + name)
        raw = row[0].encode() if isinstance(row[0], str) else row[0]
        # Source writers emit bare Inf/-Inf/NaN in degenerate curves. Keep those
        # exact tokens as strings, never fabricate finite control points.
        text = raw.decode()
        normalized = re.sub(r'"(?:[^"\\]|\\.)*"|(?<![\w])(?:-?Inf|NaN)(?![\w])',
                            lambda m: m[0] if m[0].startswith('"') else json.dumps(m[0]), text)
        records[name] = json.loads(normalized)
        if normalized != text: nonfinite_records[name] = text
        record_proof[name] = sha(raw)
        visit(records[name])

    for name in manifest['vfxAssets']: record(name)
    game = json.loads((root / 'assets/game/data.json').read_text())
    action_roots = {}; missing_action_roots = {}
    for name, action in game.get('actions', {}).items():
        value = action.get('PrefabAsset', '')
        if value.startswith('sc3d/') and '/effect/' in value:
            name_ref = reference(value)
            if db.execute('SELECT data FROM asset WHERE path=?', (name_ref,)).fetchone() is None:
                missing_action_roots[name] = name_ref
                continue
            action_roots[name] = name_ref
            record(name_ref)
    body_texture_references = {}
    for actor_name, actor in manifest['heroes'].items():
        for part in actor['parts']:
            glb_raw = (root / 'assets/modern-heroes' / part['file']).read_bytes()
            glb_doc = json.loads(glb_raw[20:20 + struct.unpack_from('<I', glb_raw, 12)[0]])
            for body_material in glb_doc.get('materials', []):
                for uniform, texture in body_material.get('extras', {}).get('sourceVariables', {}).get('textures', {}).items():
                    if uniform not in ('normalTex', 'reflectioinTex', 'reflectionTex') or not texture: continue
                    body_texture_references.setdefault(reference(texture), []).append({
                        'actor': actor_name, 'part': part['file'], 'material': body_material.get('name'), 'uniform': uniform})
            for geometry in part.get('geometries', []):
                if geometry.get('MaterialOverride'): material_names.add(reference(geometry['MaterialOverride']))

    materials = {}

    def material(name):
        name = reference(name).removesuffix('.rmat')
        if name in materials: return
        raw = source(name + '.rmat')
        decoded = decode_material(raw)
        if any(isinstance(v, dict) and 'unknownType' in v for v in decoded['variables'].values()):
            raise ValueError('Unsupported material variable type ' + name)
        materials[name] = dict(decoded, sourceSha256=sha(raw), sourceBytes=len(raw),
                               sourceBase64=base64.b64encode(raw).decode())
        if decoded.get('parent', '').endswith('.rmat'): material(decoded['parent'])

    for name in sorted(material_names): material(name)
    if args.probe:
        for name in sorted(mesh_names):
            model, binary = read_glb(source(name + '.glb'))
            (out / (Path(name).name + '.json')).write_text(json.dumps(model, indent=2))
        for name in sorted({v['sourceShader'] for v in materials.values() if 'sourceShader' in v}):
            for stage in ('vert', 'frag'):
                source('sc3d/shaders/' + name + '.' + stage + '.shader')
        (out / 'probe.json').write_text(json.dumps({'records': records, 'meshes': sorted(mesh_names), 'materials': materials, 'sourceFiles': source_files}, indent=2))
        print('Probe', len(records), 'records', len(mesh_names), 'meshes', len(materials), 'materials', flush=True)
        return

    # Resolve only the source inheritance chain. Per-model variables remain on
    # each source model: a body override must be merged over that model at runtime.
    def resolve(name, chain=()):
        row = materials[name]
        if 'resolvedVariables' in row: return row
        if name in chain: raise ValueError('Cyclic source material inheritance')
        parent = reference(row.get('parent', '')).removesuffix('.rmat')
        base = resolve(parent, chain + (name,)) if parent else {}
        row['resolvedVariables'] = dict(base.get('resolvedVariables', {}), **row['variables'])
        row['resolvedVariableTypes'] = dict(base.get('resolvedVariableTypes', {}), **row['variableTypes'])
        row['resolvedShader'] = row.get('sourceShader', base.get('resolvedShader'))
        row['resolvedRenderStateFields'] = dict(base.get('resolvedRenderStateFields', {}), **row['renderStateFields'])
        return row
    for name in sorted(materials): resolve(name)

    textures = {}; requested_textures = set(body_texture_references)
    for mat in materials.values():
        for key, value in mat['resolvedVariables'].items():
            if mat['resolvedVariableTypes'][key] != 6 or not value: continue
            requested_textures.add(reference(value))
    for name in sorted(requested_textures):
        raw = source(name); image = decode_ktx2(raw)
        vk = struct.unpack_from('<I', raw, 12)[0]
        dfd_offset, dfd_length = struct.unpack_from('<II', raw, 48)
        transfer = raw[dfd_offset + 14] if dfd_length >= 16 else None
        srgb = vk in (158, 166, 172, 184)
        if transfer != (2 if srgb else 1): raise ValueError('KTX format/transfer mismatch ' + name)
        filename = 'fx-texture-' + sha(name.encode())[:16] + '.png'
        image.save(out / filename, optimize=True)
        textures[name] = {'file': filename, 'width': image.width, 'height': image.height,
                          'colorSpace': 'srgb' if srgb else 'linear', 'vkFormat': vk, 'transferFunction': transfer,
                          'sourceSha256': sha(raw), 'sourceBytes': len(raw),
                          'fileSha256': sha((out / filename).read_bytes()),
                          'decodedRgbaSha256': sha(image.tobytes())}

    meshes = {}
    import numpy as np
    for name in sorted(mesh_names):
        raw = source(name + '.glb'); model, binary = read_glb(raw); builder = GltfBuilder()
        doc = {'asset': {'version': '2.0', 'generator': 'Source Odin FX geometry conversion'},
               'nodes': [], 'meshes': [], 'scenes': [{'nodes': []}], 'scene': 0,
               'extras': {'sourceModel': name, 'sourceSha256': sha(raw),
                          'sourceMaterials': model['extensions']['SC_odin_format'].get('materials', [])}}
        parents = {}
        for i, node in enumerate(model.get('nodes', [])):
            doc['nodes'].append({k: v for k, v in node.items() if k in ('name', 'translation', 'rotation', 'scale', 'matrix', 'mesh')})
            parent = node.get('extensions', {}).get('SC_odin_format', {}).get('parent')
            if parent is not None:
                if not 0 <= parent < len(model['nodes']) or parent == i: raise ValueError('Invalid FX node parent')
                parents[i] = parent
        for i, parent in parents.items(): doc['nodes'][parent].setdefault('children', []).append(i)
        doc['scenes'][0]['nodes'] = [i for i in range(len(doc['nodes'])) if i not in parents]
        counts = {}; indices = {}
        for mi, mesh in enumerate(model['meshes']):
            for pi, primitive in enumerate(mesh['primitives']):
                values = accessor(model, binary, primitive['indices']).ravel()
                info = primitive['extensions']['SC_odin_format']['meshDataInfoIndex']
                if len(values) % 3: raise ValueError('Non-triangular FX primitive')
                indices[mi, pi] = values
                counts[info] = max(counts.get(info, 0), int(values.max()) + 1)
        attrs = {}; attributes_proof = {}
        for info, count in counts.items():
            decoded = mesh_attributes_exact(model, binary, info, count)
            attrs[info] = {key: builder.array(value, 'VEC2' if key == 'TEXCOORD_0' else 'VEC4' if key == 'TANGENT' else 'VEC3', target=34962) for key, value in decoded.items()}
            attributes_proof[str(info)] = {key: sha(np.asarray(value, dtype='<f4').tobytes()) for key, value in decoded.items()}
        for mi, mesh in enumerate(model['meshes']):
            primitives = []
            for pi, primitive in enumerate(mesh['primitives']):
                info = primitive['extensions']['SC_odin_format']['meshDataInfoIndex']
                values = indices[mi, pi]
                primitives.append({'attributes': attrs[info], 'indices': builder.array(values, 'SCALAR', 5125 if int(values.max()) > 65535 else 5123, 34963),
                                   'mode': 4, 'extras': {'sourceMaterialIndex': primitive.get('material', 0), 'sourceMeshDataInfoIndex': info}})
            doc['meshes'].append({'name': mesh.get('name', ''), 'primitives': primitives})
        filename = 'fx-mesh-' + sha(name.encode())[:16] + '.glb'
        builder.save(out / filename, doc)
        meshes[name] = {'file': filename, 'sourceSha256': sha(raw), 'sourceBytes': len(raw),
                        'fileSha256': sha((out / filename).read_bytes()), 'vertices': sum(counts.values()),
                        'triangles': sum(len(v) // 3 for v in indices.values()),
                        'attributeSha256': attributes_proof,
                        'sourceMaterials': doc['extras']['sourceMaterials']}

    shaders = {}
    for name in sorted({v['resolvedShader'] for v in materials.values()}):
        entry = {}
        for stage in ('vert', 'frag'):
            source_name = 'sc3d/shaders/' + name + '.' + stage + '.shader'
            decoded = decode_shader(source(source_name)); decoded['source'] = source_name
            decoded['sourceVariantCount'] = len(decoded['variants'])
            if name == 'uber_pbr' and stage == 'frag':
                decoded['variants'] = {key: value for key, value in decoded['variants'].items() if int(key) in (128, 130, 132, 134, 144, 146, 148, 150)}
            entry[stage] = decoded
        shaders[name] = entry

    # Variant decisions are named source booleans; explicit selection evidence
    # is exposed for review. Distortion is compiled whenever its texture is
    # authored, so timeline-animated zero initial weights remain supported.
    for name, mat in materials.items():
        v = mat['resolvedVariables']; shader = mat['resolvedShader']; selected = {}
        if shader in ('vfx_mask', 'vfx_mask2'):
            selected['vert'] = 1 if v.get('enableBillboard', False) else 0
            distortion = v.get('dist_speedxy_wmain_wmask', [0, 0, 0, 0])
            selected['frag'] = ((1 if v.get('color_as_alpha', False) else 0) |
                                (2 if v.get('enableDissolve', False) else 0) |
                                (4 if v.get('distortionTex') else 0))
            # Preserve original typo and require the actual authored boolean.
            if shader == 'vfx_mask2' and (v.get('enableMask2Dissolve', False) or v.get('enableMask2Dissove', False)):
                selected['frag'] |= 8
        else:
            lighting = (2 if v.get('enableFresnel', False) else 0) | (16 if v.get('enableRimLight', False) else 0)
            selected = {'vert': 1, 'frag': 128 | lighting | (0 if lighting else 4)}
        mat['selectedVariants'] = selected

    class_counts = {}; timeline_properties = {}; object_types = {}
    def count(value):
        if isinstance(value, dict):
            if '__class' in value: class_counts[value['__class']] = class_counts.get(value['__class'], 0) + 1
            if 'objectType' in value: object_types[str(value['objectType'])] = object_types.get(str(value['objectType']), 0) + 1
            if 'id' in value and 'value' in value:
                key = value['id']; timeline_properties[key] = timeline_properties.get(key, 0) + 1
            for child in value.values(): count(child)
        elif isinstance(value, list):
            for child in value: count(child)
    count(records)
    output = {'schemaVersion': 1, 'sourceVersion': manifest['sourceVersion'], 'sourceVersionCode': 160402017,
              'records': records, 'actionRoots': action_roots, 'missingActionRoots': missing_action_roots,
              'bodyTextureReferences': body_texture_references,
              'meshes': meshes, 'materials': materials, 'textures': textures, 'shaders': shaders,
              'provenance': {'databaseSha256': sha(Path(args.database).read_bytes()), 'recordSha256': record_proof,
                             'sourceFiles': source_files, 'nonFiniteSourceRecords': nonfinite_records,
                             'decoder': 'separately preserved modern_3d / gltf-Supercell-IO schema decoder'},
              'coverage': {'rootRecordCount': len(manifest['vfxAssets']), 'recordCount': len(records),
                           'actionRootCount': len(action_roots), 'timelineCount': sum('anims' in v for v in records.values()), 'meshCount': len(meshes),
                           'materialCount': len(materials), 'textureCount': len(textures), 'shaderCount': len(shaders),
                           'triangles': sum(v['triangles'] for v in meshes.values()), 'objectTypes': object_types,
                           'particleComponents': class_counts, 'timelineProperties': timeline_properties},
              'limitations': [
                  'This extracts existing Hero FX roots, source gameplay action FX roots (including Evo), and body material overrides; unrelated unreferenced graphs are not added.',
                  'Source shader expressions and native variant masks are exact. Browser transforms, time and scene uniforms remain adapter responsibilities.',
                  'Material render-state fields 6/7/8 retain their exact integers; field 6 values 5/6 correlate with authored normal/add material names, but native enum names are not present in this schema.',
                  'The uber_pbr export keeps TINT variants with LOD1/FRESNEL/RIMLIGHT combinations; scene-shadow variants are excluded. LOD1 shader compilation removes fresnel/rim calculations, so overlays need the exported LOD0 variants.',
                  'Bare source Inf/-Inf/NaN timeline tokens are represented by strings, with full original source text retained in provenance; no finite curve is fabricated.',
                  'Texture PNGs preserve decoded top-level RGBA pixels; source GPU compression and authored mip levels remain in the hashed source cache.',
                  'Mesh debug materials remain metadata; active effect materials come from the original prefab overrides.'
              ]}
    path = out / 'fx-manifest.json'
    path.write_text(json.dumps(output, separators=(',', ':'), allow_nan=False))
    print(json.dumps({'output': str(path), 'coverage': output['coverage'], 'transferred': remote.transferred if remote else 0}), flush=True)
    if archive: archive.close()
    if outer: outer.close()
    db.close()


if __name__ == '__main__':
    main()
