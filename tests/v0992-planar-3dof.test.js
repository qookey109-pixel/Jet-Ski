const assert = require('assert');
const { DEFAULTS, stepPlanarState } = require('../src/v0992-planar-3dof-runtime.js');

function approxFinite(result) {
  for (const key of ['u','v','r','surgeAcceleration','swayAcceleration','yawAcceleration']) {
    assert(Number.isFinite(result[key]), `${key} must be finite`);
  }
}

// Surge should approach a forward command progressively and stay acceleration-bounded.
let s = { u: 0, v: 0, r: 0 };
let out = stepPlanarState(s, {
  commandSurge: 24,
  commandSway: 0,
  commandYawRate: 0,
  maxSpeed: 36,
  slipMax: 4.8
}, 1 / 60);
approxFinite(out);
assert(out.u > 0 && out.u < 24);
assert(out.surgeAcceleration <= DEFAULTS.maxSurgeAcceleration + 1e-9);

// Braking retains stronger authority than normal added-mass response.
const coast = stepPlanarState({ u: 20, v: 0, r: 0 }, {
  commandSurge: 10,
  commandSway: 0,
  commandYawRate: 0,
  brakeHeld: false,
  maxSpeed: 36,
  slipMax: 4.8
}, 1 / 60);
const brake = stepPlanarState({ u: 20, v: 0, r: 0 }, {
  commandSurge: 10,
  commandSway: 0,
  commandYawRate: 0,
  brakeHeld: true,
  maxSpeed: 36,
  slipMax: 4.8
}, 1 / 60);
assert(brake.u < coast.u);
assert(Math.abs(brake.surgeAcceleration) <= DEFAULTS.maxBrakeAcceleration + 1e-9);

// Positive yaw with forward speed should produce a small outward/right sway tendency.
out = stepPlanarState({ u: 22, v: 0, r: 0.7 }, {
  commandSurge: 22,
  commandSway: 0,
  commandYawRate: 0.7,
  maxSpeed: 36,
  slipMax: 4.8
}, 1 / 60);
assert(out.turnCoupling > 0);
assert(out.v > 0);
assert(Math.abs(out.swayAcceleration) <= DEFAULTS.maxSwayAcceleration + 1e-9);

// Yaw rate should move toward the command without overshoot or angular-acceleration spikes.
out = stepPlanarState({ u: 18, v: 0, r: 0 }, {
  commandSurge: 18,
  commandSway: 0,
  commandYawRate: 1.2,
  maxSpeed: 36,
  slipMax: 4.8
}, 1 / 60);
assert(out.r > 0 && out.r < 1.2);
assert(Math.abs(out.yawAcceleration) <= DEFAULTS.maxYawAcceleration + 1e-9);

// Sway should decay when the command is neutral and there is no yaw coupling.
out = stepPlanarState({ u: 10, v: 2.0, r: 0 }, {
  commandSurge: 10,
  commandSway: 0,
  commandYawRate: 0,
  maxSpeed: 36,
  slipMax: 4.8
}, 1 / 60);
assert(out.v < 2.0);

// Deterministic long-run stress: no NaN, no state escape under rapidly changing commands.
s = { u: 8, v: 0, r: 0 };
for (let i = 0; i < 20000; i++) {
  const phase = i * 0.013;
  const commandSurge = 18 + 14 * Math.sin(phase * 0.31);
  const commandSway = 3.6 * Math.sin(phase * 1.17);
  const commandYawRate = 1.45 * Math.sin(phase * 0.73);
  out = stepPlanarState(s, {
    commandSurge,
    commandSway,
    commandYawRate,
    brakeHeld: (i % 997) < 55,
    maxSpeed: 36,
    slipMax: 4.8
  }, 1 / 60);
  approxFinite(out);
  assert(out.u >= -1e-9 && out.u <= 36 + 1e-9);
  assert(Math.abs(out.v) <= 4.8 + 1e-9);
  assert(Math.abs(out.r) <= DEFAULTS.maxYawRate + 1e-9);
  s = { u: out.u, v: out.v, r: out.r };
}

console.log('v0992-planar-3dof tests PASS');
