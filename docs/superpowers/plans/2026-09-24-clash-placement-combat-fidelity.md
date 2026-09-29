# Clash Placement and Combat Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Web Royale v0.16 use a Clash-style 18×32 placement grid, source-radius collision/pathing, shared placement/target forecasts, correct first-projectile damage, and native-like placement/spell feedback without breaking v0.15 progression, learning, 2v2, or cheats.

**Architecture:** Introduce three focused engine modules: `arena-grid.js` owns tile semantics and coordinate conversion; `placement.js` owns snapping, footprints, formation fit, spell hit geometry, and the shared placement forecast; `pathing.js` owns radius-aware routing and swept movement. `battle.js` consumes those modules as the single source of truth for live placement, targeting, movement, and projectile choice, while `draw.js` renders only the forecast returned by the engine. Existing source assets remain authoritative for unit/effect art.

**Tech Stack:** Browser JavaScript (UMD/CommonJS dual modules), deterministic 60 Hz visible battle loop with existing historical snapshot `3.2557.2`, Node `node:test`, Python/Chromium browser QA, static `tools/build-web.js` bundle.

**Spec:** `docs/superpowers/specs/2026-09-24-clash-placement-combat-fidelity-design.md`

## Global Constraints

- Preserve historical game-data snapshot `3.2557.2` and current v0.15 card/progression rules.
- Preserve local learning, 2v2, AppData AI storage, chest/card unlock behavior, and all current practice cheats unless explicitly changed below.
- The 18×32 logical Arena grid is the authority for placement legality and ground routing.
- The `place anywhere` cheat bypasses team deployment-zone restrictions only; it does not bypass immutable terrain or body overlap.
- Deployment delay does not make a present troop/building untargetable or intangible.
- Underground/future-spawn entities stay absent until their source presence time.
- Preview and live combat must share targeting and spell-hit predicates; renderer-only guesses are prohibited.
- Original exported art/effects are preferred; canvas primitives are fallback geometry only.
- No font files may be added to the release package.
- Existing saves require no schema migration.

## Review Focus

1. **Destroyed Princess Tower zone extension:** preview and live deployment must extend only the correct lane and never expose river/water or the untouched lane.
2. **Large-radius bodies at bridges:** a Giant/P.E.K.K.A-sized body must route through a legal bridge without clipping water, towers, or another large body.
3. **2v2 seat ownership:** all four seats must use the same tile legality while team zones and owner/elixir/card-cycle state remain independent.
4. **Existing target locks:** warning markers must not claim a retarget when an enemy already has a legal engaged target that live `chooseTarget` would retain.
5. **Non-radial spells/projectiles:** The Log/Barbarian Barrel/line projectiles must forecast a swept path/width, not a circular spell radius, and Princess decorative projectile data must never replace her damage-bearing first shot.

---

### Task 1: Canonical 18×32 Arena Grid

**Files:**
- Create: `src/arena-grid.js`
- Create: `tests/arena-grid-v160.test.cjs`
- Modify: `tools/build-web.js`

**Interfaces:**
- Consumes: `SX`, `SY` from `src/catalog.js`.
- Produces:
  - `COLS = 18`, `ROWS = 32`
  - `worldToTile(x:number,y:number): {col:number,row:number}`
  - `tileCenter(col:number,row:number): {x:number,y:number}`
  - `tileFlags(col:number,row:number): {ground:boolean,river:boolean,bridge:boolean,tower:boolean,blocked:boolean}`
  - `deploymentAllowed(team:number,col:number,row:number,towers:Array,cheat:boolean): boolean`
  - `footprintTiles(x:number,y:number,radiusTiles:number): Array<{col,row}>`
  - `terrainFits(x:number,y:number,radiusTiles:number,{allowWater?:boolean}): boolean`
  - `neighbors(col:number,row:number,radiusTiles:number): Array<{col,row}>`

- [ ] **Step 1: Write failing grid tests**

```js
'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const G=require('../src/arena-grid.js');
const K=require('../src/catalog.js');

test('arena grid is 18 by 32 and tile centers round-trip',()=>{
  A.equal(G.COLS,18); A.equal(G.ROWS,32);
  const p=G.tileCenter(3,25);
  A.deepEqual(G.worldToTile(p.x,p.y),{col:3,row:25});
});

test('river rejects ground while bridge cells remain passable',()=>{
  A.equal(G.tileFlags(8,15).river,true);
  A.equal(G.terrainFits(G.tileCenter(8,15).x,G.tileCenter(8,15).y,.35),false);
  A.equal(G.tileFlags(3,15).bridge,true);
  A.equal(G.terrainFits(G.tileCenter(3,15).x,G.tileCenter(3,15).y,.35),true);
});

test('tower footprint cells are blocked',()=>{
  const king=G.tileFlags(8,28), princess=G.tileFlags(3,25);
  A.equal(king.tower,true); A.equal(princess.tower,true);
});
```

- [ ] **Step 2: Run the grid tests and verify RED**

Run:
```bash
node --test tests/arena-grid-v160.test.cjs
```
Expected: FAIL because `src/arena-grid.js` does not exist.

- [ ] **Step 3: Implement the minimal grid module**

