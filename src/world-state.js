/* Bounded save shape for the lazy offline world. No population-sized arrays. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./game-data.js'):root.RoyaleGameData);if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleWorldState=api;})(globalThis,function(DATA){'use strict';
const PLAYER_COUNT=4000000,CLAN_COUNT=50000,MAX_TROPHIES=Number(DATA?.modernProgression?.maxTrophies)||8000;
const integer=(n,d=0,max=Number.MAX_SAFE_INTEGER)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):d;
const playerId=n=>'p'+String(n).padStart(7,'0');
const validPlayer=id=>typeof id==='string'&&/^p\d{7}$/.test(id)&&Number(id.slice(1))<PLAYER_COUNT;
const validClan=id=>typeof id==='string'&&(/^(?:c\d{5}|new-[0-9a-z-]{1,50})$/.test(id))&&(id[0]!=='c'||Number(id.slice(1))<CLAN_COUNT);
function plain(value,depth=0){
 if(depth>13)return null;
 if(typeof value==='string')return value.slice(0,400);
 if(typeof value==='boolean'||value===null)return value;
 if(typeof value==='number')return Number.isFinite(value)?value:0;
 if(Array.isArray(value))return value.slice(0,256).map(x=>plain(x,depth+1));
 if(value&&typeof value==='object'){const out={};for(const [key,x] of Object.entries(value).slice(0,150)){if(key.length>120||['__proto__','prototype','constructor'].includes(key))continue;out[key]=plain(x,depth+1);}return out;}
 return null;
}
const list=v=>Array.isArray(v)?v:[],record=v=>v&&typeof v==='object'&&!Array.isArray(v),actor=id=>id==='self'||validPlayer(id),card=id=>typeof id==='string'&&/^[a-z][a-z0-9-]{0,60}$/.test(id);
function cleanClan(value,id){
 const c=plain(value);c.id=id;c.memberIds=[...new Set(list(c.memberIds).filter(validPlayer))].slice(0,49);c.departed=[...new Set(list(c.departed).filter(validPlayer))].slice(-100);
 c.messages=list(c.messages).filter(m=>record(m)&&typeof m.text==='string'&&actor(m.actor)&&Number.isFinite(m.time)).slice(-100);
 c.requests=list(c.requests).filter(q=>record(q)&&card(q.card)&&actor(q.owner)&&typeof q.id==='string'&&Number.isFinite(q.expiresAt)&&q.total>0).slice(-35).map(q=>({...q,total:integer(q.total,1,40),filled:integer(q.filled,0,40),donors:record(q.donors)?q.donors:{}}));
 c.trades=list(c.trades).filter(t=>record(t)&&card(t.want)&&actor(t.owner)&&typeof t.id==='string'&&['Common','Rare','Epic','Legendary'].includes(t.rarity)&&list(t.give).length&&list(t.give).every(card)&&Number.isFinite(t.expiresAt)&&t.count>0).slice(-35).map(t=>({...t,give:list(t.give).slice(0,4),count:({Common:250,Rare:50,Epic:10,Legendary:1})[t.rarity]}));
 c.roles=record(c.roles)?Object.fromEntries(Object.entries(c.roles).filter(([id,role])=>actor(id)&&['Leader','Co-leader','Elder','Member'].includes(role))):{};
 return c;
}
function normalize(raw){const r=raw&&typeof raw==='object'?raw:{},clans={};for(const [id,value] of Object.entries(r.clans||{}).slice(-12)){if(validClan(id)&&value&&typeof value==='object')clans[id]=cleanClan(value,id);}
 const players={};for(const [id,d] of Object.entries(record(r.players)?r.players:{}).slice(-4000)){if(validPlayer(id)&&record(d))players[id]={trophies:Number.isFinite(d.trophies)?Math.max(-MAX_TROPHIES,Math.min(MAX_TROPHIES,Math.floor(d.trophies))):0,wins:integer(d.wins,0,1000000),matches:integer(d.matches,0,1000000),donations:integer(d.donations,0,1000000)};}
 return {version:1,players,lastOpponentResult:typeof r.lastOpponentResult==='string'?r.lastOpponentResult.slice(0,120):'',seed:integer(r.seed,77137,0xffffffff)||77137,epoch:integer(r.epoch),clock:integer(r.clock),serial:integer(r.serial),
 friends:[...new Set((Array.isArray(r.friends)?r.friends:[]).filter(validPlayer))].slice(0,200),
 encountered:[...new Set((Array.isArray(r.encountered)?r.encountered:[]).filter(validPlayer))].slice(-200),
 currentClan:validClan(r.currentClan)?r.currentClan:null,clans,
 requestAt:integer(r.requestAt),lastEpicSunday:Number.isFinite(r.lastEpicSunday)&&r.lastEpicSunday>=0?integer(r.lastEpicSunday):-1,donationDay:integer(r.donationDay),dailyDonated:integer(r.dailyDonated,0,360),
 war:r.war&&typeof r.war==='object'?plain(r.war):null,retiredLegacyClan:r.retiredLegacyClan===true};
}
return{PLAYER_COUNT,CLAN_COUNT,MAX_TROPHIES,integer,playerId,validPlayer,validClan,normalize,plain};});
