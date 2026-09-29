/* Presentation messages do not affect simulation timing or RNG. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleAnnouncements=api;})(globalThis,function(){'use strict';
class Announcer{
 constructor(){this.reset();}
 reset(){this.id=null;this.last=null;this.queue=[];this.active=null;this.seen=new Set();}
 enqueue(key,main,sub='',kind='',duration=1800){if(this.seen.has(key))return;this.seen.add(key);this.queue.push({key,main,sub,kind,duration});}
 update(b,now){if(this.id!==b.id){this.reset();this.id=b.id;}
  const section=b.section.index,sec=b.secondsLeft;
  if(!b.result&&b.tiebreaker){
   if(!this.seen.has('tiebreaker')){this.queue=[];this.active=null;this.enqueue('tiebreaker','Tiebreaker','Lowest tower health loses!','tiebreaker',Math.max(1000,(b.tiebreaker.duration||4)*1000));}
  }else if(!b.result){
   if(b.overtime&&!this.seen.has('sudden'))this.enqueue('sudden','Sudden Death','Get next Crown to WIN!','',2600);
   if(this.last&&this.last.section===section){for(const n of [60,30])if(this.last.sec>n&&sec<=n&&sec>n-4)this.enqueue(section+':'+n,n+' Seconds Left!','','time',1600);}
   if(b.multiplier>1&&b.multiplier!==this.last?.multiplier)this.enqueue('elixir:'+b.multiplier,b.multiplier===2?'Double Elixir!':b.multiplier===3?'Triple Elixir!':b.multiplier+'× Elixir!','','elixir',1600);
   if(sec<=10&&sec>=1&&this.last?.sec!==sec)this.enqueue(section+':count:'+sec,String(sec),'','countdown',850);
  }
  this.last={section,sec,multiplier:b.multiplier};
  if(this.active&&now>=this.active.until&&!(this.active.key==='tiebreaker'&&b.tiebreaker&&!b.result))this.active=null;
  if(!this.active&&this.queue.length){this.active=this.queue.shift();this.active.until=now+this.active.duration;}
  return this.active;
 }
}
return {Announcer};});
