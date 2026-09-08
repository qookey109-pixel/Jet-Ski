// V0.11.3 pure input/camera helpers.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.3';
  const DEFAULTS = Object.freeze({
    deadzone: 0.18,
    lookYawRate: 2.25,
    lookPitchRate: 1.55,
    mouseSensitivity: 0.0036,
    maxYawOffset: 1.35,
    minPitchOffset: -0.38,
    maxPitchOffset: 0.52,
    orbitResponse: 8.0,
    recenterDelay: 1.8,
    recenterResponse: 1.55,
    zoomMin: -2.0,
    zoomMax: 6.0
  });

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, Number(v) || 0));
  }

  function applyDeadzone(value, deadzone) {
    const d = clamp(deadzone == null ? DEFAULTS.deadzone : deadzone, 0, 0.95);
    const v = clamp(value, -1, 1);
    const a = Math.abs(v);
    if (a <= d) return 0;
    const scaled = (a - d) / Math.max(1e-6, 1 - d);
    return Math.sign(v) * scaled;
  }

  function expApproach(current, target, response, dt) {
    const safeDt = clamp(dt, 0, 1 / 20);
    const r = Math.max(0, Number(response) || 0);
    const alpha = 1 - Math.exp(-r * safeDt);
    return current + (target - current) * alpha;
  }

  function createOrbitState() {
    return {
      yaw: 0,
      pitch: 0,
      targetYaw: 0,
      targetPitch: 0,
      zoomOffset: 0,
      idleSeconds: 999,
      lastLookMagnitude: 0
    };
  }

  function stepOrbit(state, input, dt, options) {
    const s = state || createOrbitState();
    const o = Object.assign({}, DEFAULTS, options || {});
    const safeDt = clamp(dt, 0, 1 / 20);
    const lookX = applyDeadzone(input && input.lookX, o.deadzone);
    const lookY = applyDeadzone(input && input.lookY, o.deadzone);
    const magnitude = Math.max(Math.abs(lookX), Math.abs(lookY));

    if (magnitude > 0) {
      s.targetYaw = clamp(s.targetYaw - lookX * o.lookYawRate * safeDt, -o.maxYawOffset, o.maxYawOffset);
      s.targetPitch = clamp(s.targetPitch + lookY * o.lookPitchRate * safeDt, o.minPitchOffset, o.maxPitchOffset);
      s.idleSeconds = 0;
    } else {
      s.idleSeconds += safeDt;
      if (s.idleSeconds >= o.recenterDelay) {
        s.targetYaw = expApproach(s.targetYaw, 0, o.recenterResponse, safeDt);
        s.targetPitch = expApproach(s.targetPitch, 0, o.recenterResponse, safeDt);
      }
    }

    s.yaw = expApproach(s.yaw, s.targetYaw, o.orbitResponse, safeDt);
    s.pitch = expApproach(s.pitch, s.targetPitch, o.orbitResponse, safeDt);
    s.zoomOffset = clamp(s.zoomOffset, o.zoomMin, o.zoomMax);
    s.lastLookMagnitude = magnitude;
    return s;
  }

  function applyPointerDelta(state, dx, dy, options) {
    const s = state || createOrbitState();
    const o = Object.assign({}, DEFAULTS, options || {});
    s.targetYaw = clamp(s.targetYaw - (Number(dx) || 0) * o.mouseSensitivity, -o.maxYawOffset, o.maxYawOffset);
    s.targetPitch = clamp(s.targetPitch + (Number(dy) || 0) * o.mouseSensitivity, o.minPitchOffset, o.maxPitchOffset);
    s.idleSeconds = 0;
    return s;
  }

  const api = { VERSION, DEFAULTS, clamp, applyDeadzone, expApproach, createOrbitState, stepOrbit, applyPointerDelta };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_CONTROL_CAMERA_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
