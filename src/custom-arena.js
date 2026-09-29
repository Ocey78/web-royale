/* Hand-built custom arenas. Every walkable edge is read from ArenaLayout.
   Backdrop + floor are cached together; raised scenery is a separate cached
   foreground. Ambient snow/flames animate without rebuilding either surface. */
(function(root){'use strict';
const cache=new Map(),SX=480/18,SY=20;
function clear(){for(const cv of cache.values()){if(cv.foreground){cv.foreground.width=1;cv.foreground.height=1;}cv.width=1;cv.height=1;}cache.clear();}
function poly(c,pts,fill,edge,width=1){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(edge){c.strokeStyle=edge;c.lineWidth=width;c.stroke();}}
function line(c,x,y,xx,yy,color,w=1){c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();}
function gradient(c,x,y,xx,yy,stops,radial=false){const g=radial?c.createRadialGradient(x,y,0,x,y,Math.max(1,xx)):c.createLinearGradient(x,y,xx,yy);if(!g?.addColorStop)return stops[0][1];for(const [at,col]of stops)g.addColorStop(at,col);return g;}
function ellipse(c,x,y,rx,ry,fill){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function bevel(c,x,y,w,h,fill,light='#fff4',shade='#13233266'){c.fillStyle=fill;c.fillRect(x,y,w,h);line(c,x,y,x+w,y,light,1.2);line(c,x,y,x,y+h,light,1);line(c,x,y+h,x+w,y+h,shade,1.5);line(c,x+w,y,x+w,y+h,shade,1);}
function plate(c,x,y,w,h,fill,edge,cut=8){poly(c,[[x+cut,y],[x+w-cut,y],[x+w,y+cut],[x+w,y+h-cut],[x+w-cut,y+h],[x+cut,y+h],[x,y+h-cut],[x,y+cut]],fill,edge,2);}
function prop(c,lib,scene,name,x,y,w,h,flip=false){const sc=lib?.scenes?.[scene];if(!sc?.clip(name))return;const b=sc.bounds(name,0);if(!b?.width||!b.height)return;const scale=Math.min(w/b.width,h/b.height);c.save();c.translate(x,y);if(flip)c.scale(-1,1);c.scale(scale,scale);c.translate(-b.x-b.width/2,-b.y-b.height);sc.draw(c,name,0,{frame:0,still:true});c.restore();}
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
function fortressBackdrop(c){c.fillStyle=gradient(c,0,-80,0,720,[[0,'#171e31'],[.5,'#3c4961'],[1,'#24384c']]);c.fillRect(-80,-80,640,800);
 for(const side of [-1,1]){const x=side<0?-78:488;for(let y=-60,row=0;y<730;y+=38,row++)for(let col=0;col<3;col++){const xx=x+col*27-(row%2)*12;bevel(c,xx,y,25,35,row%3?'#59667c':'#46546c','#8b9aaf','#202b41');}for(let y=-36;y<720;y+=97){plate(c,side<0?-52:494,y,38,53,'#56647b','#19253b',5);plate(c,side<0?-46:500,y+5,26,40,'#8794a6','#354357',3);}}
 for(let y=-66;y<720;y+=76){line(c,-70,y,-8,y+40,'#151b2b66',5);line(c,488,y,550,y+40,'#151b2b66',5);}
}
function floorTiles(c,left,right,icy,top=0,bottom=32){const fills=icy?['#adb0c9','#b8bad1','#9ea2bd','#c4c6d9']:['#938eb2','#a29abd','#8786a8','#aaa4c3'];
 c.fillStyle=icy?'#6e6b84':'#595c76';c.fillRect(left,top*SY,right-left,(bottom-top)*SY);c.save();c.beginPath();c.rect(left,top*SY,right-left,(bottom-top)*SY);c.clip();
 for(let row=Math.floor(top);row<bottom;row++)for(let col=Math.floor(left/SX);col<right/SX;col++){const rr=Math.min(row,31-row),cc=Math.min(col,17-col),hash=((rr*17+cc*31)^rr)%4;bevel(c,col*SX+.7,row*SY+.7,SX-1.4,SY-1.4,fills[(hash+4)%4],icy?'#e4e4f14d':'#e4dff247','#4d526738');if((rr*11+cc*7)%23===0){line(c,col*SX+7,row*SY+2,col*SX+13,row*SY+8,'#42445e44',.8);line(c,col*SX+13,row*SY+8,col*SX+9,row*SY+13,'#42445e44',.8);}}
 c.restore();
}
// Coordinates are shared with the logical tower centers, not a separate art grid.
function foundationSlots(l){const out=[];for(const team of [0,1]){const flip=y=>team?y:32-y;for(let i=0;i<l.kings.length;i++)out.push({entity:'KingTower',team,x:l.kings[i]*SX,y:flip(l.kingYs?.[i]??l.kingY??3)*SY});for(let i=0;i<l.lanes.length;i++)out.push({entity:'PrincessTower',team,x:l.lanes[i]*SX,y:flip(l.princessY[i])*SY});}return out;}
function foundations(c,slots){for(const t of slots){const king=t.entity==='KingTower',x=t.x,y=t.y,w=king?70:58,h=king?62:54,team=t.team;
 ellipse(c,x,y+8,w*.57,h*.34,'#16233257');plate(c,x-w/2,y-h/2,w,h,'#41455c','#252f44',5);
 plate(c,x-w/2+3,y-h/2+3,w-6,h-6,gradient(c,x,y-h/2,x,y+h/2,[[0,'#d1cdd5'],[.42,'#9899ae'],[1,'#666f88']]),'#ccd0dc',3);
 plate(c,x-w/2+8,y-h/2+8,w-16,h-16,team?'#927f90':'#7a8faa','#474e68',2);
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
 for(const [y,team]of [[top-13,1],[bottom+121,0]])for(const x of [left+38,right-38])prop(c,lib,'level_royal_arena',team?'royal_red_tower1':'royal_blue_tower1',x,y,83,117,x>240);
 for(const y of [120,520])for(const x of [left-33,right+33])prop(c,lib,'level_royal_arena','royal_blocktree',x,y,41,61,x>240);
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
function stoneRails(c,l){const left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY;
 for(const x of [left-15,right+3])for(let y=top-6,row=0;y<bottom+5;y+=31,row++){bevel(c,x,y,12,29,'#7e879a','#c6cbd4','#354255');if(row%3===0)bevel(c,x-4,y,20,13,'#9ba6b6','#e8e9e9','#3d4a61');}
 for(const y of [top-10,bottom+4])for(let x=left-14;x<right+16;x+=31)bevel(c,x,y,29,13,'#717e90','#c8d0d6','#323e56');
}
function makeSurface(density,l){const rect=l?.id==='TeamRumble'?{x:l.left*SX-100,y:l.top*SY-155,width:(l.right-l.left)*SX+200,height:(l.bottom-l.top)*SY+310}:{x:-120,y:-140,width:720,height:920},cv=root.document.createElement('canvas');cv.worldRect=rect;cv.width=Math.round(rect.width*density);cv.height=Math.round(rect.height*density);const c=cv.getContext('2d');c.scale(density,density);c.translate(-rect.x,-rect.y);return[cv,c];}
function build(l,lib,density){const [cv,c]=makeSurface(density,l),[front,f]=makeSurface(density,l),icy=l.id==='BridgeBattle',rumble=l.id==='TeamRumble',left=l.left*SX,right=l.right*SX,top=l.top*SY,bottom=l.bottom*SY;cv.foreground=front;cv.river=l.river!==false;cv.crossings=cv.river?l.bridges.length:0;cv.foundations=foundationSlots(l);
 c.fillStyle=icy?'#cfdded':'#293d55';c.fillRect(-120,-140,720,920);
 if(icy){icyBackdrop(c,left,right);goldFrame(c,left,right,top,bottom);}else if(rumble){rumbleBackdrop(c,l);}else{fortressBackdrop(c);plate(c,left-18,top-16,right-left+36,bottom-top+33,'#26354b','#151d2d',10);}
 if(rumble)rumbleFloor(c,l);else floorTiles(c,left,right,icy,l.top,l.bottom);
 if(icy)frozenInlays(c,left,right);else if(!rumble){for(const lane of l.lanes){const x=lane*SX;for(let y=top+26;y<bottom-20;y+=20)bevel(c,x-14,y,28,18,'#747792','#b1b0c644','#373e5c66');}for(const y of [top+13,bottom-32]){c.fillStyle=y<100?'#9b596c5e':'#386cab5e';c.fillRect(left+40,y,right-left-80,20);}}
 crossings(c,l,icy);foundations(c,cv.foundations);
 if(icy){diamond(f,left-17,320);diamond(f,right+17,320);for(const y of [top-4,bottom+4]){plate(f,left+5,y-11,right-left-10,20,gradient(f,0,y-11,0,y+9,[[0,'#cf9a56'],[.5,'#8b5b38'],[1,'#e7bc75']]),'#f9d492',6);for(const x of [left+26,right-26]){f.save();f.translate(x,y-1);f.rotate(Math.PI/4);f.strokeStyle='#f5d5a4';f.lineWidth=2;f.strokeRect(-5,-5,10,10);f.restore();}}
  for(const side of [-1,1])for(const [y,w,h,name]of [[132,100,185,'ice_mountain_01'],[560,142,228,'ice_mountain_02']])prop(c,lib,'level_ice_arena',name,side<0?left-74:right+74,y,w,h,side>0);
  for(const side of [-1,1])for(const y of [60,140,500,580])snow(f,side<0?left-37:right+37,y,34,55);
  for(const [x,y]of [[left-57,372],[right+57,372]]){prop(c,lib,'level_ice_arena','ice_cubegroup_02',x,y,78,85);snow(f,x,y-16,38,24);}
 }else if(rumble){castleScenery(c,f,l,lib);}else{stoneRails(f,l);for(const y of [top,bottom+5])for(const x of [left-35,right+35])prop(c,lib,'level_spooky_arena','spooky_statue_01',x,y+10,60,88,x>240);for(const y of [174,466]){const name=y<320?'spooky_stands_red_01':'spooky_stands_blue_01';prop(c,lib,'level_spooky_arena',name,left-39,y,63,98);prop(c,lib,'level_spooky_arena',name,right+39,y,63,98,true);}for(const y of [88,320,552])for(const x of [left-10,right+10]){plate(f,x-5,y-5,10,22,'#596577','#1e293b',2);ellipse(f,x,y,6,3,'#272b32');}}
 cv.theme=rumble?'castle':icy?'ice':'bastion';cv.layers=rumble?['backdrop','castle-architecture','playfield','raised-scenery']:['backdrop','playfield','raised-scenery'];return cv;
}
function prepare(b,lib){const l=b.arenaLayout;if(!l?.custom)return null;const g=root.RoyaleGraphics?.current||{},d=Math.max(.5,Math.min(2,(g.arenaScale??2)*(g.textureScale??(g.textures==='low'?.5:1)))),key=l.id+':'+(l.revision||0)+':'+d;let cv=cache.get(key);if(!cv){if(cache.size>=2)clear();cv=build(l,lib,d);cache.set(key,cv);}return cv;}
function draw(c,b,lib){const cv=prepare(b,lib);if(!cv)return false;const r=cv.worldRect;c.drawImage(cv,r.x,r.y,r.width,r.height);return true;}
function ambient(c,b,time){const g=root.RoyaleGraphics?.current||{};if(g.arenaAnimated===false||g.potato)return;const t=Math.floor(time*(g.arenaFps||30))/(g.arenaFps||30);c.save();
 if(b.arenaLayout.id==='BridgeBattle'){const count=g.arenaBackgrounds==='med'?18:36;for(let i=0;i<count;i++){const x=i%2===0?52+(i*43)%90:341+(i*37)%95,y=((i*89+t*(9+i%4))%760)-60,drift=Math.sin(t*.4+i*3)*9;c.globalAlpha=.22+(i%4)*.12;ellipse(c,x+drift,y,1.1+i%3*.45,1.1+i%3*.45,'#ffffff');}}
 else{const castle=b.arenaLayout.id==='TeamRumble';for(const y of castle?[55,250,390,585]:[88,320,552])for(const x of [b.arenaLayout.left*SX-(castle?12:10),b.arenaLayout.right*SX+(castle?12:10)]){const sway=Math.sin(t*7+x+y)*2;c.globalAlpha=.22;ellipse(c,x,y-11,17,21,'#ffb44d');c.globalAlpha=.95;poly(c,[[x-4,y],[x-6,y-9],[x+sway,y-23],[x+2,y-13],[x+6,y-6],[x+4,y]],'#ef9c36');poly(c,[[x-2,y],[x-3,y-8],[x+sway,y-17],[x+3,y-4],[x+2,y]],'#ffec9d');}if(!castle)for(const side of [-1,1]){const x=side<0?b.arenaLayout.left*SX-16:b.arenaLayout.right*SX+16,y=220;c.globalAlpha=.9;poly(c,[[x,y],[x+side*17,y+Math.sin(t*2)*2],[x+side*17,y+36+Math.sin(t*2+.9)*3],[x,y+29]],side<0?'#2571af':'#a84261','#d7b877',1.5);}}
 if(b.arenaLayout.id==='TeamRumble'){const l=b.arenaLayout;for(const team of [0,1])for(const side of [-1,1]){const x=(side<0?l.left:l.right)*SX+side*31,y=team?158:470,sway=Math.sin(t*1.7+y+side)*2;c.globalAlpha=1;line(c,x,y-9,x,y+48,'#c7b081',2);poly(c,[[x,y],[x+side*(22+sway),y+4],[x+side*(25+sway),y+42],[x+side*13,y+37],[x,y+41]],team?'#b54f62':'#347bac','#e4ca89',1.3);castleCrown(c,x+side*12,y+19,.35);}}
 c.restore();}
function drawForeground(c,b,lib,time=b.visualTime??b.time??0){const cv=prepare(b,lib);if(!cv)return false;const r=cv.worldRect;c.drawImage(cv.foreground,r.x,r.y,r.width,r.height);ambient(c,b,time);return true;}
root.RoyaleCustomArena={prepare,draw,drawForeground,clear,cacheSize:()=>cache.size};
})(globalThis);
