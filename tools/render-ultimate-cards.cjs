'use strict';
// Extend the bundled game-card illustration system with deterministic Canvas
// compositions. Keep portraits, effects, and normal UI card frames source-based.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),content=require('../src/ultimate-clash.js');
const {chromium}=require('playwright');
const plans={
 'mega-minion-horde':{color:'#333c88',actors:['mega-minion','mega-minion','mega-minion','mega-minion','mega-minion','mega-minion'],layout:'horde'},
 'lightning-storm':{color:'#424653',actors:[],fx:'storm',layout:'cloud'},
 'heal-spell':{color:'#1b9e6b',actors:['heal-spirit'],fx:'heal'},
 'balloon-parade':{color:'#ad5825',actors:Array(6).fill('balloon'),layout:'horde'},
 'executioner-cage':{color:'#52626c',actors:['executioner','executioner','executioner','executioner-cage-portrait'],layout:'cage'},
 builder:{color:'#b98132',actors:['builder-portrait'],fx:'build'},
 'magic-trio':{color:'#3d4493',actors:['ice-wizard','electro-wizard','wizard'],layout:'trio'},
 frostbite:{color:'#247faa',actors:['ice-spirit','ice-spirit','freeze','ice-spirit','ice-spirit'],layout:'frost',fx:'snow'},
 harvest:{color:'#7b1b8a',actors:[],fx:'harvest',layout:'harvest'},
 'overcharged-tesla':{color:'#504291',actors:['tesla-evolution'],fx:'storm'},
 'three-pekkas':{color:'#3a235d',actors:['pekka','pekka','pekka'],layout:'trio'},
 'meteor-shower':{color:'#933b24',actors:Array(8).fill('fireball'),layout:'rain',fx:'fire'},
 'code-red':{color:'#991d30',actors:Array(9).fill('rocket'),layout:'rockets',fx:'fire'},
 'royale-escort':{color:'#776242',actors:['cannon-cart','cannon-cart','royal-giant','knight','prince','knight'],layout:'escort'},
 'kings-dropoff':{color:'#5e5a91',actors:['royal-delivery','royal-delivery','royal-delivery','royal-delivery','cannon-cart'],layout:'cross'},
 'elite-barbarians':{color:'#aa7827',actors:Array(5).fill('elite-barbarians'),layout:'barbarians'},
 'elixir-witch':{color:'#913b87',actors:['elixir-golem','elixir-golem','mother-witch'],layout:'witch',fx:'harvest'},
 'unstable-egg':{color:'#8d5d38',actors:['unstable-egg-portrait','baby-dragon'],layout:'egg',fx:'egg'},
 fisherman:{color:'#245674',actors:['fisherman'],fx:'hook'},
 'bomb-squad':{color:'#444c73',actors:['bomber','bomber','guards'],layout:'squad'}
};
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json'),'utf8')),ui=JSON.parse(fs.readFileSync(path.join(root,'assets/ui/manifest.json'),'utf8'));
 const paths=Object.fromEntries(manifest.cards.map(c=>[c.id,c.file]));
 paths['tesla-evolution']=ui['modern-form-Tesla_EV1']?.file||paths.tesla;
 paths['builder-portrait']='assets/ultimate-clash/builder-portrait.png';
 paths['executioner-cage-portrait']='assets/ultimate-clash/executioner-cage-portrait.png';paths['unstable-egg-portrait']='assets/ultimate-clash/unstable-egg-portrait.png';
 if(!fs.existsSync(path.join(root,paths['builder-portrait'])))throw Error('Render the source Builder portrait before rendering custom cards.');
 const images=Object.fromEntries([...new Set(Object.values(plans).flatMap(p=>p.actors))].map(id=>[id,'data:image/png;base64,'+fs.readFileSync(path.join(root,paths[id])).toString('base64')]));
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 try{
  const page=await browser.newPage();await page.setContent('<!doctype html><html><body></body></html>');
  const result=await page.evaluate(async({plans,images})=>{
   const loaded={};await Promise.all(Object.entries(images).map(([id,url])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{loaded[id]=im;resolve();};im.onerror=reject;im.src=url;})));
   const outputs={};for(const [slug,p]of Object.entries(plans)){
    const cv=document.createElement('canvas');cv.width=474;cv.height=602;const c=cv.getContext('2d'),w=cv.width,h=cv.height;
    const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,p.color);bg.addColorStop(.55,p.color);bg.addColorStop(1,'#161324');c.fillStyle=bg;c.fillRect(0,0,w,h);
    const light=c.createRadialGradient(w*.52,h*.3,5,w*.52,h*.3,w*.8);light.addColorStop(0,'#ffffff88');light.addColorStop(.4,'#ffffff10');light.addColorStop(1,'#00000000');c.fillStyle=light;c.fillRect(0,0,w,h);
    function actor(id,x,y,size,angle=0,opacity=1){const im=loaded[id],tile=document.createElement('canvas');tile.width=300;tile.height=360;const t=tile.getContext('2d'),scale=Math.max(300/im.width,360/im.height);t.drawImage(im,(300-im.width*scale)/2,(360-im.height*scale)/2,im.width*scale,im.height*scale);t.globalCompositeOperation='destination-in';const mask=t.createRadialGradient(150,155,80,150,175,210);mask.addColorStop(0,'#fff');mask.addColorStop(.72,'#fff');mask.addColorStop(1,'#fff0');t.fillStyle=mask;t.fillRect(0,0,300,360);c.save();c.globalAlpha=opacity;c.translate(x*w,y*h);c.rotate(angle);c.filter=p.hue?'hue-rotate('+p.hue+'deg)':'none';c.drawImage(tile,-size*w/2,-size*w*.6,size*w,size*w*1.2);c.restore();}
    const a=p.actors;
    if(p.layout==='horde'){[[.25,.2,.48,-.1],[.75,.2,.48,.1],[.25,.47,.5,-.06],[.75,.47,.5,.06],[.25,.76,.52,-.06],[.75,.76,.52,.06]].forEach((v,i)=>actor(a[i],...v));}
    else if(p.layout==='trio'){actor(a[0],.24,.3,.67,-.08);actor(a[2],.77,.3,.67,.08);actor(a[1],.51,.72,.78);}
    else if(p.layout==='cage'){actor(a[0],.2,.27,.54,-.2);actor(a[1],.8,.27,.54,.2);actor(a[2],.5,.22,.5);actor(a[3],.5,.64,1.15);}
    else if(p.layout==='frost'){actor(a[0],.15,.23,.39);actor(a[1],.85,.24,.39);actor(a[2],.5,.53,.95);actor(a[3],.15,.73,.43);actor(a[4],.88,.71,.44);}
    else if(p.layout==='rain'||p.layout==='rockets'){const count=a.length;for(let i=0;i<count;i++){const j=i%3,row=Math.floor(i/3);actor(a[i],.16+j*.34,.18+row*.25,.38+row*.07,p.layout==='rockets'?(j-1)*.15:-.3);}}
    else if(p.layout==='escort'){actor(a[0],.2,.24,.43);actor(a[1],.8,.24,.43);actor(a[2],.5,.4,.85);actor(a[3],.12,.71,.56,-.13);actor(a[4],.5,.77,.65);actor(a[5],.89,.71,.56,.13);}
    else if(p.layout==='cross'){[[.5,.17,.46],[.16,.48,.46],[.85,.48,.46],[.5,.81,.46],[.5,.5,.64]].forEach((v,i)=>actor(a[i],...v));}
    else if(p.layout==='barbarians'){[[.24,.28,.58,-.15],[.77,.27,.58,.15],[.13,.63,.61,-.1],[.87,.63,.61,.1],[.5,.62,.79,0]].forEach((v,i)=>actor(a[i],...v));}
    else if(p.layout==='witch'){actor(a[0],.16,.7,.52,-.15);actor(a[1],.85,.7,.52,.15);actor(a[2],.5,.45,.98);}
    else if(p.layout==='squad'){actor(a[0],.2,.29,.67,-.13,.58);actor(a[1],.8,.29,.67,.13,.58);actor(a[2],.5,.65,.93);}
    else if(p.layout==='egg'){actor(a[1],.53,.27,.76,0,.65);actor(a[0],.5,.62,.94);}
    else if(p.layout==='cloud'){for(let i=0;i<11;i++){const x=(.1+(i%4)*.27)*w,y=(.24+Math.floor(i/4)*.18)*h,r=w*(.2+(i%3)*.025),g=c.createRadialGradient(x-r*.3,y-r*.4,r*.05,x,y,r);g.addColorStop(0,'#c6cbd5');g.addColorStop(.45,'#687083');g.addColorStop(1,'#252e4300');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}}else if(p.layout==='harvest'){for(let j=0;j<5;j++){c.strokeStyle=j%2?'#ff70d5':'#ad247e';c.lineWidth=10-j;c.beginPath();c.ellipse(w*.5,h*.65,w*(.47-j*.07),h*(.13-j*.014),0,0,Math.PI*2);c.stroke();}for(let i=0;i<6;i++){const x=w*(.15+i*.14),y=h*(.48+(i%2)*.16),g=c.createLinearGradient(x,y,x,h*.12);g.addColorStop(0,'#ff8ada');g.addColorStop(1,'#ffa3ec00');c.fillStyle=g;c.fillRect(x-5,h*.1,10,y-h*.1);}}else actor(a[0],.5,.5,1.08);
    c.globalCompositeOperation='screen';
    if(['storm','snow','heal','harvest','fire','hook','egg','build'].includes(p.fx)){
     const colors={storm:'#b7bfff',snow:'#d5fcff',heal:'#d0ff83',harvest:'#ff8ae7',fire:'#ffb24f',hook:'#86eaff',egg:'#ffe084',build:'#ffe8a3'},col=colors[p.fx];
     for(let i=0;i<25;i++){const x=(Math.sin(i*19.91+slug.length)*.5+.5)*w,y=(Math.cos(i*37.32)*.5+.5)*h,r=2+(i%4);c.fillStyle=col;c.globalAlpha=.22+(i%3)*.15;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
     c.globalAlpha=.8;c.strokeStyle=col;c.lineWidth=5;c.shadowBlur=15;c.shadowColor=col;
     if(p.fx==='storm'){for(let i=0;i<3;i++){const x=w*(.18+i*.32);c.beginPath();c.moveTo(x,-10);c.lineTo(x-20,h*.13);c.lineTo(x+18,h*.1);c.lineTo(x-16,h*.39);c.lineTo(x+10,h*.36);c.lineTo(x-35,h*.68);c.stroke();}}
     if(['heal','harvest'].includes(p.fx)){c.beginPath();c.ellipse(w*.5,h*.78,w*.44,h*.085,0,0,Math.PI*2);c.stroke();if(p.fx==='heal'){c.lineWidth=14;c.beginPath();c.moveTo(w*.5,h*.16);c.lineTo(w*.5,h*.29);c.moveTo(w*.42,h*.225);c.lineTo(w*.58,h*.225);c.stroke();}}
     if(p.fx==='snow'){for(let i=0;i<5;i++){const x=w*(.13+i*.18),y=h*(.12+(i%2)*.72);c.lineWidth=2;for(let a=0;a<3;a++){const r=a*Math.PI/3;c.beginPath();c.moveTo(x-Math.cos(r)*12,y-Math.sin(r)*12);c.lineTo(x+Math.cos(r)*12,y+Math.sin(r)*12);c.stroke();}}}
    }
    c.globalCompositeOperation='source-over';c.shadowBlur=0;c.globalAlpha=1;const vignette=c.createLinearGradient(0,h*.65,0,h);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#08091c8c');c.fillStyle=vignette;c.fillRect(0,0,w,h);
    outputs[slug]=cv.toDataURL('image/png').split(',')[1];
   }return outputs;
  },{plans,images});
  const dir=path.join(root,'assets/ultimate-clash/cards');fs.mkdirSync(dir,{recursive:true});const entries=[];
  for(const config of content.CARDS){const bytes=Buffer.from(result[config.slug],'base64'),file='assets/ultimate-clash/cards/'+config.id+'.png';fs.writeFileSync(path.join(root,file),bytes);entries.push({id:config.id,name:config.name,file,width:474,height:602,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),description:config.artDescription,source:'Web Royale custom Canvas composition',sourceFiles:[...new Set(plans[config.slug].actors.map(id=>paths[id]))]});}
  fs.writeFileSync(path.join(root,'assets/ultimate-clash/cards.json'),JSON.stringify({version:1,mode:'UltimateClash',method:'Deterministic composition of bundled game portraits and original native Builder render; normal card frames are applied by the UI.',cards:entries},null,2)+'\n');console.log('Rendered '+entries.length+' Ultimate Clash card portraits.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
