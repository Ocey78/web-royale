#!/usr/bin/env python3
"""Create a closed, CRC-tested standard ZIP before making its final path visible."""
from pathlib import Path
import argparse, hashlib, json, os, re, shutil, stat, zipfile

FONT_EXTS={'.ttf','.otf','.woff','.woff2','.eot','.ttc'}
SKIP_DIRS={'.git','node_modules','__pycache__'}

def select(root):
    paths=[]
    for p in root.rglob('*'):
        if not p.is_file() or p.is_symlink(): continue
        rel=p.relative_to(root)
        if any(x in SKIP_DIRS for x in rel.parts): continue
        if p.suffix.lower() in FONT_EXTS|{'.pyc','.apk','.zip','.partial'}: continue
        if rel.as_posix().startswith('docs/qa/'): continue
        if rel.parts[0]=='docs' and p.suffix.lower() in {'.png','.jpg','.jpeg','.webp'}: continue
        if rel.parts[0]=='assets' and p.suffix.lower() in {'.png','.webp','.wav'}: continue
        for part in rel.parts:
            if re.search(r'[<>:"\\|?*]',part) or part.rstrip(' .')!=part or re.match(r'(?i)^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)',part):
                raise ValueError(f'Unsafe Windows path: {rel}')
        paths.append(p)
    return sorted(paths,key=lambda p:p.relative_to(root).as_posix())

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--folder-name',default='Web-Royale');args=parser.parse_args();
    if not re.fullmatch(r'[A-Za-z0-9_-]+',args.folder_name):raise ValueError('Invalid archive folder name')
    root=args.root.resolve();output=args.output.resolve();output.parent.mkdir(parents=True,exist_ok=True)
    if output.exists(): raise FileExistsError(f'Refusing to replace {output}')
    temporary=output.with_suffix('.partial');paths=select(root)
    if not (root/'dist/index.html').is_file() or not (root/'open offline.bat').is_file():raise ValueError('Not a complete offline build')
    with zipfile.ZipFile(temporary,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=False) as z:
        for p in paths:
            name=args.folder_name+'/'+p.relative_to(root).as_posix()
            info=zipfile.ZipInfo(name,date_time=(2026,9,26,12,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.create_system=0;info.external_attr=0x20;info.file_size=p.stat().st_size
            with p.open('rb') as src,z.open(info,'w') as dst:shutil.copyfileobj(src,dst,1024*1024)
    # Windows requires a writable descriptor for FlushFileBuffers/_commit.
    with temporary.open('r+b') as f:os.fsync(f.fileno())
    with zipfile.ZipFile(temporary) as z:
        bad=z.testzip()
        if bad:raise ValueError('CRC failed: '+bad)
        if len(z.namelist())!=len(set(z.namelist())):raise ValueError('Duplicate entries')
        if z.read(args.folder_name+'/dist/release.json')!=(root/'dist/release.json').read_bytes():raise ValueError('Manifest mismatch')
    os.replace(temporary,output)
    sha=hashlib.file_digest(output.open('rb'),'sha256').hexdigest()
    print(json.dumps({'zip':str(output),'sizeBytes':output.stat().st_size,'entries':len(paths),'sha256':sha,'crc':'passed','standardDeflate':True},indent=2),flush=True)
if __name__=='__main__':main()
