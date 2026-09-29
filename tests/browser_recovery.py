"""Packaging recovery checks against the actual reassembled offline distribution."""
import unittest,json,hashlib,re
from pathlib import Path
import browser_v200 as fixture
R=Path(__file__).resolve().parents[1];OUT=R/'docs/qa/archive-recovery';OUT.mkdir(parents=True,exist_ok=True)
class RecoveryBrowser(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  fixture.BrowserV200.setUpClass();cls.page=fixture.BrowserV200.page
 @classmethod
 def tearDownClass(cls):
  (OUT/'browser-errors.json').write_text(json.dumps({'errors':fixture.BrowserV200.errors,'missing':fixture.BrowserV200.missing},indent=2));fixture.BrowserV200.tearDownClass()
 def setUp(self):
  self.page.set_viewport_size({'width':1200,'height':960});self.page.evaluate("RoyaleDemo.show('home');RoyaleDemo.applyProfile({...RoyaleCore.normalizeProfile(),trophies:5300,highestTrophies:5300,gold:999999,gems:10000,experience:168770});")
 def snap(self,n):
  self.page.wait_for_timeout(180);self.page.locator('#viewport').screenshot(path=str(OUT/(n+'.png')))
 def test_01_current_build_integrity_and_recovered_catalog_preserved(self):
  release=json.loads((R/'dist/release.json').read_text())
  self.assertEqual(release['version'],json.loads((R/'package.json').read_text())['version'])
  self.assertEqual(hashlib.sha256((R/'dist'/release['app']).read_bytes()).hexdigest(),release['files'][release['app']])
  r=self.page.evaluate('({cards:RoyaleCore.CARDS.length,players:RoyaleWorld.PLAYER_COUNT,clans:RoyaleWorld.CLAN_COUNT,emotes:RoyaleBundle.emotes.entries.length,friends:RoyaleDemo.profile.world.friends})')
  self.assertEqual(r,{'cards':102,'players':4000000,'clans':50000,'emotes':206,'friends':[]})
 def test_02_hour_shop_has_twelve_correct_rows(self):
  p=self.page;p.evaluate("RoyaleDemo.show('shop')");p.wait_for_timeout(200)
  self.assertEqual(p.locator('.shop-deals-section .shop-offer').count(),12)
  self.assertEqual(p.locator('.shop-deals-section .shop-offer').evaluate_all('(els)=>els.map(e=>e.dataset.rarity)'),['Common']*3+['Rare']*3+['Epic']*3+['Legendary']*3)
  self.assertIn('Hour Shop',p.locator('.shop-deals-section').inner_text());self.assertRegex(p.locator('#shopRefresh').inner_text(),r'^\d{2}:\d{2}:\d{2}$')
  self.assertEqual(p.locator('#shopContent #currencySection,#shopContent .gem-packs,.resource .plus').count(),0)
  b=p.locator('[data-action="buy-card"]').first;b.click();self.assertIn('Cards Purchased',p.locator('#modalPanel').inner_text());self.snap('hour-shop')
 def test_03_magic_item_original_images_and_actual_use(self):
  p=self.page;p.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,magicItems:{'common-book':1,'magic-coin':1,'chest-key':1},copies:{knight:0},cardLevels:{knight:4},chests:[{id:'key',kind:'gold',winsProgress:0}]});RoyaleDemo.show('cards');RoyaleDemo.librarySection('magic-items')")
  p.wait_for_timeout(200);self.assertTrue(p.locator('.magic-item-art').evaluate_all('(a)=>a.every(im=>im.complete&&im.naturalWidth>0)'))
  self.snap('magic-items');p.click('[data-action="magic-item"][data-id="common-book"]');p.select_option('#magicTarget','knight');p.click('[data-action="use-magic-item"]');self.assertEqual(p.evaluate('RoyaleDemo.profile.magicItems["common-book"]'),0)
  p.click('[data-action="magic-item"][data-id="magic-coin"]');p.select_option('#magicTarget','knight');p.click('[data-action="use-magic-item"]');self.assertEqual(p.evaluate('RoyaleDemo.profile.cardLevels.knight'),5)
  p.click('[data-action="magic-item"][data-id="chest-key"]');p.select_option('#magicTarget','key');p.click('[data-action="use-magic-item"]');self.assertTrue(p.evaluate('RoyaleEconomy.chestReady(RoyaleDemo.profile.chests[0])'))
 def test_04_new_clan_starts_empty_and_chat_sends(self):
  p=self.page;p.evaluate("RoyaleDemo.show('clan');RoyaleDemo.social.createClan()");p.fill('#newClanName','Recovery Knights');p.fill('#newClanDescription','Fresh clan');p.click('[data-action="soc-confirm-create"]');p.wait_for_timeout(200)
  r=p.evaluate('(()=>{const p=RoyaleDemo.profile,c=RoyaleWorld.clan(p,p.world.currentClan);return {members:c.count,messages:c.messages.length,friends:p.world.friends.length};})()')
  self.assertEqual(r,{'members':1,'messages':0,'friends':0});self.snap('new-clan');p.evaluate("RoyaleDemo.show('clanChat')");p.fill('#ecoChatInput','Testing the recovered build');p.click('[data-action="soc-send"]');self.assertIn('Testing the recovered build',p.locator('#clanChatContent').inner_text());self.snap('chat')
 def test_05_generated_clan_war_and_profiles(self):
  p=self.page;p.evaluate("()=>{const p=RoyaleDemo.profile,c=RoyaleWorld.browseClans(p,{limit:12}).find(c=>c.type==='Open'&&c.count<50&&c.requiredTrophies<=p.trophies);if(!c)throw Error('No eligible clan');const r=RoyaleWorld.joinClan(p,c.id);if(!r.ok)throw Error(r.reason);RoyaleDemo.applyProfile(r.profile);RoyaleDemo.show('clan');}")
  self.snap('social');p.evaluate("RoyaleDemo.show('clanChat')");p.wait_for_timeout(300);self.snap('clan-chat');self.assertTrue(p.locator('#ecoChatInput').is_visible());p.evaluate("RoyaleDemo.social.war('river')");self.assertEqual(p.locator('.war-boat-row').count(),5);self.snap('clan-wars')
  p.click('[data-action="soc-war-tab"][data-id="decks"]');self.assertEqual(p.locator('.war-deck').count(),4)
 def test_06_training_uses_level_nine_and_camera_preserved(self):
  p=self.page;p.evaluate("async()=>{await RoyaleDemo.startBattle('Default',true);RoyaleDemo.battle.paused=true;RoyaleDemo.battle.ai=false;}");p.wait_for_timeout(250)
  self.assertEqual(p.evaluate('RoyaleDemo.battle.towers.map(t=>t.level)'),[9]*6)
  self.assertAlmostEqual(p.evaluate('RoyaleBattleView.camera.scale'),1.1418504387711865,places=6);self.snap('arena')
  p.evaluate("()=>{const b=RoyaleDemo.battle;b.paused=false;b.elixir[0]=10;RoyaleDemo.select(b.hand[0].findIndex(id=>!!RoyaleCore.CARD_BY_ID[id].entity));}")
  pt=p.evaluate("()=>{const r=document.getElementById('viewport').getBoundingClientRect(),a=RoyaleBattleView.toScreen({x:8.5*RoyaleCore.SX,y:23.5*RoyaleCore.SY});return{x:r.x+a.x*r.width/540,y:r.y+a.y*r.height/1172};}")
  p.mouse.click(pt['x'],pt['y']);p.evaluate('RoyaleDemo.battle.paused=true');self.assertIsNone(p.evaluate('RoyaleDemo.selected'));self.assertGreater(p.evaluate('RoyaleDemo.battle.metrics.spent[0]'),0)
 def test_07_all_emote_entries_have_local_scene_and_icon_files(self):
  release=json.loads((R/'dist/release.json').read_text());runtime=json.loads((R/'dist'/release['runtime']).read_text())
  self.assertEqual(len(runtime['emotes']['entries']),206)
  for name,filename in runtime['emotes']['scenes'].items():self.assertTrue((R/'dist'/filename.split('?')[0]).is_file(),name)
  p=self.page;p.evaluate("RoyaleDemo.show('cards');RoyaleDemo.librarySection('emotes')");p.locator('#cosmeticCollection [data-action="collection-emote"]').first.click();p.wait_for_timeout(400);self.snap('emote')
 def test_08_no_script_errors_or_missing_assets(self):
  self.assertEqual(fixture.BrowserV200.errors,[]);self.assertEqual(fixture.BrowserV200.missing,[])
if __name__=='__main__':unittest.main(verbosity=2)
