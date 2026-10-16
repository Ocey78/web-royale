'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/catalog');
test('Ultimate deck slots and collection display Mirror as variable cost while Bandit Squad displays18',()=>{
 const text=fs.readFileSync(require.resolve('../src/app'),'utf8'),context={C,specialSlot:0,esc:x=>x,word:x=>x,menuFormTop:()=>'',cardVisual:()=>''};
 vm.runInNewContext(text.slice(text.indexOf('function modeDeckCard('),text.indexOf('function renderSpecialDeckScreen(')),context);
 const state={duplicates:false,deck:[]};for(const render of [id=>context.modeDeckCard(id,0,state),id=>context.modeCollectionCard(id,state)]){assert.match(render('ultimate-mirror'),/class="cost game-text">\?<\/span>/);assert.match(render('ultimate-bandit-squad'),/class="cost game-text">18<\/span>/);}
});
