/* Locally streamed, original emote timelines. This cache is deliberately separate
   from battle scenes so opening an emote cannot evict arena or troop artwork. */
(function(root){'use strict';
const scenes=new Map(),pending=new Map(),playing=new Map(),entries=new Map();let config=null,raf=0,errorCount=0;
function configure(data){config=data;entries.clear();for(const e of data?.entries||[])entries.set(e.id,e);}
async function scene(name){if(scenes.has(name)){const s=scenes.get(name);scenes.delete(name);scenes.set(name,s);return s;}if(pending.has(name))return pending.get(name);
 const task=(async()=>{const path=config?.scenes[name];if(!path)throw Error('Missing emote scene: '+name);
 const response=await fetch(new URL(path,document.baseURI),{cache:'force-cache',credentials:'same-origin'});if(!response.ok)throw Error('Emote scene HTTP '+response.status);const data=await response.json();
 const images=await Promise.all(data.textures.map(t=>new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Emote texture failed to load'));im.src=new URL(t.file,document.baseURI).href;})));
 const s=new RoyaleNative.Scene(data,images);scenes.set(name,s);
 for(const [key,old]of scenes){if(scenes.size<=8)break;if([...playing.values()].some(p=>p.entry.scene===key))continue;old.cache.clear();scenes.delete(key);}
 return s;})();pending.set(name,task);try{return await task;}finally{pending.delete(name);}
}
function render(cv,s,e,time){const r=e.bounds||s.bounds(e.animation),w=cv.clientWidth||140,h=cv.clientHeight||140,d=Math.max(2,Math.min(4,(devicePixelRatio||1)*(root.RoyaleUI?.scale||1)));
 const W=Math.ceil(w*d),H=Math.ceil(h*d);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
 const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);const scale=Math.min((w-4)/Math.max(1,r.width),(h-4)/Math.max(1,r.height));c.translate(w/2-(r.x+r.width/2)*scale,h/2-(r.y+r.height/2)*scale);c.scale(scale,scale);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';s.draw(c,e.animation,time,{loop:false});cv.dataset.frame=String(Math.min(e.frames-1,Math.floor(time*e.fps)));cv.dataset.rendered='true';}
function tick(now){raf=0;for(const [bubble,p] of playing){if(!bubble.isConnected||bubble.offsetParent===null){playing.delete(bubble);continue;}if(!p.ready)continue;if(p.start===null)p.start=now;
 const elapsed=(now-p.start)/1000;const cv=bubble.querySelector('.emote-animation');if(!cv){playing.delete(bubble);continue;}
 if(elapsed>=p.entry.frames/p.entry.fps){cv.hidden=true;const im=bubble.querySelector('.emote-portrait img');if(im)im.hidden=false;playing.delete(bubble);bubble.dataset.playback='complete';continue;}
 render(cv,p.scene,p.entry,elapsed);}
 if(playing.size)raf=requestAnimationFrame(tick);
}
function play(bubble,id=bubble.dataset.emote){const e=entries.get(id);if(!e)return;
 const image=bubble.querySelector('.emote-portrait img');let cv=bubble.querySelector('.emote-animation');if(!cv){cv=document.createElement('canvas');cv.className='emote-animation';cv.setAttribute('aria-hidden','true');bubble.querySelector('.emote-portrait').append(cv);}
 bubble.dataset.animationKind='original-timeline';
 if(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){cv.hidden=true;if(image)image.hidden=false;bubble.dataset.playback='reduced-motion';return;}
 const p={entry:e,start:null,ready:false};playing.set(bubble,p);cv.hidden=true;if(image)image.hidden=false;bubble.dataset.playback='loading';
 scene(e.scene).then(s=>{if(playing.get(bubble)!==p||!bubble.isConnected)return;p.scene=s;p.ready=true;p.start=null;if(image)image.hidden=true;cv.hidden=false;bubble.dataset.playback='playing';if(!raf)raf=requestAnimationFrame(tick);}).catch(err=>{playing.delete(bubble);bubble.dataset.playback='error';errorCount++;console.error(err);});
}
function hydrate(scope){if(!config)return;const items=[...scope.querySelectorAll('.emote-bubble[data-play="true"]')];if(scope.matches?.('.emote-bubble[data-play="true"]'))items.push(scope);for(const el of items)if(!el.dataset.playback)play(el);}
root.RoyaleEmotes={configure,hydrate,play,scene,render,summary:()=>({entries:entries.size,scenes:scenes.size,active:playing.size,errors:errorCount})};
})(globalThis);
