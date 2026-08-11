// V0.10.5 reduced-order horizontal-plane marine dynamics for 9-Point Plus only.
// V0.10.3/3.1 keep accepted Yaw source-of-truth + identity caching, V0.10.4 adds Surge,
// and V0.10.5 promotes accepted Sway through the same cached Planar config.
(function (root) {
  'use strict';

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  function smoothstepRange(value, min, max) {
    const t = clamp((value - min) / Math.max(max - min, 1e-6), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function finiteOr(value, fallback) {
    return Number.isFinite(value) ? Number(value) : fallback;
  }

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
    nonlinearYawDamping: 0.16,
    yawLinearDamping: 0.88,
    yawInertiaKgM2: 165
  });

  function resolvePlanarDynamicsConfig(runtimeRoot, fallback) {
    const base = Object.assign({}, DEFAULTS, fallback || {});
    const api = runtimeRoot && runtimeRoot.V0101_CALIBRATION;
    const contract = api && api.contract;
    const authority = contract && contract.authority;
    if (!contract || !authority || (
      authority.yawSourceOfTruth !== true
      && authority.surgeSourceOfTruth !== true
      && authority.swaySourceOfTruth !== true
    )) {
      return { config: base, source: 'legacy-defaults' };
    }

    const inertia = contract.rigidBody && contract.rigidBody.inertiaKgM2;
    const added = contract.addedMassRatio || {};
    const damping = contract.damping || {};
    const tuning = contract.responseTuning || {};
    const coupling = contract.coupling || {};
    const limits = contract.responseLimits || {};
    const config = Object.assign({}, base);
    const sources = [];

    if (authority.surgeSourceOfTruth === true) {
      config.addedMassSurgeRatio = finiteOr(added.surge, base.addedMassSurgeRatio);
      config.surgeResponse = finiteOr(tuning.surgeResponse, base.surgeResponse);
      config.brakeSurgeResponse = finiteOr(tuning.brakeSurgeResponse, base.brakeSurgeResponse);
      config.maxSurgeAcceleration = finiteOr(limits.maxSurgeAcceleration, base.maxSurgeAcceleration);
      config.maxBrakeAcceleration = finiteOr(limits.maxBrakeAcceleration, base.maxBrakeAcceleration);
      sources.push('surge');
    }

    if (authority.swaySourceOfTruth === true) {
      config.addedMassSwayRatio = finiteOr(added.sway, base.addedMassSwayRatio);
      config.swayResponse = finiteOr(tuning.swayResponse, base.swayResponse);
      config.nonlinearSwayDamping = finiteOr(damping.swayNonlinear, base.nonlinearSwayDamping);
      config.maxSwayAcceleration = finiteOr(limits.maxSwayAcceleration, base.maxSwayAcceleration);
      config.swayYawCoupling = finiteOr(coupling.swayYaw, base.swayYawCoupling);
      sources.push('sway');
    }

    if (authority.yawSourceOfTruth === true) {
      config.yawInertiaKgM2 = finiteOr(inertia && inertia.yaw, base.yawInertiaKgM2);
      config.addedMassYawRatio = finiteOr(added.yaw, base.addedMassYawRatio);
      config.yawResponse = finiteOr(tuning.yawResponse, base.yawResponse);
      config.yawLinearDamping = finiteOr(damping.yawLinear, base.yawLinearDamping);
      config.nonlinearYawDamping = finiteOr(damping.yawNonlinear, base.nonlinearYawDamping);
      config.maxYawAcceleration = finiteOr(limits.maxYawAcceleration, base.maxYawAcceleration);
      config.maxYawRate = finiteOr(limits.maxYawRate, base.maxYawRate);
      sources.push('yaw');
    }

    return {
      config,
      source: sources.length ? `V0101_CALIBRATION.contract.${sources.join('+')}` : 'legacy-defaults'
    };
  }

  // Compatibility alias for older regression/helpers. It resolves the complete migrated Planar subset.
  function resolveYawDynamicsConfig(runtimeRoot, fallback) {
    return resolvePlanarDynamicsConfig(runtimeRoot, fallback);
  }

  function createIdentityConfigCache(resolver) {
    let initialized = false;
    let lastIdentity = null;
    let lastValue = null;
    let resolutions = 0;
    return {
      resolve(identity) {
        if (initialized && identity === lastIdentity) return lastValue;
        lastIdentity = identity;
        initialized = true;
        lastValue = resolver();
        resolutions += 1;
        return lastValue;
      },
      get resolutions() { return resolutions; }
    };
  }

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
    const momentAuthority = Boolean(input.momentAuthority) && Number.isFinite(input.externalYawMomentNm);
    const externalYawMomentNm = momentAuthority ? Number(input.externalYawMomentNm) : 0;

    const u = clamp(Number(state.u) || 0, 0, maxSpeed);
    const v = clamp(Number(state.v) || 0, -slipMax, slipMax);
    const r = clamp(Number(state.r) || 0, -o.maxYawRate, o.maxYawRate);

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

    const turnCoupling = clamp(u * r * o.swayYawCoupling, -3.2, 3.2);
    const swayAcceleration = clamp(
      (commandV - v) * swayResponse
        + turnCoupling
        - o.nonlinearSwayDamping * v * Math.abs(v),
      -o.maxSwayAcceleration,
      o.maxSwayAcceleration
    );

    let yawAcceleration;
    if (momentAuthority) {
      const effectiveYawInertia = Math.max(1, o.yawInertiaKgM2 * (1 + o.addedMassYawRatio));
      yawAcceleration = clamp(
        externalYawMomentNm / effectiveYawInertia
          - o.yawLinearDamping * r
          - o.nonlinearYawDamping * r * Math.abs(r),
        -o.maxYawAcceleration,
        o.maxYawAcceleration
      );
    } else {
      yawAcceleration = clamp(
        (commandR - r) * yawResponse
          - o.nonlinearYawDamping * r * Math.abs(r),
        -o.maxYawAcceleration,
        o.maxYawAcceleration
      );
    }

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
      turnCoupling,
      momentAuthority,
      externalYawMomentNm
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      DEFAULTS,
      resolvePlanarDynamicsConfig,
      resolveYawDynamicsConfig,
      createIdentityConfigCache,
      stepPlanarState,
      normalizeAngle,
      smoothstepRange
    };
  }

  if (typeof window === 'undefined' || typeof updateJetSki !== 'function') return;

  const previousUpdateJetSki = updateJetSki;
  const planarConfigCache = createIdentityConfigCache(() => resolvePlanarDynamicsConfig(root, DEFAULTS));
  function getRuntimePlanarConfig() {
    const calibration = root.V0101_CALIBRATION;
    const contractIdentity = calibration && calibration.contract ? calibration.contract : null;
    return planarConfigCache.resolve(contractIdentity);
  }
  function getRuntimeYawConfig() {
    return getRuntimePlanarConfig();
  }

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
    momentAuthority: false,
    externalYawMomentNm: 0,
    planarConfigSource: 'legacy-defaults',
    surgeConfigSource: 'legacy-defaults',
    swayConfigSource: 'legacy-defaults',
    yawConfigSource: 'legacy-defaults',
    planarConfigResolutions: 0,
    yawConfigResolutions: 0,
    legacySteeringDelta: 0,
    disturbanceYawDelta: 0,
    activeFrames: 0,
    momentFrames: 0,
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
    state.momentAuthority = false;
    state.externalYawMomentNm = 0;
    state.legacySteeringDelta = 0;
    state.disturbanceYawDelta = 0;
    state.resets += 1;
  }

  updateJetSki = function v0105PlanarDynamics(dt, t) {
    const yawBefore = yaw;
    previousUpdateJetSki(dt, t);

    const api = root.JETSKI_PHYSICS;
    const hydro = api && api.hydroModel;
    const plus = hydro && hydro.models && hydro.models['nine-point-plus'];
    const plusActive = Boolean(hydro && hydro.mode === 'nine-point-plus' && plus);
    const reverseActive = Boolean(root.V0941_REVERSE && root.V0941_REVERSE.controller && root.V0941_REVERSE.controller.active);
    const yawLayer = root.V099_NINE_POINT_PLUS_RUNTIME && root.V099_NINE_POINT_PLUS_RUNTIME.state;
    const commandR = yawLayer && Number.isFinite(yawLayer.yawRate) ? yawLayer.yawRate : 0;
    const steeringMoment = root.V0993_STEERING_YAW && root.V0993_STEERING_YAW.state;
    const momentAuthority = Boolean(steeringMoment && steeringMoment.active && Number.isFinite(steeringMoment.yawMomentNm));

    if (!plusActive || airborne || reverseActive) {
      resetToCurrent(commandR);
      return;
    }

    if (!state.initialized) resetToCurrent(commandR);

    const legacyYawAfter = yaw;
    const safeDt = clamp(Number(dt) || 0, 0, 1 / 20);
    let legacySteeringDelta = 0;
    let disturbanceYawDelta = 0;

    if (momentAuthority && safeDt > 0) {
      const ratio = clamp(speed / Math.max(physics.maxSpeed, 0.1), 0, 1);
      if (speed > physics.minimumSteerSpeed && typeof getSteerRate === 'function') {
        const waterAuthority = smoothstepRange(ratio, 0.02, 0.32);
        const steerScale = airborne ? physics.airborneSteerScale : 1;
        legacySteeringDelta = steeringValue * getSteerRate(ratio) * waterAuthority * steerScale * safeDt;
      }
      disturbanceYawDelta = normalizeAngle(legacyYawAfter - yawBefore - legacySteeringDelta);
    }

    const resolvedPlanar = getRuntimePlanarConfig();
    const next = stepPlanarState(state, {
      commandSurge: speed,
      commandSway: lateralSlip,
      commandYawRate: commandR,
      brakeHeld: Boolean(input.brake),
      maxSpeed: physics.maxSpeed,
      slipMax: physics.slipMax,
      momentAuthority,
      externalYawMomentNm: momentAuthority ? steeringMoment.yawMomentNm : 0
    }, dt, resolvedPlanar.config);

    if (momentAuthority) {
      yaw = yawBefore + disturbanceYawDelta + next.r * safeDt;
      state.momentFrames += 1;
    } else {
      yaw += (next.r - commandR) * safeDt;
    }
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
    state.momentAuthority = next.momentAuthority;
    state.externalYawMomentNm = next.externalYawMomentNm;
    state.planarConfigSource = resolvedPlanar.source;
    state.surgeConfigSource = resolvedPlanar.source;
    state.swayConfigSource = resolvedPlanar.source;
    state.yawConfigSource = resolvedPlanar.source;
    state.planarConfigResolutions = planarConfigCache.resolutions;
    state.yawConfigResolutions = planarConfigCache.resolutions;
    state.legacySteeringDelta = legacySteeringDelta;
    state.disturbanceYawDelta = disturbanceYawDelta;
    state.activeFrames += 1;

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
    version: 'V0.10.5',
    state,
    config: DEFAULTS,
    resolvePlanarDynamicsConfig,
    resolveYawDynamicsConfig,
    createIdentityConfigCache,
    getRuntimePlanarConfig,
    getRuntimeYawConfig,
    stepPlanarState,
    plusOnly: true,
    baseUntouched: true,
    voxelUntouched: true,
    reverseAuthorityPreserved: true,
    shorelineAuthorityPreserved: true,
    reducedOrder3DOF: true,
    steeringMomentReady: true,
    calibrationSurgeSourceReady: true,
    calibrationSwaySourceReady: true,
    calibrationYawSourceReady: true,
    legacyDefaultsAreFallbackOnly: true,
    configResolutionCached: true,
    get configCacheResolutions() { return planarConfigCache.resolutions; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
