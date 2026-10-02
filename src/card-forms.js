/* Optional card-form content. An empty registry changes neither roster nor decks. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog);if(n)module.exports=api;else root.RoyaleCardForms=api;})(globalThis,function(K){'use strict';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),safeId=s=>typeof s==='string'&&s.length<=180&&/^[A-Za-z0-9_.:-]+$/.test(s)&&!['__proto__','constructor','prototype'].includes(s);
function copy(value){return JSON.parse(JSON.stringify(value));}
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function canonical(v){return Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
function fingerprint(value){const s=JSON.stringify(canonical(value));let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return 'forms-'+(h>>>0).toString(16).padStart(8,'0');}
function createRegistry({forms=[],loadouts={},catalog=K}={}){
 if(!Array.isArray(forms)||forms.length>1024)throw TypeError('Invalid form registry');
 const rows=forms.map(raw=>{if(!raw||!safeId(raw.id)||!catalog.CARD_BY_ID[raw.baseCardId])throw TypeError('Invalid form ID or base card');if(!['evolution','hero','champion'].includes(raw.kind))throw TypeError('Invalid form kind');const cycles=raw.kind==='evolution'?Number(raw.cycles):0;if(!Number.isInteger(cycles)||cycles<0||cycles>100||raw.kind==='evolution'&&cycles<1)throw TypeError('Invalid evolution cycles');if(!raw.source||typeof raw.source!=='object'||Array.isArray(raw.source))throw TypeError('Invalid form source');const ability=raw.ability?copy(raw.ability):null;if(ability){for(const key of ['ManaCost','CastTime','TriggerDelay','Cooldown','MaxCharges'])if(ability[key]!==undefined&&(!Number.isFinite(ability[key])||ability[key]<0||key==='MaxCharges'&&!Number.isInteger(ability[key])))throw TypeError('Invalid ability '+key);}return freeze({...copy(raw),cycles,requiredShards:Math.max(0,Math.floor(Number(raw.requiredShards)||0)),ability});});
 const byId=Object.create(null),byCard=Object.create(null);for(const f of rows){if(own(byId,f.id))throw TypeError('Duplicate form ID');byId[f.id]=f;(byCard[f.baseCardId]||(byCard[f.baseCardId]=[])).push(f);}
 const slots=(Array.isArray(loadouts.slots)?loadouts.slots:[]).map(s=>{if(!['evolution','hero','wild'].includes(s?.kind)||!Number.isInteger(s.unlockArena)||s.unlockArena<0)throw TypeError('Invalid form slot');return freeze({kind:s.kind,unlockArena:s.unlockArena});});
 const policy=freeze({...copy(loadouts),slots}),get=id=>own(byId,id)?byId[id]:null,forCard=id=>byCard[id]||Object.freeze([]),champion=id=>forCard(id).find(f=>f.kind==='champion')||null;
 function selections(deck,raw){return deck.map((base,index)=>{const f=get(raw?.[index]);return f&&f.baseCardId===base?f.id:champion(base)?.id||null;});}
 function qualify(deck,raw=[],context={}){
  const selected=selections(deck,raw),errors=[],available=slots.map((s,index)=>({...s,index})).filter(s=>context.casual===true&&policy.casualSlots===true||Number(context.arena||0)>=s.unlockArena),assignments=[],used=new Set();
  for(let i=0;i<deck.length;i++){if(raw?.[i]&&!get(raw[i]))errors.push({index:i,reason:'Unknown form'});else if(raw?.[i]&&get(raw[i]).baseCardId!==deck[i])errors.push({index:i,reason:'Form belongs to another card'});const f=get(selected[i]);if(!f)continue;if(f.kind!=='champion'&&Array.isArray(context.unlockedForms)&&!context.unlockedForms.includes(f.id))errors.push({index:i,reason:'Form is locked'});}
  // Reserve dedicated slots first. A Hero or Champion can consume the Hero slot;
  // either family may consume a remaining Wild slot.
  const requests=selected.map((id,index)=>({form:get(id),index})).filter(x=>x.form);
  for(const q of requests){const kind=q.form.kind==='champion'?'hero':q.form.kind,s=available.find(s=>!used.has(s.index)&&s.kind===kind);if(s){used.add(s.index);assignments.push({index:q.index,slot:s.index,kind:s.kind,formId:q.form.id});}}
  for(const q of requests.filter(q=>!assignments.some(a=>a.index===q.index))){const s=available.find(s=>!used.has(s.index)&&s.kind==='wild');if(s){used.add(s.index);assignments.push({index:q.index,slot:s.index,kind:s.kind,formId:q.form.id});}else errors.push({index:q.index,reason:'No eligible form slot'});}
  assignments.sort((a,b)=>a.index-b.index);return{ok:errors.length===0,forms:selected,errors,slots:available,assignments};
 }
 function resolve(card,id){const form=get(id);if(!form||form.baseCardId!==card?.id)return card;const source={...card.source,...form.source},derived=catalog.cardDef({...card,source,cost:source.ManaCost??card.cost},card.level);return {...derived,id:card.id,baseCardId:card.id,formId:form.id,formKind:form.kind,form};}
 const signature=fingerprint({forms:rows,loadouts:policy});freeze(byCard);freeze(byId);return Object.freeze({forms:Object.freeze(rows),loadouts:policy,fingerprint:signature,get,forCard,champion,selections,qualify,resolve});
}
const defaultRegistry=createRegistry({forms:K.DATA.forms||[],loadouts:K.DATA.loadouts||{}});
function normalizeInventory(raw,registry=defaultRegistry){const unlocked=[...new Set((Array.isArray(raw?.unlockedForms)?raw.unlockedForms:[]).filter(id=>registry.get(id)&&registry.get(id).kind!=='champion'))],formShards=Object.fromEntries(registry.forms.filter(f=>f.requiredShards>0).map(f=>[f.id,Math.min(f.requiredShards,Math.max(0,Math.floor(Number(raw?.formShards?.[f.id])||0)))]));return{unlockedForms:unlocked,formShards,evoWildShards:Math.min(999999,Math.max(0,Math.floor(Number(raw?.evoWildShards)||0))),heroCoins:Math.min(200,Math.max(0,Math.floor(Number(raw?.heroCoins)||0)))};}
function normalizeDeckForms(raw,decks,modeDeckSets,registry=defaultRegistry){return{ranked:decks.map((d,i)=>registry.selections(d,raw?.ranked?.[i])),modes:Object.fromEntries(Object.entries(modeDeckSets||{}).map(([mode,set])=>[mode,set.decks.map((d,i)=>registry.selections(d,raw?.modes?.[mode]?.[i]))]))};}
return{createRegistry,defaultRegistry,normalizeInventory,normalizeDeckForms,fingerprint};
});
