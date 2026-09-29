"""Render original UI symbols and fixed word artwork for the screenshot-led menus.
Usage: python tools/reference-ui-assets.py /path/to/decoded-ui-workspace
The workspace is private: decoded ui/ui_spells/emote SC JSON + WebP textures and
 title.ttf from the supplied APK. No font file or complete reference screenshot
is copied into the game, source package, or generated website.
"""
from pathlib import Path
from PIL import Image,ImageFont,ImageDraw,ImageOps
from playwright.sync_api import sync_playwright
import json,base64,sys,math
R=Path(__file__).resolve().parents[1];P=Path(sys.argv[1]);out=R/'assets/ui';out.mkdir(exist_ok=True)
m=json.loads((out/'manifest.json').read_text());labels={
 'decks':'Decks','collection':'Collection','by-rarity':'By Rarity','by-elixir':'By Elixir','by-name':'By Name','by-level':'By Level','by-type':'By Type',
 'social':'Social','friends':'Friends','online':'Online','leaderboard':'Leaderboard','clan-war':'Clan War','chat':'Chat','add-friends':'Add Friends!','quickplay':'Quickplay',
 'request-cards':'Request Cards','friendly-battle':'Friendly Battle','send':'Send','donate':'Donate','view':'View','watch':'Watch','details':'Details',
 'battle-results':'1v1 Battle Results','emotes':'Emotes','currency':'Currency','gems':'Gems','gold':'Gold','max':'Max','collected-mark':'Collected!',
 'copy':'Copy','search':'Search','filter':'Filter','members':'Members','no-clan':'No Clan','back':'Back','all-cards':'All Cards',
 'common':'Common','rare':'Rare','epic':'Epic','legendary':'Legendary','in-deck':'In Deck','ready':'Ready!','screenshot':'Screenshot',
 'friendly-invite':'Friendly Battle','accept':'Accept','sort':'Sort','owned':'Owned','preview':'Preview',
 'pile-gold':'Pile of Gold','pouch-gold':'Pouch of Gold','wagon-gold':'Wagon of Gold'}
for i in range(1,14): labels['level-'+str(i)]='Level '+str(i)
for i in range(1,6):labels['deck-number-'+str(i)]=str(i)
for i,n in enumerate(['Fistful of Gems','Pouch of Gems','Bucket of Gems','Barrel of Gems','Wagon of Gems','Mountain of Gems']):labels['gem-pack-'+str(i)]=n
D=json.loads((R/'assets/game/data.json').read_text())
for c in D['cards']:labels['name-'+c['id']]=c['name']
f=ImageFont.truetype(str(P/'title.ttf'),72)
for key,text in labels.items():
 color={'common':'#adceff','rare':'#ffdc83','epic':'#f4afff','legendary':'#e9ffe0','currency':'#a15b11'}.get(key,'#ffffff')
 box=f.getbbox(text,stroke_width=4);im=Image.new('RGBA',(box[2]-box[0]+18,box[3]-box[1]+21));d=ImageDraw.Draw(im);xy=(9-box[0],5-box[1])
 d.text((xy[0],xy[1]+5),text,font=f,fill='#101829',stroke_width=4,stroke_fill='#101829');d.text(xy,text,font=f,fill=color,stroke_width=3,stroke_fill='#101829')
 if key=='currency':
  im=Image.new('RGBA',(box[2]-box[0]+18,box[3]-box[1]+21));d=ImageDraw.Draw(im);d.text(xy,text,font=f,fill=color)
 file='assets/ui/ref-'+key+'.png';im.save(R/file,optimize=True);m['ref-'+key]={'file':file,'text':text,'width':im.width,'height':im.height,'source':'Fixed word rasterized from user-supplied typeface. No font bytes distributed.'}
