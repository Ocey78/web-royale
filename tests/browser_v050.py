"""Exercise the packaged browser build, using set_content because managed navigation is blocked.
The production static website bytes are served by request fixtures; no mock art.
This verifies rendering/input, not actual hosted browser navigation.
"""
import re,json,time,unittest,os
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];OUT=R/'docs/qa/v050/browser';OUT.mkdir(parents=True,exist_ok=True)
class BrowserTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
  cls.page=cls.browser.new_page(viewport={'width':1440,'height':960},has_touch=True);cls.errors=[];cls.requests=[];cls.missing=[];cls.fail_scene=None;cls.bytes=0
  cls.page.on('pageerror',lambda e:cls.errors.append(str(e)));cls.page.set_default_timeout(20000)
  from urllib.parse import urlparse,unquote
  import mimetypes
  def serve(route):
   url=route.request.url;cls.requests.append(url)
   if not url.startswith('https://webroyale.test/'):
    cls.missing.append(url);route.abort();return
   name=unquote(urlparse(url).path).lstrip('/') or 'index.html';f=R/'dist'/name
   if cls.fail_scene and cls.fail_scene in name:route.fulfill(status=503,body='Intentional failure fixture',headers={'Access-Control-Allow-Origin':'*'});return
   if not f.exists():cls.missing.append(url);route.fulfill(status=404,body='Not found',headers={'Access-Control-Allow-Origin':'*'});return
   content=f.read_bytes();cls.bytes+=len(content);route.fulfill(status=200,body=content,content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream',headers={'Access-Control-Allow-Origin':'*'})
  cls.page.route('**/*',serve)
  # Browser navigation is managed/blocked. Test the exact distributed HTML,
  # CSS, JS, JSON and image bytes in a set_content fixture instead. Only the
  # base URL and opaque-origin storage are supplied by this harness.
  cls.page.evaluate("window.__saveMemory={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>window.__saveMemory[k]||null,setItem:(k,v)=>window.__saveMemory[k]=String(v),removeItem:k=>delete window.__saveMemory[k]}})")
  html=(R/'dist/index.html').read_text().replace('<head>','<head><base href="https://webroyale.test/">')
  cls.page.set_content(html,wait_until='load',timeout=90000)
  cls.page.wait_for_function('window.RoyaleDemo && document.getElementById("loading").classList.contains("hidden")',timeout=90000)
  cls.startup={'requests':len(cls.requests),'bytes':cls.bytes,'nativeTextures':cls.page.evaluate('RoyaleDemo.native.loadedTextures')}
  print('Startup:',cls.startup,flush=True)
 @classmethod
 def tearDownClass(cls):
  (OUT/'startup.json').write_text(json.dumps(cls.startup,indent=2));(OUT/'missing.json').write_text(json.dumps(cls.missing,indent=2));(OUT/'console-errors.json').write_text(json.dumps(cls.errors,indent=2));(OUT/'requests.json').write_text(json.dumps(cls.requests,indent=2));cls.browser.close();cls.p.stop()
 def setUp(self):
  self.page.evaluate("RoyaleDemo.show('home');RoyaleDemo.native.retainScenes([])")
 def test_00_native_menu_background(self):
  state=self.page.evaluate("({computed:getComputedStyle(document.getElementById('home')).backgroundImage,variable:getComputedStyle(document.getElementById('viewport')).getPropertyValue('--ui-background').length,source:RoyaleBundle.uiImages.background.length})")
  self.assertNotEqual(state['computed'],'none',str(state))
 def test_01_home(self):
  self.page.screenshot(path=str(OUT/'home.png'));self.assertTrue(self.page.locator('#home.active').is_visible());self.assertEqual(self.page.locator('#home .nav-btn').count(),5);self.assertEqual(self.page.locator('#homeArenaImage').evaluate('(x)=>x.naturalWidth>0'),True)
 def test_02_catalog(self):
  self.page.click('#home [data-action="nav-cards"]');self.assertEqual(self.page.locator('#collectionGrid .card-tile').count(),102);self.assertEqual(self.page.locator('#deckGrid .card-tile').count(),8);self.page.screenshot(path=str(OUT/'cards.png'))
 def test_03_search(self):
  self.page.evaluate("RoyaleDemo.show('cards')");self.page.fill('#cardSearch','Electro');self.assertEqual(self.page.locator('#collectionGrid .card-tile').count(),4);self.page.fill('#cardSearch','');self.assertEqual(self.page.locator('#collectionGrid .card-tile').count(),102)
 def test_04_deck_edit(self):
  self.page.evaluate("RoyaleDemo.show('cards')");self.page.click('#collectionGrid [data-id="pekka"]');self.page.click('[data-action="use-card"]');self.page.click('#modalPanel [data-action="replace-card"][data-slot="0"]');self.assertEqual(self.page.evaluate('RoyaleDemo.profile.decks[RoyaleDemo.profile.activeDeck][0]'),'pekka');self.assertEqual(self.page.evaluate('new Set(RoyaleDemo.profile.decks[RoyaleDemo.profile.activeDeck]).size'),8)
 def test_05_card_stats(self):
  self.page.evaluate("RoyaleDemo.details('knight',1)");self.assertIn('651',self.page.locator('#modalPanel').inner_text());self.assertIn('1 tiles/sec',self.page.locator('#modalPanel').inner_text());self.page.screenshot(path=str(OUT/'card-details.png'))
 def test_06_all_details(self):
  self.page.evaluate("for(const c of RoyaleCore.CARDS){RoyaleDemo.details(c.id);if(!document.querySelector('#modalPanel .card-hero img').src)throw Error(c.id)}")
 def test_07_shop(self):
  self.page.evaluate("RoyaleDemo.show('shop')");self.assertEqual(self.page.locator('[data-action="buy-card"]').count(),6);self.page.screenshot(path=str(OUT/'shop.png'));before=self.page.evaluate('RoyaleDemo.profile.gold');self.page.click('[data-action="daily-gift"]');self.assertEqual(self.page.evaluate('RoyaleDemo.profile.gold'),before+250);self.page.click('[data-action="close"]');self.assertTrue(self.page.locator('[data-action="daily-gift"]').is_disabled())
 def test_08_clan(self):
  self.page.evaluate("RoyaleDemo.show('clan')");self.page.click('[data-action="join-clan"]');self.page.fill('#chatInput','Ready for a friendly battle');self.page.locator('#chatForm button').click();self.assertIn('Ready for a friendly battle',self.page.locator('#clanContent').inner_text());self.page.screenshot(path=str(OUT/'clan.png'))
 def test_09_clan_donation(self):
  self.page.evaluate("RoyaleDemo.show('clan')");before=self.page.evaluate('RoyaleDemo.profile.clan.donations');self.page.click('[data-action="donate"]');self.assertEqual(self.page.evaluate('RoyaleDemo.profile.clan.donations'),before+1)
 def test_10_events(self):
  self.page.evaluate("RoyaleDemo.show('events')");self.assertEqual(self.page.locator('#eventsContent [data-action="mode"]').count(),6);self.page.screenshot(path=str(OUT/'events.png'));self.page.click('[data-mode="DoubleElixir"]');self.page.wait_for_function("RoyaleDemo.battle?.mode==='DoubleElixir'&&!RoyaleDemo.preparing");self.assertEqual(self.page.evaluate('RoyaleDemo.battle.mode'),'DoubleElixir');self.assertEqual(self.page.evaluate('RoyaleDemo.battle.multiplier'),2)
 def test_11_battle_and_input(self):
  self.page.evaluate('RoyaleDemo.startBattle()');self.page.keyboard.press('2');before=self.page.evaluate('RoyaleDemo.battle.units.length');r=self.page.locator('#viewport').bounding_box();self.page.mouse.click(r['x']+150*r['width']/540,r['y']+545*r['height']/960);self.page.wait_for_timeout(1200);self.assertGreater(self.page.evaluate('RoyaleDemo.battle.units.length'),before);self.page.screenshot(path=str(OUT/'battle.png'));self.assertFalse(self.errors)
 def test_12_pause(self):
  self.page.evaluate('RoyaleDemo.startBattle()');self.page.keyboard.press('p');t=self.page.evaluate('RoyaleDemo.battle.time');self.page.wait_for_timeout(300);self.assertEqual(self.page.evaluate('RoyaleDemo.battle.time'),t);self.page.keyboard.press('p');self.assertFalse(self.page.evaluate('RoyaleDemo.battle.paused'))
 def test_13_results(self):
  self.page.evaluate("async()=>{await RoyaleDemo.startBattle();const b=RoyaleDemo.battle;b.towers.find(t=>t.king&&t.team===1).hp=0;RoyaleDemo.step(.1)}");self.assertIn('VICTORY',self.page.locator('#modalPanel').inner_text());self.assertEqual(self.page.evaluate('RoyaleDemo.profile.wins'),1);self.page.screenshot(path=str(OUT/'result.png'))
 def test_14_viewports(self):
  for w,h in [(1920,1080),(3440,1440),(390,844),(768,1024),(540,960),(280,300)]:
   self.page.set_viewport_size({'width':w,'height':h});self.page.wait_for_timeout(80);r=self.page.locator('#viewport').bounding_box();self.assertAlmostEqual(r['width']/r['height'],9/16,places=5);self.assertLessEqual(r['height'],h+.1);self.assertAlmostEqual(r['x'],(w-r['width'])/2,places=3)
  self.page.set_viewport_size({'width':1440,'height':960})
 def test_15_assets_are_web_local_and_battle_scenes_are_lazy(self):
  self.assertEqual(self.startup['nativeTextures'],0);self.assertLess(self.startup['requests'],70);self.assertLess(self.startup['bytes'],10*1024*1024);self.assertFalse(self.missing)
  self.assertTrue(all(x.startswith('https://webroyale.test/') for x in self.requests))
 def test_16_all_units_render(self):
  groups=self.page.evaluate("""()=>{const groups={};for(const [id,cfg]of Object.entries(RoyaleDemo.native.data.units)){if(RoyaleCore.DATA.entities[id])(groups[cfg.scene]??=[]).push(id);}window.renderProbe=new RoyaleNative.Library(RoyaleBundle.native,RoyaleBundle.images);return groups;}""")
  total=0
  for scene,ids in groups.items():
   self.page.evaluate("async scene=>{renderProbe.retainScenes([]);await renderProbe.ensureScenes([scene]);}",scene)
   count=self.page.evaluate("""ids=>{const lib=renderProbe,cv=document.createElement('canvas');cv.width=320;cv.height=360;const c=cv.getContext('2d',{willReadFrequently:true});let n=0;for(const id of ids)for(const team of [0,1])for(const state of ['idle','run','attack']){c.clearRect(0,0,320,360);if(!lib.unit(c,id,160,280,team,.3,state,-Math.PI/2,0,1))throw Error(id+':'+state);const px=c.getImageData(0,0,320,360).data;if(!px.some((v,i)=>i%4===3&&v>0))throw Error('Empty '+id+':'+state);n++;}return n;}""",ids)
   total+=count
   print('Render samples:',scene,count,flush=True)
  self.page.evaluate('renderProbe.retainScenes([]);window.renderProbe=null');self.assertGreater(total,500);print('Original state samples drawn:',total,flush=True)
 def test_17_profile_safety(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,name:'<img src=x onerror=alert(1)>',cardLevels:{knight:Infinity}})");self.assertEqual(self.page.locator('#home [data-name] img').count(),0);self.assertLessEqual(self.page.evaluate('RoyaleDemo.profile.cardLevels.knight'),13)
 def test_18_no_console_errors(self):self.assertEqual(self.errors,[])
 def test_19_card_upgrade_and_saved_levels(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,name:'Nano',gold:100000,copies:{...RoyaleDemo.profile.copies,knight:5000},cardLevels:{...RoyaleDemo.profile.cardLevels,knight:9}});RoyaleDemo.details('knight')")
  before=self.page.evaluate("RoyaleCore.upgradeQuote(RoyaleDemo.profile,'knight')")
  self.page.click('[data-action="upgrade"]')
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.cardLevels.knight'),10)
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.gold'),100000-before['gold'])
  saved=self.page.evaluate("JSON.parse(localStorage.getItem('web-royale-classic-v4')).cardLevels.knight")
  self.assertEqual(saved,10)
 def test_20_pass_claim_once(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,earnedCrowns:10,passClaimed:[]})")
  self.page.click('#home [data-action="pass"]');self.assertEqual(self.page.locator('.pass-row').count(),35)
  self.page.click('[data-action="claim-pass"][data-index="0"]');self.assertEqual(self.page.evaluate('RoyaleDemo.profile.passClaimed'),[0]);self.page.screenshot(path=str(OUT/'pass-reward.png'))
  self.page.click('[data-action="close"]');self.page.click('#home [data-action="pass"]');self.assertTrue(self.page.locator('[data-action="claim-pass"][data-index="0"]').is_disabled())
 def test_21_chest_unlock_and_collect(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,chests:[{id:'browser-chest',kind:'silver',unlockAt:0}]});RoyaleDemo.show('home')")
  self.page.click('[data-action="chest"]');self.page.click('[data-action="unlock-chest"]');self.assertGreater(self.page.evaluate('RoyaleDemo.profile.chests[0].unlockAt'),0)
  self.page.click('[data-action="chest"]');self.assertIn('seconds remaining',self.page.locator('#modalPanel').inner_text());self.page.click('[data-action="close"]');self.page.wait_for_timeout(5100)
  self.page.click('[data-action="chest"]');self.assertEqual(self.page.evaluate('RoyaleDemo.profile.chests.length'),0);self.assertIn('Gold',self.page.locator('#modalPanel').inner_text());self.page.screenshot(path=str(OUT/'chest.png'))
 def test_22_sudden_death_ui(self):
  self.page.evaluate("async()=>{await RoyaleDemo.startBattle('SuddenDeath');const b=RoyaleDemo.battle;b.towers.find(t=>!t.king&&t.team===1).hp=0;RoyaleDemo.step(.1)}")
  self.assertIn('VICTORY',self.page.locator('#modalPanel').inner_text());self.assertLess(self.page.evaluate('RoyaleDemo.battle.time'),1)
 def test_23_touch_and_drag_deployment(self):
  self.page.evaluate("async()=>{RoyaleDemo.applyProfile({...RoyaleDemo.profile,decks:RoyaleCore.PRESETS,activeDeck:0});await RoyaleDemo.startBattle();RoyaleDemo.battle.ai=false;RoyaleDemo.battle.elixir[0]=10;RoyaleDemo.refreshHand(true)}")
  r=self.page.locator('#viewport').bounding_box();s=r['width']/540;x=r['x'];y=r['y'];self.page.touchscreen.tap(x+130*s,y+850*s);self.page.touchscreen.tap(x+170*s,y+550*s)
  self.assertGreater(self.page.evaluate('RoyaleDemo.battle.played[0]'),0)
  self.page.wait_for_timeout(1100);self.page.evaluate('RoyaleDemo.battle.elixir[0]=10;RoyaleDemo.refreshHand(true)')
  before=self.page.evaluate('RoyaleDemo.battle.played[0]');self.page.mouse.move(x+244*s,y+850*s);self.page.mouse.down();self.page.mouse.move(x+290*s,y+540*s,steps=15);self.page.mouse.up();self.assertGreater(self.page.evaluate('RoyaleDemo.battle.played[0]'),before)
 def test_24_original_background_and_buttons_really_decoded(self):
  self.page.wait_for_function("document.querySelector('#battleButton .native-word').naturalWidth>0")
  for k in ['background','battle-button','pass-banner','button-blue','text-battle']:
   ready=self.page.evaluate("async key=>{const im=new Image();im.src=RoyaleBundle.uiImages[key];await im.decode();return im.naturalWidth>0}",k);self.assertTrue(ready)
 def test_25_active_roster_battle_preview(self):
  self.page.evaluate("""async()=>{RoyaleDemo.applyProfile({...RoyaleDemo.profile,name:'Nano',equalLevels:true,decks:RoyaleCore.PRESETS,activeDeck:3});await RoyaleDemo.startBattle();await RoyaleDemo.native.ensureScenes(['Pekka','Assassin','ElectroWizard','Ram','Giant','Musketeer','BabyDragon','Skeleton'].map(id=>RoyaleDemo.native.data.units[id].scene));const b=RoyaleDemo.battle;b.ai=false;b.elixir=[10,10];for(const [entity,team,x,y]of [['Pekka',0,125,380],['Assassin',0,345,390],['ElectroWizard',0,140,430],['Ram',0,320,460],['Giant',1,125,275],['Musketeer',1,150,220],['BabyDragon',1,335,265],['Skeleton',1,315,340]]){if(RoyaleCore.DATA.entities[entity])b.spawn(entity,team,x,y,{wait:0,level:9});}RoyaleDemo.step(1.4);b.paused=true;RoyaleDemo.refreshHand(true);} """)
  self.page.wait_for_timeout(100);self.page.screenshot(path=str(OUT/'battle-preview.png'))
  self.assertFalse(self.errors)
 def test_26_round_trip_save_json(self):
  self.assertTrue(self.page.evaluate("JSON.stringify(RoyaleCore.normalizeProfile(JSON.parse(localStorage.getItem('web-royale-classic-v4'))))===JSON.stringify(RoyaleDemo.profile)"))
  self.assertFalse(self.missing)
 def test_27_spell_payload_stats_and_mirror_cost(self):
  for card in ['the-log','barbarian-barrel','royal-delivery']:
   self.page.evaluate("id=>RoyaleDemo.details(id,9)",card)
   expected=self.page.evaluate("id=>RoyaleCore.cardAt(id,9).damage",card)
   self.assertGreater(expected,0);self.assertIn(str(expected),self.page.locator('#modalPanel .stats-grid').inner_text())
  self.page.evaluate("RoyaleDemo.details('mirror',9)");self.assertIn('Last card +1',self.page.locator('#modalPanel .stats-grid').inner_text())
  self.page.evaluate("RoyaleDemo.details('goblin-barrel',9)");self.assertIn('Spawned troop HP',self.page.locator('#modalPanel').inner_text())
 def test_28_mirror_opening_rule_and_final_errors(self):
  self.page.evaluate("async()=>{RoyaleDemo.applyProfile({...RoyaleDemo.profile,decks:[['mirror','knight','archers','giant','mini-pekka','musketeer','fireball','arrows']],activeDeck:0});await RoyaleDemo.startBattle()}")
  self.assertNotIn('mirror',self.page.evaluate('RoyaleDemo.battle.hand[0]'))
  self.assertEqual(self.errors,[]);self.assertEqual(self.missing,[])

 def test_29_original_hand_frames_and_blue_board(self):
  self.page.evaluate('RoyaleDemo.startBattle()');self.page.wait_for_function("[...document.querySelectorAll('#hand .card-frame')].every(i=>i.complete&&i.naturalWidth>0)")
  self.assertEqual(self.page.locator('#hand .card-frame').count(),4)
  self.assertIn('battle-panel-blue',self.page.evaluate("getComputedStyle(document.querySelector('.hand-panel'),'::before').backgroundImage"))
  self.assertFalse(self.page.locator('#instruction').is_visible());self.assertFalse(self.page.locator('#multiplier').is_visible())
  self.page.screenshot(path=str(OUT/'battle-hud.png'))
 def test_30_drag_back_to_hand_cancels_without_spending(self):
  self.page.evaluate('RoyaleDemo.startBattle()');self.page.evaluate('RoyaleDemo.battle.ai=false')
  r=self.page.locator('#viewport').bounding_box();s=r['width']/540;x,y=r['x'],r['y'];before=self.page.evaluate('RoyaleDemo.battle.played[0]')
  self.page.mouse.move(x+140*s,y+850*s);self.page.mouse.down();self.page.mouse.move(x+210*s,y+570*s,steps=8);self.page.mouse.move(x+150*s,y+865*s,steps=8);self.page.mouse.up()
  self.assertIsNone(self.page.evaluate('RoyaleDemo.selected'));self.assertEqual(self.page.evaluate('RoyaleDemo.battle.played[0]'),before)
 def test_31_pointer_cancel_clears_selection(self):
  self.page.evaluate('RoyaleDemo.startBattle()');self.page.keyboard.press('1');self.page.dispatch_event('#viewport','pointercancel',{'pointerId':44});self.assertIsNone(self.page.evaluate('RoyaleDemo.selected'))
 def test_32_quick_chat_is_a_local_visual_not_a_card_command(self):
  self.page.evaluate('RoyaleDemo.startBattle()');before=self.page.evaluate('RoyaleDemo.battle.played[0]');self.page.click('[data-action="quick-chat"]');self.page.click('[data-action="chat-phrase"][data-index="1"]')
  self.assertEqual(self.page.locator('#chatBubble').inner_text(),'Well played!');self.assertFalse(self.page.locator('#quickChat').is_visible());self.assertEqual(self.page.evaluate('RoyaleDemo.battle.played[0]'),before)
 def test_33_balloon_uses_actual_attack_in_both_directions(self):
  self.page.evaluate("RoyaleDemo.native.ensureScenes([RoyaleDemo.native.data.units.Balloon.scene])")
  result=self.page.evaluate("""()=>{const n=RoyaleDemo.native,cfg=n.data.units.Balloon,s=n.scenes[cfg.scene];const names=[];for(const team of [0,1])for(let i=1;i<=9;i++)names.push(RoyaleNative.resolveAnimation(cfg,s,team,'attack',i));return names;}""")
  self.assertEqual(len(result),18);self.assertTrue(all('attack' in n for n in result))
 def test_34_visual_attack_frames_change_and_freeze_stops_them(self):
  self.page.evaluate("RoyaleDemo.native.ensureScenes([RoyaleDemo.native.data.units.Knight.scene])")
  data=self.page.evaluate("""()=>{const lib=RoyaleDemo.native,cv=document.createElement('canvas');cv.width=280;cv.height=300;const c=cv.getContext('2d'),render=t=>{c.clearRect(0,0,280,300);if(!lib.unit(c,'Knight',140,230,0,100,'attack',0,0,1,{elapsed:t,attackDuration:1.2,idleTime:0}))throw Error('Knight not loaded');const px=c.getImageData(0,0,280,300).data;if(!px.some((v,i)=>i%4===3&&v))throw Error('Empty Knight frame');let hash=0;for(const v of px)hash=((hash*31)^v)>>>0;return hash;};return [render(.12),render(.55),render(.55)];}""")
  self.assertNotEqual(data[0],data[1]);self.assertEqual(data[1],data[2])
 def test_35_all_arenas_prepare_and_render_without_missing_scenes(self):
  self.page.evaluate('RoyaleDemo.startBattle()')
  for arena in ['training','bone','barbarian','royal','goblin']:
   self.page.evaluate("async id=>{RoyaleDemo.native.setArena(id);await RoyaleDemo.native.prepareBattle(RoyaleDemo.battle,RoyaleCore.DATA);const c=document.createElement('canvas');c.width=540;c.height=700;const ctx=c.getContext('2d');if(!RoyaleDemo.native.drawArena(ctx,1))throw Error(id);if(!ctx.getImageData(0,0,540,700).data.some((x,i)=>i%4===3&&x>0))throw Error('Empty '+id)}",arena)
  self.assertFalse(self.errors)
 def test_36_failed_scene_request_is_retryable(self):
  type(self).fail_scene='chr_balloon.json'
  result=self.page.evaluate("async()=>{window.retryLibrary=new RoyaleNative.Library(RoyaleBundle.native,RoyaleBundle.images);try{await retryLibrary.ensureScenes(['chr_balloon']);return 'unexpected success'}catch(e){return e.message}}")
  self.assertIn('503',result);type(self).fail_scene=None
  self.assertTrue(self.page.evaluate("async()=>{await retryLibrary.ensureScenes(['chr_balloon']);return !!retryLibrary.scenes.chr_balloon}"))
 def test_37_settings_explains_local_guest_without_fake_login(self):
  self.page.click('#home [data-action="menu"]');self.page.click('[data-action="settings"]');text=self.page.locator('#modalPanel').inner_text()
  self.assertIn('Local guest save',text);self.assertIn('Accounts and online battles are not connected',text)
 def test_38_collection_and_menu_content_stays_inside_portrait(self):
  self.page.evaluate("RoyaleDemo.show('cards')");self.page.wait_for_function("[...document.querySelectorAll('#deckGrid img')].every(x=>x.complete&&x.naturalWidth>0)")
  self.page.screenshot(path=str(OUT/'cards-framed.png'));v=self.page.locator('#viewport').bounding_box()
  for sel in ['#deckTabs','#deckGrid','.collection-tools']:
   r=self.page.locator(sel).bounding_box();self.assertGreaterEqual(r['x'],v['x']-.5);self.assertLessEqual(r['x']+r['width'],v['x']+v['width']+.5)
 def test_39_recording_scenario_preview(self):
  self.page.evaluate("""async()=>{RoyaleDemo.applyProfile({...RoyaleDemo.profile,name:'Nano',equalLevels:true,decks:[['balloon','inferno-dragon','dark-prince','lumberjack','skeleton-army','freeze','sparky','arrows']],activeDeck:0});await RoyaleDemo.startBattle();await RoyaleDemo.native.ensureScenes([RoyaleDemo.native.data.units.Giant.scene]);const b=RoyaleDemo.battle;b.ai=false;RoyaleDemo.step(3.5);b.elixir=[6,6];for(const [id,team,x,y]of [['Balloon',0,365,240],['InfernoDragon',0,120,380],['RageBarbarian',0,325,390],['DarkPrince',1,325,360],['Giant',1,120,342],['Skeleton',1,100,330],['Skeleton',1,145,328]])b.spawn(id,team,x,y,{wait:0,level:9});RoyaleDemo.step(2.3);b.paused=true;RoyaleDemo.refreshHand(true);} """)
  self.page.wait_for_timeout(3000);self.page.screenshot(path=str(OUT/'video-fixes-preview.png'));self.assertFalse(self.errors)
 def test_40_final_source_requests_and_errors(self):
  self.assertEqual(self.errors,[]);self.assertEqual(self.missing,[])
if __name__=='__main__':unittest.main(verbosity=2)
