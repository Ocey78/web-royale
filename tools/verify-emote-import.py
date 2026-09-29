"""Check imported scene data against a supplied original graphics ZIP."""
from pathlib import Path
import sys,json,zipfile,hashlib
from sc_codec import parse,unpack
R=Path(__file__).resolve().parents[1]
def main(archive):
 cat=json.loads((R/'assets/emotes/catalog.json').read_text());report=json.loads((R/'assets/emotes/import-report.json').read_text());rows=[]
 with zipfile.ZipFile(archive) as z:
  for bundle in report['bundles']:
   name=Path(bundle['bundle']).stem;raw=z.read(bundle['bundle']);original=parse(unpack(raw),pixels=False);imported=json.loads((R/cat['scenes'][name]).read_text())
   fields=['exports','shapes','clips','matrices','colors','flags','counts','textFields','modifiers']
   mismatch=[k for k in fields if original.get(k)!=imported.get(k)]
   if mismatch:raise AssertionError((name,mismatch))
   if hashlib.sha256(raw).hexdigest()!=bundle['sha256']:raise AssertionError((name,'source digest'))
   rows.append({'scene':name,'same':fields,'sha256':bundle['sha256']})
 out={'scenes':len(rows),'animations':len(cat['entries']),'matched':True,'bundles':rows}
 (R/'docs/qa/v024/emote-source-verification.json').write_text(json.dumps(out,indent=2));print(json.dumps({k:v for k,v in out.items() if k!='bundles'}))
if __name__=='__main__':main(sys.argv[1])