```js
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog);if(n)module.exports=api;else root.RoyaleArenaGrid=api;})(globalThis,function(K){'use strict';
const {SX,SY}=K,COLS=18,ROWS=32;
const BRIDGE_COLS=new Set([3,4,13,14]);
const RIVER_ROWS=new Set([15,16]);
const TOWER_CELLS=new Set();
for(const [cx,cy,w,h] of [[9,29,4,3],[3.5,25.5,3,3],[14.5,25.5,3,3],[9,3,4,3],[3.5,6.5,3,3],[14.5,6.5,3,3]]){
  for(let row=Math.floor(cy-h/2);row<=Math.floor(cy+h/2);row++)for(let col=Math.floor(cx-w/2);col<=Math.floor(cx+w/2);col++)TOWER_CELLS.add(col+','+row);
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function worldToTile(x,y){return{col:clamp(Math.floor(x/SX),0,COLS-1),row:clamp(Math.floor(y/SY),0,ROWS-1)};}
function tileCenter(col,row){return{x:(col+.5)*SX,y:(row+.5)*SY};}
function tileFlags(col,row){const river=RIVER_ROWS.has(row),bridge=river&&BRIDGE_COLS.has(col),tower=TOWER_CELLS.has(col+','+row);return{ground:!river||bridge,river:river&&!bridge,bridge,tower,blocked:tower};}
function footprintTiles(x,y,radius){const min=worldToTile(x-radius*SX,y-radius*SY),max=worldToTile(x+radius*SX,y+radius*SY),out=[];for(let r=min.row;r<=max.row;r++)for(let c=min.col;c<=max.col;c++)out.push({col:c,row:r});return out;}
function terrainFits(x,y,radius,opt={}){return footprintTiles(x,y,radius).every(t=>{const f=tileFlags(t.col,t.row);return !f.blocked&&(opt.allowWater||!f.river);});}
function deploymentAllowed(team,col,row,towers,cheat=false){if(cheat)return true;const y=row+.5;if(team===0){if(y>=17)return true;const lane=col<9?0:1,enemy=towers.filter(t=>t.team===1&&!t.king).sort((a,b)=>a.x-b.x);return enemy[lane]?.hp<=0&&y>=10;}if(y<=15)return true;const lane=col<9?0:1,enemy=towers.filter(t=>t.team===0&&!t.king).sort((a,b)=>a.x-b.x);return enemy[lane]?.hp<=0&&y<=22;}
function neighbors(col,row,radius){return [[1,0],[-1,0],[0,1],[0,-1]].map(([dc,dr])=>({col:col+dc,row:row+dr})).filter(t=>t.col>=0&&t.col<COLS&&t.row>=0&&t.row<ROWS&&terrainFits(tileCenter(t.col,t.row).x,tileCenter(t.col,t.row).y,radius));}
return{COLS,ROWS,worldToTile,tileCenter,tileFlags,footprintTiles,terrainFits,deploymentAllowed,neighbors};
});
```

- [ ] **Step 4: Add destroyed-tower deployment-zone and footprint review-focus tests**

```js
test('destroyed princess tower extends only its lane',()=>{
 const towers=[{team:1,king:false,x:3.5*K.SX,hp:0},{team:1,king:false,x:14.5*K.SX,hp:100}];
 A.equal(G.deploymentAllowed(0,3,12,towers,false),true);
 A.equal(G.deploymentAllowed(0,14,12,towers,false),false);
});

test('large footprint cannot fit through river outside bridges',()=>{
 const p=G.tileCenter(8,15);
 A.equal(G.terrainFits(p.x,p.y,1.0),false);
});
```

- [ ] **Step 5: Add `arena-grid` to the build module list and run tests**

Modify `tools/build-web.js` so both runtime app modules and training engine load `arena-grid` before consumers:
```js
const modules=['catalog','arena-grid','placement','pathing','road-data','progression','profile','navigation','learning','learning-store','appdata-store','training-scheduler','ai','audio','training-decks','battle','core','economy','assets','native','text','presentation','platform','menu-model','fx','draw','app'];
```
Run:
```bash
node --test tests/arena-grid-v160.test.cjs
```
Expected: PASS.

---

### Task 2: Shared Placement and Spell Forecast

**Files:**
- Create: `src/placement.js`
- Create: `tests/placement-v160.test.cjs`
- Modify: `src/battle.js`
- Modify: `tools/build-web.js`

**Interfaces:**
- Consumes: `RoyaleArenaGrid`, `RoyaleCatalog`; battle callbacks `canTarget`, `chooseTarget`, `spellAffectedEntities`.
- Produces:
  - `snapCard(battle,team,card,x,y,seat): {ok,reason,x,y,tiles,formation}`
  - `spellShape(card,x,y): {kind:'radial'|'line'|'rolling',x,y,radius?,x2?,y2?,width?}`
  - `forecastPlacement(battle,seat,slot,x,y): PlacementForecast`
  - `PlacementForecast = {ok,reason,affordable,cycling,card,x,y,renderX,renderY,tiles,range,minRange,radius,shape,affected,retargeting,locked,spell,building,air,level,name,deployTime}`

- [ ] **Step 1: Write failing placement tests**

```js
const test=require('node:test'),A=require('node:assert/strict');
const B=require('../src/battle.js'),K=require('../src/catalog.js');

test('Cannon snaps to a tile center and exposes its source range',()=>{
 const b=new B.Battle({ai:false,deck:['cannon','knight','archers','giant','musketeer','bomber','fireball','arrows']});
 const f=b.placementPreview(0,0,7.13*K.SX,23.77*K.SY);
 A.equal(f.ok,true); A.equal(f.building,true);
 A.equal((f.x/K.SX)%1,.5); A.equal((f.y/K.SY)%1,.5);
 A.equal(f.range,K.entityDef('Cannon',f.level).range);
});

test('ground placement rejects water and tower overlap even with place-anywhere cheat',()=>{
 const profile=require('../src/profile.js').normalizeProfile({cheats:{placement:true}});
 const b=new B.Battle({ai:false,profile,deck:['knight','cannon','archers','giant','musketeer','bomber','fireball','arrows']});
 A.equal(b.placementPreview(0,0,9*K.SX,15.5*K.SY).ok,false);
 A.equal(b.placementPreview(0,1,3.5*K.SX,25.5*K.SY).ok,false);
});

test('The Log forecast is a swept line rather than radial-only',()=>{
 const b=new B.Battle({ai:false,deck:['the-log','knight','archers','giant','musketeer','bomber','fireball','arrows']});
 const f=b.placementPreview(0,0,9*K.SX,23*K.SY);
 A.equal(f.shape.kind,'rolling'); A.ok(f.shape.y2<f.shape.y); A.ok(f.shape.width>0);
});
```

- [ ] **Step 2: Run placement tests and verify RED**

Run:
```bash
node --test tests/placement-v160.test.cjs
```
Expected: FAIL because current preview returns unsnapped pointer coordinates and no `shape`/`building` forecast.

- [ ] **Step 3: Implement placement module and integrate `Battle.placementPreview`**

