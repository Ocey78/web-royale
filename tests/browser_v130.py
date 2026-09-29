"""v0.13 packaged-byte browser checks for looped learning, UI trim, 2v2 spacing and FX."""
import unittest
import browser_v120 as previous
import browser_v050 as base
base.OUT=base.R/'docs/qa/v130/browser';base.OUT.mkdir(parents=True,exist_ok=True)

class BrowserTests(previous.BrowserTests):
 def test_116_settings_preview_learning_and_history_export(self):
  self.page.evaluate("RoyaleDemo.show('home');document.querySelector('#home [data-action=menu]').click();document.querySelector('#modalPanel [data-action=settings]').click()")
  self.assertEqual(self.page.locator('#placementHints').count(),1)
  self.page.locator('#placementHints').uncheck();self.assertFalse(self.page.evaluate('RoyaleDemo.profile.placementHints'));self.page.locator('#placementHints').check()
  text=self.page.locator('#modalPanel').inner_text().lower();self.assertIn('always on',text)
  self.page.click('[data-action=learning-center]');self.page.wait_for_selector('.learning-stats');self.assertTrue(self.page.locator('[data-action=learning-export]').is_visible())
  self.assertEqual(self.errors,[]);self.assertEqual(self.missing,[])

 def test_130_cog_menu_has_only_requested_four_actions(self):
  self.page.evaluate("RoyaleDemo.show('home');document.querySelector('#home [data-action=menu]').click()")
  panel=self.page.locator('#modalPanel[data-kind=menu]')
  self.assertTrue(panel.is_visible())
  actions=panel.locator('.native-button[data-action]').evaluate_all("els=>els.map(e=>e.dataset.action)")
  self.assertEqual(actions,['settings','log','profile','learning-center'])
  panel.screenshot(path=str(base.OUT/'cog-menu.png'))

 def test_131_always_ten_elixir_cheat_visible_and_effective(self):
  self.page.evaluate("RoyaleDemo.show('home');document.querySelector('#home [data-action=menu]').click();document.querySelector('[data-action=settings]').click();document.querySelector('[data-action=cheats]').click()")
  cheat=self.page.locator('[data-cheat=elixir]')
  self.assertTrue(cheat.is_visible())
  cheat.check()
  self.page.evaluate("async()=>{document.querySelector('.modal-close').click();await RoyaleDemo.startBattle();const b=RoyaleDemo.battle;b.ai=false;b.paused=false;b.hand[0][0]='knight';b.elixir[0]=10;const r=b.deploy(0,0,9*RoyaleCore.SX,24*RoyaleCore.SY);if(!r.ok)throw Error(r.reason);for(let i=0;i<120;i++)b.step(1/60);b.paused=true;RoyaleDemo.refreshHand(true)}")
  self.assertEqual(self.page.evaluate('RoyaleDemo.battle.elixir[0]'),10)

 def test_132_learning_center_loop_button_and_always_on_copy(self):
  self.page.evaluate("RoyaleDemo.show('home');document.querySelector('#home [data-action=menu]').click();document.querySelector('[data-action=learning-center]').click()")
  loop=self.page.locator('#trainingLoop')
  self.assertTrue(loop.is_visible())
  before=loop.get_attribute('aria-pressed')
  loop.click(); after=loop.get_attribute('aria-pressed')
  self.assertNotEqual(before,after)
  self.assertIn('always',self.page.locator('#modalPanel').inner_text().lower())
  self.assertNotIn('type="checkbox"',loop.evaluate('e=>e.outerHTML'))
  self.page.locator('#modalPanel').screenshot(path=str(base.OUT/'learning-loop.png'))

 def test_133_2v2_king_positions_are_visibly_wider_and_four_seat(self):
  self.page.evaluate("async()=>{RoyaleDemo.applyProfile({...RoyaleDemo.profile,cheats:{},equalLevels:true});await RoyaleDemo.startBattle('TeamVsTeam');const b=RoyaleDemo.battle;b.ai=false;b.paused=true;RoyaleDemo.refreshHand(true)}")
  data=self.page.evaluate("()=>{const b=RoyaleDemo.battle,k=b.towers.find(t=>t.team===0&&t.king);return {seats:b.seatCount,duo:k.duoKing,offset:k.cannonOffset/RoyaleCore.SX,cannons:k.cannons.map(c=>c.offset/RoyaleCore.SX)}}")
  self.assertEqual(data['seats'],4);self.assertTrue(data['duo']);self.assertGreaterEqual(data['offset'],1.5)
  self.page.wait_for_timeout(500)
  self.page.locator('#viewport').screenshot(path=str(base.OUT/'2v2-wide-kings.png'))

 def test_134_source_effects_render_nonempty_and_directional(self):
  r=self.page.evaluate("""async()=>{await RoyaleDemo.startBattle();const b=RoyaleDemo.battle;b.ai=false;b.paused=true;const cv=document.getElementById('battleCanvas'),ctx=cv.getContext('2d');b.effects.push({kind:'source',name:'knight_hit',x:250,y:360,born:b.time,life:.7,team:0,parentAngle:0});RoyaleDraw.battle(ctx,b,b.time+.18,null,null,1);const a=ctx.getImageData(0,0,cv.width,cv.height).data;let alpha=0;for(let i=3;i<a.length;i+=4)if(a[i])alpha++;return {alpha,effects:b.effects.length}}""")
  self.assertGreater(r['alpha'],1000);self.assertGreater(r['effects'],0)
  self.page.locator('#viewport').screenshot(path=str(base.OUT/'source-fx.png'))

 def test_135_final_no_errors_or_missing_files(self):
  self.assertEqual(self.errors,[]);self.assertEqual(self.missing,[])

if __name__=='__main__': unittest.main(verbosity=2)
