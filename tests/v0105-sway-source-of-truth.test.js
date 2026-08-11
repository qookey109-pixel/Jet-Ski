const assert = require('assert');
const {
  YAW_BASELINE_V0102,
  SURGE_BASELINE_V01031,
  SWAY_BASELINE_V0104,
  createCalibrationContract,
  readRuntimeInputs
} = require('../src/v0101-calibration-contract.js');
const planar = require('../src/v0992-planar-3dof-runtime.js');

const fakeRoot = {
  GAME_CONFIG: {
    hydrodynamics: {
      craftMassKg: 118,
      maxHeaveAcceleration: 16,
      maxPitchAngularAcceleration: 5.8,
      maxRollAngularAcceleration: 7.4
    }
  },
  V0992_PLANAR_3DOF: {
    config: {
      // Deliberately corrupt all migrated horizontal values. Calibration must not inherit them.
      addedMassSurgeRatio: 9.9,
      addedMassSwayRatio: 9.9,
      addedMassYawRatio: 9.9,
      surgeResponse: 99,
      brakeSurgeResponse: 99,
      swayResponse: 99,
      swayYawCoupling: 99,
      nonlinearSwayDamping: 99,
      maxSurgeAcceleration: 99,
      maxBrakeAcceleration: 99,
      maxSwayAcceleration: 99,
      yawInertiaKgM2: 9999,
      yawResponse: 99,
      yawLinearDamping: 99,
      nonlinearYawDamping: 99,
      maxYawAcceleration: 99,
      maxYawRate: 99
    }
  },
  JETSKI_PHYSICS: {
    hydroModel: {
      diagnostics() { return { centerOfMassVerticalM: -0.18 }; }
    }
  }
};

const contract = createCalibrationContract(readRuntimeInputs(fakeRoot));
const root = { V0101_CALIBRATION: { contract } };
const resolved = planar.resolvePlanarDynamicsConfig(root, planar.DEFAULTS);

assert.equal(contract.version, 'V0.10.5');
assert.equal(contract.authority.surgeSourceOfTruth, true);
assert.equal(contract.authority.swaySourceOfTruth, true);
assert.equal(contract.authority.yawSourceOfTruth, true);
assert.equal(contract.sourceOfTruth.sway.numericalBaseline, 'V0.10.4');
assert.equal(contract.sourceOfTruth.sway.noNewValues, true);
assert.equal(resolved.source, 'V0101_CALIBRATION.contract.surge+sway+yaw');

assert.equal(resolved.config.addedMassSwayRatio, SWAY_BASELINE_V0104.addedMassSwayRatio);
assert.equal(resolved.config.swayResponse, SWAY_BASELINE_V0104.swayResponse);
assert.equal(resolved.config.nonlinearSwayDamping, SWAY_BASELINE_V0104.nonlinearSwayDamping);
assert.equal(resolved.config.maxSwayAcceleration, SWAY_BASELINE_V0104.maxSwayAcceleration);
assert.equal(resolved.config.swayYawCoupling, SWAY_BASELINE_V0104.swayYawCoupling);
assert.equal(resolved.config.addedMassSurgeRatio, SURGE_BASELINE_V01031.addedMassSurgeRatio);
assert.equal(resolved.config.yawInertiaKgM2, YAW_BASELINE_V0102.yawInertiaKgM2);

// Stable calibration identity must reuse one resolved Planar config.
let resolutions = 0;
const cache = planar.createIdentityConfigCache(() => {
  resolutions += 1;
  return planar.resolvePlanarDynamicsConfig(root, planar.DEFAULTS);
});
const first = cache.resolve(contract);
for (let i = 0; i < 20000; i++) assert.strictEqual(cache.resolve(contract), first);
assert.equal(resolutions, 1);
assert.equal(cache.resolutions, 1);

// Directed Sway checks: sign symmetry, nonlinear damping, and turn coupling all stay equivalent.
for (const commandSway of [-4.8, -2.4, 0, 2.4, 4.8]) {
  for (const yawRate of [-1.2, -0.4, 0, 0.4, 1.2]) {
    const state = { u: 18, v: commandSway * 0.35, r: yawRate };
    const input = {
      commandSurge: 18,
      commandSway,
      commandYawRate: yawRate,
      brakeHeld: false,
      maxSpeed: 36,
      slipMax: 4.8,
      momentAuthority: false,
      externalYawMomentNm: 0
    };
    const legacy = planar.stepPlanarState(state, input, 1 / 60, planar.DEFAULTS);
    const migrated = planar.stepPlanarState(state, input, 1 / 60, resolved.config);
    for (const key of ['v', 'swayAcceleration', 'turnCoupling']) {
      assert.equal(migrated[key], legacy[key], `${key} directed Sway case must be exactly equivalent`);
    }
  }
}

// 20,000-step full Planar equivalence with aggressive Sway excitation and changing yaw coupling.
let legacyState = { u: 0, v: 0, r: 0 };
let migratedState = { u: 0, v: 0, r: 0 };
let maxDiff = 0;
let maxAbsV = 0;
let couplingFrames = 0;
for (let i = 0; i < 20000; i++) {
  const phase = i * 0.0191;
  const useMoment = (i % 29) !== 0;
  const input = {
    commandSurge: Math.max(0, 17 + 16 * Math.sin(phase * 0.17)),
    commandSway: 4.6 * Math.sin(phase * 0.73),
    commandYawRate: 1.45 * Math.sin(phase * 0.43),
    brakeHeld: (i % 149) < 17,
    maxSpeed: 36,
    slipMax: 4.8,
    momentAuthority: useMoment,
    externalYawMomentNm: useMoment ? 515 * Math.sin(phase * 0.59) : 0
  };

  legacyState = planar.stepPlanarState(legacyState, input, 1 / 60, planar.DEFAULTS);
  migratedState = planar.stepPlanarState(migratedState, input, 1 / 60, resolved.config);

  if (Math.abs(migratedState.turnCoupling) > 1e-9) couplingFrames += 1;
  maxAbsV = Math.max(maxAbsV, Math.abs(migratedState.v));

  for (const key of ['u', 'v', 'r', 'surgeAcceleration', 'swayAcceleration', 'yawAcceleration', 'turnCoupling']) {
    assert(Number.isFinite(migratedState[key]), `${key} must remain finite`);
    const diff = Math.abs(legacyState[key] - migratedState[key]);
    maxDiff = Math.max(maxDiff, diff);
    assert(diff < 1e-12, `${key} must remain numerically equivalent`);
  }
}

assert.equal(maxDiff, 0);
assert(couplingFrames > 0);
assert(maxAbsV <= 4.8 + 1e-12);

console.log('V0.10.5 Sway source-of-truth numerical equivalence PASS');
