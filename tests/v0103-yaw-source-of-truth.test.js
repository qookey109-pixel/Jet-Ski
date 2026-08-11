const assert = require('assert');
const {
  YAW_BASELINE_V0102,
  createCalibrationContract,
  readRuntimeInputs
} = require('../src/v0101-calibration-contract.js');
const planar = require('../src/v0992-planar-3dof-runtime.js');
const steering = require('../src/v0993-steering-yaw-moment.js');

function makeContractRoot() {
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
        addedMassSurgeRatio: planar.DEFAULTS.addedMassSurgeRatio,
        addedMassSwayRatio: planar.DEFAULTS.addedMassSwayRatio,
        nonlinearSwayDamping: planar.DEFAULTS.nonlinearSwayDamping,
        maxSurgeAcceleration: planar.DEFAULTS.maxSurgeAcceleration,
        maxBrakeAcceleration: planar.DEFAULTS.maxBrakeAcceleration,
        maxSwayAcceleration: planar.DEFAULTS.maxSwayAcceleration,
        // Deliberately wrong migrated Yaw values must be ignored by calibration.
        yawInertiaKgM2: 9999,
        addedMassYawRatio: 9.9,
        yawLinearDamping: 9.9,
        nonlinearYawDamping: 9.9,
        maxYawAcceleration: 99,
        maxYawRate: 99
      }
    },
    V0993_STEERING_YAW: {
      config: {
        sternLeverArmM: 99,
        hydroForceCoeff: 99,
        lowSpeedJetForceN: 9999,
        maxSteeringForceN: 9999,
        maxYawMomentNm: 9999
      }
    },
    JETSKI_PHYSICS: {
      hydroModel: {
        diagnostics() { return { centerOfMassVerticalM: -0.18 }; }
      }
    }
  };
  const contract = createCalibrationContract(readRuntimeInputs(fakeRoot));
  return { V0101_CALIBRATION: { contract } };
}

const root = makeContractRoot();
const resolvedYaw = planar.resolveYawDynamicsConfig(root, planar.DEFAULTS);
const resolvedSteering = steering.resolveSteeringConfig(root, steering.DEFAULTS);

// V0.10.4 shares one cached Planar source for migrated Surge + Yaw.
assert.equal(resolvedYaw.source, 'V0101_CALIBRATION.contract.surge+yaw');
assert.equal(resolvedSteering.source, 'V0101_CALIBRATION.contract.steering');
assert.equal(resolvedYaw.config.yawInertiaKgM2, YAW_BASELINE_V0102.yawInertiaKgM2);
assert.equal(resolvedYaw.config.addedMassYawRatio, YAW_BASELINE_V0102.addedMassYawRatio);
assert.equal(resolvedYaw.config.yawLinearDamping, YAW_BASELINE_V0102.yawLinearDamping);
assert.equal(resolvedYaw.config.nonlinearYawDamping, YAW_BASELINE_V0102.yawNonlinearDamping);
assert.equal(resolvedYaw.config.maxYawAcceleration, YAW_BASELINE_V0102.maxYawAcceleration);
assert.equal(resolvedYaw.config.maxYawRate, YAW_BASELINE_V0102.maxYawRate);
assert.equal(resolvedSteering.config.sternLeverArmM, YAW_BASELINE_V0102.steering.sternLeverArmM);
assert.equal(resolvedSteering.config.maxYawMomentNm, YAW_BASELINE_V0102.steering.maxYawMomentNm);
assert.equal(resolvedSteering.config.landingAuthorityLoss, 0.14);

// Missing calibration must retain the exact safe legacy fallback.
assert.equal(planar.resolveYawDynamicsConfig({}, planar.DEFAULTS).source, 'legacy-defaults');
assert.equal(steering.resolveSteeringConfig({}, steering.DEFAULTS).source, 'legacy-defaults');

// Steering equation equivalence across a deterministic grid.
for (const steerValue of [-1, -0.4, 0, 0.55, 1]) {
  for (const speed of [0, 0.5, 1.2, 4, 8, 12, 18, 45]) {
    for (const throttle of [0, 0.35, 1]) {
      for (const landingLoad of [0, 0.4, 1]) {
        const params = { steering: steerValue, relativeForward: speed, throttle, landingLoad };
        const legacy = steering.computeSteeringLoad(params, steering.DEFAULTS);
        const migrated = steering.computeSteeringLoad(params, resolvedSteering.config);
        for (const key of ['waterAuthority', 'hydroForceN', 'jetForceN', 'steeringForceN', 'yawMomentNm', 'landingAuthority']) {
          assert(Math.abs(legacy[key] - migrated[key]) < 1e-12, `steering ${key} must be numerically equivalent`);
        }
      }
    }
  }
}

// 20,000-step planar equivalence under the moment-authority path and fallback yaw-command path.
let legacyState = { u: 0, v: 0, r: 0 };
let migratedState = { u: 0, v: 0, r: 0 };
for (let i = 0; i < 20000; i++) {
  const phase = i * 0.0137;
  const useMoment = (i % 17) !== 0;
  const steeringLoad = steering.computeSteeringLoad({
    steering: Math.sin(phase * 0.7),
    relativeForward: 4 + 22 * (0.5 + 0.5 * Math.sin(phase * 0.31)),
    throttle: 0.5 + 0.5 * Math.sin(phase * 0.17),
    landingLoad: 0.5 + 0.5 * Math.sin(phase * 0.11)
  }, resolvedSteering.config);
  const input = {
    commandSurge: 18 + 12 * Math.sin(phase * 0.23),
    commandSway: 2.5 * Math.sin(phase * 0.41),
    commandYawRate: 1.2 * Math.sin(phase * 0.37),
    brakeHeld: (i % 101) < 7,
    maxSpeed: 36,
    slipMax: 4.8,
    momentAuthority: useMoment,
    externalYawMomentNm: useMoment ? steeringLoad.yawMomentNm : 0
  };

  legacyState = planar.stepPlanarState(legacyState, input, 1 / 60, planar.DEFAULTS);
  migratedState = planar.stepPlanarState(migratedState, input, 1 / 60, resolvedYaw.config);

  for (const key of ['u', 'v', 'r', 'surgeAcceleration', 'swayAcceleration', 'yawAcceleration']) {
    assert(Number.isFinite(migratedState[key]), `${key} must stay finite`);
    assert(Math.abs(legacyState[key] - migratedState[key]) < 1e-12, `${key} must remain numerically equivalent`);
  }
}

assert(Math.abs(migratedState.r) <= YAW_BASELINE_V0102.maxYawRate + 1e-12);
console.log('V0.10.3 yaw source-of-truth numerical equivalence PASS under V0.10.4 shared cache');
