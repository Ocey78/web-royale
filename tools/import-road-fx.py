"""Import reward and presentation definitions from the user-supplied APK.
This does not run Android code or copy any font programs. Build-time only.
"""
import argparse,csv,io,json,zipfile,re,hashlib
from pathlib import Path
from sc_codec import unpack
ROOT=Path(__file__).resolve().parents[1]

def table(raw):
 rows=list(csv.reader(io.StringIO(raw.decode('utf-8-sig'))));header,types=rows[:2];out=[]
 for row in rows[2:]:
  d={}
  for k,t,v in zip(header,types,row):
   if not v:continue
   d[k]=int(v) if t.lower()=='int' else v.lower()=='true' if t.lower()=='boolean' else v
  if d:out.append(d)
 return out

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--apk',type=Path,required=True);args=ap.parse_args();data=json.loads((ROOT/'assets/game/data.json').read_text())
 with zipfile.ZipFile(args.apk) as z:
  tables={};hashes={}
  for f in ['csv_logic/trophy_road.csv','csv_logic/trophy_road_season.csv','csv_logic/emotes.csv','csv_client/effects.csv','csv_client/particle_emitters.csv']:
   raw=z.read('assets/'+f);decoded=unpack(raw);tables[Path(f).stem]=table(decoded);hashes[f]=hashlib.sha256(raw).hexdigest();(ROOT/'assets/game'/Path(f).name).write_bytes(decoded)
 emotes={(r['IndexHi'],r['IndexLo']):r['Name'] for r in tables['emotes'] if 'IndexHi' in r};cards={c['source']['Name']:c for c in data['cards']};gates=[0,300,600,1000,1300,1600,2000,2300,2600,3000,3400,3800,4200,4600,5000];old=[0,300,600,1000,1300,1600,2000,2300,2600,3000,3300,3600,4000]
 def reward(row,t,origin):
  d={'id':'road1-'+str(t),'trophies':t,'amount':row.get('Amount',1),'align':row.get('Align','right'),'source':{**row,'origin':origin}}
  if row.get('Resource'):d.update(kind='gems' if row['Resource']=='Diamonds' else 'gold')
  elif row.get('Spell'):d.update(kind='choice',cards=[cards[row[k]]['id'] for k in ['Spell','SpellAlt'] if row.get(k) in cards])
  elif row.get('Chest'):d.update(kind='chest',chest=row['Chest'])
  elif row.get('Consumable'):d.update(kind='wildcards',rarity=row['Consumable'].replace('Wildcard',''))
  elif row.get('RandomSpell'):d.update(kind='cards',rarity=row['RandomSpell'])
  elif row.get('Token'):d.update(kind='tokens',rarity=row['Token'])
  elif row.get('EmoteIDLow') is not None:d.update(kind='emote',emote=emotes[(row['EmoteIDHigh'],row['EmoteIDLow'])])
  else:raise ValueError(row)
  return d
 steps=[]
 for r in tables['trophy_road']:
  if 'Trophies' not in r:continue
  n=int(re.match(r'tr_(\d+)_',r['ItemExportName'])[1]);f=(r['Trophies']-old[n-1])/(old[n]-old[n-1]);t=int(round((gates[n-1]+f*(gates[n]-gates[n-1]))/25)*25)
  steps.append(reward(r,t,'original-row' if t==r['Trophies'] else 'remapped-to-requested-arena-gate'))
 # The additional two summer arenas are absent from this APK's reward table.
 # Explicit local extension using its original reward types and amounts.
 extension=[('wildcards','Common',50),('gold',None,3000),('cards','Rare',10),('chest','Gold_Arena_L1',1),('cards','Epic',2),('gems',None,50),('chest','Magic_Arena_L1',1)]
 for n in [13,14]:
  for i,(kind,extra,amount) in enumerate(extension):
   row={'Amount':amount,'Align':'right' if i%2==0 else 'left','ItemExportName':'tr_12_'+str(i+1)}
   row.update({'Consumable':'Wildcard'+extra} if kind=='wildcards' else {'Resource':'Gold' if kind=='gold' else 'Diamonds'} if kind in ['gold','gems'] else {'RandomSpell':extra} if kind=='cards' else {'Chest':extra})
   steps.append(reward(row,gates[n-1]+(i+1)*50,'local-extension-using-source-reward-types'))
 group=''
 for r in tables['trophy_road_season']:
  group=r.get('Name',group)
  if group=='SeasonDefault' and 'Trophies' in r:steps.append(reward(r,r['Trophies']+1000,'source-season-row-shifted-to-5000-league-gate'))
 steps.sort(key=lambda r:r['trophies']);assert len({r['id'] for r in steps})==len(steps)
 road={'snapshot':data['snapshot'],'schema':1,'hashes':hashes,'note':'Original reward rows; later arena thresholds and leagues are explicitly adapted. Claims are local once per save, not live seasonal rewards.','steps':steps}
 (ROOT/'assets/game/road-data.json').write_text(json.dumps(road,separators=(',',':')))
 (ROOT/'src/road-data.js').write_text('(function(r){const d='+json.dumps(road,separators=(',',':'))+';if(typeof module==="object"&&module.exports)module.exports=d;else r.RoyaleRoadData=d;})(globalThis);\n')
 def groups(rows):
  out={};name=None
  for r in rows:
   if 'Name' in r:name=r['Name'];out[name]=[]
   if name:out[name].append({k:v for k,v in r.items() if k!='Name'})
  return out
 effects=groups(tables['effects']);emitters=groups(tables['particle_emitters']);seenE=set();seenP=set();requested={}
 def sprite(f,e):
  if f and e:requested.setdefault(Path(f).stem,set()).add(e)
 def particle(name):
  if name not in emitters or name in seenP:return
  seenP.add(name)
  for r in emitters[name]:
   sprite(r.get('ParticleResource'),r.get('ParticleExportName'));sprite(r.get('TrailSWF'),r.get('TrailExportName'));particle(r.get('EnemyVersion'));particle(r.get('ParticleSpecificEmitter'))
 def effect(name):
  if name not in effects or name in seenE:return
  seenE.add(name)
  for r in effects[name]:
   effect(r.get('EnemyVersion'));effect(r.get('Effect'));particle(r.get('ParticleEmitterName'));sprite(r.get('FileName'),r.get('ExportName'))
 def visit(v):
  if isinstance(v,str):effect(v)
  elif isinstance(v,dict):
   for x in v.values():visit(x)
  elif isinstance(v,list):
   for x in v:visit(x)
 for k in ['cards','entities','projectiles','areas','buffs']:visit(data[k])
 # Battle-end presentation is selected by match result/tower state rather than
 # referenced from a card row, so seed those source effects explicitly.
 for name in [
  'crown_tower_death1','crown_tower_death1_red',
  'crown_tower_death2','crown_tower_death2_red',
  'win_battle_confetti_gold','win_battle_confetti_gold_top'
 ]: effect(name)
 fx={'snapshot':data['snapshot'],'hashes':hashes,'effects':{k:effects[k] for k in sorted(seenE)},'emitters':{k:emitters[k] for k in sorted(seenP)},'scenes':{k:sorted(v) for k,v in requested.items()},'coordinateScale':.6}
 (ROOT/'assets/game/fx-data.json').write_text(json.dumps(fx,separators=(',',':')))
 print('Imported',len(steps),'reward steps,',len(seenE),'effects,',len(seenP),'particle emitters,',len(requested),'scene dependencies')
 print('FX scenes:',', '.join(sorted(requested)))
if __name__=='__main__':main()
