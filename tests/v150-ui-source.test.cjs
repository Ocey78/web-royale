'use strict';
const test=require('node:test');
const A=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const text=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');

test('v150 collection uses arena-plus-ownership card usability instead of deck membership',()=>{
  A.match(text,/const isUnlocked=id=>C\.canUseCard\(profile,id\)/);
  A.doesNotMatch(text,/profile\.decks\.some\(d=>d\.includes\(id\)\)/);
});

test('v150 collection distinguishes reached but undiscovered cards',()=>{
  A.match(text,/Not Found/);
});

test('v150 chest slot arena label reflects the current expanded pool',()=>{
  A.match(text,/poolArena=R\.highestArena\(profile\)\.number/);
  A.match(text,/Arena \$\{poolArena\}/);
});