Create `src/placement.js` with this public structure:
```js
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog,n?require('./arena-grid.js'):root.RoyaleArenaGrid);if(n)module.exports=api;else root.RoyalePlacement=api;})(globalThis,function(K,G){'use strict';
function shape(card,x,y,team){const r=card.source;if(card.id==='the-log'||card.id==='barbarian-barrel'){const dir=team===0?-1:1,range=Math.max(card.spellRange||0,10);return{kind:'rolling',x,y,x2:x,y2:y+dir*range*K.SY,width:Math.max(.5,card.radiusTiles)};}if(card.projectileName&&K.DATA.projectiles[card.projectileName]?.ProjectileRange){const p=K.DATA.projectiles[card.projectileName],dir=team===0?-1:1;return{kind:'line',x,y,x2:x,y2:y+dir*(p.ProjectileRange/1000)*K.SY,width:Math.max(.25,(p.ProjectileRadius||200)/1000)};}return{kind:'radial',x,y,radius:card.radiusTiles||1};}
function bodyOverlap(battle,x,y,radius){return battle.active.some(v=>!v.air&&!v.attachedTo&&v.hp>0&&Math.hypot((v.x-x)/K.SX,(v.y-y)/K.SY)<(v.def.radiusTiles||0)+radius-.05);}
function formation(card,x,y){const r=card.source,n=Math.max(1,r.SummonNumber||1),radius=(r.SummonRadius||0)/1000,width=(r.SummonWidth||0)/1000,out=[];for(let i=0;i<n;i++){let xx=x,yy=y;if(n>1){if(width||r.FullLaneDeploy){const w=width||14,center=r.FullLaneDeploy?9:x/K.SX;xx=(center-w/2+w*i/(n-1))*K.SX;}else if(n<=3)xx+=(i-(n-1)/2)*Math.max(.55,radius)*2*K.SX;else{const a=i/n*Math.PI*2;xx+=Math.cos(a)*Math.max(.55,radius)*K.SX*Math.sqrt(n/3);yy+=Math.sin(a)*Math.max(.55,radius)*K.SY*Math.sqrt(n/3);}}out.push({x:xx,y:yy});}return out;}
function snapCard(battle,team,card,x,y,seat){
 if(!card||!Number.isFinite(x)||!Number.isFinite(y))return{ok:false,reason:'Place inside the arena',x,y,formation:[]};
 if(card.spell&&!card.source.SpellAsDeploy)return{ok:true,reason:'',x:K.clamp(x,.25*K.SX,17.75*K.SX),y:K.clamp(y,.5*K.SY,31.5*K.SY),formation:[]};
 const d=K.entityDef(card.entity,card.level),tile=G.worldToTile(x,y),center=G.tileCenter(tile.col,tile.row),allowWater=card.source.CanPlaceOnWater===true;
 if(!G.terrainFits(center.x,center.y,d.radiusTiles,{allowWater}))return{ok:false,reason:'Cannot deploy on this tile',x:center.x,y:center.y,formation:[]};
 if(!card.source.CanDeployOnEnemySide&&!G.deploymentAllowed(team,tile.col,tile.row,battle.towers,seat===0&&battle.cheats?.placement))return{ok:false,reason:'Deploy on your side of the arena',x:center.x,y:center.y,formation:[]};
 if(!card.source.CanPlaceOnBuildings&&bodyOverlap(battle,center.x,center.y,d.radiusTiles))return{ok:false,reason:'Placement is occupied',x:center.x,y:center.y,formation:[]};
 const members=formation(card,center.x,center.y);for(const m of members){if(!G.terrainFits(m.x,m.y,d.radiusTiles,{allowWater})||bodyOverlap(battle,m.x,m.y,d.radiusTiles))return{ok:false,reason:'Formation does not fit',x:center.x,y:center.y,formation:members};}
 return{ok:true,reason:'',x:center.x,y:center.y,tiles:G.footprintTiles(center.x,center.y,d.radiusTiles),formation:members};
}
function forecastPlacement(battle,seat,slot,x,y){
 const original=battle.card(seat,slot),card=original?.mirrorCard?{...K.cardAt(original.mirrorCard,Math.min(14,original.level+1)),cost:original.cost}:original,team=battle.teamOf(seat);
 if(!card)return{ok:false,reason:'Select a card',affected:[],retargeting:[],locked:[]};
 const snapped=snapCard(battle,team,card,x,y,seat),affordable=battle.elixir[seat]+1e-7>=card.cost,cycling=battle.slotReady[seat][slot]>battle.time+1e-7,shapeInfo=shape(card,snapped.x,snapped.y,team);
 const info={...snapped,affordable,cycling,card:card.id,name:card.name,level:card.level,spell:card.spell,building:card.building,air:false,range:0,minRange:0,radius:card.radiusTiles||0,shape:shapeInfo,affected:[],retargeting:[],locked:[],deployTime:0,cardEntity:card.entity||null};
 if(card.spell){info.affected=snapped.ok?battle.spellAffectedEntities(card,shapeInfo).map(v=>({id:v.id,x:v.x,y:v.y})):[];return info;}
 if(!snapped.ok||!card.entity)return info;const d=K.entityDef(card.entity,card.level);Object.assign(info,{air:d.air,range:d.range,minRange:d.minRange,radius:d.radiusTiles,deployTime:d.deploy});
 const ghost={id:-1,entity:card.entity,card:card.id,team,owner:seat,x:snapped.x,y:snapped.y,def:d,level:card.level,hp:d.hp,maxHp:d.hp,shield:d.shield,wait:d.deploy,born:battle.time,appearsAt:battle.time,buffs:{},building:d.building,air:d.air,dead:false,attachedTo:null};
 const candidates=[...battle.active,ghost];for(const enemy of battle.active){if(enemy.team===team||!battle.canTarget(enemy,ghost)||enemy.hidden||enemy.invisible||enemy.king&&!enemy.active)continue;const before=battle.chooseTarget(enemy),after=battle.chooseTarget(enemy,candidates);if(before?.id===after?.id&&before)info.locked.push({id:enemy.id,x:enemy.x,y:enemy.y,target:before.id});else if(after?.id===ghost.id)info.retargeting.push({id:enemy.id,x:enemy.x,y:enemy.y});}
 info.affected=battle.active.filter(t=>battle.canTarget(ghost,t)&&Math.max(0,Math.hypot((ghost.x-t.x)/K.SX,(ghost.y-t.y)/K.SY)-d.radiusTiles-(t.def.radiusTiles||0))<=d.range).map(t=>({id:t.id,x:t.x,y:t.y}));
 return info;
}
return{snapCard,spellShape:shape,forecastPlacement};
});
```

