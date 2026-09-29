"""Focused v0.17 packaged-browser checks for soft troop flow, source formations, and spell FX."""
import unittest,os,mimetypes
from pathlib import Path
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];OUT=R/'docs/qa/v170/browser';OUT.mkdir(parents=True,exist_ok=True)

class BrowserV170(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
  cls.page=cls.browser.new_page(viewport={'width':1440,'height':960},has_touch=True);cls.errors=[];cls.missing=[]
  cls.page.on('pageerror',lambda e:cls.errors.append(str(e)));cls.page.set_default_timeout(20000)
  def serve(route):
   url=route.request.url
   if not url.startswith('https://webroyale.test/'):
    cls.missing.append(url);route.abort();return
   name=unquote(urlparse(url).path).lstrip('/') or 'index.html';f=R/'dist'/name
   if not f.exists():cls.missing.append(url);route.fulfill(status=404,body='Not found');return
   route.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream',headers={'Access-Control-Allow-Origin':'*'})
  cls.page.route('**/*',serve)
  cls.page.evaluate("window.__saveMemory={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>window.__saveMemory[k]||null,setItem:(k,v)=>window.__saveMemory[k]=String(v),removeItem:k=>delete window.__saveMemory[k]}})")
  html=(R/'dist/index.html').read_text().replace('<head>','<head><base href="https://webroyale.test/">')
  cls.page.set_content(html,wait_until='load',timeout=90000)
  cls.page.wait_for_function('window.RoyaleDemo && window.RoyaleFormations && window.RoyalePathing && document.getElementById("loading").classList.contains("hidden")',timeout=90000)
 @classmethod
 def tearDownClass(cls): cls.browser.close();cls.p.stop()
 def snap(self,name): self.page.locator('#viewport').screenshot(path=str(OUT/name))
 def test_170_archers_preview_shows_both_source_formation_members(self):
  r=self.page.evaluate("""async()=>{RoyaleDemo.show('battle');const d=['archers','knight','giant','musketeer','bomber','fireball','arrows','cannon'],b=new RoyaleBattle.Battle({ai:false,deck:d});await RoyaleDemo.native.prepareBattle(b,RoyaleCore.DATA);const f=b.placementPreview(0,0,9*RoyaleCore.SX,24*RoyaleCore.SY),cv=document.getElementById('battleCanvas');RoyaleDraw.battle(cv.getContext('2d'),b,b.time,{x:f.x,y:f.y},0,1);return{n:f.members.length,xs:f.members.map(m=>m.x/RoyaleCore.SX),ys:f.members.map(m=>m.y/RoyaleCore.SY)};}""")
  self.assertEqual(r['n'],2);self.assertAlmostEqual(r['ys'][0],r['ys'][1],places=5);self.assertGreater(abs(r['xs'][1]-r['xs'][0]),.75);self.snap('archers-preview.png')
 def test_171_triangle_star_and_scatter_formations_are_packaged(self):
  r=self.page.evaluate("""()=>{const ids=['skeletons','goblins','barbarians','skeleton-army','royal-recruits'];return Object.fromEntries(ids.map(id=>{const c=RoyaleCore.cardAt(id,9),m=RoyaleFormations.cardMembers(c,9*RoyaleCore.SX,24*RoyaleCore.SY,0);return[id,{n:m.length,pts:m.map(x=>[x.x/RoyaleCore.SX,x.y/RoyaleCore.SY])}]}));}""")
  self.assertEqual(r['skeletons']['n'],3);self.assertEqual(r['goblins']['n'],3);self.assertEqual(r['barbarians']['n'],5);self.assertEqual(r['skeleton-army']['n'],15);self.assertEqual(r['royal-recruits']['n'],6)
 def test_172_live_multiunit_deploy_matches_preview(self):
  r=self.page.evaluate("""async()=>{const d=['goblin-gang','knight','giant','musketeer','bomber','fireball','arrows','cannon'],b=new RoyaleBattle.Battle({ai:false,deck:d});await RoyaleDemo.native.prepareBattle(b,RoyaleCore.DATA);const f=b.placementPreview(0,0,9*RoyaleCore.SX,24*RoyaleCore.SY),ok=b.deploy(0,0,f.x,f.y).ok,live=b.units.filter(u=>u.card==='goblin-gang');return{ok,preview:f.members.map(m=>[m.entity,m.x,m.y]),live:live.map(m=>[m.entity,m.x,m.y])};}""")
  self.assertTrue(r['ok']);self.assertEqual(len(r['preview']),5);self.assertEqual(r['preview'],r['live'])
 def test_173_opposing_troops_flow_past_in_open_lane_but_buildings_remain_hard(self):
  r=self.page.evaluate("""()=>{const b=new RoyaleBattle.Battle({ai:false}),a=b.makeEntity('Knight',0,9*RoyaleCore.SX,21*RoyaleCore.SY,{level:9,wait:0}),d=b.makeEntity('Knight',1,9*RoyaleCore.SX,19*RoyaleCore.SY,{level:9,wait:0});b.units.push(a,d);for(let i=0;i<100;i++){b.move(a,{id:-1,x:9*RoyaleCore.SX,y:14*RoyaleCore.SY,def:{radiusTiles:0}},.05);b.move(d,{id:-2,x:9*RoyaleCore.SX,y:26*RoyaleCore.SY,def:{radiusTiles:0}},.05);b.separate();}return{ay:a.y/RoyaleCore.SY,dy:d.y/RoyaleCore.SY,ax:a.x/RoyaleCore.SX,dx:d.x/RoyaleCore.SX};}""")
  self.assertLess(r['ay'],19);self.assertGreater(r['dy'],21);self.assertNotAlmostEqual(r['ax'],r['dx'],places=2)
 def test_174_fireball_uses_moving_source_projectile_and_source_trail(self):
  r=self.page.evaluate("""async()=>{RoyaleDemo.show('battle');const d=['fireball','knight','archers','giant','musketeer','bomber','arrows','cannon'],b=new RoyaleBattle.Battle({ai:false,deck:d});await RoyaleDemo.native.prepareBattle(b,RoyaleCore.DATA);const ok=b.deploy(0,0,9*RoyaleCore.SX,10*RoyaleCore.SY).ok;for(let i=0;i<8;i++)b.step(.05);const p=b.projectiles[0],cfg=RoyaleCore.DATA.projectiles[p?.name],fx=RoyaleNative.library.fx,before=fx.summary().sprites,cv=document.getElementById('battleCanvas');RoyaleDraw.battle(cv.getContext('2d'),b,b.time,null,null,1);const after=fx.summary().sprites;return{ok,name:p?.name,trail:cfg?.TrailEffect,hit:cfg?.HitEffect,moved:p?Math.hypot(p.x-p.startX,p.y-p.startY):0,sprites:after-before};}""")
  self.assertTrue(r['ok']);self.assertEqual(r['name'],'FireballSpell');self.assertEqual(r['trail'],'FireballEmitter');self.assertEqual(r['hit'],'Fireball_explosion');self.assertGreater(r['moved'],0);self.assertGreater(r['sprites'],0);self.snap('fireball-flight.png')

 def test_175_fireball_impact_uses_source_explosion_graph(self):
  r=self.page.evaluate("""async()=>{RoyaleDemo.show('battle');const d=['fireball','knight','archers','giant','musketeer','bomber','arrows','cannon'],b=new RoyaleBattle.Battle({ai:false,deck:d});await RoyaleDemo.native.prepareBattle(b,RoyaleCore.DATA);const victim=b.makeEntity('Knight',1,9*RoyaleCore.SX,10*RoyaleCore.SY,{level:9,wait:0});b.units.push(victim);b.deploy(0,0,9*RoyaleCore.SX,10*RoyaleCore.SY);for(let i=0;i<100&&b.projectiles.length;i++)b.step(.05);b.step(.12);const impact=b.effects.filter(e=>e.sourceEffect==='Fireball_explosion').at(-1),before=RoyaleNative.library.fx.summary().sprites,cv=document.getElementById('battleCanvas');RoyaleDraw.battle(cv.getContext('2d'),b,b.time,null,null,1);const after=RoyaleNative.library.fx.summary();return{impact:!!impact,hp:victim.hp,source:impact?.sourceEffect,sprites:after.sprites-before,missing:after.missing.filter(x=>/fireball|explosion/i.test(x))};}""")
  self.assertTrue(r['impact']);self.assertEqual(r['source'],'Fireball_explosion');self.assertGreater(r['sprites'],0);self.assertEqual(r['missing'],[]);self.snap('fireball-impact.png')
 def test_176_packaged_page_has_no_errors_or_missing_files(self):
  self.assertEqual(self.errors,[]);self.assertEqual(self.missing,[])

if __name__=='__main__':unittest.main(verbosity=2)
