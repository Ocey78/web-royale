"""Extract hero billboard FX graphs verbatim from the verified source SCDB.
Run with a Python/SQLite runtime supporting STRICT tables. Native shader meshes
and timeline/material assets are retained as references, not approximated.
"""
from pathlib import Path
import sqlite3, json, hashlib, sys
root=Path(__file__).resolve().parents[1]
db=Path(sys.argv[1]);c=sqlite3.connect('file:'+db.as_posix()+'?mode=ro',uri=True)
path=root/'assets/modern-heroes/manifest.json';manifest=json.loads(path.read_text());assets={};proof={}
def walk(x):
 if isinstance(x,list):
  for v in x:walk(v)
 elif isinstance(x,dict):
  for key,v in x.items():
   if isinstance(v,str) and v.startswith('sc3d/') and key in ('Particle','Effect','Prefab','BlueVfx','RedVfx'):get(v)
   else:walk(v)
def get(value):
 name=value.split(' | ')[0]
 if name in assets:return
 row=c.execute('SELECT data FROM asset WHERE path=?',(name,)).fetchone()
 if not row:raise ValueError('Missing source FX asset '+name)
 raw=row[0].encode() if isinstance(row[0],str) else row[0]
 assets[name]=json.loads(raw);proof[name]=hashlib.sha256(raw).hexdigest();walk(assets[name])
for actor in manifest['heroes'].values():
 walk(actor['sourcePrefab'])
 for part in actor['parts']:walk(part['asm'])
manifest['vfxAssets']=assets;manifest['vfxProvenance']={'sourceVersion':manifest['sourceVersion'],'databaseSha256':hashlib.sha256(db.read_bytes()).hexdigest(),'assetSha256':proof,'limitations':['Only original SC movieclip billboards are rendered. Shader mesh effects and native material/timeline graphs require a separate renderer.','Particle simulation is a bounded deterministic browser interpretation. Unsupported packed curves and cone/deceleration emitters are omitted.']}
path.write_text(json.dumps(manifest,separators=(',',':')))
print('Imported',len(assets),'source prefab/particle records')
