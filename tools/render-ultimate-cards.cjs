'use strict';
// Deterministically compose native portraits or import retained original artwork.
// The UI applies the normal card frame; every output is a full-bleed portrait.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),content=require('../src/ultimate-clash.js');
const {chromium}=require('playwright');
const plans={
 'mega-minion-horde':{color:'#333c88',actors:['mega-minion','mega-minion','mega-minion','mega-minion','mega-minion','mega-minion'],layout:'horde'},
 'lightning-storm':{illustration:'lightning-storm'},
 'heal-spell':{color:'#1b9e6b',actors:['heal-spirit'],fx:'heal'},
 'balloon-parade':{color:'#ad5825',actors:Array(6).fill('balloon'),layout:'horde'},
 'executioner-cage':{color:'#52626c',actors:['executioner','executioner','executioner','executioner-cage-portrait'],layout:'cage'},
 builder:{color:'#b98132',actors:['builder-portrait'],fx:'build'},
 'magic-trio':{color:'#3d4493',actors:['ice-wizard','electro-wizard','wizard'],layout:'trio'},
 frostbite:{color:'#247faa',actors:['ice-spirit','ice-spirit','freeze','ice-spirit','ice-spirit'],layout:'frost',fx:'snow'},
 harvest:{illustration:'harvest'},
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
 'bomb-squad':{color:'#444c73',actors:['bomber','bomber','guards'],layout:'squad'},
 'mortar-battery':{color:'#93602e',actors:['mortar','mortar','mortar'],layout:'battery',fx:'fire'},
 'royale-recall':{illustration:'royale-recall'},
 'goblin-magnet':{color:'#6c374f',actors:['executioner-cage-portrait'],layout:'magnet',fx:'storm'},
 'spirit-festival':{color:'#4e368c',actors:['fire-spirits','fire-spirits','ice-spirit','ice-spirit','electro-spirit','electro-spirit','heal-spirit','heal-spirit'],layout:'festival',fx:'heal'},
 'dark-pact':{illustration:'dark-pact'},
 'battle-kitchen':{color:'#86532a',actors:['goblin-hut'],layout:'kitchen',fx:'build'},
 'royale-reinforcements':{color:'#395a87',actors:Array(6).fill('royal-recruit-unit'),layout:'reinforcements',fx:'build'},
 'elixir-spell':{illustration:'elixir-spell'},
 'dragon-king':{color:'#473268',actors:['baby-dragon'],layout:'dragon',fx:'fire'},
 'bowler-giant':{color:'#2b446d',actors:['bowler'],layout:'giant'},
 mirror:{color:'#342559',actors:['mirror'],layout:'mirror'},
 'bandit-squad':{color:'#554075',actors:['bandit','boss-bandit'],layout:'bandit-squad'}
};
const imageIds=plan=>plan.illustration?['illustration-'+plan.illustration]:plan.actors;
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json'),'utf8')),ui=JSON.parse(fs.readFileSync(path.join(root,'assets/ui/manifest.json'),'utf8'));
 const paths=Object.fromEntries(manifest.cards.map(c=>[c.id,c.file]));
 for(const plan of Object.values(plans))if(plan.illustration)paths['illustration-'+plan.illustration]='assets/ultimate-clash/illustrations/'+plan.illustration+'.png';
 const prompts=JSON.parse(fs.readFileSync(path.join(root,'assets/ultimate-clash/illustrations/prompts.json'),'utf8')).prompts;
 paths['tesla-evolution']=ui['modern-form-Tesla_EV1']?.file||paths.tesla;
 paths['builder-portrait']='assets/ultimate-clash/builder-portrait.png';
 paths['executioner-cage-portrait']='assets/ultimate-clash/executioner-cage-portrait.png';paths['unstable-egg-portrait']='assets/ultimate-clash/unstable-egg-portrait.png';
 paths['royal-recruit-unit']=paths['royal-recruits'];
 if(!fs.existsSync(path.join(root,paths['builder-portrait'])))throw Error('Render the source Builder portrait before rendering custom cards.');
 const manifestPath=path.join(root,'assets/ultimate-clash/cards.json'),previous=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{cards:[]},onlyNew=process.argv.includes('--only-new');
 const requested=process.argv.find(v=>v.startsWith('--cards='))?.slice(8).split(',');
 const selected=Object.fromEntries(Object.entries(plans).filter(([slug])=>requested?requested.includes(slug):!onlyNew||!previous.cards.some(c=>c.id==='ultimate-'+slug)));
 const images=Object.fromEntries([...new Set(Object.values(selected).flatMap(imageIds))].map(id=>[id,'data:image/png;base64,'+fs.readFileSync(path.join(root,paths[id])).toString('base64')]));
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 try{
  const page=await browser.newPage();await page.setContent('<!doctype html><html><body></body></html>');
  const result=await page.evaluate(async({plans,images})=>{
   const loaded={};await Promise.all(Object.entries(images).map(([id,url])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{loaded[id]=im;resolve();};im.onerror=reject;im.src=url;})));
   if(loaded['royal-recruit-unit']){const source=loaded['royal-recruit-unit'],tile=document.createElement('canvas');tile.width=142;tile.height=234;tile.getContext('2d').drawImage(source,95,66,142,234,0,0,142,234);loaded['royal-recruit-unit']=tile;}
   const outputs={};for(const [slug,p]of Object.entries(plans)){
    const cv=document.createElement('canvas');cv.width=474;cv.height=602;const c=cv.getContext('2d'),w=cv.width,h=cv.height;
    // Import the checked-in source on every render, including unrestricted runs.
    // Never regenerate an illustration from the old placeholder Canvas recipe.
    if(p.illustration){const im=loaded['illustration-'+p.illustration],scale=Math.max(w/im.width,h/im.height);c.imageSmoothingQuality='high';c.drawImage(im,(w-im.width*scale)/2,(h-im.height*scale)/2,im.width*scale,im.height*scale);outputs[slug]=cv.toDataURL('image/png').split(',')[1];continue;}
    const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,p.color);bg.addColorStop(.55,p.color);bg.addColorStop(1,'#161324');c.fillStyle=bg;c.fillRect(0,0,w,h);
    const light=c.createRadialGradient(w*.52,h*.3,5,w*.52,h*.3,w*.8);light.addColorStop(0,'#ffffff88');light.addColorStop(.4,'#ffffff10');light.addColorStop(1,'#00000000');c.fillStyle=light;c.fillRect(0,0,w,h);
    function actor(id,x,y,size,angle=0,opacity=1){const im=loaded[id],tile=document.createElement('canvas');tile.width=300;tile.height=360;const t=tile.getContext('2d'),scale=Math.max(300/im.width,360/im.height);t.drawImage(im,(300-im.width*scale)/2,(360-im.height*scale)/2,im.width*scale,im.height*scale);t.globalCompositeOperation='destination-in';const mask=t.createRadialGradient(150,155,80,150,175,210);mask.addColorStop(0,'#fff');mask.addColorStop(.72,'#fff');mask.addColorStop(1,'#fff0');t.fillStyle=mask;t.fillRect(0,0,300,360);c.save();c.globalAlpha=opacity;c.translate(x*w,y*h);c.rotate(angle);c.filter=p.hue?'hue-rotate('+p.hue+'deg)':'none';c.drawImage(tile,-size*w/2,-size*w*.6,size*w,size*w*1.2);c.restore();}
    const a=p.actors;
    function ellipse(x,y,rx,ry,color,line=0){c.beginPath();c.ellipse(x*w,y*h,rx*w,ry*h,0,0,Math.PI*2);c.fillStyle=color;c.fill();if(line){c.lineWidth=line;c.strokeStyle='#ffffffaa';c.stroke();}}
    function crown(x,y,size){c.save();c.translate(x*w,y*h);c.scale(size,size);c.fillStyle='#f8bd34';c.strokeStyle='#784b18';c.lineWidth=5;c.beginPath();c.moveTo(-85,25);c.lineTo(-100,-45);c.lineTo(-45,-10);c.lineTo(0,-72);c.lineTo(45,-10);c.lineTo(100,-45);c.lineTo(85,25);c.closePath();c.fill();c.stroke();c.fillStyle='#ffe9a6';c.fillRect(-82,14,164,18);for(const dx of [-45,0,45]){c.fillStyle=dx===0?'#ba3178':'#498bec';c.beginPath();c.arc(dx,15,8,0,Math.PI*2);c.fill();}c.restore();}
    function boulder(x,y,r){c.save();c.translate(x*w,y*h);const g=c.createRadialGradient(-r*.3,-r*.4,r*.1,0,0,r);g.addColorStop(0,'#afb4c6');g.addColorStop(.65,'#69738e');g.addColorStop(1,'#343c58');c.fillStyle=g;c.strokeStyle='#273149';c.lineWidth=5;c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5,rr=r*(.9+(i%3)*.04);c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();c.fill();c.stroke();c.strokeStyle='#c5cbdf66';c.lineWidth=4;c.beginPath();c.moveTo(-r*.5,-r*.35);c.lineTo(-r*.1,-r*.55);c.lineTo(r*.4,-r*.3);c.stroke();c.restore();}
    if(p.layout==='mirror'){
     const glow=c.createRadialGradient(w*.5,h*.49,10,w*.5,h*.49,w*.7);glow.addColorStop(0,'#ae7dffa8');glow.addColorStop(.55,'#9868dd44');glow.addColorStop(1,'#31143a00');c.fillStyle=glow;c.fillRect(0,0,w,h);
     actor(a[0],.5,.54,1.04,0,1);
     c.save();c.translate(w*.5,h*.53);c.globalCompositeOperation='screen';const glass=c.createLinearGradient(-w*.28,-h*.28,w*.28,h*.28);glass.addColorStop(0,'#c4e8ff88');glass.addColorStop(.38,'#814de8aa');glass.addColorStop(.7,'#a9c7ff33');glass.addColorStop(1,'#ffbff399');c.fillStyle=glass;c.beginPath();c.roundRect(-w*.29,-h*.3,w*.58,h*.54,40);c.fill();
     for(let i=0;i<3;i++){const x=(i-1)*w*.135,y=(i===1?-.015:.04)*h,r=i===1?18:12;c.fillStyle=i===1?'#fff6d6':'#e9d3ff';c.shadowColor='#d39bff';c.shadowBlur=25;c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+3,y-3,x+r,y);c.quadraticCurveTo(x+3,y+3,x,y+r);c.quadraticCurveTo(x-3,y+3,x-r,y);c.quadraticCurveTo(x-3,y-3,x,y-r);c.fill();}c.restore();
    }
    else if(p.layout==='bandit-squad'){
     const gold=c.createRadialGradient(w*.5,h*.45,10,w*.5,h*.45,w*.7);gold.addColorStop(0,'#f4c46b88');gold.addColorStop(.7,'#d9983922');gold.addColorStop(1,'#613b7b00');c.fillStyle=gold;c.fillRect(0,0,w,h);
     actor(a[1],.5,.52,.83);actor(a[0],.21,.19,.46,-.09);actor(a[0],.79,.19,.46,.09);actor(a[0],.21,.81,.46,-.09);actor(a[0],.79,.81,.46,.09);
    }
    else if(p.layout==='battery'){actor(a[0],.24,.28,.66,-.12);actor(a[1],.77,.29,.66,.12);actor(a[2],.5,.74,.94);}
    else if(p.layout==='recall'){ellipse(.53,.59,.38,.28,'#20ccec22',13);ellipse(.53,.59,.32,.23,'#207eff44',7);actor(a[1],.78,.24,.47,0,.54);actor(a[0],.45,.57,.91);c.strokeStyle='#9affff';c.lineWidth=9;c.beginPath();c.arc(w*.5,h*.5,w*.42,.12,Math.PI*1.65);c.stroke();}
    else if(p.layout==='magnet'){actor(a[0],.5,.57,1.65);c.save();c.translate(w*.5,h*.29);c.lineCap='butt';c.lineWidth=48;c.strokeStyle='#df4c62';c.beginPath();c.arc(0,0,72,0,Math.PI);c.stroke();c.fillStyle='#cbd9e5';c.fillRect(-96,-65,48,65);c.fillRect(48,-65,48,65);c.fillStyle='#418edd';c.fillRect(48,0,48,28);c.restore();}
    else if(p.layout==='festival'){[[.23,.16,.43,-.12],[.73,.17,.43,.12],[.18,.4,.43,-.1],[.77,.4,.43,.1],[.22,.64,.45,-.1],[.77,.63,.45,.1],[.22,.85,.43,-.1],[.75,.85,.43,.1]].forEach((v,i)=>actor(a[i],...v));}
    else if(p.layout==='pact'){actor(a[0],.5,.32,.8,0,.48);for(let j=0;j<3;j++)ellipse(.5,.74,.45-j*.09,.10-j*.017,'#a3195e22',4);actor(a[1],.5,.63,.85,-.12);}
    else if(p.layout==='kitchen'){actor(a[0],.5,.46,1.1);c.fillStyle='#293142';c.strokeStyle='#d6d8df';c.lineWidth=5;c.beginPath();c.ellipse(w*.48,h*.77,w*.23,h*.09,0,0,Math.PI*2);c.fill();c.stroke();c.fillRect(w*.67,h*.755,w*.23,15);c.fillStyle='#c9853e';c.beginPath();c.ellipse(w*.31,h*.81,w*.11,h*.045,-.3,0,Math.PI*2);c.fill();c.strokeStyle='#ffdfa0';c.lineWidth=4;for(let i=0;i<3;i++){c.beginPath();c.moveTo(w*(.24+i*.065),h*.8);c.lineTo(w*(.27+i*.065),h*.83);c.stroke();}c.strokeStyle='#fff6dbbb';c.lineWidth=6;for(let i=0;i<3;i++){const x=w*(.38+i*.09);c.beginPath();c.moveTo(x,h*.7);c.bezierCurveTo(x-28,h*.65,x+28,h*.6,x,h*.54);c.stroke();}}
    else if(p.layout==='reinforcements'){for(let i=0;i<3;i++){c.strokeStyle='#ffe2a7aa';c.lineWidth=7;c.beginPath();c.moveTo(w*(.2+i*.3),h*.03);c.lineTo(w*(.2+i*.3),h*(.23+i*.24));c.stroke();}[[.23,.25,.49,-.08],[.74,.25,.49,.08],[.23,.51,.53,-.08],[.74,.51,.53,.08],[.23,.79,.58,-.08],[.74,.79,.58,.08]].forEach((v,i)=>actor(a[i],...v));}
    else if(p.layout==='spill'){for(let j=0;j<4;j++)ellipse(.5,.75,.47-j*.07,.16-j*.022,j%2?'#b751f0aa':'#862dccaa',4);actor(a[0],.49,.34,.88,-.65);c.strokeStyle='#c76dff';c.lineWidth=27;c.beginPath();c.moveTo(w*.5,h*.48);c.quadraticCurveTo(w*.72,h*.62,w*.48,h*.74);c.stroke();}
    else if(p.layout==='dragon'){actor(a[0],.5,.55,1.23);crown(.5,.195,.9);const g=c.createLinearGradient(w*.5,h*.57,w*.5,h);g.addColorStop(0,'#fff5a4cc');g.addColorStop(.5,'#ffb147aa');g.addColorStop(1,'#f3541600');c.fillStyle=g;c.beginPath();c.moveTo(w*.46,h*.53);c.lineTo(w*.08,h*.99);c.lineTo(w*.94,h*.99);c.lineTo(w*.57,h*.53);c.closePath();c.fill();}
    else if(p.layout==='giant'){actor(a[0],.5,.43,1.28);boulder(.2,.75,w*.19);boulder(.8,.75,w*.19);}
    else if(p.layout==='horde'){[[.25,.2,.48,-.1],[.75,.2,.48,.1],[.25,.47,.5,-.06],[.75,.47,.5,.06],[.25,.76,.52,-.06],[.75,.76,.52,.06]].forEach((v,i)=>actor(a[i],...v));}
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
  },{plans:selected,images});
  const dir=path.join(root,'assets/ultimate-clash/cards');fs.mkdirSync(dir,{recursive:true});const entries=[];
  for(const config of content.CARDS){
   if(!result[config.slug]){const existing=previous.cards.find(c=>c.id===config.id);if(!existing)throw Error('Missing portrait result: '+config.id);entries.push(existing);continue;}
   const plan=plans[config.slug],bytes=Buffer.from(result[config.slug],'base64'),file='assets/ultimate-clash/cards/'+config.id+'.png';fs.writeFileSync(path.join(root,file),bytes);
   const sourceFiles=[...new Set(imageIds(plan).map(id=>paths[id]))],entry={id:config.id,name:config.name,file,width:474,height:602,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),description:config.artDescription,source:plan.illustration?'Original illustration generated with the built-in imagegen tool':'Web Royale custom Canvas composition',sourceFiles};
   if(plan.illustration){entry.sourceSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,sourceFiles[0]))).digest('hex');entry.generationPrompt=prompts[plan.illustration];}
   entries.push(entry);
  }
  fs.writeFileSync(path.join(root,'assets/ultimate-clash/cards.json'),JSON.stringify({version:1,mode:'UltimateClash',method:'Deterministic composition of bundled game portraits and retained original spell illustrations; normal card frames are applied by the UI.',cards:entries},null,2)+'\n');console.log('Rendered '+Object.keys(result).length+' of '+entries.length+' Ultimate Clash card portraits.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
