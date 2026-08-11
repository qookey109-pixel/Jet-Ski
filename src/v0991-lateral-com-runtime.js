// V0.9.9.1 water-relative lateral force + COM feed for 9-Point Plus only.
(function (root) {
  'use strict';

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function computeLateralAcceleration(relativeLateral, speedRatio) {
    const rel = clamp(Number(relativeLateral) || 0, -8, 8);
    const ratio = clamp(Number(speedRatio) || 0, 0, 1);
    const response = 0.72 + 1.35 * ratio;
    return clamp(-rel * response, -4.6, 4.6);
  }
  function combineLateralAcceleration(sideSlipAcceleration, speed, yawRate) {
    const slip = clamp(Number(sideSlipAcceleration) || 0, -4.6, 4.6);
    const v = clamp(Number(speed) || 0, 0, 45);
    const r = clamp(Number(yawRate) || 0, -1.8, 1.8);
    const turn = clamp(v * r * 0.34, -4.2, 4.2);
    return clamp(slip + turn, -6.5, 6.5);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { computeLateralAcceleration, combineLateralAcceleration };
  }
  if (typeof window === 'undefined' || typeof updateJetSki !== 'function') return;

  const previousUpdateJetSki = updateJetSki;
  const state = {
    relativeLateral: 0,
    waterRight: 0,
    sideSlipAcceleration: 0,
    lateralAcceleration: 0,
    appliedFrames: 0
  };

  updateJetSki = function v0991LateralComRuntime(dt, t) {
    previousUpdateJetSki(dt, t);

    const api = root.JETSKI_PHYSICS;
    const hydro = api && api.hydroModel;
    const plus = hydro && hydro.models && hydro.models['nine-point-plus'];
    const plusActive = Boolean(hydro && hydro.mode === 'nine-point-plus' && plus);
    if (!plusActive || airborne) {
      if (plus && typeof plus.setExternalDynamics === 'function') plus.setExternalDynamics({});
      state.relativeLateral = 0;
      state.waterRight = 0;
      state.sideSlipAcceleration = 0;
      state.lateralAcceleration = 0;
      return;
    }

    const safeDt = clamp(Number(dt) || 0, 0, 1 / 20);
    const speedRatio = clamp(speed / physics.maxSpeed, 0, 1);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    let waterRight = 0;

    if (api.oceanModel && typeof api.oceanModel.sample === 'function') {
      const sample = api.oceanModel.sample(ski.position.x, ski.position.z, t, api.seaProfile || seaProfile);
      if (sample) {
        waterRight = (Number(sample.waterVelocityX) || 0) * rightX
          + (Number(sample.waterVelocityZ) || 0) * rightZ;
      }
    }

    const relativeLateral = lateralSlip - waterRight;
    const sideSlipAcceleration = computeLateralAcceleration(relativeLateral, speedRatio);
    lateralSlip = clamp(lateralSlip + sideSlipAcceleration * safeDt, -physics.slipMax, physics.slipMax);

    const yawState = root.V099_NINE_POINT_PLUS_RUNTIME && root.V099_NINE_POINT_PLUS_RUNTIME.state;
    const yawRate = yawState && Number.isFinite(yawState.yawRate) ? yawState.yawRate : 0;
    const lateralAcceleration = combineLateralAcceleration(sideSlipAcceleration, speed, yawRate);

    if (typeof plus.setExternalDynamics === 'function') {
      plus.setExternalDynamics({ lateralAcceleration, relativeLateral, waterRight, yawRate });
    }

    state.relativeLateral = relativeLateral;
    state.waterRight = waterRight;
    state.sideSlipAcceleration = sideSlipAcceleration;
    state.lateralAcceleration = lateralAcceleration;
    state.appliedFrames += 1;
  };

  root.V0991_LATERAL_COM = {
    version: 'V0.9.9.1',
    state,
    computeLateralAcceleration,
    combineLateralAcceleration,
    plusOnly: true,
    baseUntouched: true,
    voxelUntouched: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
