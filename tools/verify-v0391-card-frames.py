from pathlib import Path
import json,base64,re,sys,argparse,shutil
from playwright.sync_api import sync_playwright
from PIL import Image
import numpy as np
from scipy.ndimage import binary_fill_holes,binary_dilation
parser=argparse.ArgumentParser(description='Detect portrait pixels outside the native card frame silhouette. Requires Playwright, Pillow, NumPy and SciPy.');parser.add_argument('--browser',default=shutil.which('chromium'));parser.add_argument('--source-css',action='store_true');args=parser.parse_args()
root=Path(__file__).resolve().parents[1]; rel=json.loads((root/'dist/release.json').read_text()); data=json.loads((root/'dist'/rel['runtime']).read_text()); css=(root/'dist'/rel['styles']).read_text()
if '--source-css' in sys.argv: css+='\n'+(root/'src/v391.css').read_text()
ui=data['uiImages']
def src(file):
 return 'data:image/png;base64,'+base64.b64encode((root/'dist'/file.split('?')[0]).read_bytes()).decode()
red='data:image/svg+xml;base64,'+base64.b64encode(b'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#ff0000"/></svg>').decode()
body=''
for name,rarity in [('balloon','epic'),('baby-dragon','epic'),('inferno-tower','rare'),('skeleton-army','epic'),('wizard','rare'),('zap','common'),('lumberjack','legendary'),('arrows','common')]:
 frame='card-frame-legendary' if rarity=='legendary' else 'card-frame-normal'
 body+=f'<button class="card-tile" data-id="{name}"><span class="card-visual {rarity}"><img class="card-portrait" src="{red}"><img class="card-frame" src="{src(ui[frame])}"></span></button>'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=args.browser,headless=True,args=['--no-sandbox','--disable-dev-shm-usage']); page=b.new_page(viewport={'width':700,'height':800})
 page.set_content('<style>'+css+'</style><div id="viewport" style="position:relative;width:505px;height:500px"><div class="reference-cards"><div id="deckGrid" class="deck-grid">'+body+'</div></div></div>')
 page.wait_for_timeout(300)
 out=[]
 for i,el in enumerate(page.locator('.card-visual').all()):
  shot=str(root/'docs/verification-v0391'/f'card-mask-{i}.png');el.screenshot(path=shot)
  geom=el.evaluate('e=>{const r=e.getBoundingClientRect(),im=e.querySelector(".card-frame");return {w:r.width,h:r.height,nw:im.naturalWidth,nh:im.naturalHeight}}')
  png='card-frame-legendary' if i==6 else 'card-frame-normal'; im=Image.open(root/'dist'/ui[png].split('?')[0]); bounds=binary_fill_holes(np.array(im.getchannel('A'))>10)
  scale=min(geom['w']/geom['nw'],geom['h']/geom['nh']); w=round(geom['nw']*scale);h=round(geom['nh']*scale)
  actual=np.array(Image.open(shot).convert('RGB')); mask=Image.new('L',(actual.shape[1],actual.shape[0])); mask.paste(Image.fromarray((bounds*255).astype('uint8')).resize((w,h)),(round((geom['w']-w)/2),round((geom['h']-h)/2)))
  valid=binary_dilation(np.array(mask)>127,iterations=1)
  reds=(actual[:,:,0]>220)&(actual[:,:,1]<30)&(actual[:,:,2]<30)
  leaks=np.count_nonzero(reds&~valid)
  out.append({'id':i,**geom,'redPixelsOutsideFrame':int(leaks)})
 print(json.dumps(out,indent=2)); b.close()
 (root/'docs/verification-v0391/card-frame-mask.json').write_text(json.dumps(out,indent=2)+'\n')
 assert all(x['redPixelsOutsideFrame']==0 for x in out), 'Portrait pixels spill beyond the native frame silhouette'
