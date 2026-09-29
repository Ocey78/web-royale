"""Convert provided CR 3.5.0 graphics to deterministic browser scene data.
Usage: python tools/extract_game_assets.py --source /path/to/extracted/assets
No external downloads are made. Requires Pillow and NumPy for build-time only.
"""
from pathlib import Path
from PIL import Image
import argparse, base64, hashlib, json, csv, io
from sc_codec import unpack,parse,textures
ROOT=Path(__file__).resolve().parents[1]
NATIVE=ROOT/'assets/native'
TROOPS={
 'knight':('chr_knight','Knight','Knight_enemy',.98),
 'archers':('chr_archer','archer1','archer1_enemy',.87),
 'giant':('chr_giant','giant1','giant1_enemy',1),
 'mini-pekka':('chr_mini_pekka','minipekka','minipekka_red',1),
 'musketeer':('chr_musketeer','chr_musketeer_blue','chr_musketeer',1),
 'bomber':('chr_bomber','chr_bomber','chr_bomber_RED',1)}
ARENAS=[('training','Training Camp','arena_training','training_area_bg','training_arena'),('goblin','Goblin Stadium','level_goblin_arena','goblin_bgr','goblin_arena'),('bone','Bone Pit','level_bone_arena','bone_arena_bgr','bone_arena'),('barbarian','Barbarian Bowl','level_barbarian_arena','barbarian_arena_bgr','barbarian_arena'),('royal','Royal Arena','level_royal_arena','royal_base_bgr','royal_arena')]
FX=['fireball_projectile1','fireball_small','fireball_trail1','FireParticle1','explosion_cloud_1','crater_ground','projectile_arrow_basic','projectile_arrow_basic_enemy','projectile_bomb','Tower_projectile1','projectile_speed_line','effect_Hit1','death_ground_elixir1','Death_blue_smoke','Death_purple_sparkle1','tower_destr_cloud_1','towerExplode_wall1']

def trim(scene,keep):
 scene['exports']={k:v for k,v in scene['exports'].items() if k in keep};used=set()
 def add(idx):
  idx=str(idx)
  if idx in used:return
  used.add(idx)
  if idx in scene['clips']:
   for f in scene['clips'][idx]['frames']:
    for item in f:add(item[0])
 for idx in scene['exports'].values():add(idx)
 for key in ['shapes','clips','textFields']:scene[key]={k:v for k,v in scene[key].items() if k in used}
 return scene

def scene(src,name,keep=None):
 path=src/'sc'/f'{name}.sc';data=path.read_bytes();s=parse(unpack(data),pixels=True)
 if keep is not None:s=trim(s,keep)
 texs=s['textures']
 if 26 in s['flags']:
  options=[src/'downloaded'/f'{name}_highres_tex.sc',src/'sc'/f'{name}_tex.sc',src/'sc'/f'{name}_lowres_tex.sc']
  texp=next((p for p in options if p.exists()),None)
  if not texp:raise FileNotFoundError(f'Missing texture for {name}')
  texs=textures(unpack(texp.read_bytes()))
 else:texp=path
 if len(texs)!=s['counts'][2]:raise ValueError(f'{name}: texture count does not match')
 for i,tex in enumerate(texs):
  if tex['pixels'] is None:raise ValueError(f'{name}: missing texture pixels')
  fn=f'{name}-{i}.png';Image.fromarray(tex.pop('pixels')).save(NATIVE/fn,compress_level=3)
  tex['file']=fn
 s['textures']=texs;s['source']={'file':str(path.relative_to(src)),'sha256':hashlib.sha256(data).hexdigest(),'textureFile':str(texp.relative_to(src)),'textureSha256':hashlib.sha256(texp.read_bytes()).hexdigest()}
 # Validate every graph edge and matrix/color reference before building the page.
 for cid,c in s['clips'].items():
  for frame in c['frames']:
   for idx,m,col,blend in frame:
    if str(idx) not in s['shapes'] and str(idx) not in s['clips'] and str(idx) not in s['textFields']:raise ValueError(f'{name} dangling {idx}')
    if m!=65535 and m>=len(s['matrices']):raise ValueError(f'{name} invalid matrix')
    if col!=65535 and col>=len(s['colors']):raise ValueError(f'{name} invalid color')
 print(name,len(s['shapes']),'shapes',len(s['clips']),'clips',len(s['textures']),'textures',flush=True)
 return s

