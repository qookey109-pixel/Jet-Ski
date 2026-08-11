const assert = require('assert');

// Minimal deterministic 9-point baseline stub. The Plus layer must consume the baseline
// targets rather than replacing the trusted footprint with its own sampling scheme.
global.createHydrodynamicsModel = function baselineFactory(config) {
  let y = 0.62;
  return {
    syncPose(nextY) { y = nextY; },
    updateSurfacePose(params) {
      const L = 1.32;
      const R = 1.28;
      const D = 0.72;
      const pts = [
        [ L, 0], [-L, 0], [0, R], [0, -R],
        [ L * D, R * D], [ L * D, -R * D],
        [-L * D, R * D], [-L * D, -R * D], [0, 0]
      ];
      const h = pts.map(([f, r]) => params.surfaceAt(r, f));
      const mean = h.reduce((a, b) => a + b, 0) / h.length;
      const frontMean = (h[0] + h[4] + h[5]) / 3;
      const rearMean = (h[1] + h[6] + h[7]) / 3;
      const rightMean = (h[2] + h[4] + h[6]) / 3;
      const leftMean = (h[3] + h[5] + h[7]) / 3;
      const targetY = mean + params.floatClearance;
      y = targetY;
      return {
        y,
        pitch: 0,
        roll: 0,
        targetY,
        waterPitch: Math.atan2(frontMean - rearMean, L * 2),
        waterRoll: -Math.atan2(rightMean - leftMean, R * 2),
        immersionVariance: 0,
        planingLift: 0
      };
    },
    relativeWaterKinematics() { return 'baseline-rwk'; },
    longitudinalDrag() { return 1; },
    lateralDamping() { return 2; },
    getLandingLoss() { return 0.09; },
    diagnostics() { return { baseline: true }; },
    modelName: 'baseline-stub'
  };
};

require('../src/nine-point-plus-hydrodynamics.js');
const createPlus = global.createNinePointPlusHydrodynamicsModel;
assert.strictEqual(typeof createPlus, 'function');

const config = {
  gravity: 9.81,
  maxHeaveAcceleration: 16,
  pitchFrequencyHz: 1.65,
  rollFrequencyHz: 1.90,
  maxPitchAngularAcceleration: 5.8,
  maxRollAngularAcceleration: 7.4,
  maxPitch: 0.38,
  maxRoll: 0.46
};

function params(surfaceAt, dt = 1 / 60) {
  return {
    dt,
    position: { x: 0, y: 0.62, z: 0 },
    forward: { x: 0, z: 1 },
    right: { x: 1, z: 0 },
    speedRatio: 0.45,
    dynamicPitch: 0,
    dynamicRoll: 0,
    surfaceAt,
    floatClearance: 0.62
  };
}

// Flat water equilibrium.
let model = createPlus(config);
model.syncPose(0.62, 0, 0);
let pose;
for (let i = 0; i < 600; i++) pose = model.updateSurfacePose(params(() => 0));
assert(Number.isFinite(pose.y));
assert(Math.abs(pose.y - 0.62) < 0.025);
assert(Math.abs(pose.heaveVelocity) < 0.03);

// Water suddenly drops: explicit gravity must create downward acceleration and velocity.
pose = model.updateSurfacePose(params(() => -0.55));
assert(pose.heaveAcceleration < -1.0);
for (let i = 0; i < 30; i++) pose = model.updateSurfacePose(params(() => -0.55));
assert(pose.y < 0.58);
assert(pose.heaveVelocity < 0);

// Water suddenly rises: buoyancy must push upward.
model = createPlus(config);
model.syncPose(0.62, 0, 0);
pose = model.updateSurfacePose(params(() => 0.50));
assert(pose.heaveAcceleration > 1.0);

// A rising front wave and higher right side must produce finite, bounded attitude response.
model = createPlus(config);
model.syncPose(0.62, 0, 0);
for (let i = 0; i < 240; i++) {
  pose = model.updateSurfacePose(params((x, z) => z * 0.09 + x * 0.06));
}
assert(Number.isFinite(pose.pitch) && Number.isFinite(pose.roll));
assert(pose.pitch > 0.01);
assert(pose.roll < -0.01);
assert(Math.abs(pose.pitch) <= config.maxPitch + 1e-9);
assert(Math.abs(pose.roll) <= config.maxRoll + 1e-9);

const d = model.diagnostics();
assert.strictEqual(d.explicitGravity, true);
assert.strictEqual(d.ninePointAuthority, true);
assert(d.centerOfMassVerticalM < 0);

// Runtime helpers: yaw inertia is bounded; landing reservoir maps impact progressively.
const runtime = require('../src/v099-nine-point-plus-runtime.js');
assert(Math.abs(runtime.normalizeAngle(Math.PI * 3) - Math.PI) < 1e-9);
const yawRate = runtime.smoothYawRate(0, 10, 1 / 60, 7.2, 1.55);
assert(yawRate > 0 && yawRate <= 1.55);
assert.strictEqual(runtime.landingLoadFromImpact(1.0), 0);
assert(runtime.landingLoadFromImpact(5.0) > 0);
assert(runtime.landingLoadFromImpact(20) <= 1);

// Selector: Plus is default; P-style toggle stays Plus <-> Base; Voxel is explicit only.
global.createMarineVoxelHydrodynamicsModel = () => ({
  syncPose() {},
  updateSurfacePose() { return { y: 0.62, pitch: 0, roll: 0 }; },
  diagnostics() { return {}; },
  modelName: 'voxel-stub'
});
require('../src/marine-hydrodynamics-selector.js');
const selector = global.createHydrodynamicsModel(config);
assert.strictEqual(selector.mode, 'nine-point-plus');
selector.toggleMode();
assert.strictEqual(selector.mode, 'nine-point');
selector.toggleMode();
assert.strictEqual(selector.mode, 'nine-point-plus');
selector.setMode('voxel');
assert.strictEqual(selector.mode, 'voxel');
selector.toggleMode();
assert.strictEqual(selector.mode, 'nine-point-plus');

console.log('nine-point-plus tests PASS');
