/* Web Royale 0.53.0: same-origin static asset bootstrap. */
(async()=>{'use strict';const status=document.getElementById('loadMessage');try{
 if(location.protocol==='file:')throw Error('Serve this folder over HTTP(S). Run npm run serve, then open the displayed localhost address.');
 const response=await fetch(new URL("runtime.ab37993451eb.json",document.baseURI),{cache:'force-cache'});if(!response.ok)throw Error('Website metadata: HTTP '+response.status);
 const data=await response.json();window.RoyaleBundle=data;window.RoyaleGameData=data.game;
 for(const map of [data.art,data.images,data.uiImages,data.sounds])for(const key of Object.keys(map))map[key]=new URL(map[key],document.baseURI).href;
 status.textContent="Opening Web Royale…";document.getElementById('loadProgress').style.width='12%';
 const app=document.createElement('script');app.src=new URL("app.1d353ca472af.js",document.baseURI).href;app.onerror=()=>{status.textContent='Game script did not load. Reload to retry.';document.getElementById('loadRetry').hidden=false;document.getElementById('loadRetry').onclick=()=>location.reload();};document.body.appendChild(app);
}catch(e){status.textContent='Could not start: '+e.message;document.getElementById('loadProgress').style.width='0%';const retry=document.getElementById('loadRetry');retry.hidden=false;retry.onclick=()=>location.reload();console.error(e);}})();