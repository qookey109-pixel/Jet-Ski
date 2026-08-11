const assert = require('assert');
const {
  createCalibrationContract,
  readRuntimeInputs
} = require('../src/v0101-calibration-contract.js');

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
      addedMassSurgeRatio: 0.12,
      addedMassSwayRatio: 0.55,
      addedMassYawRatio: 0.38,
      nonlinearSwayDamping: 0.34,
      yawLinearDamping: 0.88,
      nonlinearYawDamping: 0.16,
      yawInertiaKgM2: 165,
      maxSurgeAcceleration: 12.5,
      maxBrakeAcceleration: 20,
      maxSwayAcceleration: 5.2,
      maxYawAcceleration: 3.2,
      maxYawRate: 1.55
    }
  },
  V0993_STEERING_YAW: {
    config: {
      sternLeverArmM: 1.45,
      hydroForceCoeff: 1.05,
      lowSpeedJetForceN: 82,
      maxSteeringForceN: 360,
      maxYawMomentNm: 520
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

assert.equal(contract.version, 'V0.10.1');
assert.equal(contract.contract, 'marine-calibration-v1');
assert.equal(contract.status, 'PARTIAL_REDUCED_ORDER');
assert.equal(contract.authority.catalogOnly, true);
assert.equal(contract.authority.changesPhysics, false);
assert.equal(contract.authority.safeForAcceptedV010Baseline, true);

assert.equal(contract.rigidBody.massKg, 118);
assert.equal(contract.rigidBody.cgVerticalM, -0.18);
assert.equal(contract.rigidBody.inertiaKgM2.yaw, 165);
assert.equal(contract.rigidBody.inertiaKgM2.roll, null);
assert.equal(contract.rigidBody.inertiaKgM2.pitch, null);

assert.equal(contract.addedMassRatio.surge, 0.12);
assert.equal(contract.addedMassRatio.sway, 0.55);
assert.equal(contract.addedMassRatio.yaw, 0.38);
assert.equal(contract.addedMassRatio.heave, null);
assert.equal(contract.addedMassRatio.roll, null);
assert.equal(contract.addedMassRatio.pitch, null);

assert.equal(contract.damping.heavePerSecond, 4.7);
assert.equal(contract.damping.pitchDampingRatio, 0.70);
assert.equal(contract.damping.rollDampingRatio, 0.74);
assert.equal(contract.damping.swayNonlinear, 0.34);
assert.equal(contract.damping.yawLinear, 0.88);
assert.equal(contract.damping.yawNonlinear, 0.16);

assert.equal(contract.steering.leverArmM, 1.45);
assert.equal(contract.steering.hydroForceCoeff, 1.05);
assert.equal(contract.steering.lowSpeedJetForceN, 82);
assert.equal(contract.steering.maxSteeringForceN, 360);
assert.equal(contract.steering.maxYawMomentNm, 520);

assert.ok(Math.abs(contract.derived.effectiveYawInertiaKgM2 - 227.7) < 1e-9);
assert.ok(contract.uncalibrated.includes('inertia.roll'));
assert.ok(contract.uncalibrated.includes('inertia.pitch'));
assert.ok(contract.uncalibrated.includes('addedMass.heave'));
assert.ok(contract.uncalibrated.includes('physical SI damping derivatives'));

const empty = createCalibrationContract({});
assert.equal(empty.rigidBody.massKg, null);
assert.equal(empty.rigidBody.inertiaKgM2.yaw, null);
assert.equal(empty.derived.effectiveYawInertiaKgM2, null);
assert.equal(empty.authority.changesPhysics, false);

console.log('V0.10.1 calibration contract regression PASS');
