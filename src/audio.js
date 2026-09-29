/* A small optional player for original cues from the user-supplied APK.
   Fetch on demand, unlock only after a gesture, and never block a game action. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleAudio=api;})(globalThis,()=>{'use strict';
class SoundBank{
 constructor(urls,{makeContext,fetch:fetcher}={}){this.urls=urls||{};this.makeContext=makeContext||(()=>new(globalThis.AudioContext||globalThis.webkitAudioContext)());this.fetch=fetcher||globalThis.fetch?.bind(globalThis);this.enabled=false;this.context=null;this.buffers=new Map();this.pending=new Map();this.voices=new Set();this.lastPlay=new Map();}
 setEnabled(enabled){this.enabled=!!enabled;if(!this.enabled)for(const voice of [...this.voices]){try{voice.stop();}catch(_){}this.voices.delete(voice);}}
 async play(key,volume=.5){if(!this.enabled||!this.urls[key]||!this.fetch)return false;try{
  this.context||=this.makeContext();const c=this.context;await c.resume();const now=Date.now();if(now-(this.lastPlay.get(key)||0)<65)return false;this.lastPlay.set(key,now);
  if(!this.buffers.has(key)){if(!this.pending.has(key))this.pending.set(key,(async()=>{const r=await this.fetch(this.urls[key]);if(!r.ok)throw Error('Audio unavailable');const b=await c.decodeAudioData(await r.arrayBuffer());this.buffers.set(key,b);return b;})().finally(()=>this.pending.delete(key)));await this.pending.get(key);}
  if(!this.enabled)return false;if(this.voices.size>=8){const old=this.voices.values().next().value;try{old.stop();}catch(_){}this.voices.delete(old);}
  const voice=c.createBufferSource(),gain=c.createGain();gain.gain.value=Math.min(1,Math.max(0,Number(volume)||0))*.55;voice.buffer=this.buffers.get(key);voice.connect(gain);gain.connect(c.destination);this.voices.add(voice);voice.onended=()=>{this.voices.delete(voice);try{voice.disconnect();gain.disconnect();}catch(_){}};voice.start();return true;
 }catch(_){this.pending.delete(key);return false;}}
}
return {SoundBank};});
