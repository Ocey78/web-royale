'use strict';
// Builds an ordinary static website. No native launcher, runtime installer,
// application archive, source font, or first-run third-party download is emitted.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{gzipSync}=require('node:zlib');
const compactScenes=process.argv.includes('--compact-scenes');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist'),VERSION='0.44.0';
const read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
require('./restore-source.cjs').restore(root);
fs.mkdirSync(out,{recursive:true});
// Clear only this dedicated generated-output directory, not source assets or saves.
for(const f of fs.readdirSync(out))fs.rmSync(path.join(out,f),{recursive:true,force:true});
const files={};function write(name,bytes){const dest=path.join(out,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);files[name]=hash(bytes);return name+'?v='+files[name].slice(0,12);}
const manifest=json('assets/manifest.json'),native=json('assets/native/data.json'),uiManifest=json('assets/ui/manifest.json');
native.scenes.tower_skins=json('assets/tower-skins/scene.json');native.scenes.chest_opening=json('assets/chests/scene.json');
native.scenes.treasure_chest={...native.scenes.chest_opening,textures:native.scenes.chest_opening.textures.map(t=>({...t,file:'treasure-'+t.file}))};
native.scenes.gem_chest={...native.scenes.chest_opening,textures:native.scenes.chest_opening.textures.map(t=>({...t,file:'gem-'+t.file}))};
const game=json('assets/game/data.json');for(const [id,cfg]of Object.entries(native.units))cfg.rotationTimeline=game.entities[id]?.HasRotationOnTimeline===true;
const C=require('../src/core.js');if(manifest.cards.map(c=>c.id).join()!==C.CARDS.map(c=>c.id).join())throw Error('Source card manifest mismatch');
const runtime={version:VERSION,web:true,manifest,game,native:{...native,version:VERSION,streamed:true,scenes:{}},art:{},images:{},uiImages:{},sounds:{}};
function sourceAsset(name){name=String(name).split('?')[0];if(!/^assets\/[a-zA-Z0-9_./-]+\.(png|webp)$/.test(name)||name.includes('..'))throw Error('Invalid source image path: '+name);return write(name,read(name));}
for(const card of manifest.cards){const bytes=read(card.file);if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid card PNG: '+card.id);runtime.art[card.id]=sourceAsset(card.file);}
for(const [name,scene] of Object.entries(native.scenes)){
 if(!/^[a-zA-Z0-9_-]+$/.test(name))throw Error('Invalid native scene');
 const sceneBytes=JSON.stringify(scene);
 runtime.native.scenes[name]={file:write('assets/scenes/'+name+'.json'+(compactScenes?'.gz':''),compactScenes?gzipSync(sceneBytes,{level:9}):sceneBytes),textures:scene.textures};
 for(const tex of scene.textures)if(!runtime.images[tex.file])runtime.images[tex.file]=sourceAsset('assets/native/'+tex.file);
}
for(const [key,asset]of Object.entries(uiManifest))runtime.uiImages[key]=sourceAsset(asset.file);
for(const [key,a] of Object.entries(json('assets/audio/manifest.json'))){if(!/^assets\/audio\/[a-z-]+\.wav$/.test(a.file))throw Error('Invalid audio path');runtime.sounds[key]=write(a.file,read(a.file));}
const emotes=json('assets/emotes/catalog.json');runtime.emotes={entries:require('../src/cosmetics.js').emotes,scenes:{}};
for(const [id,file] of Object.entries(emotes.scenes)){const data=json(file);for(const t of data.textures)t.file=sourceAsset(t.file);runtime.emotes.scenes[id]=write(file,JSON.stringify(data));}
runtime.fx=json('assets/game/fx-data.json');
runtime.presentation=json('assets/presentation/data.json');
runtime.presentation.homes={};for(const name of ['ui_arena','ui_arena_icon_season_10']){const f='assets/presentation/'+name+'-home.json';if(fs.existsSync(path.join(root,f))){const h=json(f);for(const t of h.textures)t.file=sourceAsset(t.file);runtime.presentation.homes[name]=h;}}
for(const key of ['hud','filters'])for(const t of runtime.presentation[key].textures)t.file=sourceAsset(t.file);
for(const f of Object.values(runtime.presentation.text))for(const part of ['fill','stroke'])f[part]=sourceAsset(f[part]);
// Headless learner assets are loaded only for explicit self-play, not on startup.
const trainingGame=JSON.stringify(game),trainingEngine=['graphics','catalog','arena-layout','arena-grid','formations','placement','pathing','road-data','progression','arena-selection','player-xp','emote-data','cosmetics','chest-rules','world-state','crown-road','profile','level-model','navigation','learning','training-decks','training-scheduler','ai','match-rules','battle','core','boat-battle','training-modes'].map(m=>read(`src/${m}.js`).toString()).join('\n;\n'),worker=read('src/training-worker.js');
runtime.training={game:write(`training-data.${hash(trainingGame).slice(0,12)}.json`,trainingGame),engine:write(`training-engine.${hash(trainingEngine).slice(0,12)}.js`,trainingEngine),worker:write(`training-worker.${hash(worker).slice(0,12)}.js`,worker)};
for(const size of [180,192,512])write(`assets/webapp/icon-${size}.png`,read(`assets/webapp/icon-${size}.png`));
// Enumerate every emitted game asset, including textures inside emote scenes.
// Keep encoded bytes on disk; only active scenes are decoded in browser memory.
const preloadCatalog=JSON.stringify({version:VERSION,assets:Object.entries(files).filter(([name])=>name.startsWith('assets/')||name.startsWith('training-')).map(([name,sha256])=>({url:name+'?v='+sha256.slice(0,12),bytes:fs.statSync(path.join(out,name)).size,sha256}))});
runtime.preload={catalog:write(`asset-index.${hash(preloadCatalog).slice(0,12)}.json`,preloadCatalog),worker:write('asset-worker.js',read('src/asset-worker.js'))};
const runtimeBytes=JSON.stringify(runtime),runtimeName=`runtime.${hash(runtimeBytes).slice(0,12)}.json`;write(runtimeName,runtimeBytes);
const modules=["graphics","level-labels","catalog","arena-layout","arena-grid","formations","placement","pathing","road-data","progression","arena-selection","player-xp","emote-data","cosmetics","chest-rules","world-state","crown-road","profile","level-model","navigation","learning","learning-store","appdata-store","training-scheduler","ai","audio","training-decks","match-rules","battle","core","deck-manager","economy","assets","native","emote-player","battle-view","text","ui-polish","presentation","platform","menu-model","fx","custom-arena","potato","draw","announcements","world","clan-war","boat-battle","training-modes","legacy-core-v027","legacy-core-v028","legacy-core-v030","legacy-core-v031","legacy-core-v037","legacy-core-v040","legacy-core-v041","legacy-core-v042","legacy-core-v043","replay","social-ui","chest-opening","chest-opening-ui","sandbox","sandbox-ui","streak-ui","rematch","app"];
modules.unshift('preload');
const app=modules.map(m=>read(`src/${m}.js`).toString()).join('\n;\n'),appName=`app.${hash(app).slice(0,12)}.js`;write(appName,app);
let template=read('src/index.template.html').toString();const style=template.match(/<style>([\s\S]*?)<\/style>/);if(!style)throw Error('Missing template stylesheet');
const webappManifest=json('src/manifest.webapp.json');for(const icon of webappManifest.icons)icon.src+='?v='+files[icon.src].slice(0,12);write('manifest.json',JSON.stringify(webappManifest));
template=template.replace(/<title>[^<]*<\/title>/,'<title>Web Royale</title>').replace('<style>','<link rel="manifest" href="manifest.json"><link rel="apple-touch-icon" sizes="180x180" href="assets/webapp/icon-180.png"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Web Royale"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><style>');
const css=style[1]+'\n'+read('src/v050.css').toString()+'\n'+read('src/v060.css').toString()+'\n'+read('src/v070.css').toString()+'\n'+read('src/v090.css').toString()+'\n'+read('src/v100.css').toString()+'\n'+read('src/v110.css').toString()+'\n'+read('src/v120.css').toString()+'\n'+read('src/v130.css').toString()+'\n'+read('src/v180.css').toString()+'\n'+read('src/v200.css').toString()+'\n'+read('src/v210.css').toString()+'\n'+read('src/v220.css').toString()+'\n'+read('src/v240.css').toString()+'\n'+read('src/v250.css').toString()+'\n'+read('src/v260.css').toString()+'\n'+read('src/chest-opening.css').toString()+'\n'+read('src/sandbox.css').toString()+'\n'+read('src/webapp.css').toString()+'\n'+read('src/v370.css').toString()+'\n'+read('src/v380.css').toString()+'\n'+read('src/v391.css').toString()+'\n'+read('src/v410.css').toString()+'\n'+read('src/v420.css').toString()+'\n'+read('src/v430.css').toString()+'\n'+read('src/v440.css').toString(),cssName=`styles.${hash(css).slice(0,12)}.css`;write(cssName,css);
template=template.replace(style[0],`<link rel="stylesheet" href="${cssName}">`).split('<script id="royale-payload"')[0];
template=template.replace('href="assets/webapp/icon-180.png"',`href="assets/webapp/icon-180.png?v=${files['assets/webapp/icon-180.png'].slice(0,12)}"`);
const bootstrap=`/* Web Royale ${VERSION}: same-origin static asset bootstrap. */
(async()=>{'use strict';const status=document.getElementById('loadMessage');try{
 if(location.protocol==='file:')throw Error('Serve this folder over HTTP(S). Run npm run serve, then open the displayed localhost address.');
 const response=await fetch(new URL(${JSON.stringify(runtimeName)},document.baseURI),{cache:'force-cache'});if(!response.ok)throw Error('Website metadata: HTTP '+response.status);
 const data=await response.json();window.RoyaleBundle=data;window.RoyaleGameData=data.game;
 for(const map of [data.art,data.images,data.uiImages,data.sounds])for(const key of Object.keys(map))map[key]=new URL(map[key],document.baseURI).href;
 status.textContent='Opening Web Royale…';document.getElementById('loadProgress').style.width='12%';
 const app=document.createElement('script');app.src=new URL(${JSON.stringify(appName)},document.baseURI).href;app.onerror=()=>{status.textContent='Game script did not load. Reload to retry.';document.getElementById('loadRetry').hidden=false;document.getElementById('loadRetry').onclick=()=>location.reload();};document.body.appendChild(app);
}catch(e){status.textContent='Could not start: '+e.message;document.getElementById('loadProgress').style.width='0%';const retry=document.getElementById('loadRetry');retry.hidden=false;retry.onclick=()=>location.reload();console.error(e);}})();`;
const bootName=`bootstrap.${hash(bootstrap).slice(0,12)}.js`;write(bootName,bootstrap);
write('index.html',template+`<noscript>This game requires JavaScript.</noscript><script src="${bootName}" defer></script></body></html>\n`);
const release={version:VERSION,target:'web',snapshot:game.snapshot,cards:manifest.cards.length,scenes:Object.keys(native.scenes).length,runtime:runtimeName,app:appName,bootstrap:bootName,styles:cssName,files};
fs.writeFileSync(path.join(out,'release.json'),JSON.stringify(release,null,2)+'\n');
console.log(JSON.stringify({version:VERSION,target:'web',files:Object.keys(files).length,entryBytes:fs.statSync(path.join(out,'index.html')).size,totalBytes:Object.keys(files).reduce((n,f)=>n+fs.statSync(path.join(out,f)).size,0),snapshot:game.snapshot},null,2));

