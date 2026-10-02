'use strict';
const test=require('node:test'),a=require('node:assert/strict'),policy=require('../tools/native-policy.cjs');
test('card aliases receive their source entity rotation policy instead of an absent alias lookup',()=>{
 const game={cards:[{id:'flying-machine',source:{SummonCharacter:'DartBarrell'}}],entities:{DartBarrell:{HasRotationOnTimeline:true}}},native={units:{DartBarrell:{},'flying-machine':{rotationTimeline:false}}};policy.apply(game,native);a.equal(native.units.DartBarrell.rotationTimeline,true);a.equal(native.units['flying-machine'].rotationTimeline,true);
});
test('authored native rotation is preserved when imported gameplay data has no rendering flag',()=>{
 const game={cards:[{id:'flying-machine',source:{SummonCharacter:'DartBarrell'}}],entities:{DartBarrell:{}}},native={units:{DartBarrell:{rotationTimeline:true},'flying-machine':{rotationTimeline:true},Knight:{rotationTimeline:false}}};policy.apply(game,native);a.equal(native.units['flying-machine'].rotationTimeline,true);a.equal(native.units.DartBarrell.rotationTimeline,true);a.equal(native.units.Knight.rotationTimeline,false);
});
test('explicit false source policy remains authoritative for ordinary direction-specific artwork',()=>{
 const game={cards:[],entities:{Knight:{HasRotationOnTimeline:false}}},native={units:{Knight:{rotationTimeline:true}}};policy.apply(game,native);a.equal(native.units.Knight.rotationTimeline,false);
});
