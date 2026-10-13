"""Rebuild the source-preserving modern FX catalog; then run compact-modern-fx.py.
Requires extracted game assets plus the documented SC5 codec toolchain.
"""
from pathlib import Path
import json,sys,hashlib,zipfile,zlib,copy

import argparse,subprocess
parser=argparse.ArgumentParser(description='Import original SC5 modern FX from an extracted source client.')
parser.add_argument('--assets',type=Path,required=True,help='Directory containing assets/sc and assets/legacy_vfx')
parser.add_argument('--codec',type=Path,required=True,help='Directory containing modern_codec.py and its SC5 parser dependencies')
args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'docs/qa/v054'
CACHE=args.codec
sys.path.insert(0,str(CACHE))
from modern_codec import SC5File,decode_sctx,convert_scene
from sc.flash.SC2.TextureData import TextureData
from sc5_parser.sctx import decode_pixel_data
def decode_texture(path):
 try:return decode_sctx(str(path))
 except ValueError as error:
  if 'pixel type 208' not in str(error):raise
  # Metal ASTC_6x6_LDR =208; verify the encoded block count before decoding.
  import struct,zstandard,texture2ddecoder,math
  from PIL import Image
  data=Path(path).read_bytes();n=struct.unpack_from('<I',data)[0];stream=data[4:4+n]
  h=struct.unpack_from('<I',stream)[0];typ,w,hgt=struct.unpack_from('<IHH',stream,4+h)
  offset=4+n;skip=struct.unpack_from('<I',data,offset)[0];offset+=4+skip
  encoded=zstandard.ZstdDecompressor().decompress(data[offset:],max_output_size=w*hgt*8)
  if typ!=208 or len(encoded)!=math.ceil(w/6)*math.ceil(hgt/6)*16:raise ValueError('Invalid ASTC6 texture dimensions')
  return Image.frombytes('RGBA',(w,hgt),texture2ddecoder.decode_astc(encoded,w,hgt,6,6),'raw','BGRA')
embedded=[]
original_external=TextureData.ExternalTexture
def capture_embedded(texture):
 external=original_external(texture)
 if not external:
  if texture.TextureFormat()!=0:raise ValueError('Unsupported embedded texture format')
  embedded.append(decode_pixel_data(bytes(texture.DataAsNumpy()),texture.Width(),texture.Height(),texture.PixelType()))
 return external
TextureData.ExternalTexture=capture_embedded
sys.path.insert(0,str(ROOT/'tools'))
from extract_game_assets import trim
raw=args.assets
effects=json.loads((raw/'assets/legacy_vfx/effects.json').read_text())
emitters=json.loads((raw/'assets/legacy_vfx/emitters.json').read_text())
fx=json.loads((ROOT/'assets/game/fx-data.json').read_text())
game=json.loads((ROOT/'assets/game/data.json').read_text())
# Replace only this import's previous records when regenerating.
for name in list(fx['effects']):
 if any(str(r.get('FileName','')).startswith('sc/modernfx_') or str(r.get('ParticleEmitterName','')).startswith('modernfx-') for r in fx['effects'][name]):del fx['effects'][name]
for name in fx.get('modernSource',{}).get('effectNames',[]):fx['effects'].pop(name,None)
selected=set();particles=set();requested={};seen=set()
tables=['entities','projectiles','areas','buffs','actions','actionGroups','abilities','timelines','spawnGroups']
def sprite(f,e):
 if not f or not e:return
 fs=f if isinstance(f,list) else [f];es=e if isinstance(e,list) else [e]
 for i,exp in enumerate(es):requested.setdefault(Path(fs[min(i,len(fs)-1)]).stem,set()).add(exp)
def particle(n):
 if not n or n in particles or n not in emitters:return
 particles.add(n);r=emitters[n]
 sprite(r.get('ParticleResource'),r.get('ParticleExportName'));sprite(r.get('TrailSWF'),r.get('TrailExportName'))
 particle(r.get('EnemyVersion'));particle(r.get('ParticleSpecificEmitter'))
def effect(n):
 if not isinstance(n,str) or n in fx['effects'] or n in selected or n not in effects:return
 selected.add(n);r=effects[n];effect(r.get('EnemyVersion'));effect(r.get('Effect'))
 for c in r.get('RenderableComponents',[]):
  effect(c.get('Effect'));particle(c.get('ParticleEmitterName'));sprite(c.get('FileName'),c.get('ExportName'))
def visit(v):
 if isinstance(v,str):
  if v in seen:return
  seen.add(v);effect(v)
  for table in tables:
   if v in game.get(table,{}):visit(game[table][v])
 elif isinstance(v,dict):
  for x in v.values():visit(x)
 elif isinstance(v,list):
  for x in v:visit(x)
roots=subprocess.check_output(['node','-e',"const C=require('./src/core'),F=require('./src/card-forms');process.stdout.write(JSON.stringify([...C.CARDS.map(c=>c.source),...F.defaultRegistry.forms.map(f=>f.source)]))"],cwd=ROOT)
visit(json.loads(roots))
for n in ['KingTower','PrincessTower','Cannoneer','DaggerDuchess','RoyalChef']:visit(n)
selection={'effects':sorted(selected),'emitters':sorted(particles),'scenes':{k:sorted(v) for k,v in requested.items()}}
(WORK/'fx-selection.json').write_text(json.dumps(selection,indent=2))
print('Selected',len(selected),'effects',len(particles),'emitters',len(requested),'scenes',flush=True)

