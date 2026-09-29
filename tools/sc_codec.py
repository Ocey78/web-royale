"""Bounded reader for the original SC v1 data supplied with this demo.

Reads source frame order, polygon UVs and transforms; never invents frames.
Format references (not runtime dependencies): jeanbmar/sc-tools, MIT.
Unsupported tags raise instead of silently generating replacement graphics.
"""
from __future__ import annotations
import struct, lzma, hashlib
import numpy as np

class Reader:
 def __init__(self,data:bytes):self.data=data;self.pos=0
 def take(self,n:int)->bytes:
  if n<0 or self.pos+n>len(self.data):raise ValueError(f'Truncated SC at {self.pos}, need {n} bytes')
  b=self.data[self.pos:self.pos+n];self.pos+=n;return b
 def num(self,fmt):return struct.unpack('<'+fmt,self.take(struct.calcsize('<'+fmt)))[0]
 def u8(self):return self.num('B')
 def u16(self):return self.num('H')
 def i16(self):return self.num('h')
 def i32(self):return self.num('i')
 def string(self):
  n=self.u8();return '' if n==255 else self.take(n).decode('utf8',errors='strict')
 def tag(self):return self.u8(),Reader(self.take(self.i32()))
 def __bool__(self):return self.pos<len(self.data)

def unpack(data:bytes)->bytes:
 expected_hash=None
 if data[:2]==b'SC':
  if len(data)<10:raise ValueError('Truncated SC wrapper')
  version=int.from_bytes(data[2:6],'big')
  if version!=1:raise ValueError(f'Unsupported SC wrapper version {version}')
  n=int.from_bytes(data[6:10],'big')
  if n!=16 or len(data)<10+n+9:raise ValueError('Invalid SC digest header')
  expected_hash=data[10:10+n];data=data[10+n:]
 if len(data)<9:raise ValueError('Truncated LZMA block')
 size=int.from_bytes(data[5:9],'little')
 if size>128*1024*1024:raise ValueError('SC block exceeds extraction limit')
 decoder=lzma.LZMADecompressor(format=lzma.FORMAT_ALONE,memlimit=256*1024*1024)
 result=decoder.decompress(data[:9]+b'\0'*4+data[9:],max_length=size+1)
 if len(result)!=size:raise ValueError(f'LZMA length mismatch {len(result)} != {size}')
 if expected_hash and hashlib.md5(result).digest()!=expected_hash:raise ValueError('SC payload digest mismatch')
 return result

def untile(flat,width,height):
 result=np.empty((height,width),dtype=flat.dtype);i=0
 for y in range(0,height,32):
  h=min(32,height-y)
  for x in range(0,width,32):
   w=min(32,width-x);result[y:y+h,x:x+w]=flat[i:i+w*h].reshape(h,w);i+=w*h
 return result

