const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('Tower Troop panel puts the actual level below its source crown instead of duplicating it inside the frame',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8'),a=source.indexOf('function towerTroops('),z=source.indexOf('\n',a);A.ok(a>=0);let html='';
 const box={profile:{selectedTowerTroop:null},TT:{catalog:[{id:'cannoneer',name:'Cannoneer',rarity:'Epic'}],quote:()=>({level:6,supported:true,unlocked:true,canUse:true}),upgradeQuote:()=>({level:6,maxLevel:16,haveCopies:2,copies:2,levelCap:16,gold:400,canUpgrade:true})},panel:(id,title,body)=>{html=body;},towerTroopVisual:(id,overlay='')=>'<figure>'+overlay+'</figure>',esc:String,fmt:String,button:(label,action,color,attrs)=>'<button '+attrs+'>'+label+'</button>'};
 vm.runInNewContext(source.slice(a,z)+'\ntowerTroops();',box);
 A.doesNotMatch(html,/class="card-level"/,'The source crown must not cover a duplicate level label');
 A.match(html,/Epic · Level 6/);A.match(html,/2 \/ 2 cards · Tower Power cap 16/);A.match(html,/data-level="6"/);
});