# Source retrieval is deliberately separate; this importer never downloads.
records=[]
def source(name):
 path=raw/name
 if not path.is_file():raise FileNotFoundError('Missing original source member '+name)
 return path

native=json.loads((ROOT/'assets/native/data.json').read_text());missing=[]
extra=json.loads((ROOT/"docs/qa/v054/hero-vfx-exports.json").read_text())
for name,exports in extra.items():requested.setdefault(name,set()).update(exports)
for name,exports in requested.items():
 path=source('assets/sc/'+name+'.sc');embedded.clear();sc=SC5File(path)
 if name=='chr_skeleton_evolution':exports.update(n for n in sc.exports if n.startswith('evoskeleton1'))
 available=[n for n in exports if n in sc.exports]
 missing.extend(name+'#'+n for n in exports if n not in sc.exports)
 # Keep FX in separate scenes to preserve legacy sprite references and replays.
 key='modernfx_'+name
 files=['modernfx-'+name+'-'+str(i)+'.webp' for i in range(len(sc.textures))]
 converted=trim(convert_scene(sc,files),available)
 for i,t in enumerate(sc.textures):
  texpath=source('assets/sc/'+t['external']) if t['external'] else path;target=ROOT/'assets/native'/files[i]
  pixels=None if t['external'] else embedded.pop(0)
  if not target.exists():(decode_texture(texpath) if t['external'] else pixels).save(target,'WEBP',lossless=True,method=2)
  records.append({'source':texpath.name,'sha256':hashlib.sha256(texpath.read_bytes()).hexdigest(),'file':files[i]})
 converted['source']={'file':'sc/'+name+'.sc','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'format':'SC5 + SCTX','import':'v0.54 modern FX closure'}
 native['scenes'][key]=converted;fx['scenes'][key]=available
 print('Imported',key,len(available),'exports',flush=True)

def remap_file(v):return 'sc/modernfx_'+Path(v).stem+'.sc' if isinstance(v,str) and Path(v).stem in requested else v
for name in particles:
 r=emitters[name];count=max([len(v) for v in r.values() if isinstance(v,list)]+[1]);rows=[]
 for i in range(count):
  row={k:(v[min(i,len(v)-1)] if v else None) if isinstance(v,list) else v for k,v in r.items()}
  for key in ['ParticleResource','TrailSWF']:row[key]=remap_file(row[key]) if key in row else None
  for key in ['EnemyVersion','ParticleSpecificEmitter']:
   if row.get(key) in particles:row[key]='modernfx-'+row[key]
  rows.append({k:v for k,v in row.items() if v is not None})
 fx['emitters']['modernfx-'+name]=rows
for name in selected:
 sourceEffect=effects[name];common={k:v for k,v in sourceEffect.items() if k!='RenderableComponents'};rows=[]
 for r in sourceEffect.get('RenderableComponents',[]):
  row={**common,**r}
  if 'FileName' in row:row['FileName']=remap_file(row['FileName'])
  if row.get('ParticleEmitterName') in particles:row['ParticleEmitterName']='modernfx-'+row['ParticleEmitterName']
  rows.append(row)
 fx['effects'][name]=rows or [common]

def deps(name,seen=None):
 seen=set() if seen is None else seen
 if not name or name in seen:return set()
 seen.add(name);out=set()
 for r in fx['effects'].get(name,[]):
  if r.get('FileName'):out.add(Path(r['FileName']).stem)
  out.update(deps(r.get('EnemyVersion'),seen));out.update(deps(r.get('Effect'),seen))
  for p in fx['emitters'].get(r.get('ParticleEmitterName'),[]):
   for k in ['ParticleResource','TrailSWF']:
    if p.get(k):out.add(Path(p[k]).stem)
   for alt in fx['emitters'].get(p.get('EnemyVersion'),[]):
    if alt.get('ParticleResource'):out.add(Path(alt['ParticleResource']).stem)
 return {n for n in out if n in native['scenes']}
for name in selected:native['fxDependencies'][name]=sorted(deps(name))
fx['modernSource']={'package':'160402017','definitions':{n:hashlib.sha256((raw/'assets/legacy_vfx'/n).read_bytes()).hexdigest() for n in ['effects.json','emitters.json']},'effects':len(selected),'effectNames':sorted(selected),'emitters':len(particles)}
(ROOT/'assets/game/fx-data.json').write_text(json.dumps(fx,separators=(',',':')),encoding='utf8')
data=json.dumps(native,separators=(',',':')).encode();(ROOT/'assets/native/data.json').write_bytes(data)
import gzip
packed=gzip.compress(data,compresslevel=9,mtime=0);(ROOT/'assets/native/source-data.json.gz').write_bytes(packed)
proof={'schema':1,'compression':'gzip','raw':{'path':'assets/native/data.json','bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()},'archive':{'path':'assets/native/source-data.json.gz','bytes':len(packed),'sha256':hashlib.sha256(packed).hexdigest()}}
(ROOT/'assets/native/source-data.provenance.json').write_text(json.dumps(proof,indent=2)+'\n')
report={**fx['modernSource'],'scenes':len(requested),'missingExports':missing,'textures':records}
(ROOT/'docs/qa/v054/modern-fx-import.json').write_text(json.dumps(report,indent=2)+'\n')
print('Complete',len(selected),'effects; missing',missing,flush=True)
