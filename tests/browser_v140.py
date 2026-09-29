"""Targeted v0.14 checks: fresh progression and robust looped self-play."""
import unittest
import browser_v130 as previous
import browser_v050 as base
base.OUT=base.R/'docs/qa/v140/browser';base.OUT.mkdir(parents=True,exist_ok=True)

class BrowserTests(previous.BrowserTests):
 def test_140_fresh_profile_starts_at_zero_with_only_starter_eight(self):
  r=self.page.evaluate("""()=>{RoyaleDemo.applyProfile(RoyaleProfile.normalizeProfile());RoyaleDemo.show('cards');return {trophies:RoyaleDemo.profile.trophies,level:RoyaleDemo.profile.level,unlocked:RoyaleDemo.profile.unlockedCards.slice().sort(),expected:RoyaleCore.DEFAULT_DECK.slice().sort(),levels:Object.fromEntries(RoyaleCore.DEFAULT_DECK.map(id=>[id,RoyaleDemo.profile.cardLevels[id]])),bases:Object.fromEntries(RoyaleCore.DEFAULT_DECK.map(id=>[id,RoyaleCore.baseLevel(RoyaleCore.CARD_BY_ID[id].rarity)])),count:document.getElementById('collectionCount').textContent,locked:document.querySelectorAll('#collectionGrid .locked-card').length}}""")
  self.assertEqual(r['trophies'],0);self.assertEqual(r['level'],1);self.assertEqual(r['unlocked'],r['expected']);self.assertEqual(r['levels'],r['bases']);self.assertEqual(r['count'],'8 / 102');self.assertEqual(r['locked'],94)
  self.page.locator('#viewport').screenshot(path=str(base.OUT/'fresh-profile.png'))

 def test_141_locked_cards_cannot_be_added_until_rewarded(self):
  self.page.evaluate("RoyaleDemo.applyProfile(RoyaleProfile.normalizeProfile());RoyaleDemo.show('cards');RoyaleDemo.details('mother-witch')")
  self.assertIn('Locked',self.page.locator('#modalPanel').inner_text());self.assertTrue(self.page.locator('#modalPanel [data-action=use-card]').is_disabled())

 def test_142_loop_restart_keeps_high_concurrency_acknowledgement(self):
  self.page.evaluate("RoyaleDemo.show('home');document.querySelector('#home [data-action=menu]').click()");self.page.locator('[data-action=learning-center]').click();self.page.wait_for_selector('#trainingCount');self.page.evaluate("""()=>{document.getElementById('trainingCount').value='500';document.getElementById('trainingConcurrency').value='500';document.getElementById('trainingRisk').checked=true;if(document.getElementById('trainingLoop').getAttribute('aria-pressed')!=='true')document.getElementById('trainingLoop').click();window.__fakeWorkers=0;window.__oldWorker=window.Worker;window.Worker=class{constructor(){this.id=++window.__fakeWorkers}postMessage(m){if(m.type==='start'&&this.id<=8)setTimeout(()=>this.onmessage?.({data:{type:'done',completed:m.count,cancelled:false}}),20);if(m.type==='cancel')setTimeout(()=>this.onmessage?.({data:{type:'done',completed:0,cancelled:true}}),0)}terminate(){}}}""")
  self.page.locator('[data-action=train-start]').click();self.page.wait_for_function('window.__fakeWorkers>8',timeout=10000)
  made=self.page.evaluate('window.__fakeWorkers');self.assertGreater(made,8)
  self.page.locator('[data-action=train-stop]').click();self.page.wait_for_timeout(100);self.page.evaluate('()=>{window.Worker=window.__oldWorker;return null}')
  self.assertNotIn('Acknowledge the RAM warning',self.page.locator('#trainingStatus').inner_text())
  self.page.locator('#modalPanel').screenshot(path=str(base.OUT/'loop-restart.png'))

 def test_143_no_new_page_errors_or_missing_files(self):
  self.assertEqual(self.errors,[]);self.assertEqual(self.missing,[])

if __name__=='__main__': unittest.main(verbosity=2)
