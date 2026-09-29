"""Expand native graphics to all playable cards. Reads supplied assets, no downloads or fonts."""
from pathlib import Path
import sys,json,hashlib,numpy as np
from PIL import Image
from sc_codec import parse,unpack,textures
from extract_game_assets import trim
ROOT=Path(__file__).resolve().parents[1];SRC=Path(sys.argv[1]);OUT=ROOT/'assets/native';OUT.mkdir(exist_ok=True)
D=json.loads((ROOT/'assets/game/data.json').read_text());data=json.loads((OUT/'data.json').read_text())
ents=set();projs=set();areas=set();requests={}
def ent(n):
 if not n or n in ents or n not in D['entities']:return
 ents.add(n);r=D['entities'][n]
 for f in ['SpawnCharacter','SpawnCharacter2','SpawnCharacter3','DeathSpawnCharacter','DeathSpawnCharacter2','DeathSpawnCharacter3','MorphCharacter','AttachedCharacter']:ent(r.get(f))
 for f in ['Projectile','ProjectileSpecial','CustomFirstProjectile','DeathSpawnProjectile','SpawnProjectile']:proj(r.get(f))
 for f in ['DeathAreaEffect','SpawnAreaObject','AreaEffectOnHit','AreaEffectOnMorph','FollowingAreaEffect']:area(r.get(f))
 for f in ['BuffOnDamage','BuffOnKill']:ent(D['buffs'].get(r.get(f),{}).get('DeathSpawn'))
def proj(n):
 if not n or n in projs or n not in D['projectiles']:return
 projs.add(n);r=D['projectiles'][n];ent(r.get('SpawnCharacter'));proj(r.get('SpawnProjectile'));area(r.get('SpawnAreaEffectObject'))
def area(n):
 if not n or n in areas or n not in D['areas']:return
 areas.add(n);r=D['areas'][n];ent(r.get('SpawnCharacter'));ent(r.get('DeathSpawnCharacter'));proj(r.get('Projectile'))
for c in D['cards']:
 r=c['source'];ent(r.get('SummonCharacter'));ent(r.get('SummonCharacterSecond'));proj(r.get('Projectile'));proj(r.get('CustomFirstProjectile'));area(r.get('AreaEffectObject'))
for n in ['KingTower','PrincessTower','TowerPrincess','VoodooHog']:ent(n)
for n in ents:
 r=D['entities'][n]
 if r.get('FileName'):requests.setdefault(Path(r['FileName']).stem,set()).update(r[k] for k in ['BlueExportName','RedExportName','BlueTopExportName','RedTopExportName'] if r.get(k))
for n in projs:
 r=D['projectiles'][n]
 if r.get('FileName'):requests.setdefault(Path(r['FileName']).stem,set()).update(r[k] for k in ['ExportName','RedExportName'] if r.get(k))
