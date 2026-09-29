"""Import gameplay tables verbatim from the user-supplied client assets.
No web requests. Blank continuation rows are retained for array-valued columns.
"""
from pathlib import Path
import csv, io, json, hashlib, re, argparse
from sc_codec import unpack
ROOT=Path(__file__).resolve().parents[1]
TABLES=['characters','buildings','spells_characters','spells_buildings','spells_other','projectiles','character_buffs','area_effect_objects','rarities','globals','battle_timelines','game_modes','arenas','predefined_decks','treasure_chests']

def read_table(path):
 data=unpack(path.read_bytes());reader=csv.DictReader(io.StringIO(data.decode('utf-8-sig')));types=next(reader);out=[];current=None
 extra_arrays={'PowerLevelMultiplier','UpgradeCost','UpgradeMaterialCount','UpgradeExp'} if path.stem=='rarities' else set()
 for row in reader:
  if row.get('Name'):
   current={};out.append(current)
  if current is None:continue
  for k,v in row.items():
   if not k or v in ('',None):continue
   typ=types.get(k,'').lower();array=typ.endswith('array') or k in extra_arrays
   base=typ.replace('array','')
   if base=='int' or (array and k in extra_arrays):
    try:v=int(v)
    except ValueError:raise ValueError(f'Invalid integer {path.name}:{k}={v}')
   elif base=='boolean':v=v.lower()=='true'
   if array:current.setdefault(k,[]).append(v)
   elif k not in current:current[k]=v
 return out,data

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--source',required=True,type=Path);args=ap.parse_args();src=args.source
 outdir=ROOT/'assets/game';outdir.mkdir(exist_ok=True,parents=True);tables={};hashes={}
 for name in TABLES:
  p=src/'csv_logic'/f'{name}.csv';tables[name],raw=read_table(p);hashes[name]=hashlib.sha256(p.read_bytes()).hexdigest();(outdir/(name+'.csv')).write_bytes(raw)
 text=csv.DictReader(io.StringIO(unpack((src/'csv_client/texts.csv').read_bytes()).decode('utf-8-sig')));next(text);en={r['c']:r['EN'] for r in text if r.get('c')}
 def index(k):return {r['Name']:r for r in tables[k]}
 cards=[]
 for table,kind in [('spells_characters','Troop'),('spells_buildings','Building'),('spells_other','Spell')]:
  for row in tables[table]:
   if row.get('NotInUse') or row.get('NotVisible'):continue
   name=en.get(row.get('TID'),row['Name']);ident=re.sub('[^a-z0-9]+','-',name.lower()).strip('-')
   ident={'mini-p-e-k-k-a':'mini-pekka','p-e-k-k-a':'pekka','x-bow':'x-bow'}.get(ident,ident)
   # Heal is a troop despite its historical row location in spells_other.
   k='Troop' if row.get('SummonCharacter') and kind=='Spell' else kind
   cards.append({'id':ident,'name':name,'icon':row['IconFile'],'kind':k,'cost':row['ManaCost'],'rarity':row['Rarity'],'arena':row.get('UnlockArena','TrainingCamp'),'description':en.get(row.get('TID_INFO'),''),'sourceTable':table+'.csv','source':row})
 assert len(cards)==102 and len({c['id'] for c in cards})==102
 entities=index('characters');entities.update({k:{**v,'isBuilding':True} for k,v in index('buildings').items()})
 data={'snapshot':json.loads((src/'fingerprint.json').read_text())['version'],'packageLabel':'3.5.0','sha256':hashes,'cards':cards,'entities':entities,'projectiles':index('projectiles'),'buffs':index('character_buffs'),'areas':index('area_effect_objects'),'rarities':index('rarities'),'globals':index('globals'),'timelines':index('battle_timelines'),'modes':tables['game_modes'],'arenas':tables['arenas'],'predefinedDecks':tables['predefined_decks'],'chests':tables['treasure_chests']}
 # Save every source field, including those not yet interpreted by the simulator.
 encoded=json.dumps(data,ensure_ascii=False,separators=(',',':'))
 (outdir/'data.json').write_text(encoded)
 (ROOT/'src/game-data.js').write_text("/* Generated from the supplied client tables. */\n(function(r){const d="+encoded.replace('<','\\u003c')+";if(typeof module==='object'&&module.exports)module.exports=d;else r.RoyaleGameData=d;})(globalThis);\n")
 print('Imported',len(cards),'cards,',len(entities),'entity types,',len(data['projectiles']),'projectiles; snapshot',data['snapshot'])
if __name__=='__main__':main()
