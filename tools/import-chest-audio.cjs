'use strict';
// Convert only the requested original cues. No network, APK execution, FFmpeg,
// external codec, or runtime browser dependency is added to the game.
// Usage: node tools/import-chest-audio.cjs supplied.apk [python-executable]
// Build-time dependencies: Python standard library, Playwright, installed Chrome.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),apk=process.argv[2],python=process.argv[3]||process.env.PYTHON||'python';
const cues={
 chestOpenWood:{source:'wooden_chest_open_01.ogg',file:'chest-open-wood.wav'},
 chestOpenSilver:{source:'iron_chest_open_01.ogg',file:'chest-open-silver.wav'},
 chestOpenGold:{source:'gold_chest_open_01.ogg',file:'chest-open-gold.wav'},
 chestOpenMagic:{source:'magic_chest_open_01.ogg',file:'chest-open-magic.wav'},
 chestOpenCrown:{source:'star_chest_open_01.ogg',file:'chest-open-crown.wav'},
 cardCommon:{source:'get_card_comon_01.ogg',file:'card-common.wav'},
 cardRare:{source:'get_card_rare_01.ogg',file:'card-rare.wav'}
};
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
async function main(){
 if(!apk)throw Error('Usage: node tools/import-chest-audio.cjs supplied.apk [python-executable]');
 const extraction=spawnSync(python,['-c',
  "import zipfile,json,base64,sys,hashlib\nrows={}\nwith zipfile.ZipFile(sys.argv[1]) as z:\n for key,entry in json.loads(sys.argv[2]).items():\n  name='assets/sfx/'+entry['source']\n  if z.getinfo(name).file_size>8*1024*1024:raise ValueError('Oversized source cue')\n  data=z.read(name);i=data.find(b'\\x01vorbis')\n  if i<0:raise ValueError('Expected original Ogg Vorbis cue')\n  rows[key]={'source':name,'sha256':hashlib.sha256(data).hexdigest(),'base64':base64.b64encode(data).decode(),'sourceChannels':data[i+11],'sourceSampleRate':int.from_bytes(data[i+12:i+16],'little')}\nprint(json.dumps(rows))",
  path.resolve(apk),JSON.stringify(cues)],{encoding:'utf8',maxBuffer:20*1024*1024});
 if(extraction.error)throw extraction.error;
 if(extraction.status!==0)throw Error(extraction.stderr||'Source audio extraction failed');
 const originals=JSON.parse(extraction.stdout),{chromium}=require('playwright');
 const browser=await chromium.launch(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM,headless:true}:{channel:'chrome',headless:true});
 let converted,browserVersion;
 try{
  browserVersion=browser.version();const page=await browser.newPage();await page.route('**/*',route=>route.abort());
  await page.setContent('<!doctype html><title>Offline source audio conversion</title>');
  converted=await page.evaluate(async originals=>{
   const results={};
   for(const [key,source]of Object.entries(originals)){
    const bytes=Uint8Array.from(atob(source.base64),c=>c.charCodeAt(0));
    const decoder=new OfflineAudioContext(1,1,44100),decoded=await decoder.decodeAudioData(bytes.buffer);
    if(!Number.isFinite(decoded.duration)||decoded.duration<=0||decoded.duration>20)throw Error('Invalid source duration: '+key);
    const renderer=new OfflineAudioContext(1,decoded.length,44100),node=renderer.createBufferSource();node.buffer=decoded;node.connect(renderer.destination);node.start();
    const mono=await renderer.startRendering(),samples=mono.getChannelData(0),wav=new ArrayBuffer(44+samples.length*2),view=new DataView(wav);
    const text=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
    text(0,'RIFF');view.setUint32(4,wav.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,44100,true);view.setUint32(28,88200,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);
    let peak=0,squares=0;
    for(let i=0;i<samples.length;i++){const sample=Math.max(-1,Math.min(1,samples[i]));peak=Math.max(peak,Math.abs(sample));squares+=sample*sample;view.setInt16(44+i*2,Math.round(sample*(sample<0?32768:32767)),true);}
    if(!(peak>.001))throw Error('Silent source cue: '+key);
    // Decode the emitted WAV independently to verify format and preserved frames.
    const verified=await new OfflineAudioContext(1,1,44100).decodeAudioData(wav.slice(0));
    if(verified.numberOfChannels!==1||verified.sampleRate!==44100||verified.length!==samples.length)throw Error('WAV decode mismatch: '+key);
    let maxQuantizationError=0;const roundtrip=verified.getChannelData(0);for(let i=0;i<samples.length;i++)maxQuantizationError=Math.max(maxQuantizationError,Math.abs(roundtrip[i]-Math.max(-1,Math.min(1,samples[i]))));
    if(maxQuantizationError>2/32768)throw Error('WAV sample verification failed: '+key);
    const output=new Uint8Array(wav);let binary='';for(let i=0;i<output.length;i+=32768)binary+=String.fromCharCode(...output.subarray(i,i+32768));
    results[key]={base64:btoa(binary),duration:verified.duration,frames:verified.length,channels:1,sampleRate:44100,bitsPerSample:16,peak,rms:Math.sqrt(squares/samples.length),maxQuantizationError,decodeVerified:true};
   }
   return results;
  },originals);
 }finally{await browser.close();}
 const destination=path.join(root,'assets/audio'),manifestFile=path.join(destination,'manifest.json');
 const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8')),entries={};
 for(const [key,result]of Object.entries(converted)){
  const {base64,...verification}=result,source=originals[key],bytes=Buffer.from(base64,'base64'),file='assets/audio/'+cues[key].file;
  fs.writeFileSync(path.join(root,file),bytes);
  manifest[key]={file,source:'APK/'+source.source,sourceSha256:source.sha256,sha256:hash(bytes)};
  entries[key]={...manifest[key],sourceChannels:source.sourceChannels,sourceSampleRate:source.sourceSampleRate,...verification};
 }
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
 const provenance={sourceArchive:path.basename(apk),sourceArchiveSha256:hash(fs.readFileSync(apk)),converter:'OfflineAudioContext decode + mono render; PCM16 WAV encoding',browser:'Chromium '+browserVersion,policy:'Original user-supplied cues; no synthesis, gain normalization, network, or APK execution. Existing audio manifest entries preserved.',entries};
 fs.writeFileSync(path.join(destination,'chest-audio-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
 console.log(JSON.stringify({imported:Object.keys(entries).length,totalManifestEntries:Object.keys(manifest).length,bytes:Object.values(entries).reduce((sum,e)=>sum+fs.statSync(path.join(root,e.file)).size,0),verification:Object.fromEntries(Object.entries(entries).map(([key,e])=>[key,{duration:e.duration,frames:e.frames,decodeVerified:e.decodeVerified}]))},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
