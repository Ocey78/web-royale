"""Reproducible gameplay-only v17 import and explicit October 6, 2026 overlay.

Inputs are decoded original package files and a read-only v0.52.3 baseline.
The source fingerprint remains separate from the manual balance snapshot.
Validate all inputs/inheritance/targets before replacing either output file.
"""
from pathlib import Path
import argparse, copy, csv, hashlib, io, json, math, os, re, tempfile, tomllib

ARRAY_FIELDS={'PowerLevelMultiplier','UpgradeCost','UpgradeMaterialCount','OriginalUpgradeMaterialCount','UpgradeExp','UpgradePrestige','RefundGems'}
GROUP_FILES={'CHARACTER':'characters_base','BUILDING':'buildings','PROJECTILE':'projectiles','BUFF':'character_buffs','AEO':'area_effect_objects','ABILITY':'character_abilities','SPELL_CHARACTER':'spells_characters','SPELL_BUILDING':'spells_buildings','SPELL_OTHER':'spells_other','SPELL_EVO':'spells_evolved','SPELL_HERO':'spells_hero_form'}
SOURCE_URL='https://supercell.com/en/games/clashroyale/blog/release-notes/october-balance-changes-2026/'

def csv_table(path):
    reader=csv.DictReader(io.StringIO(path.read_text(encoding='utf-8-sig'))); types=next(reader); key=next(iter(types)); out=[]; cur=None
    for row in reader:
        if row.get(key):cur={};out.append(cur)
        if cur is None:continue
        for k,v in row.items():
            if not k or v in ('',None):continue
            typ=types.get(k,'').lower();arr=typ.endswith('array') or path.stem=='rarities' and k in ARRAY_FIELDS;base=typ.replace('array','')
            if base=='int':v=int(v)
            elif base in ('float','double'):v=float(v)
            elif base=='boolean':
                if v.lower() not in ('true','false'):raise ValueError(f'Invalid boolean: {path}:{k}:{v}')
                v=v.lower()=='true'
            if arr:cur.setdefault(k,[]).append(v)
            elif k not in cur:cur[k]=v
    return out

def merge(a,b,arithmetic=False):
    for k,v in b.items():
        if arithmetic and isinstance(v,list) and len(v)==2 and v[0] in ('%','+','-','*','/'):
            old=a.get(k)
            if not isinstance(old,(int,float)):raise ValueError('Arithmetic extension missing numeric base: '+k)
            op,x=v; a[k]=old*x/100 if op=='%' else old+x if op=='+' else old-x if op=='-' else old*x if op=='*' else old/x
            if int(a[k])==a[k]:a[k]=int(a[k])
        elif isinstance(v,dict) and isinstance(a.get(k),dict):merge(a[k],v,arithmetic)
        else:a[k]=copy.deepcopy(v)
    return a

def read_toml(path):
    source=path.read_text(encoding='utf-8-sig')
    try:return tomllib.loads(source)
    except tomllib.TOMLDecodeError:
        result={}
        for chunk in re.split(r'(?m)(?=^\[[A-Za-z_])',source):
            if chunk.strip():merge(result,tomllib.loads(chunk))
        return result

