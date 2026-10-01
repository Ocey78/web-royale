from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/verification-v047/browser'; OUT.mkdir(parents=True,exist_ok=True)
ARENAS=[
 ('BridgeBattle','16-frozen-causeway-390'),
 ('BridgeBattleLava','17-lava-causeway-390'),
 ('BridgeBattleGarden','18-royal-garden-390'),
 ('Touchdown','19-touchdown-390'),
]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
    page.set_content('''<!doctype html><html><body style="margin:0;background:#101827;overflow:hidden"><canvas id="v" width="390" height="844" style="width:390px;height:844px"></canvas></body></html>''')
    page.add_script_tag(content=(ROOT/'src/arena-layout.js').read_text())
    page.evaluate("window.RoyaleGraphics={current:{arenaScale:1.15,textureScale:.9,arenaAnimated:false,arenaFps:0,arenaBackgrounds:'med'}}")
    page.add_script_tag(content=(ROOT/'src/custom-arena.js').read_text())
    for arena,name in ARENAS:
        page.evaluate('''arena=>{
          RoyaleCustomArena.clear();
          const l=RoyaleArenaLayout.get(arena), fake={arenaLayout:l,time:0,visualTime:0};
          const cv=RoyaleCustomArena.prepare(fake,null), r=cv.worldRect, out=document.getElementById('v'), c=out.getContext('2d');
          c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,out.width,out.height);
          const bg=c.createLinearGradient(0,0,0,out.height);bg.addColorStop(0,'#0b1423');bg.addColorStop(1,'#1d2c3f');c.fillStyle=bg;c.fillRect(0,0,out.width,out.height);
          const margin=8, scale=Math.min((out.width-margin*2)/r.width,(out.height-margin*2)/r.height);
          const ox=(out.width-r.width*scale)/2-r.x*scale, oy=(out.height-r.height*scale)/2-r.y*scale;
          c.save();c.setTransform(scale,0,0,scale,ox,oy);c.drawImage(cv,r.x,r.y,r.width,r.height);if(cv.foreground)c.drawImage(cv.foreground,r.x,r.y,r.width,r.height);
          // Lightweight tower markers use exact logical positions, only to show alignment in an environment preview.
          if(l.kings?.length){for(const team of [0,1]){const flip=y=>team?y:32-y, col=team?'#b64659':'#3481bd';for(let i=0;i<l.kings.length;i++){const x=l.kings[i]*(480/18),y=flip(l.kingYs?.[i]??l.kingY??3)*20;c.fillStyle='#26374c';c.strokeStyle='#d7bd78';c.lineWidth=2;c.fillRect(x-18,y-18,36,36);c.strokeRect(x-18,y-18,36,36);c.fillStyle=col;c.fillRect(x-13,y-11,26,20);}for(let i=0;i<l.lanes.length;i++){const x=l.lanes[i]*(480/18),y=flip(l.princessY[i])*20;c.fillStyle='#37495a';c.strokeStyle='#c7b47c';c.lineWidth=1.5;c.fillRect(x-13,y-14,26,28);c.strokeRect(x-13,y-14,26,28);}}}
          c.restore();
          c.fillStyle='rgba(8,17,29,.88)';c.fillRect(9,9,372,34);c.fillStyle='#fff1bd';c.font='700 15px Arial';c.textAlign='center';c.fillText(arena.replace(/([a-z])([A-Z])/g,'$1 $2'),195,31);
        }''',arena)
        page.screenshot(path=str(OUT/(name+'.png')))
        print('rendered',name,flush=True)
    browser.close()
