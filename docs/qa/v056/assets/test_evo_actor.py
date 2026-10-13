"""Original Evo Elite Barbarians model/frame fidelity and manifest coverage."""
from pathlib import Path
import hashlib, io, json, os, sqlite3, struct, sys, unittest
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
ASSETS = ROOT / 'assets/modern-heroes'
ACTORS = ('AngryBarbarian_EV1', 'AngryBarbarian_EV1_2')


def sha(raw): return hashlib.sha256(raw).hexdigest()


def glb(path):
    raw = path.read_bytes()
    assert struct.unpack_from('<4sII', raw) == (b'glTF', 2, len(raw))
    size, kind = struct.unpack_from('<I4s', raw, 12)
    assert kind == b'JSON'
    doc = json.loads(raw[20:20 + size]); offset = 20 + size
    size, kind = struct.unpack_from('<I4s', raw, offset)
    assert kind == b'BIN\0'
    return doc, raw[offset + 8:offset + 8 + size]


def accessor_bytes(doc, binary, index):
    row = doc['accessors'][index]; view = doc['bufferViews'][row['bufferView']]
    return binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]


class NativeEvoActor(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m = json.loads((ASSETS / 'manifest.json').read_text())
        cls.actor = cls.m['heroes'][ACTORS[0]]
        cls.part = cls.actor['parts'][0]
        cls.doc, cls.binary = glb(ASSETS / cls.part['file'])
        cls.proof = cls.m['evoActorProvenance']

    def test_both_source_forms_share_complete_actor_and_keep_their_own_entity(self):
        game = json.loads((ROOT / 'assets/game/data.json').read_text())
        for name in ACTORS:
            actor = self.m['heroes'][name]
            self.assertEqual(actor['sourceEntity'], game['entities'][name])
            self.assertEqual(actor['parts'], self.actor['parts'])
            self.assertEqual(actor['prefab'], actor['sourceEntity']['PrefabAsset'])
        self.assertEqual(self.part['transforms'][-1], {'pos': [0, .14707166, 0], 'rot': [0, 0, 0], 'scl': [.8, .8, .8]})
        self.assertTrue(self.doc['skins'])
        self.assertEqual(len(self.part['animations']), 7)
        self.assertEqual(set(self.part['animations']), {s['Name'] for s in self.part['asm']['States'] if s['Type'] == 'AnimClip'})

    def test_authored_selector_and_throw_events_are_retained(self):
        states = {s['Name']: s for s in self.part['asm']['States']}
        for name in ('Idle', 'Walk', 'Attack'):
            self.assertEqual(states[name]['Parameter'], 2)
            self.assertEqual(states[name]['SwitchValues'], [0, 1])
            self.assertEqual(states[name]['SubStates'], [name + '_Origin', name + '_Prop'])
        throw = states['Attack2']
        self.assertEqual(throw['EndFrame'], 27)
        self.assertIn({'Name': 'action_frame', 'Frame': 14}, self.part['animations']['Attack2']['markers'])
        self.assertTrue(any(e.get('Event') == 'HideMesh' and e.get('Frame') == 14 and e.get('EndFrame') == 31 for e in throw['Events']))

    def test_file_hashes_geometry_and_skin_buffers(self):
        files = {r['file']: r for r in self.m['files']}
        self.assertEqual(sha((ASSETS / self.part['file']).read_bytes()), self.part['fileSha256'])
        self.assertEqual(files[self.part['file']]['sha256'], self.part['fileSha256'])
        triangles = 0
        for mesh in self.doc['meshes']:
            for primitive in mesh['primitives']:
                self.assertEqual(set(primitive['attributes']), {'POSITION', 'NORMAL', 'TANGENT', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'})
                proof = self.part['attributeSha256'][str(primitive['extras']['sourceMeshDataInfoIndex'])]
                for name, index in primitive['attributes'].items():
                    self.assertEqual(sha(accessor_bytes(self.doc, self.binary, index)), proof[name])
                triangles += self.doc['accessors'][primitive['indices']]['count'] // 3
        self.assertEqual(triangles, self.part['triangles'])
        for skin in self.doc['skins']:
            self.assertEqual(self.doc['accessors'][skin['inverseBindMatrices']]['count'], len(skin['joints']))

    def test_every_decoded_animation_track_buffer_matches_its_proof(self):
        for anim in self.doc['animations']:
            clip = self.part['animations'][anim['name']]
            self.assertFalse(clip['staticPose'])
            self.assertTrue(anim['channels'])
            for channel in anim['channels']:
                sampler = anim['samplers'][channel['sampler']]
                node = self.doc['nodes'][channel['target']['node']]['name']
                self.assertEqual(sampler['interpolation'], 'LINEAR')
                self.assertEqual(sha(accessor_bytes(self.doc, self.binary, sampler['input'])), clip['trackSha256'][node]['time'])
                self.assertEqual(sha(accessor_bytes(self.doc, self.binary, sampler['output'])), clip['trackSha256'][node][channel['target']['path']])

    def test_original_texture_pixels_and_transfer_metadata(self):
        for material in self.doc['materials']:
            extras = material['extras']; metadata = extras['sourceTextureMetadata']
            for path, row in metadata.items():
                self.assertEqual(row['colorSpace'] == 'srgb', row['transferFunction'] == 2)
                if 'file' in row:
                    image = Image.open(ASSETS / row['file']).convert('RGBA')
                    self.assertEqual(sha(image.tobytes()), row['decodedRgbaSha256'])
                    self.assertEqual(sha((ASSETS / row['file']).read_bytes()), row['fileSha256'])
            diffuse = extras['sourceVariables']['textures']['diffuseTex'].split('#')[0]
            index = material['pbrMetallicRoughness']['baseColorTexture']['index']
            image = self.doc['images'][self.doc['textures'][index]['source']]
            view = self.doc['bufferViews'][image['bufferView']]
            pixels = Image.open(io.BytesIO(self.binary[view['byteOffset']:view['byteOffset'] + view['byteLength']])).convert('RGBA')
            self.assertEqual(sha(pixels.tobytes()), metadata[diffuse]['decodedRgbaSha256'])
            self.assertIn(extras['sourceVariables']['textures']['mraTex'].split('#')[0], self.m['materialTextures'])

    @unittest.skipUnless(os.environ.get('WEB_ROYALE_FX_DATABASE'), 'Original database not specified')
    def test_original_prefab_asm_and_database_hashes(self):
        path = Path(os.environ['WEB_ROYALE_FX_DATABASE'])
        self.assertEqual(sha(path.read_bytes()), self.proof['databaseSha256'])
        with sqlite3.connect('file:' + path.as_posix() + '?mode=ro', uri=True) as db:
            for name, digest in self.proof['recordSha256'].items():
                raw = db.execute('SELECT data FROM asset WHERE path=?', (name,)).fetchone()[0]
                if isinstance(raw, str): raw = raw.encode()
                self.assertEqual(sha(raw), digest)
                self.assertEqual(json.loads(raw), self.actor['sourcePrefab'] if name == self.actor['prefab'] else self.part['asm'])

    @unittest.skipUnless(os.environ.get('WEB_ROYALE_FX_CACHES') and os.environ.get('WEB_ROYALE_FX_DECODER'), 'Original binary caches and decoder not specified')
    def test_every_source_vertex_and_animation_frame_matches_converted_glb(self):
        roots = [Path(p) for p in os.environ['WEB_ROYALE_FX_CACHES'].split(os.pathsep)]
        sys.path.insert(0, os.environ['WEB_ROYALE_FX_DECODER'])
        from modern_3d import read_glb, accessor, mesh_attributes, unpack_animation
        def source(name):
            path = next(p / 'assets' / name for p in roots if (p / 'assets' / name).exists())
            raw = path.read_bytes()
            self.assertEqual(sha(raw), self.proof['sourceFiles'][name]['sha256'])
            return raw
        for name in self.proof['sourceFiles']: source(name)
        native, binary = read_glb(source(self.part['sourceModel'] + '.glb'))
        for mi, mesh in enumerate(native['meshes']):
            for pi, primitive in enumerate(mesh['primitives']):
                output = self.doc['meshes'][mi]['primitives'][pi]
                expected_indices = accessor(native, binary, primitive['indices']).ravel()
                np.testing.assert_array_equal(accessor(self.doc, self.binary, output['indices']).ravel(), expected_indices)
                expected = mesh_attributes(native, binary, primitive['extensions']['SC_odin_format']['meshDataInfoIndex'], int(expected_indices.max()) + 1)
                for name, values in expected.items():
                    actual = accessor(self.doc, self.binary, output['attributes'][name])
                    np.testing.assert_array_equal(actual[:len(values)], values.astype(actual.dtype))
        for output in self.doc['animations']:
            name = output['name']; clip = self.part['animations'][name]
            native, binary = read_glb(source(clip['source'] + '.glb')); descriptor, tracks = unpack_animation(native, binary)
            tracks = {native['nodes'][t['node']]['name']: t for t in tracks}
            for channel in output['channels']:
                sampler = output['samplers'][channel['sampler']]
                node = self.doc['nodes'][channel['target']['node']]['name']; track = tracks[node]
                np.testing.assert_array_equal(accessor(self.doc, self.binary, sampler['input']).ravel(), np.arange(track['frames'], dtype=np.float32) / descriptor['frameRate'])
                np.testing.assert_array_equal(accessor(self.doc, self.binary, sampler['output']), track[channel['target']['path']])


if __name__ == '__main__': unittest.main(verbosity=2)
