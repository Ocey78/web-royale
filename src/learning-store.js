/* Browser-local shared learning archive. IndexedDB transactions merge per-match
   weight deltas so concurrent tabs do not simply replace one another's model.
   Nothing is uploaded. Raw history is bounded; lifetime aggregates are retained. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./learning.js'):root.RoyaleLearning);if(n)module.exports=api;else root.RoyaleLearningStore=api;})(globalThis,function(L){'use strict';
const KEY='web-royale-learning-v1',DB='web-royale-learning-v1';
const copy=x=>JSON.parse(JSON.stringify(x));
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Storage request failed'));});}
function done(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('Storage transaction aborted'));tx.onerror=()=>reject(tx.error||Error('Storage transaction failed'));});}
class LearningStore{
 constructor({indexedDB,storage,key=KEY,database=DB,maxRecords=40,maxBytes=24*1024*1024}={}){this.idb=indexedDB;this.storage=storage;this.key=key;this.database=database;this.maxRecords=Math.max(1,Math.min(100,maxRecords));this.maxBytes=maxBytes;this.db=null;this.model=L.normalizeModel();this.records=[];this.persistent=false;this.mode='Session only';this.error=null;this._queue=Promise.resolve();}
 async open(){try{if(!this.idb)throw Error('IndexedDB unavailable');const req=this.idb.open(this.database,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('model'))db.createObjectStore('model');if(!db.objectStoreNames.contains('matches'))db.createObjectStore('matches',{keyPath:'id'});};
   this.db=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Learning database is blocked by another tab'));});this.db.onversionchange=()=>{this.db.close();this.db=null;this.persistent=false;this.mode='Session only';this.error='Learning storage changed in another tab. Reload to reconnect.';};
   const tx=this.db.transaction('model','readonly');this.model=L.normalizeModel(await request(tx.objectStore('model').get('shared')));this.persistent=true;this.mode='IndexedDB';
  }catch(e){this.error=String(e?.message||e);this.db=null;try{const raw=this.storage?.getItem(this.key);if(raw){const data=JSON.parse(raw);this.model=L.normalizeModel(data.model);this.records=Array.isArray(data.records)?data.records.slice(-this.maxRecords):[];}if(this.storage){this.storage.setItem(this.key,JSON.stringify({model:this.model,records:this.records}));this.persistent=true;this.mode='Local storage';this.error=null;}}catch(err){this.error=String(err.message||err);this.persistent=false;this.mode='Session only';}}
  return this;
 }
 async refresh(){await this._queue;if(this.db){const tx=this.db.transaction('model','readonly');this.model=L.normalizeModel(await request(tx.objectStore('model').get('shared')));}return copy(this.model);}
 commit(packet){const task=this._queue.then(()=>this._commit(packet));this._queue=task.catch(()=>{});return task;}
 async _commit(packet){const r=packet?.record;if(!r||r.schema!==undefined&&r.schema!==1||!['completed','abandoned',undefined].includes(r.status))throw Error('Invalid match recording');
  if(this.db){try{const tx=this.db.transaction(['model','matches'],'readwrite'),finished=done(tx),models=tx.objectStore('model'),matches=tx.objectStore('matches'),req=models.get('shared');let merged;
    req.onsuccess=()=>{try{const latest=L.normalizeModel(req.result);merged=L.mergePacket(latest,packet);models.put(merged,'shared');if(!latest.seen.includes(r.id))matches.put({id:r.id,savedAt:Date.now(),bytes:JSON.stringify(r).length,record:copy(r)});const all=matches.getAll();all.onsuccess=()=>{const rows=all.result.sort((a,b)=>b.savedAt-a.savedAt);let bytes=0;for(let i=0;i<rows.length;i++){bytes+=rows[i].bytes||0;if(i>=this.maxRecords||bytes>this.maxBytes)matches.delete(rows[i].id);}};}catch(e){this.error=String(e.message||e);tx.abort();}};
    await finished;this.model=merged;this.persistent=true;this.mode='IndexedDB';this.error=null;return {ok:true,model:copy(merged),persistent:true};
   }catch(e){this.error=String(e.message||e);this.db.close();this.db=null;this.persistent=false;this.mode='Session only';}}
  const existing=this.model.seen.includes(r.id);this.model=L.mergePacket(this.model,packet);if(!existing)this.records.push(copy(r));this.records=this.records.slice(-this.maxRecords);let limit=Math.min(this.maxBytes,2500000);while(this.records.length>1&&JSON.stringify(this.records).length>limit)this.records.shift();
  try{if(!this.storage)throw Error(this.error||'Learning is session-only: browser storage is unavailable');this.storage.setItem(this.key,JSON.stringify({model:this.model,records:this.records}));this.persistent=true;this.mode='Local storage';this.error=null;}catch(e){this.persistent=false;this.mode='Session only';this.error=String(e.message||e);}
  return {ok:true,model:copy(this.model),persistent:this.persistent,error:this.error};
 }
 async export(){await this._queue;await this.refresh();let records=this.records;if(this.db){const tx=this.db.transaction('matches','readonly');records=(await request(tx.objectStore('matches').getAll())).sort((a,b)=>a.savedAt-b.savedAt).map(r=>r.record);}return {schema:1,snapshot:this.model.snapshot,engine:L.ENGINE,exportedAt:new Date().toISOString(),scope:'browser-local; no remote uploads',retention:{maxRecords:this.maxRecords,maxBytes:this.maxBytes},features:L.FEATURE_NAMES,model:copy(this.model),records:copy(records)};}
 async import(data){await this._queue;const m=data?.model;if(data?.schema!==1||data.snapshot!==this.model.snapshot||m?.schema!==1||m.snapshot!==this.model.snapshot||!Array.isArray(m.weights)||m.weights.length!==L.DIM||!m.weights.every(w=>Number.isFinite(w)&&Math.abs(w)<=L.WEIGHT_LIMIT)||!Array.isArray(data.records)||data.records.length>100)throw Error('Incompatible or invalid learning export');
  if(JSON.stringify(data).length>40*1024*1024)throw Error('Learning export is too large');for(const r of data.records)if(!r||typeof r.id!=='string'||r.id.length>140||r.snapshot!==this.model.snapshot)throw Error('Invalid match in learning export');
  const model=L.normalizeModel(m),records=data.records.slice(-this.maxRecords).map(copy);
  if(this.db){const tx=this.db.transaction(['model','matches'],'readwrite'),finished=done(tx);tx.objectStore('model').put(model,'shared');tx.objectStore('matches').clear();for(const [i,r]of records.entries())tx.objectStore('matches').put({id:r.id,savedAt:Date.now()+i,bytes:JSON.stringify(r).length,record:r});await finished;}
  else if(this.storage)this.storage.setItem(this.key,JSON.stringify({model,records}));this.model=model;this.records=records;return this;
 }
 async reset(){await this._queue;if(this.db){const tx=this.db.transaction(['model','matches'],'readwrite'),finished=done(tx);tx.objectStore('model').clear();tx.objectStore('matches').clear();await finished;}try{this.storage?.removeItem(this.key);}catch(e){this.error=String(e.message||e);}this.model=L.normalizeModel();this.records=[];}
}
return {LearningStore,KEY,DB};});
