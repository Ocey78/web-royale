/* Source-driven multi-unit deployment formations shared by preview and live spawning. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog);if(n)module.exports=api;else root.RoyaleFormations=api;})(globalThis,function(K){'use strict';
const {SX,SY}=K,TAU=Math.PI*2;
const sec=v=>Math.max(0,Number(v)||0)/1000;
function point(x,y,entity,index,delay,group='primary'){return{x,y,entity,index,delay,group};}
function orient(team){return team===0?-1:1;}
function primaryLayout(card,x,y,team){const r=card.source||{},n=Math.max(1,r.SummonNumber||1),entity=r.SummonCharacter||card.entity,delay=sec(r.SummonDeployDelay),f=orient(team),radius=(r.SummonRadius||0)/1000,width=(r.SummonWidth||0)/1000,out=[];
 if(n===1)return[point(x,y,entity,0,0)];
 if(r.FullLaneDeploy||width){const w=width||14,center=r.FullLaneDeploy?9:x/SX;for(let i=0;i<n;i++)out.push(point((center-w/2+w*i/(n-1))*SX,y,entity,i,i*delay));return out;}
 if(card.id==='skeleton-army'&&n===15){out.push(point(x,y,entity,0,0));let ix=1;for(const [count,rad,phase] of [[6,.68,-Math.PI/2],[8,1.28,-Math.PI/2+Math.PI/8]])for(let j=0;j<count;j++,ix++){const a=phase+TAU*j/count;out.push(point(x+Math.cos(a)*rad*SX,y+Math.sin(a)*rad*SY,entity,ix,ix*delay));}return out;}
 if(n===2){const half=Math.max(.5,radius*.62);return[point(x-half*SX,y,entity,0,0),point(x+half*SX,y,entity,1,delay)];}
 if(n===3){const rad=radius||.7,frontY=y+f*rad*SY,backY=y-f*rad*.5*SY,side=Math.sqrt(3)/2*rad*SX;return[point(x,frontY,entity,0,0),point(x-side,backY,entity,1,delay),point(x+side,backY,entity,2,2*delay)];}
 if(n===4){const rad=radius||.75;return[point(x-rad*.7*SX,y+f*rad*.55*SY,entity,0,0),point(x+rad*.7*SX,y+f*rad*.55*SY,entity,1,delay),point(x-rad*.7*SX,y-f*rad*.55*SY,entity,2,2*delay),point(x+rad*.7*SX,y-f*rad*.55*SY,entity,3,3*delay)];}
 const rad=radius||Math.min(1.1,.52+.09*n),start=f<0?-Math.PI/2:Math.PI/2;for(let i=0;i<n;i++){const a=start+TAU*i/n;out.push(point(x+Math.cos(a)*rad*SX,y+Math.sin(a)*rad*SY,entity,i,i*delay));}return out;
}
function cardMembers(card,x,y,team=0){if(!card?.entity)return[];const r=card.source||{},f=orient(team),finish=members=>members.map(m=>{const d=K.entityDef(m.entity,card.level||9);if(!d.air&&!d.hover){if(team===0&&y>=17*SY)m.y=Math.max(m.y,17*SY);else if(team===1&&y<=15*SY)m.y=Math.min(m.y,15*SY);}return m;});
 if(Array.isArray(r.SummonCharactersList)&&r.SummonCharactersList.length){return finish(r.SummonCharactersList.map((entity,i)=>point(x+(Number(r.SummonCharactersOffsetsX?.[i])||0)/1000*SX,y+f*(Number(r.SummonCharactersOffsetsY?.[i])||0)/1000*SY,entity,i,sec(r.SummonCharactersDelayList?.[i]??i*(r.SummonDeployDelay||0)))));}
 if(card.id==='goblin-gang'&&r.SummonCharacterSecond){const d=sec(r.SummonDeployDelay)||.1,sd=sec(r.SummonDeployDelaySecond||r.SummonDeployDelay)||d;return finish([
   point(x-.78*SX,y+f*.36*SY,r.SummonCharacter,0,0),point(x,y+f*.82*SY,r.SummonCharacter,1,d),point(x+.78*SX,y+f*.36*SY,r.SummonCharacter,2,2*d),
   point(x-.55*SX,y-f*.72*SY,r.SummonCharacterSecond,3,3*d,'secondary'),point(x+.55*SX,y-f*.72*SY,r.SummonCharacterSecond,4,3*d+sd,'secondary')]);}
 if(card.id==='rascals'&&r.SummonCharacterSecond){const sd=sec(r.SummonDeployDelaySecond||100);return finish([point(x,y+f*.95*SY,r.SummonCharacter,0,0),point(x-.88*SX,y-f*.78*SY,r.SummonCharacterSecond,1,sd,'secondary'),point(x+.88*SX,y-f*.78*SY,r.SummonCharacterSecond,2,2*sd,'secondary')]);}
 const out=primaryLayout(card,x,y,team);if(r.SummonCharacterSecond){const n=Math.max(1,r.SummonCharacterSecondCount||1),delay=sec(r.SummonDeployDelaySecond||r.SummonDeployDelay),start=out.length*sec(r.SummonDeployDelay||0);for(let i=0;i<n;i++){const xx=x+(i-(n-1)/2)*.9*SX,yy=y-f*.8*SY;out.push(point(xx,yy,r.SummonCharacterSecond,out.length,start+i*delay,'secondary'));}}return finish(out);
}
return{cardMembers};
});
