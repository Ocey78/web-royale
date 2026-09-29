"""v0.6 packaged-byte browser regression suite. Inherits all v0.5 checks.
Managed Chromium blocks direct navigation; fixture intercepts only local site assets.
"""
import unittest,json
from pathlib import Path
import browser_v050 as prior
prior.OUT=prior.R/'docs/qa/v060/browser';prior.OUT.mkdir(parents=True,exist_ok=True)
class BrowserTests(prior.BrowserTests):
 def test_11_battle_and_input(self):
  # Live matches shuffle now; select a real affordable troop, not a fixed slot.
  self.page.evaluate('RoyaleDemo.startBattle()')
  slot=self.page.evaluate("(()=>{const b=RoyaleDemo.battle;return b.hand[0].findIndex((id,i)=>!b.card(0,i).spell&&b.card(0,i).cost<=b.elixir[0]);})()")
  self.assertGreaterEqual(slot,0)
  self.page.keyboard.press(str(slot+1));before=self.page.evaluate('RoyaleDemo.battle.played[0]')
  r=self.page.locator('#viewport').bounding_box();self.page.mouse.click(r['x']+150*r['width']/540,r['y']+545*r['height']/960)
  self.page.wait_for_timeout(1100);self.assertGreater(self.page.evaluate('RoyaleDemo.battle.played[0]'),before)
  self.page.screenshot(path=str(prior.OUT/'battle.png'));self.assertFalse(self.errors)
 def test_60_source_button_slices_reassembled(self):
  self.assertIn('button-blue-fixed', self.page.evaluate('Object.keys(RoyaleBundle.uiImages)'))
 def test_61_home_has_two_clear_primary_actions(self):
  self.assertTrue(self.page.locator('#home [data-action="party"]').is_visible())
  self.assertTrue(self.page.locator('#home [data-action="battle"]').is_visible())
 def test_62_bottom_navigation_not_clipped_on_any_page(self):
  for name in ['home','cards','shop','clan','events']:
   self.page.evaluate('(s)=>RoyaleDemo.show(s)',name)
   metrics=self.page.evaluate('''s=>{const p=document.getElementById(s),r=document.getElementById('viewport').getBoundingClientRect();return [...p.querySelectorAll('.nav-btn')].map(b=>{const a=b.getBoundingClientRect();return {inside:a.left>=r.left-.5&&a.right<=r.right+.5&&a.bottom<=r.bottom+.5,height:a.height};});}''',name)
   self.assertTrue(all(x['inside'] and x['height']>=45 for x in metrics),str((name,metrics)))
 def test_63_collection_has_real_copy_progress_and_rarity_frames(self):
  self.page.evaluate("RoyaleDemo.show('cards')")
  self.assertEqual(self.page.locator('#collectionGrid .card-progress').count(),102)
  self.assertGreater(self.page.locator('#collectionGrid .card-visual.epic').count(),0)
 def test_64_all_shop_offers_use_framed_portraits(self):
  self.page.evaluate("RoyaleDemo.show('shop')")
  self.assertEqual(self.page.locator('#shopContent .shop-offer .card-visual').count(),6)
 def test_65_buttons_have_white_readable_text_in_light_panels(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,clan:null});RoyaleDemo.show('clan')")
  buttons=self.page.locator('#clanContent .native-button')
  self.assertGreaterEqual(buttons.count(),2)
  for b in buttons.all():
   self.assertEqual(b.evaluate('(b)=>getComputedStyle(b).color'),'rgb(255, 255, 255)')
   self.assertLessEqual(b.evaluate('(b)=>b.scrollWidth-b.clientWidth'),2)
 def test_66_bot_difficulty_can_be_changed_and_saved(self):
  self.page.click('#home [data-action="menu"]');self.page.click('[data-action="settings"]')
  self.page.select_option('#botDifficulty','hard')
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.aiDifficulty'),'hard')
  self.page.select_option('#botDifficulty','expert')
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.aiDifficulty'),'expert')
 def test_67_page_swipe_and_reduced_motion_remain_usable(self):
  self.page.evaluate("RoyaleDemo.show('home')");r=self.page.locator('#viewport').bounding_box()
  self.page.mouse.move(r['x']+r['width']*.85,r['y']+r['height']*.33);self.page.mouse.down();self.page.mouse.move(r['x']+r['width']*.25,r['y']+r['height']*.33,steps=7);self.page.mouse.up()
  self.assertEqual(self.page.evaluate('RoyaleDemo.screen'),'clan')
  self.page.emulate_media(reduced_motion='reduce');self.page.evaluate("RoyaleDemo.show('events')")
  self.assertTrue(self.page.locator('#events.active').is_visible());self.page.emulate_media(reduced_motion='no-preference')
 def test_68_visible_menu_screenshots(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,clan:null})")
  for s in ['home','cards','shop','events','clan']:
   self.page.evaluate('(s)=>RoyaleDemo.show(s)',s);self.page.wait_for_timeout(240)
   self.page.screenshot(path=str(prior.OUT/(s+'-polished.png')))

 def test_69_browser_matches_enable_seeded_opening_shuffle(self):
  hands=self.page.evaluate("""async()=>{const old=Math.random,orders=[];try{RoyaleDemo.applyProfile({...RoyaleDemo.profile,decks:RoyaleCore.PRESETS,activeDeck:0});for(const n of [.17,.38,.69]){Math.random=()=>n;await RoyaleDemo.startBattle();const b=RoyaleDemo.battle;b.ai=false;orders.push(b.hand[0].concat(b.queue[0]).join(','));}}finally{Math.random=old;}return orders;}""")
  self.assertEqual(len(set(hands)),3)
 def test_70_counter_decision_uses_normal_hand_and_elixir_in_browser(self):
  self.page.evaluate("""async()=>{await RoyaleDemo.startBattle();const b=RoyaleDemo.battle;b.ai=false;b.time=10;b.hand[1]=['knight','musketeer','bomber','giant'];b.elixir[1]=7;const u=b.spawn('Balloon',0,94,205,{wait:0});u.born=8;const before=b.elixir[1];b.aiPlay(1);window.__counterQA={spent:before-b.elixir[1],decision:b.bots[1].decisions.at(-1)};b.paused=true;}""")
  result=self.page.evaluate('window.__counterQA');self.assertEqual(result['spent'],4);self.assertEqual(result['decision']['card'],'musketeer')
 def test_71_original_audio_is_optional_and_real_assets_decode(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,sound:false});RoyaleDemo.audio.setEnabled(false)")
  before=len([u for u in self.requests if '.wav' in u])
  self.assertFalse(self.page.evaluate("RoyaleDemo.audio.play('click')"))
  self.assertEqual(len([u for u in self.requests if '.wav' in u]),before)
  # Browser gesture unlocks Web Audio; all eight decoded buffers are real WAV bytes.
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,sound:true})")
  self.page.click('#home [data-action="nav-cards"]')
  self.page.wait_for_function("RoyaleDemo.audio.buffers.has('click')")
  durations=self.page.evaluate("""async()=>{const a=RoyaleDemo.audio;for(const key of Object.keys(RoyaleBundle.sounds)){a.lastPlay.clear();await a.play(key,0);}return [...a.buffers].map(([key,b])=>({key,duration:b.duration,length:b.length}));}""")
  self.assertEqual(len(durations),8)
  self.assertTrue(all(x['duration']>0 and x['length']>0 for x in durations))
  self.page.evaluate("RoyaleDemo.audio.setEnabled(false);RoyaleDemo.applyProfile({...RoyaleDemo.profile,sound:false})")
  self.assertEqual(self.page.evaluate('RoyaleDemo.audio.voices.size'),0)
  (prior.OUT/'audio-decode.json').write_text(json.dumps(durations,indent=2))
 def test_99_no_final_render_errors_or_missing_assets(self):
  self.assertEqual(self.errors,[])
  self.assertEqual(self.missing,[])
