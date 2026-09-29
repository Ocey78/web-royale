"""Rasterize fixed UI words from the supplied typeface; no font is distributed.
Dynamic names and arbitrary user text continue to use browser system fonts.
"""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
font=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/mnt/data/source-game/font/supercell-magic_0.ttf')
f=ImageFont.truetype(str(font),72)
labels={'text-battle':'Battle','text-shop':'Shop','text-cards':'Cards','text-clan':'Clan','text-events':'Events','text-pass-royale':'Pass Royale','text-victory':'VICTORY!','text-defeat':'DEFEAT','text-draw':'DRAW','text-battle-deck':'Battle Deck','text-card-collection':'Card Collection','text-use':'Use','text-collect':'Collect','text-claim':'Claim','text-ok':'OK','text-upgrade':'Upgrade','text-settings':'Settings','text-profile':'Profile'}
labels.update({'text-party':'Party!', 'text-daily-deals':'Daily Deals','text-daily-gift':'Daily Gift','text-treasure-chests':'Treasure Chests','text-find-clan':'Find your clan','text-better-together':'Better together','text-choose-challenge':'Choose your challenge','text-classic-challenge':'Classic Challenge','text-double-elixir':'Double Elixir','text-triple-elixir':'Triple Elixir','text-ramp-up':'Ramp Up','text-sudden-death':'Sudden Death','text-infinite-elixir':'Infinite Elixir','text-free':'Free','text-join-clan':'Join Clan','text-create-clan':'Create a Clan','text-collected':'Collected'})
p=ROOT/'assets/ui/manifest.json';m=json.loads(p.read_text())
for key,text in labels.items():
 box=f.getbbox(text,stroke_width=4);w=box[2]-box[0]+16;h=box[3]-box[1]+23
 im=Image.new('RGBA',(w,h));d=ImageDraw.Draw(im);xy=(8-box[0],6-box[1]);d.text((xy[0],xy[1]+6),text,font=f,fill='#091a30',stroke_width=4,stroke_fill='#091a30');d.text(xy,text,font=f,fill='white',stroke_width=3,stroke_fill='#14233a')
 name='assets/ui/'+key+'.png';im.save(ROOT/name,optimize=True);m[key]={'file':name,'source':'Fixed text rendered using supplied supercell-magic_0.ttf; no font bytes bundled','text':text,'width':w,'height':h}
p.write_text(json.dumps(m,separators=(',',':')))
print('Rendered',len(labels),'fixed UI word images. No font files copied.')