Change `battle.js` UMD dependencies to include placement and delegate:
```js
placementPreview(seat,slot,x,y){ return Placement.forecastPlacement(this,seat,slot,x,y); }
```
Keep `Battle.placement(...)` as a compatibility wrapper that returns the same legality result from `snapCard`, and add the shared spell resolver used by both preview and live casts:
```js
spellAffectedEntities(card,shape){
 const r=card.source,p=DATA.projectiles[card.projectileName]||{},area=DATA.areas[r.AreaEffectObject]||{},ground=p.AoeToGround!==false,air=p.AoeToAir===true||area.AffectsAir===true;
 const segDistance=(u,s)=>{const ax=s.x/SX,ay=s.y/SY,bx=s.x2/SX,by=s.y2/SY,px=u.x/SX,py=u.y/SY,dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy||1,t=clamp(((px-ax)*dx+(py-ay)*dy)/l2,0,1),qx=ax+t*dx,qy=ay+t*dy;return Math.hypot(px-qx,py-qy);};
 return this.active.filter(u=>{if(u.team===this._forecastTeam||u.attachedTo||!this.isPresent(u)||u.hidden)return false;if(u.air&&!air||!u.air&&!ground)return false;if(shape.kind==='radial')return dist(u,shape)<=shape.radius+(u.def.radiusTiles||0);return segDistance(u,shape)<=shape.width+(u.def.radiusTiles||0);});
}
```
`forecastPlacement` sets `battle._forecastTeam=team` only for the duration of this call with `try/finally`, so the resolver has the same team filter without persisting mutable preview state.

- [ ] **Step 4: Add target-lock and spell-hit equality tests**

```js
test('preview retarget warning agrees with live target after deploy',()=>{
 const b=new B.Battle({ai:false,deck:['knight','cannon','archers','giant','musketeer','bomber','fireball','arrows']});
 const enemy=b.makeEntity('Knight',1,9*K.SX,14*K.SY,{level:9,wait:0}); b.units.push(enemy);
 const f=b.placementPreview(0,0,9*K.SX,18*K.SY);
 A.ok(f.retargeting.some(x=>x.id===enemy.id));
 const placed=b.deploy(0,0,f.x,f.y); A.equal(placed.ok,true);
 b.step(.05); A.equal(enemy.targetId,placed.ids[0]);
});

test('existing engaged target suppresses false warning',()=>{
 const b=new B.Battle({ai:false});
 const enemy=b.makeEntity('Knight',1,8*K.SX,20*K.SY,{level:9,wait:0});
 const old=b.makeEntity('Knight',0,8*K.SX,20.7*K.SY,{level:9,wait:0}); b.units.push(enemy,old); enemy.targetId=old.id;
 const f=b.placementPreview(0,0,9*K.SX,21*K.SY);
 A.equal(f.retargeting.some(x=>x.id===enemy.id),false);
 A.ok(f.locked.some(x=>x.id===enemy.id));
});

test('spell forecast affected set equals live resolver predicate',()=>{
 const b=new B.Battle({ai:false,deck:['fireball','knight','archers','giant','musketeer','bomber','zap','arrows']});
 const a=b.makeEntity('Knight',1,9*K.SX,12*K.SY,{level:9,wait:0}),far=b.makeEntity('Knight',1,14*K.SX,12*K.SY,{level:9,wait:0});b.units.push(a,far);
 const f=b.placementPreview(0,0,9*K.SX,12*K.SY);
 A.deepEqual(f.affected.map(x=>x.id).sort((x,y)=>x-y),b.spellAffectedEntities(b.card(0,0),f.shape).map(x=>x.id).sort((x,y)=>x-y));
});
```

- [ ] **Step 5: Run placement tests and full relevant regression subset**

Run:
```bash
node --test tests/arena-grid-v160.test.cjs tests/placement-v160.test.cjs tests/deployment-v110.test.cjs tests/v150-progression.test.cjs
```
Expected: PASS.

---

### Task 3: Radius-Aware Pathing and Swept Body Collision

**Files:**
- Create: `src/pathing.js`
- Create: `tests/pathing-v160.test.cjs`
- Modify: `src/battle.js`
- Modify: `tools/build-web.js`

**Interfaces:**
- Consumes: `ArenaGrid`, live battle entity arrays, `SX/SY`.
- Produces:
  - `route(start:{x,y},goal:{x,y},radius:number): Array<{x,y}>`
  - `sweptStep(unit,dx,dy,solids): {x,y,blocked:boolean}`
  - `separationVector(unit,solids): {x,y}`
  - `edgeDistance(a,b): number`

- [ ] **Step 1: Write failing path/collision tests**

```js
const test=require('node:test'),A=require('node:assert/strict');
const B=require('../src/battle.js'),K=require('../src/catalog.js');

test('large ground body routes through a bridge instead of water',()=>{
 const b=new B.Battle({ai:false});
 const giant=b.makeEntity('Giant',0,9*K.SX,22*K.SY,{level:9,wait:0}),target=b.towers.find(t=>t.team===1&&!t.king);b.units.push(giant);
 giant.targetId=target.id;
 for(let i=0;i<240;i++)b.step(.05);
 A.ok(!(giant.y>15*K.SY&&giant.y<17*K.SY&&giant.x>5*K.SX&&giant.x<13*K.SX));
});

test('two opposing ground bodies cannot tunnel through each other on a large step',()=>{
 const b=new B.Battle({ai:false});
 const a=b.makeEntity('Knight',0,9*K.SX,20*K.SY,{level:9,wait:0}),d=b.makeEntity('Knight',1,9*K.SX,18*K.SY,{level:9,wait:0});b.units.push(a,d);
 b.move(a,d,.5,1); b.move(d,a,.5,1);
 const distance=Math.hypot((a.x-d.x)/K.SX,(a.y-d.y)/K.SY);
 A.ok(distance+1e-6>=a.def.radiusTiles+d.def.radiusTiles);
});

test('air unit ignores river and ground blockers',()=>{
 const b=new B.Battle({ai:false});
 const m=b.makeEntity('Minion',0,9*K.SX,18*K.SY,{level:9,wait:0}),target=b.towers.find(t=>t.team===1&&!t.king);b.units.push(m);m.targetId=target.id;
 for(let i=0;i<80;i++)b.step(.05);
 A.ok(m.y<17*K.SY);
});
```

- [ ] **Step 2: Run path tests and verify RED**

Run:
```bash
node --test tests/pathing-v160.test.cjs
```
Expected: at least the tunneling/bridge assertions fail under current post-movement correction.

- [ ] **Step 3: Implement `src/pathing.js` with A* tile routing and swept circles**

