"""v0.22: rendered spaces, moderate camera zoom and honest unavailable-skin UI."""
import unittest,json
from pathlib import Path
import browser_v200 as fixture
OUT=Path(__file__).resolve().parents[1]/'docs/qa/v022/browser';OUT.mkdir(parents=True,exist_ok=True)

class BrowserV220(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  fixture.BrowserV200.setUpClass();cls.page=fixture.BrowserV200.page
 @classmethod
 def tearDownClass(cls):
  (OUT/'resource-errors.json').write_text(json.dumps({'errors':fixture.BrowserV200.errors,'missing':fixture.BrowserV200.missing},indent=2))
  fixture.BrowserV200.tearDownClass()
 def setUp(self):
  self.page.set_viewport_size({'width':1200,'height':960})
  self.page.evaluate("RoyaleDemo.show('home');RoyaleDemo.applyProfile({...RoyaleCore.normalizeProfile(),trophies:1000,highestTrophies:1000,gems:10000,gold:99999});")
 def test_220_chest_numbers_have_a_visible_word_gap_not_only_accessible_whitespace(self):
  p=self.page
  p.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,chests:[{id:'one',kind:'silver',winsProgress:0},{id:'two',kind:'gold',winsProgress:1},{id:'ten',kind:'legendary',winsProgress:0},{id:'ready',kind:'magic',winsProgress:4}]});RoyaleDemo.show('home')")
  for width,height in [(1200,960),(360,640),(768,1024)]:
   p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(1200)
   rows=p.evaluate("""()=>[...document.querySelectorAll('.slot-duration')].slice(0,3).map(el=>{const a=el.querySelector('canvas').getBoundingClientRect(),b=el.closest('.chest-slot').getBoundingClientRect();return {text:el.textContent,inside:a.left>=b.left&&a.right<=b.right};})""")
   self.assertEqual([r['text'] for r in rows],['1 Win','2 Wins','10 Wins'])
   for row in rows:self.assertTrue(row['inside'],row)
  p.set_viewport_size({'width':1200,'height':960});p.wait_for_timeout(150)
  p.locator('#viewport').screenshot(path=str(OUT/'chests-spaced.png'))
 def test_221_camera_is_closer_and_input_uses_the_same_transform(self):
  p=self.page;p.evaluate("async()=>{await RoyaleDemo.startBattle('Default',true);RoyaleDemo.battle.ai=false;RoyaleDemo.battle.paused=true;}")
  scale=p.evaluate('RoyaleBattleView.camera.scale');self.assertAlmostEqual(scale,1.1418504387711865,places=6)
  p.wait_for_timeout(2000);p.locator('#viewport').screenshot(path=str(OUT/'arena-zoom.png'))
  p.evaluate("()=>{const b=RoyaleDemo.battle;b.paused=false;b.elixir[0]=10;const s=b.hand[0].findIndex(id=>!RoyaleCore.CARD_BY_ID[id].spell);RoyaleDemo.select(s);}")
  point=p.evaluate("()=>{const r=document.getElementById('viewport').getBoundingClientRect(),p=RoyaleBattleView.toScreen({x:9*RoyaleCore.SX,y:23*RoyaleCore.SY});return {x:r.left+p.x*r.width/540,y:r.top+p.y*r.height/RoyaleBattleView.layout.height}}")
  p.mouse.click(point['x'],point['y']);self.assertIsNone(p.evaluate('RoyaleDemo.selected'))
  self.assertGreater(p.evaluate('RoyaleDemo.battle.metrics.spent[0]'),0);p.evaluate('RoyaleDemo.battle.paused=true')
 def test_222_retired_recolors_do_not_appear_as_real_skins_and_saved_gems_are_refunded(self):
  p=self.page;p.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,gems:50,ownedTowerSkins:['classic','frozen-keep'],selectedTowerSkin:'frozen-keep'});RoyaleDemo.show('shop')")
  self.assertEqual(p.evaluate('RoyaleDemo.profile.gems'),800)
  self.assertEqual(p.locator('#towerSkinShop [data-action=buy-tower-skin]').count(),0)
  self.assertIn('not bundled',p.locator('#towerSkinShop').inner_text())
  p.locator('#towerSkinShop').scroll_into_view_if_needed();p.locator('#viewport').screenshot(path=str(OUT/'skin-availability.png'))
  p.evaluate("RoyaleDemo.show('cards');RoyaleDemo.librarySection('tower-skins')")
  self.assertEqual(p.locator('#cosmeticCollection canvas[data-skin-preview]').count(),1)
  self.assertEqual(p.evaluate('RoyaleDemo.profile.selectedTowerSkin'),'classic')
  p.wait_for_function('document.querySelector("#cosmeticCollection canvas[data-skin-preview]").dataset.rendered==="true"')
  self.assertEqual(p.locator('#cosmeticCollection canvas[data-skin-preview]').get_attribute('data-facing'),'front')
  self.assertIn('not bundled',p.locator('#cosmeticCollection').inner_text())
  self.assertEqual(p.locator('#cosmeticCollection').get_by_text('Frozen Keep',exact=True).count(),0)
  self.assertEqual(p.evaluate('JSON.parse(localStorage.getItem("web-royale-classic-v4")).gems'),800)
 def test_223_unknown_or_retired_skin_does_not_recolor_the_default_battle_renderer(self):
  p=self.page
  values=p.evaluate("""async()=>{const l=RoyaleDemo.native;await l.ensureScenes(['building_tower','chr_king','chr_princess']);return ['classic','frozen-keep','fake'].map(skin=>{const cv=document.createElement('canvas');cv.width=280;cv.height=300;const c=cv.getContext('2d');c.translate(140,243);c.scale(2,2);l.drawTower(c,{x:0,y:0,team:1,king:true,skin,hp:1,active:false,heading:Math.PI/2},0);const d=c.getImageData(0,0,280,300).data;let h=2166136261,n=0;for(let i=0;i<d.length;i++){h=Math.imul(h^d[i],16777619);if(i%4===3&&d[i])n++;}return {h:h>>>0,n};});}""")
  self.assertGreater(values[0]['n'],3000)
  self.assertEqual(len({v['h'] for v in values}),1)
 def test_229_no_missing_assets_or_script_errors(self):
  self.assertEqual(fixture.BrowserV200.errors,[]);self.assertEqual(fixture.BrowserV200.missing,[])

if __name__=='__main__':unittest.main(verbosity=2)
