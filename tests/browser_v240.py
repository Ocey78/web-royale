"""Packaged UI polish checks; inspect real canvas dimensions and interactive pages."""
import unittest,json
from pathlib import Path
import browser_v200 as fixture
R=Path(__file__).resolve().parents[1];OUT=R/'docs/qa/v024/browser';OUT.mkdir(parents=True,exist_ok=True)
class BrowserV240(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  fixture.BrowserV200.setUpClass();cls.page=fixture.BrowserV200.page
 @classmethod
 def tearDownClass(cls):
  (OUT/'errors.json').write_text(json.dumps({'errors':fixture.BrowserV200.errors,'missing':fixture.BrowserV200.missing},indent=2));fixture.BrowserV200.tearDownClass()
 def setUp(self):
  self.page.set_viewport_size({'width':1200,'height':960});self.page.evaluate("RoyaleDemo.show('home');RoyaleDemo.applyProfile({...RoyaleCore.normalizeProfile(),trophies:1300,highestTrophies:1300,gold:2460,gems:20,name:'Nano',experience:56});")
 def snap(self,name):
  self.page.wait_for_timeout(250);self.page.locator('#viewport').screenshot(path=str(OUT/(name+'.png')))
 def test_240_native_glyph_fit_is_uniform_not_squeezed(self):
  r=self.page.evaluate("""()=>{const cv=document.createElement('canvas'),c=cv.getContext('2d'),calls=[];c.drawImage=(...a)=>calls.push(a);RoyaleText.draw(c,'The extremely long title',0,0,32,'#fff','left',null,'title',70);const a=calls.at(-1);return {sx:a[3]/a[0].width,sy:a[4]/a[0].height};}""")
  self.assertAlmostEqual(r['sx'],r['sy'],places=8)
 def test_241_buttons_preserve_original_corners(self):
  p=self.page;p.evaluate("RoyaleDemo.show('events')")
  r=p.locator('.event-card .native-button').first.evaluate("e=>({slice:getComputedStyle(e).borderImageSlice,src:getComputedStyle(e).borderImageSource})")
  self.assertIn('fill',r['slice']);self.assertNotEqual(r['src'],'none');self.snap('events')
 def test_242_maximum_balances_and_chest_words_are_contained(self):
  p=self.page;p.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,gold:9999999,gems:9999999,chests:[{id:'one',kind:'silver',winsProgress:0},{id:'two',kind:'gold',winsProgress:1},{id:'ten',kind:'legendary',winsProgress:0},{id:'ready',kind:'magic',winsProgress:4}]})")
  for w,h in [(1200,960),(360,640),(390,844),(768,1024),(1600,1200)]:
   p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(1100)
   rows=p.evaluate("""()=>[...document.querySelectorAll('#home .resource>span,#home .slot-duration')].map(e=>{const c=e.querySelector('canvas'),r=c?.getBoundingClientRect(),b=e.closest('.resource,.chest-slot').getBoundingClientRect();return {text:e.textContent,canvas:!!c,inside:!!r&&r.left>=b.left-1&&r.right<=b.right+1};})""")
   self.assertTrue(all(r['canvas'] and r['inside'] for r in rows),rows)
   self.assertIn('1 Win',[r['text'] for r in rows]);self.assertIn('10 Wins',[r['text'] for r in rows])
  p.set_viewport_size({'width':1200,'height':960});self.snap('home')
 def test_243_all_collection_tabs_and_long_names_stay_in_their_tiles(self):
  p=self.page;p.evaluate("RoyaleDemo.show('cards');RoyaleDemo.cardSection('decks')");self.snap('decks')
  for tab in ['cards','emotes','tower-skins','magic-items']:
   p.evaluate('(t)=>RoyaleDemo.librarySection(t)',tab);p.wait_for_timeout(300)
   labels=p.evaluate("""()=>[...document.querySelectorAll('#cosmeticCollection .royale-label')].filter(e=>e.offsetParent!==null).map(e=>{const a=e.querySelector('canvas')?.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return {text:e.textContent,inside:!!a&&a.left>=b.left-1&&a.right<=b.right+1};})""")
   self.assertTrue(all(x['inside'] for x in labels),labels);self.snap('collection-'+tab)
  self.assertGreater(p.locator('.magic-collection-tile .label-ink').count(),5)
 def test_244_shop_names_prices_and_icons_do_not_collide(self):
  p=self.page;p.evaluate("RoyaleDemo.show('shop')");p.wait_for_timeout(250)
  self.assertEqual(p.locator('.shop-deals-section .shop-offer').count(),9)
  rows=p.evaluate("""()=>[...document.querySelectorAll('.shop-deals-section .shop-offer')].map(e=>{const r=e.getBoundingClientRect(),a=e.querySelector('h3').getBoundingClientRect(),b=e.querySelector('.offer-rarity').getBoundingClientRect(),c=e.querySelector('.offer-portrait').getBoundingClientRect();return {inside:a.left>=r.left&&a.right<=r.right,apart:a.bottom<=b.top+1&&b.bottom<=c.top+1};})""")
  self.assertTrue(all(x['inside'] and x['apart'] for x in rows),rows);self.snap('shop')
 def test_245_modal_heading_close_button_and_actions_have_space(self):
  p=self.page;p.evaluate("RoyaleDemo.show('cards');RoyaleDemo.details('three-musketeers')");p.wait_for_timeout(250)
  rows=p.evaluate("""()=>{const panel=document.getElementById('modalPanel').getBoundingClientRect();return [...document.querySelectorAll('#modalPanel .native-button')].filter(e=>e.offsetParent!==null).map(e=>{const r=e.getBoundingClientRect();return r.left>=panel.left&&r.right<=panel.right;});}""")
  self.assertTrue(all(rows));self.snap('card-detail')
  p.evaluate("RoyaleDemo.show('home');document.querySelector('[data-action=menu]').click();document.querySelector('[data-action=settings]').click()");self.snap('settings')
 def test_246_resize_rerasterizes_labels_without_duplicate_wrappers(self):
  p=self.page;p.evaluate("RoyaleDemo.show('events')");before=p.locator('.event-card .royale-label').count()
  p.evaluate("()=>{for(let i=0;i<10;i++){RoyaleUI.hydrate(document.getElementById('events'));RoyaleText.hydrate(document.getElementById('events'));}}")
  self.assertEqual(p.locator('.event-card .royale-label').count(),before);self.assertEqual(p.locator('.royale-label .royale-label').count(),0)
  p.evaluate("Object.defineProperty(window,'devicePixelRatio',{value:3,configurable:true});RoyaleUI.resize(1.2)")
  p.wait_for_timeout(100)
  r=p.locator('.event-card h3 canvas').first.evaluate('c=>({r:c.width/parseFloat(c.style.width),d:Number(c.dataset.density)})');self.assertGreaterEqual(r['r'],3.5);self.assertAlmostEqual(r['d'],3.6,places=4)
  p.evaluate("Object.defineProperty(window,'devicePixelRatio',{value:1,configurable:true});RoyaleUI.resize(1)")
 def test_247_original_zoom_and_battle_header_remain_clean(self):
  p=self.page;p.evaluate("async()=>{await RoyaleDemo.startBattle('Default',true);RoyaleDemo.battle.ai=false;RoyaleDemo.battle.paused=true;}");p.wait_for_timeout(1200)
  self.assertAlmostEqual(p.evaluate('RoyaleBattleView.camera.scale'),1.1418504387711865,places=6)
  r=p.evaluate("""()=>{const n=document.getElementById('enemyName').getBoundingClientRect(),buttons=[...document.querySelectorAll('.battle-top .square')].map(e=>e.getBoundingClientRect()),timer=document.getElementById('nativeBattleTimer').getBoundingClientRect();return {textFits:buttons.every(b=>b.bottom<=n.top||n.right<=b.left),buttonsFit:buttons.every(b=>b.bottom<=timer.top||b.right<timer.left),};}""")
  self.assertTrue(r['textFits']);self.assertTrue(r['buttonsFit']);self.snap('battle')
 def test_249_no_script_errors_missing_resources_or_font_downloads(self):
  self.assertEqual(fixture.BrowserV200.errors,[]);self.assertEqual(fixture.BrowserV200.missing,[])
if __name__=='__main__':unittest.main(verbosity=2)