```js
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog,n?require('./arena-grid.js'):root.RoyaleArenaGrid);if(n)module.exports=api;else root.RoyalePathing=api;})(globalThis,function(K,G){'use strict';
function edgeDistance(a,b){return Math.max(0,Math.hypot((a.x-b.x)/K.SX,(a.y-b.y)/K.SY)-(a.def?.radiusTiles||0)-(b.def?.radiusTiles||0));}
const key=t=>t.col+','+t.row,heuristic=(a,b)=>Math.hypot(a.col-b.col,a.row-b.row);
function route(start,goal,radius){const s=G.worldToTile(start.x,start.y),g=G.worldToTile(goal.x,goal.y),open=[s],came=new Map(),score=new Map([[key(s),0]]);while(open.length){open.sort((a,b)=>(score.get(key(a))+heuristic(a,g))-(score.get(key(b))+heuristic(b,g)));const cur=open.shift();if(cur.col===g.col&&cur.row===g.row){const path=[];let n=cur;while(n){path.unshift(G.tileCenter(n.col,n.row));n=came.get(key(n));}return path.slice(1);}for(const next of G.neighbors(cur.col,cur.row,radius)){const ng=(score.get(key(cur))||0)+1;if(ng<(score.get(key(next))??Infinity)){came.set(key(next),cur);score.set(key(next),ng);if(!open.some(v=>v.col===next.col&&v.row===next.row))open.push(next);}}}return[];}
function overlaps(unit,x,y,solids){return solids.some(v=>v.id!==unit.id&&!v.air&&!v.attachedTo&&v.hp>0&&Math.hypot((v.x-x)/K.SX,(v.y-y)/K.SY)<(unit.def.radiusTiles||0)+(v.def.radiusTiles||0)-.02);}
function sweptStep(unit,dx,dy,solids){const valid=(x,y)=>G.terrainFits(x,y,unit.def.radiusTiles)&&!overlaps(unit,x,y,solids);let lo=0,hi=1;if(valid(unit.x+dx,unit.y+dy))return{x:unit.x+dx,y:unit.y+dy,blocked:false};for(let i=0;i<10;i++){const mid=(lo+hi)/2;if(valid(unit.x+dx*mid,unit.y+dy*mid))lo=mid;else hi=mid;}let x=unit.x+dx*lo,y=unit.y+dy*lo;const sx=unit.x+dx*lo+dx*(1-lo),sy=y;if(valid(sx,sy)){x=sx;return{x,y:sy,blocked:true};}const tx=x,ty=unit.y+dy*lo+dy*(1-lo);if(valid(tx,ty)){y=ty;return{x:tx,y,blocked:true};}return{x,y,blocked:true};}
function separationVector(unit,solids){let x=0,y=0;for(const v of solids){if(v.id===unit.id||v.air||v.attachedTo||v.hp<=0)continue;const dx=(unit.x-v.x)/K.SX,dy=(unit.y-v.y)/K.SY,d=Math.hypot(dx,dy)||1,min=(unit.def.radiusTiles||0)+(v.def.radiusTiles||0);if(d>=min)continue;const p=(min-d)*.08;x+=dx/d*p*K.SX;y+=dy/d*p*K.SY;}return{x,y};}
return{route,sweptStep,separationVector,edgeDistance};
});
```

- [ ] **Step 4: Replace `Battle.move` post-overlap strategy with path/sweep consumption**

Update `Battle.move(u,t,dt,speedRate)` so ground units:
```js
if(!u.path||this.pathNeedsRefresh(u,t))u.path=Pathing.route({x:u.x,y:u.y},{x:t.x,y:t.y},u.def.radiusTiles);
const waypoint=u.path[0]||{x:t.x,y:t.y};
const speed=u.def.speed*dt*speedRate;
const len=Math.hypot(waypoint.x-u.x,waypoint.y-u.y)||1;
const step=Pathing.sweptStep(u,(waypoint.x-u.x)/len*speed,(waypoint.y-u.y)/len*speed,this.active.filter(v=>v.id!==u.id&&!v.air&&v.hp>0));
u.x=step.x;u.y=step.y;
```
Air units keep direct movement plus air-body separation. Buildings do not call movement.

- [ ] **Step 5: Add deployment-state body/target tests**

```js
test('present waiting troop can be targeted and damaged before activation',()=>{
 const b=new B.Battle({ai:false});
 const waiting=b.makeEntity('Knight',0,9*K.SX,20*K.SY,{level:9,wait:2}),enemy=b.makeEntity('Musketeer',1,9*K.SX,17*K.SY,{level:9,wait:0});b.units.push(waiting,enemy);
 A.equal(b.canTarget(enemy,waiting),true);
 const hp=waiting.hp; b.damage(waiting,50,enemy); A.ok(waiting.hp<hp); A.ok(waiting.wait>0);
});

test('not-yet-appeared entity remains unavailable',()=>{
 const b=new B.Battle({ai:false});
 const hidden=b.makeEntity('Miner',0,9*K.SX,20*K.SY,{level:9,wait:0,appearsIn:2}),enemy=b.makeEntity('Knight',1,9*K.SX,18*K.SY,{level:9,wait:0});b.units.push(hidden,enemy);
 A.equal(b.canTarget(enemy,hidden),false);
});
```

- [ ] **Step 6: Run pathing/deployment tests**

Run:
```bash
node --test tests/pathing-v160.test.cjs tests/deployment-v110.test.cjs tests/team-v110.test.cjs
```
Expected: PASS.

---

### Task 4: Correct Damage-Bearing Projectile Selection and Spell Geometry

**Files:**
- Modify: `src/catalog.js`
- Modify: `src/battle.js`
- Create: `tests/projectile-v160.test.cjs`

**Interfaces:**
- Produces from `catalog.js`:
  - `projectileForAttack(entitySource,attackIndex): string|null`
  - `projectileDamageDef(name): object|null`
- `Battle.strike` calls `projectileForAttack` instead of always using `source.Projectile`.

- [ ] **Step 1: Write Princess and projectile regressions**

