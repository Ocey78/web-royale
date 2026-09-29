"""Resolve arena placement through the original decos.csv object table."""
from pathlib import Path
import sys,json,csv,io,hashlib
from PIL import Image
from sc_codec import parse,unpack,textures
from extract_game_assets import trim
R=Path(__file__).resolve().parents[1];S=Path(sys.argv[1]);O=R/'assets/native';d=json.loads((O/'data.json').read_text())
rows=list(csv.DictReader(io.StringIO(unpack((S/'csv_logic/decos.csv').read_bytes()).decode())))[1:];decos={r['Name']:r for r in rows if r['Name']}

def obtain(name,export=None):
 current=d['scenes'].get(name)
 if current and (export is None or export in current['exports']):return current
 p=S/'sc'/(name+'.sc');s=parse(unpack(p.read_bytes()),pixels=True);tp=p;ts=s['textures']
 if 26 in s['flags']:
  tp=next(q for q in [S/'sc'/(name+suffix+'.sc')for suffix in['_highres_tex','_tex','_lowres_tex']]if q.exists());ts=textures(unpack(tp.read_bytes()))
 for i,t in enumerate(ts):
  fn=f'{name}-{i}.webp';Image.fromarray(t.pop('pixels')).save(O/fn,'WEBP',lossless=True,method=3);t['file']=fn
 s['textures']=ts;s['source']={'file':str(p.relative_to(S)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'textureFile':str(tp.relative_to(S)),'textureSha256':hashlib.sha256(tp.read_bytes()).hexdigest()};d['scenes'][name]=s;return s
mapping=[('training','Training Camp','training_arena'),('goblin','Goblin Stadium','goblin_arena'),('bone','Bone Pit','bone_arena'),('barbarian','Barbarian Bowl','barbarian_arena'),('pekka',"P.E.K.K.A’s Playhouse",'dark_arena'),('spell','Spell Valley','spell_arena'),('builder',"Builder’s Workshop",'builder_arena'),('royal','Royal Arena','royal_arena'),('frozen','Frozen Peak','ice_arena'),('jungle','Jungle Arena','jungle_arena'),('hog','Hog Mountain','legendary_arena'),('electro','Electro Valley','electric_arena'),('spooky','Spooky Town','spooky_arena'),('rascals',"Rascal’s Hideout",'heist_arena'),('serenity','Serenity Peak','lunar_arena')]
arenas=[]
for ident,title,loc in mapping:
 p=S/'locations'/(loc+'.csv');data=list(csv.reader(io.StringIO(unpack(p.read_bytes()).decode())));base=next(r for r in data if len(r)>2 and r[1].startswith('sc/'));scene=Path(base[1]).stem;ex=base[2];obtain(scene,ex)
 objects=[];missing=[];cur=None;lastx=lasty=None
 for row in data:
  if len(row)<4:continue
  if not row[0] and row[1] and row[1] not in ['SC','string'] and not row[1].startswith('sc/'):
   cur=row[1];lastx=lasty=None
  if cur and not row[0] and not row[1] and (row[2].lstrip('-').isdigit()or row[3].lstrip('-').isdigit()):
   x=int(row[2]) if row[2].lstrip('-').isdigit()else lastx;y=int(row[3])if row[3].lstrip('-').isdigit()else lasty;lastx,lasty=x,y
   if x is None or y is None:continue
   spec=decos.get(cur);name=(spec or {}).get('ExportName')or cur;sc=Path((spec or {}).get('FileName')or base[1]).stem
   try:
    s=obtain(sc,name)
    if name not in s['exports']:raise ValueError('missing export')
    ob={'name':name,'x':(x-9000)*.032,'y':y*.024,'scene':sc,'sourceName':cur,'layer':(spec or {}).get('Layer')or'Object','visibility':(spec or {}).get('Visibility')or'Always','sort':int((spec or {}).get('SortValue')or 0)}
    override=(spec or {}).get('StartFrameOverride')
    if override:ob['frame']=int(override)
    objects.append(ob)
   except Exception as e:missing.append([cur,str(e)])
 arenas.append({'id':ident,'name':title,'scene':scene,'export':ex,'objects':objects,'unmappedObjects':missing,'sourceLocation':loc+'.csv','locationSha256':hashlib.sha256(p.read_bytes()).hexdigest()});print(ident,len(objects),'missing',len(missing),missing[:4],flush=True)
d['arenas']=arenas;d['version']='0.9.0';(O/'data.json').write_text(json.dumps(d,separators=(',',':')));print('COMPLETE 15 arenas',flush=True)
