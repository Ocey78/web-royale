@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Web Royale - Offline
rem Self-contained local opener. Place beside the dist folder, or inside dist.
rem Optional: "offline build opener.bat" 8081   (default: 8081)
set "WEBROYALE_OPENER_FILE=%~f0"
set "WEBROYALE_OPENER_DIR=%~dp0"
set "WEBROYALE_OPENER_PORT=%~1"
if not exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" (
  echo Windows PowerShell was not found. This opener needs Windows PowerShell 5.1.
  pause
  exit /b 1
)
echo Starting Web Royale from your local files...
echo No downloads or installations are performed.
echo.
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; try { $t=[IO.File]::ReadAllText($env:WEBROYALE_OPENER_FILE); $m=':__WEBROYALE_POWERSHELL__'; $p=$t.LastIndexOf($m); if($p -lt 0){throw 'Launcher payload is missing.'}; & ([scriptblock]::Create($t.Substring($p+$m.Length))) } catch { Write-Host ''; Write-Host ('Could not open Web Royale: '+$_.Exception.Message) -ForegroundColor Red; exit 1 }"
if errorlevel 1 (
  echo.
  echo No game saves were changed by the opener.
  echo Fix the message above, then double-click this BAT again.
  pause
  exit /b 1
)
exit /b 0
:__WEBROYALE_POWERSHELL__
$ErrorActionPreference = 'Stop'
$serverCode = @'
using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Collections.Generic;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;

// Local static host with a fixed-path AI state API, compatible with Windows PowerShell 5.1 / .NET Framework.
// No administrator rights, HTTP.sys URL reservations, packages, or downloads.
public sealed class WebRoyaleOfflineHost : IDisposable
{
    private readonly string root;
    private readonly string fingerprint;
    private readonly TcpListener listener;
    private readonly List<TcpClient> clients = new List<TcpClient>();
    private volatile bool running;
    private Thread worker;
    public int Port { get; private set; }
    public bool IsRunning { get { return running; } }
    private static readonly StringComparison PathComparison =
        Path.DirectorySeparatorChar == '\\' ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
    private readonly string aiToken = CreateToken();
    private readonly string aiRoot;
    private const string ApiPrefix = "/__webroyale_ai__/";
    private const int MaxApiBytes = 48 * 1024 * 1024;
    private static string CreateToken() { byte[] bytes = new byte[32]; using (RandomNumberGenerator rng = RandomNumberGenerator.Create()) rng.GetBytes(bytes); return BitConverter.ToString(bytes).Replace("-", ""); }
    private const string StatusPath = "/__webroyale_offline_status__";

    private static string DefaultAiRoot() {
        string folder=Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        if(String.IsNullOrWhiteSpace(folder)||!Path.IsPathRooted(folder))throw new IOException("AppData path could not be resolved. No alternate folder was used.");
        return Path.Combine(folder, "WebRoyaleMain", "AI");
    }
    public WebRoyaleOfflineHost(string siteRoot, int port) : this(siteRoot, port, DefaultAiRoot()) { }

    // The explicit root overload is for the isolated offline integration tests only.
    public WebRoyaleOfflineHost(string siteRoot, int port, string dataRoot)
    {
        aiRoot = Path.GetFullPath(dataRoot);
        root = Path.GetFullPath(siteRoot).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        if (!File.Exists(Path.Combine(root, "index.html")))
            throw new DirectoryNotFoundException("index.html was not found in the local web build.");
        if (port < 0 || port > 65535) throw new ArgumentOutOfRangeException("port");
        fingerprint = Fingerprint(root);
        listener = new TcpListener(IPAddress.Loopback, port);
        listener.ExclusiveAddressUse = true;
        Port = port;
    }

    public static string FindRoot(string baseDirectory)
    {
        string folder = Path.GetFullPath(baseDirectory);
        string[] candidates = {
            Path.Combine(folder, "dist"),
            Path.Combine(Path.Combine(folder, "Web-Royale"), "dist"),
            folder
        };
        foreach (string candidate in candidates)
            if (File.Exists(Path.Combine(candidate, "index.html")))
                return Path.GetFullPath(candidate).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        throw new DirectoryNotFoundException(
            "The extracted game was not found. Extract the Web Royale game ZIP first, " +
            "then put this BAT in Web-Royale, beside the dist folder. It can also sit inside dist. " +
            "The BAT opens the existing build; it does not contain the game assets.");
    }

