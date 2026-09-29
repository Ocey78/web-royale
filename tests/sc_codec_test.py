import sys, unittest, struct, lzma, os
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
import sc_codec as s
class CodecTests(unittest.TestCase):
 def test_csv_lzma(self):
  data=b'Name,Value\nKnight,1\n'; z=lzma.compress(data,format=lzma.FORMAT_ALONE); z=z[:5]+struct.pack('<I',len(data))+z[13:]
  self.assertEqual(s.unpack(z),data)
 def test_truncation(self):
  with self.assertRaises(ValueError):s.Reader(b'\x00').u16()
 def test_string(self):
  r=s.Reader(b'\x03run\xff');self.assertEqual(r.string(),'run');self.assertEqual(r.string(),'')
 def test_empty_swf(self):
  z=s.parse(bytes(19)+bytes(5));self.assertEqual(z['exports'],{});self.assertEqual(z['clips'],{})
 def test_shape_geometry(self):
  xy=struct.pack('<8i',0,0,200,0,200,400,0,400);uv=struct.pack('<8H',0,0,65535,0,65535,65535,0,65535)
  command=bytes([0,4])+xy+uv;sh=struct.pack('<3H',0,1,4)+bytes([22])+struct.pack('<I',len(command))+command+bytes(5)
  data=struct.pack('<6H',1,0,1,0,0,0)+bytes(7)+bytes([18])+struct.pack('<I',len(sh))+sh+bytes(5)
  z=s.parse(data);self.assertEqual(z['shapes']['0'][0]['xy'][2],[10,20])
 def test_rgba4444(self):
  a=s.rgba(bytes.fromhex('0ff0000fffff'),2,3,1,False)
  self.assertEqual(tuple(a[0,0]),(255,0,0,255));self.assertEqual(tuple(a[0,1]),(0,255,0,0))
 def test_tiling_edges(self):
  import numpy as np
  a=np.arange(35*37,dtype=np.uint16).reshape(37,35)
  b=b''.join(a[y:y+32,x:x+32].astype('<u2').tobytes() for y in range(0,37,32) for x in range(0,35,32))
  self.assertTrue(np.array_equal(s.untile(np.frombuffer(b,dtype='<u2'),35,37),a))
 def test_real_knight_clips(self):
  p=Path(os.environ.get('ROYALE_SOURCE_ASSETS','/mnt/data/source-game'))/'sc/chr_knight.sc'
  if not p.exists():self.skipTest('Source APK not present')
  z=s.parse(s.unpack(p.read_bytes()));self.assertIn('Knight_run1_1',z['exports']);self.assertEqual(len(z['shapes']),486)
  self.assertGreater(len(z['clips'][str(z['exports']['Knight_attack1_1'])]['frames']),1)
if __name__=='__main__':unittest.main()
