'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const bytes = fs.readFileSync(path.join(root, 'offline build opener.bat'));
const text = bytes.toString('utf8');
const csharp = text.match(/\$serverCode = @'\r?\n([\s\S]*?)\r?\n'@/);
assert.ok(csharp, 'The BAT must contain its embedded C# server');
const mime = csharp[1].match(/private static string Mime\(string ext\)([\s\S]*?)\r?\n    }/);
assert.ok(mime, 'The embedded server must have its MIME allowlist');
const labels = [...mime[1].matchAll(/case\s+"([^"]*)"\s*:/g)].map(match => match[1]);

test('offline opener MIME switch has no duplicate case labels (CS0152 regression)', () => {
    const duplicates = labels.filter((label, index) => labels.indexOf(label) !== index);
    assert.deepEqual(duplicates, [], `Duplicate C# case labels: ${duplicates.join(', ')}`);
});

test('offline opener retains one WAV handler and serves every packaged runtime file type', () => {
    assert.equal(labels.filter(label => label === '.wav').length, 1);
    assert.match(mime[1], /case "\.wav":\s*return "audio\/wav";/);
    const extensions = new Set();
    function scan(folder) {
        for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
            if (entry.name.startsWith('.')) continue;
            const file = path.join(folder, entry.name);
            if (entry.isDirectory()) scan(file);
            else extensions.add(path.extname(entry.name).toLowerCase());
        }
    }
    scan(path.join(root, 'dist'));
    for (const extension of extensions) {
        assert.ok(labels.includes(extension), `Missing MIME handler for ${extension}`);
    }
});

test('offline opener preserves its Windows payload, loopback binding and save origin', () => {
    assert.ok(bytes.subarray(0, 10).equals(Buffer.from('@echo off\r')));
    assert.equal(text.replace(/\r\n/g, '').includes('\n'), false, 'Use Windows CRLF line endings');
    assert.equal(text.split('\r\n:__WEBROYALE_POWERSHELL__\r\n').length, 2);
    assert.match(csharp[1], /new TcpListener\(IPAddress\.Loopback, port\)/);
    assert.ok(text.includes('$port = '+require('../project.json').defaultPort));
    assert.match(text, /http:\/\/127\.0\.0\.1:/);
    assert.match(text, /Add-Type -TypeDefinition \$serverCode -Language CSharp/);
});
