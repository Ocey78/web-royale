'use strict';
// Development helper. The generated PNGs ship with the game; no browser tooling
// or icon rendering is needed to play, host, or rebuild a release.
const {webkit}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await webkit.launch({headless:true});try{const dir=path.join(__dirname,'../assets/webapp'),svg=fs.readFileSync(path.join(dir,'icon.svg'),'utf8');for(const size of [180,192,512]){const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});await page.setContent('<html><body style="margin:0">'+svg.replace('width="512" height="512"',`width="${size}" height="${size}"`)+'</body></html>');await page.screenshot({path:path.join(dir,`icon-${size}.png`)});await page.close();}console.log('Generated 180, 192 and 512 pixel Home Screen icons.');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
