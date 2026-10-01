/* Hand-built custom arenas. Every walkable edge is read from ArenaLayout.
   Backdrop + floor are cached together; raised scenery is a separate cached
   foreground. Touchdown caches background, pitch and stadium decorations as
   separate surfaces. Ambient effects animate without rebuilding these layers. */
(function(root){'use strict';
const cache=new Map(),SX=480/18,SY=20,stadium={image:null,pending:null,url:null};
function clear(){for(const cv of cache.values()){if(cv.foreground){cv.foreground.width=1;cv.foreground.height=1;}if(cv.background){cv.background.width=1;cv.background.height=1;}cv.width=1;cv.height=1;}cache.clear();}
function poly(c,pts,fill,edge,width=1){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(edge){c.strokeStyle=edge;c.lineWidth=width;c.stroke();}}
function line(c,x,y,xx,yy,color,w=1){c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();}
function gradient(c,x,y,xx,yy,stops,radial=false){const g=radial?c.createRadialGradient(x,y,0,x,y,Math.max(1,xx)):c.createLinearGradient(x,y,xx,yy);if(!g?.addColorStop)return stops[0][1];for(const [at,col]of stops)g.addColorStop(at,col);return g;}
function ellipse(c,x,y,rx,ry,fill){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function bevel(c,x,y,w,h,fill,light='#fff4',shade='#13233266'){c.fillStyle=fill;c.fillRect(x,y,w,h);line(c,x,y,x+w,y,light,1.2);line(c,x,y,x,y+h,light,1);line(c,x,y+h,x+w,y+h,shade,1.5);line(c,x+w,y,x+w,y+h,shade,1);}
function plate(c,x,y,w,h,fill,edge,cut=8){poly(c,[[x+cut,y],[x+w-cut,y],[x+w,y+cut],[x+w,y+h-cut],[x+w-cut,y+h],[x+cut,y+h],[x,y+h-cut],[x,y+cut]],fill,edge,2);}
function prop(c,lib,scene,name,x,y,w,h,flip=false){const sc=lib?.scenes?.[scene];if(!sc?.clip(name))return;const b=sc.bounds(name,0);if(!b?.width||!b.height)return;const scale=Math.min(w/b.width,h/b.height);c.save();c.translate(x,y);if(flip)c.scale(-1,1);c.scale(scale,scale);c.translate(-b.x-b.width/2,-b.y-b.height);sc.draw(c,name,0,{frame:0,still:true});c.restore();}
function sourceArenaId(l){const theme=l?.theme||'';if(theme==='jungle'||theme==='garden')return'jungle';if(theme==='volcano'||theme==='lava')return'pekka';if(theme==='ice')return'frozen';if(theme==='moon-castle')return'serenity';return'royal';}
function sourceArenaBackdrop(c,lib,l){if(!lib?.drawArenaById)return false;const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY,w=right-left,h=bottom-top;c.save();c.globalAlpha=.94;c.translate(left,top);c.scale(w/480,h/640);const ok=lib.drawArenaById(c,sourceArenaId(l),0,false);c.restore();return ok;}
async function prepareAssets(b,assetBase){
 if(!b?.arenaLayout?.touchdown||root.RoyaleGraphics?.current?.potato||!root.Image)return false;
 const path='assets/ui/touchdown-stadium-reference.png',base=assetBase||root.document?.baseURI||'';
 const url=root.URL?new root.URL(path,base).href:base.replace(/[^/]*$/,'')+path;
 if(stadium.image&&stadium.url===url)return true;if(stadium.pending&&stadium.url===url)return stadium.pending;
 stadium.url=url;stadium.image=null;
 stadium.pending=new Promise(resolve=>{const img=new root.Image();img.onload=()=>{if(stadium.url===url){stadium.image=img;clear();}resolve(true);};img.onerror=()=>resolve(false);img.src=url;});
 const ready=await stadium.pending;stadium.pending=null;return ready;
}
function stadiumSlice(c,l,x,y,w,h){const [left,top]=stadiumPoint(l,x,y),[right,bottom]=stadiumPoint(l,x+w,y+h);c.drawImage(stadium.image,x,y,w,h,left,top,right-left,bottom-top);}
function stadiumReference(c,l,front,background){
 if(!stadium.image)return false;
 // Turf and end zones belong to the ground surface. Trees and distant scenery
 // render behind it; stands, horns, statues and entrances render in foreground.
 // Every crop stays anchored to unchanged playable edges and scoring lines.
 const sy=[0,126,169,484,524,647];
 for(let row=0;row<5;row++){
  const y=sy[row],h=sy[row+1]-y;
  stadiumSlice(row>0&&row<4?c:front,l,136,y,273,h);
  stadiumSlice(background,l,0,y,35,h);stadiumSlice(front,l,35,y,101,h);
  stadiumSlice(front,l,409,y,109,h);stadiumSlice(background,l,518,y,33,h);
 }
 return true;
}
function nativeTouchdownPitch(c,l,lib){
 const sc=lib?.scenes?.level_royal_arena;if(!sc?.clip('royal_touchdown_bg'))return false;
 const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY,scaleX=(right-left)/540,scaleY=(l.goalBottom-l.goalTop)*SY/634;
 c.save();c.beginPath();c.rect(left,top,right-left,bottom-top);c.clip();c.translate(left+270*scaleX,l.goalTop*SY-68*scaleY);c.scale(scaleX,scaleY);sc.draw(c,'royal_touchdown_bg',0,{frame:0,still:true});c.restore();return true;
}
function snow(c,x,y,w,h){c.save();c.translate(x,y);c.fillStyle=gradient(c,-w,0,w,h,[[0,'#a8bad7'],[.4,'#e1eaff'],[.68,'#ffffff'],[1,'#c5d5eb']]);c.beginPath();c.moveTo(-w*.5,h*.2);c.bezierCurveTo(-w*.65,-h*.3,-w*.28,-h*.65,0,-h*.5);c.bezierCurveTo(w*.5,-h*.67,w*.64,-h*.1,w*.43,h*.3);c.bezierCurveTo(w*.47,h*.65,w*.22,h*.7,w*.09,h*.53);c.bezierCurveTo(-w*.08,h*.72,-w*.53,h*.61,-w*.5,h*.2);c.fill();c.restore();}
function icyBackdrop(c,left,right){
 c.fillStyle=gradient(c,-80,-80,560,720,[[0,'#f0f3ff'],[.3,'#c9d7ef'],[.6,'#a9bbd9'],[1,'#d8e6f5']]);c.fillRect(-80,-80,640,800);
 for(const side of [-1,1])for(let i=0;i<10;i++){const edge=side<0?left-35:right+35,x=edge+side*(27+(i%3)*24),y=-67+i*87,w=55+(i%4)*12,h=108+(i%2)*22;
  const pts=[[x-side*w*.45,y-32],[x+side*w*.6,y-21],[x+side*w*.92,y+27],[x+side*w*.7,y+h],[x-side*w*.3,y+h+20],[x-side*w*.75,y+40]];
  poly(c,pts,gradient(c,x-side*w,y,x+side*w,y+h,[[0,'#748bae'],[.45,'#a8bad8'],[1,'#d3dff1']]),'#8fa5c7',1);
  poly(c,[pts[0],pts[1],pts[2],[x,y+39],pts[5]],'#e5edfa');poly(c,[[x,y+39],pts[2],pts[3],[x+side*3,y+h]],'#a8bcdb');poly(c,[pts[5],[x,y+39],[x+side*3,y+h],pts[4]],'#829abe');
  line(c,pts[0][0],pts[0][1],x,y+39,'#fbfdff',1.5);
 }
 // Deep cool shadow under the bridge makes the raised gold trim legible.
 c.fillStyle=gradient(c,240,320,240,0,[[0,'#304773bb'],[.75,'#728fb86b'],[1,'#b9cce900']],true);c.fillRect(left-85,-40,right-left+170,740);
}
function lavaBackdrop(c,left,right){
 c.fillStyle=gradient(c,-90,-100,570,760,[[0,'#120d16'],[.25,'#2b1820'],[.56,'#4a241d'],[1,'#160f17']]);c.fillRect(-90,-100,660,860);
 for(const side of [-1,1])for(let i=0;i<9;i++){const edge=side<0?left-42:right+42,x=edge+side*(22+(i%3)*27),y=-72+i*92,w=56+(i%4)*13,h=105+(i%2)*25;poly(c,[[x-side*w*.5,y-25],[x+side*w*.55,y-12],[x+side*w*.9,y+35],[x+side*w*.65,y+h],[x-side*w*.4,y+h+14],[x-side*w*.72,y+26]],gradient(c,x-side*w,y,x+side*w,y+h,[[0,'#19151b'],[.46,'#3d3030'],[1,'#1f171d']]),'#5a3630',1.3);for(let j=0;j<3;j++)line(c,x-side*w*.2,y+20+j*26,x+side*w*.45,y+30+j*24,'#ff6b2e77',1.7);}
 c.fillStyle='#2a1112';c.fillRect(left-86,290,right-left+172,68);for(let x=left-70;x<right+70;x+=36){ellipse(c,x,325,18,7,'#ff5b20');ellipse(c,x+4,322,10,4,'#ffb243');}
}
function gardenBackdrop(c,left,right){
 c.fillStyle=gradient(c,-80,-80,560,760,[[0,'#b9d8ee'],[.35,'#8eb8c9'],[.62,'#7aa070'],[1,'#54734f']]);c.fillRect(-80,-80,640,840);
 for(const side of [-1,1])for(let i=0;i<11;i++){const edge=side<0?left-36:right+36,x=edge+side*(18+(i%2)*23),y=-45+i*70;ellipse(c,x,y,37+(i%3)*7,18+(i%2)*5,'#315f3f');ellipse(c,x-side*10,y-8,27,14,'#4f8a51');for(let k=0;k<4;k++)ellipse(c,x+(k-1.5)*10,y-5+(k%2)*6,3.5,3,'#f5d66f');}
 for(const side of [-1,1])for(const y of [120,320,520]){const x=side<0?left-52:right+52;plate(c,x-21,y-25,42,50,'#8799a0','#e4d9bd',8);ellipse(c,x,y-25,24,7,'#c7c5af');ellipse(c,x,y-31,14,5,'#78b8cf');line(c,x,y-29,x,y-51,'#d9f2ff',2);}
}
function causewayFrame(c,left,right,top,bottom,theme){const lava=theme==='lava',garden=theme==='garden',outer=lava?'#5a3327':garden?'#6d836e':'#8b5b38',inner=lava?'#de7b36':garden?'#d6c38b':'#cf9a56';plate(c,left-18,top-8,right-left+36,bottom-top+16,outer,inner,12);plate(c,left-9,top,right-left+18,bottom-top,theme==='garden'?'#819077':lava?'#3c2926':'#6d7486',inner,9);}
function fortressBackdrop(c){c.fillStyle=gradient(c,0,-80,0,720,[[0,'#171e31'],[.5,'#3c4961'],[1,'#24384c']]);c.fillRect(-80,-80,640,800);
 for(const side of [-1,1]){const x=side<0?-78:488;for(let y=-60,row=0;y<730;y+=38,row++)for(let col=0;col<3;col++){const xx=x+col*27-(row%2)*12;bevel(c,xx,y,25,35,row%3?'#59667c':'#46546c','#8b9aaf','#202b41');}for(let y=-36;y<720;y+=97){plate(c,side<0?-52:494,y,38,53,'#56647b','#19253b',5);plate(c,side<0?-46:500,y+5,26,40,'#8794a6','#354357',3);}}
 for(let y=-66;y<720;y+=76){line(c,-70,y,-8,y+40,'#151b2b66',5);line(c,488,y,550,y+40,'#151b2b66',5);}
}

function royalBastionBackdrop(c,left,right,top,bottom){
 c.fillStyle=gradient(c,0,top-150,0,bottom+150,[[0,'#16263c'],[.38,'#40536b'],[.7,'#2b3f56'],[1,'#12253a']]);c.fillRect(left-105,top-155,right-left+210,bottom-top+310);
 for(const side of [-1,1]){const x=side<0?left-68:right+25;for(let y=top-90;y<bottom+100;y+=76){plate(c,x,y,42,62,'#5e6d82','#9aa8b6',8);for(let xx=x+7;xx<x+38;xx+=12)bevel(c,xx,y-12,8,18,'#718198','#bec8d1','#304258');}}
 for(const y of [top-105,bottom+47]){plate(c,left-45,y,right-left+90,52,'#53647a','#a99b78',10);for(let x=left-32;x<right+34;x+=42)bevel(c,x,y-16,27,22,'#7c8998','#c5c8c4','#3a4c60');}
}
function jungleCitadelBackdrop(c,left,right,top,bottom){
 c.fillStyle=gradient(c,0,top-150,0,bottom+150,[[0,'#173728'],[.35,'#315b3c'],[.68,'#284f36'],[1,'#112d25']]);c.fillRect(left-115,top-160,right-left+230,bottom-top+320);
 for(const side of [-1,1]){const base=side<0?left-78:right+78;for(let y=top-95,i=0;y<bottom+90;y+=88,i++){const x=base+side*(i%2)*18;ellipse(c,x,y,55,26,'#244b32');ellipse(c,x-side*15,y-13,42,21,'#39704a');ellipse(c,x+side*12,y-24,30,16,'#4b8652');plate(c,x-side*20-15,y+18,30,54,'#68765f','#9ea886',7);for(let v=0;v<3;v++)line(c,x-side*(5+v*6),y+10,x-side*(10+v*7),y+62,'#365b33',2);}}
 for(const y of [top-95,bottom+43]){for(let x=left-20;x<right+20;x+=70){plate(c,x,y,54,43,'#64735e','#a6ae8d',8);ellipse(c,x+27,y+3,19,7,'#315e38');}}
}
function emberFortressBackdrop(c,left,right,top,bottom){
 c.fillStyle=gradient(c,0,top-150,0,bottom+150,[[0,'#110f16'],[.35,'#2c1d21'],[.65,'#4a241e'],[1,'#130f16']]);c.fillRect(left-115,top-160,right-left+230,bottom-top+320);
 for(const side of [-1,1]){const x=side<0?left-65:right+65;for(let y=top-80;y<bottom+70;y+=92){poly(c,[[x-side*38,y+42],[x-side*22,y-25],[x+side*19,y-42],[x+side*43,y+39]],'#2b252a','#684237',2);line(c,x-side*20,y+5,x+side*20,y-13,'#ff663a55',3);ellipse(c,x,y+35,25,7,'#ff5928');ellipse(c,x+side*5,y+31,13,4,'#ffb14d');}}
 for(const y of [top-93,bottom+42]){plate(c,left-45,y,right-left+90,48,'#2e282c','#87543a',9);for(let x=left-30;x<right+25;x+=54){bevel(c,x,y-13,36,26,'#473539','#835444','#1a171b');ellipse(c,x+18,y,4,4,'#e17b44');}}
}
function moonKeepBackdrop(c,l){const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY;c.fillStyle=gradient(c,0,top-170,0,bottom+170,[[0,'#0d1330'],[.42,'#222b55'],[.7,'#343957'],[1,'#0d1429']]);c.fillRect(left-115,top-170,right-left+230,bottom-top+340);ellipse(c,(left+right)/2,top-74,96,96,'#d8d8f3');ellipse(c,(left+right)/2+31,top-91,92,92,'#202846');for(let i=0;i<42;i++){const x=left-75+(i*97)%(right-left+150),y=top-145+(i*59)%Math.max(1,bottom-top+210);ellipse(c,x,y,1+(i%3)*.35,1+(i%3)*.35,i%7===0?'#f5eaff':'#8ca1d7');}for(const side of [-1,1])for(const y of [top-35,bottom+9]){const x=side<0?left-55:right+55;poly(c,[[x-25,y+48],[x-16,y-20],[x,y-68],[x+16,y-20],[x+25,y+48]],'#343c62','#7f81ae',2);ellipse(c,x,y-48,8,8,'#8a78d2');}}
function fourBridgesBackdrop(c,l){const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY;c.fillStyle=gradient(c,0,top-150,0,bottom+150,[[0,'#789ca9'],[.35,'#547986'],[.7,'#456875'],[1,'#263f4c']]);c.fillRect(left-110,top-155,right-left+220,bottom-top+310);for(const side of [-1,1]){const x=side<0?left-74:right+74;for(let y=top-80;y<bottom+75;y+=112){plate(c,x-27,y,54,72,'#637882','#c6b989',10);for(let xx=x-17;xx<=x+17;xx+=17)bevel(c,xx-5,y-17,10,22,'#7f8f94','#d8c99c','#3b515a');line(c,x-18,y+45,x+18,y+45,'#d3bd86',2);}}for(const y of [top-83,bottom+35]){plate(c,left-42,y,right-left+84,46,'#566b75','#bda978',9);for(let x=left-27;x<right+28;x+=48)ellipse(c,x,y+24,12,4,'#3d5968');}}
function floorTiles(c,left,right,icy,top=0,bottom=32){const fills=icy?['#adb0c9','#b8bad1','#9ea2bd','#c4c6d9']:['#938eb2','#a29abd','#8786a8','#aaa4c3'];
 c.fillStyle=icy?'#6e6b84':'#595c76';c.fillRect(left,top*SY,right-left,(bottom-top)*SY);c.save();c.beginPath();c.rect(left,top*SY,right-left,(bottom-top)*SY);c.clip();
 for(let row=Math.floor(top);row<bottom;row++)for(let col=Math.floor(left/SX);col<right/SX;col++){const rr=Math.min(row,31-row),cc=Math.min(col,17-col),hash=((rr*17+cc*31)^rr)%4;bevel(c,col*SX+.7,row*SY+.7,SX-1.4,SY-1.4,fills[(hash+4)%4],icy?'#e4e4f14d':'#e4dff247','#4d526738');if((rr*11+cc*7)%23===0){line(c,col*SX+7,row*SY+2,col*SX+13,row*SY+8,'#42445e44',.8);line(c,col*SX+13,row*SY+8,col*SX+9,row*SY+13,'#42445e44',.8);}}
 c.restore();
}

function royalBastionFloor(c,l,left,right,top,bottom){
 c.save();c.beginPath();c.rect(left,top,right-left,bottom-top);c.clip();c.fillStyle='#74758c';c.fillRect(left,top,right-left,bottom-top);
 for(let y=top;y<bottom;y+=18)for(let x=left-(Math.floor((y-top)/18)%2)*21;x<right;x+=42)bevel(c,x+.7,y+.7,40.5,16.5,((x+y)/18)%3>1?'#a4a1b3':'#918fa5','#d8d3df70','#4f506844');
 for(const lane of l.lanes){const x=lane*SX;c.fillStyle='#6d50656b';c.fillRect(x-19,top,x?38:38,bottom-top);line(c,x-19,top,x-19,bottom,'#d7b98a66',1.5);line(c,x+19,top,x+19,bottom,'#d7b98a66',1.5);}
 for(const y of [top+82,bottom-82]){ellipse(c,(left+right)/2,y,38,17,'#6f7289');ellipse(c,(left+right)/2,y,31,14,'#b59f72');castleCrown(c,(left+right)/2,y,1.05,'#dbc77e');}c.restore();
}
function jungleTempleFloor(c,l,left,right,top,bottom){
 c.save();c.beginPath();c.rect(left,top,right-left,bottom-top);c.clip();c.fillStyle='#61745d';c.fillRect(left,top,right-left,bottom-top);
 for(let row=0,y=top;y<bottom;y+=26,row++)for(let x=left-(row%2)*28;x<right;x+=56){const moss=(row+Math.floor(x/56))%4;bevel(c,x+.7,y+.7,54.5,24.5,moss===0?'#6f8068':moss===1?'#87917a':'#788374','#b7bd9a66','#39483d55');if(moss%2===0){line(c,x+8,y+8,x+20,y+17,'#365d36aa',1.2);line(c,x+19,y+17,x+31,y+13,'#365d36aa',1.2);}}
 for(const lane of l.lanes){const x=lane*SX;for(let y=top+23;y<bottom-14;y+=52){ellipse(c,x,y,13,6,'#586955');ellipse(c,x,y-2,7,3,'#9aa16f');}}
 for(const y of [top+68,bottom-68]){ellipse(c,(left+right)/2,y,42,18,'#445c49');ellipse(c,(left+right)/2,y,34,14,'#84906f');for(let a=0;a<8;a++){const ang=a*Math.PI/4;line(c,(left+right)/2+Math.cos(ang)*10,y+Math.sin(ang)*5,(left+right)/2+Math.cos(ang)*28,y+Math.sin(ang)*11,'#cad08088',2);}}c.restore();
}
function emberForgeFloor(c,l,left,right,top,bottom){
 c.save();c.beginPath();c.rect(left,top,right-left,bottom-top);c.clip();c.fillStyle='#2b282e';c.fillRect(left,top,right-left,bottom-top);
 for(let row=0,y=top;y<bottom;y+=24,row++)for(let x=left-(row%2)*31;x<right;x+=62){bevel(c,x+.8,y+.8,60.5,22.5,row%3===0?'#3d3437':'#343037','#6e5551','#17161b');for(const rx of [x+8,x+52])ellipse(c,rx,y+11,2,2,'#a36a48');}
 for(const lane of l.lanes){const x=lane*SX;c.fillStyle='#4d31306e';c.fillRect(x-17,top,34,bottom-top);for(let y=top+9;y<bottom;y+=32){line(c,x-14,y,x+14,y,'#e66c3468',2);}}
 for(const y of [top+82,bottom-82]){plate(c,(left+right)/2-41,y-13,82,26,'#242027','#7f5746',7);for(let x=(left+right)/2-29;x<(left+right)/2+30;x+=15)ellipse(c,x,y,3,3,'#e38142');}c.restore();
}
function castleCrownFloor(c,l,left,right,top,bottom){
 c.save();c.beginPath();c.rect(left,top,right-left,bottom-top);c.clip();c.fillStyle='#89949f';c.fillRect(left,top,right-left,bottom-top);
 for(let row=0,y=top;y<bottom;y+=20,row++)for(let x=left-(row%2)*24;x<right;x+=48)bevel(c,x+.6,y+.6,46.8,18.8,(row+Math.floor(x/48))%2?'#b7b9b6':'#a5aaab','#ece4cf66','#50617444');
 for(const team of [0,1]){const y=team?top+88:bottom-88;for(const lane of l.lanes){const x=lane*SX;ellipse(c,x,y,21,8,team?'#8d5d6855':'#4b779255');castleCrown(c,x,y,.48,team?'#d1ad72':'#d9c57e');}}
 line(c,left,320,right,320,'#d5c28b88',2);c.restore();
}
function moonKeepFloor(c,l,left,right,top,bottom){
 c.save();c.beginPath();c.rect(left,top,right-left,bottom-top);c.clip();c.fillStyle='#30374f';c.fillRect(left,top,right-left,bottom-top);
 for(let row=0,y=top;y<bottom;y+=22,row++)for(let x=left-(row%2)*26;x<right;x+=52)bevel(c,x+.5,y+.5,50.5,20.5,(row+Math.floor(x/52))%3===0?'#505878':'#414962','#777ca0','#1e2437');
 for(let i=0;i<l.lanes.length;i++){const x=l.lanes[i]*SX;for(let y=top+42;y<bottom-22;y+=88){ellipse(c,x,y,17,8,'#292f49');ellipse(c,x,y,12,5,'#8078bb');for(let a=0;a<6;a++){const ang=a*Math.PI/3;line(c,x+Math.cos(ang)*6,y+Math.sin(ang)*3,x+Math.cos(ang)*13,y+Math.sin(ang)*6,'#c6b5ff80',1);}}}
 ellipse(c,(left+right)/2,320,46,20,'#242a42');ellipse(c,(left+right)/2,320,35,15,'#6d6499');ellipse(c,(left+right)/2+8,316,29,13,'#323950');c.restore();
}
function fourBridgesFloor(c,l,left,right,top,bottom){
 c.save();c.beginPath();c.rect(left,top,right-left,bottom-top);c.clip();c.fillStyle='#77868c';c.fillRect(left,top,right-left,bottom-top);
 for(let y=top;y<bottom;y+=18)for(let x=left;x<right;x+=31)bevel(c,x+.5,y+.5,29.8,16.8,(Math.floor(x/31)+Math.floor(y/18))%2?'#9ba5a1':'#8d9a9b','#d4d0b6','#4c5c62');
 const ry=l.riverTop*SY,rh=(l.riverBottom-l.riverTop)*SY;for(const y of [ry-24,ry+rh+7]){c.fillStyle='#5c6870';c.fillRect(left,y,right-left,17);for(let x=left+10;x<right;x+=37)ellipse(c,x,y+8,3,3,'#d6c17e');}
 for(const br of l.bridges){const cx=(br.left+br.right)*SX/2;line(c,cx,top,cx,ry-26,'#d4c89244',2);line(c,cx,ry+rh+24,cx,bottom,'#d4c89244',2);}c.restore();
}
function lavaCausewayFloor(c,l,left,right,top,bottom){
 c.save();c.beginPath();c.rect(left,top,right-left,bottom-top);c.clip();c.fillStyle='#252025';c.fillRect(left,top,right-left,bottom-top);
 for(let y=top;y<bottom;y+=28){bevel(c,left+6,y+2,right-left-12,23,'#3b3336','#765446','#15151a');for(let x=left+20;x<right-12;x+=38){ellipse(c,x,y+13,2.2,2.2,'#d79054');line(c,x+4,y+5,x+15,y+19,'#6b3a2f',1);}}
 for(const y of [top+52,bottom-52]){line(c,left+12,y,right-12,y,'#f4763477',3);line(c,left+14,y+4,right-14,y+4,'#762b2488',1);}c.restore();
}
function royalGardenFloor(c,l,left,right,top,bottom){
 c.save();c.beginPath();c.rect(left,top,right-left,bottom-top);c.clip();c.fillStyle='#d2ccb0';c.fillRect(left,top,right-left,bottom-top);
 for(let y=top;y<bottom;y+=24)for(let x=left;x<right;x+=32)bevel(c,x+.5,y+.5,30.8,22.8,(Math.floor(x/32)+Math.floor(y/24))%2?'#ddd6bd':'#c7c0a6','#f6eed5','#817d70');
 c.fillStyle='#557d4e';c.fillRect(left,top,13,bottom-top);c.fillRect(right-13,top,13,bottom-top);for(let y=top+34;y<bottom;y+=62){for(const x of [left+7,right-7]){ellipse(c,x,y,9,5,'#3d6b41');ellipse(c,x,y-3,6,3,'#78a75f');}}
 for(const y of [top+88,bottom-88]){ellipse(c,(left+right)/2,y,30,10,'#9e9f8c');ellipse(c,(left+right)/2,y,22,7,'#73abc1');line(c,(left+right)/2,y-2,(left+right)/2,y-17,'#d9f4ff',2);}c.restore();
}
function themedFloor(c,l,left,right,top,bottom){
 const theme=l.theme||'';if(theme==='jungle')return jungleTempleFloor(c,l,left,right,top,bottom);if(theme==='volcano')return emberForgeFloor(c,l,left,right,top,bottom);if(theme==='garden')return royalGardenFloor(c,l,left,right,top,bottom);if(theme==='lava')return lavaCausewayFloor(c,l,left,right,top,bottom);if(theme==='moon-castle')return moonKeepFloor(c,l,left,right,top,bottom);if(theme==='river-fort')return fourBridgesFloor(c,l,left,right,top,bottom);if(theme==='bastion')return royalBastionFloor(c,l,left,right,top,bottom);if(theme==='castle')return castleCrownFloor(c,l,left,right,top,bottom);return floorTiles(c,left,right,theme==='ice',l.top,l.bottom);
}
// Coordinates are shared with the logical tower centers, not a separate art grid.
function foundationSlots(l){const out=[];if(l.touchdown)return out;if(l.ffaTeams){for(const row of l.ffaTeams){out.push({entity:'KingTower',team:row.team,x:row.king[0]*SX,y:row.king[1]*SY});for(const q of row.princess)out.push({entity:'PrincessTower',team:row.team,x:q[0]*SX,y:q[1]*SY});}return out;}for(const team of [0,1]){const flip=y=>team?y:32-y;for(let i=0;i<l.kings.length;i++)out.push({entity:'KingTower',team,x:l.kings[i]*SX,y:flip(l.kingYs?.[i]??l.kingY??3)*SY});for(let i=0;i<l.lanes.length;i++)out.push({entity:'PrincessTower',team,x:l.lanes[i]*SX,y:flip(l.princessY[i])*SY});}return out;}
function foundations(c,slots){for(const t of slots){const king=t.entity==='KingTower',x=t.x,y=t.y,w=king?70:58,h=king?62:54,team=t.team;
 ellipse(c,x,y+8,w*.57,h*.34,'#16233257');plate(c,x-w/2,y-h/2,w,h,'#41455c','#252f44',5);
 plate(c,x-w/2+3,y-h/2+3,w-6,h-6,gradient(c,x,y-h/2,x,y+h/2,[[0,'#d1cdd5'],[.42,'#9899ae'],[1,'#666f88']]),'#ccd0dc',3);
 const pad=['#7a8faa','#927f90','#6f9d78','#baa24e'][team]||'#7a8faa';plate(c,x-w/2+8,y-h/2+8,w-16,h-16,pad,'#474e68',2);
 for(const sign of [-1,1])line(c,x+sign*(w/2-6),y-h/2+8,x+sign*(w/2-6),y+h/2-8,'#eee4bfaa',1);
 for(const dx of [-1,1])for(const dy of [-1,1])ellipse(c,x+dx*(w/2-8),y+dy*(h/2-7),1.8,1.8,'#d8bd83');
}}
function castleCrown(c,x,y,size=1,color='#e9c77b'){c.save();c.translate(x,y);c.scale(size,size);poly(c,[[-15,-8],[-7,-2],[0,-13],[7,-2],[15,-8],[11,10],[-11,10]],color,'#73582e',1.5);line(c,-10,6,10,6,'#fff0b6',1.5);c.restore();}
function castleMasonry(c,x,y,w,h,scale=1){
 c.fillStyle=gradient(c,x,y,x+w,y+h,[[0,'#9aa4ae'],[.5,'#7c8b9d'],[1,'#556575']]);c.fillRect(x,y,w,h);
 c.save();c.beginPath();c.rect(x,y,w,h);c.clip();const rh=15*scale,cw=33*scale;
 for(let r=0;r<h/rh;r++)for(let xx=x-(r%2)*cw/2;xx<x+w;xx+=cw){const v=(r+Math.floor((xx-x)/cw))%3;bevel(c,xx+.7,y+r*rh+.7,cw-1.4,rh-1.4,v===0?'#929fad':v===1?'#8391a1':'#78879a','#c3c6c969','#3a4c6544');}
 c.restore();
}
function castleTurret(c,x,y,team){
 ellipse(c,x+7,y+14,37,19,'#172a426e');
 c.fillStyle=gradient(c,x-32,y,x+32,y,[[0,'#3a5068'],[.2,'#8da1b6'],[.48,'#b4bcc4'],[.8,'#687c95'],[1,'#364d6a']]);c.fillRect(x-28,y-49,56,62);
 for(let yy=y-36;yy<y+10;yy+=14){line(c,x-27,yy,x+27,yy,'#40526b',1.3);for(let xx=x-19;xx<x+26;xx+=19)line(c,xx,yy,xx,yy+12,'#35485e88',1);}
 ellipse(c,x,y-49,29,12,'#bcc5cd');ellipse(c,x,y-51,23,8,'#31445c');
 for(const dx of [-25,-8,9,26])bevel(c,x+dx-5,y-63,11,15,'#a6b5c6','#f0e1c5','#3c5774');
 plate(c,x-8,y-29,16,26,'#223a53','#c3b589',4);bevel(c,x-1,y-28,2,21,'#dfbb75','#fff0bd','#705637');
 // A slate cone and pennant give the keep a clear castle silhouette.
 poly(c,[[x-33,y-62],[x,y-97],[x+33,y-62]],team?'#a84a5a':'#31639c','#e0c18a',2);
 poly(c,[[x,y-96],[x+32,y-62],[x+2,y-63]],team?'#713b53':'#294a7d');
 line(c,x,y-104,x,y-92,'#c8b689',2);poly(c,[[x,y-107],[x+20,y-103],[x,y-98]],team?'#ce666d':'#559acb','#e1c891',1);
}

function rearCourtyard(c,l,castle=false){
 const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY,mid=(left+right)/2;
 for(const team of [0,1]){c.save();if(!team)c.transform(1,0,0,-1,0,640);const y=top+10;
  // Decorative rear courts stay behind the crown towers and never become collision geometry.
  for(let x=left+24;x<right-18;x+=48)bevel(c,x,y,36,13,castle?'#78899a':'#596a80',castle?'#d7cfb8':'#aab6c6','#33455a');
  for(const x of [left+54,mid,right-54]){ellipse(c,x,y+38,20,7,castle?'#485b69':'#384b61');ellipse(c,x,y+36,14,5,castle?'#b5a97d':'#75879b');castleCrown(c,x,y+35,castle?.48:.34,castle?'#d2b66f':'#9ba9b8');}
  for(const x of [left+92,right-92]){plate(c,x-20,y+58,40,18,castle?'#536879':'#445970',castle?'#cdbd91':'#8ea1b5',5);line(c,x-14,y+67,x+14,y+67,castle?'#e6d7a9':'#a8bbcb',2);}
  c.restore();
 }
}
function rumbleBackdrop(c,l){
 const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY,w=right-left;
 c.fillStyle=gradient(c,0,top-155,0,bottom+155,[[0,'#19283d'],[.25,'#42576a'],[.5,'#637584'],[.75,'#42576a'],[1,'#19283d']]);c.fillRect(left-100,top-155,w+200,bottom-top+310);
 // Recessed stone halls, symmetrical keep walls, gates and battlements.
 for(const team of [0,1]){c.save();if(!team)c.transform(1,0,0,-1,0,640);
  castleMasonry(c,left-65,top-128,w+130,109,1.2);
  for(const y of [top-112,top-32])bevel(c,left-67,y,w+134,9,'#b8b6ab','#e5d7bd','#46566a');
  for(let x=left-65;x<right+65;x+=27)bevel(c,x,top-144,19,25,'#a4b2c0','#eee3cb','#4d627b');
  for(const x of [left+105,right-105]){plate(c,x-17,top-105,34,51,'#192e45','#b4c0c8',10);line(c,x,top-99,x,top-60,'#617c95',2);line(c,x-10,top-80,x+10,top-80,'#617c95',2);}
  // Central portcullis stays fully outside the walkable rear aisle.
  plate(c,240-48,top-111,96,94,'#2c4259','#d0b383',18);plate(c,240-38,top-102,76,81,'#152a40','#637184',15);
  for(let xx=207;xx<279;xx+=11)line(c,xx,top-90,xx,top-23,'#a18d69',2);for(const yy of [top-79,top-60,top-40])line(c,204,yy,276,yy,'#8d7f65',2);
  castleCrown(c,240,top-123,.75);for(const x of [left-18,right+18])castleTurret(c,x,top-5,team);
  c.restore();
 }
 for(const x of [left-61,right+23]){castleMasonry(c,x,top+15,38,bottom-top-30);for(let y=top+32;y<bottom-25;y+=78){plate(c,x+3,y,32,53,'#647d96','#b2bdc4',5);plate(c,x+12,y+8,14,31,'#263e57','#9cafc1',4);}}
 // Underlying heavy plinth establishes depth without becoming a nav obstacle.
 plate(c,left-19,top-11,w+38,bottom-top+30,'#293e53','#182d42',15);
 plate(c,left-10,top-9,w+20,bottom-top+18,'#c2b695','#645b4c',9);
}
function rumbleFloor(c,l){
 const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY;
 c.fillStyle='#6c7a89';c.fillRect(left,top,right-left,bottom-top);
 c.save();c.beginPath();c.rect(left,top,right-left,bottom-top);c.clip();
 // Paired limestone pavers, mirrored down the court. No center river or barrier.
 const fill=['#a9b1b4','#b9bfc0','#9daab3','#b0b9bd'];
 for(let row=Math.floor(l.top);row<l.bottom;row++)for(let col=Math.floor(l.left);col<l.right;col++){const ry=Math.min(row,31-row),cx=Math.min(col,17-col),n=Math.abs((ry*7+cx*13)%4);bevel(c,col*SX+.65,row*SY+.65,SX-1.3,SY-1.3,fill[n],'#eff1e74d','#46566a36');}
 for(const team of [0,1]){c.save();if(!team)c.transform(1,0,0,-1,0,640);
  // Receding arched team inlays follow the actual formation, not guessed tiles.
  const row=l.lanes.map((x,i)=>[x*SX,(l.princessY[i]+2.1)*SY]);
  c.strokeStyle=team?'#97596855':'#36759955';c.lineWidth=22;c.lineJoin='round';c.beginPath();row.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
  c.strokeStyle='#e8d9b177';c.lineWidth=1.5;c.stroke();
  for(let i=0;i<5;i++){const x=l.lanes[i]*SX,ky=(l.kingYs?.[i]??l.kingY)*SY,py=l.princessY[i]*SY;
   line(c,x,ky+36,x,py-28,'#5a62724d',35);line(c,x-18,ky+36,x-18,py-28,'#e5d8b499',1);line(c,x+18,ky+36,x+18,py-28,'#e5d8b499',1);
   const y=py+76;poly(c,[[x-14,y],[x,y+8],[x+14,y],[x+11,y+16],[x,y+23],[x-11,y+16]],team?'#af7a8255':'#5888a455','#ede0b555',1);
  }
  c.restore();
 }
 // Carved center seal is a floor decoration, not a building or collision zone.
 for(const [radius,color]of [[67,'#46596c66'],[59,'#8c999f'],[54,'#d7c79b'],[51,'#7b8d9f'],[43,'#919da9']])ellipse(c,240,320,radius,radius*.71,color);
 for(let i=0;i<20;i++){const a=i*Math.PI/10;line(c,240+Math.cos(a)*53,320+Math.sin(a)*37.5,240+Math.cos(a)*59,320+Math.sin(a)*42,'#6b6a62',1.2);}
 castleCrown(c,240,320,2.3,'#cfb271');
 for(const x of [left+3,right-3])line(c,x,top+3,x,bottom-3,'#ded0aa',2);
 c.restore();
}
function castleScenery(c,f,l,lib){
 const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY;
 // All tall props are outside the radius-aware floor; front layers never mask a lane.
 stoneRails(f,l);
 if(l.theme==='moon-castle'){for(const [y,name]of [[top+26,'lunar_mountain_01'],[bottom+45,'lunar_mountain_04']])for(const x of [left-40,right+40])prop(c,lib,'level_lunar_arena_dl',name,x,y,88,135,x>240);for(const y of [top+95,bottom-70])for(const x of [left-26,right+26])prop(c,lib,'level_lunar_arena_dl','lunar_lantern_01',x,y,38,58,x>240);}
 else{for(const [y,team]of [[top-13,1],[bottom+121,0]])for(const x of [left+38,right-38])prop(c,lib,'level_royal_arena',team?'royal_red_tower1':'royal_blue_tower1',x,y,83,117,x>240);for(const y of [120,520])for(const x of [left-33,right+33])prop(c,lib,'level_royal_arena','royal_blocktree',x,y,41,61,x>240);}
 for(const y of [55,250,390,585])for(const x of [left-12,right+12]){plate(f,x-5,y-3,10,19,'#4b5261','#d7b985',2);ellipse(f,x,y-1,7,3,'#cfab70');}
 for(const [y,team]of [[top-21,1],[bottom+34,0]])for(const x of [left+105,right-105]){plate(f,x-14,y-22,28,46,team?'#8c4155':'#2b6695','#d7bb7c',4);castleCrown(f,x,y-4,.58);}
}
function goldFrame(c,left,right,top=0,bottom=640){
 const x=left-23,w=right-left+46,h=bottom-top;c.save();c.shadowColor='#314367bb';c.shadowBlur=15;c.shadowOffsetY=13;plate(c,x,top-19,w,h+38,'#80501f','#633f26',19);c.restore();
 plate(c,x,top-24,w,h+38,gradient(c,x,top-24,x+w,bottom,[[0,'#ffda75'],[.18,'#d99428'],[.36,'#ffc04a'],[.65,'#e69b2c'],[1,'#ffd074']]),'#99622c',18);
 plate(c,x+4,top-20,w-8,h+30,null,'#fff3a5',16);plate(c,left-6,top-4,right-left+12,h+8,'#413649','#735340',5);
 for(const px of [left-21,right+11]){c.fillStyle=gradient(c,px,0,px+12,0,[[0,'#b97424'],[.25,'#ffde81'],[.5,'#ffec9d'],[.78,'#e4a131'],[1,'#ad6722']]);c.fillRect(px,top,11,h);line(c,px+2,top,px+2,bottom,'#fff4b1',1);}
}
function diamond(c,x,y){c.save();c.translate(x,y);poly(c,[[0,-29],[29,0],[0,29],[-29,0]],'#af7130','#684925',2);poly(c,[[0,-25],[25,0],[0,25],[-25,0]],gradient(c,-20,-20,20,20,[[0,'#ffefb1'],[.45,'#ffc659'],[1,'#d58e2c']]),'#ffe29a',2);c.rotate(Math.PI/4);c.strokeStyle='#925a26';c.lineWidth=5;c.beginPath();c.moveTo(-10,12);c.lineTo(-10,-10);c.lineTo(10,-10);c.lineTo(10,8);c.lineTo(0,8);c.lineTo(0,-1);c.stroke();c.strokeStyle='#fff0ad';c.lineWidth=1.4;c.stroke();c.restore();}
function frozenInlays(c,left,right){
 for(const team of [0,1]){c.save();if(team)c.transform(1,0,0,-1,0,640);const top=178,bottom=294,mid=(left+right)/2;
  poly(c,[[left+4,bottom],[left+4,top+60],[mid-17,top],[mid-17,bottom-43]],gradient(c,left,top,mid,bottom,[[0,'#f9f8ff'],[.65,'#e1e0ef'],[1,'#a6aac4']]),'#7d7c94',1.5);
  poly(c,[[right-4,bottom],[right-4,top+60],[mid+17,top],[mid+17,bottom-43]],gradient(c,mid,top,right,bottom,[[0,'#f8f6ff'],[.5,'#e0e1ef'],[1,'#aaafc9']]),'#7d7c94',1.5);
  line(c,left+6,bottom-5,mid-20,top+8,'#fff',1.5);line(c,right-6,bottom-5,mid+20,top+8,'#fff',1.5);c.restore();
 }
 // Central purple-gold paved spine, visible between the aligned towers.
 c.fillStyle='#514459';c.fillRect(224,95,32,450);for(let y=98;y<544;y+=11){bevel(c,227,y,26,9,'#a896b0','#e1cad6','#6a546d');poly(c,[[229,y+1],[240,y+7],[251,y+1],[251,y+4],[240,y+10],[229,y+4]],'#d6bdc1');}line(c,224,95,224,545,'#ccb776',2);line(c,256,95,256,545,'#ccb776',2);
}
function crossings(c,l,icy){if(l.river===false)return;const left=l.left*SX,right=l.right*SX,y=l.riverTop*SY,h=(l.riverBottom-l.riverTop)*SY;
 c.fillStyle=gradient(c,0,y,0,y+h,[[0,icy?'#607597':'#1c2738'],[.5,icy?'#95afca':'#3c6173'],[1,icy?'#485c80':'#142d41']]);c.fillRect(left,y,right-left,h);
 if(icy){bevel(c,left,y+13,right-left,16,gradient(c,0,y+13,0,y+29,[[0,'#ffffbf'],[.2,'#e9b844'],[.7,'#bd7024'],[1,'#76522f']]),'#fff0a2','#755028');}
 else{for(let yy=y+6;yy<y+h;yy+=9)line(c,left+4,yy,right-4,yy,'#87b0c12d',1);for(const yy of [y-7,y+h])for(let xx=left;xx<right;xx+=24)bevel(c,xx,yy,23,7,'#74778d','#bcc2ce','#393f50');}
 for(const br of l.bridges){const x=br.left*SX,w=(br.right-br.left)*SX;
  c.save();c.shadowColor='#142c446e';c.shadowBlur=7;c.shadowOffsetY=9;c.fillStyle='#272b45';c.fillRect(x-2,y-8,w+4,h+16);c.restore();
  bevel(c,x,y-9,w,h+18,icy?'#887087':'#767888','#d2c6d2','#36364d');
  for(let yy=y-6;yy<y+h+6;yy+=10)bevel(c,x+4,yy,w-8,8,icy?'#a68b9a':'#999bab','#d4c5cf','#57516c');
  const gutter=icy?8:5;for(const xx of [x+1,x+w-gutter-1])bevel(c,xx,y-12,gutter,h+24,icy?'#bf9d74':'#717b8b',icy?'#f7dba1':'#d3dbe2','#3e3a4c');
  for(let yy=y-6;yy<y+h;yy+=14)for(let xx=x+gutter+3;xx<x+w-gutter-3;xx+=17){line(c,xx,yy,xx+11,yy+11,icy?'#e2c2b1':'#333d55',3);line(c,xx+11,yy,xx,yy+11,icy?'#6d516c':'#c0c6d1',2);}
  for(const xx of [x+4,x+w-4])for(const yy of [y-10,y+h+10]){ellipse(c,xx,yy,3,3,icy?'#ffe6a8':'#cad4dd');ellipse(c,xx,yy,1,1,'#76687a');}
 }
}
function stoneRails(c,l){const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY,theme=l.theme;
 const p=theme==='jungle'?['#53664d','#a9b58b','#263e2b']:theme==='volcano'||theme==='lava'?['#30242a','#bd7245','#100e14']:theme==='moon-castle'?['#46416a','#b0a0e1','#1c1935']:theme==='river-fort'?['#536e79','#d5c58d','#253c48']:theme==='bastion'?['#776777','#dfc992','#3c3247']:['#8895a1','#ead4a3','#394e63'];
 for(const x of [left-15,right+3])for(let y=top-6,row=0;y<bottom+5;y+=31,row++){bevel(c,x,y,12,29,...p);if(row%3===0)bevel(c,x-4,y,20,13,p[0],p[1],p[2]);
  if(theme==='jungle'){ellipse(c,x+6,y+7,9,4,'#365d32');line(c,x+5,y+8,x+8,y+26,'#8da85d',1.4);}else if(theme==='volcano'||theme==='lava'){poly(c,[[x+2,y+6],[x+8,y+12],[x+3,y+20]],null,'#f38740',1.2);}else if(theme==='moon-castle'){poly(c,[[x+6,y+6],[x+10,y+13],[x+6,y+20],[x+2,y+13]],'#9d8acf','#d1c4ff',1);}else if(theme==='river-fort'){ellipse(c,x+6,y+18,2.5,2.5,'#d5bf73');}else{line(c,x+1,y+6,x+11,y+6,p[1],1.5);}
 }
 for(const y of [top-10,bottom+4])for(let x=left-14;x<right+16;x+=31)bevel(c,x,y,29,13,...p);
}
function outerEnvironment(c,l){
 const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY,theme=l.theme;
 c.save();
 // Dense scenery fills the rear and side margins. It is cached once, and
 // remains outside the walkable rectangle shared with the battle simulation.
 for(let y=top-143,row=0;y<bottom+151;y+=67,row++)for(let x=left-88,col=0;x<right+105;x+=74,col++){
  if(x>left-32&&x<right+32&&y>top-25&&y<bottom+25)continue;
  const xx=x+(row%2)*16,yy=y+Math.sin(col*3+row)*9;
  if(theme==='jungle'||theme==='garden'){
   ellipse(c,xx+5,yy+18,37,12,'#162f2c66');line(c,xx,yy+5,xx+5,yy+30,'#5a5137',7);ellipse(c,xx,yy,35,22,theme==='jungle'?'#234d32':'#346346');ellipse(c,xx-10,yy-13,24,17,theme==='jungle'?'#38694a':'#588c50');ellipse(c,xx+13,yy-20,18,13,theme==='jungle'?'#477e50':'#78a55e');
   if(theme==='garden')for(let i=0;i<4;i++)ellipse(c,xx-17+i*11,yy-8+(i%2)*6,3,2,['#ef9ab8','#ebd785'][i%2]);else line(c,xx-13,yy+8,xx-18,yy+34,'#708d4a',2);
  }else if(theme==='volcano'||theme==='lava'){
   ellipse(c,xx,yy+20,31,11,'#f4662655');poly(c,[[xx-32,yy+16],[xx-21,yy-14],[xx+3,yy-32],[xx+29,yy+9],[xx+16,yy+24]],'#282027','#614039',1.5);poly(c,[[xx-21,yy-14],[xx+3,yy-32],[xx-2,yy+9]],'#443137');line(c,xx-10,yy+3,xx+4,yy-3,'#ed693f',1.6);line(c,xx+4,yy-3,xx+11,yy+13,'#b04430',1.2);
  }else if(theme==='ice'){
   poly(c,[[xx-32,yy+26],[xx-12,yy-23],[xx+5,yy-37],[xx+30,yy+23]],'#8aa7cc','#d8e7f8',1.5);poly(c,[[xx-12,yy-23],[xx+5,yy-37],[xx+11,yy+16]],'#d4e4f6');snow(c,xx,yy+23,59,19);
  }else if(theme==='moon-castle'){
   poly(c,[[xx-35,yy+23],[xx-19,yy-18],[xx,yy-43],[xx+33,yy+25]],'#252c4b','#535575',1);poly(c,[[xx,yy-43],[xx+33,yy+25],[xx+4,yy+11]],'#3a3e62');ellipse(c,xx-10,yy-24,1.7,1.7,'#c4c2ff');
  }else if(theme==='river-fort'){
   ellipse(c,xx,yy+14,35,11,'#2a566b66');ellipse(c,xx,yy+12,27,6,'#8cb3bd55');plate(c,xx-17,yy-15,34,27,'#5c727b','#a9af9a',5);line(c,xx-10,yy-2,xx+10,yy-2,'#d3c18b',1);
  }else{
   ellipse(c,xx+5,yy+22,34,10,'#14253c55');plate(c,xx-25,yy-16,50,36,theme==='bastion'?'#4b4f66':'#4a6074','#8792a0',6);poly(c,[[xx-30,yy-17],[xx,yy-39],[xx+30,yy-17]],theme==='bastion'?'#6f4660':'#36506c','#aba187',1);for(const xx1 of [xx-13,xx+13])bevel(c,xx1-3,yy-8,6,14,'#26394d','#ac9b78','#1b2a3b');
  }
 }
 c.restore();
}
function themedSourceScenery(c,l,lib){
 const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY,theme=l.theme;
 for(const side of [-1,1]){const x=side<0?left-43:right+43;
  if(theme==='jungle'){for(const y of [top+20,bottom+30])prop(c,lib,'level_jungle_arena','jungle_statue_01',x,y,63,89,side>0);for(const [y,team] of [[top+(bottom-top)*.3,'red'],[top+(bottom-top)*.76,'blue']])prop(c,lib,'level_jungle_arena',`jungle_stand_01_${team}_${side<0?'left':'right'}`,x,y,70,105,side>0);}
  else if(theme==='volcano'){for(const [y,team] of [[top+18,'top'],[bottom+40,'bottom']])prop(c,lib,'level_dark_arena',`dark_pekka_${team}_${side<0?'left':'right'}`,x,y,66,92);for(const [y,team] of [[top+(bottom-top)*.3,'red'],[top+(bottom-top)*.76,'blue']])prop(c,lib,'level_dark_arena',side<0?(team==='red'?'dark_stand_left_red':'dark_stand_blue_left'):`dark_stand_${team}_right`,x,y,72,105);}
  else{for(const [y,team] of [[top+19,'red'],[bottom+70,'blue']])prop(c,lib,'level_royal_arena',`royal_${team}_tower1`,x,y,68,96,side>0);for(const y of [top+(bottom-top)*.35,top+(bottom-top)*.75])prop(c,lib,'level_royal_arena',side<0?'royal_sidestand_left':'royal_sidestand_right',x,y,71,106,side>0);}
 }
}
function makeSurface(density,l){const custom=l?.custom,rect=custom?{x:l.left*SX-105,y:l.top*SY-155,width:(l.right-l.left)*SX+210,height:(l.bottom-l.top)*SY+310}:{x:-120,y:-140,width:720,height:920},cv=root.document.createElement('canvas');cv.worldRect=rect;cv.width=Math.round(rect.width*density);cv.height=Math.round(rect.height*density);const c=cv.getContext('2d');c.scale(density,density);c.translate(-rect.x,-rect.y);return[cv,c];}

function themeDetails(c,f,l){const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY,theme=l.theme||'';
 if(theme==='jungle'){
  c.fillStyle='#2f61355c';c.fillRect(left,top,right-left,bottom-top);
  // Layered canopy, ruined temple blocks and dangling vines keep the jungle map visually distinct.
  for(const side of [-1,1])for(let y=top+12;y<bottom;y+=58){const x=side<0?left-18:right+18;ellipse(f,x,y,24,13,'#285e3a');ellipse(f,x+side*8,y-9,17,10,'#4fa85a');line(f,x,y+8,x+side*18,y+34,'#7a5b36',3);for(let k=0;k<3;k++)line(f,x+side*(6+k*5),y+5,x+side*(10+k*6),y+28+k*3,'#456f39',1.5);}
  for(let x=left+28;x<right-20;x+=72)for(const y of [top+47,bottom-47]){plate(c,x-13,y-8,26,17,'#6f7f68','#a6b095',4);ellipse(c,x,y-11,10,4,'#3d6c3f');line(c,x-7,y-11,x+7,y-11,'#b2d17d',1);}
  for(const x of [left+48,right-48])for(const y of [top+96,bottom-96]){plate(f,x-12,y-20,24,40,'#69756d','#a8b39b',5);castleCrown(f,x,y-2,.28,'#d7c87a');}
 }
 else if(theme==='volcano'||theme==='lava'){
  c.fillStyle='#5d241b55';c.fillRect(left,top,right-left,bottom-top);
  for(const side of [-1,1])for(let y=top+20;y<bottom;y+=67){const x=side<0?left-20:right+20;ellipse(f,x,y,20,9,'#251d25');poly(f,[[x-15,y],[x,y-31],[x+15,y]],'#493039','#1b141a',1);poly(f,[[x-5,y-6],[x,y-24],[x+5,y-6]],'#ff7b28');}
  for(let i=0;i<16;i++){const x=left+24+(i*53)%(right-left-48),y=top+35+(i*71)%(bottom-top-70);line(c,x,y,x+14,y+8,'#ff693a88',2);if(i%3===0)ellipse(c,x+5,y+3,3,2,'#ffb34d');}
  for(const x of [left+48,right-48])for(const y of [top+91,bottom-91]){plate(f,x-11,y-18,22,36,'#33282e','#7b4d3a',4);ellipse(f,x,y-15,8,4,'#ff6a2b');}
 }
 else if(theme==='garden'){
  c.fillStyle='#4f7d4850';c.fillRect(left,top,right-left,bottom-top);
  for(const side of [-1,1])for(let y=top+30;y<bottom-20;y+=72){const x=side<0?left-22:right+22;ellipse(f,x,y,24,13,'#2e6f3e');ellipse(f,x,y-8,17,9,'#4f9b57');for(let a=0;a<7;a++){const ang=a*Math.PI*2/7;ellipse(f,x+Math.cos(ang)*15,y-8+Math.sin(ang)*8,4,3,['#ff91c1','#f4df69','#87c9ff'][a%3]);}}
  for(const y of [top+76,bottom-76])for(const x of [left+42,right-42]){ellipse(f,x,y,18,6,'#769b7c');ellipse(f,x,y-5,10,4,'#9fd0e6');line(f,x,y-3,x,y-21,'#d9f4ff',2);}
 }
 else if(theme==='moon-castle'){
  c.fillStyle='#4a3b7050';c.fillRect(left,top,right-left,bottom-top);
  for(let i=0;i<28;i++){const x=left+((i*83)%Math.max(1,right-left)),y=top+((i*47)%Math.max(1,bottom-top));ellipse(c,x,y,1+(i%3)*.45,1+(i%3)*.45,i%5===0?'#efe4ff':'#a9b5e8');}
  for(const side of [-1,1])for(const y of [top+32,bottom-32]){const x=side<0?left-40:right+40;ellipse(f,x,y,25,25,'#d9ddff');ellipse(f,x+8,y-6,24,24,'#4c5377');}
  for(const y of [top+78,bottom-78])for(const x of [left+44,right-44]){plate(f,x-9,y-18,18,35,'#55567a','#aaa5d7',4);ellipse(f,x,y-15,7,5,'#b7a3ff');}
 }
 else if(theme==='river-fort'){
  c.fillStyle='#315c7550';c.fillRect(left,top,right-left,bottom-top);
  for(let x=left+20;x<right;x+=64)for(const y of [top+20,bottom-20]){plate(f,x-12,y-10,24,20,'#6d7d87','#d1c59a',4);castleCrown(f,x,y,.32);}
  for(const side of [-1,1])for(let y=top+72;y<bottom-40;y+=96){const x=side<0?left-34:right+34;plate(f,x-16,y-18,32,36,'#4f6878','#b9b18e',6);line(f,x-10,y,x+10,y,'#d9d0a3',2);ellipse(f,x,y-18,11,5,'#5c7890');}
  for(let y=l.riverTop*SY+4;y<l.riverBottom*SY;y+=9)line(c,left+3,y,right-3,y,'#9fd2e733',1);
 }
}
function touchdownField(c,f,l,lib,back=c){const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY,w=right-left;
 if(stadiumReference(c,l,f,back))return'supplied-reference';
 // Graceful fallback: native Touchdown pitch with handcrafted surrounding stands.
 back.fillStyle=gradient(back,left,top,right,bottom,[[0,'#2c5644'],[.45,'#467b54'],[1,'#284a3d']]);back.fillRect(left-105,top-125,w+210,bottom-top+250);
 // Tiered spectator stands are outside the legal field and give the stadium real depth.
 for(const side of [-1,1]){const x=side<0?left-82:right+22;for(let tier=0;tier<4;tier++){plate(back,x-side*tier*8,top-35-tier*8,60+tier*8,bottom-top+70+tier*16,tier%2?'#47586b':'#39495b','#b9a978',10);for(let y=top+12;y<bottom-6;y+=42)for(let n=0;n<3;n++)ellipse(back,x+18+n*13-side*tier*3,y+(n%2)*5,3.2,3.2,['#d85a68','#5c8fcb','#d6b54d'][n]);}}
 // Original Barbarian Bowl architecture supplies the stadium's textured side stands.
 const standH=Math.min(176,(bottom-top)*.28);for(const side of [-1,1]){const x=side<0?left-68:right+68;prop(f,lib,'level_barbarian_arena',side<0?'barbarian_blue_sidestand_left':'barbarian_red_sidestand_right',x,(top+bottom)/2-135,118,standH,side>0);prop(f,lib,'level_barbarian_arena',side<0?'barbarian_blue_sidestand_right':'barbarian_red_sidestand_left',x,(top+bottom)/2+135,118,standH,side>0);for(const y of [top+34,bottom-34])prop(f,lib,'level_barbarian_arena','barbarian_tower1',x,y,62,82,side>0);}
 plate(c,left-18,top-14,w+36,bottom-top+28,'#23384a','#cdb974',14);c.fillStyle='#6d9a69';c.fillRect(left,top,w,bottom-top);
 for(let row=Math.floor(l.top);row<l.bottom;row++)for(let col=Math.floor(l.left);col<l.right;col++){c.fillStyle=(row+col)%2?'#75a975':'#6c9e6b';c.fillRect(col*SX,row*SY,SX,SY);}
 const nativePitch=nativeTouchdownPitch(c,l,lib);
 for(let y=top+40;y<bottom-30;y+=60){line(c,left+8,y,right-8,y,'#e9f0d7aa',2);for(let x=left+24;x<right;x+=80)line(c,x,y-5,x,y+5,'#f7f3d0aa',1);}
 for(const [y,color] of [[l.goalTop*SY,'#507ec1'],[l.goalBottom*SY,'#b84e58']]){c.fillStyle=color+'88';c.fillRect(left,y-27,w,54);line(c,left,y,right,y,'#fff7c9',4);for(let x=left+18;x<right;x+=48)castleCrown(c,x,y,.26,'#f4d879');plate(f,(left+right)/2-44,y-39,88,13,color,'#f1dca3',4);}
 // Midfield crest and side pylons are foreground-only decorations.
 ellipse(c,(left+right)/2,(top+bottom)/2,44,28,'#567f61');ellipse(c,(left+right)/2,(top+bottom)/2,33,21,'#d5c27d');castleCrown(c,(left+right)/2,(top+bottom)/2,.85,'#f3df91');
 for(const side of [-1,1])for(let y=top+15;y<bottom;y+=52){const x=side<0?left-29:right+29;plate(f,x-13,y,26,36,'#53647b','#dfd1aa',5);bevel(f,x-8,y+6,16,17,'#a75664','#f1d3a2','#3e4c5d');}
 // Touchdown trapdoor: top/bottom metal panels echo the original stadium's Tesla entrances.
 for(const y of [top-34,bottom+34]){plate(f,(left+right)/2-34,y-11,68,22,'#34485a','#c4b47e',5);for(let x=(left+right)/2-24;x<=(left+right)/2+24;x+=12)line(f,x,y-7,x,y+7,'#182938',2);line(f,(left+right)/2-26,y,(left+right)/2+26,y,'#d8c89988',1);}
 // End-zone spectator terraces make the stadium read as an enclosed arena, not a flat field.
 for(const y of [top-72,bottom+72]){for(let tier=0;tier<3;tier++){const yy=y+(y<top?-tier*10:tier*10);plate(f,left+22-tier*7,yy-8,w-44+tier*14,16,tier%2?'#485a68':'#354856','#d3be82',4);for(let x=left+38;x<right-30;x+=34)ellipse(f,x+(tier%2)*8,yy,3,3,['#d75c64','#5e8ec2','#e0bb46','#7caf65'][(Math.floor(x/34)+tier)%4]);}}
 // Touchdown corner statue: four football-Barbarian-style stone figures at the field corners.
 for(const y of [top-47,bottom+47])for(const x of [left+22,right-22]){const sy=y<top?1:-1;plate(f,x-12,y-12,24,24,'#596a78','#d7c891',5);ellipse(f,x,y+sy*5,8,8,'#b9aa83');poly(f,[[x-9,y+sy*2],[x,y+sy*18],[x+9,y+sy*2]],'#8d7b5d','#d6c48d',1.3);ellipse(f,x+7,y-sy*6,4,4,'#d8bc65');}
 for(const team of [0,1]){const y=team?top-22:bottom+22;for(const x of [left+38,right-38]){line(f,x,y-8,x,y+24,'#d5c08f',2);poly(f,[[x,y-6],[x+20,y-2],[x+18,y+18],[x,y+14]],team?'#b64e61':'#3f7db1','#e8d399',1);}}
 return nativePitch?'native-pitch':'handcrafted-fallback';
}
function ffaField(c,f,l){const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY,w=right-left,h=bottom-top;c.fillStyle=gradient(c,left,top,right,bottom,[[0,'#343f55'],[.5,'#60708a'],[1,'#30394c']]);c.fillRect(left-105,top-115,w+210,h+230);plate(c,left-16,top-15,w+32,h+30,'#29394e','#c8b77e',12);floorTiles(c,left,right,false,l.top,l.bottom);const colors=['#327bc1','#ba4858','#3f9b59','#d2af36'];
 // Four independent corner keeps clearly identify the teams without altering collision geometry.
 for(const row of l.ffaTeams){const [kx,ky]=row.king,tx=kx*SX,ty=ky*SY;c.globalAlpha=.18;c.fillStyle=colors[row.team];const rightSide=tx>(left+right)/2,bottomSide=ty>(top+bottom)/2;c.fillRect(rightSide?(left+right)/2:left,bottomSide?(top+bottom)/2:top,w/2,h/2);c.globalAlpha=1;const sx=rightSide?1:-1,sy=bottomSide?1:-1;plate(f,tx+sx*35-22,ty+sy*34-18,44,36,'#53647b','#d6c488',7);for(let i=-1;i<=1;i++)bevel(f,tx+sx*35+i*13-5,ty+sy*34-29,10,13,colors[row.team],'#f0dca1','#31445a');castleCrown(c,tx,ty+sy*46,.6,colors[row.team]);line(f,tx+sx*16,ty,tx+sx*42,ty,'#d4c69d',3);}
 // Cross moat with the requested brown bridge language and a carved central ring.
 c.fillStyle='#233f62';c.fillRect(left,l.riverTop*SY,w,(l.riverBottom-l.riverTop)*SY);c.fillRect(l.verticalRiverLeft*SX,top,(l.verticalRiverRight-l.verticalRiverLeft)*SX,h);
 for(const br of l.bridges){bevel(c,br.left*SX,l.riverTop*SY-5,(br.right-br.left)*SX,(l.riverBottom-l.riverTop)*SY+10,'#8a6443','#d8b67c','#49382e');}
 for(const br of l.verticalBridges||[]){bevel(c,l.verticalRiverLeft*SX-5,br.top*SY,(l.verticalRiverRight-l.verticalRiverLeft)*SX+10,(br.bottom-br.top)*SY,'#8a6443','#d8b67c','#49382e');}
 ellipse(c,(left+right)/2,(top+bottom)/2,44,44,'#445369');ellipse(c,(left+right)/2,(top+bottom)/2,34,34,'#b7a86f');ellipse(c,(left+right)/2,(top+bottom)/2,26,26,'#56647a');
 for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;line(c,(left+right)/2+Math.cos(a)*26,(top+bottom)/2+Math.sin(a)*26,(left+right)/2+Math.cos(a)*43,(top+bottom)/2+Math.sin(a)*43,'#dfcc8e',3);}
 for(const side of [-1,1])for(let y=top+20;y<bottom;y+=76){const x=side<0?left-22:right+22;plate(f,x-13,y,26,38,'#51647c','#e1cb91',5);}
 for(const row of l.ffaTeams){const [kx,ky]=row.king;const x=kx*SX,y=ky*SY;line(f,x,y-48,x,y-20,'#d5c18c',2);poly(f,[[x,y-46],[x+18,y-42],[x+16,y-25],[x,y-29]],colors[row.team],'#ead69b',1);}
}
function build(l,lib,density){const [cv,c]=makeSurface(density,l),[front,f]=makeSurface(density,l),bridgeMap=l.id.startsWith('BridgeBattle'),icy=bridgeMap&&l.theme==='ice',lavaBridge=bridgeMap&&l.theme==='lava',gardenBridge=bridgeMap&&l.theme==='garden',rumble=l.id.startsWith('TeamRumble'),touch=!!l.touchdown,ffa=!!l.ffa,left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY;cv.foreground=front;cv.river=l.river!==false;cv.crossings=cv.river?l.bridges.length:0;cv.foundations=foundationSlots(l);
 if(!touch){c.fillStyle=icy?'#cfdded':lavaBridge?'#24151a':gardenBridge?'#6f936f':'#293d55';c.fillRect(cv.worldRect.x,cv.worldRect.y,cv.worldRect.width,cv.worldRect.height);sourceArenaBackdrop(c,lib,l);}
 if(touch){const [background,back]=makeSurface(density,l);cv.background=background;back.fillStyle='#172a3b';back.fillRect(cv.worldRect.x,cv.worldRect.y,cv.worldRect.width,cv.worldRect.height);cv.stadiumArt=touchdownField(c,f,l,lib,back);}else if(ffa){ffaField(c,f,l);}else{if(bridgeMap){if(icy){icyBackdrop(c,left,right);goldFrame(c,left,right,top,bottom);}else if(lavaBridge){lavaBackdrop(c,left,right);causewayFrame(c,left,right,top,bottom,'lava');}else{gardenBackdrop(c,left,right);causewayFrame(c,left,right,top,bottom,'garden');}}else if(rumble){if(l.theme==='moon-castle')moonKeepBackdrop(c,l);else if(l.theme==='river-fort')fourBridgesBackdrop(c,l);else rumbleBackdrop(c,l);}else{if(l.theme==='jungle')jungleCitadelBackdrop(c,left,right,top,bottom);else if(l.theme==='volcano')emberFortressBackdrop(c,left,right,top,bottom);else royalBastionBackdrop(c,left,right,top,bottom);plate(c,left-18,top-16,right-left+36,bottom-top+33,l.theme==='jungle'?'#3c543f':l.theme==='volcano'?'#34262a':'#26354b',l.theme==='jungle'?'#7f936e':l.theme==='volcano'?'#7e4938':'#151d2d',10);}outerEnvironment(c,l);c.save();c.globalAlpha=1;if(icy)floorTiles(c,left,right,true,l.top,l.bottom);else themedFloor(c,l,left,right,top,bottom);c.restore();if(!bridgeMap)rearCourtyard(c,l,rumble);if(icy)frozenInlays(c,left,right);else if(!rumble&&!bridgeMap){for(const lane of l.lanes){const x=lane*SX;for(let y=top+26;y<bottom-20;y+=20)bevel(c,x-14,y,28,18,l.theme==='jungle'?'#768165':l.theme==='volcano'?'#3c3034':'#8f8294',l.theme==='volcano'?'#c07e4955':'#d2c6ac55','#28302d55');}for(const y of [top+13,bottom-32]){c.fillStyle=y<100?'#9b596c5e':'#386cab5e';c.fillRect(left+40,y,right-left-80,20);}}crossings(c,l,icy);foundations(c,cv.foundations);themeDetails(c,f,l);
 if(icy){diamond(f,left-17,320);diamond(f,right+17,320);for(const y of [top-4,bottom+4]){plate(f,left+5,y-11,right-left-10,20,gradient(f,0,y-11,0,y+9,[[0,'#cf9a56'],[.5,'#8b5b38'],[1,'#e7bc75']]),'#f9d492',6);for(const x of [left+26,right-26]){f.save();f.translate(x,y-1);f.rotate(Math.PI/4);f.strokeStyle='#f5d5a4';f.lineWidth=2;f.strokeRect(-5,-5,10,10);f.restore();}}for(const side of [-1,1])for(const [y,w,h,name]of [[132,100,185,'ice_mountain_01'],[560,142,228,'ice_mountain_02']])prop(c,lib,'level_ice_arena',name,side<0?left-74:right+74,y,w,h,side>0);for(const side of [-1,1])for(const y of [60,140,500,580])snow(f,side<0?left-37:right+37,y,34,55);for(const [x,y]of [[left-57,372],[right+57,372]]){prop(c,lib,'level_ice_arena','ice_cubegroup_02',x,y,78,85);snow(f,x,y-16,38,24);}}else if(lavaBridge){for(const side of [-1,1])for(const y of [75,185,455,565]){const x=side<0?left-40:right+40;poly(f,[[x-18,y+25],[x,y-24],[x+18,y+25]],'#302126','#8c4c37',2);ellipse(f,x,y+15,14,5,'#ff6a2b');}for(const y of [top+3,bottom-3])for(const x of [left+12,right-12]){ellipse(f,x,y,10,6,'#1b161a');ellipse(f,x,y-4,6,9,'#ff8235');}}else if(gardenBridge){for(const side of [-1,1])for(let y=top+35;y<bottom-20;y+=74){const x=side<0?left-33:right+33;ellipse(f,x,y,24,13,'#2f7444');ellipse(f,x,y-8,18,10,'#4f9b57');for(let a=0;a<5;a++){const ang=a*Math.PI*2/5;ellipse(f,x+Math.cos(ang)*15,y-8+Math.sin(ang)*8,3,3,['#ffd36f','#ef91c0','#96cfff'][a%3]);}}for(const y of [top+5,bottom-5]){plate(f,left+4,y-8,right-left-8,16,'#c7b989','#f1e2b5',5);}}else if(rumble){castleScenery(c,f,l,lib);}else{stoneRails(f,l);themedSourceScenery(c,l,lib);for(const y of [88,320,552])for(const x of [left-10,right+10]){plate(f,x-5,y-5,10,22,'#596577','#1e293b',2);ellipse(f,x,y,6,3,'#272b32');}}}
 cv.theme=l.theme||'custom';cv.detailTier='environment-v047';cv.layers=['source-arena-texture','distant-backdrop','perimeter-architecture','unique-floor','tower-foundations','raised-scenery','theme-props','ambient'];if(cv.theme==='castle'||cv.theme==='moon-castle'||cv.theme==='river-fort')cv.layers.push('castle-architecture');if(touch)cv.layers.push('touchdown-stands');if(ffa)cv.layers.push('ffa-corner-forts');return cv;}
function prepare(b,lib){const l=b.arenaLayout;if(!l?.custom)return null;const g=root.RoyaleGraphics?.current||{},rectW=(l.right-l.left)*SX+210,rectH=(l.bottom-l.top)*SY+310,wanted=Math.max(.5,Math.min(8,g.arenaScale??2)),maxPixels=wanted>4?50331648:33554432,d=Math.min(wanted,16383/rectW,16383/rectH,Math.sqrt(maxPixels/(rectW*rectH))),key=l.id+':'+(l.revision||0)+':'+d.toFixed(4);let cv=cache.get(key);if(!cv){if(cache.size>=(d>4?1:2))clear();cv=build(l,lib,d);cache.set(key,cv);}return cv;}
function draw(c,b,lib){const cv=prepare(b,lib);if(!cv)return false;const r=cv.worldRect;if(cv.background)c.drawImage(cv.background,r.x,r.y,r.width,r.height);c.drawImage(cv,r.x,r.y,r.width,r.height);return true;}
function environmentAmbient(c,l,t,g){
 const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY,w=right-left,h=bottom-top,theme=l.theme,count=g.arenaBackgrounds==='med'?20:g.arenaBackgrounds==='max'||g.arenaBackgrounds==='ultra'?72:g.arenaBackgrounds==='high'?52:36;
 c.save();c.beginPath();c.rect(left-105,top-155,w+210,h+310);c.rect(left,top,w,h);c.clip('evenodd');
 for(let i=0;i<count;i++){
  const band=i%4,speed=theme==='volcano'||theme==='lava'?26:theme==='river-fort'?12:theme==='ice'?15:6,phase=t*speed;
  let x,y;if(band===0){x=left-90+(i*17)%65;y=top-143+((i*73+phase)%(h+286));}else if(band===1){x=right+22+(i*19)%65;y=top-143+((i*71+phase)%(h+286));}else if(band===2){x=left-82+((i*43+t*4)%(w+164));y=top-145+(i*13)%110;}else{x=left-82+((i*41+t*4)%(w+164));y=bottom+35+(i*17)%110;}
  const sway=Math.sin(t*.7+i*2.4)*6,size=1.2+(i%4)*.45;c.globalAlpha=.28+(i%3)*.16;
  if(theme==='jungle'){ellipse(c,x+sway,y+Math.sin(t+i)*5,size*3,size*3,'#e7c44e22');ellipse(c,x+sway,y+Math.sin(t+i)*5,size*.65,size*.65,'#e6e795');}
  else if(theme==='volcano'||theme==='lava'){ellipse(c,x+sway,y,size*.6,size*1.4,'#ffb565');if(i%5===0){c.globalAlpha=.14;ellipse(c,x,y+12,9,13,'#ed6528');}}
  else if(theme==='garden'){ellipse(c,x+sway,y,size*1.6,size*.75,i%2?'#ffe8b5':'#edb3d3');}
  else if(theme==='ice'){ellipse(c,x+sway,y,size,size,'#f4f8ff');}
  else if(theme==='moon-castle'){c.globalAlpha=.25+.35*(1+Math.sin(t*1.3+i))*.5;ellipse(c,x,y+Math.sin(t+i)*3,size,size,'#cbc1ff');if(i%7===0){line(c,x-5,y,x+5,y,'#b5ade655',.8);line(c,x,y-5,x,y+5,'#b5ade655',.8);}}
  else if(theme==='river-fort'){ellipse(c,x+sway,y,9+(i%3)*4,1.3,'#9ed7dd');line(c,x-12+sway,y+5,x+7+sway,y+5,'#99cbd455',1);}
  else{ellipse(c,x+sway,y,size,size*.8,'#e5d5a7');}
 }
 c.restore();
 // Animated banners follow the enlarged map perimeter instead of a classic art grid.
 if(theme==='castle'||theme==='bastion'||theme==='river-fort'||theme==='moon-castle')for(const team of [0,1])for(const side of [-1,1]){
  const x=(side<0?left:right)+side*36,y=team?top+88:bottom-120,sway=Math.sin(t*1.7+y+side)*3;
  c.globalAlpha=1;line(c,x,y-9,x,y+48,'#c7b081',2);poly(c,[[x,y],[x+side*(21+sway),y+4],[x+side*(24+sway),y+42],[x+side*13,y+37],[x,y+41]],theme==='moon-castle'?(team?'#755080':'#595594'):team?'#b54f62':'#347bac','#dcc18b',1);castleCrown(c,x+side*12,y+19,.3);
 }
}
function stadiumPoint(l,x,y){
 const sx=[0,136,409,551],sy=[0,126,169,484,524,647],dx=[l.left*SX-105,l.left*SX,l.right*SX,l.right*SX+105],dy=[l.top*SY-155,l.top*SY,l.goalTop*SY,l.goalBottom*SY,l.bottom*SY,l.bottom*SY+155];
 let col=0,row=0;while(col<2&&x>sx[col+1])col++;while(row<4&&y>sy[row+1])row++;return[dx[col]+(x-sx[col])/(sx[col+1]-sx[col])*(dx[col+1]-dx[col]),dy[row]+(y-sy[row])/(sy[row+1]-sy[row])*(dy[row+1]-dy[row])];
}
function stadiumAmbient(c,l,t,g){
 if(!stadium.image){environmentAmbient(c,l,t,g);return;}
 // Small crowd, horn glints and pennants animate over the original reference.
 const crowd=g.arenaBackgrounds==='med'?16:32;for(let i=0;i<crowd;i++){
  const side=i%2,x=side?448+(i%3)*8:75+(i%3)*8,y=82+(i*43)%480,[xx,yy]=stadiumPoint(l,x,y),bounce=Math.max(0,Math.sin(t*3.5+i*1.7))*1.6;
  c.globalAlpha=.55;ellipse(c,xx,yy-bounce,1.5,2.2,['#edc847','#e75c90','#86b96d','#d0ad75'][i%4]);
 }
 for(const [x,y]of [[72,206],[435,276],[448,337],[430,348]]){const [xx,yy]=stadiumPoint(l,x,y);c.globalAlpha=.1+.07*Math.sin(t*2+x);ellipse(c,xx,yy,7,3,'#ffe6a2');}
 for(const [x,y,team]of [[111,103,1],[428,101,1],[109,518,0],[429,518,0]]){
  const [xx,yy]=stadiumPoint(l,x,y),sway=Math.sin(t*2.4+x)*1.3;c.globalAlpha=.7;poly(c,[[xx,yy],[xx+8+sway,yy+1],[xx+7+sway,yy+5],[xx,yy+4]],team?'#b83a54':'#357ab4');
 }
 c.globalAlpha=.09+.035*Math.sin(t*2);const [px,py]=stadiumPoint(l,479,244);poly(c,[[px-15,py-30],[px+14,py-24],[px+13+Math.sin(t*2)*2,py+29],[px-14,py+20]],'#c5a0ff');
}
function ambient(c,b,time){const g=root.RoyaleGraphics?.current||{};if(g.arenaAnimated===false||g.potato)return;const t=Math.floor(time*(g.arenaFps||30))/(g.arenaFps||30);c.save();if(b.arenaLayout.touchdown)stadiumAmbient(c,b.arenaLayout,t,g);else environmentAmbient(c,b.arenaLayout,t,g);c.restore();}
function drawForeground(c,b,lib,time=b.visualTime??b.time??0){const cv=prepare(b,lib);if(!cv)return false;const r=cv.worldRect;c.drawImage(cv.foreground,r.x,r.y,r.width,r.height);ambient(c,b,time);return true;}
root.RoyaleCustomArena={prepareAssets,prepare,draw,drawForeground,clear,cacheSize:()=>cache.size};
})(globalThis);
