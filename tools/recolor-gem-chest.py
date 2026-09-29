#!/usr/bin/env python3
"""Deterministic palette-only Golden Chest variant. Keeps source alpha and geometry.

Requires Pillow and NumPy only to regenerate artwork. Generated files are bundled
in dist, so normal builds/restores and playing the game do not require Python.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def recolor(source,destination):
    image=Image.open(source).convert('RGBA')
    hsv=np.asarray(image.convert('RGB').convert('HSV')).copy()
    hue,sat,val=hsv[:,:,0].copy(),hsv[:,:,1].copy(),hsv[:,:,2].copy()
    gold=(hue>=13)&(hue<=49)&(sat>60)
    blue=(hue>=116)&(hue<=181)&(sat>30)
    hsv[:,:,0][gold]=88  # emerald green
    hsv[:,:,1][gold]=np.clip(sat[gold].astype(np.float32)*.87,0,240).astype('uint8')
    hsv[:,:,0][blue]=145
    hsv[:,:,1][blue]=np.minimum(sat[blue],15)
    hsv[:,:,2][blue]=(val[blue].astype(np.float32)*.36).astype('uint8')
    result=Image.fromarray(hsv,'HSV').convert('RGBA');result.putalpha(image.getchannel('A'))
    destination.parent.mkdir(parents=True,exist_ok=True)
    result.save(destination,**({'lossless':True,'method':6} if destination.suffix=='.webp' else {}))
    return {'source':str(source.relative_to(ROOT)),'file':str(destination.relative_to(ROOT)), 'width':result.width,'height':result.height,'goldPixels':int(gold.sum()),'bluePixels':int(blue.sum())}
if __name__=='__main__':
    report=[recolor(ROOT/'assets/ui/gold-chest.png',ROOT/'assets/ui/gem-chest.png'),recolor(ROOT/'assets/native/chest-opening-0.webp',ROOT/'assets/native/gem-chest-opening-0.webp')]
    print(json.dumps(report,indent=2))
