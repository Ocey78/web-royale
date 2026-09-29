"""Real packaged assets in the inherited controlled browser fixture.
Ordinary navigation is blocked by this environment; storage/worker integration
is additionally exercised by engine and IndexedDB transaction tests.
"""
import unittest,json
import browser_v100 as previous
import browser_v050 as base
base.OUT=base.R/'docs/qa/v110/browser';base.OUT.mkdir(parents=True,exist_ok=True)
class BrowserTests(previous.BrowserTests):
 def test_10_events(self):
  self.page.evaluate("RoyaleDemo.show('events')");self.assertEqual(self.page.locator('#eventsContent [data-action=mode]').count(),7)
  self.page.locator('#eventsContent [data-mode=TeamVsTeam]').click();self.page.wait_for_function("RoyaleDemo.battle?.is2v2&&!RoyaleDemo.preparing")
  self.assertEqual(self.page.evaluate('RoyaleDemo.battle.seatCount'),4)
 def test_110_deploying_defender_visible_targetable_and_forecast_pure(self):
  self.page.evaluate("async()=>{RoyaleDemo.applyProfile({...RoyaleDemo.profile,trophies:660,highestTrophies:660,placementHints:true,learningEnabled:true,cheats:{},decks:RoyaleCore.PRESETS,activeDeck:0});await RoyaleDemo.startBattle();const b=RoyaleDemo.battle;b.ai=false;b.paused=true;b.elixir.fill(10);b.hand[0][0]='musketeer';await RoyaleDemo.native.prepareBattle(b,RoyaleCore.DATA);b.spawn('Giant',1,140,360,{wait:0});b.spawn('Knight',1,170,370,{wait:0});RoyaleDemo.refreshHand(true)}")
  before=self.page.evaluate('({time:RoyaleDemo.battle.time,rng:RoyaleDemo.battle.nextId,elixir:RoyaleDemo.battle.elixir,units:RoyaleDemo.battle.units.length})')
  forecast=self.page.evaluate('RoyaleDemo.battle.placementPreview(0,0,190,450)');self.assertTrue(forecast['ok']);self.assertGreater(forecast['range'],4)
  self.assertTrue(forecast['attackers']);after=self.page.evaluate('({time:RoyaleDemo.battle.time,rng:RoyaleDemo.battle.nextId,elixir:RoyaleDemo.battle.elixir,units:RoyaleDemo.battle.units.length})');self.assertEqual(before,after)
  r=self.page.evaluate("()=>{const b=RoyaleDemo.battle,u=b.spawn('Knight',0,170,395,{wait:2}),enemy=b.units.find(u=>u.team===1&&u.entity==='Knight'),hp=u.hp;b.paused=false;for(let i=0;i<55;i++)b.step(1/60);b.paused=true;return {hp:u.hp,before:hp,wait:u.wait,visible:b.isPresent(u),alive:u.hp>0}}")
  self.assertTrue(r['visible']);self.assertGreater(r['wait'],0);self.assertLess(r['hp'],r['before'])
  self.page.evaluate('RoyaleDraw.battle(document.getElementById("battleCanvas").getContext("2d"),RoyaleDemo.battle,RoyaleDemo.battle.time,{x:190,y:450},0)')
  # Pause RAF so this manual placement preview survives the screenshot.
  self.page.evaluate("RoyaleDemo.battle.paused=false;RoyaleDemo.select(0);RoyaleDemo.battle.paused=true")
  box=self.page.locator('#viewport').bounding_box();s=box['width']/540;self.page.mouse.move(box['x']+220*s,box['y']+560*s);self.page.wait_for_timeout(80)
  self.page.wait_for_timeout(1800);self.page.locator('#viewport').screenshot(path=str(base.OUT/'deployment-preview.png'))
 def test_111_four_seats_ally_hand_and_original_double_king(self):
  self.page.evaluate("async()=>{RoyaleDemo.applyProfile({...RoyaleDemo.profile,cheats:{}});await RoyaleDemo.startBattle('TeamVsTeam');const b=RoyaleDemo.battle;b.ai=false;for(let i=0;i<20;i++){for(const s of [1,2,3])b.aiPlay(s);for(let j=0;j<60;j++)b.step(1/60);}b.paused=true;RoyaleDemo.refreshHand(true)}")
  self.assertEqual(self.page.evaluate('RoyaleDemo.battle.hand.length'),4);self.assertTrue(self.page.locator('#allyPanel').is_visible());self.assertEqual(self.page.locator('#allyHand .card-visual').count(),4)
  data=self.page.evaluate('({played:RoyaleDemo.battle.played,elixir:RoyaleDemo.battle.elixir,kings:RoyaleDemo.battle.towers.filter(t=>t.duoKing).length,updates:RoyaleDemo.battle.brain.state.updates})')
  self.assertEqual(data['kings'],2);self.assertEqual(data['played'][0],0);self.assertTrue(all(v>0 for v in data['played'][1:]));self.assertGreater(data['updates'],0)
  self.page.wait_for_timeout(1800);self.page.locator('#viewport').screenshot(path=str(base.OUT/'2v2-battle.png'))
 def test_112_completed_match_persists_shared_weights_and_raw_commands(self):
  self.page.evaluate("async()=>{await RoyaleDemo.startBattle();const b=RoyaleDemo.battle;b.ai=false;b.paused=false;for(let i=0;i<18;i++){b.aiPlay(0);b.aiPlay(1);for(let j=0;j<60;j++)b.step(1/60);}b.finish(1,'QA completion');RoyaleDemo.step(.1);await RoyaleDemo.archivePending}")
  data=self.page.evaluate('async()=>{await RoyaleDemo.archivePending;const x=await RoyaleDemo.learningStore.export();const r=x.records.find(r=>r.id===RoyaleDemo.battle.id);return {recorded:x.model.recorded,updates:x.model.updates,weights:x.model.weights.some(x=>x!==0),commands:r.commands.length,samples:r.snapshots.length,rewards:r.transitions.length,terminal:r.transitions.some(t=>t.terminal),key:RoyaleDemo.learningStore.mode}}')
  self.assertGreater(data['recorded'],0);self.assertGreater(data['updates'],0);self.assertTrue(data['weights']);self.assertGreater(data['commands'],0);self.assertGreater(data['samples'],0);self.assertTrue(data['terminal'])
  before=self.page.evaluate('RoyaleDemo.learningStore.model.recorded');self.page.evaluate("async()=>{RoyaleDemo.show('home');await RoyaleDemo.archivePending;RoyaleDemo.learningMenu()}");self.assertEqual(before,self.page.evaluate('RoyaleDemo.learningStore.model.recorded'))
  self.assertTrue(self.page.locator('.learning-stats').is_visible());self.assertEqual(self.page.locator('[data-action=learning-export]').count(),1)
  self.page.locator('#modalPanel').screenshot(path=str(base.OUT/'learning-center.png'))
 def test_113_new_battle_reads_same_shared_model(self):
  r=self.page.evaluate("async()=>{await RoyaleDemo.archivePending;const prior=RoyaleDemo.learningStore.model.updates;await RoyaleDemo.startBattle('TeamVsTeam');RoyaleDemo.battle.paused=true;return {prior,now:RoyaleDemo.battle.brain.state.updates,all:RoyaleDemo.battle.bots.every(b=>b.learner.brain===RoyaleDemo.battle.brain)}}")
  self.assertEqual(r['prior'],r['now']);self.assertTrue(r['all'])
 def test_114_abandoned_and_cheat_matches_record_but_no_cheat_gradients(self):
  r=self.page.evaluate("async()=>{RoyaleDemo.show('home');await RoyaleDemo.archivePending;RoyaleDemo.applyProfile({...RoyaleDemo.profile,cheats:{placement:true}});await RoyaleDemo.startBattle();const b=RoyaleDemo.battle;b.ai=false;for(let i=0;i<500;i++){if(i%15===0)b.aiPlay(1);b.step(1/60);}const id=b.id;RoyaleDemo.show('home');await RoyaleDemo.archivePending;const x=await RoyaleDemo.learningStore.export(),r=x.records.find(r=>r.id===id);return {status:r.status,quarantined:r.quarantined,updates:r.policyUpdates,abandoned:x.model.abandoned}}")
  self.assertEqual(r['status'],'abandoned');self.assertTrue(r['quarantined']);self.assertEqual(r['updates'],0);self.assertGreater(r['abandoned'],0)
  self.page.evaluate('RoyaleDemo.applyProfile({...RoyaleDemo.profile,cheats:{}})')
 def test_115_trophy_road_current_jump_claim_count_and_arena_browser(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,trophies:660,highestTrophies:660,roadClaimed:[]});RoyaleDemo.show('home')")
  self.page.click('#home .home-arena');self.assertTrue(self.page.locator('#roadProgress').is_visible());self.assertGreater(self.page.locator('#roadArenaJump option').count(),20)
  self.page.select_option('#roadArenaJump','serenity');self.page.wait_for_timeout(300);self.assertEqual(self.page.evaluate('RoyaleDemo.profile.arena'),'barbarian')
  self.page.click('[data-action=road-my-progress]');self.page.wait_for_timeout(60);self.assertTrue(self.page.locator('.road-player-marker').evaluate('e=>{const r=e.getBoundingClientRect(),s=document.getElementById("roadScroll").getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom}'))
  self.page.click('[data-action=road-next-reward]');self.page.wait_for_timeout(450);self.assertGreater(self.page.locator('.road-step.available').count(),0)
  self.page.locator('#viewport').screenshot(path=str(base.OUT/'trophy-road.png'))
 def test_116_settings_preview_learning_and_history_export(self):
  self.page.evaluate("RoyaleDemo.show('home');document.querySelector('#home [data-action=menu]').click();document.querySelector('#modalPanel [data-action=settings]').click()")
  for selector in ['#learningEnabled','#placementHints']:
   self.assertEqual(self.page.locator(selector).count(),1);self.page.locator(selector).uncheck();self.assertFalse(self.page.evaluate('RoyaleDemo.profile.'+selector[1:]));self.page.locator(selector).check()
  self.page.click('[data-action=learning-center]');self.page.wait_for_selector('.learning-stats');self.assertTrue(self.page.locator('[data-action=learning-export]').is_visible())
  self.assertEqual(self.errors,[]);self.assertEqual(self.missing,[])
 def test_117_worker_start_error_is_reported_without_breaking_the_page(self):
  r=self.page.evaluate("""async()=>{RoyaleDemo.show('home');await RoyaleDemo.learningReady;await RoyaleDemo.archivePending;RoyaleDemo.learningMenu();const old=window.Worker;window.Worker=class{constructor(){throw Error('Worker blocked by browser policy')}};try{let rejected=false;try{await RoyaleDemo.trainStart()}catch(e){rejected=true}return {rejected,active:!!RoyaleDemo.trainingWorker,status:RoyaleDemo.trainingState};}finally{window.Worker=old}}""")
  self.assertFalse(r['rejected']);self.assertFalse(r['active']);self.assertIn('blocked',r['status'])
  self.assertTrue(self.page.locator('[data-action=train-start]').is_enabled())
 def test_118_double_start_only_creates_one_worker_and_stop_remains_usable(self):
  r=self.page.evaluate("""async()=>{RoyaleDemo.show('home');await RoyaleDemo.archivePending;RoyaleDemo.learningMenu();const old=window.Worker;let made=0,cancel=false,terminated=false;window.Worker=class{constructor(){made++}postMessage(m){if(m.type==='cancel'){cancel=true;this.onmessage({data:{type:'done',cancelled:true,completed:0}})}}terminate(){terminated=true}};try{await Promise.all([RoyaleDemo.trainStart(),RoyaleDemo.trainStart()]);document.querySelector('[data-action=train-stop]').click();await new Promise(r=>setTimeout(r,50));return {made,cancel,terminated,active:!!RoyaleDemo.trainingWorker,status:RoyaleDemo.trainingState};}finally{window.Worker=old}}""")
  self.assertEqual(r['made'],1);self.assertTrue(r['cancel']);self.assertTrue(r['terminated']);self.assertFalse(r['active']);self.assertIn('Stopped',r['status'])
if __name__=='__main__':unittest.main(verbosity=2)
