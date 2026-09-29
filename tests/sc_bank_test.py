import unittest,sys,struct
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from sc_codec import parse
p=lambda f,*x:struct.pack('<'+f,*x)
tag=lambda t,b:p('Bi',t,len(b))+b
class BankTests(unittest.TestCase):
 def test_matrix_bank_and_named_child(self):
  # One matrix in each bank, a bank-1 clip referencing local matrix zero.
  head=p('6H',0,1,0,0,1,0)+bytes(5)+p('H',1)+p('H',5)+bytes([4])+b'test'
  m=tag(8,p('6i',1024,0,0,1024,20,40))
  clip=p('HBHi',5,30,1,1)+p('3H',0,0,65535)+p('HHB',1,9,0)+bytes([4])+b'icon'+tag(11,p('H',1)+bytes([255]))+tag(41,b'\x01')+tag(0,b'')
  obj=parse(head+m+tag(42,p('HH',1,0))+m+tag(12,clip)+tag(0,b''))
  self.assertEqual(obj['clips']['5']['frames'][0][0][1],1)
  self.assertEqual(obj['clips']['5']['childrenNames'],['icon'])
if __name__=='__main__':unittest.main()
