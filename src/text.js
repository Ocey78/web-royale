/* Rendered source lettering. No font program is distributed or loaded at runtime.
 * Ink comes from the user's original client; live strings use its glyph advances.
 * Unsupported Unicode remains accessible and uses a system fallback explicitly.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleText=api;})(globalThis,function(){'use strict';
let families=null,images={},ready=false,viewportScale=1;const cache=new Map();let fallbackCount=0;
const cv=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;};
function backingScale(dpr=1,scale=1){return Math.max(2,Math.min(4,(Number.isFinite(dpr)?Math.max(1,dpr):1)*(Number.isFinite(scale)?Math.max(.1,scale):1)));}
function fitText(m,size=16,maxWidth=Infinity,maxHeight=Infinity){
 const scale=Math.max(0,Math.min(size/m.size,Math.max(0,maxWidth)/Math.max(1,m.advance),Math.max(0,maxHeight)/Math.max(1,m.ascent+m.descent)));
 return {scaleX:scale,scaleY:scale,width:m.advance*scale,height:(m.ascent+m.descent)*scale,size:scale*m.size};
}
function setViewportScale(scale){viewportScale=Number.isFinite(scale)?Math.max(.1,scale):1;}
function metrics(text,family='title'){const f=families?.[family];if(!f)return null;let advance=0,prev='';let supported=true;for(const ch of String(text)){const g=f.glyphs[ch];if(!g){supported=false;advance+=f.size*.55;}else advance+=g.advance+(f.pairs[prev+ch]||0);prev=ch;}return{advance,ascent:f.ascent,descent:f.descent,size:f.size,supported};}
async function load(data){families=data;await Promise.all(Object.entries(data).flatMap(([key,f])=>['fill','stroke'].map(part=>new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{images[key+':'+part]=im;resolve();};im.onerror=()=>reject(Error('Original lettering image could not load: '+key));im.src=new URL(f[part],document.baseURI).href;}))));ready=true;return api;}
function texture(text,family,fill,outline){const key=family+'|'+fill+'|'+outline+'|'+text;if(cache.has(key))return cache.get(key);const f=families[family],m=metrics(text,family);if(!m.supported)return null;
 const pad=5,width=Math.ceil(m.advance)+pad*2,height=f.ascent+f.descent+pad*2,c= cv(width,height),out=c.getContext('2d');
 for(const [part,color] of [['stroke',outline],['fill',fill]]){if(!color)continue;const layer=cv(width,height),ctx=layer.getContext('2d');let x=pad,prev='';for(const ch of String(text)){const g=f.glyphs[ch];x+=f.pairs[prev+ch]||0;ctx.drawImage(images[family+':'+part],g.x,g.y,g.w,g.h,x+g.left,pad+f.ascent+g.top,g.w,g.h);x+=g.advance;prev=ch;}ctx.globalCompositeOperation='source-in';ctx.fillStyle=color;ctx.fillRect(0,0,width,height);out.drawImage(layer,0,0);}
 const result={image:c,advance:m.advance,pad,ascent:f.ascent,descent:f.descent,size:f.size};if(cache.size>=350)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
}
function draw(c,text,x,y,size=14,color='#fff',align='center',outline='#162433',family='title',maxWidth=Infinity){
 if(!ready)return false;text=String(text);const a=texture(text,family,color,outline);if(!a){fallbackCount++;c.save();c.font=`${family==='title'?'900':'400'} ${size}px sans-serif`;const fw=c.measureText(text).width;if(fw>maxWidth)c.font=`${family==='title'?'900':'400'} ${Math.max(1,size*maxWidth/fw)}px sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;if(outline){c.strokeStyle=outline;c.lineWidth=2;c.strokeText(text,x,y);}c.fillText(text,x,y);c.restore();return true;}
 const fit=fitText(a,size,maxWidth),scale=fit.scaleY,scaleX=fit.scaleX,width=fit.width;
 const left=x-(align==='center'?width/2:align==='right'?width:0)-a.pad*scaleX;
 c.drawImage(a.image,left,y-(a.ascent+a.descent)*scale/2-a.pad*scale,a.image.width*scaleX,a.image.height*scale);return true;
}
const rgb=n=>'#'+((n>>>0)&0xffffff).toString(16).padStart(6,'0');
function field(c,f,text,color){const [l,t,r,b]=f.bounds,align=f.align===2?'center':f.align===1?'right':'left',family=/backbeat/i.test(f.fontName)?'body':'title';c.save();if(color)c.globalAlpha*=color[3]/255;draw(c,text,align==='center'?(l+r)/2:align==='right'?r:l,(t+b)/2,f.fontSize||14,rgb(f.color??-1),align,rgb(f.outlineColor??0xff162433),family,Math.max(1,r-l));c.restore();}
// Replaces text paint only. The complete source string remains accessible.
// Existing runs are repainted when CSS size, contrast or physical display density
// changes; enlarging an old 2x word canvas would only enlarge its blur.
function updateInkRun(run){
 const parent=run.parentElement;if(!parent||parent.offsetParent===null)return;
 const alt=run.querySelector(':scope>.sr-only');if(!alt)return;
 const st=getComputedStyle(parent),family=(parseInt(st.fontWeight)>=600||parent.closest('.game-text,.native-button,h1,h2,h3,.nav-btn'))?'title':'body';
 const source=alt.textContent,parts=source.split(/(\s+)/),size=parseFloat(st.fontSize)||16,density=backingScale(globalThis.devicePixelRatio||1,viewportScale);
 if(parts.some(part=>part&&!/^\s+$/.test(part)&&!metrics(part,family)?.supported))return;
 const rgb=st.color.match(/[\d.]+/g)||[],bright=rgb.length>=3?.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]:255;
 const outline=family==='title'&&st.textShadow!=='none'&&bright>140?'#142032':null;
 const signature=[source,size,family,density,st.color,outline].join('|');if(run.dataset.inkSignature===signature)return;
 run.dataset.inkSignature=signature;run.replaceChildren(alt);
 for(const part of parts){if(!part)continue;
  if(/^\s+$/.test(part)){const gap=document.createElement('span');gap.className='ink-space';gap.setAttribute('aria-hidden','true');gap.style.width=(metrics(part.replace(/\s/g,' '),family).advance/metrics(' ',family).size*size)+'px';run.append(gap,document.createElement('wbr'));continue;}
  const m=metrics(part,family),width=m.advance/m.size*size,height=size*1.11,span=document.createElement('span'),canvas=cv((width+4)*density,(height+4)*density);
  span.className='ink-text';span.setAttribute('aria-hidden','true');span.style.cssText=`display:inline-block;position:relative;width:${width}px;height:${height}px;vertical-align:-.18em;white-space:nowrap;font-size:inherit;line-height:1;`;
  canvas.style.cssText=`position:absolute;width:${width+4}px;height:${height+4}px;left:-2px;top:-2px;pointer-events:none;`;canvas.dataset.density=String(density);canvas.setAttribute('aria-hidden','true');const ct=canvas.getContext('2d');ct.scale(density,density);
  draw(ct,part,2,height/2+2,size,st.color,'left',outline,family);span.append(canvas);run.append(span);
 }
}
function hydrate(root=document.body){if(!ready||!root?.querySelectorAll)return;
 for(const run of root.querySelectorAll('.ink-run'))updateInkRun(run);
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];let node;
 while(node=walker.nextNode()){
  const p=node.parentElement;if(!p||!node.textContent.trim()||p.closest('.royale-label,.ink-run,.ink-text,.sr-only,canvas,script,style,pre,textarea,input,select,option,[data-system-text]'))continue;
  if(p.offsetParent===null&&p!==document.body)continue;nodes.push(node);
 }
 for(const n of nodes){const p=n.parentElement;if(!p)continue;
  const st=getComputedStyle(p),family=(parseInt(st.fontWeight)>=600||p.closest('.game-text,.native-button,h1,h2,h3,.nav-btn'))?'title':'body';
  if(!metrics(n.textContent,family)?.supported)continue;
  const run=document.createElement('span'),alt=document.createElement('span');run.className='ink-run';alt.className='sr-only';alt.textContent=n.textContent;run.append(alt);n.replaceWith(run);updateInkRun(run);
 }
}

const api={load,metrics,draw,field,hydrate,fitText,backingScale,setViewportScale,get ready(){return ready;},summary:()=>({ready,cachedStrings:cache.size,fallbackCount,families:Object.keys(families||{})})};return api;});
