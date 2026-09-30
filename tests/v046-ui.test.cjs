'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs');
const app=fs.readFileSync(require.resolve('../src/app.js'),'utf8'),html=fs.readFileSync(require.resolve('../src/index.template.html'),'utf8'),arena=fs.readFileSync(require.resolve('../src/custom-arena.js'),'utf8');

test('v046 replaces Clan navigation with Online Play coming soon',()=>{
 a.match(app,/\['online','Online','team-icon'\]/);a.doesNotMatch(app,/\['clan','Clan','team-icon'\]/);a.match(html,/id="online"/);a.doesNotMatch(html,/id="clan"/);a.doesNotMatch(html,/id="clanChat"/);a.doesNotMatch(app,/if\(id==='clan'\)renderClan/);a.match(app,/Online Play/);a.match(app,/Coming Soon/);
});

test('v046 reorganizes Other Modes groups and removes FFA card',()=>{
 a.match(app,/\['Elixir',/);a.match(app,/\['Other Modes',/);a.doesNotMatch(app,/\['Elixir & Rules'/);a.doesNotMatch(app,/\['Practice'/);a.doesNotMatch(app,/1v1v1v1 FFA/);a.match(app,/SixCardDeck/);a.match(app,/UncappedElixir/);
});

test('v046 custom arena renderer uses detailed source-backed arena scenery and official-style touchdown stadium',()=>{
 a.match(arena,/sourceArenaBackdrop/);a.match(arena,/Touchdown.*Stadium|touchdown.*stadium/i);a.match(arena,/spectator/i);a.match(arena,/checker|turf/i);a.match(arena,/touchdown trapdoor/i);a.match(arena,/touchdown corner statue/i);
});
