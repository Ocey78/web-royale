"""Extract exact available SC5 form portraits; never substitute base-card art.

The verified external decoder/cache is an explicit build-time argument. This
script does not fetch missing originals or add decoder code to the game.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    options = argparse.ArgumentParser()
    options.add_argument('--cache-dir', type=Path, required=True)
    options.add_argument('--raw-dir', type=Path)
    options.add_argument('--remote-helper', type=Path)
    args = options.parse_args()
    sys.path.insert(0, str(args.cache_dir))
    from modern_codec import SC5File, decode_sctx

    archive = None
    remote = None

    def source(file):
        nonlocal archive, remote
        cached = args.cache_dir / 'raw/assets' / file
        if cached.exists():
            return cached, '160402014'
        if args.raw_dir:
            target = args.raw_dir / 'assets' / file
            if target.exists():
                return target, '160402017'
        if not args.raw_dir or not args.remote_helper:
            raise FileNotFoundError(file)
        if archive is None:
            scope = {'__file__': str(args.remote_helper)}
            exec(args.remote_helper.read_text().split('def save(')[0], scope)
            remote = scope['Remote'](scope['URL'])
            outer = zipfile.ZipFile(remote)
            archive = zipfile.ZipFile(scope['stored_slice'](remote, outer.getinfo('install_time_asset_pack.apk')))
        name = 'assets/' + file
        item = archive.getinfo(name)
        if item.file_size > 32 * 1024 * 1024:
            raise ValueError('Source member exceeds import bound: ' + name)
        data = archive.read(item)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        print('Fetched', file, len(data), flush=True)
        return target, '160402017'

    forms = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('./src/card-forms').defaultRegistry.forms.map(f=>({id:f.id,kind:f.kind,source:f.source.IconSWF||'sc/ui_spells.sc',icon:f.source.IconFile}))))"], cwd=ROOT))
    parsers, images, records, missing = {}, {}, [], []
    manifest_path = ROOT / 'assets/ui/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    for form in forms:
        file = form['source']
        try:
            raw, package = source(file)
            if file not in parsers:
                parsers[file] = SC5File(raw)
                texture_paths = [source('sc/' + t['external'])[0] for t in parsers[file].textures]
                images[file] = [decode_sctx(str(p)) for p in texture_paths]
            parser = parsers[file]
            if form['icon'] not in parser.exports:
                raise ValueError('Missing source export: ' + form['icon'])
            image = parser.extract_sprite(form['icon'], images[file], frame_index=0)
            if image is None or image.getbbox() is None:
                raise ValueError('Empty source portrait')
            key = 'modern-form-' + form['id']
            output = 'assets/ui/' + key + '.png'
            image.save(ROOT / output, 'PNG')
            record = {'file': output, 'source': file + '#' + form['icon'], 'sourceVersion': '16.402.2' if package == '160402014' else '16.402.17', 'sourcePackage': package, 'width': image.width, 'height': image.height, 'sha256': digest(ROOT / output), 'sourceSha256': digest(raw), 'sourceTextureSha256': {t['external']: digest(source('sc/' + t['external'])[0]) for t in parser.textures}}
            manifest[key] = record
            records.append({'id': form['id'], 'kind': form['kind'], **record})
            print(key, image.size, flush=True)
        except Exception as error:
            missing.append({**form, 'reason': str(error)})
    latest_manifest = json.loads(manifest_path.read_text())
    latest_manifest.update({'modern-form-' + record['id']: {k: v for k, v in record.items() if k not in ('id', 'kind')} for record in records})
    manifest_path.write_text(json.dumps(latest_manifest, indent=2) + '\n')
    report_path = ROOT / 'docs/qa/v054/form-portraits-import.json'
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps({'portraits': records, 'missing': missing}, indent=2) + '\n')
    print('Extracted', len(records), 'original portraits; unavailable:', len(missing))


if __name__ == '__main__':
    main()
