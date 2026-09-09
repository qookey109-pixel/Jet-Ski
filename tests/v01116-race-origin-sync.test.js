'use strict';

const assert = require('assert');
const { shiftRaceLocalFrame } = require('../src/game/race-origin-sync.js');

const course = {
  id: 'waikiki-offshore',
  checkpoints: [
    { id: 'start', x: 0, z: 0 },
    { id: 'cp4', x: 258.6, z: -54.8 }
  ]
};
const gates = [
  { position: { x: 0, z: 0 } },
  { position: { x: 258.6, z: -54.8 } }
];
const racers = [
  { agent: { x: 244, z: -41 }, visual: { position: { x: 244, z: -41 } } },
  { agent: { x: 271, z: -63 }, visual: { position: { x: 271, z: -63 } } }
];

const beforeDx = course.checkpoints[1].x - course.checkpoints[0].x;
const beforeDz = course.checkpoints[1].z - course.checkpoints[0].z;
const result = shiftRaceLocalFrame(course, gates, racers, 160, 0);

assert.equal(result.shifted, true);
assert.equal(result.checkpoints, 2);
assert.equal(result.gates, 2);
assert.equal(result.racers, 2);
assert.equal(result.shiftX, 160);
assert.equal(result.shiftZ, 0);
assert(Math.abs(course.checkpoints[1].x - 98.6) < 1e-9);
assert(Math.abs(gates[1].position.x - 98.6) < 1e-9);
assert.equal(racers[0].agent.x, 84);
assert.equal(racers[0].visual.position.x, 84);
assert(Math.abs((course.checkpoints[1].x - course.checkpoints[0].x) - beforeDx) < 1e-9);
assert(Math.abs((course.checkpoints[1].z - course.checkpoints[0].z) - beforeDz) < 1e-9);

const snapshot = JSON.stringify({ course, gates, racers });
const noop = shiftRaceLocalFrame(course, gates, racers, 0, 0);
assert.equal(noop.shifted, false);
assert.equal(JSON.stringify({ course, gates, racers }), snapshot);

// The exact V0.9.3 recenter quantum seen in Browser QA must leave target/craft local
// separation unchanged when the whole race frame is shifted together.
const craftBefore = { x: 258.6, z: -54.8 };
const targetBefore = { x: 258.6, z: -54.8 };
const craftAfter = { x: craftBefore.x - 160, z: craftBefore.z };
const targetAfter = course.checkpoints[1];
assert(Math.hypot(craftAfter.x - targetAfter.x, craftAfter.z - targetAfter.z) < 1e-9);
assert(Math.hypot(craftBefore.x - targetBefore.x, craftBefore.z - targetBefore.z) < 1e-9);

console.log('V0.11.16 race floating-origin local-frame sync PASS');
