"""Reference-geometry, source-assembly and live placement checks against packaged files."""
import unittest,json,math,time,base64
from pathlib import Path
import browser_v200 as fixture
R=Path(__file__).resolve().parents[1];OUT=R/'docs/qa/v025/browser';OUT.mkdir(parents=True,exist_ok=True)
class BrowserV250(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  fixture.BrowserV200.setUpClass();cls.page=fixture.BrowserV200.page
 @classmethod
 def tearDownClass(cls):
  (OUT/'errors.json').write_text(json.dumps({'errors':fixture.BrowserV200.errors,'missing':fixture.BrowserV200.missing},indent=2));fixture.BrowserV200.tearDownClass()
 def setUp(self):
  self.page.set_viewport_size({'width':1200,'height':960});self.page.evaluate("RoyaleDemo.show('home');RoyaleDemo.applyProfile({...RoyaleCore.normalizeProfile(),trophies:1000,highestTrophies:1000,gold:99999,gems:10000,experience:88770});")
 def start(self,mode='Default'):
  self.page.evaluate("async mode=>{await RoyaleDemo.startBattle(mode,true);RoyaleDemo.battle.ai=false;RoyaleDemo.battle.paused=true}",mode)
  self.page.wait_for_timeout(100)
 def snap(self,name):
  self.page.wait_for_timeout(80);self.page.locator('#viewport').screenshot(path=str(OUT/(name+'.png')))
 def test_250_separate_battle_aspect_and_menu_return(self):
  self.start()
  for w,h in [(1200,960),(390,844),(360,640),(944,2048),(1600,900)]:
   self.page.set_viewport_size({'width':w,'height':h});self.page.wait_for_timeout(60)
   box=self.page.locator('#viewport').bounding_box()
   self.assertAlmostEqual(box['height']/box['width'],1172/540,places=4)
   self.assertGreaterEqual(box['x'],-.1);self.assertGreaterEqual(box['y'],-.1);self.assertLessEqual(box['x']+box['width'],w+.1);self.assertLessEqual(box['y']+box['height'],h+.1)
   self.assertAlmostEqual(self.page.locator('#battleCanvas').evaluate('c=>c.clientHeight'),1172)
  self.page.evaluate("RoyaleDemo.show('home')");self.assertEqual(self.page.locator('#viewport').evaluate('c=>c.clientHeight'),960)
  self.assertEqual(self.page.locator('#viewport').get_attribute('data-layout'),'menu')
 def test_251_reference_landmarks_and_tower_attachment(self):
  self.start();r=self.page.evaluate("({river:RoyaleBattleView.toScreen({x:240,y:320}),p:RoyaleNative.towerArtPosition(RoyaleDemo.battle.towers.find(t=>t.team===1&&!t.king)),attachment:RoyaleNative.towerAttachmentOffset(RoyaleDemo.battle.towers.find(t=>!t.king))})")
  self.assertAlmostEqual(r['river']['y'],536.0817563389831,places=4);self.assertAlmostEqual(r['p']['x'],102.5,places=4);self.assertAlmostEqual(r['p']['y'],125.8333333,places=4);self.assertAlmostEqual(r['attachment'],26.4,places=4)
 def test_252_original_reference_portrait_has_no_embedded_phone_chrome(self):
  self.page.set_viewport_size({'width':944,'height':2048});self.start()
  self.page.evaluate("()=>{const b=RoyaleDemo.battle;b.time=8;for(const t of b.towers){t.level=t.team?8:12;t.def=RoyaleCore.entityDef(t.king?'KingTower':'PrincessTower',t.level);t.hp=t.maxHp=t.def.hp;}RoyaleDemo.refreshHand(true);}")
  self.page.wait_for_timeout(1900);self.snap('reference-portrait')
  self.assertEqual(self.page.locator('#battle [class*=notch],#battle [class*=dynamic-island]').count(),0)
 def test_253_pointer_placement_uses_the_measured_camera(self):
  self.start();p=self.page
  p.evaluate("()=>{const b=RoyaleDemo.battle;b.paused=false;b.elixir[0]=10;RoyaleDemo.select(b.hand[0].findIndex(id=>!!RoyaleCore.CARD_BY_ID[id].entity));}")
  pt=p.evaluate("()=>{const r=document.getElementById('viewport').getBoundingClientRect(),a=RoyaleBattleView.toScreen({x:8.5*RoyaleCore.SX,y:23.5*RoyaleCore.SY});return{x:r.x+a.x*r.width/540,y:r.y+a.y*r.height/1172};}")
  p.mouse.click(pt['x'],pt['y']);p.evaluate('RoyaleDemo.battle.paused=true')
  self.assertIsNone(p.evaluate('RoyaleDemo.selected'));self.assertGreater(p.evaluate('RoyaleDemo.battle.metrics.spent[0]'),0)
  placed=p.evaluate("RoyaleDemo.battle.events.filter(e=>e.type==='deploy').at(-1)")
  self.assertLess(abs(placed['x']-8.5*480/18),18);self.assertLess(abs(placed['y']-23.5*20),11)
 def test_254_timer_and_identity_remain_separate_in_every_elixir_phase(self):
  self.start();p=self.page
  for t in [3,121,181,241]:
   p.evaluate("t=>{RoyaleDemo.battle.time=t;document.getElementById('enemyName').textContent='Crown Keeper with a long name';document.getElementById('enemyClan').textContent='Web Royale';RoyaleDemo.renderBattleHeader();RoyaleDemo.refreshHand(true)}",t);p.wait_for_timeout(140)
   x=p.evaluate("""()=>{const sels=['#enemyName','#enemyClan','.battle-top .full','.battle-top [data-action=pause]','#nativeBattleTimer'];return sels.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom}})}""")
   name,clan,full,pause,timer=x;self.assertLessEqual(name['right'],timer['x']+1);self.assertLessEqual(name['bottom'],clan['y']+1);self.assertLessEqual(full['bottom'],name['y']);self.assertLessEqual(pause['bottom'],timer['y'])
  self.snap('triple-elixir-header')
 def test_255_source_tower_shadow_is_real_transparent_ground_art(self):
  self.start();r=self.page.evaluate("""()=>{const lib=RoyaleDemo.native;if(typeof lib.drawTowerShadow!=='function')return{available:false};const c=document.createElement('canvas');c.width=320;c.height=220;const ctx=c.getContext('2d');ctx.translate(160,100);const t=RoyaleDemo.battle.towers.find(t=>t.king);lib.drawTowerShadow(ctx,{...t,x:0,y:0,preview:true});const d=ctx.getImageData(0,0,320,220).data;let pixels=0,opaque=0;for(let i=3;i<d.length;i+=4){if(d[i]>10)pixels++;if(d[i]>160)opaque++;}return{available:true,pixels,opaque};}""")
  self.assertTrue(r['available']);self.assertGreater(r['pixels'],300);self.assertEqual(r['opaque'],0)
 def test_256_source_jump_elevation_reaches_the_visible_renderer(self):
  self.start();p=self.page
  p.evaluate("""async()=>{const b=RoyaleDemo.battle;await RoyaleDemo.native.ensureScenes([RoyaleDemo.native.data.units.HogRider.scene]);const u=b.spawn('HogRider',0,240,342,{wait:0});const t={id:'goal',x:240,y:240,def:{radiusTiles:0}};for(let i=0;i<26;i++){b.time+=1/60;b.move(u,t,1/60);}window.__jumpId=u.id;}""")
  r=p.evaluate("()=>{const u=RoyaleDemo.battle.getEntity(__jumpId);return{h:RoyaleNative.entityElevation(u),air:u.air,p:u.riverJump?.progress}}")
  self.assertGreater(r['h'],65);self.assertFalse(r['air']);self.assertGreater(r['p'],.2);self.assertLess(r['p'],.85);self.snap('hog-river-jump')
 def test_257_all_original_arenas_load_normal_and_overtime_layers(self):
  self.start();p=self.page;rows=[]
  ids=p.evaluate('RoyaleDemo.native.data.arenas.map(a=>a.id)')
  for aid in ids:
   for overtime in [False,True]:
    row=p.evaluate("""async ([id,ot])=>{const l=RoyaleDemo.native;l.setArena(id);await l.prepareBattle(RoyaleDemo.battle,RoyaleCore.DATA);const c=document.createElement('canvas');c.width=540;c.height=960;const x=c.getContext('2d');x.translate(RoyaleBattleView.camera.x,RoyaleBattleView.camera.y);x.scale(RoyaleBattleView.camera.scale,RoyaleBattleView.camera.scale);const ok=l.drawArena(x,3,ot);const a=x.getImageData(0,0,540,960).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return{id,ot,ok,visible:n,image:c.toDataURL().split(',')[1]};}""",[aid,overtime])
    (OUT/('arena-'+aid+('-overtime' if overtime else '')+'.png')).write_bytes(base64.b64decode(row.pop('image')));rows.append(row);self.assertTrue(row['ok']);self.assertGreater(row['visible'],390000,aid)
  (OUT/'arena-audit.json').write_text(json.dumps(rows,indent=2));self.assertEqual(len(rows),30)
 def test_258_match_results_fit_the_taller_frame(self):
  self.start();p=self.page;p.evaluate("()=>{const b=RoyaleDemo.battle;b.finish(0,'QA result');b.crowns=[3,0];RoyaleDemo.beginEndFlow();}");p.wait_for_timeout(4200)
  self.assertTrue(p.locator('#endOk').is_visible());a=p.locator('#endOk').bounding_box();v=p.locator('#viewport').bounding_box();self.assertGreaterEqual(a['y'],v['y']);self.assertLessEqual(a['y']+a['height'],v['y']+v['height']);self.snap('result');p.click('#endOk');self.assertEqual(p.evaluate('RoyaleDemo.screen'),'home')
 def test_259_no_script_errors_or_missing_files(self):
  self.assertEqual(fixture.BrowserV200.errors,[]);self.assertEqual(fixture.BrowserV200.missing,[])
if __name__=='__main__':unittest.main(verbosity=2)
