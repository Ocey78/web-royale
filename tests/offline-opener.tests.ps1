# Windows integration tests; no external modules, game assets, or Internet needed.
param([string]$Launcher = (Join-Path $PSScriptRoot '..\offline build opener.bat'))
$ErrorActionPreference = 'Stop'
$text = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $Launcher))
$match = [regex]::Match($text, "(?s)\`$serverCode = @'\r?\n(.*?)\r?\n'@")
if (-not $match.Success) { throw 'Embedded server source is missing.' }
Add-Type -TypeDefinition $match.Groups[1].Value -Language CSharp -ReferencedAssemblies 'System.dll','System.Core.dll','System.Web.Extensions.dll'
$dir = Join-Path ([IO.Path]::GetTempPath()) ('Web Royale test & quote'' ! ' + [guid]::NewGuid().ToString('N'))
$site = Join-Path $dir 'dist'
[IO.Directory]::CreateDirectory($site) | Out-Null
[IO.Directory]::CreateDirectory((Join-Path $site 'assets')) | Out-Null
[IO.File]::WriteAllText((Join-Path $site 'index.html'), '<!doctype html><title>Web Royale test</title>')
[IO.File]::WriteAllText((Join-Path $site 'main.js'), 'window.TEST_OK = true;')
[IO.File]::WriteAllText((Join-Path $site 'main.012345abcdef.js'), 'window.HASHED_OK = true;')
[IO.File]::WriteAllText((Join-Path $site 'release.json'), '{"version":"test"}')
[IO.File]::WriteAllText((Join-Path $site 'manifest.json'), '{"name":"test"}')
[IO.File]::WriteAllText((Join-Path $site 'data.json'), '{"ok":true}')
[IO.File]::WriteAllText((Join-Path $dir 'private.json'), 'secret-outside-root')
[byte[]]$binary = 0..255
[IO.File]::WriteAllBytes((Join-Path $site 'assets\test.webp'), $binary)
[IO.File]::WriteAllBytes((Join-Path $site 'assets\scene.json.gz'), $binary)
$script:passed = 0
function Assert($condition, [string]$message) {
    if (-not $condition) { throw "FAILED: $message" }
    $script:passed++; Write-Host "PASS: $message"
}
function Request([int]$Port, [string]$Path = '/', [string]$Method = 'GET', [string]$HostName = '', [string]$Extra = '') {
    if (-not $HostName) { $HostName = "127.0.0.1:$Port" }
    $c = New-Object Net.Sockets.TcpClient
    try {
        $c.Connect('127.0.0.1', $Port); $c.ReceiveTimeout = 5000
        $s = $c.GetStream()
        $request = "$Method $Path HTTP/1.1`r`nHost: $HostName`r`n$Extra" + "Connection: close`r`n`r`n"
        $bytes = [Text.Encoding]::ASCII.GetBytes($request); $s.Write($bytes,0,$bytes.Length)
        $memory = New-Object IO.MemoryStream
        try {
            $buffer = New-Object byte[] 65536
            while (($n = $s.Read($buffer,0,$buffer.Length)) -gt 0) { $memory.Write($buffer,0,$n) }
            $raw = $memory.ToArray()
            $headerEnd = -1
            for ($i=0; $i -lt $raw.Length-3; $i++) {
                if ($raw[$i] -eq 13 -and $raw[$i+1] -eq 10 -and $raw[$i+2] -eq 13 -and $raw[$i+3] -eq 10) { $headerEnd=$i; break }
            }
            if ($headerEnd -lt 0) { throw 'No HTTP headers' }
            $header = [Text.Encoding]::ASCII.GetString($raw,0,$headerEnd)
            $body = New-Object byte[] ($raw.Length-$headerEnd-4)
            [Array]::Copy($raw,$headerEnd+4,$body,0,$body.Length)
            return @{ Status=[int]($header.Split(' ')[1]); Header=$header; Body=$body; Text=[Text.Encoding]::UTF8.GetString($body) }
        } finally { $memory.Dispose() }
    } finally { $c.Close() }
}
$server = $null
try {
    Assert ([WebRoyaleOfflineHost]::FindRoot($dir) -eq $site) 'Finds dist next to BAT'
    Assert ([WebRoyaleOfflineHost]::FindRoot($site) -eq $site) 'Supports BAT inside dist'
    $server = New-Object -TypeName WebRoyaleOfflineHost -ArgumentList $site, 0
    $server.Start(); $port=$server.Port
    Assert ($port -gt 0) 'Starts on loopback without an HTTP URL reservation'
    $r=Request $port
    Assert ($r.Status -eq 200 -and $r.Text.Contains('Web Royale test')) 'Serves index.html'
    Assert ($r.Header.Contains('text/html; charset=utf-8')) 'HTML MIME type'
    $r=Request $port '/main.js?v=123'
    Assert ($r.Status -eq 200 -and $r.Text.Contains('TEST_OK')) 'Query-string assets load'
    Assert ($r.Header.Contains('text/javascript; charset=utf-8')) 'JavaScript MIME type'
    Assert ($r.Header.Contains('Cache-Control: no-cache')) 'Unverified query values do not make scripts immutable'
    $r=Request $port '/main.012345abcdef.js'
    Assert ($r.Status -eq 200 -and $r.Header.Contains('Cache-Control: public, max-age=31536000, immutable')) 'Content-hashed script is immutable'
    Assert (([regex]::Matches($r.Header, '(?im)^Cache-Control:')).Count -eq 1) 'Static response has exactly one cache policy'
    $r=Request $port '/assets/test.webp?v=012345abcdef'
    Assert ($r.Status -eq 200 -and $r.Header.Contains('Cache-Control: public, max-age=31536000, immutable')) 'Versioned artwork is immutable'
    $r=Request $port '/main.js?v=012345abcdef' 'HEAD'
    Assert ($r.Status -eq 200 -and $r.Body.Length -eq 0 -and $r.Header.Contains('Cache-Control: public, max-age=31536000, immutable')) 'HEAD uses the same immutable asset policy'
    foreach ($uncached in @('/main.js', '/data.json', '/index.html?v=012345abcdef', '/?v=012345abcdef', '/release.json?v=012345abcdef', '/manifest.json?v=012345abcdef', '/main.js?v=', '/main.js?v=012345abcdef&v=fedcba543210', '/main.012345abcdef.js?token=private', '/__webroyale_offline_status__?v=012345abcdef')) {
        $r=Request $port $uncached
        Assert ($r.Status -eq 200 -and $r.Header.Contains('Cache-Control: no-cache')) "Mutable document, metadata or non-version URL remains uncached: $uncached"
    }
    $r=Request $port '/assets/scene.json.gz?v=012345abcdef'
    Assert ($r.Status -eq 200 -and $r.Header.Contains('Content-Type: application/gzip') -and $r.Header.Contains('Cache-Control: public, max-age=31536000, immutable')) 'Compact scene is served as a versioned gzip asset'
    Assert ([Convert]::ToBase64String($r.Body) -eq [Convert]::ToBase64String($binary) -and -not $r.Header.Contains('Content-Encoding:')) 'Explicit gzip asset keeps its bytes without HTTP decompression headers'
    $r=Request $port '/missing.js?v=012345abcdef'
    Assert ($r.Status -eq 404 -and $r.Header.Contains('Cache-Control: no-cache')) 'Missing versioned assets do not become immutable errors'
    $r=Request $port '/data.json'
    Assert ($r.Status -eq 200 -and $r.Header.Contains('application/json')) 'JSON is available'
    $r=Request $port '/assets/test.webp'
    Assert ($r.Status -eq 200 -and $r.Body.Length -eq 256) 'Binary data length'
    Assert ([Convert]::ToBase64String($r.Body) -eq [Convert]::ToBase64String($binary)) 'Binary data is byte-exact'
    Assert ($r.Header.Contains('image/webp')) 'WebP MIME type'
    Assert ($r.Header.Contains('X-Content-Type-Options: nosniff')) 'MIME sniffing disabled'
    Assert ($r.Header.Contains('Content-Security-Policy:')) 'Local-only content policy'
    $r=Request $port '/main.js' 'HEAD'
    Assert ($r.Status -eq 200 -and $r.Body.Length -eq 0) 'HEAD has no response body'
    Assert ((Request $port '/no-such-file.json').Status -eq 404) 'Missing files return 404'
    Assert ((Request $port '/' 'POST').Status -eq 405) 'Writes rejected'
    Assert ((Request $port '/%2e%2e/private.json').Status -eq 403) 'Encoded traversal rejected'
    Assert ((Request $port '/..%5cprivate.json').Status -eq 403) 'Backslash traversal rejected'
    Assert ((Request $port '/main.js:secret').Status -eq 403) 'NTFS alternate data streams rejected'
    Assert ((Request $port '/.hidden.json').Status -eq 403) 'Hidden path rejected'
    Assert ((Request $port '/bad%zz').Status -eq 400) 'Bad percent escaping rejected'
    Assert ((Request $port '/' 'GET' 'attacker.invalid').Status -eq 403) 'Foreign Host rejected'
    Assert ((Request $port '/' 'GET' '' "Origin: http://attacker.invalid`r`n").Status -eq 403) 'Foreign Origin rejected'
    Assert ([WebRoyaleOfflineHost]::IsSameHost($site,$port)) 'Existing opener instance recognized'
    Assert (-not [WebRoyaleOfflineHost]::IsSameHost($dir,$port)) 'Different site is not treated as the same instance'
    $bad = New-Object -TypeName WebRoyaleOfflineHost -ArgumentList $site, $port
    $busy = $false
    try { $bad.Start() } catch { $busy = $true } finally { $bad.Dispose() }
    Assert $busy 'Port conflict does not overwrite another listener'
    $server.Dispose(); $server=$null
    Assert (-not [WebRoyaleOfflineHost]::IsSameHost($site,$port)) 'Stop closes the listener'
    Write-Host "`n$script:passed integration checks passed."
} finally {
    if ($null -ne $server) { $server.Dispose() }
    $resolvedTest=[IO.Path]::GetFullPath($dir);$resolvedRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath());if(-not $resolvedTest.StartsWith($resolvedRoot,[StringComparison]::OrdinalIgnoreCase)-or -not ([IO.Path]::GetFileName($resolvedTest)).StartsWith("Web Royale test ")){throw "Unsafe test cleanup path"};Remove-Item -LiteralPath $resolvedTest -Recurse -Force
}
