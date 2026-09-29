"""Focused v0.18 packaged-browser checks for spell FX, crown awards, and native-style match end."""
import unittest,os,mimetypes
from pathlib import Path
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];OUT=R/'docs/qa/v180/browser';OUT.mkdir(parents=True,exist_ok=True)

class BrowserV180(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
  cls.page=cls.browser.new_page(viewport={'width':1440,'height':960},has_touch=True);cls.errors=[];cls.missing=[]
  cls.page.on('pageerror',lambda e:cls.errors.append(str(e)));cls.page.set_default_timeout(30000)
  def serve(route):
   url=route.request.url
   if not url.startswith('https://webroyale.test/'):
    cls.missing.append(url);route.abort();return
   name=unquote(urlparse(url).path).lstrip('/') or 'index.html';f=R/'dist'/name
   if not f.exists(): cls.missing.append(url);route.fulfill(status=404,body='Not found');return
   route.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream',headers={'Access-Control-Allow-Origin':'*'})
  cls.page.route('**/*',serve)
  cls.page.evaluate("window.__saveMemory={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>window.__saveMemory[k]||null,setItem:(k,v)=>window.__saveMemory[k]=String(v),removeItem:k=>delete window.__saveMemory[k]}})")
  html=(R/'dist/index.html').read_text().replace('<head>','<head><base href="https://webroyale.test/">')
  cls.page.set_content(html,wait_until='load',timeout=90000)
  cls.page.wait_for_function('window.RoyaleDemo && window.RoyaleFX && document.getElementById("loading").classList.contains("hidden")',timeout=90000)
 @classmethod
 def tearDownClass(cls): cls.browser.close();cls.p.stop()
 def snap(self,name): self.page.locator('#viewport').screenshot(path=str(OUT/name))

 def test_180_spell_families_render_their_actual_projectile_or_area_animation(self):
  r=self.page.evaluate("""async()=>{const cases=[['fireball',.45],['freeze',.75],['zap',.75],['poison',.75],['arrows',.35],['graveyard',3.0]],fill=['knight','archers','cannon','musketeer','bomber','giant','mini-pekka'],out={};for(const [id,until] of cases){const deck=[id,...fill.filter(x=>x!==id)].slice(0,8),b=new RoyaleBattle.Battle({ai:false,deck,shuffle:false});await RoyaleDemo.native.prepareBattle(b,RoyaleCore.DATA);b.elixir[0]=10;const before=RoyaleNative.library.fx.summary().sprites,rr=b.deploy(0,0,9*RoyaleCore.SX,10*RoyaleCore.SY),cv=document.getElementById('battleCanvas'),ctx=cv.getContext('2d');while(b.time<until&&!b.result)b.step(1/60);b.visualTime=b.time;RoyaleDraw.battle(ctx,b,b.time,null,null,1);const summary=RoyaleNative.library.fx.summary();out[id]={ok:rr.ok,sprites:summary.sprites-before,effects:b.effects.filter(e=>e.sourceEffect).map(e=>e.sourceEffect),areas:b.areas.map(a=>a.name),projectiles:b.projectiles.map(p=>p.name),missing:summary.missing.slice()};}return out;}""")
  for cid,v in r.items():
   self.assertTrue(v['ok'],cid);self.assertGreater(v['sprites'],0,cid);self.assertEqual(v['missing'],[],cid)
  self.assertIn('Freeze',r['freeze']['areas']);self.assertIn('Poison',r['poison']['areas']);self.assertIn('Spell_zap_effect',r['zap']['effects']);self.assertIn('Graveyard_appear',r['graveyard']['effects'])
  self.snap('spell-source-effects.png')

 def test_181_destroyed_tower_uses_source_crown_animation(self):
  r=self.page.evaluate("""async()=>{RoyaleDemo.show('battle');const b=new RoyaleBattle.Battle({ai:false});await RoyaleDemo.native.prepareBattle(b,RoyaleCore.DATA);const t=b.towers.find(x=>x.team===1&&!x.king);t.hp=1;b.damage(t,10,b.makeEntity('Knight',0,t.x,t.y,{level:9,wait:0}));b.deaths();b.visualTime=b.time+.72;const before=RoyaleNative.library.fx.summary().sprites,cv=document.getElementById('battleCanvas');RoyaleDraw.battle(cv.getContext('2d'),b,b.visualTime,null,null,1);const after=RoyaleNative.library.fx.summary();return{crowns:b.crowns[0],source:b.effects.some(e=>e.sourceEffect==='crown_tower_death1'),award:b.effects.some(e=>e.kind==='crownAward'),sprites:after.sprites-before,missing:after.missing.filter(x=>/crown/i.test(x)),touchdown:[...RoyaleDemo.native.scenes.effects.frameSamples].some(x=>x.startsWith(String(RoyaleDemo.native.scenes.effects.data.exports.crown_appear_touchdown)+':'))};}""")
  self.assertEqual(r['crowns'],1);self.assertTrue(r['source']);self.assertTrue(r['award']);self.assertGreater(r['sprites'],0);self.assertEqual(r['missing'],[]);self.assertTrue(r['touchdown']);self.snap('tower-crown-award.png')

 def test_182_match_over_transitions_to_native_result_board_not_pause_modal(self):
  self.page.evaluate("""async()=>{await RoyaleDemo.startBattle('Default',true);const b=RoyaleDemo.battle,k=b.towers.find(t=>t.team===1&&t.king);k.hp=0;b.deaths();b.checkResult();}""")
  self.page.wait_for_selector('#matchEnd:not([hidden])')
  self.page.wait_for_timeout(220);self.assertTrue(self.page.locator('#matchOverText').is_visible());self.assertEqual(self.page.locator('.overlay.open').count(),0);self.snap('match-over.png')
  self.page.wait_for_timeout(1100)
  state=self.page.evaluate("""()=>{const cv=document.getElementById('matchResultCanvas'),d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let alpha=0;for(let i=3;i<d.length;i+=64)alpha+=d[i];return{source:!!RoyaleDemo.native.scenes.ui_battle_end,alpha,modal:document.querySelectorAll('.overlay.open').length};}""")
  self.assertTrue(state['source']);self.assertGreater(state['alpha'],0);self.assertEqual(state['modal'],0);self.snap('result-board-source.png')
  self.page.wait_for_timeout(1500);self.snap('crowns-source.png')
  self.page.wait_for_timeout(1450);self.assertTrue(self.page.locator('#endOk').is_visible());self.snap('winner-source.png')
  self.page.locator('#endOk').click();self.page.wait_for_function("RoyaleDemo.screen==='home'")

 def test_183_all_non_mirror_spells_have_a_visible_source_animation_path(self):
  r=self.page.evaluate("""async()=>{const ids=RoyaleCore.CARDS.filter(c=>c.kind==='Spell'&&c.id!=='mirror').map(c=>c.id),fill=['knight','archers','cannon','musketeer','bomber','giant','mini-pekka'],out={};for(const id of ids){const b=new RoyaleBattle.Battle({ai:false,deck:[id,...fill].slice(0,8),shuffle:false});await RoyaleDemo.native.prepareBattle(b,RoyaleCore.DATA);let targetY=10*RoyaleCore.SY;b.spawn('Knight',1,9*RoyaleCore.SX,targetY,{level:9,wait:0});b.spawn('Knight',0,8.3*RoyaleCore.SX,targetY,{level:9,wait:0});b.elixir[0]=10;let rr=null;for(const y of [10,22,28,16]){rr=b.deploy(0,0,9*RoyaleCore.SX,y*RoyaleCore.SY);if(rr.ok){targetY=y*RoyaleCore.SY;break;}}const before=RoyaleNative.library.fx.summary().sprites,missingBefore=new Set(RoyaleNative.library.fx.summary().missing),cv=document.getElementById('battleCanvas'),ctx=cv.getContext('2d');for(let i=0;i<210;i++){b.step(1/60);if(i%10===0){b.visualTime=b.time;RoyaleDraw.battle(ctx,b,b.time,null,null,1);}}const summary=RoyaleNative.library.fx.summary();out[id]={ok:!!rr?.ok,sprites:summary.sprites-before,missing:summary.missing.filter(x=>!missingBefore.has(x))};}return out;}""")
  for cid,v in r.items():
   self.assertTrue(v['ok'],cid);self.assertGreater(v['sprites'],0,cid);self.assertEqual(v['missing'],[],cid)

 def test_184_packaged_page_has_no_errors_or_missing_files(self):
  self.assertEqual(self.errors,[]);self.assertEqual(self.missing,[])

if __name__=='__main__': unittest.main(verbosity=2)