```js
const test=require('node:test'),A=require('node:assert/strict');
const K=require('../src/catalog.js'),B=require('../src/battle.js');

test('Princess first damaging shot uses CustomFirstProjectile',()=>{
 const src=K.DATA.entities.Princess;
 A.equal(K.projectileForAttack(src,0),src.CustomFirstProjectile);
 A.notEqual(K.projectileForAttack(src,0),'PrincessProjectileDeco');
});

test('Princess first shot lowers a target HP',()=>{
 const b=new B.Battle({ai:false}),p=b.makeEntity('Princess',0,9*K.SX,20*K.SY,{level:9,wait:0}),t=b.makeEntity('Knight',1,9*K.SX,15*K.SY,{level:9,wait:0});b.units.push(p,t);p.targetId=t.id;
 const hp=t.hp; b.strike(p,t);
 for(let i=0;i<120&&t.hp===hp;i++)b.step(.05);
 A.ok(t.hp<hp);
});

test('ordinary projectile users keep their source projectile',()=>{
 for(const name of ['Musketeer','Archer','SpearGoblin','Cannon']){
   const src=K.DATA.entities[name]; A.equal(K.projectileForAttack(src,0),src.CustomFirstProjectile||src.Projectile);
 }
});
```

- [ ] **Step 2: Run and verify RED**

Run:
```bash
node --test tests/projectile-v160.test.cjs
```
Expected: Princess first-shot tests fail because `strike` currently checks only `r.Projectile`.

- [ ] **Step 3: Implement projectile selection helper and use attack count**

Add in `catalog.js`:
```js
function projectileForAttack(source,index=0){
 if(index===0&&source.CustomFirstProjectile&&DATA.projectiles[source.CustomFirstProjectile])return source.CustomFirstProjectile;
 return source.Projectile&&DATA.projectiles[source.Projectile]?source.Projectile:null;
}
function projectileDamageDef(name){const p=DATA.projectiles[name];if(!p)return null;let cur=p,seen=new Set([name]);while(cur.Damage===undefined&&cur.SpawnProjectile&&!seen.has(cur.SpawnProjectile)){seen.add(cur.SpawnProjectile);cur=DATA.projectiles[cur.SpawnProjectile]||cur;}return cur;}
```
Export both helpers. In `Battle.strike`:
```js
const projectile=K.projectileForAttack(r,u.shotIndex||0);
if(projectile){const count=r.MultipleProjectiles||1,targets=this.active.filter(v=>this.canTarget(u,v)&&edge(u,v)<=u.def.range).sort((a,b)=>dist(u,a)-dist(u,b)),shots=r.MultipleTargets||count;for(let i=0;i<shots;i++){const target=r.MultipleTargets?(targets[i%Math.max(1,targets.length)]||t):t;this.fireProjectile(projectile,u,target,{angle:count>1?(i-(count-1)/2)*.055:0,index:i});}}
```
Initialize `shotIndex:0` in `makeEntity`; increment `u.shotIndex++` once at the end of each successful `strike` so index zero is the actual first shot. Keep the existing `u.attack` visual countdown unchanged.

- [ ] **Step 4: Add spell shape/resolver tests for line and radial cases**

```js
test('Fireball radial preview and live resolver select same entity IDs',()=>{const b=new B.Battle({ai:false,deck:['fireball','knight','archers','giant','musketeer','bomber','zap','arrows']}),inside=b.makeEntity('Knight',1,9*K.SX,12*K.SY,{level:9,wait:0}),outside=b.makeEntity('Knight',1,14*K.SX,12*K.SY,{level:9,wait:0});b.units.push(inside,outside);const f=b.placementPreview(0,0,9*K.SX,12*K.SY);A.deepEqual(f.affected.map(x=>x.id),[inside.id]);A.deepEqual(b.spellAffectedEntities(b.card(0,0),f.shape).map(x=>x.id),[inside.id]);});
test('The Log path excludes off-line target and includes on-line target',()=>{const b=new B.Battle({ai:false,deck:['the-log','knight','archers','giant','musketeer','bomber','fireball','arrows']}),on=b.makeEntity('Knight',1,9*K.SX,17*K.SY,{level:9,wait:0}),off=b.makeEntity('Knight',1,13*K.SX,17*K.SY,{level:9,wait:0});b.units.push(on,off);const f=b.placementPreview(0,0,9*K.SX,23*K.SY);A.equal(f.shape.kind,'rolling');A.ok(f.affected.some(x=>x.id===on.id));A.equal(f.affected.some(x=>x.id===off.id),false);});
```
Use concrete entities at `(9,20)` and `(13,20)` so the expected on/off-path result is deterministic.

- [ ] **Step 5: Run projectile/spell tests**

Run:
```bash
node --test tests/projectile-v160.test.cjs tests/placement-v160.test.cjs tests/source-card-rules.test.cjs tests/fx-v130.test.cjs
```
Expected: PASS.

---

### Task 5: Native-Like Placement Ghost, Range Bubble, Hit Highlight, and Warning Marker

**Files:**
- Modify: `src/draw.js`
- Modify: `src/native.js`
- Modify: `src/fx.js`
- Modify: `src/v130.css` only if DOM-level overlay styling is required
- Create: `tests/browser_v160.py`
- Create: `tests/ui-v160.test.cjs`

**Interfaces:**
- Consumes only `Battle.placementPreview(...)`; renderer does not call independent placement/targeting math.
- Add renderer helpers:
  - `drawPlacementBubble(ctx,forecast)`
  - `drawPlacementLabel(ctx,forecast)`
  - `drawTargetWarnings(ctx,forecast,time)`
  - `drawSpellHighlights(ctx,forecast,time)`

- [ ] **Step 1: Write static renderer-contract tests**

```js
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs');
const draw=fs.readFileSync(require.resolve('../src/draw.js'),'utf8');
test('renderer consumes forecast and no longer draws debug arena grid',()=>{
 A.doesNotMatch(draw,/for\(let x=0;x<=18;x\+\+\).*line\(/s);
 A.match(draw,/placementPreview\(/);
 A.match(draw,/drawTargetWarnings/);
 A.match(draw,/drawSpellHighlights/);
});
```

- [ ] **Step 2: Run UI contract test and verify RED**

Run:
```bash
node --test tests/ui-v160.test.cjs
```
Expected: FAIL because the current renderer draws the full debug grid and red targeting lines.

- [ ] **Step 3: Replace current selected-card block with Clash-style forecast rendering**

The selected-card block must use snapped `forecast.x/y`, not raw pointer coordinates:
```js
const forecast=b.placementPreview(0,selected,pointer.x,pointer.y);
drawPlacementBubble(c,forecast);
if(forecast.cardEntity)lib.unit(c,forecast.cardEntity,forecast.x,forecast.y,0,time,'idle',-Math.PI/2,0,1,{ghost:true});
drawPlacementLabel(c,forecast);
drawSpellHighlights(c,forecast,time);
drawTargetWarnings(c,forecast,time);
```
Remove the 18×32 debug grid lines and red attacker-to-pointer lines. Use a white translucent ellipse for source range/radius and a red-tinted ghost/bubble only for illegal placement.

