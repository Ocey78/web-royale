"""Restore exact packed material textures and LOD1 shader from the source client.
No GLB geometry/animation is rewritten. Runtime loads only the LOD1 MRA maps;
normal textures are intentionally absent from this shader's source variant.
"""
from pathlib import Path
import argparse, hashlib, json, re, struct, sys, zipfile

def glb_json(path):
    b=path.read_bytes()
    if b[:4]!=b'glTF' or b[16:20]!=b'JSON':raise ValueError('Expected ordinary glTF')
    return json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])

def scalar_defaults(raw):
    u=lambda p:struct.unpack_from('<I',raw,p)[0]
    def fields(p):
        v=p-struct.unpack_from('<i',raw,p)[0];return[struct.unpack_from('<H',raw,v+j)[0] for j in range(4,struct.unpack_from('<H',raw,v)[0],2)]
    def text(p):
        p+=u(p);return raw[p+4:p+4+u(p)].decode()
    root=u(0);v=root+fields(root)[2];v+=u(v);out={}
    for i in range(u(v)):
        q=v+4+4*i;p=q+u(q);f=fields(p)
        if raw[p+f[1]]!=1:continue
        name=text(p+f[0]);value=p+f[2];value+=u(value);offsets=fields(value)
        out[name]=struct.unpack_from('<f',raw,value+offsets[0])[0] if offsets and offsets[0] else 0
    return out

def main():
    args=argparse.ArgumentParser();args.add_argument('--cache',required=True);args.add_argument('--reader',required=True);args.add_argument('--decoder',required=True);args=args.parse_args()
    root=Path(__file__).resolve().parents[1];cache=Path(args.cache);sys.path.insert(0,args.decoder)
    from modern_3d import decode_ktx2
    scope={'__file__':args.reader};exec(Path(args.reader).read_text().split('def save(')[0],scope)
    remote=None;archive=None;outer=None
    def source(name):
        nonlocal remote,archive,outer
        p=cache/'assets'/name
        if not p.exists():
            if remote is None:
                remote=scope['Remote'](scope['URL']);outer=zipfile.ZipFile(remote);archive=zipfile.ZipFile(scope['stored_slice'](remote,outer.getinfo('install_time_asset_pack.apk')))
            raw=archive.read('assets/'+name);p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
        return p.read_bytes()
    manifest_path=root/'assets/modern-heroes/manifest.json';m=json.loads(manifest_path.read_text());textures={};materials={};overrides={}
    for actor in m['heroes'].values():
        for part in actor['parts']:
            materials[part['file']]=glb_json(root/'assets/modern-heroes'/part['file'])['materials']
            for row in materials[part['file']]:
                variables=row.get('extras',{}).get('sourceVariables',{})
                for key in ['mraTex']:
                    name=variables.get('textures',{}).get(key)
                    if not name:continue
                    name=name.split('#')[0]
                    if name in textures:continue
                    raw=source(name);image=decode_ktx2(raw);file='material-'+hashlib.sha256(name.encode()).hexdigest()[:16]+'.png';image.save(root/'assets/modern-heroes'/file)
                    textures[name]={'file':file,'sourceSha256':hashlib.sha256(raw).hexdigest(),'width':image.width,'height':image.height}
            for geometry in part.get('geometries',[]):
                if geometry.get('MaterialOverride'):
                    name=geometry['MaterialOverride'].split(' | ')[0];raw=source(name+'.rmat');overrides[name]={'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
    # Flatbuffer storage writes variants in reverse vector order. The source
    # variant mask132 is LOD1(4)|TINT(128), without a scene shadowmap.
    raw=source('sc3d/shaders/uber_pbr.frag.shader');variants=re.findall(rb'#version 300 es[^\x00]+',raw)
    if len(variants)!=256:raise ValueError('Unexpected source shader variant count')
    fragment=variants[255-132].decode()
    if 'texture(normalTex' in fragment or 'texture(mraTex' not in fragment:raise ValueError('Wrong source LOD1 variant')
    m['materialTextures']=textures;m['sourceLodShader']={'fragment':fragment,'source':'sc3d/shaders/uber_pbr.frag.shader','sourceSha256':hashlib.sha256(raw).hexdigest(),'variantMask':132,'flags':['LOD1','TINT'],'fragmentSha256':hashlib.sha256(fragment.encode()).hexdigest(),'limitations':['The LOD1 source variant intentionally does not sample normal maps.','Scene shadowmap and native light-uniform packing are not reproduced. Material overrides are preserved in source metadata.']}
    defaults=source('sc3d/shared/materials/base_pbr_mra.rmat');m['sourceMaterialDefaults']=scalar_defaults(defaults);m['sourceMaterialDefaultsProvenance']={'source':'sc3d/shared/materials/base_pbr_mra.rmat','sha256':hashlib.sha256(defaults).hexdigest()}
    m['materialProvenance']={'textureCount':len(textures),'overrideFiles':overrides,'sourceVersionCode':160402017}
    manifest_path.write_text(json.dumps(m,separators=(',',':')))
    print('Imported',len(textures),'packed MRA textures;',len(overrides),'source override files; transferred',remote.transferred if remote else 0,flush=True)
    if archive:archive.close();outer.close()

if __name__=='__main__':main()
