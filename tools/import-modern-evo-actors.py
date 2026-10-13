"""Add explicitly selected native Evo actors without replacing existing actors.

Build-only adapter for the separately preserved modern_3d source decoder.
The verified client database and source caches remain read-only. Only --cache
receives referenced missing archive members. Existing manifest metadata is
reloaded before merging the converted actors and their new file records.
"""
from pathlib import Path
import argparse, copy, hashlib, io, json, sqlite3, struct, sys, zipfile


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def reference(value):
    return value.split(' | ')[0].split('#')[0]


def texture_metadata(raw):
    if raw[:12] != b'\xabKTX 20\xbb\r\n\x1a\n':
        raise ValueError('Expected original KTX2 texture')
    vk = struct.unpack_from('<I', raw, 12)[0]
    dfd = struct.unpack_from('<I', raw, 48)[0]
    transfer = raw[dfd + 14]
    srgb = vk in (158, 166, 172, 184)
    if transfer != (2 if srgb else 1):
        raise ValueError('KTX2 format and transfer function disagree')
    return {'sourceSha256': sha(raw), 'sourceBytes': len(raw),
            'vkFormat': vk, 'transferFunction': transfer,
            'colorSpace': 'srgb' if srgb else 'linear'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', required=True)
    parser.add_argument('--cache', required=True)
    parser.add_argument('--source-cache', action='append', default=[])
    parser.add_argument('--decoder', required=True)
    parser.add_argument('--reader')
    parser.add_argument('--manifest')
    parser.add_argument('--game')
    parser.add_argument('--output')
    parser.add_argument('--entity', action='append')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    manifest_path = Path(args.manifest) if args.manifest else root / 'assets/modern-heroes/manifest.json'
    game_path = Path(args.game) if args.game else root / 'assets/game/data.json'
    out = Path(args.output) if args.output else manifest_path.parent
    out.mkdir(parents=True, exist_ok=True)
    game = json.loads(game_path.read_text())
    names = args.entity or ['AngryBarbarian_EV1', 'AngryBarbarian_EV1_2']
    sys.path.insert(0, args.decoder)
    import numpy as np
    from modern_3d import read_glb, accessor, mesh_attributes, unpack_animation, decode_ktx2, GltfBuilder
    db = sqlite3.connect('file:' + Path(args.database).as_posix() + '?mode=ro', uri=True)
    caches = [Path(args.cache)] + [Path(p) for p in args.source_cache]
    remote = outer = archive = None
    source_files = {}; records = {}; record_hashes = {}; created_files = set(); material_textures = {}; model_cache = {}

    def source(name):
        nonlocal remote, outer, archive
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
            path = caches[0] / 'assets' / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(archive.read('assets/' + name))
        raw = path.read_bytes()
        source_files[name] = {'sha256': sha(raw), 'bytes': len(raw)}
        return raw

    def record(name):
        name = reference(name)
        if name not in records:
            row = db.execute('SELECT data FROM asset WHERE path=?', (name,)).fetchone()
            if not row or row[0] is None: raise ValueError('Missing native record ' + name)
            raw = row[0].encode() if isinstance(row[0], str) else row[0]
            records[name] = json.loads(raw)
            record_hashes[name] = sha(raw)
        return records[name]

    def external_texture(path, image, raw):
        file = 'evo-texture-' + sha(path.encode())[:16] + '.png'
        image.save(out / file)
        created_files.add(file)
        return dict(texture_metadata(raw), file=file, width=image.width, height=image.height,
                    fileSha256=sha((out / file).read_bytes()), decodedRgbaSha256=sha(image.convert('RGBA').tobytes()))

    def make_model(model_path, states):
        key = model_path + json.dumps(states, sort_keys=True, separators=(',', ':'))
        if key in model_cache: return copy.deepcopy(model_cache[key])
        raw = source(model_path + '.glb')
        model, binary = read_glb(raw)
        builder = GltfBuilder()
        doc = {'asset': {'version': '2.0', 'generator': 'isolated native Evo actor conversion'},
               'nodes': [], 'meshes': [], 'skins': [], 'scenes': [{'nodes': []}], 'scene': 0,
               'animations': [], 'materials': [], 'textures': [], 'images': [],
               'samplers': [{'magFilter': 9729, 'minFilter': 9729, 'wrapS': 10497, 'wrapT': 10497}]}
        parents = {}; provenance_names = {model_path + '.glb'}
        for index, node in enumerate(model.get('nodes', [])):
            doc['nodes'].append({k: v for k, v in node.items() if k in ('name', 'translation', 'rotation', 'scale', 'mesh', 'skin', 'matrix')})
            parent = node.get('extensions', {}).get('SC_odin_format', {}).get('parent')
            if parent is not None: parents[index] = parent
        for child, parent in parents.items(): doc['nodes'][parent].setdefault('children', []).append(child)
        doc['scenes'][0]['nodes'] = [i for i in range(len(doc['nodes'])) if i not in parents]
        counts = {}; indices = {}
        for mi, mesh in enumerate(model['meshes']):
            for pi, primitive in enumerate(mesh['primitives']):
                values = accessor(model, binary, primitive['indices']).ravel()
                if len(values) % 3: raise ValueError('Non-triangular source primitive')
                indices[mi, pi] = values
                info = primitive['extensions']['SC_odin_format']['meshDataInfoIndex']
                counts[info] = max(counts.get(info, 0), int(values.max()) + 1)
        refs = {}; attributes_proof = {}
        for info, count in counts.items():
            attrs = mesh_attributes(model, binary, info, count)
            if not {'POSITION', 'NORMAL', 'TANGENT', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'} <= attrs.keys():
                raise ValueError('Incomplete skinned actor attributes')
            if any(not np.isfinite(value).all() for value in attrs.values()): raise ValueError('Nonfinite actor vertices')
            refs[info] = {}; attributes_proof[str(info)] = {}
            for name, values in attrs.items():
                kind = {'POSITION': 'VEC3', 'NORMAL': 'VEC3', 'TANGENT': 'VEC4', 'TEXCOORD_0': 'VEC2', 'JOINTS_0': 'VEC4', 'WEIGHTS_0': 'VEC4'}[name]
                refs[info][name] = builder.array(values, kind, 5121 if name == 'JOINTS_0' else 5126, 34962)
                attributes_proof[str(info)][name] = sha(np.asarray(values, dtype='u1' if name == 'JOINTS_0' else '<f4').tobytes())
        for mi, mesh in enumerate(model['meshes']):
            primitives = []
            for pi, primitive in enumerate(mesh['primitives']):
                info = primitive['extensions']['SC_odin_format']['meshDataInfoIndex']
                primitives.append({'attributes': refs[info], 'indices': builder.array(indices[mi, pi], 'SCALAR', 5123, 34963),
                                   'material': primitive.get('material', 0), 'mode': 4,
                                   'extras': {'sourceMeshDataInfoIndex': info}})
            doc['meshes'].append(dict(primitives=primitives, **({'name': mesh['name']} if mesh.get('name') else {})))
        for skin in model.get('skins', []):
            doc['skins'].append({'joints': skin['joints'], 'inverseBindMatrices': builder.array(accessor(model, binary, skin['inverseBindMatrices']), 'MAT4')})
        for material in model['extensions']['SC_odin_format'].get('materials', []):
            variables = material.get('variables', {})
            textures = variables.get('textures', {})
            diffuse = textures.get('diffuseTex') or textures.get('tex') or textures.get('mainTex')
            if not diffuse: raise ValueError('Native actor material has no diffuse map')
            path = reference(diffuse); texture_raw = source(path); provenance_names.add(path)
            image = decode_ktx2(texture_raw); png = io.BytesIO(); image.save(png, 'PNG')
            image_index = len(doc['images'])
            doc['images'].append({'bufferView': builder.bytes(png.getvalue()), 'mimeType': 'image/png'})
            doc['textures'].append({'source': image_index, 'sampler': 0})
            metadata = {path: dict(texture_metadata(texture_raw), decodedRgbaSha256=sha(image.convert('RGBA').tobytes()))}
            mask_file = None
            for uniform, value in textures.items():
                if not value: continue
                texture_path = reference(value)
                if texture_path in metadata: continue
                texture_raw = source(texture_path); provenance_names.add(texture_path)
                metadata[texture_path] = texture_metadata(texture_raw)
                if uniform in ('teamColorTex', 'mraTex'):
                    image = decode_ktx2(texture_raw)
                    row = external_texture(texture_path, image, texture_raw)
                    metadata[texture_path] = row
                    if uniform == 'teamColorTex': mask_file = row['file']
                    if uniform == 'mraTex': material_textures[texture_path] = row
            doc['materials'].append({'name': material.get('name', ''), 'doubleSided': True,
                'pbrMetallicRoughness': {'baseColorTexture': {'index': image_index}, 'metallicFactor': 0, 'roughnessFactor': .8},
                'extras': {'sourceShader': material.get('shader'), 'sourceVariables': variables,
                           'sourceTextureMetadata': metadata, 'teamMask': mask_file}})
        name_map = {node['name']: i for i, node in enumerate(doc['nodes']) if node.get('name')}
        animation_data = {}
        for state in states:
            animation_path = reference(state['Animation'])
            anim, anim_binary = read_glb(source(animation_path + '.glb')); provenance_names.add(animation_path + '.glb')
            descriptor, tracks = unpack_animation(anim, anim_binary)
            channels = []; samplers = []; omitted = []; hashes = {}
            for track in tracks:
                name = anim['nodes'][track['node']]['name']
                if name not in name_map: omitted.append(name); continue
                times = np.arange(track['frames'], dtype=np.float32) / descriptor['frameRate']
                input_index = builder.array(times, 'SCALAR')
                hashes[name] = {'time': sha(times.astype('<f4').tobytes())}
                for channel in ('translation', 'rotation', 'scale'):
                    values = track[channel]
                    if not np.isfinite(values).all(): raise ValueError('Nonfinite source animation')
                    output = builder.array(values, 'VEC4' if channel == 'rotation' else 'VEC3')
                    sampler = len(samplers)
                    samplers.append({'input': input_index, 'output': output, 'interpolation': 'LINEAR'})
                    channels.append({'sampler': sampler, 'target': {'node': name_map[name], 'path': channel}})
                    hashes[name][channel] = sha(np.asarray(values, dtype='<f4').tobytes())
            doc['animations'].append({'name': state['Name'], 'channels': channels, 'samplers': samplers})
            animation_data[state['Name']] = {'frames': descriptor['keyframeCount'], 'fps': descriptor['frameRate'], 'source': animation_path,
                'markers': [{k: v for k, v in event.items() if k in ('Name', 'Frame')} for event in state.get('Events', []) if event.get('Event') == 'Marker'],
                'omittedLodBones': omitted, 'staticPose': descriptor.get('staticPose', False), 'trackSha256': hashes}
        file = 'evo-actor-' + sha(key.encode())[:16] + '.glb'
        builder.save(out / file, doc); created_files.add(file)
        result = {'file': file, 'fileSha256': sha((out / file).read_bytes()), 'sourceModel': model_path,
                  'animations': animation_data, 'attributeSha256': attributes_proof,
                  'triangles': sum(len(value) // 3 for value in indices.values()),
                  'provenance': [dict(file='assets/' + name, **source_files[name]) for name in sorted(provenance_names)]}
        model_cache[key] = result
        return copy.deepcopy(result)

    def parts_from_node(node, prefab, chain=()):
        parts = []; components = node.get('components', [])
        model = next((c for c in components if c.get('Model')), None)
        asm_component = next((c for c in components if c.get('AsmAsset')), None)
        transforms = list(chain) + [{k: node.get(k, default) for k, default in (('pos', [0, 0, 0]), ('rot', [0, 0, 0]), ('scl', [1, 1, 1]))}]
        if model:
            asm_path = reference(asm_component['AsmAsset']) if asm_component else None
            asm = record(asm_path) if asm_path else {'States': []}
            states = [s for s in asm['States'] if s.get('Type') == 'AnimClip' and s.get('Animation')]
            part = make_model(reference(model['Model']), states)
            part.update(transforms=transforms, asm=asm, sourceAsm=asm_path, sourcePrefab=prefab,
                        geometries=model.get('Geometries', []), attach=None)
            parts.append(part)
        if any(c.get('MountPoints') for c in components): raise ValueError('Mounted actors need a separately verified attachment conversion')
        for child in node.get('children', []): parts.extend(parts_from_node(child, prefab, transforms))
        return parts

    actors = {}
    for name in names:
        entity = game['entities'][name]; prefab = reference(entity['PrefabAsset'])
        if not prefab.startswith('sc3d/characters/evolution/'):
            raise ValueError('Only explicitly selected source Evo actor prefabs may be imported')
        prefab_record = record(prefab); parts = parts_from_node(prefab_record['data'], prefab)
        if not parts: raise ValueError('Native prefab has no model')
        actors[name] = {'prefab': prefab, 'parts': parts, 'sourceEntity': entity, 'sourcePrefab': prefab_record}
    # Read at the merge point so other agents' unrelated manifest edits survive.
    manifest = json.loads(manifest_path.read_text())
    manifest['heroes'].update(actors)
    for name in names: manifest.get('errors', {}).pop(name, None)
    manifest.setdefault('materialTextures', {}).update(material_textures)
    if 'materialProvenance' in manifest: manifest['materialProvenance']['textureCount'] = len(manifest['materialTextures'])
    files = {row['file']: row for row in manifest.get('files', [])}
    for file in sorted(created_files):
        raw = (out / file).read_bytes(); files[file] = {'file': file, 'bytes': len(raw), 'sha256': sha(raw)}
    manifest['files'] = [files[name] for name in sorted(files)]
    manifest['evoActorProvenance'] = {'sourceVersion': '16.402.2', 'sourceVersionCode': 160402017,
        'actors': names, 'databaseSha256': sha(Path(args.database).read_bytes()), 'gameDataSha256': sha(game_path.read_bytes()),
        'recordSha256': record_hashes, 'sourceFiles': source_files,
        'limitations': ['Source ASM Parameter 2 maps to PropState based on the corresponding gameplay actions.',
                        'AttackSequence index N selects Attack for zero or Attack(N+1); this is inferred from matching source ASM states and actions, not recovered native dispatch code.',
                        'Separate projectile prefabs are outside this actor conversion.']}
    (out / 'manifest.json').write_text(json.dumps(manifest, separators=(',', ':')), encoding='utf8')
    print(json.dumps({'actors': names, 'actorCount': len(manifest['heroes']), 'newFiles': sorted(created_files),
                      'sourceFiles': len(source_files), 'transferred': remote.transferred if remote else 0}), flush=True)
    if archive: archive.close(); outer.close()
    db.close()


if __name__ == '__main__': main()
