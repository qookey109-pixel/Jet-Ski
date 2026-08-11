const assert = require('assert');
const { createMarineVoxelHydrodynamicsModel } = require('../src/marine-voxel-hydrodynamics.js');
const { computeVoxelContactDecel } = require('../src/v0983-water-contact-forces.js');

const config = {
  gravity: 9.81,
  waterDensity: 1025,
  craftMassKg: 118,
  footprint: { longitudinalRadius: 1.32, lateralRadius: 1.28 },
  heaveFrequencyHz: 1.35,
  maxHeaveAcceleration: 16,
  pitchFrequencyHz: 1.65,
  maxPitchAngularAcceleration: 5.8,
  rollFrequencyHz: 1.90,
  maxRollAngularAcceleration: 7.4,
  maxPitch: 0.38,
  maxRoll: 0.46,
  planingStartRatio: 0.20,
  planingLiftMax: 0.20
};

function step(model, surfaceAt, y = 0.62, speedRatio = 0.55) {
  return model.updateSurfacePose({
    dt: 1 / 60,
    position: { x: 0, y, z: 0 },
    forward: { x: 0, z: 1 },
    right: { x: 1, z: 0 },
    speedRatio,
    dynamicPitch: 0,
    dynamicRoll: 0,
    surfaceAt,
    floatClearance: 0.62
  });
}

const model = createMarineVoxelHydrodynamicsModel(config);
model.syncPose(0.62, 0, 0);

// Priming must not create a fake 24-cell impact when switching into Voxel mode.
let pose = step(model, () => 0);
let d = model.diagnostics();
assert.strictEqual(d.contactPrimed, true);
assert.strictEqual(d.waterEntry, 0);
assert(Math.abs(d.slamLoad) < 1e-9);

// Steady water should remain quiet.
for (let i = 0; i < 30; i++) pose = step(model, () => 0, pose.y);
d = model.diagnostics();
assert(d.slamLoad < 0.02);

// A sudden rising water surface should create progressive entry/slamming load.
pose = step(model, () => 0.34, pose.y, 0.75);
d = model.diagnostics();
assert(d.waterEntry > 0);
assert(d.slamLoad > 0);
assert(d.slamLoad <= 1);
assert(Number.isFinite(d.slamVerticalForce) && d.slamVerticalForce >= 0);

// The load must decay rather than remain an impulse latch.
const peak = d.slamLoad;
for (let i = 0; i < 90; i++) pose = step(model, () => 0.34, pose.y, 0.75);
d = model.diagnostics();
assert(d.slamLoad < peak);

// Contact drag is continuous, bounded and grows with wetness/speed/slamming.
assert.strictEqual(computeVoxelContactDecel({ wetness: 0, slamLoad: 0, speedRatio: 1 }), 0);
const light = computeVoxelContactDecel({ wetness: 0.3, slamLoad: 0, speedRatio: 0.4 });
const wetFast = computeVoxelContactDecel({ wetness: 0.9, slamLoad: 0, speedRatio: 0.9 });
const slamming = computeVoxelContactDecel({ wetness: 0.9, slamLoad: 0.7, speedRatio: 0.9 });
assert(light > 0);
assert(wetFast > light);
assert(slamming > wetFast);
assert(slamming <= 6.8);

console.log('v0983-water-contact-forces tests PASS');
