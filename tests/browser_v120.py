"""Packaged-byte controlled browser fixture, not a Windows/AppData integration claim."""
import unittest,json
import browser_v110 as previous
import browser_v050 as base
base.OUT=base.R/'docs/qa/v120/browser';base.OUT.mkdir(parents=True,exist_ok=True)
class BrowserTests(previous.BrowserTests):
 def test_120_settings_scroll_header_and_controls(self):
  self.page.evaluate("RoyaleDemo.show('home');document.querySelector('#home [data-action=menu]').click();document.querySelector('[data-action=settings]').click()")
  self.assertTrue(self.page.locator('#modalPanel[data-kind=settings] .settings-body').is_visible())
  self.page.locator('#placementHints').uncheck();self.assertFalse(self.page.evaluate('RoyaleDemo.profile.placementHints'));self.page.locator('#placementHints').check()
  self.page.locator('#settingsVolume').evaluate("e=>{e.value='35';e.dispatchEvent(new Event('input',{bubbles:true}))}");self.assertEqual(self.page.evaluate('RoyaleDemo.profile.volume'),35)
  self.page.locator('.settings-body').evaluate('e=>e.scrollTop=e.scrollHeight');self.assertTrue(self.page.locator('#modalPanel>.modal-close').is_visible());self.assertTrue(self.page.locator('#modalPanel>.modal-title').is_visible())
  self.assertTrue(self.page.locator('[data-action=reset]').is_visible());self.page.locator('.settings-body').evaluate('e=>e.scrollTop=0');self.page.locator('#modalPanel').screenshot(path=str(base.OUT/'settings.png'))
 def test_121_level_icon_is_contained_on_all_topbar_menus(self):
  self.page.evaluate('RoyaleDemo.applyProfile({...RoyaleDemo.profile,level:13})')
  for page in ['home','cards','shop','events']:
   self.page.evaluate('id=>RoyaleDemo.show(id)',page)
   data=self.page.locator('#'+page+' .xp-badge').evaluate('e=>{const r=e.getBoundingClientRect(),v=document.getElementById("viewport").getBoundingClientRect();return {clip:getComputedStyle(e).clipPath,visible:r.width>0&&r.top>=v.top&&r.bottom<v.bottom&&r.left>=v.left}}')
   self.assertEqual(data['clip'],'none');self.assertTrue(data['visible'],page)
  self.page.evaluate("RoyaleDemo.show('home')");self.page.locator('#viewport').screenshot(path=str(base.OUT/'home.png'))
 def test_122_card_count_bar_uses_original_frames(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,cardLevels:{...RoyaleDemo.profile.cardLevels,knight:9,archers:9,giant:13},copies:{...RoyaleDemo.profile.copies,knight:50,archers:99999},activeDeck:0});RoyaleDemo.show('cards')")
  self.assertEqual(self.page.locator('#deckGrid .card-progress.original').count(),8)
  el=self.page.locator('#collectionGrid [data-id=knight] .card-progress');self.assertIn('card-progress-original',el.evaluate('e=>getComputedStyle(e).backgroundImage'))
  self.assertNotEqual(el.get_attribute('data-progress-frame'),'99');self.assertEqual(self.page.locator('#collectionGrid [data-id=archers] .card-progress').get_attribute('data-progress-frame'),'99')
  self.assertEqual(self.page.locator('#collectionGrid [data-id=giant] .card-progress').get_attribute('data-progress-frame'),'100')
  self.page.wait_for_timeout(1500);self.page.evaluate("RoyaleDemo.cardSection('decks');document.getElementById('cardsScroll').scrollTop=0")
  pos=self.page.locator('#deckGrid .card-progress.original').first.evaluate('e=>{const b=e.getBoundingClientRect(),r=e.querySelector("b").getBoundingClientRect();return (r.top+r.height/2-b.top)/b.height}')
  self.assertGreater(pos,.5);self.assertLess(pos,.64);self.page.locator('#viewport').screenshot(path=str(base.OUT/'cards.png'))
 def test_123_original_cannon_rotation_poses_do_not_spin_with_elapsed_time(self):
  result=self.page.evaluate("""async()=>{await RoyaleDemo.startBattle();const b=RoyaleDemo.battle;b.ai=false;b.paused=true;b.hand[0][0]='cannon';await RoyaleDemo.native.ensureScenes([RoyaleDemo.native.data.units.Cannon.scene]);const cv=document.createElement('canvas');cv.width=160;cv.height=160;const c=cv.getContext('2d');function draw(time,heading){c.clearRect(0,0,160,160);if(!RoyaleDemo.native.unit(c,'Cannon',80,120,0,time,'idle',heading,0,.7))throw Error('Cannon scene not ready');if(!c.getImageData(0,0,160,160).data.some((v,i)=>i%4===3&&v))throw Error('Empty Cannon sample');return cv.toDataURL()}return {north0:draw(0,-Math.PI/2),north1:draw(1,-Math.PI/2),east:draw(0,0)}}""")
  self.assertEqual(result['north0'],result['north1']);self.assertNotEqual(result['north0'],result['east'])
 def test_124_lumberjack_potion_deploys_rage_without_being_attacked(self):
  r=self.page.evaluate("""async()=>{await RoyaleDemo.startBattle();const b=RoyaleDemo.battle;b.ai=false;b.paused=false;b.hand[0][0]='lumberjack';await RoyaleDemo.native.prepareBattle(b,RoyaleCore.DATA);const bottle=b.spawn('RageBarbarianBottle',0,190,480);for(let i=0;i<40;i++)b.step(1/60);b.paused=true;return {bottlePresent:b.active.some(u=>u.entity==='RageBarbarianBottle'),area:b.areas.some(a=>a.name==='BarbarianRage'),kills:b.metrics.kills[1]}}""")
  self.assertFalse(r['bottlePresent']);self.assertTrue(r['area']);self.assertEqual(r['kills'],0)
 def test_125_2v2_source_timeline_and_independent_barrels_render(self):
  r=self.page.evaluate("""async()=>{RoyaleDemo.applyProfile({...RoyaleDemo.profile,cheats:{},equalLevels:true});await RoyaleDemo.startBattle('TeamVsTeamLadder');const b=RoyaleDemo.battle;b.ai=false;b.paused=false;const k=b.towers.find(u=>u.duoKing&&u.team===0);k.active=true;const g=b.spawn('Giant',1,k.x,k.y-85,{wait:0});g.hp=99999;for(let i=0;i<180;i++)b.step(1/60);b.paused=true;RoyaleDemo.refreshHand(true);return {seats:b.seatCount,period:b.timeline.ElixirFullBarMS[0],shots:b.kingShots,cannons:k.cannons.map(x=>x.targetId),levels:b.seatLevels.map(l=>l.knight)}}""")
  self.assertEqual(r['seats'],4);self.assertEqual(r['period'],40000);self.assertGreaterEqual(r['shots'],6);self.assertEqual(len(r['cannons']),2);self.assertEqual(r['levels'],[9,9,9,9]);self.page.wait_for_timeout(1600);self.page.locator('#viewport').screenshot(path=str(base.OUT/'2v2.png'))
 def test_126_training_5000_control_and_guard_feed_real_pool(self):
  r=self.page.evaluate("""async()=>{RoyaleDemo.show('home');await RoyaleDemo.archivePending;RoyaleDemo.learningMenu();document.getElementById('trainingCount').value='5000';document.getElementById('trainingConcurrency').value='5000';const old=window.Worker;let starts=[];window.Worker=class{postMessage(m){if(m.type==='start')starts.push(m);if(m.type==='cancel')this.onmessage({data:{type:'done',completed:0,cancelled:true}})}terminate(){}};try{const guarded=await RoyaleDemo.trainStart();document.getElementById('trainingCount').value='5000';document.getElementById('trainingConcurrency').value='5000';document.getElementById('trainingRisk').checked=true;const started=await RoyaleDemo.trainStart();const info={guarded,started,total:starts.reduce((n,s)=>n+s.count,0),active:starts.reduce((n,s)=>n+s.concurrency,0),workers:starts.length};document.querySelector('[data-action=train-stop]').click();await new Promise(r=>setTimeout(r,100));return {...info,stopped:!RoyaleDemo.trainingWorker}}finally{window.Worker=old}}""")
  self.assertFalse(r['guarded']);self.assertTrue(r['started']);self.assertEqual(r['total'],5000);self.assertEqual(r['active'],5000);self.assertLessEqual(r['workers'],8);self.assertTrue(r['stopped'])
  self.page.locator('#modalPanel').screenshot(path=str(base.OUT/'learning-center.png'))
 def test_127_no_browser_errors_or_missing_original_assets(self):
  self.assertEqual(self.errors,[]);self.assertEqual(self.missing,[])
if __name__=='__main__':unittest.main(verbosity=2)
