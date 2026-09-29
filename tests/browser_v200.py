"""v0.20 regressions against packaged files, using an intercepted same-origin fixture."""
import unittest, os, mimetypes, json, hashlib
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
OUT=R/'docs/qa/v020/browser'; OUT.mkdir(parents=True,exist_ok=True)

class BrowserV200(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.p=sync_playwright().start()
  cls.browser=cls.p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
  cls.page=cls.browser.new_page(viewport={'width':1200,'height':960})
  cls.errors=[];cls.missing=[];cls.page.set_default_timeout(60000)
  cls.page.on('pageerror',lambda e:cls.errors.append(str(e)))
  def serve(route):
   url=route.request.url
   if not url.startswith('https://webroyale.test/'):
    cls.missing.append(url);route.abort();return
   f=R/'dist'/(unquote(urlparse(url).path).lstrip('/') or 'index.html')
   if not f.is_file():
    cls.missing.append(url);route.fulfill(status=404,body='Missing');return
   route.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream',headers={'Access-Control-Allow-Origin':'*'})
  cls.page.route('**/*',serve)
  cls.page.evaluate("window.__saveMemory={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>window.__saveMemory[k]||null,setItem:(k,v)=>window.__saveMemory[k]=String(v),removeItem:k=>delete window.__saveMemory[k]}})")
  cls.page.set_content((R/'dist/index.html').read_text().replace('<head>','<head><base href="https://webroyale.test/">'),wait_until='load',timeout=90000)
  cls.page.wait_for_function('window.RoyaleDemo&&document.getElementById("loading").classList.contains("hidden")',timeout=90000)
 @classmethod
 def tearDownClass(cls):
  (OUT/'resource-errors.json').write_text(json.dumps({'errors':cls.errors,'missing':cls.missing},indent=2))
  cls.browser.close();cls.p.stop()
 def setUp(self):
  self.page.evaluate("RoyaleDemo.show('home');RoyaleDemo.applyProfile({...RoyaleCore.normalizeProfile(),trophies:1300,highestTrophies:1300,gold:99999,gems:10000});")
 def snap(self,name):
  self.page.wait_for_timeout(120)
  self.page.locator('#viewport').screenshot(path=str(OUT/name))
 def test_200_decks_and_four_collection_subpages_are_separate(self):
  self.page.evaluate("RoyaleDemo.show('cards');RoyaleDemo.cardSection('decks')")
  self.assertTrue(self.page.locator('#deckRegion').is_visible())
  self.assertFalse(self.page.locator('#collectionGrid').is_visible())
  self.page.click('#deckSegments [data-id="collection"]')
  self.assertFalse(self.page.locator('#deckRegion').is_visible())
  self.assertEqual(self.page.locator('#collectionNav [role=tab]').count(),4)
  self.assertTrue(self.page.locator('#collectionGrid').is_visible())
  tile=self.page.locator('#collectionGrid [data-id="bats"]')
  self.assertEqual(tile.locator('.card-progress b').inner_text(),'Not Found')
  self.assertFalse(tile.locator('.card-level').is_visible())
  self.assertTrue(tile.evaluate('(e)=>{const b=e.getBoundingClientRect(),t=e.querySelector(".card-progress").getBoundingClientRect();return t.left>=b.left-1&&t.right<=b.right+1}'))
  self.snap('collection-cards.png')
  for tab in ['emotes','tower-skins','magic-items']:
   self.page.click('#collectionNav [data-id="'+tab+'"]')
   self.assertFalse(self.page.locator('#collectionGrid').is_visible())
   self.assertFalse(self.page.locator('#deckRegion').is_visible())
   self.assertTrue(self.page.locator('#cosmeticCollection').is_visible())
   self.assertEqual(self.page.locator('#collectionNav [aria-selected="true"]').get_attribute('data-id'),tab)
   if tab=='tower-skins':self.page.wait_for_function('[...document.querySelectorAll("#cosmeticCollection canvas[data-skin-preview]")].every(c=>c.dataset.rendered==="true")')
   self.snap('collection-'+tab+'.png')
  self.page.click('#deckSegments [data-id="decks"]')
  self.assertTrue(self.page.locator('#deckRegion').is_visible())
  self.assertFalse(self.page.locator('#collectionNav').is_visible())
 def test_201_original_classic_preview_and_equipped_tower_reach_battle(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,ownedTowerSkins:RoyaleMenu.towerSkins.map(s=>s.id)});RoyaleDemo.show('cards');RoyaleDemo.librarySection('tower-skins')")
  self.page.wait_for_function('[...document.querySelectorAll("canvas[data-skin-preview]")].every(c=>c.dataset.rendered==="true")')
  hashes=self.page.evaluate('''()=>[...document.querySelectorAll('#cosmeticCollection canvas[data-skin-preview]')].map(c=>{
   const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0,h=2166136261;
   for(let i=0;i<data.length;i++){h=Math.imul(h^data[i],16777619);if(i%4===3&&data[i])n++;}return {id:c.dataset.skinPreview,n,h:h>>>0};})''')
  self.assertEqual(len(hashes),1);self.assertEqual(hashes[0]['id'],'classic')
  for v in hashes:self.assertGreater(v['n'],3000,v['id'])
  self.page.click('#cosmeticCollection [data-id="classic"]')
  self.assertTrue(self.page.locator('#modalPanel [data-action="select-tower-skin"]').is_disabled())
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.selectedTowerSkin'),'classic')
  self.page.evaluate("async()=>{await RoyaleDemo.startBattle('Default',true);RoyaleDemo.battle.paused=true}")
  self.assertTrue(self.page.evaluate("RoyaleDemo.battle.towers.filter(t=>t.team===0).every(t=>t.skin==='classic')"))
  self.page.wait_for_timeout(1900);self.snap('equipped-towers.png')
 def test_202_shop_has_no_collection_inventory_and_refreshes_live(self):
  self.page.evaluate("window.__originalNow=Date.now;window.__testNow=Date.UTC(2026,8,24,12,30);Date.now=()=>window.__testNow;RoyaleDemo.show('shop')")
  self.assertEqual(self.page.locator('.shop-deals-section .shop-offer').count(),9)
  self.assertEqual(self.page.locator('#emoteShop .shop-offer').count(),3)
  self.assertEqual(self.page.locator('#towerSkinShop .shop-offer').count(),0)
  self.assertIn('not bundled',self.page.locator('#towerSkinShop').inner_text())
  self.assertEqual(self.page.locator('#magicItemsShop, #shopContent .magic-items-strip').count(),0)
  self.assertNotIn('Collection',self.page.locator('#shopContent').inner_text())
  self.page.wait_for_function('[...document.querySelectorAll("#towerSkinShop canvas[data-skin-preview]")].every(c=>c.dataset.rendered==="true")')
  self.assertEqual(self.page.locator('#towerSkinShop .skin-offer small').count(),0)
  previous=self.page.locator('#emoteShop [data-action="buy-emote"]').evaluate_all('(a)=>a.map(x=>x.dataset.id)')
  self.page.locator('#towerSkinShop').scroll_into_view_if_needed();self.snap('shop-tower-previews.png')
  self.page.evaluate('window.__testNow+=3600000')
  self.page.wait_for_timeout(1300)
  current=self.page.locator('#emoteShop [data-action="buy-emote"]').evaluate_all('(a)=>a.map(x=>x.dataset.id)')
  self.assertNotEqual(previous,current)
  self.page.evaluate('Date.now=window.__originalNow;RoyaleDemo.renderShop()')
 def test_203_magic_items_are_consumed_by_real_upgrade_and_chest_paths(self):
  self.page.evaluate("RoyaleDemo.applyProfile({...RoyaleDemo.profile,magicItems:{'common-book':1,'magic-coin':1,'chest-key':1},copies:{knight:0},cardLevels:{knight:4},chests:[{id:'key-check',kind:'gold',winsProgress:0}]});RoyaleDemo.show('cards');RoyaleDemo.librarySection('magic-items')")
  self.page.click('[data-action="magic-item"][data-id="common-book"]');self.page.select_option('#magicTarget','knight');self.page.click('[data-action="use-magic-item"]')
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.magicItems["common-book"]'),0)
  before=self.page.evaluate('({gold:RoyaleDemo.profile.gold,xp:RoyaleDemo.profile.experience,level:RoyaleDemo.profile.cardLevels.knight})')
  self.page.click('[data-action="magic-item"][data-id="magic-coin"]');self.page.select_option('#magicTarget','knight');self.page.click('[data-action="use-magic-item"]')
  after=self.page.evaluate('({gold:RoyaleDemo.profile.gold,xp:RoyaleDemo.profile.experience,level:RoyaleDemo.profile.cardLevels.knight})')
  self.assertEqual(after['gold'],before['gold']);self.assertEqual(after['level'],before['level']+1);self.assertGreater(after['xp'],before['xp'])
  self.page.click('[data-action="magic-item"][data-id="chest-key"]');self.page.select_option('#magicTarget','key-check');self.page.click('[data-action="use-magic-item"]')
  self.assertTrue(self.page.evaluate("RoyaleEconomy.chestReady(RoyaleDemo.profile.chests[0])"))
  self.assertEqual(self.page.evaluate('RoyaleDemo.profile.magicItems["chest-key"]'),0)
 def test_204_timer_and_all_elixir_badges_fit_inside_their_canvas(self):
  r=self.page.evaluate('''()=>{const result=[];for(const mult of [1,2,3,7]){const cv=document.createElement('canvas');cv.width=420;cv.height=420;RoyalePresentation.timer(cv.getContext('2d'),59,mult,121);
   const d=cv.getContext('2d').getImageData(0,0,420,420).data;let x0=420,y0=420,x1=0,y1=0;for(let y=0;y<420;y++)for(let x=0;x<420;x++)if(d[(y*420+x)*4+3]>8){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}result.push({mult,x0,y0,x1,y1});}return {bounds:result,width:document.getElementById('nativeBattleTimer').width,height:document.getElementById('nativeBattleTimer').height};}''')
  for v in r['bounds']:
   self.assertGreater(v['x0'],0,v);self.assertGreater(v['y0'],0,v);self.assertLess(v['x1'],r['width']-1,v);self.assertLess(v['y1'],r['height']-1,v)
  self.page.evaluate("async()=>{await RoyaleDemo.startBattle('TripleElixir',true);RoyaleDemo.battle.paused=true}")
  self.page.wait_for_timeout(2000);self.snap('timer-triple-elixir.png')
 def test_205_all_arenas_resolve_and_draw_every_normal_overtime_layer(self):
  ids=self.page.evaluate('RoyaleDemo.native.data.arenas.map(a=>a.id)'); results=[]
  self.page.evaluate("RoyaleDemo.show('battle')")
  for aid in ids:
   result=self.page.evaluate('''async(id)=>{const l=RoyaleDemo.native;l.setArena(id);const b=new RoyaleCore.Battle({ai:false});await l.prepareBattle(b,RoyaleCore.DATA);
    const all=[...RoyaleNative.arenaLayers(l.arena,false),...RoyaleNative.arenaLayers(l.arena,true)];const unresolved=all.filter(o=>l.scenes[o.scene||l.arena.scene]?.id(o.name)===undefined).map(o=>o.name);
    const cv=document.getElementById('battleCanvas'),ct=cv.getContext('2d');ct.setTransform(2,0,0,2,0,0);
    for(const overtime of [true,false]){b.overtime=overtime;RoyaleDraw.battle(ct,b,5,null,null,1);}return {id,unresolved,count:all.length,cache:l.arenaCache.size};}''',aid)
   self.assertEqual(result['unresolved'],[],aid);self.assertGreater(result['count'],2,aid)
   self.page.locator('#battleCanvas').screenshot(path=str(OUT/('arena-'+aid+'.png')))
   results.append(result)
  (OUT/'arena-checks.json').write_text(json.dumps(results,indent=2))
 def test_206_five_requested_spells_have_visible_flight_and_impact_for_both_teams(self):
  results=[];self.page.evaluate("RoyaleDemo.show('battle');RoyaleDemo.native.setArena('pekka')")
  for team in [0,1]:
   for cid in ['fireball','rocket','arrows','the-log','barbarian-barrel']:
    result=self.page.evaluate('''async({id,team})=>{const fill=['knight','archers','cannon','musketeer','bomber','giant','mini-pekka'],deck=[id,...fill],b=new RoyaleCore.Battle({ai:false,deck,enemyDeck:deck,shuffle:false});
     const l=RoyaleDemo.native;await l.prepareBattle(b,RoyaleCore.DATA);b.elixir[team]=10;
     const rolling=id==='the-log'||id==='barbarian-barrel',y=rolling?(team?13:19):(team?23:9),x=9*RoyaleCore.SX;
     const rr=b.deploy(team,0,x,y*RoyaleCore.SY);window.__spellBattle=b;const before=l.fx.summary().sprites;let direct=0,frames=[],missingBefore=new Set(l.fx.summary().missing);
     const cv=document.getElementById('battleCanvas'),ct=cv.getContext('2d');ct.setTransform(2,0,0,2,0,0);
     for(let i=0;i<420;i++){b.step(1/60);if(i%12===0){b.visualTime=b.time;RoyaleDraw.battle(ct,b,b.time,null,null,1);for(const p of b.projectiles)if(l.drawProjectile(ct,p,b.time,b))direct++;if(b.effects.some(e=>e.kind==='rollingDeploy'))direct++;if(i<150)frames.push({t:b.time,projectiles:b.projectiles.map(p=>p.name),effect:b.effects.map(e=>e.kind),barb:b.units.some(u=>u.entity==='Barbarian')});}}
     return {id,team,ok:rr.ok,direct,sprites:l.fx.summary().sprites-before,missing:l.fx.summary().missing.filter(n=>!missingBefore.has(n)),frames,barbarian:frames.some(f=>f.barb)};}''',{'id':cid,'team':team})
    self.assertTrue(result['ok'],(cid,team));self.assertEqual(result['missing'],[],(cid,team))
    self.assertGreater(result['sprites'],0,(cid,team))
    if cid!='arrows':self.assertGreater(result['direct'],0,(cid,team))
    if cid=='barbarian-barrel':self.assertTrue(result['barbarian'],(cid,team))
    results.append(result)
  (OUT/'spell-checks.json').write_text(json.dumps(results,indent=2))
 def test_207_arena_input_uses_the_same_camera_as_rendering(self):
  self.page.evaluate("async()=>{await RoyaleDemo.startBattle('Default',true);const b=RoyaleDemo.battle;b.ai=false;b.elixir[0]=10;b.paused=false;RoyaleDemo.select(0)}")
  pos=self.page.evaluate("()=>{const r=document.getElementById('viewport').getBoundingClientRect(),p=RoyaleBattleView.toScreen({x:9*RoyaleCore.SX,y:22*RoyaleCore.SY});return {x:r.left+p.x*r.width/540,y:r.top+p.y*r.height/RoyaleBattleView.layout.height}}")
  self.page.mouse.click(pos['x'],pos['y'])
  self.assertIsNone(self.page.evaluate('RoyaleDemo.selected'))
  self.assertGreater(self.page.evaluate('RoyaleDemo.battle.metrics.spent[0]'),0)
  self.page.evaluate('RoyaleDemo.battle.paused=true')
 def test_209_log_is_crosswise_to_its_travel_direction(self):
  r=self.page.evaluate("""async()=>{const l=RoyaleDemo.native;await l.ensureScenes(['effects']);const cv=document.createElement('canvas');cv.width=240;cv.height=240;const c=cv.getContext('2d');c.translate(120,120);const p={name:'LogProjectileRolling',team:0,x:0,y:0,line:true,vx:0,vy:-1,speed:3.33,travel:1,launchDistance:10,launchHeight:0,gravity:0,born:0};const b=new RoyaleCore.Battle({ai:false});l.drawProjectile(c,p,.3,b);const d=c.getImageData(0,0,240,240).data;let x0=240,x1=0,y0=240,y1=0;for(let y=0;y<240;y++)for(let x=0;x<240;x++)if(d[(y*240+x)*4+3]>100){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return {width:x1-x0,height:y1-y0};}""")
  self.assertGreater(r['width'],r['height']*1.7,r)
 def test_210_arrows_flight_has_source_sprite_trails_not_just_tiny_arrowheads(self):
  r=self.page.evaluate("""async()=>{const l=RoyaleDemo.native,b=new RoyaleCore.Battle({ai:false,deck:['arrows','knight','archers','cannon','musketeer','giant','mini-pekka','bomber']});await l.prepareBattle(b,RoyaleCore.DATA);const cv=document.createElement('canvas');cv.width=540;cv.height=960;const fx=l.fx,before=fx.summary().sprites;fx.begin();fx.arrows(cv.getContext('2d'),{born:0,fxId:600,wave:0,count:10,team:0,x:240,y:200,startX:240,startY:580,flightDuration:1},.65);return fx.summary().sprites-before;}""")
  self.assertGreater(r,10)
 def test_299_no_missing_assets_or_page_errors(self):
  self.assertEqual(self.errors,[]);self.assertEqual(self.missing,[])

if __name__=='__main__': unittest.main(verbosity=2)
