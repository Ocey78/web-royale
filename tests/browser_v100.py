"""Regression UI and real-asset presentation checks for v0.10.0.
Inherits every v0.9.0 browser check except explicitly superseded arena selection.
Fixture is documented in browser_v050.py; no replacement artwork is used.
"""
import unittest,json
import browser_v090 as previous
import browser_v050 as base
base.OUT=base.R/'docs/qa/v100/browser';base.OUT.mkdir(parents=True,exist_ok=True)
class BrowserTests(previous.BrowserTests):
 def test_88_original_lettering_and_stable_headers(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,name:'Nano',gold:3445,gems:103,xp:3095,trophies:2158,highestTrophies:2158,arena:'goblin'});RoyaleDemo.show('home')")
  self.assertTrue(self.page.evaluate("RoyaleText.ready && RoyaleText.metrics('Nano 3445', 'title').supported"))
  self.assertGreater(self.page.locator('#home .ink-text canvas').count(),10)
  boxes=self.page.evaluate("()=>[...document.querySelectorAll('#home .topbar>button')].map(e=>{const r=e.getBoundingClientRect();return {l:r.left,r:r.right,w:r.width}})")
  self.assertTrue(all(b['w']>=120 for b in boxes),str(boxes));self.assertLessEqual(boxes[0]['r'],boxes[1]['l']+1);self.assertLessEqual(boxes[1]['r'],boxes[2]['l']+1)
  self.assertEqual(self.page.locator('#homeArenaName').inner_text(),'Arena 7')
 def test_89_trophy_road_all_arenas_and_leagues(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,trophies:660,highestTrophies:660,arena:'serenity',roadClaimed:[]});RoyaleDemo.show('home')")
  self.page.click('#home .home-arena');self.assertEqual(self.page.evaluate('RoyaleDemo.screen'),'trophyRoad');self.page.wait_for_timeout(60)
  self.assertEqual(self.page.locator('.road-stop:not(.road-league)').count(),14);self.assertEqual(self.page.locator('.road-league').count(),10)
  self.assertEqual(self.page.locator('.road-step').count(),109);self.assertEqual(self.page.locator('#trophyRoad [data-action="arena"]').count(),0)
  self.assertEqual(self.page.locator('.road-player-marker').count(),1)
  self.assertTrue(self.page.locator('.road-player-marker').evaluate("e=>{const r=e.getBoundingClientRect(),s=document.getElementById('roadScroll').getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom}"))
  self.page.locator('[data-road-id="serenity"] [data-action="arena-info"]').click()
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.arena'),'barbarian');self.assertEqual(self.page.locator('#modalPanel [data-action="arena"]').count(),0)
  self.page.evaluate("RoyaleDemo.show('home')")
 def test_95_marked_home_buttons_removed_and_timers_inside_frames(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,name:'Nano',trophies:660,highestTrophies:660,gold:9949609,gems:9999999,chests:[{id:'a',kind:'silver',unlockAt:0},{id:'b',kind:'silver',unlockAt:0},{id:'c',kind:'silver',unlockAt:0},{id:'d',kind:'gold',unlockAt:0}]});RoyaleDemo.show('home')")
  self.assertEqual(self.page.locator('#home .home-left,#home .home-right').count(),0)
  for wh in [(540,960),(390,844),(1440,960)]:
   self.page.set_viewport_size({'width':wh[0],'height':wh[1]});self.page.wait_for_timeout(40)
   result=self.page.evaluate("()=>[...document.querySelectorAll('.chest-slot .slot-header')].map(e=>{const p=e.parentElement.getBoundingClientRect();return [...e.querySelectorAll('strong,b,canvas')].every(n=>{const r=n.getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom&&r.left>=p.left-.5&&r.right<=p.right+.5})})")
   self.assertEqual(result,[True]*4)
  self.page.locator('#viewport').screenshot(path=str(base.OUT/'home-fixed.png'))
 def test_96_arena_locked_in_main_and_practice_battles(self):
  for training in [False,True]:
   self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,trophies:660,highestTrophies:660,arena:'serenity',cheats:{}});RoyaleDemo.show('home')")
   result=self.page.evaluate("async training=>{await RoyaleDemo.startBattle('Default',training);RoyaleDemo.battle.paused=true;return {arena:RoyaleDemo.native.arena.id,practice:RoyaleDemo.battle.practice,profile:RoyaleDemo.profile.arena}}",training)
   self.assertEqual(result['arena'],'barbarian');self.assertEqual(result['profile'],'barbarian');self.assertEqual(result['practice'],training)
  self.page.evaluate("RoyaleDemo.show('home');const el=document.createElement('button');el.dataset.action='arena';el.dataset.id='serenity';document.getElementById('viewport').append(el);el.click();el.remove()")
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.arena'),'barbarian')
 def test_97_road_claim_choice_and_repeat_rejection_in_ui(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,trophies:660,highestTrophies:660,roadClaimed:[],gold:1000,cheats:{}});RoyaleDemo.show('home')")
  self.page.click('#home .home-arena');before=self.page.evaluate('RoyaleDemo.profile.gold')
  item=self.page.evaluate("RoyaleProgression.ROAD_REWARDS.find(r=>r.kind==='gold'&&r.trophies<=660)")
  self.page.locator(f'[data-action="road-reward"][data-id="{item["id"]}"]').click();self.page.click('[data-action="claim-road"]')
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.gold'),before+item['amount']);self.assertTrue(self.page.evaluate('(id)=>RoyaleDemo.profile.roadClaimed.includes(id)',item['id']))
  self.page.click('[data-action="close"]');self.page.locator(f'[data-action="road-reward"][data-id="{item["id"]}"]').click();self.assertEqual(self.page.locator('[data-action="claim-road"]').count(),0)
  item=self.page.evaluate("RoyaleProgression.ROAD_REWARDS.find(r=>r.kind==='choice'&&r.trophies<=660)")
  before=self.page.evaluate('JSON.parse(JSON.stringify(RoyaleDemo.profile.copies))')
  self.page.locator(f'[data-action="road-reward"][data-id="{item["id"]}"]').click();self.assertEqual(self.page.locator('[data-action="claim-road"]').count(),2)
  chosen=self.page.locator('[data-action="claim-road"]').first.get_attribute('data-card');self.page.locator('[data-action="claim-road"]').first.click()
  after=self.page.evaluate('RoyaleDemo.profile.copies');self.assertEqual(after[chosen]-before[chosen],item['amount']);self.assertEqual(sum(after.values())-sum(before.values()),item['amount'])
  self.page.click('[data-action="close"]');self.page.evaluate("RoyaleDemo.show('home')");self.page.click('#home .home-arena');self.page.wait_for_timeout(120);self.page.locator('#viewport').screenshot(path=str(base.OUT/'road-fixed.png'))
 def test_98a_free_chest_rejects_future_deck_card_in_ui(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,trophies:0,highestTrophies:0,freeChestAt:0,crownChestAt:0,crownChestClaimed:0,earnedCrowns:10,decks:[['mother-witch',...RoyaleCore.DEFAULT_DECK.slice(1)],...RoyaleCore.PRESETS.slice(1)],activeDeck:0});RoyaleDemo.show('home')")
  for action in ['free-chest','crown-chest']:
   before=self.page.evaluate('JSON.parse(JSON.stringify(RoyaleDemo.profile.copies))');self.page.click(f'#home [data-action="{action}"]')
   after=self.page.evaluate('RoyaleDemo.profile.copies');changed=[k for k in after if after[k]>before[k]];self.assertTrue(changed)
   for cid in changed:self.assertTrue(self.page.evaluate('(id)=>RoyaleEconomy.cardPool(RoyaleDemo.profile).some(c=>c.id===id)',cid),cid)
   self.page.click('[data-action="close"]')
 def test_98b_source_effects_render_spells_and_particle_time(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,trophies:660,highestTrophies:660,cheats:{}});RoyaleDemo.show('home')")
  self.page.evaluate('RoyaleDemo.startBattle()')
  self.page.evaluate("async()=>{RoyaleDemo.battle.paused=true;await RoyaleDemo.native.ensureScenes(Object.keys(RoyaleBundle.fx.scenes))}")
  result=self.page.evaluate("""()=>{const lib=RoyaleDemo.native,fx=lib.fx,cv=document.createElement('canvas');cv.width=500;cv.height=500;const c=cv.getContext('2d',{willReadFrequently:true}),out=[];for(const name of ['Fireball_explosion','Spell_freeze_ground','Spell_poison_ground','Spell_zap_effect','Spell_lightning_effect','Spell_tornado_deploy','Spell_rage_ground']){const matched=Object.keys(RoyaleBundle.fx.effects).find(x=>x===name)||Object.keys(RoyaleBundle.fx.effects).find(x=>x.toLowerCase().includes(name.toLowerCase()));if(!matched)throw Error(name+' missing');for(const t of [.12,.45]){c.clearRect(0,0,500,500);fx.begin();fx.effect(c,matched,250,280,t,0,{phase:'all',seed:144,loop:true,fitArea:true,radius:3,life:2});const data=c.getImageData(0,0,500,500).data;let pixels=0,hash=0;for(let i=0;i<data.length;i+=4){if(data[i+3])pixels++;hash=(hash*31+data[i]+data[i+1]+data[i+2]+data[i+3])>>>0}out.push({name:matched,t,pixels,hash});}}return {samples:out,stats:fx.summary()}}""")
  (base.OUT/'fx-samples.json').write_text(json.dumps(result,indent=2))
  for s in result['samples']:self.assertGreater(s['pixels'],0,str(s))
  self.assertGreater(result['stats']['sprites'],10);self.assertGreater(result['stats']['effects'],10)
 def test_98c_spell_projectile_capture(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,trophies:660,highestTrophies:660,cheats:{placement:true},activeDeck:0,decks:[['fireball','poison','freeze','tornado','rocket','arrows','giant-snowball','the-log'],...RoyaleCore.PRESETS.slice(1)]});RoyaleDemo.show('home')")
  self.page.evaluate("async()=>{await RoyaleDemo.startBattle();const b=RoyaleDemo.battle;b.ai=false;b.paused=true;await RoyaleDemo.native.ensureScenes(Object.keys(RoyaleBundle.fx.scenes));b.spawn('Giant',1,160,330,{wait:0});b.spawn('Knight',0,155,360,{wait:0});b.spawn('Archer',0,355,370,{wait:0});b.spawn('Musketeer',1,310,265,{wait:0});b.createArea('Poison',0,320,275,9);b.createArea('Freeze',0,165,330,9);b.paused=false;for(let i=0;i<30;i++)b.step(1/60);b.paused=true;}")
  self.page.wait_for_timeout(120);self.page.locator('#viewport').screenshot(path=str(base.OUT/'battle-effects.png'))
  self.assertFalse(self.errors)
 def test_98d_original_reward_icons_and_real_road_emotes(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,trophies:4500,highestTrophies:4500,roadClaimed:[],ownedEmotes:[],clan:{name:'Test Clan',messages:[],donations:0}});RoyaleDemo.show('home')")
  self.page.click('#home .home-arena')
  for step,emote in [('road1-2200','Emote58'),('road1-4000','Emote71')]:
   self.page.locator(f'[data-action="road-reward"][data-id="{step}"]').click();self.page.click('[data-action="claim-road"]')
   self.assertTrue(self.page.evaluate('(id)=>RoyaleDemo.profile.ownedEmotes.includes(id)',emote))
   self.page.locator(f'#modalPanel img[data-ui="emote-{emote}"]').wait_for();self.page.wait_for_function("document.querySelector('#modalPanel .reward-chest img').naturalWidth>0")
   self.page.click('[data-action="close"]')
  self.page.evaluate("RoyaleDemo.applyProfile(JSON.parse(JSON.stringify(RoyaleDemo.profile)));RoyaleDemo.show('clanChat')")
  self.page.click('[data-action="clan-emotes"]')
  self.assertTrue(self.page.locator('[data-action="send-emote"][data-id="Emote58"]').is_visible());self.page.click('[data-action="send-emote"][data-id="Emote58"]')
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.clan.messages.at(-1).emote'),'Emote58')
  self.assertFalse(self.errors);self.assertFalse(self.missing)
if __name__=='__main__':unittest.main(verbosity=2)