def compile_data(source,baseline):
    logic=source/'csv_logic' if (source/'csv_logic').is_dir() else source
    csvs={p.stem:csv_table(p) for p in sorted(logic.glob('*.csv'))}
    sections={};origins={};hashes={'csv_logic/'+p.relative_to(logic).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(logic.glob('*.csv'))}
    for p in sorted(logic.rglob('*.toml'),key=lambda p:(len(p.relative_to(logic).parts),p.relative_to(logic).as_posix())):
        content=read_toml(p); rel='csv_logic/'+p.relative_to(logic).as_posix(); hashes[rel]=hashlib.sha256(p.read_bytes()).hexdigest();merge(sections,content)
        for group,entries in content.items():
            if isinstance(entries,dict):
                for name in entries:origins[group+'.'+name]=rel
    groups={k:copy.deepcopy(v) for k,v in sections.items() if isinstance(v,dict)}
    for group,file in GROUP_FILES.items():
        current={r['Name']:copy.deepcopy(r) for r in csvs.get(file,[])}
        p=logic/(file+'.toml')
        if p.exists():
            for name,entry in read_toml(p).items():
                if isinstance(entry,dict) and not name.isupper():merge(current.setdefault(name,{'Name':name}),entry)
        merge(current,groups.get(group,{}))
        if group=='SPELL_EVO':merge(current,groups.get('SPELL_EVOLVED',{}))
        groups[group]=current
    for group,file in [('VARIABLE','variables'),('SHAPE','shapes'),('TARGET_RESOLVER','targetresolvers'),('SPAWN_GROUP','spawn_groups'),('CARD_GROUP','card_groups'),('FILTER','game_object_filters')]:
        base=read_toml(logic/(file+'.toml'));current={k:v for k,v in base.items() if isinstance(v,dict) and not k.isupper()};merge(current,groups.get(group,{}));groups[group]=current
    native_sections=copy.deepcopy(sections)
    overlay={'date':'2026-10-06','sourceUrl':SOURCE_URL,'referenceLevel':11,'changes':[],'unresolved':[{'card':'Skeletons','field':'SpawnSpread','reason':'Official article specifies tighter spawn spread but supplies no numeric value; native v17 spread retained.'}]}
    rarity={r['Name']:r for r in csvs['rarities']}
    def set_field(group,name,field,value,official=None,method='official direct value'):
        row=groups[group][name];parts=field.split('.'); obj=row
        for part in parts[:-1]:obj=obj[int(part)] if isinstance(obj,list) else obj[part]
        key=int(parts[-1]) if isinstance(obj,list) else parts[-1];old=copy.deepcopy(obj.get(key) if isinstance(obj,dict) else obj[key]);obj[key]=value
        overlay['changes'].append({'record':group+'.'+name,'field':field,'nativeValue':old,'appliedValue':value,'officialLevel11':official,'method':method})
    def scaled_set(group,name,field,target):
        row=groups[group][name];r=rarity[row.get('Rarity','Common')];n=11-(r.get('RelativeLevel',0)+1);factor=1 if n==0 else r['PowerLevelMultiplier'][n-1]/100
        matches=[i for i in range(max(0,math.floor(target/factor)-2),math.ceil((target+1)/factor)+2) if math.floor(i*factor+1e-7)==target]
        if len(matches)!=1:raise ValueError(f'Official target lacks unique integer source base: {group}.{name}.{field} {target}: {matches}')
        set_field(group,name,field,matches[0],target,f'unique integer base under native Level 11 multiplier {factor}; floor(base * multiplier)')
    # Apply to authored bases before materializing native inheritance.
    for group,name,field,target in [
        ('AEO','IceWizardHero_FreezeAeo','Damage.BaseDamage',46),('BUFF','Cannon_EV1_barrage_damage_buff','DamagePerSecond',261),
        ('PROJECTILE','BarbLogProjectileRolling','Damage',215),('CHARACTER','Ghost','Hitpoints',1152),('CHARACTER','Ghost','Damage',263),
        ('CHARACTER','GhostOverlay','Hitpoints',1152),('CHARACTER','GhostOverlay','Damage',263),
        ('AEO','GoblinDrillDamageArea','Damage.TowerDamage',20),('PROJECTILE','LavaHoundProjectile','Damage',71),
        ('CHARACTER','Ram','Damage',271),('PROJECTILE','WallbreakerProjectile','Damage',302),('PROJECTILE','xbow_projectile','Damage',61),
        ('CHARACTER','ThreeMusketeer_Rework','Hitpoints',906),('CHARACTER','GoldenKnight','Damage',168)]:scaled_set(group,name,field,target)
    for group,name,field,value in [
        ('BUILDING','ElixirCollector','LifeTime',110000),('BUILDING','ElixirCollector','ManaGenerateTimeMs',15000),
        ('CHARACTER','MinionGiant','HitSpeed',1700),('CHARACTER','LavaHound','HitSpeed',1500),('ABILITY','Deflect','CastTime',700),
        ('ABILITY','GoldenKnightChain','DashRange',5000),('CHARACTER','GoldenKnight','DashSecondaryRange',5000),
        ('SHAPE','GoldenKnight_Charge_Shape','Radius',5000),('EXT','AngryBarbarian_EV1','AttackSequenceList.1.CustomSightRange',6000)]:set_field(group,name,field,value)
    # Native Monk protection triggers at the end of its equally authored cast.
    set_field('ABILITY','Deflect','TriggerDelay',700,method='derived companion timing preserving native TriggerDelay = CastTime; published protection activation at 700 ms')
    # Charge is explicitly authored as exactly twice Ram's attack; preserve that
    # native relationship, labeled as a derived companion value, not an official number.
    set_field('CHARACTER','Ram','DamageSpecial',groups['CHARACTER']['Ram']['Damage']*2,method='derived companion value preserving native DamageSpecial / Damage = 2')
    extensions=groups.get('EXT',{});cache={};visiting=set()
    def resolve(reference):
        if reference in cache:return copy.deepcopy(cache[reference])
        if reference in visiting:raise ValueError('Cyclic source inheritance: '+reference)
        visiting.add(reference)
        if '.' in reference:
            group,name=reference.split('.',1)
            # Prefer the extension even when a child table supplies only an
            # additional authored field under CHARACTER.Name.
            if name in extensions and 'Base' in extensions[name]:
                value=resolve(name)
            elif name in groups.get(group,{}):value=copy.deepcopy(groups[group][name])
            elif group=='CHARACTER' and name in groups['BUILDING']:value=copy.deepcopy(groups['BUILDING'][name])
            elif group=='CHARACTER' and name in groups['PROJECTILE']:value=copy.deepcopy(groups['PROJECTILE'][name])
            else:raise ValueError('Unknown source base: '+reference)
        else:
            row=extensions.get(reference)
            if not row or 'Base' not in row:raise ValueError('Unknown extension: '+reference)
            value=resolve(row['Base']);merge(value,row,arithmetic=True);value['Name']=reference
            group=row['Base'].split('.')[0]
            if group=='EXT':group=extension_group(row['Base'].split('.')[1])
            merge(value,groups.get(group,{}).get(reference,{}),arithmetic=True)
        visiting.remove(reference);cache[reference]=copy.deepcopy(value);return value
    def extension_group(name):
        seen=set()
        while True:
            if name in seen:raise ValueError('Cyclic extension group: '+name)
            seen.add(name);group,parent=extensions[name]['Base'].split('.',1)
            if group!='EXT':return group
            name=parent
    for name,row in extensions.items():
        if not isinstance(row,dict) or 'Base' not in row:continue
        group=extension_group(name)
        if group not in groups:raise ValueError('Unknown extension group: '+group)
        groups[group][name]=resolve(name)
    # Barrel goblins are source Goblins with only the announced first-hit timer
    # specialized. Native source tables share Goblin across unrelated cards.
    for source_name,alias,projectiles in [
        ('Goblin','GoblinBarrelGoblin',['GoblinBarrelSpell','GoblinBarrelSpell_EV1']),
        ('GoblinDummy','GoblinBarrelGoblinDummy',['GoblinBarrelSpell_EV1_Decoy'])]:
        row=copy.deepcopy(groups['CHARACTER'][source_name]);row['Name']=alias;row['LoadTime']=row['HitSpeed']-300;groups['CHARACTER'][alias]=row
        overlay['changes'].append({'record':'CHARACTER.'+alias,'field':'LoadTime','nativeValue':groups['CHARACTER'][source_name]['LoadTime'],'appliedValue':row['LoadTime'],'officialFirstHitMs':300,'method':'manual card-specific specialization of native '+source_name+'; HitSpeed - firstHitMs'})
        for name in projectiles:
            groups['PROJECTILE'][name]['SpawnCharacter']=alias
            overlay['changes'].append({'record':'PROJECTILE.'+name,'field':'SpawnCharacter','nativeValue':source_name,'appliedValue':alias,'method':'manual barrel specialization; preserve unrelated Goblins'})
    # Preserve every original UI/progression key and metadata, updating only
    # gameplay fields and source pointers. Newly available forms derive titles
    # from the preserved base card, avoiding external translations.
    data=copy.deepcopy(baseline);data.update(snapshot='16.402.17+balance-2026-10-06',packageLabel='160402017',sourceFingerprint='504fe9d1820c587deda31030c70bc4d1121fea4f')
    data['sourceProvenance']={'nativeSnapshot':'16.402.17','packageLabel':'160402017','fingerprint':data['sourceFingerprint'],'decodedSha256':hashes,'hashEncoding':'sha256 of decoded input bytes','uiProgressionBaseline':baseline['snapshot']}
    data['manualEntityAliases']={alias:{'sourceEntity':source,'kind':'manual-balance-specialization','method':'native source copied; only barrel first-hit LoadTime changed; native artwork reused'} for alias,source in [('GoblinBarrelGoblin','Goblin'),('GoblinBarrelGoblinDummy','GoblinDummy')]}
    data['sha256']=hashes;data['balanceOverlay']=overlay
    for key,group in [('entities','CHARACTER'),('projectiles','PROJECTILE'),('buffs','BUFF'),('areas','AEO'),('abilities','ABILITY'),('actions','ACTION'),('filters','FILTER'),('evolutions','SPELL_EVO'),('heroes','SPELL_HERO')]:data[key]=copy.deepcopy(groups.get(group,{}))
    data['entities'].update({k:dict(v,isBuilding=True) for k,v in groups['BUILDING'].items()})
    for k in ['rarities','globals','battle_timelines']:data['timelines' if k=='battle_timelines' else k]={r['Name']:r for r in csvs[k]}
    for key,group,file in [('variables','VARIABLE','variables'),('shapes','SHAPE','shapes'),('targetResolvers','TARGET_RESOLVER','targetresolvers'),('spawnGroups','SPAWN_GROUP','spawn_groups'),('cardGroups','CARD_GROUP','card_groups'),('gameObjectFilters','FILTER','game_object_filters')]:
        base=read_toml(logic/(file+'.toml'));result={k:v for k,v in base.items() if isinstance(v,dict) and not k.isupper()};merge(result,groups.get(group,{}));data[key]=result
    # Flatten old style global actions, while keeping inline source actions.
    for name,entry in read_toml(logic/'actions.toml').items():
        if isinstance(entry,dict) and entry.get('ClassType'):data['actions'].setdefault(name,dict(entry,Name=name))
    data['sourceSections']=native_sections;data['sourceOrigins']=origins;data['unresolvedInheritance']=[]
    data['spellVariants']={**groups['SPELL_CHARACTER'],**groups['SPELL_BUILDING'],**groups['SPELL_OTHER']}
    source_cards={c['source']['Name']:c for c in data['cards']}
    for c in data['cards']:
        row=data['spellVariants'].get(c['source']['Name'])
        if row is None:raise ValueError('Existing card missing from v17: '+c['id'])
        c['source']=copy.deepcopy(row);c['cost']=row.get('ManaCost',c['cost']);c['rarity']=row.get('Rarity',c['rarity'])
    missing=[n for group in ['SPELL_CHARACTER','SPELL_BUILDING','SPELL_OTHER'] for n,r in groups[group].items() if not r.get('NotInUse') and not r.get('NotVisible') and n not in source_cards]
    if missing:raise ValueError('New base card needs preserved display metadata: '+str(missing))
    old_forms={f['id']:f for f in baseline['forms']};forms=[]
    for group,kind in [('SPELL_EVO','evolution'),('SPELL_HERO','hero')]:
        for name,row in groups[group].items():
            if row.get('NotInUse') or row.get('NotVisible') or kind=='hero' and row.get('CardForm')!='HeroForm':continue
            base=source_cards.get(re.sub(r'_(EV\d+|hero)$','',name))
            if not base:raise ValueError('Form missing base: '+name)
            candidates=[row.get('LinkedChampionCharacter'),row.get('SummonCharacter'),*(row.get('SummonCharactersList') or [])]
            ability_character=next((n for n in candidates if data['entities'].get(n,{}).get('Ability')),None)
            if kind=='hero' and name=='Tombstone_hero':ability_character='TombstoneHero_Monster_Passive'
            ability_name=data['entities'].get(ability_character,{}).get('Ability');ability=data['abilities'].get(ability_name)
            form=copy.deepcopy(old_forms.get(name,{'id':name,'baseCardId':base['id'],'kind':kind,'name':base['name']+' Evolution' if kind=='evolution' else 'Hero '+base['name'],'description':''}))
            form.update(source=copy.deepcopy(row),cycles=int(row.get('DarkElixirCost',0)) if kind=='evolution' else 0,requiredShards=6 if kind=='evolution' else 200,abilityCharacter=ability_character,ability=dict(ability,id=ability_name) if ability else None);forms.append(form)
    for old in baseline['forms']:
        if old['kind']!='champion':continue
        form=copy.deepcopy(old);form['source']=copy.deepcopy(data['spellVariants'][old['source']['Name']]);ability_name=(old.get('ability') or {}).get('id');form['ability']=dict(data['abilities'][ability_name],id=ability_name) if ability_name else None;forms.append(form)
    data['forms']=forms
    if len({f['id'] for f in forms})!=len(forms):raise ValueError('Duplicate form IDs')
    for required in ['ElectroGiant_EV1','ElectroWizard_hero']:
        if required not in {f['id'] for f in forms}:raise ValueError('Required new form missing: '+required)
    if [c['id'] for c in data['cards']]!=[c['id'] for c in baseline['cards']]:raise ValueError('Existing card ID/order changed')
    if data['modernProgression']!=baseline['modernProgression'] or data['loadouts']!=baseline['loadouts']:raise ValueError('UI/progression mutated')
    return data

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source',type=Path,required=True);parser.add_argument('--baseline',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    data=compile_data(args.source,json.loads(args.baseline.read_text(encoding='utf-8-sig')))
    encoded=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    js='/* Verified decoded v17 gameplay plus explicit October 6 overlay; provenance in DATA.sourceProvenance and DATA.balanceOverlay. */\n(function(r){const d='+encoded+';if(typeof module==="object"&&module.exports)module.exports=d;else r.RoyaleGameData=d;})(globalThis);\n'
    paths=[(args.output/'assets/game/data.json',encoded),(args.output/'src/game-data.js',js)]
    if args.check:
        for path,value in paths:
            if path.read_text(encoding='utf-8')!=value:raise ValueError('Generated data differs: '+str(path))
    else:
        staged=[]
        try:
            for path,value in paths:
                path.parent.mkdir(parents=True,exist_ok=True)
                fd,tmp=tempfile.mkstemp(prefix=path.name+'.',suffix='.tmp',dir=path.parent)
                with os.fdopen(fd,'w',encoding='utf-8',newline='\n') as stream:stream.write(value)
                staged.append((Path(tmp),path))
            # Validation completes before either active file is replaced.
            for tmp,path in staged:os.replace(tmp,path)
        finally:
            for tmp,_ in staged:
                if tmp.exists():tmp.unlink()
    print(json.dumps({'snapshot':data['snapshot'],'cards':len(data['cards']),'forms':len(data['forms']),'entities':len(data['entities']),'changes':len(data['balanceOverlay']['changes']),'unresolved':data['balanceOverlay']['unresolved'],'checkOnly':args.check}))
if __name__=='__main__':main()
