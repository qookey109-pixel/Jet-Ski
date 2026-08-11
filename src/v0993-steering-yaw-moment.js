// V0.9.9.3 Plus-only steering force -> stern lever arm -> yaw moment.
// A/D no longer needs to directly own yaw angle in 9-Point+; the 3DOF body-rate integrates this moment.
(function (root) {
  'use strict';

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function smoothstepRange(value, min, max) {
    const t = clamp((value - min) / Math.max(max - min, 1e-6), 0, 1);
    return t * t * (3 - 2 * t);
  }

  const DEFAULTS = Object.freeze({
    sternLeverArmM: 1.45,
    hydroForceCoeff: 1.05,
    lowSpeedJetForceN: 82,
    maxSteeringForceN: 360,
    maxYawMomentNm: 520,
    hydroAuthorityStartMps: 1.2,
    hydroAuthorityFullMps: 12.0
  });

  function computeSteeringLoad(params, options) {
    params = params || {};
    const o = Object.assign({}, DEFAULTS, options || {});
    const steering = clamp(Number(params.steering) || 0, -1, 1);
    const relativeForward = clamp(Number(params.relativeForward) || 0, -45, 45);
    const throttle = clamp(Number(params.throttle) || 0, 0, 1);
    const landingLoad = clamp(Number(params.landingLoad) || 0, 0, 1);

    const forwardAbs = Math.abs(relativeForward);
    const waterAuthority = smoothstepRange(
      forwardAbs,
      o.hydroAuthorityStartMps,
      o.hydroAuthorityFullMps
    );
    const hydroForce = o.hydroForceCoeff * forwardAbs * forwardAbs * waterAuthority;
    const jetForce = o.lowSpeedJetForceN * throttle;
    const landingAuthority = 1 - 0.14 * landingLoad;
    const steeringForceN = clamp(
      steering * (hydroForce + jetForce) * landingAuthority,
      -o.maxSteeringForceN,
      o.maxSteeringForceN
    );
    const yawMomentNm = clamp(
      steeringForceN * o.sternLeverArmM,
      -o.maxYawMomentNm,
      o.maxYawMomentNm
    );

    return {
      steering,
      relativeForward,
      throttle,
      waterAuthority,
      hydroForceN: hydroForce,
      jetForceN: jetForce,
      steeringForceN,
      yawMomentNm,
      landingAuthority
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEFAULTS, computeSteeringLoad, smoothstepRange };
  }

  if (typeof window === 'undefined' || typeof updateJetSki !== 'function') return;

  const previousUpdateJetSki = updateJetSki;
  const state = {
    active: false,
    steering: 0,
    relativeForward: 0,
    waterForward: 0,
    throttle: 0,
    waterAuthority: 0,
    hydroForceN: 0,
    jetForceN: 0,
    steeringForceN: 0,
    yawMomentNm: 0,
    appliedFrames: 0,
    resets: 0
  };

  function clearState() {
    state.active = false;
    state.steering = 0;
    state.relativeForward = 0;
    state.waterForward = 0;
    state.throttle = 0;
    state.waterAuthority = 0;
    state.hydroForceN = 0;
    state.jetForceN = 0;
    state.steeringForceN = 0;
    state.yawMomentNm = 0;
    state.resets += 1;
  }

  updateJetSki = function v0993SteeringYawMoment(dt, t) {
    const api = root.JETSKI_PHYSICS;
    const hydro = api && api.hydroModel;
    const plusActive = Boolean(hydro && hydro.mode === 'nine-point-plus');
    const reverseActive = Boolean(root.V0941_REVERSE && root.V0941_REVERSE.controller && root.V0941_REVERSE.controller.active);

    if (plusActive && !airborne && !reverseActive) {
      const forwardX = Math.sin(yaw);
      const forwardZ = Math.cos(yaw);
      let waterForward = 0;

      if (api.oceanModel && typeof api.oceanModel.sample === 'function') {
        const sample = api.oceanModel.sample(ski.position.x, ski.position.z, t, api.seaProfile || seaProfile);
        if (sample) {
          waterForward = (Number(sample.waterVelocityX) || 0) * forwardX
            + (Number(sample.waterVelocityZ) || 0) * forwardZ;
        }
      }

      const rawSteer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      const filteredSteer = Number.isFinite(steeringValue) ? steeringValue : 0;
      const steering = clamp(filteredSteer * 0.65 + rawSteer * 0.35, -1, 1);
      const throttle = clamp(Math.max(Number(throttleValue) || 0, input.gas ? 0.35 : 0), 0, 1);
      const landingState = root.V099_NINE_POINT_PLUS_RUNTIME && root.V099_NINE_POINT_PLUS_RUNTIME.state;
      const landingLoad = landingState && Number.isFinite(landingState.landingLoad) ? landingState.landingLoad : 0;
      const load = computeSteeringLoad({
        steering,
        relativeForward: speed - waterForward,
        throttle,
        landingLoad
      });

      state.active = true;
      state.steering = load.steering;
      state.relativeForward = load.relativeForward;
      state.waterForward = waterForward;
      state.throttle = load.throttle;
      state.waterAuthority = load.waterAuthority;
      state.hydroForceN = load.hydroForceN;
      state.jetForceN = load.jetForceN;
      state.steeringForceN = load.steeringForceN;
      state.yawMomentNm = load.yawMomentNm;
      state.appliedFrames += 1;
    } else {
      clearState();
    }

    // Set the moment command before entering the existing update chain so V0.9.9.2 can
    // consume it in the same frame. Shoreline/world wrappers remain outside this layer.
    previousUpdateJetSki(dt, t);

    if (airborne || (root.V0941_REVERSE && root.V0941_REVERSE.controller && root.V0941_REVERSE.controller.active)) {
      clearState();
    }
  };

  root.V0993_STEERING_YAW = {
    version: 'V0.9.9.3',
    state,
    config: DEFAULTS,
    computeSteeringLoad,
    momentAuthority: true,
    plusOnly: true,
    baseUntouched: true,
    voxelUntouched: true,
    reverseAuthorityPreserved: true,
    shorelineAuthorityPreserved: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
