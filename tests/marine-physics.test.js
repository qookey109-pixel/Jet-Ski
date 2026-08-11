const assert = require('assert');
const voxelModule = require('../src/marine-voxel-hydrodynamics.js');
const createVoxel = voxelModule.createMarineVoxelHydrodynamicsModel;

const config = {
  waterDensity: 1025,
  craftMassKg: 118,
  footprint: { longitudinalRadius: 1.32, lateralRadius: 1.28 },
  heaveFrequencyHz: 1.35,
  heaveDampingRatio: 0.78,
  maxHeaveAcceleration: 16,
  pitchFrequencyHz: 1.65,
  pitchDampingRatio: 0.80,
  maxPitchAngularAcceleration: 5.8,
  rollFrequencyHz: 1.90,
  rollDampingRatio: 0.84,
  maxRollAngularAcceleration: 7.4,
  wavePitchGain: 0.92,
  waveRollGain: 0.96,
  maxPitch: 0.38,
  maxRoll: 0.46,
  planingStartRatio: 0.20,
  planingLiftMax: 0.20
};

function params(surfaceAt) {
  return {
    dt: 1 / 120,
    position: { x: 0, y: 0.62, z: 0 },
    forward: { x: 0, z: 1 },
    right: { x: 1, z: 0 },
    speedRatio: 0,
    dynamicPitch: 0,
    dynamicRoll: 0,
    surfaceAt,
    floatClearance: 0.62
  };
}

let model = createVoxel(config);
model.syncPose(0.62, 0, 0);
let pose;
for (let i = 0; i < 1200; i++) pose = model.updateSurfacePose(params(() => 0));
assert(Number.isFinite(pose.y));
assert(Math.abs(pose.y - 0.62) < 0.08);
assert(Math.abs(pose.pitch) < 0.01);
assert(Math.abs(pose.roll) < 0.01);
const flatDiag = model.diagnostics();
assert(flatDiag.activeCells > 0 && flatDiag.activeCells <= flatDiag.voxelCount);
assert(flatDiag.submergedFraction > 0.35 && flatDiag.submergedFraction < 0.70);

model = createVoxel(config);
model.syncPose(0.62, 0, 0);
for (let i = 0; i < 600; i++) pose = model.updateSurfacePose(params((x, z) => z * 0.08));
assert(pose.pitch > 0.02);

model = createVoxel(config);
model.syncPose(0.62, 0, 0);
for (let i = 0; i < 600; i++) pose = model.updateSurfacePose(params((x, z) => x * 0.08));
assert(pose.roll < -0.02);

// Giant-wave stability: the reduced voxel integrator must stay finite and respect angle clamps.
model = createVoxel(config);
model.syncPose(0.62, 0, 0);
for (let i = 0; i < 12000; i++) {
  const t = i / 60;
  const surfaceAt = (x, z) =>
    3.0 * Math.sin(x * 0.025 + z * 0.035 - t * 0.7)
    + 1.6 * Math.sin(-x * 0.05 + z * 0.02 + t * 1.1)
    + 0.8 * Math.sin(x * 0.11 - z * 0.08 - t * 1.7);
  pose = model.updateSurfacePose({
    dt: 1 / 60,
    position: { x: 0, y: pose ? pose.y : 0.62, z: 0 },
    forward: { x: 0, z: 1 },
    right: { x: 1, z: 0 },
    speedRatio: 0.65,
    dynamicPitch: 0.04 * Math.sin(t * 0.5),
    dynamicRoll: 0.12 * Math.sin(t * 0.8),
    surfaceAt,
    floatClearance: 0.62
  });
  assert(Number.isFinite(pose.y) && Number.isFinite(pose.pitch) && Number.isFinite(pose.roll));
  assert(Math.abs(pose.pitch) <= config.maxPitch + 1e-6);
  assert(Math.abs(pose.roll) <= config.maxRoll + 1e-6);
}

// Selector contract: 9-point remains default and non-pose forces keep using baseline logic.
global.createMarineVoxelHydrodynamicsModel = createVoxel;
global.createHydrodynamicsModel = () => ({
  syncPose() {},
  updateSurfacePose() { return { y: 1, pitch: 0, roll: 0 }; },
  relativeWaterKinematics() { return 'baseline-rwk'; },
  longitudinalDrag() { return 1; },
  lateralDamping() { return 2; },
  getLandingLoss() { return 3; },
  diagnostics() { return { baseline: true }; },
  modelName: 'baseline'
});
require('../src/marine-hydrodynamics-selector.js');
const selector = global.createHydrodynamicsModel(config);
assert.strictEqual(selector.mode, 'nine-point');
assert.strictEqual(selector.updateSurfacePose(params(() => 0)).y, 1);
assert.strictEqual(selector.relativeWaterKinematics(), 'baseline-rwk');
selector.setMode('voxel');
assert.strictEqual(selector.mode, 'voxel');
assert(Number.isFinite(selector.updateSurfacePose(params(() => 0)).y));
assert.strictEqual(selector.lateralDamping(), 2);
selector.toggleMode();
assert.strictEqual(selector.mode, 'nine-point');

console.log('marine-physics tests PASS');