def rgba(data,code,width,height,tiled):
 count=width*height
 if not 0<width<=8192 or not 0<height<=8192:raise ValueError('Invalid texture size')
 bpp=2 if code in (2,3,4,6,9) else 1 if code==10 else 4
 if len(data)!=count*bpp:raise ValueError(f'Texture payload mismatch {len(data)} != {count*bpp}')
 flat=np.frombuffer(data,dtype={1:'u1',2:'<u2',4:'<u4'}[bpp]);p=untile(flat,width,height) if tiled else flat.reshape(height,width)
 if code in (2,9):channels=[((p>>s)&15)*17 for s in (12,8,4,0)]
 elif code==3:channels=[((p>>s)&31)*255//31 for s in (11,6,1)]+[(p&1)*255]
 elif code==4:channels=[((p>>11)&31)*255//31,((p>>5)&63)*255//63,(p&31)*255//31,np.full_like(p,255)]
 elif code==6:channels=[p&255,p&255,p&255,p>>8]
 elif code==10:channels=[p,p,p,np.full_like(p,255)]
 elif code in (0,1):channels=[(p>>s)&255 for s in (0,8,16,24)]
 else:raise ValueError(f'Unsupported pixel code {code}')
 return np.stack(channels,axis=-1).astype(np.uint8)

TEXTURE_TAGS=(1,16,19,24,27,28,29,34)
def texture(r,tag,pixels):
 code=r.u8();w=r.u16();h=r.u16();b=r.take(len(r.data)-r.pos)
 return {'w':w,'h':h,'code':code,'pixels':rgba(b,code,w,h,tag in (27,28,29)) if b and pixels else None}

def parse(data:bytes,pixels=False):
 r=Reader(data);counts=[r.u16() for _ in range(6)];r.take(5)
 ids=[r.u16() for _ in range(r.u16())];exports={r.string():i for i in ids}
 banks=[(0,0)];pending_banks={}
 obj={'exports':exports,'shapes':{},'clips':{},'matrices':[],'colors':[],'textures':[],'flags':[],'counts':counts,'textFields':{}}
 while r:
  tag,q=r.tag()
  if tag==0:break
  if tag in (23,26,30):obj['flags'].append(tag)
  elif tag in TEXTURE_TAGS:obj['textures'].append(texture(q,tag,pixels))
  elif tag==42:
   banks.append((len(obj['matrices']),len(obj['colors'])));q.u16();q.u16()
  elif tag in (2,18):
   sid=q.u16();cnt=q.u16()
   if tag==18:q.u16()
   chunks=[]
   while q:
    st,c=q.tag()
    if st==0:break
    if st not in (4,17,22):raise ValueError(f'Unsupported shape tag {st}')
    tex=c.u8();n=4 if st==4 else c.u8()
    xy=[[c.i32()/20,c.i32()/20] for _ in range(n)]
    uv=[[c.u16()/65535,c.u16()/65535] for _ in range(n)]
    chunks.append({'texture':tex,'xy':xy,'uv':uv})
    if c:raise ValueError('Trailing shape data')
   if len(chunks)!=cnt:raise ValueError('Shape count mismatch')
   obj['shapes'][str(sid)]=chunks
  elif tag in (10,12,35):
   cid=q.u16();fps=q.u8();count=q.u16();n=q.i32()
   if n<0 or n>1000000:raise ValueError('Invalid timeline size')
   entries=[[q.u16(),q.u16(),q.u16()] for _ in range(n)]
   children=[q.u16() for _ in range(q.u16())]
   blend=[q.u8() for _ in children] if tag in (12,35) else [0]*len(children)
   names=[q.string() for _ in children];frames=[];labels=[];frame_names=[];grids=[];at=0;bank=0
   while q:
    st,c=q.tag()
    if st==0:break
    if st==11:
     size=c.u16();labels.append(c.string());frame=[];fnames=[]
     for child,matrix,color in entries[at:at+size]:
      if child>=len(children):raise ValueError('Invalid child reference')
      frame.append([children[child],matrix,color,blend[child]]);fnames.append(names[child])
     frames.append(frame);frame_names.append(fnames);at+=size
    elif st==41:bank=c.u8()
    elif st==31:grids.append([c.i32()/20 for _ in range(4)])
    else:raise ValueError(f'Unsupported clip tag {st}')
   if at!=len(entries) or len(frames)!=count:raise ValueError(f'Clip {cid} frame mismatch')
   obj['clips'][str(cid)]={'fps':fps,'frames':frames,'labels':labels,'childrenNames':names,'children':children,'frameNames':frame_names,'scalingGrids':grids}
   pending_banks[str(cid)]=bank
  elif tag in (37,38,39,40):obj.setdefault('modifiers',{})[str(q.u16())]=tag
  elif tag in (8,36):
   m=[q.i32() for _ in range(6)];div=1024 if tag==8 else 65535
   obj['matrices'].append([m[0]/div,m[1]/div,m[2]/div,m[3]/div,m[4]/20,m[5]/20])
  elif tag==9:obj['colors'].append([q.u8() for _ in range(7)])
  elif tag in (7,15,20,21,25,33,43,44):
   tid=q.u16();f={'tag':tag,'rawBytes':len(q.data),'fontName':q.string(),'color':q.i32()}
   f['flags']=[bool(q.u8()) for _ in range(4)];f['multiline']=f['flags'][2]
   f['align']=q.u8();f['fontSize']=q.u8();f['bounds']=[q.i16() for _ in range(4)]
   f['flag14']=bool(q.u8());f['text']=q.string()
   if tag!=7:
    f['outline']=bool(q.u8())
    if tag in (21,25,33,43,44):f['outlineColor']=q.i32()
    if tag in (33,43,44):f['shadow']=[q.i16(),q.i16()]
    if tag in (43,44):f['field20']=q.i16()
    if tag==44:f['field21']=q.u8()
   obj['textFields'][str(tid)]=f
  else:raise ValueError(f'Unsupported top-level SC tag {tag}')
  if q and tag not in (31,41):raise ValueError(f'Trailing bytes on tag {tag}: {len(q.data)-q.pos}')
 if r:raise ValueError('Trailing bytes after end of SC')
 # Flatten independently indexed matrix/color banks. Preserve 65535 as the
 # no-transform sentinel even when the combined matrix table exceeds 65535.
 for cid,bank in pending_banks.items():
  if bank>=len(banks):raise ValueError('Invalid matrix-bank reference')
  mo,co=banks[bank]
  for frame in obj['clips'][cid]['frames']:
   for item in frame:
    for index,offset in [(1,mo),(2,co)]:
     if item[index]!=65535:
      value=item[index]+offset;item[index]=value+(1 if value>=65535 else 0)
 if len(obj['matrices'])>65535:obj['matrices'].insert(65535,[1,0,0,1,0,0])
 if len(obj['colors'])>65535:obj['colors'].insert(65535,[0,0,0,255,255,255,255])
 return obj

def textures(data:bytes):
 r=Reader(data);out=[]
 while r:
  tag,q=r.tag()
  if tag==0:break
  if tag not in TEXTURE_TAGS:raise ValueError(f'Unsupported texture tag {tag}')
  out.append(texture(q,tag,True))
 if r:raise ValueError('Trailing bytes after textures')
 return out
