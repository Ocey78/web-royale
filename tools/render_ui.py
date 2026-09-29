"""Rasterize selected original SC menu symbols with the same browser renderer.
No fonts are copied. Native text fields are replaced with live, accessible UI labels.
"""
from pathlib import Path
import sys,json,base64,threading,http.server,functools
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/ui';OUT.mkdir(exist_ok=True)
choices={
'background':('ui','UI_menu_background'),'menutop':('ui','Menu_topLayer'),
'nav-bg':('ui','menu_bottom_tab_bg'),'nav-selected':('ui','menu_bottom_tab_selected'),'nav-highlight':('ui','menu_bottom_tab_highlight'),
'shop':('ui','icon_menu_shop'),'cards':('ui','icon_menu_cards'),'battle':('ui','icon_menu_battle'),'clan':('ui','icon_menu_clan'),'events':('ui','icon_menu_tornament'),
'gold':('ui','icon_gold'),'gems':('ui','icon_gems'),'training':('ui','icon_btn_training'),'challenge':('ui','icon_btn_challenge'),'royaltv':('ui','icon_menu_royaltv'),
'silver-chest':('ui','icon_chests_silver_small'),'gold-chest':('ui','icon_chests_gold_small'),'magic-chest':('ui','icon_chests_magical_small'),
'chest-slot':('ui','chest_queue_item'),'deck-header':('ui','panel_header_battle_deck'),'upgrade':('ui','card_button_upgrade'),'share':('ui','button_share_deck'),
'common':('ui','icon_btn_card_common'),'rare':('ui','icon_btn_card_rare'),'epic':('ui','icon_btn_card_epic'),'legendary':('ui','icon_btn_card_legendary'),
'clan-badge':('ui','clan_badge_01_01'),'shop-item':('ui','item_shop_resource'),
'pass-banner':('ui_battle_pass','main_screen_passroyale'),'pass-gold':('ui_battle_pass','tier_icon_gold'),'pass-silver':('ui_battle_pass','tier_icon_silver'),'pass-crowns':('ui_battle_pass','icon_crowns'),
'pass-claim':('ui_battle_pass','button_claim'),'pass-track':('ui_battle_pass','tracks'),'pass-top':('ui_battle_pass','season_top'),
'button-orange':('ui','button_small_orange'),'button-square':('ui','button_small_square_orange'),
'profile-panel':('ui','popup_profile_top_no_tab'),'card-panel':('ui','popup_card_info_new'),
'event-double':('ui','icon_mode_2x_elixir'),'event-triple':('ui','icon_mode_3x_elixir'),'event-war':('ui','icon_mode_cw_battle'),
'win':('ui_battle_end','pve_battle_end_victory'),'loss':('ui_battle_end','pve_battle_end_defeat'),
}
for i in range(10):choices['arena-'+str(i)]=('ui_arena',f'arena_{i:02}')
for i in range(12):choices[f'button-{i}']=('ui','button_timeline',i)
D=json.load(open(ROOT/'assets/ui-source/ui.json'))
for term in ['settings','trophy','elixir','button_close','button_battle','battle_button','popup_bg','button_yellow','menu_arena','menu_bg','banner']:
 print(term, [s for s in D['exports'] if term.lower() in s.lower()][:30],flush=True)
# Add exact source icons when available, without guessing a replacement picture.
for k,options in {'settings':['icon_settings','icon_menu_settings','icon_btn_settings'],'trophy':['UI_icon_trophy','icon_trophies','icon_trophy','trophy_icon','icon_trophy_3d'],'elixir':['icon_elixir','elixir_icon'],'close':['button_close','close_button'],'friends':['icon_friends','icon_btn_friends']}.items():
 x=next((v for v in options if v in D['exports']),None)
 if x:choices[k]=('ui',x)
