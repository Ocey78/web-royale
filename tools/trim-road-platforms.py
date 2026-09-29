#!/usr/bin/env python3
"""Trim excessive low-opacity export padding from the original road tiles.
No pixels are redrawn: retain opaque source geometry and a 12px shadow margin.
Idempotent via the crop manifest; run after first source extraction, before build.
"""
import json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'assets/game/road-platform-crops.json'
def opaque_bounds(image):
    return image.convert('RGBA').getchannel('A').point(lambda a:255 if a>128 else 0).getbbox()
def main():
    if MANIFEST.exists():
        old=json.loads(MANIFEST.read_text())
        if all(list(Image.open(ROOT/p).size)==row['outputSize'] for p,row in old.items()):
            print('Original road crops already applied:',len(old));return
    out={}
    for p in sorted((ROOT/'assets/ui').glob('classic-platform-*.webp')):
        im=Image.open(p).convert('RGBA');b=opaque_bounds(im)
        if not b:raise ValueError('No platform pixels: '+str(p))
        box=[max(0,b[0]-12),max(0,b[1]-12),min(im.width,b[2]+12),min(im.height,b[3]+12)]
        trimmed=im.crop(box);out[p.relative_to(ROOT).as_posix()]={'sourceSize':list(im.size),'crop':box,'outputSize':list(trimmed.size)}
        trimmed.save(p,'WEBP',lossless=True)
    MANIFEST.write_text(json.dumps(out,indent=2)+'\n');print('Trimmed',len(out),'original platforms')
if __name__=='__main__':main()
