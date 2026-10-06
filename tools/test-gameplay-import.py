"""Verify source import preservation, deterministic output, and fail-closed inheritance.
Usage: python tools/test-gameplay-import.py --source <decoded-v17> --baseline <v0523-data.json> --output <build>
"""
from pathlib import Path
import argparse, copy, importlib.util, json, unittest
from unittest.mock import patch

parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);parser.add_argument('--baseline',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
spec=importlib.util.spec_from_file_location('gameplay_import',Path(__file__).with_name('import-gameplay-v17.py'));importer=importlib.util.module_from_spec(spec);spec.loader.exec_module(importer)
baseline=json.loads(args.baseline.read_text(encoding='utf-8-sig'))

class ImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.data=importer.compile_data(args.source,baseline)
    def test_preserves_all_existing_card_ids_and_display_metadata(self):
        self.assertEqual([c['id'] for c in self.data['cards']],[c['id'] for c in baseline['cards']])
        for old,new in zip(baseline['cards'],self.data['cards']):
            for field in ['name','icon','arena','description','sourceTable','kind']:self.assertEqual(new[field],old[field],old['id']+'.'+field)
    def test_preserves_progression_and_ui_tables(self):
        for field in ['modernProgression','loadouts','arenas','predefinedDecks','chests','modes','sourceSpawnGroups','sourcePredefinedDeckRows']:self.assertEqual(self.data[field],baseline[field],field)
    def test_source_authored_tables_have_distinct_unmodified_provenance(self):
        self.assertEqual(self.data['sourceSections']['AEO']['IceWizardHero_FreezeAeo']['Damage']['BaseDamage'],35)
        self.assertEqual(self.data['sourceSections']['CHARACTER']['Ghost']['Hitpoints'],473)
        self.assertEqual(self.data['entities']['Ghost']['Hitpoints'],450)
        self.assertEqual(self.data['sourceProvenance']['nativeSnapshot'],'16.402.17')
    def test_reimport_exactly_matches_installed_asset(self):
        self.assertEqual(self.data,json.loads((args.output/'assets/game/data.json').read_text(encoding='utf-8')))
    def test_unknown_and_cyclic_native_inheritance_fail_before_output(self):
        read=importer.read_toml
        for reference in ['CHARACTER.DoesNotExist','CHARACTER.ElectroGiant_EV1']:
            def inject(path):
                value=read(path)
                if path.name=='electro_giant_ev1.toml':value=copy.deepcopy(value);value['EXT']['ElectroGiant_EV1']['Base']=reference
                return value
            with patch.object(importer,'read_toml',side_effect=inject):
                with self.assertRaisesRegex(ValueError,'Unknown source base|Cyclic source inheritance'):importer.compile_data(args.source,baseline)

unittest.main(argv=['test-gameplay-import.py'])
