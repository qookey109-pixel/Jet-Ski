// V0.10.5 Calibration Contract.
// V0.10.3 promoted accepted Yaw, V0.10.4 promoted accepted Surge, and V0.10.5
// promotes only the already-accepted Sway subset while preserving the V0.10.4 baseline.
(function (root) {
  'use strict';

  const YAW_BASELINE_V0102 = Object.freeze({
    yawInertiaKgM2: 165,
    addedMassYawRatio: 0.38,
    yawResponse: 5.0,
    yawLinearDamping: 0.88,
    yawNonlinearDamping: 0.16,
    maxYawAcceleration: 3.2,
    maxYawRate: 1.55,
    steering: Object.freeze({
      sternLeverArmM: 1.45,
      hydroForceCoeff: 1.05,
      lowSpeedJetForceN: 82,
      maxSteeringForceN: 360,
      maxYawMomentNm: 520,
      hydroAuthorityStartMps: 1.2,
      hydroAuthorityFullMps: 12.0,
      landingAuthorityLoss: 0.14
    })
  });

  const SURGE_BASELINE_V01031 = Object.freeze({
    addedMassSurgeRatio: 0.12,
    surgeResponse: 5.4,
    brakeSurgeResponse: 10.2,
    maxSurgeAcceleration: 12.5,
    maxBrakeAcceleration: 20.0
  });

  const SWAY_BASELINE_V0104 = Object.freeze({
    addedMassSwayRatio: 0.55,
    swayResponse: 4.8,
    nonlinearSwayDamping: 0.34,
    maxSwayAcceleration: 5.2,
    swayYawCoupling: 0.055
  });

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
      version: 'V0.10.5',
      contract: 'marine-calibration-v1',
      status: 'PARTIAL_REDUCED_ORDER_SURGE_SWAY_YAW_SOURCE',
      authority: {
        catalogOnly: false,
        changesPhysics: false,
        changesPhysicsValues: false,
        changesParameterSource: true,
        yawSourceOfTruth: true,
        surgeSourceOfTruth: true,
        swaySourceOfTruth: true,
        safeForAcceptedV010Baseline: true
      },
      sourceOfTruth: {
        surge: {
          active: true,
          numericalBaseline: 'V0.10.3.1',
          noNewValues: true,
          fields: [
            'surge added mass',
            'surge response',
            'brake surge response',
            'surge acceleration limits'
          ]
        },
        sway: {
          active: true,
          numericalBaseline: 'V0.10.4',
          noNewValues: true,
          fields: [
            'sway added mass',
            'sway response',
            'nonlinear sway damping',
            'sway acceleration limit',
            'sway-yaw turn coupling'
          ]
        },
        yaw: {
          active: true,
          numericalBaseline: 'V0.10.2',
          noNewValues: true,
          fields: [
            'Izz',
            'yaw added mass',
            'yaw response/damping',
            'yaw acceleration/rate limits',
            'steering force -> Mz parameters'
          ]
        }
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
      responseTuning: {
        surgeResponse: finiteOrNull(input.surgeResponse),
        brakeSurgeResponse: finiteOrNull(input.brakeSurgeResponse),
        swayResponse: finiteOrNull(input.swayResponse),
        yawResponse: finiteOrNull(input.yawResponse)
      },
      coupling: {
        swayYaw: finiteOrNull(input.swayYawCoupling)
      },
      steering: {
        leverArmM: steeringLeverArmM,
        hydroForceCoeff: finiteOrNull(input.hydroForceCoeff),
        lowSpeedJetForceN: finiteOrNull(input.lowSpeedJetForceN),
        maxSteeringForceN: finiteOrNull(input.maxSteeringForceN),
        maxYawMomentNm: finiteOrNull(input.maxYawMomentNm),
        hydroAuthorityStartMps: finiteOrNull(input.hydroAuthorityStartMps),
        hydroAuthorityFullMps: finiteOrNull(input.hydroAuthorityFullMps),
        landingAuthorityLoss: finiteOrNull(input.landingAuthorityLoss)
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
    const hydro = runtimeRoot.JETSKI_PHYSICS && runtimeRoot.JETSKI_PHYSICS.hydroModel;
    const diagnostics = hydro && typeof hydro.diagnostics === 'function' ? (hydro.diagnostics() || {}) : {};
    const surge = SURGE_BASELINE_V01031;
    const sway = SWAY_BASELINE_V0104;
    const yaw = YAW_BASELINE_V0102;
    const steering = yaw.steering;

    return {
      massKg: hydroConfig.craftMassKg,
      cgVerticalM: diagnostics.centerOfMassVerticalM,
      yawInertiaKgM2: yaw.yawInertiaKgM2,
      addedMassSurgeRatio: surge.addedMassSurgeRatio,
      addedMassSwayRatio: sway.addedMassSwayRatio,
      addedMassYawRatio: yaw.addedMassYawRatio,
      // These vertical/angular values remain cataloged legacy tuning, not migrated authority.
      heaveDampingPerSecond: 4.7,
      pitchDampingRatio: 0.70,
      rollDampingRatio: 0.74,
      swayNonlinearDamping: sway.nonlinearSwayDamping,
      surgeResponse: surge.surgeResponse,
      brakeSurgeResponse: surge.brakeSurgeResponse,
      swayResponse: sway.swayResponse,
      swayYawCoupling: sway.swayYawCoupling,
      yawResponse: yaw.yawResponse,
      yawLinearDamping: yaw.yawLinearDamping,
      yawNonlinearDamping: yaw.yawNonlinearDamping,
      steeringLeverArmM: steering.sternLeverArmM,
      hydroForceCoeff: steering.hydroForceCoeff,
      lowSpeedJetForceN: steering.lowSpeedJetForceN,
      maxSteeringForceN: steering.maxSteeringForceN,
      maxYawMomentNm: steering.maxYawMomentNm,
      hydroAuthorityStartMps: steering.hydroAuthorityStartMps,
      hydroAuthorityFullMps: steering.hydroAuthorityFullMps,
      landingAuthorityLoss: steering.landingAuthorityLoss,
      maxSurgeAcceleration: surge.maxSurgeAcceleration,
      maxBrakeAcceleration: surge.maxBrakeAcceleration,
      maxSwayAcceleration: sway.maxSwayAcceleration,
      maxYawAcceleration: yaw.maxYawAcceleration,
      maxYawRate: yaw.maxYawRate,
      maxHeaveAcceleration: hydroConfig.maxHeaveAcceleration,
      maxPitchAngularAcceleration: hydroConfig.maxPitchAngularAcceleration,
      maxRollAngularAcceleration: hydroConfig.maxRollAngularAcceleration,
      sources: {
        massKg: 'GAME_CONFIG.hydrodynamics.craftMassKg',
        cgVerticalM: '9-Point+ diagnostics.centerOfMassVerticalM',
        surgeCanonical: 'V0101_CALIBRATION.SURGE_BASELINE_V01031 promoted by V0.10.4',
        swayCanonical: 'V0101_CALIBRATION.SWAY_BASELINE_V0104 promoted by V0.10.5',
        yawCanonical: 'V0101_CALIBRATION.YAW_BASELINE_V0102 promoted by V0.10.3',
        plusVerticalAngularDamping: 'nine-point-plus-hydrodynamics.js validated constants',
        planarNonMigrated: 'none in current u/v/r tuning subset',
        responseLimitsNonMigrated: 'GAME_CONFIG.hydrodynamics vertical/angular limits only'
      }
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      YAW_BASELINE_V0102,
      SURGE_BASELINE_V01031,
      SWAY_BASELINE_V0104,
      createCalibrationContract,
      readRuntimeInputs
    };
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

  root.V0101_CALIBRATION = {
    version: 'V0.10.5',
    schemaVersion: 'marine-calibration-v1',
    contract,
    YAW_BASELINE_V0102,
    SURGE_BASELINE_V01031,
    SWAY_BASELINE_V0104,
    createCalibrationContract,
    readRuntimeInputs,
    catalogOnly: false,
    surgeSourceOfTruth: true,
    swaySourceOfTruth: true,
    yawSourceOfTruth: true,
    physicsValuesUnchanged: true,
    acceptedV010BaselinePreserved: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
