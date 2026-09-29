'use strict';
// Preserve the launcher wrapper while replacing only its reviewed C# payload.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const launcher = path.join(root, 'offline build opener.bat');
const source = fs.readFileSync(path.join(root, 'tools/offline-host.cs'), 'utf8').replaceAll('\r\n', '\n');
const before = fs.readFileSync(launcher, 'utf8').replaceAll('\r\n', '\n');
const payload = /\$serverCode = @'\n[\s\S]*?\n'@/g;
if ([...before.matchAll(payload)].length !== 1) throw Error('Expected exactly one embedded C# host');
const after = before.replace(payload, () => "$serverCode = @'\n" + source + "\n'@");
fs.writeFileSync(launcher, after.replaceAll('\n', '\r\n'));
console.log('Offline launcher synchronized with Windows CRLF line endings.');
