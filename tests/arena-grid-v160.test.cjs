'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const G=require('../src/arena-grid.js');
const K=require('../src/catalog.js');

test('arena grid is 18 by 32 and tile centers round-trip',()=>{
  A.equal(G.COLS,18);A.equal(G.ROWS,32);const p=G.tileCenter(3,25);A.deepEqual(G.worldToTile(p.x,p.y),{col:3,row:25});
});
test('river rejects ground while bridge cells remain passable',()=>{
  A.equal(G.tileFlags(8,15).river,true);const r=G.tileCenter(8,15);A.equal(G.terrainFits(r.x,r.y,.35),false);
  A.equal(G.tileFlags(3,15).bridge,true);const b=G.tileCenter(3,15);A.equal(G.terrainFits(b.x,b.y,.35),true);
});
test('tower footprint cells are blocked',()=>{A.equal(G.tileFlags(8,28).tower,true);A.equal(G.tileFlags(3,25).tower,true);});
test('destroyed princess tower extends only its lane',()=>{
 const towers=[{team:1,king:false,x:3.5*K.SX,hp:0},{team:1,king:false,x:14.5*K.SX,hp:100}];
 A.equal(G.deploymentAllowed(0,3,12,towers,false),true);A.equal(G.deploymentAllowed(0,14,12,towers,false),false);
});
test('place anywhere bypasses team zone but not immutable terrain',()=>{A.equal(G.deploymentAllowed(0,8,12,[],true),true);const p=G.tileCenter(8,15);A.equal(G.terrainFits(p.x,p.y,.35),false);});
