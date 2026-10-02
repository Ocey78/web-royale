'use strict';
// Development-only static hosting. Binds to this computer, not the public LAN.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'../dist'),port=Number(process.env.PORT||process.argv[2]||JSON.parse(fs.readFileSync(path.resolve(__dirname,'../project.json'),'utf8')).defaultPort);
if(!Number.isSafeInteger(port)||port<1||port>65535)throw Error('Use a port between 1 and 65535');
if(!fs.existsSync(path.join(root,'index.html')))throw Error('Run npm run build first');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.gz':'application/gzip','.png':'image/png','.webp':'image/webp','.wav':'audio/wav','.glb':'model/gltf-binary'},compressed=new Map();
const server=http.createServer(async(req,res)=>{try{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
 const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);let file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
 file=fs.realpathSync(file);if(!file.startsWith(fs.realpathSync(root)+path.sep)){res.writeHead(403);res.end();return;}
 const ext=path.extname(file),type=mime[ext];if(!type){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',type);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
 const versioned=url.searchParams.has('v')||/\.[a-f0-9]{12}\.(js|css|json)$/.test(file);res.setHeader('Cache-Control',versioned?'public, max-age=31536000, immutable':'no-cache');
 const compressible=['.js','.json','.css','.html'].includes(ext);if(compressible)res.setHeader('Vary','Accept-Encoding');
 const gzipToken=(req.headers['accept-encoding']||'').split(',').map(x=>x.trim()).find(x=>/^gzip(?:\s*;|$)/i.test(x)),quality=gzipToken?.match(/;\s*q\s*=\s*([0-9.]+)/i);
 let bytes=fs.readFileSync(file);if(gzipToken&&(!quality||Number(quality[1])>0)&&compressible){let cached=compressed.get(file);if(!cached||!cached.source.equals(bytes)){cached={source:bytes,gzip:zlib.gzipSync(bytes)};compressed.set(file,cached);}bytes=cached.gzip;res.setHeader('Content-Encoding','gzip');res.setHeader('Vary','Accept-Encoding');}
 res.setHeader('Content-Length',bytes.length);res.writeHead(200);res.end(req.method==='HEAD'?undefined:bytes);
 }catch(e){res.writeHead(400);res.end('Invalid request');}});
server.on('error',e=>{console.error('Static host failed:',e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Web Royale: http://127.0.0.1:${port}\nPress Ctrl+C to stop. This is a local static host, not an accounts or match server.`));