- [ ] **Step 4: Implement native-style warnings and affected highlights**

`drawTargetWarnings` places a white `!` with dark outline above each `forecast.retargeting` entity:
```js
function drawTargetWarnings(c,f,time){for(const e of f.retargeting||[]){const bob=Math.sin(time*7+e.id)*1.5;c.save();c.font='900 28px Arial Black, sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=7;c.strokeStyle='#5d1731';c.strokeText('!',e.x,e.y-44+bob);c.fillStyle='#fff';c.fillText('!',e.x,e.y-44+bob);c.restore();}}
```
`drawSpellHighlights` re-draws affected source units/towers with a bright additive/alpha pass when possible, falling back to a soft white outline:
```js
function drawSpellHighlights(c,f,time,b,lib){for(const hit of f.affected||[]){const u=b.getEntity(hit.id);if(!u)continue;c.save();c.globalCompositeOperation='screen';c.globalAlpha=.55;if(u.king!==undefined)lib.drawTower(c,u,time);else lib.unit(c,u.entity,u.x,u.y,u.team,b.time,u.visualState||'idle',u.heading,u.visualStarted||0,1,{elapsed:u.animationTime||0,height:RoyaleNative.flightOffset(u.def),entity:u});c.restore();}}
```

- [ ] **Step 5: Add Chromium QA covering the supplied reference behaviors**

Create `tests/browser_v160.py` with these deterministic captures/assertions:
```python
def test_cannon_preview_snaps_and_shows_range(self):
    result=self.page.evaluate("""()=>{const p=RoyaleProfile.normalizeProfile({decks:[['cannon','knight','archers','giant','musketeer','bomber','fireball','arrows']]});RoyaleDemo.applyProfile(p);RoyaleDemo.startBattle('Default',true);const b=RoyaleDemo.battle,f=b.placementPreview(0,0,7.13*RoyaleCore.SX,23.77*RoyaleCore.SY);return{x:f.x/RoyaleCore.SX,y:f.y/RoyaleCore.SY,range:f.range,ok:f.ok};}""")
    self.assertTrue(result['ok']);self.assertAlmostEqual(result['x']%1,.5,places=6);self.assertAlmostEqual(result['y']%1,.5,places=6);self.assertGreater(result['range'],0)
    self.page.locator('#viewport').screenshot(path=str(OUT/'cannon-placement.png'))

def test_target_warning_matches_post_deploy_target(self):
    result=self.page.evaluate("""()=>{const b=RoyaleDemo.battle,enemy=b.makeEntity('Knight',1,9*RoyaleCore.SX,14*RoyaleCore.SY,{level:9,wait:0});b.units.push(enemy);const f=b.placementPreview(0,1,9*RoyaleCore.SX,18*RoyaleCore.SY),warn=f.retargeting.some(x=>x.id===enemy.id),r=b.deploy(0,1,f.x,f.y);b.step(.05);return{warn,target:enemy.targetId,placed:b.units.filter(u=>u.team===0&&u.card==='knight').at(-1)?.id||null,ok:r.ok};}""")
    self.assertTrue(result['ok']);self.assertTrue(result['warn']);self.assertEqual(result['target'],result['placed'])
    self.page.locator('#viewport').screenshot(path=str(OUT/'target-warning.png'))

def test_fireball_highlights_only_affected_entities(self):
    result=self.page.evaluate("""()=>{const b=new RoyaleBattle.Battle({ai:false,deck:['fireball','knight','archers','giant','musketeer','bomber','zap','arrows']}),a=b.makeEntity('Knight',1,9*RoyaleCore.SX,12*RoyaleCore.SY,{level:9,wait:0}),far=b.makeEntity('Knight',1,14*RoyaleCore.SX,12*RoyaleCore.SY,{level:9,wait:0});b.units.push(a,far);const f=b.placementPreview(0,0,9*RoyaleCore.SX,12*RoyaleCore.SY);return{affected:f.affected.map(x=>x.id),inside:a.id,outside:far.id};}""")
    self.assertIn(result['inside'],result['affected']);self.assertNotIn(result['outside'],result['affected'])
    self.page.locator('#viewport').screenshot(path=str(OUT/'spell-highlight.png'))

def test_princess_live_shot_deals_damage(self):
    result=self.page.evaluate("""()=>{const b=RoyaleDemo.battle,p=b.makeEntity('Princess',0,9*RoyaleCore.SX,20*RoyaleCore.SY,{level:9,wait:0}),t=b.makeEntity('Knight',1,9*RoyaleCore.SX,15*RoyaleCore.SY,{level:9,wait:0});b.units.push(p,t);const hp=t.hp;p.targetId=t.id;b.strike(p,t);for(let i=0;i<120&&t.hp===hp;i++)b.step(.05);return{before:hp,after:t.hp};}""")
    self.assertLess(result['after'],result['before'])
    self.page.locator('#viewport').screenshot(path=str(OUT/'princess-shot.png'))

def test_bridge_body_collision_and_2v2_preview(self):
    result=self.page.evaluate("""()=>{const b=RoyaleDemo.battle,a=b.makeEntity('Giant',0,3.5*RoyaleCore.SX,18*RoyaleCore.SY,{level:9,wait:0}),d=b.makeEntity('Giant',1,3.5*RoyaleCore.SX,14*RoyaleCore.SY,{level:9,wait:0});b.units.push(a,d);for(let i=0;i<100;i++){a.targetId=d.id;d.targetId=a.id;b.step(.05);}const gap=Math.hypot((a.x-d.x)/RoyaleCore.SX,(a.y-d.y)/RoyaleCore.SY);const team=new RoyaleBattle.Battle({ai:false,mode:'TeamVsTeam'}),f=team.placementPreview(0,0,8.9*RoyaleCore.SX,23.2*RoyaleCore.SY);return{gap,min:a.def.radiusTiles+d.def.radiusTiles,teamOk:f.ok};}""")
    self.assertGreaterEqual(result['gap']+1e-6,result['min']);self.assertTrue(result['teamOk'])
    self.page.locator('#viewport').screenshot(path=str(OUT/'bridge-collision.png'))
```
Save screenshots to `docs/qa/v160/browser/` named `cannon-placement.png`, `target-warning.png`, `spell-highlight.png`, `princess-shot.png`, `bridge-collision.png`, and `2v2-placement.png`.

