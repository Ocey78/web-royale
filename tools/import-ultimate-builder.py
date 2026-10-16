"""Convert the original public CoC worker animation into a native browser scene.

Input: decompressed SC payload from the documented source URL (Node's zstd
decoder can unpack bytes after offset 30 of its SC4 wrapper). Requires Pillow,
NumPy and texture2ddecoder. Does not alter any shared source catalogs.
"""
import argparse, hashlib, json, struct, sys
from pathlib import Path
from PIL import Image
import texture2ddecoder
from sc_codec import Reader, parse
from extract_game_assets import trim

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('payload',type=Path)
parser.add_argument('--out',type=Path,default=ROOT/'assets/ultimate-clash')
args=parser.parse_args()
raw=args.payload.read_bytes();r=Reader(raw);r.take(17)
ids=[r.u16() for _ in range(r.u16())]
for _ in ids:r.string()
normalized=bytearray(raw[:r.pos]);atlas=None
while r:
    tag,q=r.tag()
    if tag==45:
        # SC's embedded KTX1 texture: size, pixel type, dimensions, KTX bytes.
        ktx=q.data[9:]
        if ktx[:12]!=b'\xabKTX 11\xbb\r\n\x1a\n':raise ValueError('Expected KTX1')
        fields=struct.unpack_from('<13I',ktx,12)
        endian,gl_type,type_size,fmt,internal,base,w,h,depth,arrays,faces,mips,key_bytes=fields
        if endian!=0x04030201 or internal!=0x93B4 or depth or arrays or faces!=1:raise ValueError('Expected ASTC 6x6 2D texture')
        start=64+key_bytes;length=struct.unpack_from('<I',ktx,start)[0]
        pixels=texture2ddecoder.decode_astc(ktx[start+4:start+4+length],w,h,6,6)
        atlas=Image.frombytes('RGBA',(w,h),pixels,'raw','BGRA')
        # Scene parsing needs the original atlas dimensions but not pixels.
        payload=struct.pack('<BHH',0,w,h)
        normalized.extend(struct.pack('<BI',1,len(payload))+payload)
    else:normalized.extend(struct.pack('<BI',tag,len(q.data))+q.data)
    if tag==0:break
scene=parse(bytes(normalized),pixels=False)
keep=[name for name in scene['exports'] if name.startswith(('worker_build','worker_battle_build','worker_idle','worker_battle_idle','worker_walk','worker_battle_walk'))]
scene=trim(scene,keep)
if atlas is None:raise ValueError('Builder atlas missing')
args.out.mkdir(parents=True,exist_ok=True)
atlas.save(args.out/'builder-atlas.png',optimize=True)
scene['textures'][0]['file']='builder-atlas.png';scene['textures'][0].pop('pixels',None)
scene['source']={'game':'Clash of Clans','version':'16.0.23','file':'sc/chr_worker.sc','url':'https://game-assets.clashofclans.com/eb14a08ba806774b06e631b82ac36d265c22e11d/sc/chr_worker.sc','fingerprint':'https://raw.githubusercontent.com/Enjoyop/coc-assets/main/v16.0.25/fingerprint.json','payloadSha256':hashlib.sha256(raw).hexdigest(),'converted':'Original animation timelines, transforms, polygons and ASTC texture; no redrawn frames.'}
(args.out/'builder.json').write_text(json.dumps(scene,separators=(',',':')),encoding='utf8')
print(json.dumps({'exports':len(scene['exports']),'clips':len(scene['clips']),'atlas':atlas.size,'sceneBytes':(args.out/'builder.json').stat().st_size}))
