'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs');
const draw=fs.readFileSync(require.resolve('../src/draw.js'),'utf8');
test('renderer consumes placement forecast without full debug grid',()=>{A.doesNotMatch(draw,/for\(let x=0;x<=18;x\+\+\).*line\(/s);A.match(draw,/placementPreview\(/);A.match(draw,/drawTargetWarnings/);A.match(draw,/drawSpellHighlights/);A.match(draw,/drawPlacementLabel/);});

test('target warning is a floating outlined exclamation without a badge box',()=>{
 const src=fs.readFileSync(require.resolve('../src/draw.js'),'utf8');
 const fn=src.match(/function drawTargetWarnings\([\s\S]*?\n\}/)?.[0]||'';
 A.doesNotMatch(fn,/rounded\(/);
 A.match(fn,/strokeText\('\!'/);
 A.match(fn,/fillText\('\!'/);
});
