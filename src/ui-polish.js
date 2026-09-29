/* Original glyph artwork in responsive, aspect-correct labels. DOM buttons keep
   their real hit boxes and accessible strings. No font binaries are required. */
(function(root){'use strict';
let scale=1,scheduled=false;const seen=new WeakMap();
const fixedSelectors=[
 '.resource>span','.xp-track>b','.xp-badge','.home-trophies>b','.slot-title','.slot-duration','.slot-arena',
 '.card-level','.card-progress>b','.offer-price>strong','.offer-rarity','.offer-copy-progress>b',
 '.reference-banner h2','.shop-offer h3','.collection-page-header h2','.collection-page-header small',
 '.deck-pool-header h2','.deck-pool-header small','.collection-header h2','.collection-header small',
 '.magic-collection-tile>small','.tower-collection-tile>strong','.emote-collection-tile>small',
 '.settings-section>h3','.card-hero h3','.modal-title','.page-title','.events-heading h3','.event-card h3',
 '#battleAnnouncementMain','#battleAnnouncementSub','.end-winner-label','.match-over-text'
].join(',');
function plain(el){return el.dataset.royaleText??el.querySelector(':scope>.ink-run>.sr-only')?.textContent??el.textContent;}
function adopt(el){if(el.classList.contains('royale-label'))return;
 if(el.querySelector('button,input,select,textarea'))return;
 const src=el.querySelector(':scope>img.native-word');
 const value=src?el.querySelector('.sr-only')?.textContent:plain(el);
 if(!value?.trim())return;
 // A host can have important inline elements (e.g. the live collection count).
 // Preserve those rather than swallowing them into a replacement label.
 if([...el.children].some(c=>!c.matches('.ink-run,.ink-text,.ink-space,.sr-only,.native-word,wbr,canvas')))return;
 el.dataset.royaleText=value.trim();el.classList.add('royale-label');el.textContent='';
 const accessible=document.createElement('span');accessible.className='sr-only';accessible.textContent=value.trim();el.append(accessible);
 const canvas=document.createElement('canvas');canvas.className='label-ink';canvas.setAttribute('aria-hidden','true');el.append(canvas);
}
function availableWidth(el){if(getComputedStyle(el).position==='absolute'&&el.clientWidth)return el.clientWidth;const p=el.parentElement;if(!p)return el.clientWidth||500;const ps=getComputedStyle(p);let w=p.clientWidth-(parseFloat(ps.paddingLeft)||0)-(parseFloat(ps.paddingRight)||0);
 if(ps.display.includes('flex')&&ps.flexDirection.startsWith('row')){
  const sib=[...p.children].filter(c=>c!==el&&!c.matches('.sr-only')&&getComputedStyle(c).position!=='absolute'&&!c.hidden);
  for(const s of sib){const cs=getComputedStyle(s);w-=s.getBoundingClientRect().width/scale+(parseFloat(cs.marginLeft)||0)+(parseFloat(cs.marginRight)||0);}
  w-=sib.length*(parseFloat(ps.columnGap)||0);
 }
 return Math.max(8,w);
}
function paint(el){if(!root.RoyaleText?.ready||el.offsetParent===null)return;
 // Live labels are updated with textContent by existing game handlers.
 if(!el.querySelector(':scope>canvas.label-ink')){seen.delete(el);
  const next=el.textContent;if(next.trim())el.dataset.royaleText=next.trim();
  el.textContent='';const a=document.createElement('span');a.className='sr-only';a.textContent=el.dataset.royaleText||'';
  const c=document.createElement('canvas');c.className='label-ink';c.setAttribute('aria-hidden','true');el.append(a,c);
 }
 const st=getComputedStyle(el),text=el.dataset.royaleText||'',family=(parseInt(st.fontWeight)>=600||el.closest('.game-text,.native-button,h1,h2,h3'))?'title':'body';
 const m=RoyaleText.metrics(text,family);if(!m)return;
 const size=parseFloat(st.fontSize)||16,pad=3,density=RoyaleText.backingScale(root.devicePixelRatio||1,scale);
 const natural=m.advance/m.size*size;
 let maxWidth=Math.min(availableWidth(el),el.clientWidth||Infinity);
 if(el.matches('span.royale-label')&&el.parentElement.matches('.native-button,.nav-word,.sort-label'))maxWidth=availableWidth(el);
 const isMulti=el.matches('.magic-collection-tile>small,.event-card h3,.shop-offer h3');
 let lines=[text];
 if(isMulti&&natural>maxWidth-6){
  lines=[];let line='';for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(line&&RoyaleText.metrics(next,family).advance/m.size*size>maxWidth-6){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
 }
 const lineWidth=Math.max(1,...lines.map(s=>RoyaleText.metrics(s,family).advance));
 const fit=RoyaleText.fitText({...m,advance:lineWidth},size,Math.max(1,maxWidth-pad*2));
 const lineHeight=fit.size*1.22,height=lineHeight*lines.length+pad*2,width=Math.min(maxWidth,lineWidth/m.size*fit.size+pad*2);
 const color=st.color,rgb=color.match(/[\d.]+/g)||[],bright=rgb.length>=3?.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]:255,outline=family==='title'&&st.textShadow!=='none'&&bright>140?'#142033':null;
 const key=[text,family,fit.size,width,height,color,outline,density].join('|');if(seen.get(el)===key)return;seen.set(el,key);
 const cv=el.querySelector(':scope>canvas.label-ink');cv.width=Math.max(1,Math.ceil(width*density));cv.height=Math.max(1,Math.ceil(height*density));
 cv.style.width=width+'px';cv.style.height=height+'px';cv.dataset.density=String(density);cv.dataset.fontSize=String(fit.size);cv.dataset.lines=String(lines.length);
 const ct=cv.getContext('2d');ct.scale(density,density);ct.imageSmoothingEnabled=true;ct.imageSmoothingQuality='high';
 lines.forEach((line,i)=>RoyaleText.draw(ct,line,width/2,pad+lineHeight*(i+.5),fit.size,color,'center',outline,family));
 el.dataset.fittedSize=String(fit.size);el.dataset.textWidth=String(width);
}
function hydrate(scope=document.getElementById('viewport')){if(!scope?.querySelectorAll)return;
 for(const el of scope.querySelectorAll(fixedSelectors))adopt(el);
 for(const im of scope.querySelectorAll('img.native-word')){const prev=im.previousElementSibling;
  if(prev?.classList.contains('sr-only')&&prev.textContent.trim()){
   const label=document.createElement('span');label.className='royale-label';label.dataset.royaleText=prev.textContent.trim();
   const cv=document.createElement('canvas');cv.className='label-ink';cv.setAttribute('aria-hidden','true');label.append(prev,cv);im.replaceWith(label);
  }
 }
 const labels=[...scope.querySelectorAll('.royale-label')];if(scope.classList.contains('royale-label'))labels.push(scope);
 for(const el of labels)paint(el);
}
function sizeCanvas(canvas,w,h,density){
 const width=Math.ceil(w*density),height=Math.ceil(h*density);
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 if(canvas.dataset.density!==String(density))canvas.dataset.density=String(density);const c=canvas.getContext('2d');c.setTransform(density,0,0,density,0,0);return c;
}
function prepareCanvas(canvas,w,h,cap=4){return sizeCanvas(canvas,w,h,Math.min(cap,root.RoyaleText.backingScale(root.devicePixelRatio||1,scale)));}
// Full-scene animation follows display density; tiny glyph canvases keep their
// separate supersampling policy. A modest floor keeps small artwork crisp when
// the portrait arena is scaled down on a DPR1 desktop; Retina keeps device density.
function prepareBattleCanvas(canvas,w,h,cap=3){return sizeCanvas(canvas,w,h,Math.min(cap,Math.max(1.25,(root.devicePixelRatio||1)*scale)));}
function resize(value){scale=Math.max(.1,Number(value)||1);root.RoyaleText?.setViewportScale(scale);if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;hydrate();root.RoyaleText?.hydrate(document.getElementById('viewport'));document.dispatchEvent(new Event('royale-ui-resize'));});}
root.RoyaleUI={hydrate,resize,paint,prepareCanvas,prepareBattleCanvas,get scale(){return scale;}};
})(globalThis);
