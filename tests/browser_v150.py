"""Focused v0.15 packaged-browser checks for arena eligibility + chest discovery."""
import unittest,os,mimetypes
from pathlib import Path
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];OUT=R/'docs/qa/v150/browser';OUT.mkdir(parents=True,exist_ok=True)

class BrowserV150(unittest.TestCase):
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
  cls.page.wait_for_function('window.RoyaleDemo && document.getElementById("loading").classList.contains("hidden")',timeout=90000)
 @classmethod
 def tearDownClass(cls):
  cls.browser.close();cls.p.stop()
 def setUp(self): self.page.evaluate("RoyaleDemo.show('home')")
 def test_150_reached_bats_arena_is_discoverable_but_not_usable(self):
  r=self.page.evaluate("""()=>{const t=RoyaleProgression.ARENAS[4].trophies,p=RoyaleProfile.normalizeProfile({version:6,trophies:t,highestTrophies:t,unlockedCards:[...RoyaleCore.DEFAULT_DECK]});RoyaleDemo.applyProfile(p);RoyaleDemo.show('cards');RoyaleDemo.details('bats');return {use:RoyaleCore.canUseCard(RoyaleDemo.profile,'bats'),tile:[...document.querySelectorAll('#collectionGrid [data-id=bats]')][0]?.innerText||'',detail:document.getElementById('modalPanel').innerText,disabled:document.querySelector('#modalPanel [data-action=use-card]').disabled};}""")
  self.assertFalse(r['use']);self.assertIn('Find in Chests',r['tile']);self.assertIn('Find this card in a chest',r['detail']);self.assertTrue(r['disabled'])
 def test_151_old_chest_expands_and_first_bats_copy_unlocks(self):
  r=self.page.evaluate("""()=>{const t=RoyaleProgression.ARENAS[4].trophies,p=RoyaleProfile.normalizeProfile({version:6,trophies:t,highestTrophies:t,unlockedCards:[...RoyaleCore.DEFAULT_DECK],chests:[{id:'bats-0',kind:'silver',arenaNumber:1,unlockAt:1}]});const opened=RoyaleEconomy.openChest(p,'bats-0',2);RoyaleDemo.applyProfile(opened.profile);RoyaleDemo.details('bats');return {cards:opened.reward.cards,use:RoyaleCore.canUseCard(RoyaleDemo.profile,'bats'),disabled:document.querySelector('#modalPanel [data-action=use-card]').disabled};}""")
  self.assertTrue(any(x['id']=='bats' and x['count']>=1 for x in r['cards']));self.assertTrue(r['use']);self.assertFalse(r['disabled'])
 def test_152_old_chest_slot_displays_current_expanded_pool_arena(self):
  text=self.page.evaluate("""()=>{const t=RoyaleProgression.ARENAS[4].trophies,p=RoyaleProfile.normalizeProfile({version:6,trophies:t,highestTrophies:t,unlockedCards:[...RoyaleCore.DEFAULT_DECK],chests:[{id:'old',kind:'gold',arenaNumber:1,unlockAt:0}]});RoyaleDemo.applyProfile(p);RoyaleDemo.show('home');return document.querySelector('#chestSlots [data-id=old]').innerText;}""")
  self.assertIn('Arena 5',text)
  self.page.locator('#viewport').screenshot(path=str(OUT/'home-arena5-chest.png'))
 def test_153_packaged_page_has_no_new_errors_or_missing_files(self):
  self.assertEqual(self.errors,[]);self.assertEqual(self.missing,[])

if __name__=='__main__':unittest.main(verbosity=2)
