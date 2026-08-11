// V0.9.9 9-Point Plus runtime: yaw inertia + progressive landing inertia reservoir.
// It wraps the existing drive chain without changing the validated main.js steering equations.
(function (root) {
  'use strict';

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  function smoothYawRate(currentRate, desiredRate, dt, response, maxRate) {
    const safeDt = clamp(Number(dt) || 0, 0, 1 / 20);
    const r = Number.isFinite(response) ? response : 7.2;
    const max = Number.isFinite(maxRate) ? maxRate : 1.55;
    const alpha = 1 - Math.exp(-r * safeDt);
    return clamp(currentRate + (desiredRate - currentRate) * alpha, -max, max);
  }
  function landingLoadFromImpact(verticalSpeed) {
    return clamp((Math.abs(Number(verticalSpeed) || 0) - 1.6) / 5.2, 0, 1);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { normalizeAngle, smoothYawRate, landingLoadFromImpact };
  }
  if (typeof window === 'undefined' || typeof updateJetSki !== 'function') return;

  const previousUpdateJetSki = updateJetSki;
  const state = {
    yawRate: 0,
    desiredYawRate: 0,
    landingLoad: 0,
    landingEvents: 0,
    activeFrames: 0
  };
  let wasPlusLastFrame = false;

  updateJetSki = function v099NinePointPlusRuntime(dt, t) {
    const hydro = window.JETSKI_PHYSICS && window.JETSKI_PHYSICS.hydroModel;
    const plusActiveBefore = Boolean(hydro && hydro.mode === 'nine-point-plus');
    const safeDt = clamp(Number(dt) || 0, 1 / 240, 1 / 20);
    const yawBefore = yaw;
    const airborneBefore = airborne;
    const preLandingVerticalSpeed = Math.abs(verticalVelocity);

    previousUpdateJetSki(dt, t);

    const plusActive = Boolean(hydro && hydro.mode === 'nine-point-plus');
    if (!plusActive) {
      state.yawRate = 0;
      state.desiredYawRate = 0;
      state.landingLoad = 0;
      wasPlusLastFrame = false;
      return;
    }

    const rawYawDelta = normalizeAngle(yaw - yawBefore);
    const desiredYawRate = rawYawDelta / safeDt;
    state.desiredYawRate = desiredYawRate;
    state.yawRate = wasPlusLastFrame
      ? smoothYawRate(state.yawRate, desiredYawRate, safeDt, 7.2, 1.55)
      : clamp(desiredYawRate, -1.55, 1.55);

    // A recent hard water impact temporarily reduces yaw authority a little, giving the
    // craft mass a sense of continuity instead of allowing an instantaneous direction snap.
    const landingYawScale = 1 - 0.14 * state.landingLoad;
    yaw = yawBefore + state.yawRate * safeDt * landingYawScale;
    ski.rotation.y = yaw;

    if (airborneBefore && !airborne) {
      const load = landingLoadFromImpact(preLandingVerticalSpeed);
      if (load > 0) {
        state.landingLoad = Math.max(state.landingLoad, load);
        state.landingEvents += 1;
      }
    }
    state.landingLoad *= Math.exp(-safeDt / 0.12);
    state.activeFrames += 1;
    wasPlusLastFrame = plusActiveBefore || plusActive;
  };

  root.V099_NINE_POINT_PLUS_RUNTIME = {
    version: 'V0.9.9',
    state,
    normalizeAngle,
    smoothYawRate,
    landingLoadFromImpact,
    noExtraSpeedLoss: true,
    shorelineCollisionAuthorityPreserved: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