def placement(src,location,exports):
 rows=list(csv.reader(io.StringIO(unpack((src/'locations'/f'{location}.csv').read_bytes()).decode())))
 current='';result=[];missing=set();lastx=lasty=None
 aliases={'training_cliff'+str(i):'cliff'+str(i).zfill(2) for i in range(1,8)}
 aliases.update({'training_tree'+str(i):'tree'+str(i).zfill(2) for i in range(1,4)})
 aliases.update({'training_bush1':'bush01','training_bush2':'bush02'})
 for row in rows:
  if len(row)<4:continue
  if not row[0] and row[1] and row[1] not in ('SC','string'):
   current=aliases.get(row[1],row[1]);lastx=lasty=None
  if current and not row[0] and not row[1] and (row[2].lstrip('-').isdigit() or row[3].lstrip('-').isdigit()):
   x=int(row[2]) if row[2].lstrip('-').isdigit() else lastx;y=int(row[3]) if row[3].lstrip('-').isdigit() else lasty;lastx,lasty=x,y
   if x is None or y is None:continue
   if current in exports:result.append({'name':current,'x':(x-9000)*.032,'y':y*.024})
   else:missing.add(current)
 return result,sorted(missing)

def main():
 p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);args=p.parse_args();src=args.source;NATIVE.mkdir(parents=True,exist_ok=True)
 out={'version':'0.3.0','sourceVersion':'3.5.0','scenes':{},'units':{},'arenas':[]}
 for ident,(file,blue,red,scale) in TROOPS.items():
  keep=[f'{prefix}_{state}1_{d}' for prefix in (blue,red) for state in ('idle','run','attack') for d in range(1,10)]
  out['scenes'][file]=scene(src,file,keep)
  for exp in keep:
   if exp not in out['scenes'][file]['exports']:raise ValueError(f'Missing required animation {exp}')
  out['units'][ident]={'scene':file,'prefix':[blue,red],'scale':scale}
 for name in ['building_tower','chr_king']:
  keep=['KingTower_blue','KingTower_red','StarTower_base_blue','StarTower_base_red','StarTower_top_blue','StarTower_top_red','kingtower_destroyed','princesstower_destroyed'] if name=='building_tower' else ['King_blue','King_red']
  out['scenes'][name]=scene(src,name,keep)
 out['scenes']['chr_princess']=scene(src,'chr_princess',[f'{prefix}_{state}1_{d}' for prefix in ('princess_tower','princess_tower_red') for state in ('idle','attack') for d in range(1,10)])
 out['scenes']['effects']=scene(src,'effects',FX)
 for ident,label,file,export,loc in ARENAS:
  s=scene(src,file);out['scenes'][file]=s;items,missing=placement(src,loc,s['exports'])
  out['arenas'].append({'id':ident,'name':label,'scene':file,'export':export,'objects':items,'unmappedObjects':missing})
  print(label,len(items),'placed decorations; unmapped',missing,flush=True)
 # Export the actual framed card graphics from ui_spells, not promotional renders.
 cards=parse(unpack((src/'sc/ui_spells.sc').read_bytes()))
 cardtex=textures(unpack((src/'sc/ui_spells_tex.sc').read_bytes()))
 names={'knight':'knight','archers':'archers','giant':'giant','mini-pekka':'mini_pekka','musketeer':'musketeer','bomber':'bomber','fireball':'fire_fireball','arrows':'order_volley'}
 import numpy as np, math
 for ident,name in names.items():
  clip=cards['clips'][str(cards['exports'][name])]
  assert len(clip['frames'])==1 and len(clip['frames'][0])==1
  idx,m,col,blend=clip['frames'][0][0]
  assert col==65535 and blend==0
  chunks=cards['shapes'][str(idx)];assert len(chunks)==1
  chunk=chunks[0];tex=cardtex[chunk['texture']];xy=np.array(chunk['xy']);uv=np.array(chunk['uv'])*[tex['w'],tex['h']]
  
  if m!=65535:
   a,b,c,d,tx,ty=cards['matrices'][m];xy=xy@np.array([[a,b],[c,d]])+np.array([tx,ty])
  lo=xy.min(axis=0);hi=xy.max(axis=0);w,h=np.ceil(hi-lo).astype(int)
  coeff=np.linalg.lstsq(np.column_stack((xy-lo,np.ones(len(xy)))),uv,rcond=None)[0]
  assert np.max(np.abs(np.column_stack((xy-lo,np.ones(len(xy))))@coeff-uv))<.5
  image=Image.fromarray(tex['pixels']).transform((int(w),int(h)),Image.Transform.AFFINE,tuple(coeff.T.flatten()),Image.Resampling.BICUBIC)
  image.save(ROOT/'assets/cards'/f'{ident}.png')
 (NATIVE/'data.json').write_text(json.dumps(out,separators=(',',':')))
 report={'source':'User-supplied APK and matching downloaded graphics','version':'3.5.0','units':list(TROOPS),'arenas':[a['name'] for a in out['arenas']], 'sceneCount':len(out['scenes']),'exports':sum(len(s['exports']) for s in out['scenes'].values()),'uniqueClips':sum(len(s['clips']) for s in out['scenes'].values()),'frameRecords':sum(len(c['frames']) for s in out['scenes'].values() for c in s['clips'].values()),'textures':sum(len(s['textures']) for s in out['scenes'].values()),'unmapped':{a['id']:a['unmappedObjects'] for a in out['arenas']}}
 (NATIVE/'extraction-report.json').write_text(json.dumps(report,indent=2));print(report)
if __name__=='__main__':main()
