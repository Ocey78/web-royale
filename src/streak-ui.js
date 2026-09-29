(function(root){'use strict';
const $=id=>document.getElementById(id);
function element(id,parent,cls){let el=$(id);if(!el){el=document.createElement('div');el.id=id;el.className=cls;el.setAttribute('role','status');$(parent).appendChild(el);}return el;}
function home(p){const el=element('homeWinStreak','home','win-streak-badge'),n=p.winStreak||0,parent=document.querySelector('.home-trophies');
 if(parent&&el.parentNode!==parent)parent.appendChild(el);el.hidden=n<3;el.textContent=n>=3?`${n} win streak`:'';
 el.title=`Bonus trophies vary on each ranked win. A ranked loss or draw resets the streak. Best streak: ${p.bestWinStreak||0}.`;
}
function result(p,b){const el=element('endTrophyReward','matchResultBoard','end-trophy-reward'),r=p.history?.find(r=>r.replayId===b.id),ranked=b.queueType?b.queueType==='trophy-road':!b.is2v2;
 el.hidden=!r||!ranked||b.isReplay||b.practice||r.practice||b.isSandbox;if(el.hidden)return;
 const delta=r.trophyChange||0;el.replaceChildren();const img=document.createElement('img');img.src=root.RoyaleBundle.uiImages.trophy;img.alt='Trophies';const value=document.createElement('span');value.textContent=`${delta>=0?'+':''}${delta}`;el.append(img,value);el.title=r.streakBonus?`Includes +${r.streakBonus} bonus trophies`:String(delta)+' trophies';
}
root.RoyaleStreakUI={home,result};
})(globalThis);
