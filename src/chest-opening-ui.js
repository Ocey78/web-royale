/* Original source chest/flip timelines with real, already committed receipts. */
(function(root){'use strict';
function create(ctx){
 let sequence=null,scene=null,chestScene=null,canvas=null,host=null,stamp=0,key='',raf=0,closed=false,replaceIds=[];const images=new Map();
 async function image(key){if(images.has(key))return images.get(key);const im=new Image();im.src=ctx.uiImages[key];await im.decode();images.set(key,im);return im;}
 function face(c,item){
  const im=item.kind==='card'?ctx.art.get(item.id)?.image:images.get(item.kind==='gold'?'chest-reward-gold':item.kind==='gems'?'chest-reward-gems':item.kind==='wildcard'?'road-wild-'+item.rarity.toLowerCase():'cards');if(!im)return;
  c.save();if(item.kind==='card'){c.beginPath();if(item.rarity==='Legendary'){c.moveTo(0,-75);c.lineTo(59,-53);c.lineTo(59,53);c.lineTo(0,75);c.lineTo(-59,53);c.lineTo(-59,-53);c.closePath();}else c.roundRect(-59,-75,118,150,11);c.clip();c.drawImage(im,-59,-75,118,150);}else{const scale=Math.min(108/im.width,135/im.height);c.drawImage(im,-im.width*scale/2,-im.height*scale/2,im.width*scale,im.height*scale);}c.restore();
 }
 function paint(){
  if(!sequence||!canvas?.isConnected)return;const c=canvas.getContext('2d');c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,540,960);
  if(sequence.stage==='summary'||sequence.stage==='done')return;
  const opening=['arriving','closed','opening'].includes(sequence.stage),chestY=opening?585:740;
  c.save();c.translate(270,chestY);c.scale(.9,.9);const instances={cards_left:{visible:false},glow_legendary:{visible:sequence.current?.rarity==='Legendary'},glow_epic:{visible:sequence.current?.rarity==='Epic'},glow_rare:{visible:sequence.current?.rarity==='Rare'},glow_common:{visible:sequence.current?.rarity==='Common'}};
  if(['arriving','closed'].includes(sequence.stage)){const progress=sequence.stage==='arriving'?Math.min(1,sequence.elapsed/.3):1;c.scale(.85+.15*progress,.85+.15*progress);c.globalAlpha=progress;chestScene.draw(c,sequence.closedExport,sequence.elapsed,{loop:true});}
  else chestScene.draw(c,sequence.openingExport,sequence.stage==='opening'?sequence.elapsed:sequence.openingRange.end/sequence.openingRange.fps+sequence.elapsed,{frame:sequence.chestFrame,loop:false,instances});c.restore();
  if(sequence.current){c.save();c.translate(270,355);c.scale(1.65,1.65);
   const turning=sequence.stage==='revealing'&&sequence.elapsed<sequence.rotationDuration;
   if(turning)scene.draw(c,sequence.revealExport,sequence.elapsed,{loop:false});
   else{const replacements={};
    // The source's named card_image containers all reference the same placeholder.
    for(const id of replaceIds)replacements[id]=(ct)=>face(ct,sequence.current);
    const time=sequence.stage==='shown'?sequence.duration(sequence.faceExport)+sequence.elapsed:Math.max(0,sequence.elapsed-sequence.rotationDuration);
    scene.draw(c,sequence.faceExport,time,{loop:false,replaceNodes:replacements});
   }c.restore();
  }
 }
 function sync(){
  const next=sequence.stage+':'+sequence.index;if(next===key)return;key=next;host.dataset.stage=sequence.stage;host.dataset.index=String(sequence.index);
  const item=sequence.current,shown=sequence.stage==='shown',summary=sequence.stage==='summary';
  const name=host.querySelector('.chest-reward-name'),amount=host.querySelector('.chest-reward-amount'),badge=host.querySelector('.chest-reward-badge');
  name.innerHTML=shown?ctx.word(item.name):'';amount.innerHTML=shown?ctx.word((item.kind==='card'?'×':'+' )+item.count):'';badge.innerHTML=shown&&item.isNew?ctx.word('New Card!'):shown&&item.kind==='card'?ctx.word(item.rarity):'';
  host.querySelector('.chest-remaining').textContent=item&&!summary?String(sequence.remaining):'';
  const action=host.querySelector('.chest-tap'),hint=sequence.stage==='closed'?'Tap to open':shown?'Tap to continue':summary?'Done':sequence.stage==='revealing'?'Tap to reveal':'';
  action.disabled=['arriving','opening'].includes(sequence.stage);action.innerHTML=ctx.word(hint||'Opening…');action.setAttribute('aria-label',hint||'Opening chest');
  host.querySelector('.chest-summary').hidden=!summary;host.querySelector('.chest-skip').hidden=summary;
  if(summary){host.querySelector('.chest-summary').innerHTML='<h3>'+ctx.word('You received')+'</h3><div class="chest-summary-grid">'+sequence.entries.map(e=>'<div class="chest-summary-item">'+(e.kind==='card'?ctx.cardVisual(e.id):ctx.icon(e.kind==='gold'?'chest-reward-gold':e.kind==='gems'?'chest-reward-gems':e.kind==='wildcard'?'road-wild-'+e.rarity.toLowerCase():'cards'))+'<strong>'+ctx.word((e.kind==='card'?'×':'+')+e.count)+'</strong><small>'+ctx.word(e.name)+'</small></div>').join('')+'</div>';}
  if(sequence.stage==='opening')ctx.sound('chestOpen'+({treasure:'Wood',wood:'Wood',crown:'Crown',magic:'Magic',gold:'Gold',gem:'Gold'}[sequence.kind]||'Silver'));
  if(sequence.stage==='shown')ctx.sound(item.rarity==='Rare'||item.rarity==='Epic'?'cardRare':item.kind==='card'?'cardCommon':'reward');
  ctx.hydrate(host);
 }
 function frame(ms){if(closed||!host?.isConnected)return;const dt=stamp?Math.min(.1,(ms-stamp)/1000):0;stamp=ms;if(!document.hidden)sequence.advance(dt);sync();paint();raf=requestAnimationFrame(frame);}
 function close(){api.loading=null;closed=true;cancelAnimationFrame(raf);sequence=null;host=null;canvas=null;}
 async function open(reward,{kind='silver',title='Chest',owned=[]}={}){
  close();closed=false;const token={};api.loading=token;ctx.panel('chest-opening',title,'<div class="chest-loading">Opening chest…</div>',false);
  try{await Promise.all([ctx.native.ensureScenes(kind==='gem'?['chest_opening','gem_chest']:kind==='treasure'?['chest_opening','treasure_chest']:['chest_opening']),...['chest-reward-gold','chest-reward-gems','cards','road-wild-common','road-wild-rare','road-wild-epic','road-wild-legendary'].map(image),...(reward.cards||[]).map(x=>ctx.art.load(x.id))]);}catch(error){if(api.loading!==token)return false;throw error;}if(api.loading!==token)return false;
  scene=ctx.native.scenes.chest_opening;chestScene=kind==='gem'?ctx.native.scenes.gem_chest:kind==='treasure'?ctx.native.scenes.treasure_chest:scene;replaceIds=[...new Set(Object.values(scene.data.clips).flatMap(c=>c.children.filter((id,i)=>c.childrenNames[i]==='card_image')))];sequence=new root.RoyaleChestOpening.Sequence(reward,{scene:scene.data,kind,owned});key='';stamp=0;
  ctx.panel('chest-opening',title,`<div class="chest-opening-view"><canvas class="chest-opening-canvas" width="1080" height="1920" aria-hidden="true"></canvas><div class="chest-opening-title">${ctx.word(title)}</div><div class="chest-reward-badge" aria-live="polite"></div><div class="chest-reward-name"></div><div class="chest-reward-amount"></div><b class="chest-remaining" aria-label="Rewards remaining"></b><div class="chest-summary" hidden></div><button class="chest-skip" type="button">Skip</button><button class="chest-tap native-button blue" type="button"></button></div>`,false);
  host=document.querySelector('.chest-opening-view');canvas=host.querySelector('canvas');host.querySelector('.chest-tap').onclick=()=>{sequence.tap();if(sequence.stage==='done'){close();ctx.close();}else sync();};
  host.querySelector('.chest-skip').onclick=()=>{sequence.skip();sync();};canvas.onclick=()=>host.querySelector('.chest-tap').click();sync();raf=requestAnimationFrame(frame);return true;
 }
 const api={open,close,loading:null,get sequence(){return sequence;}};return api;
}
root.RoyaleChestOpeningUI={create};})(globalThis);
