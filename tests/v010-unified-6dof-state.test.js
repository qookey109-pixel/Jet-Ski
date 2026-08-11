const assert = require('assert');
const {
  createEmptyContract,
  buildUnifiedSnapshot,
  measuredAngularRate
} = require('../src/v010-unified-6dof-state.js');

const previous = buildUnifiedSnapshot({
  mode: 'nine-point-plus',
  pose: { x: 10, y: 2, z: 20, roll: 0.10, pitch: -0.05, yaw: 3.13 },
  worldOffset: { x: 160, z: -320 },
  planar: { u: 18, v: 0.4, r: 0.22, surgeAcceleration: 1.5, swayAcceleration: -0.3, yawAcceleration: 0.12 },
  plus: { heaveVelocity: 0.8, heaveAcceleration: -1.2 },
  steering: { yawMomentNm: 210 }
}, createEmptyContract(), 1 / 60);

assert.strictEqual(previous.active, true);
assert.deepStrictEqual(previous.position, { x: 170, y: 2, z: -300 });
assert.deepStrictEqual(previous.renderPosition, { x: 10, y: 2, z: 20 });
assert.strictEqual(previous.velocity.u, 18);
assert.strictEqual(previous.velocity.v, 0.4);
assert.strictEqual(previous.velocity.w, 0.8);
assert.strictEqual(previous.angularVelocity.r, 0.22);
assert.strictEqual(previous.momentNm.Mz, 210);
assert.strictEqual(previous.forceN.Fx, null, 'V0.10.0 must not invent force values before calibration');
assert.strictEqual(previous.momentNm.Mx, null, 'V0.10.0 must not invent roll moment');
assert.strictEqual(previous.authority.observerOnly, true);
assert.strictEqual(previous.authority.writesPose, false);

const next = buildUnifiedSnapshot({
  mode: 'nine-point-plus',
  pose: { x: 11, y: 2.02, z: 20.4, roll: 0.11, pitch: -0.04, yaw: -3.13 },
  worldOffset: { x: 160, z: -320 },
  planar: { u: 18.4, v: 0.35, r: 0.24, surgeAcceleration: 1.3, swayAcceleration: -0.2, yawAcceleration: 0.10 },
  plus: { heaveVelocity: 0.72, heaveAcceleration: -0.9 },
  steering: { yawMomentNm: 180 }
}, previous, 1 / 60);

assert(next.angularVelocity.p > 0, 'observer p should follow final roll pose when internal roll-rate is not public');
assert(next.angularVelocity.q > 0, 'observer q should follow final pitch pose when internal pitch-rate is not public');
assert(Number.isFinite(next.measuredRates.r));
assert(Math.abs(next.measuredRates.r) < 3, 'yaw wrap must use shortest angular delta');
assert.strictEqual(next.angularVelocity.r, 0.24, 'planar r remains authoritative over measured yaw delta');

const base = buildUnifiedSnapshot({
  mode: 'nine-point',
  pose: { x: 0, y: 1, z: 0, roll: 0, pitch: 0, yaw: 0 },
  planar: { u: 99, v: 99, r: 99 },
  plus: { heaveVelocity: 99 },
  steering: { yawMomentNm: 999 }
}, next, 1 / 60);
assert.strictEqual(base.active, false);
assert.strictEqual(base.velocity.u, null, 'Base mode must not be claimed by the Plus-only contract');
assert.strictEqual(base.angularVelocity.r, null);
assert.strictEqual(base.momentNm.Mz, null);

assert(Math.abs(measuredAngularRate(-3.13, 3.13, 1 / 60)) < 3);

let state = createEmptyContract();
for (let i = 0; i < 20000; i++) {
  const phase = i * 0.011;
  state = buildUnifiedSnapshot({
    mode: 'nine-point-plus',
    pose: {
      x: Math.sin(phase) * 200,
      y: 2 + Math.sin(phase * 1.7),
      z: Math.cos(phase) * 200,
      roll: Math.sin(phase * 1.2) * 0.3,
      pitch: Math.cos(phase * 0.9) * 0.25,
      yaw: ((phase + Math.PI) % (Math.PI * 2)) - Math.PI
    },
    worldOffset: { x: (i % 5) * 160, z: -(i % 7) * 160 },
    planar: {
      u: 20 + 10 * Math.sin(phase * 0.4),
      v: 3 * Math.sin(phase * 1.1),
      r: 1.2 * Math.sin(phase * 0.8),
      surgeAcceleration: 8 * Math.sin(phase * 0.6),
      swayAcceleration: 4 * Math.cos(phase * 0.7),
      yawAcceleration: 2 * Math.sin(phase * 0.5)
    },
    plus: {
      heaveVelocity: 4 * Math.sin(phase * 1.5),
      heaveAcceleration: 12 * Math.cos(phase * 1.5)
    },
    steering: { yawMomentNm: 500 * Math.sin(phase * 0.9) }
  }, state, 1 / 60);

  for (const group of ['position', 'renderPosition', 'orientation', 'measuredRates']) {
    for (const value of Object.values(state[group])) assert(Number.isFinite(value), `${group} values must stay finite`);
  }
  for (const value of Object.values(state.velocity)) assert(value === null || Number.isFinite(value));
  for (const value of Object.values(state.angularVelocity)) assert(value === null || Number.isFinite(value));
}

console.log('v010-unified-6dof-state tests PASS');
