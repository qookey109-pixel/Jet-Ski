const assert = require('assert');
const {
  YAW_BASELINE_V0102,
  SURGE_BASELINE_V01031,
  createCalibrationContract,
  readRuntimeInputs
} = require('../src/v0101-calibration-contract.js');

// Deliberately corrupt migrated Surge/Yaw values in the fake runtime. V0.10.4 must ignore
// these fields and preserve the canonical accepted baselines.
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
      addedMassSurgeRatio: 9.99,
      addedMassSwayRatio: 0.55,
      addedMassYawRatio: 9.99,
      surgeResponse: 99,
      brakeSurgeResponse: 99,
      nonlinearSwayDamping: 0.34,
      yawLinearDamping: 9.99,
      nonlinearYawDamping: 9.99,
      yawInertiaKgM2: 9999,
      maxSurgeAcceleration: 99,
      maxBrakeAcceleration: 99,
      maxSwayAcceleration: 5.2,
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
      diagnostics() {
        return { centerOfMassVerticalM: -0.18 };
      }
    }
  }
};

const inputs = readRuntimeInputs(fakeRoot);
const contract = createCalibrationContract(inputs);

assert.equal(contract.version, 'V0.10.4');
assert.equal(contract.contract, 'marine-calibration-v1');
assert.equal(contract.status, 'PARTIAL_REDUCED_ORDER_SURGE_YAW_SOURCE');
assert.equal(contract.authority.catalogOnly, false);
assert.equal(contract.authority.changesPhysics, false);
assert.equal(contract.authority.changesPhysicsValues, false);
assert.equal(contract.authority.changesParameterSource, true);
assert.equal(contract.authority.surgeSourceOfTruth, true);
assert.equal(contract.authority.yawSourceOfTruth, true);
assert.equal(contract.authority.safeForAcceptedV010Baseline, true);
assert.equal(contract.sourceOfTruth.surge.numericalBaseline, 'V0.10.3.1');
assert.equal(contract.sourceOfTruth.surge.noNewValues, true);
assert.equal(contract.sourceOfTruth.yaw.numericalBaseline, 'V0.10.2');
assert.equal(contract.sourceOfTruth.yaw.noNewValues, true);

assert.equal(contract.rigidBody.massKg, 118);
assert.equal(contract.rigidBody.cgVerticalM, -0.18);
assert.equal(contract.rigidBody.inertiaKgM2.yaw, YAW_BASELINE_V0102.yawInertiaKgM2);
assert.equal(contract.rigidBody.inertiaKgM2.roll, null);
assert.equal(contract.rigidBody.inertiaKgM2.pitch, null);

assert.equal(contract.addedMassRatio.surge, SURGE_BASELINE_V01031.addedMassSurgeRatio);
assert.equal(contract.addedMassRatio.sway, 0.55);
assert.equal(contract.addedMassRatio.yaw, YAW_BASELINE_V0102.addedMassYawRatio);
assert.equal(contract.addedMassRatio.heave, null);
assert.equal(contract.addedMassRatio.roll, null);
assert.equal(contract.addedMassRatio.pitch, null);

assert.equal(contract.damping.heavePerSecond, 4.7);
assert.equal(contract.damping.pitchDampingRatio, 0.70);
assert.equal(contract.damping.rollDampingRatio, 0.74);
assert.equal(contract.damping.swayNonlinear, 0.34);
assert.equal(contract.damping.yawLinear, YAW_BASELINE_V0102.yawLinearDamping);
assert.equal(contract.damping.yawNonlinear, YAW_BASELINE_V0102.yawNonlinearDamping);
assert.equal(contract.responseTuning.surgeResponse, SURGE_BASELINE_V01031.surgeResponse);
assert.equal(contract.responseTuning.brakeSurgeResponse, SURGE_BASELINE_V01031.brakeSurgeResponse);
assert.equal(contract.responseTuning.yawResponse, YAW_BASELINE_V0102.yawResponse);

assert.equal(contract.steering.leverArmM, YAW_BASELINE_V0102.steering.sternLeverArmM);
assert.equal(contract.steering.hydroForceCoeff, YAW_BASELINE_V0102.steering.hydroForceCoeff);
assert.equal(contract.steering.lowSpeedJetForceN, YAW_BASELINE_V0102.steering.lowSpeedJetForceN);
assert.equal(contract.steering.maxSteeringForceN, YAW_BASELINE_V0102.steering.maxSteeringForceN);
assert.equal(contract.steering.maxYawMomentNm, YAW_BASELINE_V0102.steering.maxYawMomentNm);
assert.equal(contract.steering.hydroAuthorityStartMps, YAW_BASELINE_V0102.steering.hydroAuthorityStartMps);
assert.equal(contract.steering.hydroAuthorityFullMps, YAW_BASELINE_V0102.steering.hydroAuthorityFullMps);
assert.equal(contract.steering.landingAuthorityLoss, YAW_BASELINE_V0102.steering.landingAuthorityLoss);

assert.equal(contract.responseLimits.maxSurgeAcceleration, SURGE_BASELINE_V01031.maxSurgeAcceleration);
assert.equal(contract.responseLimits.maxBrakeAcceleration, SURGE_BASELINE_V01031.maxBrakeAcceleration);
assert.equal(contract.responseLimits.maxYawAcceleration, YAW_BASELINE_V0102.maxYawAcceleration);
assert.equal(contract.responseLimits.maxYawRate, YAW_BASELINE_V0102.maxYawRate);
assert.ok(Math.abs(contract.derived.effectiveYawInertiaKgM2 - 227.7) < 1e-9);
assert.ok(contract.uncalibrated.includes('inertia.roll'));
assert.ok(contract.uncalibrated.includes('inertia.pitch'));
assert.ok(contract.uncalibrated.includes('addedMass.heave'));
assert.ok(contract.uncalibrated.includes('physical SI damping derivatives'));

const empty = createCalibrationContract({});
assert.equal(empty.rigidBody.massKg, null);
assert.equal(empty.rigidBody.inertiaKgM2.yaw, null);
assert.equal(empty.derived.effectiveYawInertiaKgM2, null);
assert.equal(empty.authority.changesPhysicsValues, false);

console.log('V0.10.4 calibration contract regression PASS');
