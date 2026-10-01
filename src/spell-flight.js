/* Spell exhaust deposits source sprites at their birth positions on the arc.
   Visual sampling is deterministic and never mutates a projectile or battle RNG. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleSpellFlight=api;})(globalThis,function(){'use strict';
const SX=480/18,SY=20,TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function random(seed,i){let h=2166136261;for(const c of String(seed)+':'+i)h=Math.imul(h^c.charCodeAt(0),16777619);h=Math.imul(h^(h>>>16),2246822507);return((h^(h>>>13))>>>0)/4294967296;}
function positionAt(p,elapsed){const duration=(p.launchDistance||1)/Math.max(.01,p.speed||1),q=clamp(elapsed/duration,0,1),z=(p.launchHeight||0)*(1-q)+.5*(p.gravity||0)*duration*duration*q*(1-q);
 return{x:p.startX+(p.vx||0)*p.speed*SX*elapsed,y:p.startY+(p.vy||0)*p.speed*SY*elapsed-z};
}
function trailSamples(p,time){const rocket=/Rocket/.test(p.name),age=Math.max(0,time-p.born),step=rocket?.05:.035,life=rocket?1.4:.26,last=Math.floor((age-.025)/step),first=Math.max(0,last-Math.ceil(life/step)),out=[];
 for(let i=first;i<=last&&out.length<48;i++){const born=i*step,t=age-born;if(t<=.025||t>life)continue;const pos=positionAt(p,born),r=random(p.id,i),fade=clamp((life-t)/(life*.4),0,1);
  out.push({born,age:t,x:pos.x+(r-.5)*(rocket?9:4),y:pos.y,smoke:rocket,fire:!rocket||i%3===0,alpha:fade*(rocket?.83:.72),scale:rocket?.62+.20*r:.48+.12*r,rotation:r*TAU});
 }return out;
}
function trail(renderer,c,p,time){if(!/^(RocketSpell|FireballSpell)$/.test(p.name))return false;const rocket=/Rocket/.test(p.name),G=globalThis.RoyaleGraphics,mode=G?.current.particles||'good';if(mode==='low')return true;const samples=trailSamples(p,time),budget=G?Math.max(0,G.current.frameParticles-renderer.particlesUsed):96,stride=mode==='med'?2:1;let used=0;
 for(let i=0;i<samples.length&&used<budget;i+=stride){const s=samples[i];if(s.smoke){renderer.sprite(c,'sc/effects.sc','explosion_cloud_1',.12+s.age*.62,s.x,s.y,s.scale,s.scale,s.rotation,s.alpha,false);used++;}}
 // Fire sits above the smoke pass, as in the source emitter layer ordering.
 for(let i=0;i<samples.length&&used<budget;i+=stride){const s=samples[i];if(!s.fire)continue;if(rocket){c.save();c.globalCompositeOperation='lighter';}
  renderer.sprite(c,'sc/effects.sc',rocket?'fireball_trail3':'fireball_trail2',rocket?.2:.08+Math.min(.48,s.age),s.x,s.y,s.scale*(rocket?1.45:1),s.scale*(rocket?1.45:1),s.rotation,s.alpha*(rocket?.9:1),false);used++;if(rocket)c.restore();
  if(rocket&&s.age<.85&&used<budget){renderer.sprite(c,'sc/effects.sc','FireParticle1',.12+s.age*.45,s.x,s.y,s.scale*.45,s.scale*.45,s.rotation,s.alpha,false);used++;}
 }renderer.particlesUsed+=used;return true;
}
function impactSamples(name,age,radius,seed){if(!/^(Rocket_explosion|Fireball_explosion)$/.test(name)||age<0||age>=1.35)return[];radius=Math.max(24,Math.min(90,radius||50));const out=[],count=name==='Rocket_explosion'?14:12,spread=radius*(.3+.65*clamp(age/.30,0,1)),fade=clamp((1.35-age)/.65,0,1);
 for(let i=0;i<count;i++){const theta=(i+.25)*TAU/count,r=spread*(.3+.6*Math.sqrt(random(seed,i))),scale=(.42+.13*random(seed,i+32))*(radius/50);out.push({x:Math.cos(theta)*r,y:Math.sin(theta)*r*.72-age*8,scale,rotation:random(seed,i+64)*TAU,alpha:fade*.72,time:.09+age*.64});}
 return out;
}
function impact(renderer,c,name,x,y,age,phase,options){if(!/^(Rocket_explosion|Fireball_explosion)$/.test(name))return false;if(age<0||age>=1.35)return true;const radius=Math.max(24,Math.min(90,options.impactRadius||50)),fade=clamp((1.35-age)/.65,0,1);
 if(phase==='ground'||phase==='all'){c.save();c.translate(x,y);c.scale(1,.75);c.globalAlpha*=fade;
  if(age<.5){const r=radius*(.45+.75*clamp(age/.24,0,1)),g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba(255,224,102,.35)');g.addColorStop(.65,'rgba(255,113,26,.4)');g.addColorStop(1,'rgba(177,47,13,0)');c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,TAU);c.fill();}
  c.globalAlpha*=.28;c.fillStyle='#3d291a';c.beginPath();c.ellipse(0,0,radius*.8,radius*.65,0,0,TAU);c.fill();c.restore();
 }
 if(phase==='above'||phase==='all'){const G=globalThis.RoyaleGraphics,mode=G?.current.particles||'good',samples=impactSamples(name,age,radius,options.seed??name),stride=mode==='low'?4:mode==='med'?2:1;
  for(let i=0;i<samples.length;i+=stride){if(G&&renderer.particlesUsed>=G.current.frameParticles)break;const p=samples[i];renderer.sprite(c,'sc/effects.sc','explosion_cloud_1',p.time,x+p.x,y+p.y,p.scale,p.scale,p.rotation,p.alpha,false);renderer.particlesUsed++;
   if(age<.7&&i%2===0&&(!G||renderer.particlesUsed<G.current.frameParticles)){renderer.sprite(c,'sc/effects.sc','FireParticle'+(i%3+1),.08+age,x+p.x,y+p.y,p.scale*.83,p.scale*.83,p.rotation,fade*.8,false);renderer.particlesUsed++;}
  }
  if(age<.24){const f=1-age/.24;renderer.sprite(c,'sc/effects.sc','fireball_trail3',.13,x,y,radius/24,radius/24,0,f*.55,false);}
 }return true;
}
return{positionAt,trailSamples,trail,impactSamples,impact};});