choices={'team-icon':('ui','icon_menu_team'),'ref-tick':('ui','icon_tick'),'ref-swap':('ui','icon_menu_friendly_rules'),'ref-cosmetics-banner':('ui','5781')}
for i in range(1,7):choices['ref-gems-'+str(i)]=('ui_spells','shop_gems0'+str(i))
for i in range(1,4):choices['ref-gold-'+str(i)]=('ui_spells','shop_gold0'+str(i))
for i in range(4):choices['emote-Emote'+str(i)]=('emotes_king_01_dl','icon'+str(i+1))
choices.update({'emote-Emote4':('emotes_goblin_01_dl','icon1'),'emote-Emote20':('emotes_princess_01_dl','icon1'),'emote-Emote38':('emotes_hog_01_dl','icon3')})
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);pg=b.new_page();pg.set_content('<html></html>');pg.add_script_tag(path=str(R/'src/native.js'));pg.evaluate('window.scenes={}')
 for scene in sorted({v[0] for v in choices.values()}):
  data=json.loads((P/(scene+'.json')).read_text());urls=['data:image/webp;base64,'+base64.b64encode((P/t['file']).read_bytes()).decode() for t in data['textures']]
  pg.evaluate('''async ([name,data,urls])=>{const ims=await Promise.all(urls.map(src=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src})));scenes[name]=new RoyaleNative.Scene(data,ims)}''',[scene,data,urls])
 for key,(scene,name)in choices.items():
  data=pg.evaluate('''([scene,name])=>{const s=scenes[scene];if(s.id(name)===undefined)throw Error('Missing '+name);const r=s.bounds(name,0),scale=Math.min(2,1300/r.width,1200/r.height);const cv=document.createElement('canvas');cv.width=Math.ceil(r.width*scale)+4;cv.height=Math.ceil(r.height*scale)+4;const c=cv.getContext('2d');c.translate(2-r.x*scale,2-r.y*scale);c.scale(scale,scale);s.draw(c,name,0,{frame:0});return{uri:cv.toDataURL(),width:cv.width,height:cv.height}}''',[scene,name])
  file='assets/ui/'+key+'.png';(R/file).write_bytes(base64.b64decode(data.pop('uri').split(',')[1]));m[key]={'file':file,'source':scene+'.sc#'+name,**data}
 b.close()
# Tint the original diamond surface, keeping the native highlight/shadow structure.
source=Image.open(R/m['background']['file']).convert('RGBA');grey=ImageOps.grayscale(source)
for key,dark,light in [('ref-shop-bg','#173335','#8ac6c0'),('ref-purple-bg','#1d1148','#885dd0'),('ref-green-bg','#133d2a','#5aaa83'),('ref-deck-bg','#020b28','#254776')]:
 im=ImageOps.colorize(grey,dark,light);im.putalpha(source.getchannel('A'));file='assets/ui/'+key+'.webp';im.save(R/file,'WEBP',lossless=True);m[key]={'file':file,'width':im.width,'height':im.height,'source':'Color variant of user-supplied UI_menu_background. Native diamond lighting retained.'}
# Source shop resource cards use separate corner caps. Extend the original caps.
src=Image.open(P/'5809.png').convert('RGBA')
width,height,cap=350,610,35
w,h=src.size;im=Image.new('RGBA',(width,height))
for sx,dx in [(0,0),(w-cap,width-cap)]:
 im.paste(src.crop((sx,0,sx+cap,cap)),(dx,0));im.paste(src.crop((sx,h-cap,sx+cap,h)),(dx,height-cap))
 a=src.crop((sx,cap-1,sx+cap,cap));b=src.crop((sx,h-cap,sx+cap,h-cap+1))
 for y in range(cap,height-cap):im.paste(Image.blend(a,b,(y-cap+1)/(height-2*cap+1)),(dx,y))
for y in range(height):im.paste(im.getpixel((cap-1,y)),(cap,y,width-cap,y+1))
file='assets/ui/ref-shop-tile.png';im.save(R/file,optimize=True);m['ref-shop-tile']={'file':file,'width':width,'height':height,'source':'ui.sc#5809, original separated shop corner pixels extended to a complete panel.'}
(out/'manifest.json').write_text(json.dumps(m,separators=(',',':')))
print('Reference UI:',len(labels),'fixed labels,',len(choices),'native symbols, 5 derived native surfaces')

