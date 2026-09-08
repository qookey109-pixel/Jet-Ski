const assert = require('assert');
const Race = require('../src/game/race-course.js');

assert.equal(Race.VERSION, 'V0.11.0');
const course = Race.OPEN_SEA_CIRCUIT;
assert.equal(course.checkpoints.length, 8);
assert.equal(course.laps, 2);
assert.equal(Race.formatRaceTime(0), '0:00.000');
assert.equal(Race.formatRaceTime(62543), '1:02.543');
assert.equal(Race.distanceSq2D({ x: 0, z: 0 }, { x: 3, z: 4 }), 25);

let state = Race.createRaceState(course);
assert.equal(state.phase, 'menu');
Race.beginRace(state, 1000);
assert.equal(state.phase, 'racing');
assert.equal(state.nextCheckpointIndex, 1);
assert.equal(state.lap, 1);

const wrong = Race.passCheckpoint(state, 2, 1500, course);
assert.equal(wrong.accepted, false);
assert.equal(wrong.event, 'wrong-checkpoint');
assert.equal(state.nextCheckpointIndex, 1);
assert.equal(state.wrongWayHits, 1);

let now = 2000;
for (let lap = 1; lap <= 2; lap++) {
  for (let cp = 1; cp < course.checkpoints.length; cp++) {
    const result = Race.passCheckpoint(state, cp, now, course);
    assert.equal(result.accepted, true);
    assert.equal(result.event, 'checkpoint');
    now += 1000;
  }
  assert.equal(state.nextCheckpointIndex, 0);
  const finishLine = Race.passCheckpoint(state, 0, now, course);
  assert.equal(finishLine.accepted, true);
  now += 1000;
  if (lap === 1) {
    assert.equal(finishLine.event, 'lap');
    assert.equal(state.lap, 2);
    assert.equal(state.nextCheckpointIndex, 1);
    assert.equal(state.finished, false);
  } else {
    assert.equal(finishLine.event, 'finish');
    assert.equal(state.phase, 'finished');
    assert.equal(state.finished, true);
    assert(state.bestLapMs > 0);
    assert(state.elapsedMs > 0);
  }
}
assert.equal(state.checkpointsPassed, 16);
assert.equal(state.wrongWayHits, 1);

state = Race.createRaceState(course);
Race.beginRace(state, 0);
assert.equal(Race.isInsideTarget(state, { x: 58, z: 58 }, course), true);
assert.equal(Race.isInsideTarget(state, { x: 0, z: 0 }, course), false);
Race.updateRaceClock(state, 12345);
assert.equal(state.elapsedMs, 12345);
assert.equal(state.currentLapMs, 12345);

for (let i = 0; i < 20000; i++) {
  const x = Math.sin(i * 0.013) * 100;
  const z = Math.cos(i * 0.017) * 100;
  const d = Race.distanceSq2D({ x, z }, course.checkpoints[i % course.checkpoints.length]);
  assert(Number.isFinite(d));
  assert(d >= 0);
}

console.log('V0.11.0 race course regression PASS');
