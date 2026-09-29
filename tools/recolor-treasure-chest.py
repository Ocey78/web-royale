#!/usr/bin/env python3
"""Palette-only variant of the shipped wooden Free Chest and its animation atlas.
Alpha, pixel dimensions, scene geometry and authored animation are unchanged.
"""
from pathlib import Path
import json
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
def recolor(source,destination):
    image=Image.open(source).convert('RGBA')
    hsv=np.asarray(image.convert('RGB').convert('HSV')).copy()
    h,s,v=hsv[:,:,0].copy(),hsv[:,:,1].copy(),hsv[:,:,2].copy()
    silver=(h>=109)&(h<=174)&(s>=17)&(v>24)
    hsv[:,:,0][silver]=30
    hsv[:,:,1][silver]=np.clip(110+s[silver].astype(float)*.55,115,212).astype('uint8')
    out=Image.fromarray(hsv,'HSV').convert('RGBA')
    # Exact original pixels outside metal mask; even wood color stays byte-exact.
    arr=np.asarray(image).copy();new=np.asarray(out);arr[silver,:3]=new[silver,:3]
    out=Image.fromarray(arr,'RGBA');out.save(destination,lossless=True,method=6)
    return {'source':source.name,'file':destination.name,'metalPixelsChanged':int(silver.sum()),'alphaUnchanged':True,'dimensions':list(out.size)}
if __name__=='__main__':
    pairs=[('assets/ui/classic-wood-chest.webp','assets/ui/treasure-chest.webp'),('assets/native/chest-opening-0.webp','assets/native/treasure-chest-opening-0.webp')]
    print(json.dumps([recolor(ROOT/s,ROOT/d) for s,d in pairs],indent=2))
