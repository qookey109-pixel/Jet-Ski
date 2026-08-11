// V0.10.1 Calibration Contract.
// Catalog-first: gathers the reduced-order parameters already used by the validated runtime
// without changing any physics authority. Unknown rigid-body values stay explicitly null.
(function (root) {
  'use strict';

  function finiteOrNull(value) {
    return Number.isFinite(value) ? Number(value) : null;
  }

  function createCalibrationContract(input) {
    input = input || {};
    const massKg = finiteOrNull(input.massKg);
    const cgVerticalM = finiteOrNull(input.cgVerticalM);
    const yawInertiaKgM2 = finiteOrNull(input.yawInertiaKgM2);
    const addedMassSurgeRatio = finiteOrNull(input.addedMassSurgeRatio);
    const addedMassSwayRatio = finiteOrNull(input.addedMassSwayRatio);
    const addedMassYawRatio = finiteOrNull(input.addedMassYawRatio);
    const steeringLeverArmM = finiteOrNull(input.steeringLeverArmM);

    const contract = {
      version: 'V0.10.1',
      contract: 'marine-calibration-v1',
      status: 'PARTIAL_REDUCED_ORDER',
      authority: {
        catalogOnly: true,
        changesPhysics: false,
        safeForAcceptedV010Baseline: true
      },
      conventions: {
        cgVerticalSign: 'negative = below craft reference',
        inertiaAxes: 'roll / pitch / yaw',
        addedMassRepresentation: 'dimensionless ratio applied by current reduced-order runtime',
        dampingRepresentation: 'current reduced-order tuning coefficients; not CFD/system-ID coefficients'
      },
      rigidBody: {
        massKg,
        cgVerticalM,
        inertiaKgM2: {
          roll: null,
          pitch: null,
          yaw: yawInertiaKgM2
        }
      },
      addedMassRatio: {
        surge: addedMassSurgeRatio,
        sway: addedMassSwayRatio,
        heave: null,
        roll: null,
        pitch: null,
        yaw: addedMassYawRatio
      },
      damping: {
        heavePerSecond: finiteOrNull(input.heaveDampingPerSecond),
        pitchDampingRatio: finiteOrNull(input.pitchDampingRatio),
        rollDampingRatio: finiteOrNull(input.rollDampingRatio),
        swayNonlinear: finiteOrNull(input.swayNonlinearDamping),
        yawLinear: finiteOrNull(input.yawLinearDamping),
        yawNonlinear: finiteOrNull(input.yawNonlinearDamping)
      },
      steering: {
        leverArmM: steeringLeverArmM,
        hydroForceCoeff: finiteOrNull(input.hydroForceCoeff),
        lowSpeedJetForceN: finiteOrNull(input.lowSpeedJetForceN),
        maxSteeringForceN: finiteOrNull(input.maxSteeringForceN),
        maxYawMomentNm: finiteOrNull(input.maxYawMomentNm)
      },
      responseLimits: {
        maxSurgeAcceleration: finiteOrNull(input.maxSurgeAcceleration),
        maxBrakeAcceleration: finiteOrNull(input.maxBrakeAcceleration),
        maxSwayAcceleration: finiteOrNull(input.maxSwayAcceleration),
        maxYawAcceleration: finiteOrNull(input.maxYawAcceleration),
        maxYawRate: finiteOrNull(input.maxYawRate),
        maxHeaveAcceleration: finiteOrNull(input.maxHeaveAcceleration),
        maxPitchAngularAcceleration: finiteOrNull(input.maxPitchAngularAcceleration),
        maxRollAngularAcceleration: finiteOrNull(input.maxRollAngularAcceleration)
      },
      derived: {
        effectiveYawInertiaKgM2: yawInertiaKgM2 != null && addedMassYawRatio != null
          ? yawInertiaKgM2 * (1 + addedMassYawRatio)
          : null
      },
      sources: Object.assign({}, input.sources || {}),
      uncalibrated: [
        'inertia.roll',
        'inertia.pitch',
        'addedMass.heave',
        'addedMass.roll',
        'addedMass.pitch',
        'CG longitudinal/lateral offsets',
        'physical SI damping derivatives'
      ]
    };

    return contract;
  }

  function readRuntimeInputs(runtimeRoot) {
    runtimeRoot = runtimeRoot || {};
    const game = runtimeRoot.GAME_CONFIG || {};
    const hydroConfig = game.hydrodynamics || {};
    const planarApi = runtimeRoot.V0992_PLANAR_3DOF || {};
    const planar = planarApi.config || {};
    const steeringApi = runtimeRoot.V0993_STEERING_YAW || {};
    const steering = steeringApi.config || {};
    const hydro = runtimeRoot.JETSKI_PHYSICS && runtimeRoot.JETSKI_PHYSICS.hydroModel;
    const diagnostics = hydro && typeof hydro.diagnostics === 'function' ? (hydro.diagnostics() || {}) : {};

    return {
      massKg: hydroConfig.craftMassKg,
      cgVerticalM: diagnostics.centerOfMassVerticalM,
      yawInertiaKgM2: planar.yawInertiaKgM2,
      addedMassSurgeRatio: planar.addedMassSurgeRatio,
      addedMassSwayRatio: planar.addedMassSwayRatio,
      addedMassYawRatio: planar.addedMassYawRatio,
      // These three currently live as validated Plus constants rather than exported config.
      // Catalog them here without making this file their physics authority.
      heaveDampingPerSecond: 4.7,
      pitchDampingRatio: 0.70,
      rollDampingRatio: 0.74,
      swayNonlinearDamping: planar.nonlinearSwayDamping,
      yawLinearDamping: planar.yawLinearDamping,
      yawNonlinearDamping: planar.nonlinearYawDamping,
      steeringLeverArmM: steering.sternLeverArmM,
      hydroForceCoeff: steering.hydroForceCoeff,
      lowSpeedJetForceN: steering.lowSpeedJetForceN,
      maxSteeringForceN: steering.maxSteeringForceN,
      maxYawMomentNm: steering.maxYawMomentNm,
      maxSurgeAcceleration: planar.maxSurgeAcceleration,
      maxBrakeAcceleration: planar.maxBrakeAcceleration,
      maxSwayAcceleration: planar.maxSwayAcceleration,
      maxYawAcceleration: planar.maxYawAcceleration,
      maxYawRate: planar.maxYawRate,
      maxHeaveAcceleration: hydroConfig.maxHeaveAcceleration,
      maxPitchAngularAcceleration: hydroConfig.maxPitchAngularAcceleration,
      maxRollAngularAcceleration: hydroConfig.maxRollAngularAcceleration,
      sources: {
        massKg: 'GAME_CONFIG.hydrodynamics.craftMassKg',
        cgVerticalM: '9-Point+ diagnostics.centerOfMassVerticalM',
        yawInertiaKgM2: 'V0992_PLANAR_3DOF.config.yawInertiaKgM2',
        addedMassSurgeRatio: 'V0992_PLANAR_3DOF.config.addedMassSurgeRatio',
        addedMassSwayRatio: 'V0992_PLANAR_3DOF.config.addedMassSwayRatio',
        addedMassYawRatio: 'V0992_PLANAR_3DOF.config.addedMassYawRatio',
        plusVerticalAngularDamping: 'nine-point-plus-hydrodynamics.js validated constants',
        planarDamping: 'V0992_PLANAR_3DOF.config',
        steeringLeverArmM: 'V0993_STEERING_YAW.config.sternLeverArmM',
        responseLimits: 'GAME_CONFIG.hydrodynamics + V0992_PLANAR_3DOF.config'
      }
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createCalibrationContract, readRuntimeInputs };
  }

  if (typeof window === 'undefined') return;

  const contract = createCalibrationContract(readRuntimeInputs(root));
  const unified = root.V010_UNIFIED_6DOF;
  if (unified && !Object.prototype.hasOwnProperty.call(unified, 'calibration')) {
    Object.defineProperty(unified, 'calibration', {
      configurable: false,
      enumerable: true,
      get() { return contract; }
    });
  }

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = 'V0.10.1';
  document.title = 'Swim Ring Racing V0.10.1';

  root.V0101_CALIBRATION = {
    version: 'V0.10.1',
    contract,
    createCalibrationContract,
    readRuntimeInputs,
    catalogOnly: true,
    physicsAuthorityUntouched: true,
    acceptedV010BaselinePreserved: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
