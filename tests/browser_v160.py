"""Focused v0.16 packaged-browser checks for Clash-style placement/combat fidelity."""
import unittest,os,mimetypes
from pathlib import Path
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];OUT=R/'docs/qa/v160/browser';OUT.mkdir(parents=True,exist_ok=True)

class BrowserV160(unittest.TestCase):
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
  cls.page.wait_for_function('window.RoyaleDemo && window.RoyaleArenaGrid && window.RoyalePlacement && window.RoyalePathing && document.getElementById("loading").classList.contains("hidden")',timeout=90000)
 @classmethod
 def tearDownClass(cls): cls.browser.close();cls.p.stop()
 def draw(self,setup):
  result=self.page.evaluate(setup)
  self.page.locator('#viewport').screenshot(path=str(OUT/(result.pop('_shot'))))
  return result
 def test_160_cannon_preview_snaps_and_shows_native_style_range(self):
  r=self.draw("""()=>{RoyaleDemo.show('battle');const d=['cannon','knight','archers','giant','musketeer','bomber','fireball','arrows'],b=new RoyaleBattle.Battle({ai:false,deck:d}),x=7.13*RoyaleCore.SX,y=23.77*RoyaleCore.SY,f=b.placementPreview(0,0,x,y),cv=document.getElementById('battleCanvas'),ctx=cv.getContext('2d');RoyaleDraw.battle(ctx,b,b.time,{x:f.x,y:f.y},0,1);return{x:f.x/RoyaleCore.SX,y:f.y/RoyaleCore.SY,range:f.range,ok:f.ok,_shot:'cannon-placement.png'};}""")
  self.assertTrue(r['ok']);self.assertAlmostEqual(r['x']%1,.5,places=6);self.assertAlmostEqual(r['y']%1,.5,places=6);self.assertGreater(r['range'],0)
 def test_161_target_warning_matches_post_deploy_target(self):
  r=self.draw("""()=>{RoyaleDemo.show('battle');const d=['knight','cannon','archers','giant','musketeer','bomber','fireball','arrows'],b=new RoyaleBattle.Battle({ai:false,deck:d}),enemy=b.makeEntity('Knight',1,9*RoyaleCore.SX,14*RoyaleCore.SY,{level:9,wait:0});b.units.push(enemy);const f=b.placementPreview(0,0,9*RoyaleCore.SX,18*RoyaleCore.SY),warn=f.retargeting.some(x=>x.id===enemy.id),cv=document.getElementById('battleCanvas');RoyaleDraw.battle(cv.getContext('2d'),b,b.time,{x:f.x,y:f.y},0,1);const placedPreview={x:f.x,y:f.y};const result=b.deploy(0,0,f.x,f.y);b.step(.05);const placed=b.units.filter(u=>u.team===0&&u.card==='knight').at(-1);return{warn,target:enemy.targetId,placed:placed?.id||null,ok:result.ok,_shot:'target-warning.png'};}""")
  self.assertTrue(r['ok']);self.assertTrue(r['warn']);self.assertEqual(r['target'],r['placed'])
 def test_162_fireball_highlights_only_affected_entities(self):
  r=self.draw("""()=>{RoyaleDemo.show('battle');const d=['fireball','knight','archers','giant','musketeer','bomber','zap','arrows'],b=new RoyaleBattle.Battle({ai:false,deck:d}),a=b.makeEntity('Knight',1,9*RoyaleCore.SX,12*RoyaleCore.SY,{level:9,wait:0}),far=b.makeEntity('Knight',1,14*RoyaleCore.SX,12*RoyaleCore.SY,{level:9,wait:0});b.units.push(a,far);const f=b.placementPreview(0,0,9*RoyaleCore.SX,12*RoyaleCore.SY),cv=document.getElementById('battleCanvas');RoyaleDraw.battle(cv.getContext('2d'),b,b.time,{x:f.x,y:f.y},0,1);return{affected:f.affected.map(x=>x.id),inside:a.id,outside:far.id,_shot:'spell-highlight.png'};}""")
  self.assertIn(r['inside'],r['affected']);self.assertNotIn(r['outside'],r['affected'])
 def test_163_princess_live_shot_deals_damage(self):
  r=self.page.evaluate("""()=>{const b=new RoyaleBattle.Battle({ai:false}),p=b.makeEntity('Princess',0,9*RoyaleCore.SX,20*RoyaleCore.SY,{level:9,wait:0}),t=b.makeEntity('Knight',1,9*RoyaleCore.SX,15*RoyaleCore.SY,{level:9,wait:0});b.units.push(p,t);const hp=t.hp;p.targetId=t.id;b.strike(p,t);for(let i=0;i<120&&t.hp===hp;i++)b.step(.05);return{before:hp,after:t.hp};}""")
  self.assertLess(r['after'],r['before'])
 def test_164_bridge_collision_and_2v2_share_grid(self):
  r=self.draw("""()=>{RoyaleDemo.show('battle');const b=new RoyaleBattle.Battle({ai:false,mode:'TeamVsTeam'}),f=b.placementPreview(0,0,8.9*RoyaleCore.SX,23.2*RoyaleCore.SY),a=b.makeEntity('Giant',0,3.5*RoyaleCore.SX,18*RoyaleCore.SY,{level:9,wait:0}),d=b.makeEntity('Giant',1,3.5*RoyaleCore.SX,14*RoyaleCore.SY,{level:9,wait:0});b.units.push(a,d);for(let i=0;i<100;i++){a.targetId=d.id;d.targetId=a.id;b.step(.05);}const gap=Math.hypot((a.x-d.x)/RoyaleCore.SX,(a.y-d.y)/RoyaleCore.SY),cv=document.getElementById('battleCanvas');RoyaleDraw.battle(cv.getContext('2d'),b,b.time,{x:f.x,y:f.y},0,1);return{gap,min:a.def.radiusTiles+d.def.radiusTiles,teamOk:f.ok,_shot:'2v2-placement.png'};}""")
  self.assertGreaterEqual(r['gap']+1e-6,r['min']);self.assertTrue(r['teamOk'])
 def test_165_packaged_page_has_no_errors_or_missing_files(self):
  self.assertEqual(self.errors,[]);self.assertEqual(self.missing,[])

if __name__=='__main__':unittest.main(verbosity=2)