if '--extra' in sys.argv:
 choices={'battle-button':('ui','6113'),'close':('ui','5247'),'settings':('ui','7048'),'info':('ui','5044'),'button-blue':('ui','5169'),'button-red':('ui','5334'),'menu-arena':('ui','UI_menu_arena'),'hud-hand':('ui','panel_ingame'),'hud-player':('ui','HUD_player'),'hud-enemy':('ui','HUD_topLeft'),'hud-timer':('ui','HUD_topRight'),'deck-panel':('ui','panel_battle_deck'),'collection-panel':('ui','panel_collection2'),'event-sudden':('ui','icon_mode_suddendeath'),'event-ramp':('ui','icon_mode_ramp_up')}
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=srv.serve_forever,daemon=True).start();base='http://127.0.0.1:'+str(srv.server_port)
manifest=json.loads((OUT/'manifest.json').read_text()) if '--extra' in sys.argv else {};errors=[];loaded=set()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page();page.set_content('<!doctype html><html><body></body></html>');page.add_script_tag(path=str(ROOT/'src/native.js'))
 page.evaluate('window.uiScenes={};')
 for key,item in choices.items():
  scene,name,*frame=item
  try:
   if scene not in loaded:
    data=json.loads((ROOT/'assets/ui-source'/(scene+'.json')).read_text())
    imgs=['data:image/webp;base64,'+base64.b64encode((ROOT/'assets/ui-source'/t['file']).read_bytes()).decode() for t in data['textures']]
    page.evaluate('''async ([name,data,urls])=>{const images=await Promise.all(urls.map(url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=url})));window.uiScenes[name]=new RoyaleNative.Scene(data,images);}''',[scene,data,imgs]);loaded.add(scene)
   result=page.evaluate('''async ([base,key,scene,name,frame])=>{
    let s=window.uiScenes[scene];if(!s){const data=await(await fetch(base+'/assets/ui-source/'+scene+'.json')).json();const imgs=await Promise.all(data.textures.map(t=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=base+'/assets/ui-source/'+t.file;})));s=new RoyaleNative.Scene(data,imgs);window.uiScenes[scene]=s;}
    if(s.id(name)===undefined)throw Error('Missing symbol: '+name);const fps=s.clip(name)?.fps||30;const time=(frame||0)/fps;const r=s.bounds(name,time);if(r.width<2||r.height<2)throw Error('Empty source symbol');const scale=Math.min(2,1400/r.width,1500/r.height);const c=document.createElement('canvas');c.width=Math.ceil(r.width*scale)+4;c.height=Math.ceil(r.height*scale)+4;const ctx=c.getContext('2d');ctx.translate(2-r.x*scale,2-r.y*scale);ctx.scale(scale,scale);s.draw(ctx,name,time,{frame:frame||0});return {uri:c.toDataURL('image/png'),bounds:r,frame:frame||0,scale,width:c.width,height:c.height};
   }''',[base,key,scene,name,frame[0] if frame else 0])
   (OUT/(key+'.png')).write_bytes(base64.b64decode(result.pop('uri').split(',')[1]));manifest[key]={'file':'assets/ui/'+key+'.png','source':scene+'.sc#'+name,**result};print(key,result['width'],result['height'],flush=True)
  except Exception as e:errors.append([key,str(e)]);print('SKIP',key,str(e)[:160],flush=True)
 b.close()
srv.shutdown();(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2));(ROOT/'docs/qa/ui-extraction.json').write_text(json.dumps({'count':len(manifest),'skipped':errors},indent=2))
from PIL import Image,ImageDraw
keys=list(manifest);w=1000;h=((len(keys)+4)//5)*155;sheet=Image.new('RGB',(w,h),'#4c5b68');draw=ImageDraw.Draw(sheet)
for i,k in enumerate(keys):
 im=Image.open(OUT/(k+'.png')).convert('RGBA');im.thumbnail((188,124));x=(i%5)*200+(200-im.width)//2;y=(i//5)*155;sheet.paste(im,(x,y),im);draw.text(((i%5)*200+5,y+128),k,fill='white')
sheet.save(ROOT/'docs/qa/ui-contact.png')
