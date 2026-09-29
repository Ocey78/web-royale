"""Screenshot-led UI checks plus the retained v0.6 gameplay/asset regressions.
The inherited fixture uses the exact distributed files over local intercepted URLs.
The changed selector paths below follow the new Collection filter and Clan Chat sheet.
"""
import unittest,json
import browser_v060 as old
import browser_v050 as base
base.OUT=base.R/'docs/qa/v070/browser';base.OUT.mkdir(parents=True,exist_ok=True)
class BrowserTests(old.BrowserTests):
 def test_03_search(self):
  self.page.evaluate("RoyaleDemo.show('cards')")
  if not self.page.locator('#cardSearch').is_visible():self.page.click('[data-action="collection-filter"]')
  self.page.fill('#cardSearch','Electro');self.assertEqual(self.page.locator('#collectionGrid .card-tile').count(),4)
  self.page.fill('#cardSearch','');self.assertEqual(self.page.locator('#collectionGrid .card-tile').count(),102)
  self.page.click('[data-action="collection-filter"]');self.page.evaluate("RoyaleDemo.cardSection('decks')")
 def test_08_clan(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,clan:null});RoyaleDemo.show('clan')")
  self.page.click('[data-action="join-options"]');self.page.click('[data-action="join-clan"]')
  self.page.click('[data-action="chat-compose"]');self.page.fill('#chatInput','Ready for a friendly battle');self.page.locator('#chatForm button').click()
  self.assertIn('Ready for a friendly battle',self.page.locator('#clanChatContent').inner_text())
  self.page.screenshot(path=str(base.OUT/'clan-chat.png'))
 def test_09_clan_donation(self):
  self.page.evaluate("RoyaleDemo.show('clanChat')")
  before=self.page.evaluate('RoyaleDemo.profile.clan.donations');self.page.click('[data-action="chat-more"]');self.page.click('[data-action="donate"]')
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.clan.donations'),before+1)
 def test_38_collection_and_menu_content_stays_inside_portrait(self):
  self.page.evaluate("RoyaleDemo.show('cards');RoyaleDemo.cardSection('collection')")
  if not self.page.locator('#cardSearch').is_visible():self.page.click('[data-action="collection-filter"]')
  v=self.page.locator('#viewport').bounding_box()
  for sel in ['#deckTabs','#deckGrid','.collection-tools','#cardsDone']:
   r=self.page.locator(sel).bounding_box();self.assertGreaterEqual(r['x'],v['x']-.5);self.assertLessEqual(r['x']+r['width'],v['x']+v['width']+.5)
  self.page.click('[data-action="collection-filter"]');self.page.evaluate("RoyaleDemo.cardSection('decks')")
  self.page.wait_for_function("[...document.querySelectorAll('#deckGrid img')].every(x=>x.complete&&x.naturalWidth>0)")
  self.page.screenshot(path=str(base.OUT/'cards-framed.png'))
 def test_62_bottom_navigation_not_clipped_on_any_page(self):
  for name in ['home','shop','clan','events']:
   self.page.evaluate('(s)=>RoyaleDemo.show(s)',name)
   metrics=self.page.evaluate("""s=>{const p=document.getElementById(s),r=document.getElementById('viewport').getBoundingClientRect();return [...p.querySelectorAll('.nav-btn')].map(b=>{const a=b.getBoundingClientRect();return {inside:a.left>=r.left-.5&&a.right<=r.right+.5&&a.bottom<=r.bottom+.5,height:a.height};});}""",name)
   self.assertEqual(len(metrics),5);self.assertTrue(all(x['inside'] and x['height']>=45 for x in metrics),str((name,metrics)))
  self.page.evaluate("RoyaleDemo.show('cards')");self.assertTrue(self.page.locator('#cardsDone button').is_visible());self.assertEqual(self.page.locator('#cards .nav-btn').count(),0)
 def test_72_deck_tab_and_collection_sheet_are_live(self):
  self.page.evaluate("RoyaleDemo.show('cards');RoyaleDemo.cardSection('decks')")
  self.page.click('#deckSegments [data-id="collection"]');self.assertEqual(self.page.locator('#deckSegments [aria-selected="true"]').get_attribute('data-id'),'collection')
  self.page.click('#deckSegments [data-id="decks"]');self.assertLess(self.page.locator('#cardsScroll').evaluate('(e)=>e.scrollTop'),2)
  self.page.click('#deckTabs [data-index="2"]');self.assertEqual(self.page.evaluate('RoyaleDemo.profile.activeDeck'),2)
  self.page.click('#cardsDone button');self.assertEqual(self.page.evaluate('RoyaleDemo.screen'),'home')
 def test_73_two_card_swap_persists_without_mutating_roster(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,decks:RoyaleCore.PRESETS,activeDeck:0});RoyaleDemo.show('cards');RoyaleDemo.cardSection('decks')")
  before=self.page.evaluate('RoyaleDemo.profile.decks[0].slice()')
  self.page.click('[data-action="deck-swap"]');self.page.click('#deckGrid [data-slot="0"]');self.page.click('#deckGrid [data-slot="7"]')
  after=self.page.evaluate('RoyaleDemo.profile.decks[0].slice()');self.assertEqual(after[0],before[7]);self.assertEqual(after[7],before[0]);self.assertEqual(set(after),set(before))
  self.assertFalse(self.page.locator('#deckSwapHint').is_visible());self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('web-royale-classic-v4')).decks[0]"),after)
 def test_74_collection_filters_sort_reverse_and_empty_query(self):
  self.page.evaluate("RoyaleDemo.show('cards');RoyaleDemo.cardSection('collection')")
  if not self.page.locator('#cardSearch').is_visible():self.page.click('[data-action="collection-filter"]')
  self.page.select_option('#rarityFilter','Legendary');self.assertEqual(self.page.locator('#collectionGrid .card-tile').count(),self.page.evaluate("RoyaleCore.CARDS.filter(c=>c.rarity==='Legendary').length"))
  self.page.fill('#cardSearch','<img onerror=alert(1)>');self.assertEqual(self.page.locator('#collectionGrid .card-tile').count(),0)
  self.page.fill('#cardSearch','');self.page.select_option('#rarityFilter','all');self.page.select_option('#cardSort','name')
  first=self.page.locator('#collectionGrid .card-tile').first.get_attribute('data-id');self.page.click('[data-action="sort-direction"]');self.assertNotEqual(self.page.locator('#collectionGrid .card-tile').first.get_attribute('data-id'),first)
  self.page.click('[data-action="sort-direction"]');self.page.select_option('#cardSort','rarity');self.page.click('[data-action="collection-filter"]')
 def test_75_six_shop_cards_have_native_panels_and_clear_prices(self):
  self.page.evaluate("RoyaleDemo.show('shop');document.getElementById('shopContent').scrollTop=0")
  self.assertEqual(self.page.locator('.shop-deals-section .shop-offer').count(),6)
  self.page.wait_for_function("[...document.querySelectorAll('.shop-deals-section img')].every(x=>x.complete&&x.naturalWidth>0)")
  for item in self.page.locator('.shop-deals-section .shop-offer').all():
   self.assertGreater(item.bounding_box()['height'],250);self.assertIn('ref-shop-tile',item.evaluate('(e)=>getComputedStyle(e).backgroundImage'))
  self.assertRegex(self.page.locator('#shopRefresh').inner_text(),r'\d+(h \d+min|min)')
 def test_76_emote_purchase_and_duplicate_prevention(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,gems:300,ownedEmotes:[]});RoyaleDemo.show('shop')")
  self.page.locator('#emoteShop').scroll_into_view_if_needed();self.page.click('#emoteShop [data-action="buy-emote"][data-id="Emote4"]')
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.gems'),50);self.assertIn('Emote4',self.page.evaluate('RoyaleDemo.profile.ownedEmotes'))
  self.assertTrue(self.page.locator('#emoteShop [data-action="buy-emote"][data-id="Emote4"]').is_disabled())
  self.page.click('#emoteShop [data-action="buy-emote"][data-id="Emote20"]');self.assertEqual(self.page.evaluate('RoyaleDemo.profile.gems'),50);self.assertNotIn('Emote20',self.page.evaluate('RoyaleDemo.profile.ownedEmotes'))
 def test_77_currency_packs_are_local_and_have_confirmation(self):
  self.page.click('#home [data-action="currency"]');self.page.click('#currencySection [data-action="gem-pack"][data-index="0"] >> nth=0')
  self.assertIn('No real-money purchase',self.page.locator('#modalPanel').inner_text());before=self.page.evaluate('RoyaleDemo.profile.gems')
  self.page.click('[data-action="grant-gem-pack"]');self.assertEqual(self.page.evaluate('RoyaleDemo.profile.gems'),before+80)
  self.assertEqual(self.page.locator('#currencySection .gem-pack').count(),6)
 def test_78_create_clan_escapes_name_and_opens_chat_sheet(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,clan:null});RoyaleDemo.show('clan')")
  self.page.click('[data-action="join-options"]');self.page.click('[data-action="create-clan"]');self.page.fill('#clanName','<b>Test & Team</b>');self.page.click('[data-action="confirm-clan"]')
  self.assertEqual(self.page.evaluate('RoyaleDemo.screen'),'clanChat');self.assertIn('<b>Test & Team</b>',self.page.locator('#clanChatHeader').inner_text());self.assertEqual(self.page.locator('.chat-clan-card b b').count(),0)
  self.assertTrue(self.page.locator('#clanChat .done-tray').is_visible())
 def test_79_owned_emotes_send_and_roundtrip_without_external_service(self):
  self.page.evaluate("RoyaleDemo.show('clanChat')");self.page.click('[data-action="clan-emotes"]');self.page.click('[data-action="send-emote"][data-id="Emote0"]')
  last=self.page.evaluate('RoyaleDemo.profile.clan.messages.at(-1)');self.assertEqual(last['kind'],'emote');self.assertEqual(last['emote'],'Emote0')
  self.page.wait_for_function("[...document.querySelectorAll('.clan-emote-message img')].every(i=>i.complete&&i.naturalWidth>0)")
  self.assertEqual(self.page.evaluate("JSON.parse(localStorage.getItem('web-royale-classic-v4')).clan.messages.at(-1).emote"),'Emote0')
 def test_80_chat_input_and_return_button_remain_inside_viewport(self):
  self.page.evaluate("RoyaleDemo.show('clanChat')")
  if not self.page.locator('#chatInput').is_visible():self.page.click('[data-action="chat-compose"]')
  self.page.fill('#chatInput','Actual live UI message')
  v=self.page.locator('#viewport').bounding_box()
  for selector in ['#chatForm','#clanChat .done-tray','.chat-action-bar']:
   r=self.page.locator(selector).bounding_box();self.assertGreaterEqual(r['x'],v['x']-.5);self.assertLessEqual(r['y']+r['height'],v['y']+v['height']+.5);self.assertLessEqual(r['x']+r['width'],v['x']+v['width']+.5)
  self.page.locator('#chatForm button').click();self.assertIn('Actual live UI message',self.page.locator('#clanChatContent').inner_text());self.assertFalse(self.page.locator('#chatForm').is_visible())
  self.page.click('#clanChat .done-tray button');self.assertEqual(self.page.evaluate('RoyaleDemo.screen'),'clan')
 def test_81_friends_order_player_row_and_service_disclosure(self):
  self.page.evaluate("RoyaleDemo.show('clan')");self.assertEqual(self.page.locator('.friend-row.self').count(),1)
  before=self.page.locator('.friend-row').first.inner_text();self.page.click('[data-action="friends-sort"]');self.assertNotEqual(before,self.page.locator('.friend-row').first.inner_text())
  self.page.click('[data-action="friends-filter"]');self.assertEqual(self.page.locator('.friend-row').count(),4);self.page.click('[data-action="friends-filter"]')
  self.page.click('[data-action="add-friend"]');self.assertIn('Real account invitations are not connected',self.page.locator('#modalPanel').inner_text())
 def test_82_original_ref_assets_decode_and_no_fonts_or_screenshots_requested(self):
  results=self.page.evaluate("""async()=>{const keys=Object.keys(RoyaleBundle.uiImages).filter(k=>k.startsWith('ref-')||k.startsWith('emote-'));for(const k of keys){const i=new Image();i.src=RoyaleBundle.uiImages[k];await i.decode();if(!i.naturalWidth)throw Error(k)}return keys.length;}""")
  self.assertGreater(results,150);self.assertFalse(any(u.lower().endswith(('.ttf','.otf','.woff','.woff2')) or 'IMG_497' in u for u in self.requests));self.assertFalse(self.missing)
 def test_83_reference_screens_resize_without_horizontal_overflow(self):
  for w,h in [(390,844),(768,1024),(1920,1080)]:
   self.page.set_viewport_size({'width':w,'height':h})
   for s in ['cards','shop','clan','clanChat']:
    self.page.evaluate('(s)=>RoyaleDemo.show(s)',s);self.page.wait_for_timeout(60)
    self.assertAlmostEqual(self.page.locator('#viewport').bounding_box()['width']/self.page.locator('#viewport').bounding_box()['height'],9/16,places=5)
    self.assertLessEqual(self.page.locator('#'+s).evaluate('(e)=>e.scrollWidth-e.clientWidth'),1)
  self.page.set_viewport_size({'width':1440,'height':960})
 def test_84_screenshot_reference_comparison_capture(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,name:'Nano',gems:500,gold:12500,activeDeck:0,clan:{name:'Web Royale',donations:4,messages:[{name:'Crown Keeper',text:'Welcome to the clan! Try a friendly battle or request some cards.',bot:true,time:Date.now()},{name:'Nano',text:'Ready for a friendly battle.',bot:false,time:Date.now()},{name:'Nano',text:'',kind:'emote',emote:'Emote0',bot:false,time:Date.now()}]}})")
  for s in ['home','cards','shop','clan','clanChat']:
   self.page.evaluate('(s)=>{RoyaleDemo.show(s);if(s==="cards")RoyaleDemo.cardSection("decks");if(s==="shop")document.getElementById("shopContent").scrollTop=0;}',s)
   if s=='clanChat' and self.page.locator('#chatInput').is_visible():self.page.click('[data-action="chat-compose"]')
   self.page.wait_for_timeout(450);self.page.locator('#viewport').screenshot(path=str(base.OUT/(s+'-reference.png')))
  self.page.evaluate("RoyaleDemo.show('shop')")
  for selector,name in [('#emoteShop','emotes'),('#currencySection','currency')]:
   self.page.locator(selector).evaluate('(e)=>e.parentElement.scrollTop=e.offsetTop')
   self.page.wait_for_timeout(400);self.page.locator('#viewport').screenshot(path=str(base.OUT/(name+'-reference.png')))
  self.page.evaluate("RoyaleDemo.show('home')")
 def test_85_classic_only_content_after_profile_import(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,cardLevels:{knight:16},activeDeck:0});RoyaleDemo.show('cards');RoyaleDemo.details('knight')")
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.cardLevels.knight'),13);self.assertEqual(self.page.locator('#detailLevel option').last.get_attribute('value'),'13')
  self.assertEqual(self.page.evaluate('RoyaleDemo.menu.cardCount'),102);self.assertFalse(self.errors)
 def test_86_composer_does_not_cover_messages(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,clan:{name:'Team',messages:[{name:'Nano',text:'Ready',time:Date.now(),bot:false}]}});RoyaleDemo.show('clanChat')")
  if not self.page.locator('#chatInput').is_visible():self.page.click('[data-action="chat-compose"]')
  messages=self.page.locator('#clanChatContent').bounding_box();form=self.page.locator('#chatForm').bounding_box()
  self.assertLessEqual(messages['y']+messages['height'],form['y']+1)
  self.page.click('[data-action="chat-compose"]')
if __name__=='__main__':unittest.main(verbosity=2)
