"""Pixel-test copied cards with CSS mask support removed (portrait must stay visible)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops, ImageStat
import json,base64,argparse
P=argparse.ArgumentParser();P.add_argument('--output',type=Path,default=Path('docs/verification-v044/mirror'));P.add_argument('--css',default='dist');o=P.parse_args();o.output.mkdir(parents=True,exist_ok=True)
r=Path(__file__).resolve().parents[1];rel=json.loads((r/'dist/release.json').read_text());m=json.loads((r/'assets/ui/manifest.json').read_text());cards=json.loads((r/'assets/manifest.json').read_text())['cards']
def img(path):return 'data:image/png;base64,'+base64.b64encode((r/path).read_bytes()).decode()
checks=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':640,'height':400});css=(r/'dist'/rel['styles']).read_text()
 if o.css!='dist':css+='\n'+(r/o.css).read_text()
 for card in ['knight','princess','fireball']:
  path=next(x['file'] for x in cards if x['id']==card)
  page.set_content('<div id="viewport"><div class="hand-card"><span class="card-visual '+('legendary ' if card=='princess' else '')+'mirrored"><img class="card-portrait" src="'+img(path)+'"><img class="card-frame" src="'+img(m['card-frame-normal']['file'])+'"></span></div></div>')
  page.add_style_tag(content=css+'\nbody,#viewport{position:static!important;width:640px!important;height:400px!important;transform:none!important}.hand-card{position:relative!important;width:150px!important;height:200px!important;left:200px;top:60px}.card-visual{height:200px!important}')
  page.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');target=page.locator('.card-visual');a=o.output/(card+'-normal.png');target.screenshot(path=str(a))
  page.add_style_tag(content='.mirrored:after{mask:none!important;-webkit-mask:none!important}');b=o.output/(card+'-without-masks.png');target.screenshot(path=str(b))
  ia,ib=Image.open(a).convert('RGB'),Image.open(b).convert('RGB');box=(25,35,125,165);diff=ImageStat.Stat(ImageChops.difference(ia.crop(box),ib.crop(box)));err=sum(diff.mean)/3
  checks.append({'card':card,'maskDisabledInteriorError':err,'passed':err<.1})
 browser.close()
(o.output/'report.json').write_text(json.dumps(checks,indent=2));print(json.dumps(checks));assert all(x['passed'] for x in checks),'Mirror border paints over the copied portrait when CSS masks are unavailable'
