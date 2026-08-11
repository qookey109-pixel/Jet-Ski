// V0.9.9.1 9-Point Plus hydrodynamics.
// Keeps the validated 9-point footprint as the water-surface authority, then adds
// explicit gravity/heave inertia, inertial pitch/roll, and a bounded external COM roll torque.
(function (root) {
  'use strict';

  const baselineFactory = root.createHydrodynamicsModel;
  if (typeof baselineFactory !== 'function') return;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function createNinePointPlusHydrodynamicsModel(config) {
    config = config || {};
    const baseline = baselineFactory(config);
    const gravity = Number.isFinite(config.gravity) ? config.gravity : 9.81;
    const neutralImmersion = 0.52;
    const immersionBandM = 0.24;
    const centerOfMassVerticalM = -0.18;
    const virtualMetacentricHeightM = 0.58;
    const maxComRollTarget = 0.15;
    const stabilityScale = clamp(1 + (-centerOfMassVerticalM) * 0.55, 0.85, 1.20);
    const heaveDampingPerSecond = 4.7;
    const angularDampingRatioPitch = 0.70;
    const angularDampingRatioRoll = 0.74;

    const state = {
      initialized: false,
      y: 0,
      heaveVelocity: 0,
      heaveAcceleration: 0,
      pitch: 0,
      pitchRate: 0,
      roll: 0,
      rollRate: 0,
      targetY: 0,
      waterPitch: 0,
      waterRoll: 0,
      immersionProxy: neutralImmersion,
      baselinePose: null,
      externalLateralAcceleration: 0,
      externalRelativeLateral: 0,
      externalWaterRight: 0,
      externalYawRate: 0,
      comRollTarget: 0
    };

    function syncPose(y, pitch, roll) {
      state.initialized = true;
      state.y = y;
      state.pitch = pitch || 0;
      state.roll = roll || 0;
      state.heaveVelocity = 0;
      state.heaveAcceleration = 0;
      state.pitchRate = 0;
      state.rollRate = 0;
      if (typeof baseline.syncPose === 'function') baseline.syncPose(y, pitch || 0, roll || 0);
    }

    function setExternalDynamics(dynamics) {
      dynamics = dynamics || {};
      const lateralAcceleration = clamp(Number(dynamics.lateralAcceleration) || 0, -7.0, 7.0);
      state.externalLateralAcceleration = lateralAcceleration;
      state.externalRelativeLateral = clamp(Number(dynamics.relativeLateral) || 0, -8.0, 8.0);
      state.externalWaterRight = clamp(Number(dynamics.waterRight) || 0, -4.0, 4.0);
      state.externalYawRate = clamp(Number(dynamics.yawRate) || 0, -2.0, 2.0);

      // Reduced-order roll moment around a virtual metacentric height:
      // phi ~= a_lat * h / (g * GM). Sign is outward from lateral acceleration.
      const lever = Math.abs(centerOfMassVerticalM);
      const rawRoll = -(lateralAcceleration * lever)
        / Math.max(gravity * virtualMetacentricHeightM, 1e-6);
      state.comRollTarget = clamp(rawRoll, -maxComRollTarget, maxComRollTarget);
    }

    function updateSurfacePose(params) {
      const dt = clamp(Number(params.dt) || 0, 0, 1 / 20);
      if (!state.initialized) syncPose(params.position.y, 0, 0);

      const base = baseline.updateSurfacePose(params);
      state.baselinePose = base;
      state.targetY = base.targetY;
      state.waterPitch = base.waterPitch;
      state.waterRoll = base.waterRoll;

      const heightError = state.targetY - state.y;
      const immersion = clamp(
        neutralImmersion + (heightError / immersionBandM) * neutralImmersion,
        0,
        1.08
      );
      const buoyancyAcceleration = gravity * (immersion / neutralImmersion);
      const dampingAcceleration = heaveDampingPerSecond * state.heaveVelocity
        * (0.22 + 0.78 * clamp(immersion / neutralImmersion, 0, 1));
      const maxHeaveAcceleration = Number(config.maxHeaveAcceleration) || 16;
      const heaveAcceleration = clamp(
        buoyancyAcceleration - gravity - dampingAcceleration,
        -maxHeaveAcceleration,
        maxHeaveAcceleration
      );
      state.heaveVelocity += heaveAcceleration * dt;
      state.y += state.heaveVelocity * dt;
      state.heaveAcceleration = heaveAcceleration;
      state.immersionProxy = immersion;

      const targetPitch = clamp(
        base.waterPitch + (params.dynamicPitch || 0),
        -(config.maxPitch || 0.38),
        config.maxPitch || 0.38
      );
      const targetRoll = clamp(
        base.waterRoll + (params.dynamicRoll || 0) + state.comRollTarget,
        -(config.maxRoll || 0.46),
        config.maxRoll || 0.46
      );

      const pitchOmega = Math.PI * 2 * (Number(config.pitchFrequencyHz) || 1.65) * 0.92 * stabilityScale;
      const rollOmega = Math.PI * 2 * (Number(config.rollFrequencyHz) || 1.90) * 0.90 * stabilityScale;
      const pitchAcc = clamp(
        pitchOmega * pitchOmega * (targetPitch - state.pitch)
          - 2 * angularDampingRatioPitch * pitchOmega * state.pitchRate,
        -(Number(config.maxPitchAngularAcceleration) || 5.8),
        Number(config.maxPitchAngularAcceleration) || 5.8
      );
      const rollAcc = clamp(
        rollOmega * rollOmega * (targetRoll - state.roll)
          - 2 * angularDampingRatioRoll * rollOmega * state.rollRate,
        -(Number(config.maxRollAngularAcceleration) || 7.4),
        Number(config.maxRollAngularAcceleration) || 7.4
      );
      state.pitchRate += pitchAcc * dt;
      state.rollRate += rollAcc * dt;
      state.pitch += state.pitchRate * dt;
      state.roll += state.rollRate * dt;

      const maxPitch = Number(config.maxPitch) || 0.38;
      const maxRoll = Number(config.maxRoll) || 0.46;
      if (state.pitch > maxPitch) { state.pitch = maxPitch; if (state.pitchRate > 0) state.pitchRate = 0; }
      if (state.pitch < -maxPitch) { state.pitch = -maxPitch; if (state.pitchRate < 0) state.pitchRate = 0; }
      if (state.roll > maxRoll) { state.roll = maxRoll; if (state.rollRate > 0) state.rollRate = 0; }
      if (state.roll < -maxRoll) { state.roll = -maxRoll; if (state.rollRate < 0) state.rollRate = 0; }

      return {
        y: state.y,
        pitch: state.pitch,
        roll: state.roll,
        heaveVelocity: state.heaveVelocity,
        heaveAcceleration: state.heaveAcceleration,
        immersionVariance: base.immersionVariance,
        immersionProxy: state.immersionProxy,
        planingLift: base.planingLift,
        targetY: state.targetY,
        waterPitch: state.waterPitch,
        waterRoll: state.waterRoll,
        comRollTarget: state.comRollTarget
      };
    }

    function diagnostics() {
      const baseDiagnostics = typeof baseline.diagnostics === 'function' ? baseline.diagnostics() : {};
      return Object.assign({}, baseDiagnostics, {
        heaveVelocity: state.heaveVelocity,
        heaveAcceleration: state.heaveAcceleration,
        immersionProxy: state.immersionProxy,
        targetY: state.targetY,
        centerOfMassVerticalM,
        virtualMetacentricHeightM,
        lateralAcceleration: state.externalLateralAcceleration,
        relativeLateral: state.externalRelativeLateral,
        waterRight: state.externalWaterRight,
        yawRate: state.externalYawRate,
        comRollTarget: state.comRollTarget,
        explicitGravity: true,
        ninePointAuthority: true,
        externalComTorque: true
      });
    }

    return {
      syncPose,
      setExternalDynamics,
      updateSurfacePose,
      relativeWaterKinematics() { return baseline.relativeWaterKinematics.apply(baseline, arguments); },
      longitudinalDrag() { return baseline.longitudinalDrag.apply(baseline, arguments); },
      lateralDamping() { return baseline.lateralDamping.apply(baseline, arguments); },
      getLandingLoss() { return baseline.getLandingLoss.apply(baseline, arguments); },
      diagnostics,
      modelName: '9-Point Plus — gravity/inertia/lateral-COM',
      baseline
    };
  }

  root.createNinePointPlusHydrodynamicsModel = createNinePointPlusHydrodynamicsModel;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createNinePointPlusHydrodynamicsModel };
  }
})(typeof window !== 'undefined' ? window : globalThis);
