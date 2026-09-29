# Run in Windows PowerShell 5.1. Uses a temporary test folder, never real AI memory.
param([string]$Launcher = (Join-Path $PSScriptRoot '..\offline build opener.bat'))
$ErrorActionPreference='Stop'
$text=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $Launcher))
$m=[regex]::Match($text,"(?s)\`$serverCode = @'\r?\n(.*?)\r?\n'@")
Add-Type -TypeDefinition $m.Groups[1].Value -Language CSharp -ReferencedAssemblies 'System.dll','System.Core.dll','System.Web.Extensions.dll'
$temp=Join-Path ([IO.Path]::GetTempPath()) ('Web Royale AI tests '+[guid]::NewGuid().ToString('N'))
$site=Join-Path $temp 'dist';$data=Join-Path $temp 'AI'
[IO.Directory]::CreateDirectory($site)|Out-Null;[IO.File]::WriteAllText((Join-Path $site 'index.html'),'<title>AI fixture</title>')
$hoster=$null;$passed=0
function Check($ok,$name){if(-not $ok){throw "FAILED: $name"};$script:passed++;Write-Host "PASS: $name"}
function Http([string]$Path,[string]$Method='GET',$Body=$null,[string]$Token='',[string]$Origin=''){
 $r=[Net.HttpWebRequest]::Create("http://127.0.0.1:$port$Path");$r.Proxy=$null;$r.Method=$Method;$r.Timeout=10000
 if($Token){$r.Headers['X-Web-Royale-AI']=$Token};if($Origin){$r.Headers['Origin']=$Origin}
 if($null-ne $Body){$bytes=[Text.Encoding]::UTF8.GetBytes(($Body|ConvertTo-Json -Depth 60 -Compress));$r.ContentType='application/json';$r.ContentLength=$bytes.Length;$w=$r.GetRequestStream();$w.Write($bytes,0,$bytes.Length);$w.Close()}
 try{$response=$r.GetResponse()}catch [Net.WebException]{$response=$_.Exception.Response;if($null-eq $response){throw}}
 try{$reader=New-Object IO.StreamReader($response.GetResponseStream());$text=$reader.ReadToEnd();return @{Code=[int]$response.StatusCode;Text=$text;CacheControl=$response.Headers['Cache-Control'];Json=$(try{$text|ConvertFrom-Json}catch{$null})}}finally{$response.Close()}
}
try{
 $hoster=New-Object WebRoyaleOfflineHost -ArgumentList $site,0,$data;$hoster.Start();$port=$hoster.Port
 $cap=Http '/__webroyale_ai__/capabilities';Check ($cap.Code-eq 200) 'capabilities available';$token=$cap.Json.token
 Check ($cap.CacheControl-eq 'no-cache' -and (Http '/__webroyale_ai__/capabilities?v=012345abcdef').CacheControl-eq 'no-cache') 'capabilities never use immutable asset caching'
 Check ($cap.Json.path-eq $data) 'fixed test AI directory';Check ($token.Length-eq 64) 'random 256-bit authorization token'
 Check ((Http '/__webroyale_ai__/state').Code-eq 403) 'unauthorized read denied'
 Check ((Http '/__webroyale_ai__/state' 'GET' $null $token 'https://hostile.example').Code-eq 403) 'cross-origin access denied'
 $state=Http '/__webroyale_ai__/state' 'GET' $null $token;Check ($state.Json.revision-eq 0 -and $null-eq $state.Json.data) 'new store empty'
 Check ($state.CacheControl-eq 'no-cache' -and (Http '/__webroyale_ai__/state?v=012345abcdef' 'GET' $null $token).CacheControl-eq 'no-cache') 'authorized AppData state reads remain uncached'
 $model=@{schema=1;snapshot='3.2557.2';weights=@(1..1450|ForEach-Object{0});updates=0;matches=0}
 $record=@{id='roundtrip';snapshot='3.2557.2';status='completed';schema=1}
 $payload=@{revision=0;data=@{schema=1;snapshot='3.2557.2';model=$model;records=@($record)};archive=@($record)}
 $commit=Http '/__webroyale_ai__/state' 'POST' $payload $token
 Check ($commit.Json.revision-eq 1) 'first commit acknowledged'
 Check ($commit.CacheControl-eq 'no-cache') 'AppData writes remain uncached'
 Check (Test-Path (Join-Path $data 'learning.json')) 'state file created in AI folder'
 Check ((Get-ChildItem (Join-Path $data 'matches') -Filter '*.json').Count-eq 1) 'individual match archived'
 Check ((Http '/__webroyale_ai__/state' 'POST' $payload $token).Code-eq 409) 'stale revision rejected'
 $payload.revision=1;$payload.data.model.updates=10
 Check ((Http '/__webroyale_ai__/state' 'POST' $payload $token).Json.revision-eq 2) 'replacement commit acknowledged'
 Check (Test-Path (Join-Path $data 'learning.json.previous')) 'previous state backup retained'
 Check ((Get-ChildItem (Join-Path $data 'matches') -Filter '*.json').Count-eq 1) 'repeated archive ID does not duplicate file'
 $payload.revision=2;$payload.data.model.weights[0]='bad'
 Check ((Http '/__webroyale_ai__/state' 'POST' $payload $token).Code-eq 400) 'invalid weights rejected'
 Check ((Http '/__webroyale_ai__/state' 'GET' $null $token).Json.revision-eq 2) 'invalid commit does not change state'
 Check ((Http '/index.html' 'POST' @{test=1}).Code-eq 405) 'static website remains read-only'
 $hoster.Dispose();$hoster=$null
 $hoster=New-Object WebRoyaleOfflineHost -ArgumentList $site,0,$data;$hoster.Start();$port=$hoster.Port;$cap=Http '/__webroyale_ai__/capabilities'
 $state=Http '/__webroyale_ai__/state' 'GET' $null $cap.Json.token
 Check ($state.Json.data.model.updates-eq 10) 'restart loads committed model'
 Write-Host "$passed Windows AppData integration checks passed."
}finally{if($hoster){$hoster.Dispose()};if(Test-Path -LiteralPath $temp){$resolvedTest=[IO.Path]::GetFullPath($temp);$resolvedRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath());if(-not $resolvedTest.StartsWith($resolvedRoot,[StringComparison]::OrdinalIgnoreCase)-or -not ([IO.Path]::GetFileName($resolvedTest)).StartsWith("Web Royale AI tests ")){throw "Unsafe test cleanup path"};Remove-Item -LiteralPath $resolvedTest -Recurse -Force}}
