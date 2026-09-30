from pathlib import Path
import argparse,json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/verification-v045/maps';OUT.mkdir(parents=True,exist_ok=True)
ids=['TeamRumble','TeamRumbleArcReverse','TeamRumbleRiverLine','Team3v3','Team3v3Jungle','Team3v3Volcano','BridgeBattle','BridgeBattleLava','BridgeBattleGarden','Touchdown','Touchdown3v3','FreeForAll']
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':900,'height':1200})
 page.set_content('<html><body style="margin:0;background:#111;display:flex;justify-content:center"></body></html>')
 page.add_script_tag(content=(ROOT/'src/arena-layout.js').read_text())
 page.evaluate('window.RoyaleGraphics={current:{textures:"high",textureScale:1,arenaScale:1,arenaAnimated:true}}')
 page.add_script_tag(content=(ROOT/'src/custom-arena.js').read_text())
 results=[]
 for id in ids:
  page.evaluate('''id=>{document.body.innerHTML='';const cv=RoyaleCustomArena.prepare({arenaLayout:RoyaleArenaLayout.get(id),time:1,visualTime:1},null);cv.style.maxWidth='100vw';cv.style.height='auto';document.body.appendChild(cv);}''',id)
  loc=page.locator('canvas'); loc.screenshot(path=str(OUT/(id+'.png')))
  box=loc.bounding_box(); results.append({'id':id,'width':box['width'],'height':box['height']})
 (OUT/'report.json').write_text(json.dumps(results,indent=2))
 b.close()
