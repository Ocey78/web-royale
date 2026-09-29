"""Extract original UI clips and rasterized text artwork from a user-supplied client.
Source font binaries remain outside the release; only rendered PNG artwork and
metrics are written. No network download or replacement illustration is used.
"""
from pathlib import Path
import json,sys,hashlib,copy
from PIL import Image,ImageDraw,ImageFont
from fontTools.ttLib import TTFont
from sc_codec import parse,unpack,textures
from import_catalog import read_table
from extract_game_assets import trim
ROOT=Path(__file__).resolve().parents[1]
SRC=Path(sys.argv[1]);OUT=ROOT/'assets/presentation';OUT.mkdir(exist_ok=True)

def compact(scene):
 used_m=sorted({x[1] for c in scene['clips'].values() for f in c['frames'] for x in f if x[1]!=65535})
 used_c=sorted({x[2] for c in scene['clips'].values() for f in c['frames'] for x in f if x[2]!=65535})
 mm={n:i for i,n in enumerate(used_m)};cc={n:i for i,n in enumerate(used_c)}
 for c in scene['clips'].values():
  for f in c['frames']:
   for x in f:
    if x[1]!=65535:x[1]=mm[x[1]]
    if x[2]!=65535:x[2]=cc[x[2]]
 scene['matrices']=[scene['matrices'][n] for n in used_m];scene['colors']=[scene['colors'][n] for n in used_c]
 return scene

def extract(name,keep):
 p=SRC/'sc'/f'{name}.sc';d=parse(unpack(p.read_bytes()),pixels=True)
 d=trim(d,{k for k in d['exports'] if keep(k)});d=compact(d)
 ts=d['textures'];tp=p
 if 26 in d['flags']:
  opts=[SRC/'sc'/f'{name}{suffix}.sc' for suffix in ['_highres_tex','_tex','_lowres_tex']]
  tp=next(x for x in opts if x.exists());ts=textures(unpack(tp.read_bytes()))
 used=sorted({ch['texture'] for shapes in d['shapes'].values() for ch in shapes});remap={n:i for i,n in enumerate(used)}
 for shapes in d['shapes'].values():
  for ch in shapes:ch['texture']=remap[ch['texture']]
 tx=[]
 for i,n in enumerate(used):
  t=ts[n];file=f'{name}-original-{n}.webp';Image.fromarray(t.pop('pixels')).save(OUT/file,'WEBP',lossless=True,method=4);t['file']='assets/presentation/'+file;tx.append(t)
 d['textures']=tx;d['source']={'file':f'sc/{name}.sc','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'textureFile':str(tp.relative_to(SRC))}
 return d
hud=extract('ui',lambda k:k.startswith(('hp_player','hp_enemy','hp_shield','troopDeployTimer')) or k in ['Clock_middle','Clock_small','icon_crowns','HUD_topRight','HUD_topLeft','icon_elixir','elixir_bar'])
# Filter exports contain original color and transform timelines. The character
# instance is supplied by the browser, not a redrawn replacement sprite.
filters=extract('effects',lambda k:k.startswith('filter_') or k in ['lores_blob_shadow','shadow','freeze_effect_ground','freeze_effect_ground_red'])
# Exported text texture sheets: baseline positioned white silhouettes, not TTF/WOFF.
fonts={}
for family,filename in [('title','supercell-magic_0.ttf'),('body','sc_ccbackbeatregular.ttf')]:
 path=SRC/'font'/filename;f=ImageFont.truetype(str(path),64)
 with TTFont(path) as tf: charset={x for x in tf.getBestCmap() if 32<=x<=0x4ff or x in [0x2018,0x2019,0x201c,0x201d,0x2026,0x2013,0x2014,0x20ac]}
 W=2048;x=y=0;rowh=0;glyphs={};tiles=[]
 for cp in sorted(charset):
  ch=chr(cp);box=f.getbbox(ch,anchor='ls',stroke_width=3);l,t,r,b=box;w=max(1,r-l);h=max(1,b-t)
  if x+w+2>W:x=0;y+=rowh+2;rowh=0
  fill=Image.new('RGBA',(w,h));ImageDraw.Draw(fill).text((-l,-t),ch,font=f,anchor='ls',fill='white')
  stroke=Image.new('RGBA',(w,h));ImageDraw.Draw(stroke).text((-l,-t),ch,font=f,anchor='ls',fill='white',stroke_width=3,stroke_fill='white')
  glyphs[ch]={'x':x,'y':y,'w':w,'h':h,'left':l,'top':t,'advance':round(f.getlength(ch),4)};tiles.append((x,y,fill,stroke));x+=w+2;rowh=max(rowh,h)
 H=y+rowh+1;sheet=Image.new('RGBA',(W,H));st=Image.new('RGBA',(W,H))
 for x,y,a,b in tiles:sheet.paste(a,(x,y));st.paste(b,(x,y))
 file=f'ink-{family}.png';outline=f'ink-{family}-outline.png';sheet.save(OUT/file,optimize=True);st.save(OUT/outline,optimize=True)
 asc,desc=f.getmetrics();pairs={}
 for a in (chr(i) for i in range(32,127)):
  for b in (chr(i) for i in range(32,127)):
   v=f.getlength(a+b)-f.getlength(a)-f.getlength(b)
   if abs(v)>.02:pairs[a+b]=round(v,4)
 fonts[family]={'size':64,'ascent':asc,'descent':desc,'name':f.getname()[0],'glyphs':glyphs,'pairs':pairs,'fill':'assets/presentation/'+file,'stroke':'assets/presentation/'+outline,'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest()}
 print(family,len(glyphs),'glyph images',H,flush=True)
# Records decoded by the earlier importer, used to choose exact native bar style.
bars=json.loads((SRC/'health-bars.json').read_text())
meta={'version':1,'hud':hud,'filters':filters,'text':fonts,'healthBars':bars,'experienceLevels':read_table(SRC/'csv_logic/exp_levels.csv')[0]}
(OUT/'data.json').write_text(json.dumps(meta,separators=(',',':')))
print('hud exports',len(hud['exports']),'filters',len(filters['exports']), 'complete',flush=True)
