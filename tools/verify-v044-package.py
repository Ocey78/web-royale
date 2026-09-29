#!/usr/bin/env python3
"""CRC, hash and clean-source rebuild verification of a delivered full ZIP.

Usage: python tools/verify-v044-package.py ARCHIVE --extract-to FRESH_DIRECTORY
The extraction directory must be absent. No network install is required.
"""
from pathlib import Path
import argparse, hashlib, json, subprocess, zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('archive', type=Path)
parser.add_argument('--extract-to', type=Path, required=True)
parser.add_argument('--report', type=Path, required=True)
args = parser.parse_args()
if args.extract_to.exists():
    raise FileExistsError('Choose a fresh, absent extraction directory')
sha = lambda b: hashlib.sha256(b).hexdigest()
with zipfile.ZipFile(args.archive) as z:
    names = z.namelist()
    assert len(names) == len(set(names)), 'Duplicate ZIP paths'
    assert all(not Path(n).is_absolute() and '..' not in Path(n).parts for n in names), 'Unsafe path'
    assert not any(Path(n).suffix.lower() in {'.ttf','.otf','.woff','.woff2','.eot','.ttc'} for n in names), 'Font binary'
    assert z.testzip() is None, 'CRC failure'
    release_bytes = z.read('Web-Royale/dist/release.json')
    release = json.loads(release_bytes)
    assert release['version'] == '0.44.0'
    for name, expected in release['files'].items():
        assert sha(z.read('Web-Royale/dist/' + name)) == expected, name
    z.extractall(args.extract_to)
root = args.extract_to / 'Web-Royale'
logdir = args.report.parent
logdir.mkdir(parents=True, exist_ok=True)
with (logdir / 'archive-rebuild.txt').open('w') as out:
    built = subprocess.run(['npm','run','build'], cwd=root, stdout=out, stderr=subprocess.STDOUT)
assert built.returncode == 0, 'Fresh extraction build failed'
assert (root/'dist/release.json').read_bytes() == release_bytes, 'Rebuild manifest mismatch'
for name, expected in release['files'].items():
    assert sha((root/'dist'/name).read_bytes()) == expected, name
# Run feature regressions from the actual delivered source, not a worktree copy.
files = sorted(str(p.relative_to(root)) for p in (root/'tests').glob('v044-*.test.cjs'))
with (logdir / 'archive-feature-tests.txt').open('w') as out:
    tested = subprocess.run(['node','--test',*files], cwd=root, stdout=out, stderr=subprocess.STDOUT)
assert tested.returncode == 0, 'Packaged feature tests failed'
report = {'archive':args.archive.name,'bytes':args.archive.stat().st_size,
          'sha256':hashlib.file_digest(args.archive.open('rb'),'sha256').hexdigest(),
          'entries':len(names),'crc':'passed','duplicateEntries':False,'fontBinaries':0,
          'runtimeHashesChecked':len(release['files']),'cleanBuildExit':built.returncode,
          'rebuildManifestIdentical':True,'rebuildRuntimeHashesMatched':len(release['files']),
          'packagedFeatureTestsExit':tested.returncode}
args.report.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
