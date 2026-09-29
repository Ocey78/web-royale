"""Packaged v0.21 deck/chest/header/emote regressions."""
import unittest,json,os
from pathlib import Path
import browser_v200 as fixture
OUT=Path(__file__).resolve().parents[1]/'docs/qa/v021/browser';OUT.mkdir(parents=True,exist_ok=True)

class BrowserV210(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  fixture.BrowserV200.setUpClass();cls.page=fixture.BrowserV200.page
 @classmethod
 def tearDownClass(cls):
  (OUT/'errors.json').write_text(json.dumps({'errors':fixture.BrowserV200.errors,'missing':fixture.BrowserV200.missing},indent=2))
  fixture.BrowserV200.tearDownClass()
 def setUp(self):
  self.page.evaluate("RoyaleDemo.show('home');RoyaleDemo.applyProfile({...RoyaleCore.normalizeProfile(),trophies:1300,highestTrophies:1300,gold:99999,gems:10000});")
 def snap(self,n):self.page.locator('#viewport').screenshot(path=str(OUT/(n+'.png')))
 def test_210_deck_pool_and_collection_membership(self):
  p=self.page;p.evaluate("RoyaleDemo.show('cards');RoyaleDemo.cardSection('decks')")
  self.assertEqual(p.locator('#deckCollectionGrid .card-tile').count(),94)
  self.assertTrue(p.evaluate("[...document.querySelectorAll('#deckCollectionGrid .card-tile')].every(c=>!RoyaleDemo.profile.decks[0].includes(c.dataset.id))"))
  self.snap('decks')
  p.locator('#deckCollectionGrid').scroll_into_view_if_needed();self.snap('deck-pool')
  p.click('#deckSegments [data-id=collection]');p.evaluate("RoyaleDemo.librarySection('cards')")
  self.assertEqual(p.locator('#collectionGrid .card-tile').count(),102)
  self.assertEqual(p.locator('#collectionGrid .deck-marker').count(),8)
  self.assertFalse(p.locator('#deckCollectionGrid').is_visible())
  self.snap('collection')
 def test_211_wins_remaining_labels(self):
  p=self.page;p.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,chests:[{id:'s',kind:'silver',winsProgress:0},{id:'g',kind:'gold',winsProgress:1},{id:'m',kind:'magic',winsProgress:4},{id:'l',kind:'legendary',winsProgress:2}]});RoyaleDemo.show('home')")
  labels=p.locator('#chestSlots .slot-header').all_inner_texts()
  self.assertEqual(labels,['Locked\n1 Win','Locked\n2 Wins','Open now!\nReady!','Locked\n8 Wins'])
  self.snap('chests')
 def test_212_preview_faces_toward_viewer(self):
  p=self.page;p.evaluate("window.__towerPreviewCalls=[];window.__oldDrawTower=RoyaleDemo.native.drawTower;RoyaleDemo.native.drawTower=function(c,t,v){if(!t.def)window.__towerPreviewCalls.push({team:t.team,heading:t.heading});return window.__oldDrawTower.call(this,c,t,v)};RoyaleDemo.show('cards');RoyaleDemo.librarySection('tower-skins')")
  p.wait_for_function("document.querySelectorAll('#cosmeticCollection canvas[data-rendered=true]').length===RoyaleMenu.towerSkins.length")
  calls=p.evaluate('window.__towerPreviewCalls');p.evaluate('()=>{RoyaleDemo.native.drawTower=window.__oldDrawTower;}')
  self.assertTrue(calls);self.assertTrue(all(x['team']==1 and x['heading']>0 for x in calls),calls)
  self.snap('front-towers')
 def test_213_white_bubble_and_replay_motion(self):
  p=self.page;p.evaluate("RoyaleDemo.show('cards');RoyaleDemo.librarySection('emotes')")
  self.assertEqual(p.locator('.emote-collection-grid .emote-bubble').count(),p.evaluate('RoyaleMenu.emotes.length'))
  p.click('[data-action=collection-emote][data-id=Emote0]')
  self.assertTrue(p.locator('#modalPanel .emote-bubble').is_visible())
  self.assertTrue(p.evaluate("getComputedStyle(document.querySelector('#modalPanel .emote-bubble'),'::before').backgroundColor==='rgb(255, 255, 255)'"))
  self.assertTrue(p.evaluate("document.querySelector('#modalPanel .emote-bubble').getAnimations({subtree:true}).length>0"))
  self.snap('emote-preview')
 def test_214_battle_header_fits_long_identity(self):
  p=self.page;p.evaluate("async()=>{await RoyaleDemo.startBattle('Default',true);RoyaleDemo.battle.paused=true;document.getElementById('enemyName').textContent='Crown Keeper';document.getElementById('enemyClan').textContent='Web Royale';if(RoyaleDemo.renderBattleHeader)RoyaleDemo.renderBattleHeader();}")
  p.wait_for_timeout(1900)
  self.assertEqual(p.locator('#enemyName canvas.battle-identity-ink').count(),1)
  layout=p.evaluate("""()=>{const sels=['#enemyName','#enemyClan','.battle-top .full','.battle-top [data-action=pause]','#nativeBattleTimer'];return Object.fromEntries(sels.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,{x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}]}))}""")
  name=layout['#enemyName'];clan=layout['#enemyClan'];button=layout['.battle-top .full'];pause=layout['.battle-top [data-action=pause]'];timer=layout['#nativeBattleTimer']
  self.assertLessEqual(button['bottom'],name['y']);self.assertLessEqual(name['right'],timer['x']);self.assertLessEqual(name['bottom'],clan['y'])
  self.assertGreaterEqual(button['w'],22);self.assertGreaterEqual(pause['h'],22);self.assertLessEqual(pause['bottom'],timer['y'])
  self.assertEqual(p.locator('#enemyName').get_attribute('title'),'Crown Keeper')
  self.snap('battle-header')
 def test_215_unselected_owned_emotes_are_accessible_in_battle(self):
  p=self.page;p.evaluate("async()=>{RoyaleDemo.applyProfile({...RoyaleDemo.profile,ownedEmotes:RoyaleMenu.emotes.map(e=>e.id),equippedEmotes:['Emote0','Emote1','Emote2','Emote3']});await RoyaleDemo.startBattle('Default',true);RoyaleDemo.battle.paused=true}")
  p.click('[data-action=quick-chat]')
  self.assertEqual(p.locator('#battleEmotes [data-action=battle-emote]').count(),4)
  self.assertEqual(p.locator('[data-action=battle-emotes-all]').count(),1)
  p.click('[data-action=battle-emotes-all]')
  self.assertEqual(p.locator('#battleEmotes [data-action=battle-emote]').count(),p.evaluate('RoyaleMenu.emotes.length'))
  p.click('#battleEmotes [data-id=Emote71]');p.wait_for_timeout(150)
  self.assertTrue(p.locator('#chatBubble .emote-bubble').is_visible());self.snap('battle-emote')
  p.wait_for_timeout(3050);self.assertFalse(p.locator('#chatBubble').is_visible())
 def test_216_deck_pool_replaces_and_refreshes_without_hiding_collection_card(self):
  p=self.page;p.evaluate("()=>{const p=RoyaleDemo.profile;RoyaleDemo.applyProfile({...p,unlockedCards:[...p.unlockedCards,'goblins']});RoyaleDemo.show('cards');RoyaleDemo.cardSection('decks')}")
  self.assertEqual(p.locator('#deckCollectionGrid [data-id=goblins]').count(),1)
  p.locator('#deckCollectionGrid [data-id=goblins]').click();p.click('#modalPanel [data-action=use-card]');p.click('#modalPanel [data-slot="0"]')
  self.assertEqual(p.locator('#deckCollectionGrid [data-id=goblins]').count(),0)
  self.assertEqual(p.locator('#deckCollectionGrid [data-id=knight]').count(),1)
  p.evaluate("RoyaleDemo.cardSection('collection');RoyaleDemo.librarySection('cards')")
  self.assertEqual(p.locator('#collectionGrid [data-id=goblins]').count(),1)
  self.assertEqual(p.locator('#collectionGrid [data-id=knight]').count(),1)
 def test_217_reduced_motion_keeps_emotes_static(self):
  p=self.page;p.emulate_media(reduced_motion='reduce')
  try:
   p.evaluate("RoyaleDemo.show('cards');RoyaleDemo.librarySection('emotes')");p.click('[data-action=collection-emote][data-id=Emote0]')
   self.assertTrue(p.locator('#modalPanel .emote-bubble').is_visible())
   self.assertEqual(p.evaluate("document.querySelector('#modalPanel .emote-bubble').getAnimations({subtree:true}).length"),0)
  finally:p.emulate_media(reduced_motion='no-preference')
 def test_218_filters_and_scroll_are_independent(self):
  p=self.page;p.evaluate("RoyaleDemo.show('cards');RoyaleDemo.cardSection('decks');document.getElementById('cardsScroll').scrollTop=144")
  p.click('#deckSegments [data-id=collection]');p.click('#collectionNav [data-id=emotes]');p.click('#deckSegments [data-id=decks]')
  self.assertEqual(p.evaluate("document.getElementById('cardsScroll').scrollTop"),144)
  p.locator('[data-action=deck-pool-filter]').click();p.fill('#deckCardSearch','goblin')
  self.assertGreater(p.locator('#deckCollectionGrid .card-tile').count(),0);self.assertLess(p.locator('#deckCollectionGrid .card-tile').count(),94)
  p.click('#deckSegments [data-id=collection]');p.click('#collectionNav [data-id=cards]')
  self.assertEqual(p.locator('#collectionGrid .card-tile').count(),102)
 def test_219_no_browser_errors(self):
  self.assertEqual(fixture.BrowserV200.errors,[]);self.assertEqual(fixture.BrowserV200.missing,[])
