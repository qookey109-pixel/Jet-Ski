const assert = require('assert');
const Cup = require('../src/game/championship-core.js');

assert.equal(Cup.VERSION, 'V0.11.6');
assert.deepEqual(Cup.POINTS, [10,7,5,3]);
assert.equal(Cup.pointsForPlacement(1), 10);
assert.equal(Cup.pointsForPlacement(2), 7);
assert.equal(Cup.pointsForPlacement(3), 5);
assert.equal(Cup.pointsForPlacement(4), 3);
assert.equal(Cup.pointsForPlacement(99), 3);

const events = ['open-sea-circuit','waikiki-offshore','qixingtan-bluewater'];
const racers = ['player','coral','tide','mango'];
const state = Cup.createChampionship(events, racers);
state.active = true;

Cup.addStageResult(state, events[0], ['player','tide','coral','mango']);
Cup.addStageResult(state, events[1], ['tide','player','mango','coral']);
assert.equal(state.complete, false);
assert.equal(state.stageIndex, 2);
assert.equal(state.standings.player.points, 17);
assert.equal(state.standings.tide.points, 17);

Cup.addStageResult(state, events[2], ['player','coral','tide','mango']);
assert.equal(state.complete, true);
assert.equal(state.active, false);
assert.equal(state.stageIndex, 3);
assert.equal(state.standings.player.points, 27);
assert.equal(state.standings.player.wins, 2);
assert.equal(Cup.overallPlacement(state, 'player'), 1);
assert.equal(Cup.standingsArray(state)[0].id, 'player');

let records = Cup.createRecords();
let result = Cup.recordChampionship(records, state, 'player');
records = result.records;
assert.equal(result.placement, 1);
assert.equal(result.points, 27);
assert.equal(records.championshipsCompleted, 1);
assert.equal(records.championshipWins, 1);
assert.equal(records.bestPoints, 27);
assert.equal(records.bestOverallPlacement, 1);

for (let i = 0; i < 20000; i++) {
  const s = Cup.createChampionship(events, racers);
  s.active = true;
  const rotations = i % 4;
  for (let stage = 0; stage < 3; stage++) {
    const ranking = racers.slice(rotations).concat(racers.slice(0, rotations));
    Cup.addStageResult(s, events[stage], ranking);
  }
  const rows = Cup.standingsArray(s);
  assert.equal(rows.length, 4);
  assert(rows.every(row => Number.isFinite(row.points) && row.points >= 0));
  assert.equal(s.complete, true);
}

console.log('V0.11.6 championship regression PASS');
