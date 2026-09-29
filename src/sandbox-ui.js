/* Manual practice controls share the measured battle frame, without changing
   its camera, arena artwork, native card casts or normal match controls. */
(function(root){'use strict';
function create(ctx){
 const C=root.RoyaleCore,V=root.RoyaleBattleView,$=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let session=null,shell=null,ready=false,card='knight',team=0,level=9,revision=0,showTargets=false,gesture=null,lastStatus=0,loadError='';
 const b=()=>session?.battle,btn=(label,action,kind='blue',attrs='')=>ctx.button(label,action,kind,attrs);
 async function prepare(){
  if(!session)return;const generation=++revision;ready=false;status('Loading '+C.CARD_BY_ID[card].name+'…');
  try{await ctx.prepareCard(card);if(generation!==revision||!session)return;ready=true;status();}
  catch(e){if(generation!==revision)return;loadError='Card could not load. Select it again to retry.';status();ctx.toast(e.message||'Card could not load');}
 }
 function status(message){if(!shell)return;const battle=b();$('sandboxStatus').textContent=message||(!ready?(loadError||'Loading '+C.CARD_BY_ID[card].name+'...'):`${battle.paused?'Paused · ':''}${team?'Red':'Blue'} · ${C.CARD_BY_ID[card].name} · Tap arena to place`);$('sandboxStatus').dataset.ready=String(ready);}
 function refresh(){if(!shell)return;const battle=b();$('sandboxPause').textContent=battle.paused?'Resume':'Pause';$('sandboxPause').setAttribute('aria-pressed',String(battle.paused));$('sandboxElapsed').textContent=Math.floor(battle.time)+'s · No time limit';status();}
 function setTeam(next){team=next;for(const e of shell.querySelectorAll('[data-sandbox-team]'))e.setAttribute('aria-pressed',String(Number(e.dataset.sandboxTeam)===team));status();}
 function towerPanel(){
  const box=$('sandboxTowers');box.hidden=false;box.innerHTML=`<form id="sandboxTowerForm"><h2>Towers</h2><p>Choose towers, then reset the arena.</p><label class="sandbox-tower-level">Tower level (0-99) <input id="sandboxTowerLevel" type="number" min="0" max="99" step="1" value="${session.options.level}"></label><div class="sandbox-tower-teams">${['blue','red'].map(name=>`<fieldset><legend>${name==='blue'?'Blue':'Red'} team</legend>${[['left','Left Princess'],['right','Right Princess'],['king','King']].map(([key,label])=>`<label><input type="checkbox" name="${name}-${key}" ${session.options.towers[name][key]?'checked':''}> ${label}</label>`).join('')}</fieldset>`).join('')}</div><div class="sandbox-tower-actions">${btn('All off','sandbox-towers-off')}${btn('Cancel','sandbox-towers-cancel')}${btn('Reset','sandbox-towers-apply','green','type="submit"')}</div></form>`;
  ctx.hydrate(box);$('sandboxTowerForm').addEventListener('submit',e=>{e.preventDefault();const config={blue:{},red:{}};for(const name of ['blue','red'])for(const key of ['left','right','king'])config[name][key]=box.querySelector(`[name="${name}-${key}"]`).checked;session.reset(config,Number($('sandboxTowerLevel').value));box.hidden=true;refresh();});
  box.querySelector('input')?.focus();
 }
 function handle(e){
  const control=e.target.closest('[data-action]');if(!control||!shell?.contains(control))return;
  const action=control.dataset.action;if(!action.startsWith('sandbox-'))return;e.stopPropagation();
  if(action!=='sandbox-towers-apply')e.preventDefault();
  if(action==='sandbox-exit')ctx.onExit();
  else if(action==='sandbox-pause'){b().paused=!b().paused;session.accumulator=0;refresh();}
  else if(action==='sandbox-clear'){session.clear();refresh();}
  else if(action==='sandbox-reset'){session.reset();refresh();}
  else if(action==='sandbox-towers')towerPanel();
  else if(action==='sandbox-towers-off')for(const input of $('sandboxTowers').querySelectorAll('input'))input.checked=false;
  else if(action==='sandbox-towers-cancel')$('sandboxTowers').hidden=true;
 }
 function point(e){const r=$('viewport').getBoundingClientRect();return{x:(e.clientX-r.left)*540/r.width,y:(e.clientY-r.top)*V.layout.height/r.height};}
 function down(e){if(!session||e.button!==0||!$('sandboxTowers').hidden)return;e.preventDefault();e.stopPropagation();gesture={id:e.pointerId};$('battleCanvas').setPointerCapture(e.pointerId);}
 function up(e){if(!gesture||gesture.id!==e.pointerId)return;gesture=null;if($('battleCanvas').hasPointerCapture(e.pointerId))$('battleCanvas').releasePointerCapture(e.pointerId);e.preventDefault();e.stopPropagation();const p=point(e);if(!V.onBoard(p))return;if(!ready){ctx.toast('Wait for the selected card to load');return;}const world=V.toWorld(p),result=session.spawn({card,team,level,x:world.x,y:world.y});if(!result.ok)ctx.toast(result.reason);refresh();}
 function cancel(){gesture=null;}
 function mount(next){
  unmount();session=next;level=next.battle.sandboxLevel;card='knight';team=0;showTargets=false;ready=false;
  shell=document.createElement('div');shell.id='sandboxUI';shell.innerHTML=`<div class="sandbox-header"><div><h1>Sandbox</h1><small id="sandboxElapsed">0s · No time limit</small></div><label class="sandbox-map-label">Map<select id="sandboxMap" aria-label="Sandbox map">${root.RoyaleArenaSelection.choices.map(m=>`<option value="${m.id}" ${next.options.mapId===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select></label>${btn('Exit','sandbox-exit')}</div><div id="sandboxTowers" class="sandbox-towers" role="dialog" aria-modal="true" aria-label="Configure sandbox towers" hidden></div><section class="sandbox-controls" aria-label="Sandbox controls"><div class="sandbox-card-row"><label>Card <select id="sandboxCard" aria-label="Sandbox card">${['Troop','Building','Spell'].map(kind=>`<optgroup label="${kind}s">${C.CARDS.filter(c=>c.kind===kind).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}" ${c.id===card?'selected':''}>${esc(c.name)}</option>`).join('')}</optgroup>`).join('')}</select></label><label>Level <input id="sandboxLevel" aria-label="Sandbox level, 0 to 99" type="number" min="0" max="99" step="1" value="${level}"></label><div class="sandbox-team" aria-label="Spawn team"><button type="button" data-sandbox-team="0" aria-pressed="true">Blue</button><button type="button" data-sandbox-team="1" aria-pressed="false">Red</button></div></div><div class="sandbox-actions">${btn('Pause','sandbox-pause','blue','id="sandboxPause" aria-pressed="false"')}${btn('Clear','sandbox-clear')}${btn('Reset','sandbox-reset')}${btn('Towers','sandbox-towers')}</div><div class="sandbox-foot"><span id="sandboxStatus" role="status" aria-live="polite"></span><label><input id="sandboxTargets" type="checkbox"> Show targets</label></div></section>`;
  $('battle').append(shell);$('battle').classList.add('sandbox-view');ctx.hydrate(shell);
  shell.addEventListener('click',handle);for(const e of shell.querySelectorAll('[data-sandbox-team]'))e.addEventListener('click',()=>setTeam(Number(e.dataset.sandboxTeam)));
  $('sandboxMap').addEventListener('change',async e=>{const active=session,prev=active.options.mapId,wasPaused=b().paused;const selector=e.target;selector.disabled=true;ready=false;active.setMap(selector.value);b().paused=true;status('Loading map…');try{await ctx.prepareMap(active);if(session!==active)return;await prepare();}catch(error){if(session!==active)return;active.setMap(prev);selector.value=prev;ctx.toast(error.message||'Map could not load');try{await ctx.prepareMap(active);await prepare();}catch(_){status('Map unavailable. Choose another map.');}}finally{if(session===active){b().paused=wasPaused;selector.disabled=false;refresh();}}});
  $('sandboxCard').addEventListener('change',e=>{card=e.target.value;prepare();});$('sandboxLevel').addEventListener('change',e=>{level=root.RoyaleSandbox.validLevel(e.target.value);e.target.value=String(level);status();});$('sandboxTargets').addEventListener('change',e=>{showTargets=e.target.checked;});
  const canvas=$('battleCanvas');canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);prepare();return api;
 }
 function unmount(){revision++;ready=false;gesture=null;const canvas=$('battleCanvas');canvas?.removeEventListener('pointerdown',down);canvas?.removeEventListener('pointerup',up);canvas?.removeEventListener('pointercancel',cancel);shell?.remove();shell=null;session=null;$('battle')?.classList.remove('sandbox-view');}
 function drawTargets(c){
  if(!session)return;if(performance.now()-lastStatus>250){lastStatus=performance.now();refresh();}
  if(!showTargets)return;c.save();c.beginPath();c.rect(0,0,540,V.layout.handTop);c.clip();c.lineWidth=2;c.setLineDash([6,4]);
  const anchor=u=>V.toScreen({x:u.x,y:u.y-(root.RoyaleNative.entityElevation(u)||0)-(u.king!==undefined?40:u.building?28:12)});
  for(const u of b().active){const target=b().getEntity(u.targetId);if(!target||target.hp<=0)continue;const a=anchor(u),z=anchor(target);c.strokeStyle=u.team?'#ff697b':'#64ddff';c.fillStyle=c.strokeStyle;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(z.x,z.y);c.stroke();c.beginPath();c.arc(z.x,z.y,5,0,Math.PI*2);c.fill();}c.restore();
 }
 const api={mount,unmount,drawTargets,get ready(){return ready;},get session(){return session;},get card(){return card;},get team(){return team;}};return api;
}
root.RoyaleSandboxUI={create};})(globalThis);
