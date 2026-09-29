import sys,struct,unittest,os
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
import sc_codec as s
class SourceTextTests(unittest.TestCase):
 def field(self,text='9999'):
  name=b'Supercell-Magic';t=text.encode()
  payload=struct.pack('<H',17)+bytes([len(name)])+name+struct.pack('<I',0xffffffff)+bytes([0,0,1,0,2,18])+struct.pack('<hhhh',-30,-12,30,12)+bytes([0,len(t)])+t+bytes([1])+struct.pack('<Ihh',0xff112233,3,5)
  return bytes(19)+bytes([33])+struct.pack('<I',len(payload))+payload+bytes(5)
 def test_decodes_source_text_instead_of_discarding(self):
  f=s.parse(self.field())['textFields']['17']
  self.assertEqual(f.get('text'),'9999');self.assertEqual(f.get('fontName'),'Supercell-Magic');self.assertEqual(f.get('fontSize'),18)
  self.assertEqual(f.get('bounds'),[-30,-12,30,12]);self.assertEqual(f.get('align'),2)
 def test_bad_text_payload_does_not_pass_as_empty_label(self):
  data=self.field();pos=data.index(b'9999');bad=data[:pos-1]+bytes([250])+data[pos:]
  with self.assertRaises(ValueError):s.parse(bad)
 def test_real_ui_contains_tower_fields(self):
  p=Path(os.environ.get('ROYALE_SOURCE_ASSETS','/mnt/data/source-v090'))/'sc/ui.sc'
  if not p.exists():self.skipTest('Source unavailable')
  data=s.parse(s.unpack(p.read_bytes()));self.assertTrue(any(f.get('fontName') for f in data['textFields'].values()))
  clip=data['clips'][str(data['exports']['hp_player_tower_withNumber'])]
  self.assertTrue(clip.get('childrenNames'));self.assertTrue(any('hp' in n or 'text' in n or 'number' in n for n in clip['childrenNames']))
if __name__=='__main__':unittest.main()

class ModifierTests(unittest.TestCase):
 def test_modifier_preserves_id_and_kind(self):
  d=bytes(19)+bytes([37])+struct.pack('<I',2)+struct.pack('<H',501)+bytes(5)
  p=s.parse(d);self.assertEqual(p.get('modifiers',{}).get('501'),37)
