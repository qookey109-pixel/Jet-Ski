const assert = require('assert');
const T3 = require('../src/rendering/tropical-polish-core.js');

assert.equal(T3.VERSION, 'V0.11.16-T3');
assert.equal(T3.visualOnly, true);
assert.equal(T3.collisionAdded, false);
assert.equal(T3.physicsUntouched, true);
assert.equal(T3.gameplayUntouched, true);
assert.equal(T3.raceRulesUntouched, true);
assert.equal(T3.waterPhysicsUntouched, true);

const placements = [
  { x: 100, z: 40, radius: 18, yaw: 0.2 },
  { x: -80, z: -120, radius: 15, yaw: -0.4 },
  { x: 220, z: -30, radius: 20, yaw: 1.1 }
];

const rocksA = T3.rockSeeds(placements, 20);
const rocksB = T3.rockSeeds(placements, 20);
assert.deepEqual(rocksA, rocksB, 'rock decoration must be deterministic');
assert(rocksA.length > placements.length, 'expected multiple rocks per island');
assert(rocksA.length <= 20, 'rock budget exceeded');
assert(rocksA.every(r => Number.isFinite(r.x) && Number.isFinite(r.z) && r.scale > 0));

const foam = T3.shorelineSeeds(placements, 4, T3.DEFAULTS.shorelineScale);
const shallow = T3.shorelineSeeds(placements, 4, T3.DEFAULTS.shallowScale);
assert.equal(foam.length, placements.length);
assert.equal(shallow.length, placements.length);
assert(shallow.every((s, i) => s.radius > foam[i].radius), 'shallow color band must sit outside foam edge');

const course = { checkpoints: [
  { x: 0, z: 0 }, { x: 0, z: -200 }, { x: 220, z: -200 }, { x: 220, z: 0 }
]};
const farA = T3.distantIslandSeeds(course, 5);
const farB = T3.distantIslandSeeds(course, 5);
assert.deepEqual(farA, farB, 'distant silhouettes must be deterministic');
assert.equal(farA.length, 5);
assert(farA.every(s => Number.isFinite(s.x) && Number.isFinite(s.z) && s.scale > 0));

assert.equal(T3.speedVisualStrength(0, 20), 0);
assert.equal(T3.speedVisualStrength(10, 20), 0.5);
assert.equal(T3.speedVisualStrength(30, 20), 1);

assert.equal(T3.shouldShowForEvent({ id: 'open-sea-circuit', worldMode: 'open-sea' }, false), true);
assert.equal(T3.shouldShowForEvent({ id: 'pacific-crown-final', worldMode: 'open-sea' }, false), false);
assert.equal(T3.shouldShowForEvent({ id: 'open-sea-circuit', worldMode: 'open-sea' }, true), false);

console.log('V0.11.16 Tropical Arcade T3 polish core regression PASS');
