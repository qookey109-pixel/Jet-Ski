const assert = require('assert');

// Minimal deterministic baseline so the Plus model can expose its real internal pitch/roll rates.
global.createHydrodynamicsModel = function baselineFactory() {
  return {
    syncPose() {},
    updateSurfacePose(params) {
      const front = params.surfaceAt(0, 1.32);
      const rear = params.surfaceAt(0, -1.32);
      const right = params.surfaceAt(1.28, 0);
      const left = params.surfaceAt(-1.28, 0);
      return {
        y: params.position.y,
        pitch: 0,
        roll: 0,
        targetY: params.position.y,
        waterPitch: Math.atan2(front - rear, 2.64),
        waterRoll: -Math.atan2(right - left, 2.56),
        immersionVariance: 0,
        planingLift: 0
      };
    },
    relativeWaterKinematics() { return {}; },
    longitudinalDrag() { return 0; },
    lateralDamping() { return 0; },
    getLandingLoss() { return 0; },
    diagnostics() { return { baseline: true }; },
    modelName: 'baseline-stub'
  };
};

require('../src/nine-point-plus-hydrodynamics.js');
const plus = global.createNinePointPlusHydrodynamicsModel({
  gravity: 9.81,
  maxHeaveAcceleration: 16,
  pitchFrequencyHz: 1.65,
  rollFrequencyHz: 1.90,
  maxPitchAngularAcceleration: 5.8,
  maxRollAngularAcceleration: 7.4,
  maxPitch: 0.38,
  maxRoll: 0.46
});
plus.syncPose(0.62, 0, 0);

let pose;
for (let i = 0; i < 12; i++) {
  pose = plus.updateSurfacePose({
    dt: 1 / 60,
    position: { x: 0, y: 0.62, z: 0 },
    dynamicPitch: 0,
    dynamicRoll: 0,
    surfaceAt(x, z) { return z * 0.08 + x * 0.05; },
    floatClearance: 0.62
  });
}

const diagnostics = plus.diagnostics();
assert.strictEqual(diagnostics.internalPitchRollRatesExposed, true);
assert(Number.isFinite(diagnostics.pitchRate));
assert(Number.isFinite(diagnostics.rollRate));
assert.strictEqual(pose.pitchRate, diagnostics.pitchRate);
assert.strictEqual(pose.rollRate, diagnostics.rollRate);

const { createEmptyContract, buildUnifiedSnapshot } = require('../src/v010-unified-6dof-state.js');
const previous = buildUnifiedSnapshot({
  mode: 'nine-point-plus',
  pose: { x: 0, y: 0.62, z: 0, roll: 0.10, pitch: 0.10, yaw: 0 },
  planar: { u: 10, v: 0, r: 0 },
  plus: { heaveVelocity: 0, heaveAcceleration: 0 },
  steering: { yawMomentNm: 0 }
}, createEmptyContract(), 1 / 60);

const internal = buildUnifiedSnapshot({
  mode: 'nine-point-plus',
  // Pose deltas intentionally imply positive finite-difference p/q.
  pose: { x: 0, y: 0.62, z: 0, roll: 0.12, pitch: 0.13, yaw: 0 },
  planar: { u: 10, v: 0, r: 0.1 },
  // Internal rates intentionally point opposite to prove they own the observer source.
  plus: { heaveVelocity: 0, heaveAcceleration: 0, rollRate: -0.72, pitchRate: -0.41 },
  steering: { yawMomentNm: 0 }
}, previous, 1 / 60);

assert(internal.measuredRates.p > 0);
assert(internal.measuredRates.q > 0);
assert.strictEqual(internal.angularVelocity.p, -0.72);
assert.strictEqual(internal.angularVelocity.q, -0.41);
assert.strictEqual(internal.sources.p, '9-Point+ roll-rate');
assert.strictEqual(internal.sources.q, '9-Point+ pitch-rate');
assert.strictEqual(internal.authority.observerOnly, true);
assert.strictEqual(internal.authority.writesPose, false);
assert.strictEqual(internal.authority.writesVelocity, false);

const fallback = buildUnifiedSnapshot({
  mode: 'nine-point-plus',
  pose: { x: 0, y: 0.62, z: 0, roll: 0.13, pitch: 0.14, yaw: 0 },
  planar: { u: 10, v: 0, r: 0.1 },
  plus: { heaveVelocity: 0, heaveAcceleration: 0 },
  steering: { yawMomentNm: 0 }
}, internal, 1 / 60);
assert.strictEqual(fallback.sources.p, 'final-pose finite difference');
assert.strictEqual(fallback.sources.q, 'final-pose finite difference');

const base = buildUnifiedSnapshot({
  mode: 'nine-point',
  pose: { x: 0, y: 0.62, z: 0, roll: 0, pitch: 0, yaw: 0 },
  planar: { u: 99, v: 99, r: 99 },
  plus: { rollRate: 99, pitchRate: 99 },
  steering: { yawMomentNm: 999 }
}, internal, 1 / 60);
assert.strictEqual(base.active, false);
assert.strictEqual(base.angularVelocity.p, null);
assert.strictEqual(base.angularVelocity.q, null);

const { internalRateStatus } = require('../src/v0102-internal-pq-rates.js');
const status = internalRateStatus({ rollRate: -0.2, pitchRate: 0.3 });
assert.strictEqual(status.internalRatesAvailable, true);
assert.strictEqual(status.pSource, '9-Point+ internal rollRate');
assert.strictEqual(status.qSource, '9-Point+ internal pitchRate');

console.log('v0102-internal-pq-rates tests PASS');
