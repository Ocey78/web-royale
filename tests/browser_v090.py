"""Original source HUD/lettering/HD assets and recovered classic menus.
The existing fixture loads exact dist bytes at intercepted same-origin URLs.
It does not certify native-game timing or Windows/ordinary browser navigation.
"""
import unittest,json
import browser_v070 as previous
import browser_v050 as base
base.OUT=base.R/'docs/qa/v090/browser';base.OUT.mkdir(parents=True,exist_ok=True)
class BrowserTests(previous.BrowserTests):
 def test_15_assets_are_web_local_and_battle_scenes_are_lazy(self):
  # The original HUD + two rendered lettering sheets add ~16 MB to menu startup.
  self.assertEqual(self.startup['nativeTextures'],0);self.assertLess(self.startup['requests'],75);self.assertLess(self.startup['bytes'],40*1024*1024);self.assertFalse(self.missing)
  self.assertTrue(all(x.startswith('https://webroyale.test/') for x in self.requests))
 def test_20_pass_claim_once(self):
  # Pass was explicitly removed; verify its replacement rather than the old feature.
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,earnedCrowns:10,crownChestAt:0,crownChestClaimed:0,freeChestAt:0});RoyaleDemo.show('home')")
  self.assertEqual(self.page.locator('[data-action="pass"]').count(),0)
  before=self.page.evaluate('RoyaleDemo.profile.gold');self.page.click('[data-action="crown-chest"]')
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.gold'),before+350)
  self.page.click('[data-action="close"]');self.page.click('[data-action="crown-chest"]');self.assertEqual(self.page.evaluate('RoyaleDemo.profile.gold'),before+350)
  self.page.click('[data-action="close"]');self.page.click('[data-action="free-chest"]');self.assertEqual(self.page.evaluate('RoyaleDemo.profile.gold'),before+400)
 def test_21_chest_unlock_and_collect(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,chests:[{id:'browser-chest',kind:'silver',unlockAt:0}]});RoyaleDemo.show('home')")
  self.page.click('[data-action="chest"]');self.page.click('[data-action="unlock-chest"]')
  remaining=self.page.evaluate('RoyaleDemo.profile.chests[0].unlockAt-Date.now()');self.assertGreater(remaining,10790000)
  # Move the fixture clock to the unlock boundary, not a production timer shortcut.
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,chests:[{id:'browser-chest',kind:'silver',unlockAt:Date.now()-1}]});RoyaleDemo.show('home')")
  self.page.click('[data-action="chest"]');self.assertEqual(self.page.evaluate('RoyaleDemo.profile.chests.length'),0);self.assertIn('Gold',self.page.locator('#modalPanel').inner_text())
 def test_35_all_arenas_prepare_and_render_without_missing_scenes(self):
  self.page.evaluate('RoyaleDemo.startBattle()')
  arenas=self.page.evaluate('RoyaleDemo.native.data.arenas.map(a=>a.id)');self.assertEqual(len(arenas),15)
  for arena in arenas:
   self.page.evaluate("""async id=>{const lib=RoyaleDemo.native;lib.retainScenes([]);lib.setArena(id);await lib.prepareBattle(RoyaleDemo.battle,RoyaleCore.DATA);for(const ot of [false,true]){const cv=document.createElement('canvas');cv.width=540;cv.height=700;const c=cv.getContext('2d');if(!lib.drawArena(c,1,ot))throw Error(id);if(!c.getImageData(0,0,540,700).data.some((x,i)=>i%4===3&&x>0))throw Error('Empty '+id)};}""",arena)
   print('Arena render:',arena,'normal and overtime',flush=True)
  self.assertFalse(self.errors)
 def test_61_home_has_two_clear_primary_actions(self):
  # Deliberate classic home change: a single Battle button, not later Party UI.
  self.assertEqual(self.page.locator('#home [data-action="party"]').count(),0)
  self.assertEqual(self.page.locator('#home [data-action="battle"]').count(),1)
  self.assertTrue(self.page.locator('#home [data-action="free-chest"]').is_visible());self.assertTrue(self.page.locator('#home [data-action="crown-chest"]').is_visible())
 def test_87_original_health_bar_fills_and_numbers_render(self):
  self.page.evaluate('RoyaleDemo.startBattle()')
  samples=self.page.evaluate("""()=>{const b=RoyaleDemo.battle;b.ai=false;b.paused=true;const u=b.spawn('Knight',0,200,210,{wait:0,level:9}),cv=document.createElement('canvas');cv.width=420;cv.height=350;const c=cv.getContext('2d',{willReadFrequently:true});const output=[];for(const team of [0,1])for(const fraction of [1,.8,.2]){u.team=team;u.hp=u.maxHp*fraction;c.clearRect(0,0,420,350);if(!RoyalePresentation.health(c,u,1))throw Error('HUD did not draw');const a=c.getImageData(0,0,420,350).data;let color=0,hash=0;for(let i=0;i<a.length;i+=4){if(a[i+3]>40&&((team===0&&a[i+2]>a[i]+30)||(team===1&&a[i]>a[i+2]+30)))color++;hash=(hash*31+a[i]+a[i+1]+a[i+2]+a[i+3])>>>0;}output.push({team,fraction,color,hash});}return output;}""")
  for t in [0,1]:
   row=[s for s in samples if s['team']==t];self.assertGreater(row[1]['color'],row[2]['color']);self.assertNotEqual(row[1]['hash'],row[2]['hash'])
  self.assertTrue(self.page.evaluate('RoyalePresentation.summary().healthDraws>0'))
 def test_88_original_lettering_and_stable_headers(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,name:'Nano',gold:3445,gems:103,xp:3095,arena:'royal'});RoyaleDemo.show('home')")
  self.assertTrue(self.page.evaluate("RoyaleText.ready && RoyaleText.metrics('Nano 3445', 'title').supported"))
  self.assertGreater(self.page.locator('#home .ink-text canvas').count(),10)
  boxes=self.page.evaluate("""()=>[...document.querySelectorAll('#home .topbar>button')].map(e=>{const r=e.getBoundingClientRect();return {l:r.left,r:r.right,w:r.width,overflow:e.scrollWidth-e.clientWidth}})""")
  self.assertTrue(all(b['w']>=120 for b in boxes),str(boxes))
  self.assertLessEqual(boxes[0]['r'],boxes[1]['l']+1);self.assertLessEqual(boxes[1]['r'],boxes[2]['l']+1)
  self.assertEqual(self.page.locator('#homeArenaName').inner_text(),'Arena 7')
 def test_89_trophy_road_all_arenas_and_leagues(self):
  self.page.click('#home .home-arena');self.assertEqual(self.page.evaluate('RoyaleDemo.screen'),'trophyRoad')
  self.assertEqual(self.page.locator('.road-stop:not(.road-league)').count(),14);self.assertEqual(self.page.locator('.road-league').count(),10)
  self.page.locator('[data-road-id="serenity"] [data-action="arena"]').click();self.assertEqual(self.page.evaluate('RoyaleDemo.profile.arena'),'serenity');self.assertEqual(self.page.locator('#homeArenaName').inner_text(),'Arena 14')
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,arena:'goblin'});RoyaleDemo.show('home')")
 def test_90_original_home_arena_timeline_is_animated(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,arena:'royal'});RoyaleDemo.show('home')")
  self.page.wait_for_function("!document.getElementById('homeArenaCanvas').hidden")
  result=self.page.evaluate("""()=>{const cv=document.createElement('canvas');cv.width=600;cv.height=600;const c=cv.getContext('2d',{willReadFrequently:true});return [0,.36].map(t=>{if(!RoyalePresentation.home(c,'royal',t))throw Error('No home scene');const a=c.getImageData(0,0,600,600).data;let h=0;for(const x of a)h=(h*31+x)>>>0;return h;});}""")
  self.assertNotEqual(result[0],result[1])
 def test_91_cheat_settings_and_duplicate_deck_are_live(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,cheats:{},cheatLevels:{},decks:RoyaleCore.PRESETS,activeDeck:0});RoyaleDemo.show('home')")
  self.page.click('#home [data-action="menu"]');self.page.click('[data-action="settings"]');self.page.click('[data-action="cheats"]')
  self.page.check('[data-cheat="duplicates"]');self.page.check('[data-cheat="placement"]')
  self.page.select_option('#cheatCard','knight');self.page.fill('#cheatLevel','20');self.page.click('[data-action="cheat-level"]')
  self.assertTrue(self.page.evaluate('RoyaleDemo.profile.cheats.overlevels'));self.assertEqual(self.page.evaluate('RoyaleDemo.profile.cheatLevels.knight'),20)
  self.page.evaluate("RoyaleDemo.show('cards');RoyaleDemo.details('knight')");self.assertFalse(self.page.locator('[data-action="use-card"]').is_disabled())
  self.page.click('[data-action="use-card"]');self.page.click('[data-action="replace-card"][data-slot="1"]')
  self.assertEqual(self.page.evaluate("RoyaleDemo.profile.decks[0].filter(c=>c==='knight').length"),2)
  self.page.evaluate('RoyaleDemo.startBattle()')
  result=self.page.evaluate("""()=>{const b=RoyaleDemo.battle;b.paused=true;b.ai=false;b.elixir[0]=10;const before=b.played[0];const slot=b.hand[0].indexOf('knight');if(slot<0){b.hand[0][0]='knight';}const at=b.hand[0].indexOf('knight');b.paused=false;b.deploy(0,at,150,180);b.paused=true;return {practice:b.practice,spent:b.played[0]>before,troops:b.units.filter(u=>u.entity==='Knight').map(u=>({level:u.level,y:u.y}))};}""")
  self.assertTrue(result['practice']);self.assertTrue(result['spent']);self.assertTrue(any(u['level']==20 and u['y']<300 for u in result['troops']),str(result))
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,cheats:{},cheatLevels:{}});RoyaleDemo.show('home')")
  self.assertTrue(self.page.evaluate('new Set(RoyaleDemo.profile.decks[0]).size===8'))
 def test_92_no_rewards_from_cheat_battles(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,cheats:{placement:true}})");before=self.page.evaluate('({gold:RoyaleDemo.profile.gold,trophies:RoyaleDemo.profile.trophies,chests:RoyaleDemo.profile.chests.length})')
  self.page.evaluate("async()=>{await RoyaleDemo.startBattle('SuddenDeath');const b=RoyaleDemo.battle;b.towers.find(t=>!t.king&&t.team===1).hp=0;RoyaleDemo.step(.1)}")
  after=self.page.evaluate('({gold:RoyaleDemo.profile.gold,trophies:RoyaleDemo.profile.trophies,chests:RoyaleDemo.profile.chests.length})');self.assertEqual(before,after)
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,cheats:{}});RoyaleDemo.show('home')")
 def test_93_original_loading_art_present_and_english_selection(self):
  self.page.evaluate("document.getElementById('loading').classList.remove('hidden');document.getElementById('loadProgress').style.width='72%'")
  self.page.wait_for_function("document.querySelector('.source-loading-art').complete && document.querySelector('.source-loading-art').naturalWidth>0")
  self.page.locator('#viewport').screenshot(path=str(base.OUT/'source-loading.png'))
  self.page.evaluate("document.getElementById('loading').classList.add('hidden')")
  self.assertFalse(any(u.lower().split('?')[0].endswith(('.ttf','.otf','.woff','.woff2')) for u in self.requests))
 def test_94_final_original_presentation_capture(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,name:'Nano',arena:'royal',gold:3445,gems:103,trophies:2158,xp:3095,cheats:{},freeChestAt:Date.now()+107*60000,crownChestAt:Date.now()+140*60000,chests:[{id:'qa-magic',kind:'magic',unlockAt:0},{id:'qa-unlocking',kind:'silver',unlockAt:Date.now()+2*3600000},{id:'qa-gold',kind:'gold',unlockAt:0},{id:'qa-silver',kind:'silver',unlockAt:0}]});RoyaleDemo.show('home')")
  self.page.wait_for_function("!document.getElementById('homeArenaCanvas').hidden");self.page.wait_for_timeout(450);self.page.locator('#viewport').screenshot(path=str(base.OUT/'home-original.png'))
  self.page.click('#home .home-arena');self.page.wait_for_timeout(300);self.page.locator('#viewport').screenshot(path=str(base.OUT/'trophy-road.png'))
  self.page.evaluate("RoyaleDemo.show('home')");self.page.click('#home [data-action="menu"]');self.page.click('[data-action="settings"]');self.page.click('[data-action="cheats"]');self.page.locator('#viewport').screenshot(path=str(base.OUT/'cheat-settings.png'))
  self.page.evaluate("RoyaleDemo.show('cards')");self.page.wait_for_timeout(300);self.page.locator('#viewport').screenshot(path=str(base.OUT/'cards-original.png'))
  self.test_39_recording_scenario_preview()
  self.page.locator('#viewport').screenshot(path=str(base.OUT/'battle-original.png'))
 def test_99_no_final_render_errors_or_missing_assets(self):
  self.assertEqual(self.errors,[]);self.assertEqual(self.missing,[])
if __name__=='__main__':unittest.main(verbosity=2)
