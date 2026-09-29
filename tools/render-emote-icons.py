"""Render original paired icons and measure whole-animation extents offline."""
from pathlib import Path
import json,base64
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
def main():
 catalog=json.loads((R/'assets/emotes/catalog.json').read_text());manifest=json.loads((R/'assets/ui/manifest.json').read_text())
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page();page.set_content('<html></html>');page.add_script_tag(path=str(R/'src/native.js'))
  for name,file in catalog['scenes'].items():
   data=json.loads((R/file).read_text());urls=['data:image/webp;base64,'+base64.b64encode((R/t['file']).read_bytes()).decode() for t in data['textures']]
   entries=[e for e in catalog['entries'] if e['scene']==name]
   rows=page.evaluate('''async({data,urls,entries})=>{const images=await Promise.all(urls.map(src=>new Promise((r,j)=>{const im=new Image();im.onload=()=>r(im);im.onerror=j;im.src=src;})));const sc=new RoyaleNative.Scene(data,images);return entries.map(e=>{const b=sc.bounds(e.iconExport),cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d'),s=Math.min(240/Math.max(1,b.width),240/Math.max(1,b.height));c.translate(128-(b.x+b.width/2)*s,128-(b.y+b.height/2)*s);c.scale(s,s);sc.draw(c,e.iconExport,0,{frame:0});const boxes=Array.from({length:12},(_,i)=>sc.bounds(e.animation,(e.frames-1)/e.fps*i/11));const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y)),r=Math.max(...boxes.map(b=>b.x+b.width)),bottom=Math.max(...boxes.map(b=>b.y+b.height));return {id:e.id,icon:cv.toDataURL(),bounds:{x,y,width:r-x,height:bottom-y}};});}''',{'data':data,'urls':urls,'entries':entries})
   for row in rows:
    fn='assets/ui/emote-'+row['id']+'.png';(R/fn).write_bytes(base64.b64decode(row['icon'].split(',')[1]));manifest['emote-'+row['id']]={'file':fn,'source':'sc/'+name+'.sc','width':256,'height':256}
    next(e for e in entries if e['id']==row['id'])['bounds']=row['bounds']
   print(name,len(rows),flush=True)
  browser.close()
 (R/'assets/ui/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(R/'assets/emotes/catalog.json').write_text(json.dumps(catalog,separators=(',',':')))
 (R/'src/emote-data.js').write_text("(function(r){const data="+json.dumps(catalog['entries'],separators=(',',':'))+";if(typeof module==='object'&&module.exports)module.exports=data;else r.RoyaleEmoteData=data;})(globalThis);\n")
if __name__=='__main__':main()
