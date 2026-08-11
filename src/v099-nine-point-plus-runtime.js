// V0.9.9.3 9-Point Plus runtime: heave restore + landing inertia reservoir.
// Legacy yaw-rate smoothing remains as fallback, but yields when the steering-moment layer is active.
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
  const plusImmersionAllowanceM = 0.18;
  const state = {
    yawRate: 0,
    desiredYawRate: 0,
    landingLoad: 0,
    landingEvents: 0,
    contactGuardHits: 0,
    steeringMomentFrames: 0,
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

    // V0.9.2.4 / V0.9.3 keep their validated hard anti-penetration behavior. They may
    // temporarily snap the visible root to the surface before this outer Plus layer runs.
    // Restore the Plus heave solution afterward, with only a small safe immersion envelope.
    if (!airborne && window.JETSKI_PHYSICS && window.JETSKI_PHYSICS.lastHydroPose) {
      const plusPose = window.JETSKI_PHYSICS.lastHydroPose;
      if (Number.isFinite(plusPose.y)) {
        const surfaceY = getWaveHeight(ski.position.x, ski.position.z, t) + physics.floatClearance;
        const catastrophicMinimumY = surfaceY - plusImmersionAllowanceM;
        if (plusPose.y >= catastrophicMinimumY) {
          ski.position.y = plusPose.y;
        } else {
          ski.position.y = catastrophicMinimumY;
          state.contactGuardHits += 1;
          if (hydro && typeof hydro.syncPose === 'function') {
            hydro.syncPose(ski.position.y, ski.rotation.x, ski.rotation.z);
          }
        }
      }
    }

    const steeringMomentState = root.V0993_STEERING_YAW && root.V0993_STEERING_YAW.state;
    const steeringMomentOwnsYaw = Boolean(steeringMomentState && steeringMomentState.active);

    if (steeringMomentOwnsYaw) {
      // V0.9.9.3: do not turn the craft by smoothing a directly assigned yaw angle.
      // The outer 3DOF layer integrates the stern steering moment into yaw-rate instead.
      const planar = root.V0992_PLANAR_3DOF && root.V0992_PLANAR_3DOF.state;
      if (planar && Number.isFinite(planar.r)) state.yawRate = planar.r;
      state.desiredYawRate = state.yawRate;
      state.steeringMomentFrames += 1;
    } else {
      const rawYawDelta = normalizeAngle(yaw - yawBefore);
      const desiredYawRate = rawYawDelta / safeDt;
      state.desiredYawRate = desiredYawRate;
      state.yawRate = wasPlusLastFrame
        ? smoothYawRate(state.yawRate, desiredYawRate, safeDt, 7.2, 1.55)
        : clamp(desiredYawRate, -1.55, 1.55);

      const landingYawScale = 1 - 0.14 * state.landingLoad;
      yaw = yawBefore + state.yawRate * safeDt * landingYawScale;
      ski.rotation.y = yaw;
    }

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
    version: 'V0.9.9.3',
    state,
    plusImmersionAllowanceM,
    normalizeAngle,
    smoothYawRate,
    landingLoadFromImpact,
    noExtraSpeedLoss: true,
    legacyAntiPenetrationUnmodified: true,
    steeringMomentAuthorityAware: true,
    shorelineCollisionAuthorityPreserved: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
