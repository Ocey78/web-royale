"""Use highest-resolution supplied textures and expand original arena scenes.
Only reads the user-provided source folder. No downloads and no generated models.
"""
from pathlib import Path
from PIL import Image
import sys,json,hashlib,csv,io
from sc_codec import parse,unpack,textures
from extract_game_assets import placement
R=Path(__file__).resolve().parents[1];S=Path(sys.argv[1]);OUT=R/'assets/native'
d=json.loads((OUT/'data.json').read_text());changes=[]
def readscene(name):
 p=S/'sc'/(name+'.sc');s=parse(unpack(p.read_bytes()),pixels=True);ts=s['textures'];tp=p
 if 26 in s['flags']:
  tp=next(q for q in [S/'sc'/(name+sf+'.sc')for sf in['_highres_tex','_tex','_lowres_tex']]if q.exists());ts=textures(unpack(tp.read_bytes()))
 for i,t in enumerate(ts):
  fname=f'{name}-{i}.webp';Image.fromarray(t.pop('pixels')).save(OUT/fname,'WEBP',lossless=True,method=3);t['file']=fname
 s['textures']=ts;s['source']={'file':str(p.relative_to(S)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'textureFile':str(tp.relative_to(S)),'textureSha256':hashlib.sha256(tp.read_bytes()).hexdigest()};return s
for name,s in list(d['scenes'].items()):
 if 'lowres' not in s.get('source',{}).get('textureFile',''):continue
 p=S/'sc'/(name+'_highres_tex.sc')
 if not p.exists():continue
 ts=textures(unpack(p.read_bytes()));assert len(ts)==len(s['textures']),name
 for i,t in enumerate(ts):
  old=s['textures'][i];before=[old['w'],old['h']];assert t['w']>=old['w'] and t['h']>=old['h']
  Image.fromarray(t.pop('pixels')).save(OUT/old['file'],'WEBP',lossless=True,method=3);t['file']=old['file'];changes.append({'scene':name,'texture':i,'before':before,'after':[t['w'],t['h']]})
 s['textures']=ts;s['source']['textureFile']=str(p.relative_to(S));s['source']['textureSha256']=hashlib.sha256(p.read_bytes()).hexdigest();print('upgraded',name,flush=True)
# Names and thresholds follow the June 2021 historical Trophy Road; card balance
# stays at the embedded snapshot. Scene mappings are separate from the ladder.
more=[('pekka',"P.E.K.K.A’s Playhouse",'level_dark_arena','dark_arena'),('spell','Spell Valley','level_spell_arena','spell_arena'),('builder',"Builder’s Workshop",'level_builder_arena','builder_arena'),('frozen','Frozen Peak','level_ice_arena','ice_arena'),('jungle','Jungle Arena','level_jungle_arena','jungle_arena'),('hog','Hog Mountain','level_legendary_arena','legendary_arena'),('electro','Electro Valley','level_electric_arena','electric_arena'),('spooky','Spooky Town','level_spooky_arena','spooky_arena'),('rascals',"Rascal’s Hideout",'level_heist_arena_dl','heist_arena'),('serenity','Serenity Peak','level_lunar_arena_dl','lunar_arena')]
for ident,title,name,loc in more:
 s=readscene(name);d['scenes'][name]=s
 # The CSV marks the background under Name, with its SC export in column 1.
 rows=list(csv.reader(io.StringIO(unpack((S/'locations'/(loc+'.csv')).read_bytes()).decode())))
 base=next((row[1] for row in rows if len(row)>1 and row[0] in ['Background','background'] and row[1] in s['exports']),None)
 if not base:
  candidates=[n for n in s['exports']if any(k in n.lower()for k in['bgr','_base_01','background','_bkg','_bg'])and '2v2' not in n and 'light' not in n];base=candidates[0] if candidates else None
 if not base:
  print('NEED BACKGROUND',name,[(row[:5])for row in rows[:14]],list(s['exports'])[:30],flush=True)
  continue
 obs,missing=placement(S,loc,s['exports']);other={}
 for x in missing:
  for scene,sd in d['scenes'].items():
   if x in sd['exports']:other[x]=scene;break
 # Reparse placements against a merged export map, retaining original positions.
 if other:
  moreobs,missing=placement(S,loc,{**s['exports'],**other});obs=[{**o,**({'scene':other[o['name']]}if o['name']in other else{})}for o in moreobs]
 arena={'id':ident,'name':title,'scene':name,'export':base,'objects':obs,'unmappedObjects':missing};d['arenas']=[a for a in d['arenas']if a['id']!=ident]+[arena];print('arena',ident,base,len(obs),'missing',missing,flush=True)
order=['training','goblin','bone','barbarian','pekka','spell','builder','royal','frozen','jungle','hog','electro','spooky','rascals','serenity'];d['arenas'].sort(key=lambda a:order.index(a['id']));d['version']='0.9.0'
(OUT/'data.json').write_text(json.dumps(d,separators=(',',':')));(R/'docs/qa/v090').mkdir(parents=True,exist_ok=True);(R/'docs/qa/v090/quality-upgrades.json').write_text(json.dumps(changes,indent=2));print('COMPLETE',len(changes),'textures',len(d['arenas']),'arenas',flush=True)
