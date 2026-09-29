"""Reconstruct stretchable source buttons from their exported caps.
SC exports have separated corners: the centre is supplied by the native scaling
 grid at runtime. Here the original border pixels are extended, not stretched
 together with the full transparent export. Requires Pillow only for rebuilding.
"""
from pathlib import Path
import json
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]

def caps(image, width=360, height=112, cap=36):
    w,h=image.size
    out=Image.new('RGBA',(width,height))
    # Preserve the four complete corners; avoid the export's faded inner edges.
    for sx,dx in ((0,0),(w-cap,width-cap)):
        out.paste(image.crop((sx,0,sx+cap,cap)),(dx,0))
        out.paste(image.crop((sx,h-cap,sx+cap,h)),(dx,height-cap))
        a=image.crop((sx,cap-1,sx+cap,cap))
        b=image.crop((sx,h-cap,sx+cap,h-cap+1))
        for y in range(cap,height-cap):
            out.paste(Image.blend(a,b,(y-cap+1)/(height-2*cap+1)),(dx,y))
    # The horizontal seams are repeated single native pixel columns.
    for y in range(height):
        colour=out.getpixel((cap-1,y))
        out.paste(colour,(cap,y,width-cap,y+1))
    return out

def main():
    manifest_path=ROOT/'assets/ui/manifest.json'
    m=json.loads(manifest_path.read_text())
    for colour in ['blue','red']:
        key='button-'+colour; src=Image.open(ROOT/m[key]['file']).convert('RGBA')
        out=caps(src)
        name=key+'-fixed';f='assets/ui/'+name+'.png';out.save(ROOT/f,optimize=True)
        m[name]={'file':f,'source':m[key]['source'],'width':out.width,'height':out.height,'processing':'Original cap pixels with centre/edge interpolation; not a new SC export.'}
    src=Image.open(ROOT/m['button-orange']['file']).convert('RGBA')
    out=Image.new('RGBA',(360,src.height));cap=32
    out.paste(src.crop((0,0,cap,src.height)),(0,0));out.paste(src.crop((src.width-cap,0,src.width,src.height)),(360-cap,0))
    out.paste(src.crop((cap-1,0,cap,src.height)).resize((360-2*cap,src.height)),(cap,0))
    key='button-gold-fixed';f='assets/ui/'+key+'.png';out.save(ROOT/f,optimize=True)
    m[key]={'file':f,'source':m['button-orange']['source'],'width':out.width,'height':out.height,'processing':'Original orange endcaps with a repeated centre column.'}
    manifest_path.write_text(json.dumps(m,indent=2)+'\n')
    print('Reassembled 3 button surfaces from original source pixels.')
if __name__=='__main__':main()
