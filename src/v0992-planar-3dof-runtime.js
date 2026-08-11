// V0.9.9.2 reduced-order horizontal-plane marine dynamics for 9-Point Plus only.
// Keeps the validated gameplay loop as the command generator, then integrates
// bounded Surge (u), Sway (v), and Yaw-rate (r) states with added-mass proxies.
(function (root) {
  'use strict';

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  const DEFAULTS = Object.freeze({
    addedMassSurgeRatio: 0.12,
    addedMassSwayRatio: 0.55,
    addedMassYawRatio: 0.38,
    surgeResponse: 5.4,
    brakeSurgeResponse: 10.2,
    swayResponse: 4.8,
    yawResponse: 5.0,
    maxSurgeAcceleration: 12.5,
    maxBrakeAcceleration: 20.0,
    maxSwayAcceleration: 5.2,
    maxYawAcceleration: 3.2,
    maxYawRate: 1.55,
    swayYawCoupling: 0.055,
    nonlinearSwayDamping: 0.34,
    nonlinearYawDamping: 0.16
  });

  function stepPlanarState(state, input, dt, options) {
    state = state || {};
    input = input || {};
    const o = Object.assign({}, DEFAULTS, options || {});
    const safeDt = clamp(Number(dt) || 0, 0, 1 / 20);
    const maxSpeed = Math.max(0.1, Number(input.maxSpeed) || 36);
    const slipMax = Math.max(0.2, Number(input.slipMax) || 4.8);

    const commandU = clamp(Number(input.commandSurge) || 0, 0, maxSpeed);
    const commandV = clamp(Number(input.commandSway) || 0, -slipMax, slipMax);
    const commandR = clamp(Number(input.commandYawRate) || 0, -o.maxYawRate, o.maxYawRate);

    const u = clamp(Number(state.u) || 0, 0, maxSpeed);
    const v = clamp(Number(state.v) || 0, -slipMax, slipMax);
    const r = clamp(Number(state.r) || 0, -o.maxYawRate, o.maxYawRate);

    // Added mass is represented as extra effective inertia. The existing gameplay loop
    // still decides throttle/brake/steering demand; this layer only controls how quickly
    // the craft body can realize those commands.
    const surgeResponse = (input.brakeHeld ? o.brakeSurgeResponse : o.surgeResponse)
      / (1 + o.addedMassSurgeRatio);
    const swayResponse = o.swayResponse / (1 + o.addedMassSwayRatio);
    const yawResponse = o.yawResponse / (1 + o.addedMassYawRatio);

    const surgeLimit = input.brakeHeld ? o.maxBrakeAcceleration : o.maxSurgeAcceleration;
    const surgeAcceleration = clamp(
      (commandU - u) * surgeResponse,
      -surgeLimit,
      o.maxSurgeAcceleration
    );

    // With body-right as positive sway, a positive (left) yaw naturally leaves a small
    // outward/right velocity tendency. Hydrodynamic damping then progressively catches it.
    const turnCoupling = clamp(u * r * o.swayYawCoupling, -3.2, 3.2);
    const swayAcceleration = clamp(
      (commandV - v) * swayResponse
        + turnCoupling
        - o.nonlinearSwayDamping * v * Math.abs(v),
      -o.maxSwayAcceleration,
      o.maxSwayAcceleration
    );

    const yawAcceleration = clamp(
      (commandR - r) * yawResponse
        - o.nonlinearYawDamping * r * Math.abs(r),
      -o.maxYawAcceleration,
      o.maxYawAcceleration
    );

    return {
      u: clamp(u + surgeAcceleration * safeDt, 0, maxSpeed),
      v: clamp(v + swayAcceleration * safeDt, -slipMax, slipMax),
      r: clamp(r + yawAcceleration * safeDt, -o.maxYawRate, o.maxYawRate),
      surgeAcceleration,
      swayAcceleration,
      yawAcceleration,
      commandU,
      commandV,
      commandR,
      turnCoupling
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEFAULTS, stepPlanarState };
  }

  if (typeof window === 'undefined' || typeof updateJetSki !== 'function') return;

  const previousUpdateJetSki = updateJetSki;
  const state = {
    initialized: false,
    u: 0,
    v: 0,
    r: 0,
    surgeAcceleration: 0,
    swayAcceleration: 0,
    yawAcceleration: 0,
    commandU: 0,
    commandV: 0,
    commandR: 0,
    turnCoupling: 0,
    activeFrames: 0,
    resets: 0
  };

  function resetToCurrent(commandR) {
    state.initialized = true;
    state.u = Number.isFinite(speed) ? speed : 0;
    state.v = Number.isFinite(lateralSlip) ? lateralSlip : 0;
    state.r = Number.isFinite(commandR) ? commandR : 0;
    state.surgeAcceleration = 0;
    state.swayAcceleration = 0;
    state.yawAcceleration = 0;
    state.turnCoupling = 0;
    state.resets += 1;
  }

  updateJetSki = function v0992PlanarDynamics(dt, t) {
    previousUpdateJetSki(dt, t);

    const api = root.JETSKI_PHYSICS;
    const hydro = api && api.hydroModel;
    const plus = hydro && hydro.models && hydro.models['nine-point-plus'];
    const plusActive = Boolean(hydro && hydro.mode === 'nine-point-plus' && plus);
    const reverseActive = Boolean(root.V0941_REVERSE && root.V0941_REVERSE.controller && root.V0941_REVERSE.controller.active);
    const yawLayer = root.V099_NINE_POINT_PLUS_RUNTIME && root.V099_NINE_POINT_PLUS_RUNTIME.state;
    const commandR = yawLayer && Number.isFinite(yawLayer.yawRate) ? yawLayer.yawRate : 0;

    // Airborne and reverse remain owned by their validated controllers. Re-prime the
    // planar state from the live globals so re-entry does not create a discontinuity.
    if (!plusActive || airborne || reverseActive) {
      resetToCurrent(commandR);
      return;
    }

    if (!state.initialized) resetToCurrent(commandR);

    const next = stepPlanarState(state, {
      commandSurge: speed,
      commandSway: lateralSlip,
      commandYawRate: commandR,
      brakeHeld: Boolean(input.brake),
      maxSpeed: physics.maxSpeed,
      slipMax: physics.slipMax
    }, dt);

    const safeDt = clamp(Number(dt) || 0, 0, 1 / 20);

    // The legacy chain already applied its yaw change this frame. Correct only the delta
    // between that command-rate and the inertial body-rate; position uses the integrated
    // u/v on the following frame, avoiding floating-origin or shoreline authority conflicts.
    yaw += (next.r - commandR) * safeDt;
    ski.rotation.y = yaw;

    speed = next.u;
    lateralSlip = next.v;
    if (speedEl) speedEl.textContent = Math.round(speed * 3.6);

    state.u = next.u;
    state.v = next.v;
    state.r = next.r;
    state.surgeAcceleration = next.surgeAcceleration;
    state.swayAcceleration = next.swayAcceleration;
    state.yawAcceleration = next.yawAcceleration;
    state.commandU = next.commandU;
    state.commandV = next.commandV;
    state.commandR = next.commandR;
    state.turnCoupling = next.turnCoupling;
    state.activeFrames += 1;

    // Feed the integrated yaw state back into the existing Plus COM layer without
    // changing its lateral-force calculation. This keeps roll torque consistent with
    // the body rate that the craft actually carries.
    const lateralLayer = root.V0991_LATERAL_COM && root.V0991_LATERAL_COM.state;
    if (plus && typeof plus.setExternalDynamics === 'function' && lateralLayer) {
      plus.setExternalDynamics({
        lateralAcceleration: lateralLayer.lateralAcceleration,
        relativeLateral: lateralLayer.relativeLateral,
        waterRight: lateralLayer.waterRight,
        yawRate: state.r
      });
    }
  };

  root.V0992_PLANAR_3DOF = {
    version: 'V0.9.9.2',
    state,
    config: DEFAULTS,
    stepPlanarState,
    plusOnly: true,
    baseUntouched: true,
    voxelUntouched: true,
    reverseAuthorityPreserved: true,
    shorelineAuthorityPreserved: true,
    reducedOrder3DOF: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