for name,s in data['scenes'].items():requests.setdefault(name,set()).update(s['exports'])
def decode(name,prefixes=None,dest=OUT):
 p=SRC/'sc'/f'{name}.sc';s=parse(unpack(p.read_bytes()),pixels=True)
 if prefixes:s=trim(s,{e for e in s['exports'] if any(e==p or e.startswith(p+'_') for p in prefixes)})
 texs=s['textures'];tp=p
 if 26 in s['flags']:
  options=[SRC/'sc'/f'{name}_tex.sc',SRC/'sc'/f'{name}_lowres_tex.sc',SRC/'sc'/f'{name}_highres_tex.sc',SRC/'downloaded'/f'{name}_tex.sc',SRC/'downloaded'/f'{name}_highres_tex.sc'];tp=next((x for x in options if x.exists()),None)
  if not tp:raise FileNotFoundError(name+' textures')
  texs=textures(unpack(tp.read_bytes()))
 dest.mkdir(exist_ok=True,parents=True)
 for i,t in enumerate(texs):
  px=t.pop('pixels');assert px is not None,(name,'empty texture');fn=f'{name}-{i}.webp';Image.fromarray(px).save(dest/fn,'WEBP',lossless=True,method=2);t['file']=fn
 s['textures']=texs;s['source']={'file':str(p.relative_to(SRC)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'textureFile':str(tp.relative_to(SRC)),'textureSha256':hashlib.sha256(tp.read_bytes()).hexdigest()}
 for clip in s['clips'].values():clip.pop('childrenNames',None);clip.pop('children',None)
 return s
if '--resume' in sys.argv:
 scenes=data['scenes'];missing=[n for n,c in data['units'].items() if not any(c['animations']['0:idle'])]
else:
 scenes={}
 for name,prefix in sorted(requests.items()):
  scenes[name]=decode(name,prefix);print(name,len(scenes[name]['exports']),'exports',flush=True)
 data['scenes']=scenes;data['version']='0.4.0';data['sourceVersion']=D['snapshot'];data['units']={};data['projectiles']={};missing=[]
 for n in sorted(ents):
  r=D['entities'][n];name=Path(r.get('FileName','')).stem
  if name not in scenes:continue
  sc=scenes[name];prefix=[r.get('BlueExportName',''),r.get('RedExportName',r.get('BlueExportName',''))];cfg={'scene':name,'prefix':prefix,'scale':r.get('Scale',100)/100,'building':r.get('isBuilding',False),'top':[r.get('BlueTopExportName',''),r.get('RedTopExportName','')],'animations':{}}
  for team,pref in enumerate(prefix):
   for state in ['idle','run','attack','charge','dash','deploy']:
    seq=[]
    for d in range(1,10):
     opts=[f'{pref}_{state}1_{d}',f'{pref}_{state}_{d}',f'{pref}_{state}1',f'{pref}_{state}',pref]
     ex=next((x for x in opts if x in sc['exports']),None)
     if ex is None and state not in ('idle','attack'):ex=next((x for x in [f'{pref}_run1_{d}',f'{pref}_idle1_{d}',pref] if x in sc['exports']),None)
     if ex is None:ex=next((x for x in sc['exports'] if x.startswith(pref+'_idle')),None)
     seq.append(ex)
    cfg['animations'][f'{team}:{state}']=seq
  if not any(cfg['animations']['0:idle']):missing.append(n)
  data['units'][n]=cfg
 for c in D['cards']:
  n=c['source'].get('SummonCharacter')
  if n in data['units']:data['units'][c['id']]=data['units'][n]
 for n in projs:
  r=D['projectiles'][n];name=Path(r.get('FileName','')).stem
  if name in scenes and r.get('ExportName') in scenes[name]['exports']:data['projectiles'][n]={'scene':name,'export':r['ExportName'],'redExport':r.get('RedExportName',r['ExportName']),'scale':r.get('Scale',100)/100}
 (OUT/'data.json').write_text(json.dumps(data,separators=(',',':')))
cardscenes={};cardtex={};manifest=[]
for c in D['cards']:
 file=Path(c['source'].get('IconSWF') or 'sc/ui_spells.sc').stem
 if file not in cardscenes:
  cardscenes[file]=parse(unpack((SRC/'sc'/f'{file}.sc').read_bytes()),pixels=True)
  sc=cardscenes[file]
  if 26 in sc['flags']:
   options=[SRC/'sc'/f'{file}_tex.sc',SRC/'sc'/f'{file}_lowres_tex.sc',SRC/'sc'/f'{file}_highres_tex.sc']
   tp=next((p for p in options if p.exists()),None)
   if tp is None:raise FileNotFoundError(file+' portrait textures')
   cardtex[file]=textures(unpack(tp.read_bytes()))
  else:cardtex[file]=sc['textures']
 sc=cardscenes[file];texs=cardtex[file];icon=c['icon'];cid=sc['exports'].get(icon)
 if cid is None:raise ValueError(f'Missing original portrait {c["name"]}:{icon}')
 clip=sc['clips'][str(cid)];assert len(clip['frames'])==1 and len(clip['frames'][0])==1
 idx,m,col,blend=clip['frames'][0][0];chunks=sc['shapes'][str(idx)];assert len(chunks)==1
 ch=chunks[0];tex=texs[ch['texture']];xy=np.array(ch['xy']);uv=np.array(ch['uv'])*[tex['w'],tex['h']]
 if m!=65535:
  a,b,cc,d,tx,ty=sc['matrices'][m];xy=xy@np.array([[a,b],[cc,d]])+[tx,ty]
 lo=xy.min(axis=0);hi=xy.max(axis=0);w,h=np.ceil(hi-lo).astype(int);coef=np.linalg.lstsq(np.column_stack((xy-lo,np.ones(len(xy)))),uv,rcond=None)[0]
 im=Image.fromarray(tex['pixels']).transform((int(w),int(h)),Image.Transform.AFFINE,tuple(coef.T.flatten()),Image.Resampling.BICUBIC);im.save(ROOT/'assets/cards'/f'{c["id"]}.png',optimize=True)
 manifest.append({'id':c['id'],'name':c['name'],'file':f'assets/cards/{c["id"]}.png','source':f'{file}.sc#{icon}'})
(ROOT/'assets/manifest.json').write_text(json.dumps({'revision':'uploaded-3.2557.2','source':'User-provided APK and graphics','cards':manifest},indent=2))
ui=ROOT/'assets/ui-source';ui.mkdir(exist_ok=True)
for n in ['ui','ui_chest','ui_arena','ui_battle_pass','ui_battle_end','ui_clan_wars','ui_trophy_road']:
 print('UI',n,flush=True);s=decode(n,None,ui);(ui/f'{n}.json').write_text(json.dumps(s,separators=(',',':')))
report={'snapshot':D['snapshot'],'entities':len(ents),'projectiles':len(projs),'sceneCount':len(scenes),'cardPortraits':len(manifest),'missingIdleMappings':missing,'textureCount':sum(len(s['textures']) for s in scenes.values()),'clipCount':sum(len(s['clips']) for s in scenes.values())};(ROOT/'docs/qa/asset-extraction.json').write_text(json.dumps(report,indent=2));print(report)
