/* Native UI/FX playback, separate from the simulation. Source fills are SC
   timelines, not resized CSS rectangles; UI text is original rendered artwork. */
(function(root){'use strict';
let hud=null,filters=null,metadata=null,ready=false;const stats={healthDraws:0,filterDraws:0,shadowDraws:0,deployDraws:0};
async function scene(data){const images=await Promise.all(data.textures.map(t=>new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Original HUD texture failed: '+t.file));im.src=new URL(t.file,document.baseURI).href;})));return new RoyaleNative.Scene({...data,rasterScale:2,qualityIndependent:true},images);}
async function load(data){metadata=data;await root.RoyaleText.load(data.text);[hud,filters]=await Promise.all([scene(data.hud),scene(data.filters)]);ready=true;return api;}
let homes={},homeLoading={};
function home(c,id,time=0){const source=id==='rascals'?'ui_arena_icon_season_10':'ui_arena';const name=({training:'arena_00',goblin:'arena_01',bone:'arena_02',barbarian:'arena_03',pekka:'arena_04',spell:'arena_05',builder:'arena_06',royal:'arena_07',frozen:'arena_08',jungle:'arena_09',hog:'arena_legendary',electro:'arena_electric',spooky:'arena_spooky',rascals:'arena_heist_season',serenity:'arena_lunar_season'})[id];
 if(!metadata?.homes?.[source]||!name)return false;if(!homes[source]){if(!homeLoading[source])homeLoading[source]=scene(metadata.homes[source]).then(s=>{homes[source]=s;}).catch(e=>{console.error(e);delete homeLoading[source];});return false;}
 const s=homes[source],r=s.bounds(name,0),scale=Math.min(c.canvas.width/r.width,c.canvas.height/r.height);c.clearRect(0,0,c.canvas.width,c.canvas.height);c.save();c.translate((c.canvas.width-r.width*scale)/2-r.x*scale,(c.canvas.height-r.height*scale)/2-r.y*scale);c.scale(scale,scale);s.draw(c,name,time);c.restore();return true;
}
const hidden={visible:false};
// The crown timeline encodes cosmetics, not card level. Ammo is not lifetime.
function healthInstances(u,fraction){return {bar:{progress:1-Math.max(0,Math.min(1,fraction))},prestige:hidden,buff:hidden,ammo:hidden,crown:{frame:0}};}
function timerBindings(seconds,multiplier,tiebreaker=false){const remaining=Math.max(0,Math.ceil(Number(seconds)||0));return{frame:0,instances:{elixirRegen:{visible:!tiebreaker&&multiplier>1,frame:15}},texts:{'timeLeft.txt':Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'),'TID_TIME_LEFT.TID_TIME_LEFT_vcenter':tiebreaker?'Tiebreaker':'Time left:','elixirRegen.elixir.txt':'x'+multiplier}};}
function timer(c,seconds,multiplier,time,tiebreaker=false){if(!ready)return false;c=root.RoyaleUI.prepareCanvas(c.canvas,120,152);c.clearRect(0,0,120,152);c.save();c.translate(109,6);hud.draw(c,'HUD_topRight',time,timerBindings(seconds,multiplier,tiebreaker));c.restore();return true;}
function health(c,u,time=0,showLevel=true){if(u.localKing){const a=RoyaleNative.towerArtPosition(u),x=a.x,y=a.y+17,hp=Math.max(0,Math.ceil(u.hp)),fraction=Math.max(0,Math.min(1,u.hp/Math.max(1,u.maxHp)));c.save();c.fillStyle='#442e11';c.fillRect(x-31,y-5,62,9);c.fillStyle='#efb837';c.fillRect(x-29,y-3,58*fraction,5);c.strokeStyle='#ffe9a0';c.lineWidth=1;c.strokeRect(x-31,y-5,62,9);RoyaleText.draw(c,String(hp),x,y-14,16,'#ffe16a','center','#392707');c.restore();return true;}if(!ready||u.hp<=0||u.effectCarrier||u.attachedTo||u.hidden||u.burrowing)return false;
 if(!showLevel&&!root.RoyaleLevelLabels?.damaged(u))return false;
 const r=u.def.source,config=metadata.healthBars.find(a=>a.Name===(r.HealthBar||'Medium'))||metadata.healthBars.find(a=>a.Name==='Medium');
 const enemy=u.team===1,tower=u.king!==undefined,full=u.hp>=u.maxHp-.001,shield=u.shield>0;
 if(enemy&&!tower&&!Number.isFinite(u.lastDamagedAt)&&full&&!(u.maxShield>0&&u.shield<u.maxShield-.001))return level(c,u,time);
 let name=tower?config[enemy?'EnemyExportName':'PlayerExportName']:config[full&&!shield?(enemy?'NoDamageEnemyExportName':'NoDamagePlayerExportName'):(enemy?'EnemyExportName':'PlayerExportName')];
 if(!tower){const size=/small/i.test(config.Name)?'small':config.Name==='High'?'high':'medium';name=shield?'hp_shield_'+(enemy?'enemy':'player')+'_'+size:name?.replace('hp_shield_','hp_');}
 if(!hud.clip(name))return false;
 const fraction=Math.max(0,Math.min(1,shield?u.shield/u.maxShield:u.hp/u.maxHp));
 const opts={frame:u.king?(u.active||!full?31:0):0,still:true,instances:healthInstances(u,fraction),texts:{level:u.king?'':String(u.level),'hpNumber.txt':String(Math.ceil(u.hp)),txt:String(Math.ceil(u.hp))}};
 // The source bar has discrete fill frames. Key its still geometry by that
 // actual frame, so fractional building decay does not create new plans.
 const clip=hud.clip(name),frame=Math.min(opts.frame,clip.frames.length-1),barAt=(clip.frameNames?.[frame]||clip.childrenNames||[]).indexOf('bar'),bar=barAt>=0?hud.clip(clip.frames[frame][barAt]?.[0]):null;
 if(u.king)opts.instances.level={visible:false};
 if(bar)opts.instances.bar={frame:Math.round((1-fraction)*(bar.frames.length-1))};
 const anchor=tower?RoyaleNative.towerArtPosition(u):u;let x=anchor.x,y;
 if(tower){y=anchor.y+(u.king?(enemy?-4:10):(enemy?-62:-48));}
 else{y=u.y-RoyaleNative.entityElevation(u)-RoyaleNative.library.headHeight(u.entity)-2;}
 c.save();c.translate(x,y);if(tower)c.scale(5/6,5/6);hud.drawStill(c,name,opts);if(tower&&!u.king)root.RoyaleText.draw(c,String(u.level),-33.5,enemy?-7:57,14,'#ffe35e','center','#34230b');c.restore();stats.healthDraws++;return true;
}
// Level-only native badges remain visible before the first hit, independently of HP bars.
function level(c,u,time=0,position=null){if(!ready||u.king===true||u.hp<=0||u.effectCarrier||u.attachedTo||u.hidden||u.burrowing)return false;
 const enemy=u.team===1,tower=u.king!==undefined,anchor=tower?RoyaleNative.towerArtPosition(u):u;
 const x=position?.x??anchor.x,y=position?.y??(tower?anchor.y+(u.king?(enemy?-12:0):(enemy?-68:-48)):u.y-RoyaleNative.entityElevation(u)-RoyaleNative.library.headHeight(u.entity)-2);
 c.save();c.translate(x,y);if(tower)c.scale(5/6,5/6);hud.drawStill(c,'hp_'+(u.shield>0?'shield_':'')+(enemy?'enemy':'player')+'_number',{frame:0,still:true,instances:{prestige:hidden,buff:hidden,ammo:hidden},texts:{level:String(u.level)}});c.restore();stats.healthDraws++;return true;
}
function groupLevel(c,group,alpha=1){if(!group.members.length)return false;let x=0,y=0;for(const u of group.members){const p=RoyaleNative.renderPosition(u,alpha);x+=p.x;y+=p.y-RoyaleNative.entityElevation(u)-RoyaleNative.library.headHeight(u.entity)-2;}return level(c,group.members[0],0,{x:x/group.members.length,y:y/group.members.length});}
const filterNodes=new WeakMap();
function deployment(c,u,time){if(!ready||u.wait<=0||u.effectCarrier||u.attachedTo)return false;const name='troopDeployTimer_'+(u.team?'enemy':'player');const duration=Math.max(.01,u.readyAt-u.born),progress=Math.max(0,Math.min(1,(time-u.born)/duration));
 c.save();c.translate(u.x,u.y-RoyaleNative.entityElevation(u)-20);c.scale(.62,.62);hud.draw(c,name,0,{frame:Math.floor(progress*298)});c.restore();stats.deployDraws++;return true;}
function shadow(c,u){if(!ready||u.building||u.attachedTo||u.hidden)return false;const name='lores_blob_shadow';if(!filters.clip(name))return false;const r=u.def.source;c.save();c.translate(u.x,u.y+2);c.scale((r.ShadowScaleX||75)/100*.48,(r.ShadowScaleY||60)/100*.28);c.globalAlpha*=.7;filters.draw(c,name,0);c.restore();stats.shadowDraws++;return true;}
function filtered(c,u,time,paint){if(!ready){paint(null);return;}
 const r=u.def.source,dx=Math.cos(u.heading||0),dy=Math.sin(u.heading||0);const direction=Math.abs(dx)>.7?(dx<0?'left':'right'):(dy<0?'up':'down');
 let name=null,t=0,loop=false;
 if(u.buffs?.Freeze||u.buffs?.ZapFreeze||u.buffs?.IceWizardSlow){name='filter_cold';t=.45;}
 else if(u.wait>0){name=r.DeployBaseAnimExportName||'filter_deploy_unit_default';t=Math.max(0,time-u.born);}
 else if(u.lastDamagedAt!==undefined&&time-u.lastDamagedAt<.22){const prefix=r.DamageExportName||'filter_damage';name=filters.clip(prefix+'_'+direction)?prefix+'_'+direction:prefix;t=time-u.lastDamagedAt;}
 else if(u.buffs?.Rage||u.buffs?.RageLumberjack){name='filter_rage';t=u.visualTime||time;loop=true;}
 if(!name||!filters.clip(name)){paint(null);return;}
 const clip=filters.clip(name);let ids=filterNodes.get(clip);if(!ids){ids=[...new Set(clip.frames.flat().map(x=>x[0]))];filterNodes.set(clip,ids);}const replaceNodes={};for(const id of ids)replaceNodes[id]=(ctx,color)=>paint(color);
 filters.draw(c,name,t,{replaceNodes,loop});stats.filterDraws++;
}
const api={load,home,health,level,groupLevel,healthInstances,timer,timerBindings,deployment,shadow,filtered,get ready(){return ready;},get hud(){return hud;},get filters(){return filters;},summary:()=>({ready,...stats,text:root.RoyaleText.summary()})};root.RoyalePresentation=api;
})(globalThis);
