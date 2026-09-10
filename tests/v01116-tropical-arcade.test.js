const assert = require('assert');
const Arcade = require('../src/rendering/tropical-arcade-core.js');

assert.equal(Arcade.VERSION, 'V0.11.16-T1');
assert.equal(Arcade.visualOnly, true);
assert.equal(Arcade.physicsUntouched, true);
assert.equal(Arcade.checkpointRulesUntouched, true);
assert.equal(Arcade.boostAuthorityUntouched, true);

assert.equal(Arcade.isDrivingPhase('racing'), true);
assert.equal(Arcade.isDrivingPhase('countdown'), true);
assert.equal(Arcade.isDrivingPhase('paused'), true);
assert.equal(Arcade.isDrivingPhase('free-ride'), true);
assert.equal(Arcade.isDrivingPhase('menu'), false);
assert.equal(Arcade.isDrivingPhase('finished'), false);

const slowCamera = Arcade.cameraOffsets(0);
const fastCamera = Arcade.cameraOffsets(1);
assert(slowCamera.distance > 2, 'camera should pull back');
assert(slowCamera.height > 0.5, 'camera should lift');
assert(fastCamera.distance > slowCamera.distance, 'speed should add modest pull-back');
assert(fastCamera.height > slowCamera.height, 'speed should add modest height');

const nearGate = Arcade.gateVisualScale(10, false);
const midGate = Arcade.gateVisualScale(36, false);
const farGate = Arcade.gateVisualScale(80, false);
const activeNearGate = Arcade.gateVisualScale(10, true);
assert(nearGate >= 0.55 && nearGate <= 0.7, 'near gate should shrink enough to preserve forward visibility');
assert(midGate > nearGate && midGate < farGate, 'gate scale should recover smoothly with distance');
assert(Math.abs(farGate - 1) < 0.001, 'far gate should return to authored visual scale');
assert(activeNearGate > nearGate && activeNearGate < 0.75, 'active emphasis must remain subtle near the camera');
assert(Arcade.DEFAULTS.buoySpacing >= 16, 'lane buoys should not crowd the forward view');
assert(Arcade.DEFAULTS.gateRadius <= 6, 'visual gate radius should stay below the first-pass oversized value');

const course = {
  checkpoints: [
    { x: 0, z: 0 },
    { x: 0, z: -60 },
    { x: 80, z: -60 },
    { x: 80, z: 0 }
  ]
};
const snapshot = JSON.stringify(course);
const markers = Arcade.sampleLaneMarkers(course, { maxBuoys: 40, buoySpacing: 12, laneHalfWidth: 7.5 });
assert(markers.length > 8, 'course should receive visible lane buoys');
assert(markers.length <= 40, 'buoy budget must be bounded');
assert.equal(JSON.stringify(course), snapshot, 'visual sampling must not mutate race course');
assert(markers.every(marker => Number.isFinite(marker.x) && Number.isFinite(marker.z) && Number.isFinite(marker.yaw)));
assert(markers.some(marker => marker.side === -1));
assert(markers.some(marker => marker.side === 1));

const firstPair = markers.filter(marker => marker.segment === 0).slice(0, 2);
assert.equal(firstPair.length, 2);
const separation = Math.hypot(firstPair[0].x - firstPair[1].x, firstPair[0].z - firstPair[1].z);
assert(Math.abs(separation - 15) < 0.001, 'lane pair must preserve configured width');

const pose = Arcade.gatePose(course.checkpoints[0], course.checkpoints[1]);
assert.equal(pose.x, 0);
assert.equal(pose.z, 0);
assert(Number.isFinite(pose.yaw));

const empty = Arcade.sampleLaneMarkers({ checkpoints: [] });
assert.deepEqual(empty, []);

console.log('V0.11.16 Tropical Arcade visual core regression PASS');