    private static string Fingerprint(string siteRoot)
    {
        string full = Path.GetFullPath(siteRoot).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        if (Path.DirectorySeparatorChar == '\\') full = full.ToUpperInvariant();
        using (SHA256 sha = SHA256.Create())
            return BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(full))).Replace("-", "");
    }

    public static bool IsSameHost(string siteRoot, int port)
    {
        try
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + StatusPath);
            request.Proxy = null;
            request.AllowAutoRedirect = false;
            request.Timeout = 1200;
            request.ReadWriteTimeout = 1200;
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                return response.StatusCode == HttpStatusCode.OK &&
                    response.Headers["X-Web-Royale-Root"] == Fingerprint(siteRoot) &&
                    response.Headers["X-Web-Royale-AI-Version"] == "1";
        }
        catch { return false; }
    }

    public static void OpenBrowser(int port)
    {
        ProcessStartInfo info = new ProcessStartInfo("http://127.0.0.1:" + port + "/");
        info.UseShellExecute = true;
        Process.Start(info);
    }

    public void Start()
    {
        listener.Start(64);
        Port = ((IPEndPoint)listener.LocalEndpoint).Port;
        running = true;
        worker = new Thread(AcceptLoop);
        worker.IsBackground = true;
        worker.Name = "Web Royale offline listener";
        worker.Start();
    }

    private void AcceptLoop()
    {
        try
        {
            while (running)
            {
                TcpClient client = listener.AcceptTcpClient();
                lock (clients)
                {
                    if (!running || clients.Count >= 32) { client.Close(); continue; }
                    clients.Add(client);
                }
                ThreadPool.QueueUserWorkItem(delegate(object state) { Handle((TcpClient)state); }, client);
            }
        }
        catch (SocketException) { }
        catch (ObjectDisposedException) { }
        finally { running = false; }
    }

    private void Handle(TcpClient client)
    {
        try
        {
            client.ReceiveTimeout = 5000;
            client.SendTimeout = 30000;
            client.NoDelay = true;
            using (NetworkStream stream = client.GetStream())
            {
                // Headers are bounded. Bodies are accepted only by the authenticated AI state route.
                byte[] header = new byte[8192];
                int count = 0;
                bool complete = false;
                Stopwatch deadline = Stopwatch.StartNew();
                while (count < header.Length && deadline.ElapsedMilliseconds < 5000)
                {
                    int value = stream.ReadByte();
                    if (value < 0) return;
                    header[count++] = (byte)value;
                    if (count >= 4 && header[count-4] == 13 && header[count-3] == 10 &&
                        header[count-2] == 13 && header[count-1] == 10) { complete = true; break; }
                }
                if (!complete) { Error(stream, 431, "Request Header Fields Too Large", false); return; }
                string[] lines = Encoding.ASCII.GetString(header, 0, count).Split(new string[] { "\r\n" }, StringSplitOptions.None);
                string[] first = lines[0].Split(' ');
                if (first.Length != 3 || (first[2] != "HTTP/1.1" && first[2] != "HTTP/1.0"))
                    { Error(stream, 400, "Bad Request", false); return; }
                bool head = first[0] == "HEAD";
                
                string host = null, origin = null, token = null, contentType = null;
                long contentLength = 0; bool lengthSeen = false;
                for (int i = 1; i < lines.Length && lines[i].Length > 0; ++i)
                {
                    int colon = lines[i].IndexOf(':');
                    if (colon < 1) { Error(stream, 400, "Bad Request", head); return; }
                    string name = lines[i].Substring(0, colon).Trim();
                    string value = lines[i].Substring(colon + 1).Trim();
                    if (name.Equals("Host", StringComparison.OrdinalIgnoreCase))
                    {
                        if (host != null) { Error(stream, 400, "Bad Request", head); return; }
                        host = value;
                    }
                    if (name.Equals("Origin", StringComparison.OrdinalIgnoreCase)) { if (origin != null) { Error(stream, 400, "Bad Request", head); return; } origin = value; }
                    if (name.Equals("X-Web-Royale-AI", StringComparison.OrdinalIgnoreCase)) { if (token != null) { Error(stream, 400, "Bad Request", head); return; } token = value; }
                    if (name.Equals("Content-Type", StringComparison.OrdinalIgnoreCase)) contentType = value;
                    if (name.Equals("Transfer-Encoding", StringComparison.OrdinalIgnoreCase)) { Error(stream, 400, "Bad Request", head); return; }
                    if (name.Equals("Content-Length", StringComparison.OrdinalIgnoreCase)) {
                        if (lengthSeen || !Int64.TryParse(value, out contentLength) || contentLength < 0 || contentLength > MaxApiBytes) { Error(stream, 413, "Payload Too Large", head); return; }
                        lengthSeen = true;
                    }
                }
                string local = "127.0.0.1:" + Port, named = "localhost:" + Port;
                if (host != local && !String.Equals(host, named, StringComparison.OrdinalIgnoreCase))
                    { Error(stream, 403, "Forbidden", head); return; }
                if (origin != null && origin != "http://" + local && origin != "http://" + named)
                    { Error(stream, 403, "Forbidden", head); return; }

                string target = first[1].Split(new char[] { '?', '#' }, 2)[0];
                if (target.Length > 4096 || !target.StartsWith("/") || target.StartsWith("//") ||
                    Regex.IsMatch(target, "%(?![0-9a-fA-F]{2})"))
                    { Error(stream, 400, "Bad Request", head); return; }
                target = Uri.UnescapeDataString(target);
                if (target.StartsWith(ApiPrefix, StringComparison.Ordinal)) {
                    HandleApi(stream, target, first[0], token, contentType, contentLength); return;
                }
                if (first[0] != "GET" && !head) {
                    // Drain the bounded request body before closing so Windows sends the
                    // 405 response reliably instead of resetting a socket with unread data.
                    byte[] discard = new byte[8192]; long remaining = contentLength;
                    Stopwatch drain = Stopwatch.StartNew();
                    while (remaining > 0) {
                        int budget = 5000 - (int)drain.ElapsedMilliseconds;
                        if (budget <= 0) return;
                        stream.ReadTimeout = budget;
                        int read = stream.Read(discard, 0, (int)Math.Min(discard.Length, remaining));
                        if (read == 0) return;
                        remaining -= read;
                    }
                    Error(stream, 405, "Method Not Allowed", false); return;
                }
                if (contentLength != 0) { Error(stream, 400, "Bad Request", head); return; }
                if (target == StatusPath)
                {
                    byte[] ok = Encoding.UTF8.GetBytes("{\"app\":\"Web Royale Offline Opener\"}");
                    Headers(stream, 200, "OK", "application/json; charset=utf-8", ok.Length,
                        "X-Web-Royale-Root: " + fingerprint + "\r\nX-Web-Royale-AI-Version: 1\r\n");
                    if (!head) stream.Write(ok, 0, ok.Length);
                    return;
                }
                if (target.IndexOfAny(new char[] { '\\', ':', '\0', '<', '>', '"', '|', '?', '*' }) >= 0)
                    { Error(stream, 403, "Forbidden", head); return; }
                string[] parts = target.TrimStart('/').Split('/');
                foreach (string part in parts)
                    if (part.StartsWith(".") || part.EndsWith(".") || part.EndsWith(" ") ||
                        Regex.IsMatch(part, @"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)", RegexOptions.IgnoreCase))
                        { Error(stream, 403, "Forbidden", head); return; }
                string relative = target.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                if (target.EndsWith("/")) relative = Path.Combine(relative, "index.html");
                string file = Path.GetFullPath(Path.Combine(root, relative));
                if (!file.StartsWith(root + Path.DirectorySeparatorChar, PathComparison))
                    { Error(stream, 403, "Forbidden", head); return; }
                // Never follow junctions or symbolic links below the chosen game directory.
                string cursor = root;
                foreach (string part in file.Substring(root.Length + 1).Split(Path.DirectorySeparatorChar))
                {
                    cursor = Path.Combine(cursor, part);
                    if ((File.Exists(cursor) || Directory.Exists(cursor)) &&
                        (File.GetAttributes(cursor) & FileAttributes.ReparsePoint) != 0)
                        { Error(stream, 403, "Forbidden", head); return; }
                }
                string mime = Mime(Path.GetExtension(file).ToLowerInvariant());
                if (mime == null || !File.Exists(file)) { Error(stream, 404, "Not Found", head); return; }
                using (FileStream source = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.Read))
                {
                    Headers(stream, 200, "OK", mime, source.Length, "", ImmutableAsset(file, first[1]));
                    if (!head) source.CopyTo(stream, 65536);
                }
            }
        }
        catch (IOException) { } // Browser navigation/closing a tab can abort a transfer.
        catch (SocketException) { }
        catch (ObjectDisposedException) { }
        catch (Exception e) { Console.Error.WriteLine("Local request failed: " + e.Message); }
        finally { client.Close(); lock (clients) { clients.Remove(client); } }
    }


    private static JavaScriptSerializer Json() { return new JavaScriptSerializer { MaxJsonLength = MaxApiBytes, RecursionLimit = 96 }; }
    private static Dictionary<string, object> ObjectValue(object value) {
        Dictionary<string, object> data = value as Dictionary<string, object>;
        if (data == null) throw new InvalidDataException("Invalid AI object"); return data;
    }
    private static object Value(Dictionary<string, object> data, string key) { object value; if (!data.TryGetValue(key, out value)) throw new InvalidDataException("Missing AI field: " + key); return value; }
    private static long Integer(object value) {
        if (!(value is int) && !(value is long) && !(value is decimal) && !(value is double)) throw new InvalidDataException("Invalid AI counter");
        decimal d = Convert.ToDecimal(value); if (d < 0 || d > 9007199254740991M || Decimal.Truncate(d) != d) throw new InvalidDataException("Invalid AI counter"); return (long)d;
    }
    private static System.Collections.IList ListValue(object value) { var list = value as System.Collections.IList; if (list == null) throw new InvalidDataException("Invalid AI list"); return list; }
    private static void ValidateRecord(object value) {
        var r = ObjectValue(value); string id = Value(r,"id") as string;
        if (String.IsNullOrWhiteSpace(id) || id.Length > 140 || !Object.Equals(Value(r,"snapshot"),"3.2557.2")) throw new InvalidDataException("Incompatible AI match record");
    }
    private static void ValidateData(object value) {
        var d=ObjectValue(value); if (Integer(Value(d,"schema")) != 1 || !Object.Equals(Value(d,"snapshot"),"3.2557.2")) throw new InvalidDataException("Incompatible AI data");
        var model=ObjectValue(Value(d,"model")); if (Integer(Value(model,"schema")) != 1 || !Object.Equals(Value(model,"snapshot"),"3.2557.2")) throw new InvalidDataException("Incompatible AI model");
        var weights=ListValue(Value(model,"weights")); if(weights.Count != 1450) throw new InvalidDataException("Wrong AI feature count");
        foreach(object w in weights) { if (!(w is int) && !(w is long) && !(w is double) && !(w is decimal)) throw new InvalidDataException("Invalid AI weight"); double n=Convert.ToDouble(w); if(Double.IsNaN(n)||Double.IsInfinity(n)||Math.Abs(n)>4)throw new InvalidDataException("Invalid AI weight"); }
        var records=ListValue(Value(d,"records")); if(records.Count>40)throw new InvalidDataException("Too many recent match records"); foreach(object r in records)ValidateRecord(r);
    }
    private void EnsureDataRoot() {
        // Do not follow a pre-created junction/symlink inside the app's data area.
        string parent=Path.GetDirectoryName(aiRoot);
        if (Directory.Exists(parent) && (File.GetAttributes(parent)&FileAttributes.ReparsePoint)!=0) throw new IOException("WebRoyale AppData folder is a reparse point");
        if (Directory.Exists(aiRoot) && (File.GetAttributes(aiRoot)&FileAttributes.ReparsePoint)!=0) throw new IOException("AI folder is a reparse point");
        Directory.CreateDirectory(aiRoot);
    }
    private static void SafeFile(string file) { if ((File.Exists(file)||Directory.Exists(file)) && (File.GetAttributes(file)&FileAttributes.ReparsePoint)!=0) throw new IOException("AI data file is a reparse point"); }
    private Dictionary<string,object> ReadState() {
        string file=Path.Combine(aiRoot,"learning.json");SafeFile(file);
        if (!File.Exists(file)) return new Dictionary<string,object> { {"revision",0L},{"data",null} };
        if(new FileInfo(file).Length>MaxApiBytes)throw new InvalidDataException("AI state file exceeds its size limit");
        var state=Json().Deserialize<Dictionary<string,object>>(File.ReadAllText(file,Encoding.UTF8));
        Integer(Value(state,"revision")); ValidateData(Value(state,"data")); return state;
    }
    private static void WriteAtomic(string file, byte[] bytes, bool backup) {
        SafeFile(file);string temp=file+"."+Guid.NewGuid().ToString("N")+".tmp";
        try { using(var f=new FileStream(temp,FileMode.CreateNew,FileAccess.Write,FileShare.None)) { f.Write(bytes,0,bytes.Length); f.Flush(true); }
            if(File.Exists(file)){string previous=backup?file+".previous":null;if(previous!=null)SafeFile(previous);File.Replace(temp,file,previous,true);}else File.Move(temp,file);
        } finally { if(File.Exists(temp))File.Delete(temp); }
    }
    private void Archive(System.Collections.IList records) {
        if(records.Count==0)return;string folder=Path.Combine(aiRoot,"matches");SafeFile(folder);Directory.CreateDirectory(folder);
        foreach(object record in records){var d=ObjectValue(record);string id=(string)Value(d,"id"),name;
            using(SHA256 sha=SHA256.Create())name=BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(id))).Replace("-","");
            string file=Path.Combine(folder,name+".json");SafeFile(file);if(!File.Exists(file))WriteAtomic(file,Encoding.UTF8.GetBytes(Json().Serialize(d)),false);
        }
        // Retain raw archives up to 512 MiB / 10,000 records. Model totals never reset.
        var rows=new List<FileInfo>(new DirectoryInfo(folder).GetFiles("*.json"));rows.Sort(delegate(FileInfo a,FileInfo b){return b.LastWriteTimeUtc.CompareTo(a.LastWriteTimeUtc);});long size=0;
        for(int i=0;i<rows.Count;i++){size+=rows[i].Length;if(i>=10000||size>536870912L){SafeFile(rows[i].FullName);rows[i].Delete();}}
    }
    private static void JsonResponse(NetworkStream stream,int status,object data) {
        byte[] bytes=Encoding.UTF8.GetBytes(Json().Serialize(data));Headers(stream,status,status==200?"OK":status==409?"Conflict":status==400?"Bad Request":"Service Unavailable","application/json; charset=utf-8",bytes.Length,"");stream.Write(bytes,0,bytes.Length);
    }
    private void HandleApi(NetworkStream stream,string target,string method,string token,string contentType,long length) {
        try {
            if(target==ApiPrefix+"capabilities"){
                if(method!="GET"||length!=0){Error(stream,405,"Method Not Allowed",false);return;}
                EnsureDataRoot();JsonResponse(stream,200,new {app="Web Royale AI",schema=1,token=aiToken,path=aiRoot,archiveLimitBytes=536870912L});return;
            }
            if(!String.Equals(token,aiToken,StringComparison.Ordinal)){Error(stream,403,"Forbidden",false);return;}
            if(target!=ApiPrefix+"state"){Error(stream,404,"Not Found",false);return;}
            if(method!="GET"&&method!="POST"){Error(stream,405,"Method Not Allowed",false);return;}
            if(method=="GET"&&length!=0){Error(stream,400,"Bad Request",false);return;}
            Dictionary<string,object> body=null;
            if(method=="POST"){
                if(length<=0||length>MaxApiBytes||contentType==null||!contentType.Split(';')[0].Trim().Equals("application/json",StringComparison.OrdinalIgnoreCase)){Error(stream,400,"Bad Request",false);return;}
                byte[] raw=new byte[(int)length];int pos=0;Stopwatch timeout=Stopwatch.StartNew();
                while(pos<raw.Length){if(timeout.ElapsedMilliseconds>30000)throw new IOException("AI request timed out");int n=stream.Read(raw,pos,Math.Min(65536,raw.Length-pos));if(n==0)throw new IOException("Incomplete AI request");pos+=n;}
                body=Json().Deserialize<Dictionary<string,object>>(new UTF8Encoding(false,true).GetString(raw));
                Integer(Value(body,"revision"));ValidateData(Value(body,"data"));
                var archive=ListValue(Value(body,"archive"));if(archive.Count>100)throw new InvalidDataException("Too many archive records in a single request");foreach(object r in archive)ValidateRecord(r);
            }
            EnsureDataRoot();bool owns=false;
            using(Mutex mutex=new Mutex(false,"Local\\WebRoyaleAI-"+Fingerprint(aiRoot))){
                try{try{owns=mutex.WaitOne(30000);}catch(AbandonedMutexException){owns=true;}if(!owns)throw new IOException("AI store is busy");
                    var current=ReadState();long revision=Integer(Value(current,"revision"));
                    if(method=="GET"){JsonResponse(stream,200,current);return;}
                    if(Integer(Value(body,"revision"))!=revision){JsonResponse(stream,409,new {error="AI state changed in another tab. Retry.",revision=revision});return;}
                    // Archive first. A failed disk write is never acknowledged as persisted.
                    Archive(ListValue(Value(body,"archive")));
                    var next=new Dictionary<string,object>{{"revision",revision+1},{"data",Value(body,"data")}};
                    WriteAtomic(Path.Combine(aiRoot,"learning.json"),Encoding.UTF8.GetBytes(Json().Serialize(next)),true);
                    JsonResponse(stream,200,new {revision=revision+1});
                }finally{if(owns)mutex.ReleaseMutex();}
            }
        }catch(InvalidDataException e){JsonResponse(stream,400,new {error=e.Message});}
        catch(ArgumentException e){JsonResponse(stream,400,new {error=e.Message});}
        catch(Exception e){Console.Error.WriteLine("AI storage: "+e.Message);JsonResponse(stream,503,new {error="AppData AI storage failed: "+e.Message});}
    }

    private static bool ImmutableAsset(string file, string requestTarget)
    {
        string name = Path.GetFileName(file), ext = Path.GetExtension(file);
        // Entry documents and mutable metadata must see the next local build.
        if (ext.Equals(".html", StringComparison.OrdinalIgnoreCase) ||
            name.Equals("release.json", StringComparison.OrdinalIgnoreCase) ||
            name.Equals("manifest.json", StringComparison.OrdinalIgnoreCase)) return false;
        int query = requestTarget.IndexOf('?');
        // The builder emits exactly one twelve-digit content hash. Other queries
        // (including authorization parameters) do not opt into immutable caching.
        if (query >= 0) return Regex.IsMatch(requestTarget.Substring(query + 1), @"^v=[0-9a-fA-F]{12}$");
        return Regex.IsMatch(name, @"\.[0-9a-fA-F]{12}\.(?:js|mjs|css|json|gz|png|webp|wav|jpg|jpeg|gif|svg|ico|wasm|mp3|ogg)$", RegexOptions.IgnoreCase);
    }

    private static string Mime(string ext)
    {
        switch (ext)
        {
            case ".html": return "text/html; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".js": case ".mjs": return "text/javascript; charset=utf-8";
            case ".json": return "application/json; charset=utf-8";
            case ".gz": return "application/gzip";
            case ".png": return "image/png";
            case ".webp": return "image/webp";
            case ".wav": return "audio/wav";
            case ".glb": return "model/gltf-binary";
            case "": return "text/plain; charset=utf-8";
            case ".md": return "text/plain; charset=utf-8";
            case ".jpg": case ".jpeg": return "image/jpeg";
            case ".gif": return "image/gif";
            case ".svg": return "image/svg+xml";
            case ".ico": return "image/x-icon";
            case ".wasm": return "application/wasm";
            case ".mp3": return "audio/mpeg";
            case ".ogg": return "audio/ogg";
            default: return null;
        }
    }

    private static void Headers(NetworkStream stream, int code, string reason, string mime, long length, string extra, bool immutable = false)
    {
        string text = "HTTP/1.1 " + code + " " + reason + "\r\n" +
            "Content-Type: " + mime + "\r\nContent-Length: " + length + "\r\n" +
            "Connection: close\r\nCache-Control: " + (immutable ? "public, max-age=31536000, immutable" : "no-cache") + "\r\n" +
            "X-Content-Type-Options: nosniff\r\nReferrer-Policy: no-referrer\r\n" +
            "Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; connect-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'\r\n" +
            extra + "\r\n";
        byte[] bytes = Encoding.ASCII.GetBytes(text);
        stream.Write(bytes, 0, bytes.Length);
    }

    private static void Error(NetworkStream stream, int code, string reason, bool head)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(reason);
        Headers(stream, code, reason, "text/plain; charset=utf-8", bytes.Length,
            code == 405 ? "Allow: GET, HEAD\r\n" : "");
        if (!head) stream.Write(bytes, 0, bytes.Length);
    }

    public void Dispose()
    {
        running = false;
        listener.Stop();
        lock (clients) { foreach (TcpClient client in clients) client.Close(); }
        if (worker != null && worker != Thread.CurrentThread) worker.Join(2000);
    }
}

