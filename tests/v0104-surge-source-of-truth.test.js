const assert = require('assert');
const {
  YAW_BASELINE_V0102,
  SURGE_BASELINE_V01031,
  SWAY_BASELINE_V0104,
  createCalibrationContract
} = require('../src/v0101-calibration-contract.js');
const planar = require('../src/v0992-planar-3dof-runtime.js');

const contract = createCalibrationContract({
  massKg: 118,
  cgVerticalM: -0.18,
  yawInertiaKgM2: YAW_BASELINE_V0102.yawInertiaKgM2,
  addedMassSurgeRatio: SURGE_BASELINE_V01031.addedMassSurgeRatio,
  addedMassSwayRatio: SWAY_BASELINE_V0104.addedMassSwayRatio,
  addedMassYawRatio: YAW_BASELINE_V0102.addedMassYawRatio,
  surgeResponse: SURGE_BASELINE_V01031.surgeResponse,
  brakeSurgeResponse: SURGE_BASELINE_V01031.brakeSurgeResponse,
  swayResponse: SWAY_BASELINE_V0104.swayResponse,
  swayYawCoupling: SWAY_BASELINE_V0104.swayYawCoupling,
  yawResponse: YAW_BASELINE_V0102.yawResponse,
  swayNonlinearDamping: SWAY_BASELINE_V0104.nonlinearSwayDamping,
  yawLinearDamping: YAW_BASELINE_V0102.yawLinearDamping,
  yawNonlinearDamping: YAW_BASELINE_V0102.yawNonlinearDamping,
  maxSurgeAcceleration: SURGE_BASELINE_V01031.maxSurgeAcceleration,
  maxBrakeAcceleration: SURGE_BASELINE_V01031.maxBrakeAcceleration,
  maxSwayAcceleration: SWAY_BASELINE_V0104.maxSwayAcceleration,
  maxYawAcceleration: YAW_BASELINE_V0102.maxYawAcceleration,
  maxYawRate: YAW_BASELINE_V0102.maxYawRate
});
const root = { V0101_CALIBRATION: { contract } };
const resolved = planar.resolvePlanarDynamicsConfig(root, planar.DEFAULTS);

assert.equal(contract.authority.surgeSourceOfTruth, true);
assert.equal(contract.sourceOfTruth.surge.numericalBaseline, 'V0.10.3.1');
assert.equal(resolved.source, 'V0101_CALIBRATION.contract.surge+sway+yaw');
assert.equal(resolved.config.addedMassSurgeRatio, SURGE_BASELINE_V01031.addedMassSurgeRatio);
assert.equal(resolved.config.surgeResponse, SURGE_BASELINE_V01031.surgeResponse);
assert.equal(resolved.config.brakeSurgeResponse, SURGE_BASELINE_V01031.brakeSurgeResponse);
assert.equal(resolved.config.maxSurgeAcceleration, SURGE_BASELINE_V01031.maxSurgeAcceleration);
assert.equal(resolved.config.maxBrakeAcceleration, SURGE_BASELINE_V01031.maxBrakeAcceleration);

// Missing calibration preserves direct-file / partial-load safety.
assert.equal(planar.resolvePlanarDynamicsConfig({}, planar.DEFAULTS).source, 'legacy-defaults');

// Cache rule inherited from V0.10.3.1: one stable contract identity => one resolution.
let resolutions = 0;
const cache = planar.createIdentityConfigCache(() => {
  resolutions += 1;
  return planar.resolvePlanarDynamicsConfig(root, planar.DEFAULTS);
});
const first = cache.resolve(contract);
for (let i = 0; i < 20000; i++) {
  assert.strictEqual(cache.resolve(contract), first);
}
assert.equal(resolutions, 1);
assert.equal(cache.resolutions, 1);
const replacementContract = Object.assign({}, contract);
cache.resolve(replacementContract);
assert.equal(resolutions, 2);
assert.equal(cache.resolutions, 2);

// 20,000-step full Planar numerical equivalence. This deliberately exercises GAS/coast/BRAKE,
// Sway coupling, Yaw moment authority and command-yaw fallback while all migrated axes use calibration.
let legacyState = { u: 0, v: 0, r: 0 };
let migratedState = { u: 0, v: 0, r: 0 };
let maxDiff = 0;
let brakeFrames = 0;
for (let i = 0; i < 20000; i++) {
  const phase = i * 0.0173;
  const brakeHeld = (i % 137) < 19;
  if (brakeHeld) brakeFrames += 1;
  const useMoment = (i % 23) !== 0;
  const input = {
    commandSurge: Math.max(0, 18 + 15 * Math.sin(phase * 0.29)),
    commandSway: 3.6 * Math.sin(phase * 0.41),
    commandYawRate: 1.3 * Math.sin(phase * 0.37),
    brakeHeld,
    maxSpeed: 36,
    slipMax: 4.8,
    momentAuthority: useMoment,
    externalYawMomentNm: useMoment ? 500 * Math.sin(phase * 0.53) : 0
  };

  legacyState = planar.stepPlanarState(legacyState, input, 1 / 60, planar.DEFAULTS);
  migratedState = planar.stepPlanarState(migratedState, input, 1 / 60, resolved.config);

  for (const key of ['u', 'v', 'r', 'surgeAcceleration', 'swayAcceleration', 'yawAcceleration']) {
    assert(Number.isFinite(migratedState[key]), `${key} must remain finite`);
    const diff = Math.abs(legacyState[key] - migratedState[key]);
    maxDiff = Math.max(maxDiff, diff);
    assert(diff < 1e-12, `${key} must remain numerically equivalent`);
  }
}

assert(brakeFrames > 0);
assert.equal(maxDiff, 0);
assert(legacyState.u >= 0 && legacyState.u <= 36);
assert(migratedState.u >= 0 && migratedState.u <= 36);

console.log('V0.10.4 Surge source-of-truth numerical equivalence PASS under V0.10.5 shared cache');