- [ ] **Step 6: Run renderer and Chromium tests**

Run:
```bash
node --test tests/ui-v160.test.cjs
python -m unittest tests.browser_v160
```
Expected: PASS with no page errors or missing runtime files.

---

### Task 6: Versioned Build Integration and Regression Protection

**Files:**
- Modify: `tools/build-web.js`
- Modify: `package.json`
- Modify: `src/index.template.html` only if a new accessibility description is required
- Modify: `FIDELITY.md`
- Modify: `BUILD-REPORT.md`
- Create: `tests/v160-regressions.test.cjs`

**Interfaces:**
- Static release version becomes `0.16.0`.
- Runtime modules order must load `arena-grid`, `placement`, and `pathing` before `battle`/`draw`.
- Training engine receives identical engine modules so learned/self-play battles use the same pathing/placement semantics.

- [ ] **Step 1: Write build/regression tests before changing build version**

```js
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs');
const pkg=require('../package.json');
test('v160 release declares placement engine modules',()=>{
 const build=fs.readFileSync(require.resolve('../tools/build-web.js'),'utf8');
 for(const name of ['arena-grid','placement','pathing'])A.match(build,new RegExp("'"+name+"'"));
});
test('package version is v0.16.0',()=>A.equal(pkg.version,'0.16.0'));
```

- [ ] **Step 2: Run and verify RED**

Run:
```bash
node --test tests/v160-regressions.test.cjs
```
Expected: FAIL while package/build still identify v0.15.0 and new modules are absent.

- [ ] **Step 3: Update build/version/module ordering**

Set:
```json
{"version":"0.16.0"}
```
And in `tools/build-web.js`:
```js
const VERSION='0.16.0';
const engineModules=['catalog','arena-grid','placement','pathing','road-data','progression','profile','navigation','learning','training-decks','training-scheduler','ai','battle','core'];
const modules=['catalog','arena-grid','placement','pathing','road-data','progression','profile','navigation','learning','learning-store','appdata-store','training-scheduler','ai','audio','training-decks','battle','core','economy','assets','native','text','presentation','platform','menu-model','fx','draw','app'];
```
Use `engineModules` for `trainingEngine` instead of the previous literal list.

- [ ] **Step 4: Update fidelity/report documentation with measured boundaries**

Add to `FIDELITY.md` and `BUILD-REPORT.md`:
```md
- Placement legality and ground routing now use a shared 18×32 grid.
- Preview retarget/spell-hit sets are generated by live-engine predicates.
- Projectile first-shot selection honors `CustomFirstProjectile`.
- Remaining approximation: this is not the original Supercell server simulation; exact native tie-breaking, hidden collision constants, and undocumented path costs may still differ.
```
Do not claim pixel/tick-identical native parity.

- [ ] **Step 5: Build and run the practical full suite**

Run:
```bash
npm run build
node --test $(find tests -maxdepth 1 -name '*.test.cjs' ! -name 'stress.test.cjs' -print | sort)
python -m unittest tests.browser_v160
```
Expected: build exit 0; all practical Node tests and v0.16 browser checks pass. If inherited `stress.test.cjs` still exceeds the environment window, report it separately rather than counting it as passed.

- [ ] **Step 6: Run packaged-worker regressions**

Run the existing packaged self-play worker test command used by v0.15 plus the new engine modules. Expected: both 1v1 and 2v2 headless games finish without placement/pathing exceptions and all bot deployments satisfy arena-grid legality.

---

### Task 7: Final Package, Integrity Check, and Visual Evidence

**Files:**
- Create: `/mnt/data/Web-Royale-v0.16.0-Placement-Combat-Fidelity.zip`
- Create: `/mnt/data/Web-Royale-v0.16.0-Build-Report.md`
- Create: `/mnt/data/Web-Royale-v0.16.0-SHA256.txt`
- Create: `/mnt/data/Web-Royale-v0.16.0-Preview.png`

**Interfaces:**
- Release contains `Web-Royale/dist/`, source, tests, corrected offline opener, and docs.
- Release excludes duplicate build-input extraction trees, QA scratch captures, caches, `node_modules`, and all font files.

- [ ] **Step 1: Verify requirements before packaging**

Run:
```bash
node --test tests/arena-grid-v160.test.cjs tests/placement-v160.test.cjs tests/pathing-v160.test.cjs tests/projectile-v160.test.cjs tests/ui-v160.test.cjs tests/v160-regressions.test.cjs
python -m unittest tests.browser_v160
npm run build
```
Expected: all commands exit 0.

- [ ] **Step 2: Create preview from actual Chromium captures**

Use `cannon-placement.png`, `spell-highlight.png`, and `target-warning.png` in a three-panel image; do not generate a mockup.

- [ ] **Step 3: Package the release**

Use Python `zipfile` to include the project while excluding `.git`, `node_modules`, caches, `assets/` duplicate extraction tree when `dist` already contains the complete playable runtime, `docs/qa` scratch captures, and `*.ttf/*.otf/*.woff/*.woff2/*.ttc`.

- [ ] **Step 4: Verify ZIP integrity and required entries**

```python
with zipfile.ZipFile(zip_path) as z:
    assert z.testzip() is None
    names=set(z.namelist())
    for required in ['Web-Royale/dist/index.html','Web-Royale/offline build opener.bat','Web-Royale/src/arena-grid.js','Web-Royale/src/placement.js','Web-Royale/src/pathing.js','Web-Royale/tests/browser_v160.py']:
        assert required in names
    assert not any(Path(n).suffix.lower() in {'.ttf','.otf','.woff','.woff2','.ttc'} for n in names)
```

- [ ] **Step 5: Generate SHA-256 and copy the final report**

Write the release SHA-256 to `/mnt/data/Web-Royale-v0.16.0-SHA256.txt`, copy `BUILD-REPORT.md` to `/mnt/data/Web-Royale-v0.16.0-Build-Report.md`, and place the real Chromium preview at `/mnt/data/Web-Royale-v0.16.0-Preview.png`.

- [ ] **Step 6: Final claim gate**

Before saying the build is complete, read the fresh output from the full practical Node suite, v0.16 Chromium run, build command, packaged worker tests, and ZIP integrity check. Report any unrun/timeout suite by name. Never state native pixel/tick parity unless separately measured against the actual game.
