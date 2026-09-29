"""Additional real-pixel/DPI checks and retention of the prior emote renderer."""
import unittest,json
from pathlib import Path
import browser_v200 as fixture
R=Path(__file__).resolve().parents[1];OUT=R/'docs/qa/v024/browser';OUT.mkdir(parents=True,exist_ok=True)
class BrowserV241(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  fixture.BrowserV200.setUpClass();cls.page=fixture.BrowserV200.page
 @classmethod
 def tearDownClass(cls):fixture.BrowserV200.tearDownClass()
 def setUp(self):
  self.page.evaluate("RoyaleDemo.show('home');RoyaleDemo.applyProfile({...RoyaleCore.normalizeProfile(),trophies:1300,highestTrophies:1300,gems:99999});")
 def test_250_paragraph_glyphs_rerender_at_new_display_density(self):
  p=self.page;p.evaluate("RoyaleDemo.show('cards');RoyaleDemo.details('three-musketeers')")
  p.evaluate("Object.defineProperty(window,'devicePixelRatio',{value:3,configurable:true});RoyaleUI.resize(1.2)")
  p.wait_for_timeout(250)
  r=p.locator('#modalPanel>p .ink-text canvas').first.evaluate("c=>c.width/parseFloat(c.style.width)")
  p.evaluate("Object.defineProperty(window,'devicePixelRatio',{value:1,configurable:true});RoyaleUI.resize(1)")
  self.assertGreaterEqual(r,3.5)
 def test_251_repeated_live_trophy_label_never_becomes_blank(self):
  p=self.page
  r=p.evaluate("""()=>{const b=document.querySelector('#home [data-trophies]');for(let i=0;i<3;i++){b.textContent='1,300';RoyaleUI.hydrate(document.getElementById('home'));}const c=b.querySelector('canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return [...d].filter((v,i)=>i%4===3&&v>32).length;}""")
  self.assertGreater(r,500)
 def test_252_magic_items_and_settings_label_ink_stays_inside_buttons(self):
  p=self.page;p.evaluate("document.querySelector('[data-action=menu]').click();document.querySelector('[data-action=settings]').click()")
  r=p.evaluate("""()=>[...document.querySelectorAll('#modalPanel .native-button')].map(e=>{const c=e.querySelector('canvas.label-ink');if(!c)return{t:e.textContent,ok:false};const b=e.getBoundingClientRect(),r=c.getBoundingClientRect();return{t:e.textContent,ok:r.left>=b.left+3&&r.right<=b.right-3&&r.top>=b.top&&r.bottom<=b.bottom};})""")
  self.assertTrue(all(x['ok'] for x in r),r)
 def test_253_ui_icons_use_contain_and_canvas_ink_is_not_anisotropic(self):
  p=self.page;p.evaluate("RoyaleDemo.show('shop')")
  r=p.evaluate("""()=>({icons:[...document.querySelectorAll('#shop img')].filter(e=>e.offsetParent).map(e=>getComputedStyle(e).objectFit),labels:[...document.querySelectorAll('#shop canvas.label-ink')].filter(e=>e.offsetParent).map(c=>{const r=c.getBoundingClientRect();return{err:Math.abs((r.width/r.height)/(c.width/c.height)-1),text:c.parentElement.textContent};})})""")
  self.assertTrue(all(x in ['contain','cover'] for x in r['icons']))
  self.assertTrue(all(x['err']<.055 for x in r['labels']),r['labels'])
 def test_254_original_animation_changes_pixels_and_replay_restarts(self):
  p=self.page;p.evaluate("RoyaleDemo.show('cards');RoyaleDemo.librarySection('emotes')")
  eid=p.evaluate("RoyaleMenu.emotes.find(e=>e.scene==='emotes_PEKKA_boombox_dl').id")
  p.locator('[data-action=collection-emote][data-id="'+eid+'"]').click()
  p.wait_for_function("document.querySelector('#modalPanel .emote-bubble').dataset.playback==='playing'")
  p.wait_for_timeout(250)
  first=p.locator('#modalPanel canvas.emote-animation').evaluate("c=>({image:c.toDataURL(),frame:Number(c.dataset.frame)})")
  p.wait_for_timeout(450)
  second=p.locator('#modalPanel canvas.emote-animation').evaluate("c=>({image:c.toDataURL(),frame:Number(c.dataset.frame)})")
  self.assertNotEqual(first['image'],second['image']);self.assertGreater(second['frame'],first['frame'])
  p.click('[data-action=emote-replay]');p.wait_for_timeout(120)
  frame=p.locator('#modalPanel canvas.emote-animation').evaluate('c=>Number(c.dataset.frame)')
  self.assertLess(frame,second['frame']);self.assertEqual(p.locator('#modalPanel .emote-bubble').get_attribute('data-animation-kind'),'original-timeline')
  p.locator('#viewport').screenshot(path=str(OUT/'animated-emote.png'))
 def test_255_mask_groups_clip_art_without_painting_red_geometry(self):
  r=self.page.evaluate("""async()=>{const tex=document.createElement('canvas');tex.width=2;tex.height=1;const tc=tex.getContext('2d');tc.fillStyle='#ff0000';tc.fillRect(0,0,1,1);tc.fillStyle='#00ff00';tc.fillRect(1,0,1,1);const im=new Image();im.src=tex.toDataURL();await im.decode();const quad=(x,w,uv)=>[{texture:0,xy:[[x,0],[x+w,0],[x+w,20],[x,20]],uv}];const data={exports:{test:10},rasterScale:2,matrices:[],colors:[],shapes:{1:quad(10,10,[[0,0],[.5,0],[.5,1],[0,1]]),2:quad(0,30,[[.5,0],[1,0],[1,1],[.5,1]])},modifiers:{3:38,4:39,5:40},clips:{10:{fps:60,frames:[[[3,65535,65535],[1,65535,65535],[4,65535,65535],[2,65535,65535],[5,65535,65535]]]}}};const cv=document.createElement('canvas');cv.width=40;cv.height=30;const c=cv.getContext('2d');new RoyaleNative.Scene(data,[im]).draw(c,'test');const at=x=>[...c.getImageData(x,10,1,1).data];return{outside:at(4),inside:at(15),right:at(25)};}""")
  self.assertEqual(r['outside'][3],0);self.assertEqual(r['right'][3],0)
  self.assertGreater(r['inside'][1],240);self.assertLess(r['inside'][0],10);self.assertGreater(r['inside'][3],240)
 def test_256_battle_ui_and_text_backing_follow_the_display(self):
  p=self.page;p.evaluate("async()=>{await RoyaleDemo.startBattle('TripleElixir',true);RoyaleDemo.battle.paused=true;Object.defineProperty(window,'devicePixelRatio',{value:3,configurable:true});RoyaleUI.resize(1);}")
  p.wait_for_timeout(350)
  r=p.evaluate("""()=>Object.fromEntries(['nativeBattleTimer','battleCanvas','enemyName'].map(id=>{const el=document.getElementById(id),c=el.tagName==='CANVAS'?el:el.querySelector('canvas');return[id,c.width/(c.clientWidth||parseFloat(c.style.width))];}))""")
  p.evaluate("Object.defineProperty(window,'devicePixelRatio',{value:1,configurable:true});RoyaleUI.resize(1)")
  for name,ratio in r.items():self.assertGreaterEqual(ratio,2.9,(name,ratio))
 def test_257_escaped_names_are_rendered_once_without_literal_html_entities(self):
  p=self.page;p.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,clan:{name:'A & B Crew',messages:[]}});RoyaleDemo.show('clan')")
  p.click('[data-action=clan-members]')
  self.assertEqual(p.locator('#modalPanel h2').inner_text(),'A & B Crew')
 def test_259_no_errors_or_missing_resources(self):
  self.assertEqual(fixture.BrowserV200.errors,[]);self.assertEqual(fixture.BrowserV200.missing,[])
if __name__=='__main__':unittest.main(verbosity=2)
