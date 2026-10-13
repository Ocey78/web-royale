"""Focused, offline checks for the imported native mesh FX dependency closure.

Run with bundled Python: python docs/qa/v056/assets/test_import.py
Optional original-source audit: set WEB_ROYALE_FX_CACHES to an os.pathsep list
of source cache roots (each containing assets/); WEB_ROYALE_FX_DATABASE to SCDB.
"""
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import struct
import unittest

ROOT = Path(__file__).resolve().parents[4]
ASSETS = ROOT / 'assets/modern-heroes'
SPEC = importlib.util.spec_from_file_location('mesh_fx_import', ROOT / 'tools/import-modern-mesh-fx.py')
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values(): yield from walk(child)
    elif isinstance(value, list):
        for child in value: yield from walk(child)


def glb(path):
    raw = path.read_bytes()
    assert struct.unpack_from('<4sII', raw) == (b'glTF', 2, len(raw))
    size, kind = struct.unpack_from('<I4s', raw, 12)
    assert kind == b'JSON'
    doc = json.loads(raw[20:20 + size])
    offset = 20 + size
    length, kind = struct.unpack_from('<I4s', raw, offset)
    assert kind == b'BIN\0'
    return doc, raw[offset + 8:offset + 8 + length]


class ImportedSourceFx(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m = json.loads((ASSETS / 'fx-manifest.json').read_text())

    def test_every_referenced_dependency_is_resolved(self):
        m = self.m
        main = json.loads((ASSETS / 'manifest.json').read_text())
        self.assertTrue(set(main['vfxAssets']).issubset(m['records']))
        for row in walk(m['records']):
            for key, value in row.items():
                if not isinstance(value, str) or not value.startswith('sc3d/'): continue
                name = IMPORTER.reference(value)
                if key == 'Model': self.assertIn(name, m['meshes'])
                elif key in ('MaterialOverride', 'MaterialAsset'): self.assertIn(name, m['materials'])
                elif key in ('Particle', 'Effect', 'Prefab', 'BlueVfx', 'RedVfx', 'asset'): self.assertIn(name, m['records'])
        for name in m['actionRoots'].values(): self.assertIn(name, m['records'])
        for name in m['missingActionRoots'].values(): self.assertNotIn(name, m['records'])

    def test_material_raw_bytes_and_inheritance_are_preserved(self):
        for name, material in self.m['materials'].items():
            with self.subTest(material=name):
                raw = base64.b64decode(material['sourceBase64'])
                self.assertEqual(digest(raw), material['sourceSha256'])
                decoded = IMPORTER.decode_material(raw)
                self.assertEqual(decoded['variables'], material['variables'])
                self.assertEqual(decoded['variableTypes'], material['variableTypes'])
                self.assertEqual(decoded['renderStateFields'], material['renderStateFields'])
                parent = IMPORTER.reference(material.get('parent', '')).removesuffix('.rmat')
                inherited = self.m['materials'][parent]['resolvedVariables'] if parent else {}
                self.assertEqual(dict(inherited, **material['variables']), material['resolvedVariables'])
                for key, kind in material['resolvedVariableTypes'].items():
                    value = material['resolvedVariables'][key]
                    if kind == 6 and value: self.assertIn(IMPORTER.reference(value), self.m['textures'])

    def test_native_shader_masks_and_selected_programs_exist(self):
        expected = {'vfx_mask': ['COLOR_AS_ALPHA', 'DISSOLVE', 'DISTORTION'],
                    'vfx_mask2': ['COLOR_AS_ALPHA', 'DISSOLVE', 'DISTORTION', 'MASK_2_DISSOVE']}
        for name, shader in self.m['shaders'].items():
            for stage in ('vert', 'frag'):
                for mask, variant in shader[stage]['variants'].items():
                    self.assertEqual(digest(variant['source'].encode()), variant['sha256'])
                    self.assertEqual(variant['flags'], [flag for i, flag in enumerate(shader[stage]['flags']) if int(mask) & (1 << i)])
                    self.assertTrue(variant['source'].startswith('#version 300 es'))
            if name in expected:
                self.assertEqual(shader['frag']['flags'], expected[name])
                self.assertEqual(len(shader['frag']['variants']), 1 << len(expected[name]))
        uber = self.m['shaders']['uber_pbr']['frag']['variants']
        self.assertIn('fragmentMaterialUniforms.fr_IOR', uber['130']['source'])
        self.assertNotIn('fragmentMaterialUniforms.fr_IOR', uber['134']['source'])
        for material in self.m['materials'].values():
            for stage, mask in material['selectedVariants'].items():
                self.assertIn(str(mask), self.m['shaders'][material['resolvedShader']][stage]['variants'])

    def test_geometry_has_all_source_attributes_and_exact_buffers(self):
        import numpy as np
        total_triangles = 0
        for name, mesh in self.m['meshes'].items():
            with self.subTest(mesh=name):
                path = ASSETS / mesh['file']
                self.assertEqual(digest(path.read_bytes()), mesh['fileSha256'])
                doc, binary = glb(path)
                self.assertNotIn('SC_odin_format', doc.get('extensionsRequired', []))
                for node in doc['meshes']:
                    for primitive in node['primitives']:
                        self.assertEqual(set(primitive['attributes']), {'POSITION', 'NORMAL', 'TANGENT', 'TEXCOORD_0'})
                        info = str(primitive['extras']['sourceMeshDataInfoIndex'])
                        for key, index in primitive['attributes'].items():
                            accessor = doc['accessors'][index]; view = doc['bufferViews'][accessor['bufferView']]
                            raw = binary[view['byteOffset']:view['byteOffset'] + view['byteLength']]
                            self.assertEqual(digest(raw), mesh['attributeSha256'][info][key])
                            self.assertTrue(np.isfinite(np.frombuffer(raw, dtype='<f4')).all())
                        accessor = doc['accessors'][primitive['indices']]
                        self.assertEqual(accessor['count'] % 3, 0)
                        total_triangles += accessor['count'] // 3
        self.assertEqual(total_triangles, self.m['coverage']['triangles'])

    def test_texture_pixels_are_lossless(self):
        from PIL import Image
        for name, texture in self.m['textures'].items():
            with self.subTest(texture=name):
                path = ASSETS / texture['file']
                self.assertEqual(digest(path.read_bytes()), texture['fileSha256'])
                image = Image.open(path).convert('RGBA')
                self.assertEqual(image.size, (texture['width'], texture['height']))
                self.assertEqual(digest(image.tobytes()), texture['decodedRgbaSha256'])

    def test_body_fresnel_and_rim_normal_reflection_dependencies_exist(self):
        main = json.loads((ASSETS / 'manifest.json').read_text())
        references = self.m['bodyTextureReferences']
        for actor, row in main['heroes'].items():
            for part in row['parts']:
                doc, _ = glb(ASSETS / part['file'])
                for material in doc.get('materials', []):
                    for uniform, texture in material.get('extras', {}).get('sourceVariables', {}).get('textures', {}).items():
                        if uniform not in ('normalTex', 'reflectioinTex', 'reflectionTex') or not texture: continue
                        path = IMPORTER.reference(texture)
                        self.assertIn(path, self.m['textures'])
                        self.assertIn({'actor': actor, 'part': part['file'], 'material': material.get('name'), 'uniform': uniform}, references[path])

    def test_source_texture_color_space_is_explicit(self):
        srgb = {name for name, row in self.m['textures'].items() if row['colorSpace'] == 'srgb'}
        self.assertIn('sc3d/shared/eyes/basic/texture/chr_hero_glowy_eye_diff.ktx', srgb)
        self.assertIn('sc3d/shared/eyes/basic/texture/chr_hero_glowy_eye_pupil_diff.ktx', srgb)
        for name, row in self.m['textures'].items():
            self.assertEqual(row['colorSpace'] == 'srgb', row['transferFunction'] == 2)
            self.assertEqual(row['colorSpace'] == 'srgb', row['vkFormat'] in (158, 166, 172, 184))
            if name.endswith('_n.ktx') or '/texture/mask/' in name:
                self.assertEqual(row['colorSpace'], 'linear')

    def test_nonfinite_timeline_source_is_explicit_and_not_fabricated(self):
        sources = self.m['provenance']['nonFiniteSourceRecords']
        self.assertTrue(sources)
        for name, raw in sources.items():
            self.assertEqual(digest(raw.encode()), self.m['provenance']['recordSha256'][name])
            self.assertTrue(any(token in json.dumps(self.m['records'][name]) for token in ('"Inf"', '"-Inf"', '"NaN"')))

    @unittest.skipUnless(os.environ.get('WEB_ROYALE_FX_DATABASE'), 'Original database not specified')
    def test_original_database_hash_and_every_record_hash(self):
        path = Path(os.environ['WEB_ROYALE_FX_DATABASE'])
        self.assertEqual(digest(path.read_bytes()), self.m['provenance']['databaseSha256'])
        with sqlite3.connect('file:' + path.as_posix() + '?mode=ro', uri=True) as db:
            for name, checksum in self.m['provenance']['recordSha256'].items():
                raw = db.execute('SELECT data FROM asset WHERE path=?', (name,)).fetchone()[0]
                if isinstance(raw, str): raw = raw.encode()
                self.assertEqual(digest(raw), checksum, name)
            for name in self.m['missingActionRoots'].values():
                self.assertIsNone(db.execute('SELECT data FROM asset WHERE path=?', (name,)).fetchone())

    @unittest.skipUnless(os.environ.get('WEB_ROYALE_FX_CACHES'), 'Original file caches not specified')
    def test_original_binary_dependencies_and_native_variant_masks(self):
        roots = [Path(p) for p in os.environ['WEB_ROYALE_FX_CACHES'].split(os.pathsep)]
        for name, proof in self.m['provenance']['sourceFiles'].items():
            path = next((p / 'assets' / name for p in roots if (p / 'assets' / name).exists()), None)
            self.assertIsNotNone(path, name)
            self.assertEqual(digest(path.read_bytes()), proof['sha256'], name)
            if name in self.m['textures']:
                raw = path.read_bytes(); row = self.m['textures'][name]
                self.assertEqual(struct.unpack_from('<I', raw, 12)[0], row['vkFormat'])
                dfd = struct.unpack_from('<I', raw, 48)[0]
                self.assertEqual(raw[dfd + 14], row['transferFunction'])
            if name.endswith('.shader'):
                shader, stage = Path(name).name.split('.')[:2]
                native = IMPORTER.decode_shader(path.read_bytes())
                exported = self.m['shaders'][shader][stage]
                self.assertEqual(native['flags'], exported['flags'])
                for mask, variant in exported['variants'].items():
                    self.assertEqual(native['variants'][mask], variant)


if __name__ == '__main__':
    unittest.main(verbosity=2)
