'use strict';
// Derive missing road surfaces from the retained original arena floor exports.
// The platform silhouette is the existing native road frame. This is a local
// presentation adaptation, not a claim to reproduce unavailable road exports.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),native=JSON.parse(fs.readFileSync(path.join(root,'assets/native/data.json'))),manifestPath=path.join(root,'assets/ui/manifest.json');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),uri=file=>'data:image/'+(/\.webp$/i.test(file)?'webp':'png')+';base64,'+fs.readFileSync(file).toString('base64');
async function main(){const browser=await chromium.launch({headless:true}),page=await browser.newPage();try{
 await page.setContent('<html><body></body></html>');await page.addScriptTag({path:path.join(root,'src/native.js')});
 const manifest=JSON.parse(fs.readFileSync(manifestPath)),frameFile=path.join(root,'assets/ui/classic-platform-106.webp'),frame=uri(frameFile),entries=[];
 for(const arena of native.arenas.filter(a=>a.number>14)){const scene=native.scenes[arena.scene],textures=scene.textures.map(t=>uri(path.join(root,'assets/native',t.file))),crop={x:-192,y:440,width:384,height:180};
  const png=await page.evaluate(async({scene,textures,frame,exportName,crop})=>{const image=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});const images=await Promise.all(textures.map(image)),border=await image(frame),s=new RoyaleNative.Scene({...scene,rasterScale:2},images),cv=document.createElement('canvas');cv.width=border.naturalWidth;cv.height=border.naturalHeight;const c=cv.getContext('2d');c.drawImage(border,0,0);c.save();c.beginPath();c.roundRect(43,23,cv.width-86,cv.height-99,18);c.clip();c.translate(43,23);c.scale((cv.width-86)/crop.width,(cv.height-99)/crop.height);c.translate(-crop.x,-crop.y);s.draw(c,exportName,0,{frame:0,still:true});c.restore();return cv.toDataURL('image/png').split(',')[1];},{scene,textures,frame,exportName:arena.export,crop});
  const bytes=Buffer.from(png,'base64'),key='modern-road-platform-'+arena.number,file='assets/ui/'+key+'.png';fs.writeFileSync(path.join(root,file),bytes);manifest[key]={file,source:'native-floor:'+arena.scene+'#'+arena.export,sourceVersion:'16.402.2',adaptation:'original arena floor crop in retained road platform frame',crop,sourceSceneSha256:sha(Buffer.from(JSON.stringify(scene))),sourceTextureSha256:Object.fromEntries(scene.textures.map(t=>[t.file,sha(fs.readFileSync(path.join(root,'assets/native',t.file)))])),frameSha256:sha(fs.readFileSync(frameFile)),sha256:sha(bytes)};entries.push({key,sha256:sha(bytes)});console.log(key,bytes.length);
 }
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');return entries;
 }finally{await browser.close();}}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main};