'@

Add-Type -TypeDefinition $serverCode -Language CSharp -ReferencedAssemblies 'System.dll','System.Core.dll','System.Web.Extensions.dll'
$root = [WebRoyaleOfflineHost]::FindRoot($env:WEBROYALE_OPENER_DIR)
$port = 8081
if (-not [string]::IsNullOrWhiteSpace($env:WEBROYALE_OPENER_PORT)) {
    if (-not [int]::TryParse($env:WEBROYALE_OPENER_PORT, [ref]$port) -or $port -lt 1024 -or $port -gt 65535) {
        throw 'Use a port from 1024 through 65535. Example: "offline build opener.bat" 8081'
    }
}
$url = 'http://127.0.0.1:' + $port + '/'
if ([WebRoyaleOfflineHost]::IsSameHost($root, $port)) {
    Write-Host 'Web Royale is already running. Opening it again.'
    [WebRoyaleOfflineHost]::OpenBrowser($port)
    return
}
$server = New-Object -TypeName WebRoyaleOfflineHost -ArgumentList $root, $port
try {
    try { $server.Start() }
    catch {
        if ([WebRoyaleOfflineHost]::IsSameHost($root, $port)) {
            [WebRoyaleOfflineHost]::OpenBrowser($port)
            return
        }
        throw ('Could not listen on port ' + $port + '. Close any other preview using this port and retry. ' +
            'Or run "offline build opener.bat" 8081. A different port uses a separate browser save. Details: ' + $_.Exception.Message)
    }
    Write-Host 'WEB ROYALE - OFFLINE' -ForegroundColor Cyan
    Write-Host ('Game files: ' + $root)
    Write-Host ('Open:       ' + $url)
    Write-Host ''
    Write-Host 'Leave this window open while playing. Close it to stop the local host.'
    Write-Host 'Nothing is installed or published. This host only accepts local connections.'
    Write-Host ('AI data: ' + [IO.Path]::Combine([Environment]::GetFolderPath('LocalApplicationData'),'WebRoyaleMain','AI'))
    Write-Host ''
    try { [WebRoyaleOfflineHost]::OpenBrowser($port) }
    catch { Write-Warning ('Automatic browser opening failed. Open this address yourself: ' + $url) }
    while ($server.IsRunning) { Start-Sleep -Milliseconds 250 }
    throw 'The local host stopped unexpectedly. Reopen the BAT to try again.'
}
finally { $server.Dispose() }
