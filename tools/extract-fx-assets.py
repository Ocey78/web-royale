"""Restore source exports needed by the imported FX graphs (no font programs).
Preserves existing higher-resolution textures and original source transforms.
"""
from pathlib import Path
import json,zipfile,hashlib,argparse
from PIL import Image
from sc_codec import parse,unpack,textures
from extract_game_assets import trim
ROOT=Path(__file__).resolve().parents[1]

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--apk',required=True);ap.add_argument('--graphics',required=True);args=ap.parse_args()
 native=json.loads((ROOT/'assets/native/data.json').read_text());fx=json.loads((ROOT/'assets/game/fx-data.json').read_text());missing=[];added=[]
 with zipfile.ZipFile(args.apk) as apk,zipfile.ZipFile(args.graphics) as graphics:
  def raw(name):
   for z,key in [(apk,'assets/sc/'+name),(graphics,'CR-3.5.0-Graphics/sc/'+name)]:
    if key in z.namelist():return z.read(key)
   return None
  for name,requested in fx['scenes'].items():
   existing=native['scenes'].get(name)
   absent=[e for e in requested if not existing or e not in existing['exports']]
   if not absent:continue
   blob=raw(name+'.sc')
   if not blob:missing.extend(name+'#'+e for e in absent);continue
   scene=parse(unpack(blob),pixels=True);keep=set(requested)|set((existing or {}).get('exports',{}));missing.extend(name+'#'+e for e in absent if e not in scene['exports'])
   scene=trim(scene,keep)
   if existing:
    scene['textures']=existing['textures'];scene['source']=existing.get('source',{})
   else:
    tex=scene['textures'];tp=name+'.sc';tb=blob
    if 26 in scene['flags']:
     for t in [name+'_highres_tex.sc',name+'_tex.sc',name+'_lowres_tex.sc']:
      data=raw(t)
      if data:tp=t;tb=data;tex=textures(unpack(data));break
     else:missing.append(name+'#TEXTURES');continue
    for i,t in enumerate(tex):
     px=t.pop('pixels');fname=f'fx-{name}-{i}.webp';Image.fromarray(px).save(ROOT/'assets/native'/fname,'WEBP',lossless=True,method=2);t['file']=fname
    scene['textures']=tex;scene['source']={'file':'sc/'+name+'.sc','sha256':hashlib.sha256(blob).hexdigest(),'textureFile':tp,'textureSha256':hashlib.sha256(tb).hexdigest()}
   for c in scene['clips'].values():c.pop('childrenNames',None);c.pop('children',None)
   native['scenes'][name]=scene;added.append({'scene':name,'exports':len(absent),'newScene':existing is None});print(name,len(absent),'additional requested exports',flush=True)
 # Precompute scene closures for effects; runtime loading remains deck-specific.
 deps={}
 def visit_effect(name,seen,found):
  if name in seen or name not in fx['effects']:return
  seen.add(name)
  for r in fx['effects'][name]:
   file=Path(r.get('FileName','')).stem
   if file in native['scenes']:found.add(file)
   visit_effect(r.get('Effect'),seen,found);visit_effect(r.get('EnemyVersion'),seen,found)
   for q in fx['emitters'].get(r.get('ParticleEmitterName'),[]):
    file=Path(q.get('ParticleResource','')).stem
    if file in native['scenes']:found.add(file)
    en=q.get('EnemyVersion')
    for alt in fx['emitters'].get(en,[]):
     file=Path(alt.get('ParticleResource','')).stem
     if file in native['scenes']:found.add(file)
 for name in fx['effects']:
  found=set();visit_effect(name,set(),found);deps[name]=sorted(found)
 native['fxDependencies']=deps
 (ROOT/'assets/native/data.json').write_text(json.dumps(native,separators=(',',':')))
 report={'additionalExports':added,'unresolvedSourceReferences':missing,'sceneCount':len(native['scenes']),'effects':len(fx['effects']),'emitters':len(fx['emitters'])}
 (ROOT/'docs/qa/v100/fx-extraction.json').write_text(json.dumps(report,indent=2));print('Unresolved',len(missing),missing[:35])
if __name__=='__main__':main()
