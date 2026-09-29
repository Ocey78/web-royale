"""Import paired original animation/icon exports from the supplied graphics ZIP.
Retains original matrix/color/frame/mask data; emits no font binaries or APKs.
"""
from pathlib import Path
import zipfile,json,hashlib,re,sys
from PIL import Image
from sc_codec import parse,unpack
R=Path(__file__).resolve().parents[1]

def main(archive):
 out=R/'assets/emotes';out.mkdir(parents=True,exist_ok=True);scenes={};entries=[];report=[]
 old={('emotes_king_01_dl','emote1'):('Emote0','Happy King'),('emotes_king_01_dl','emote2'):('Emote1','Angry King'),('emotes_king_01_dl','emote3'):('Emote2','Crying King'),('emotes_king_01_dl','emote4'):('Emote3','Laughing King'),('emotes_goblin_01_dl','emote1'):('Emote4','Goblin'),('emotes_princess_01_dl','emote1'):('Emote20','Princess'),('emotes_hog_01_dl','emote1'):('Emote38','Royal Hog'),('emotes_crl_01_dl','emote3'):('Emote58','Trophy Road King'),('emotes_royal_ghost_01_dl','emote4'):('Emote71','Trophy Road Emote')}
 with zipfile.ZipFile(archive) as z:
  names=sorted(n for n in z.namelist() if '/sc/emotes_' in n and n.endswith('.sc'))
  for n in names:
   raw=z.read(n);name=Path(n).stem;d=parse(unpack(raw),pixels=True)
   for i,t in enumerate(d['textures']):
    filename=f'assets/emotes/{name}-{i}.webp';Image.fromarray(t.pop('pixels')).save(R/filename,'WEBP',lossless=True,method=4);t['file']=filename
   d['rasterScale']=2;file=f'assets/emotes/{name}.json';(R/file).write_text(json.dumps(d,separators=(',',':')));scenes[name]=file
   count=0
   for exp in sorted(d['exports'],key=lambda a:int(re.search(r'\d+',a)[0]) if re.search(r'\d+',a) else 0):
    if not re.fullmatch('emote[0-9]+',exp):continue
    icon=exp.replace('emote','icon');assert icon in d['exports'],(name,exp)
    label=re.sub(r'^emotes_|_dl$','',name).replace('_',' ')
    label=re.sub(r'([a-z])([A-Z])',r'\1 \2',label).title();ident=f'{name}-{exp}'
    if (name,exp) in old:ident,label=old[name,exp]
    else:label=f'{label} · {exp[5:]}'
    clip=d['clips'][str(d['exports'][exp])];entries.append({'id':ident,'name':label,'cost':250,'free':ident in ['Emote0','Emote1','Emote2','Emote3'],'scene':name,'animation':exp,'iconExport':icon,'frames':len(clip['frames']),'fps':clip['fps']})
    count+=1
   report.append({'bundle':n,'sha256':hashlib.sha256(raw).hexdigest(),'animations':count})
   print(name,count,flush=True)
 entries.sort(key=lambda e:(not e['free'],not e['id'].startswith('Emote'),e['name']))
 assert len(entries)==206 and len(scenes)==97,(len(entries),len(scenes))
 (out/'catalog.json').write_text(json.dumps({'entries':entries,'scenes':scenes},separators=(',',':')))
 (out/'import-report.json').write_text(json.dumps({'archiveSha256':hashlib.sha256(Path(archive).read_bytes()).hexdigest(),'bundles':report},indent=2))
 (R/'src/emote-data.js').write_text("(function(r){const data="+json.dumps(entries,separators=(',',':'))+";if(typeof module==='object'&&module.exports)module.exports=data;else r.RoyaleEmoteData=data;})(globalThis);\n")
if __name__=='__main__':main(sys.argv[1])
