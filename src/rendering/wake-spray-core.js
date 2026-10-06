// V0.11.16 T12 visual-only Jet Ski wake/spray helpers.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.16-T12';
  const DEFAULTS = Object.freeze({
    minSpeedMps: 2.0,
    fullSpeedMps: 18.0,
    sampleIntervalMs: 90,
    trailSamplesDesktop: 4,
    trailSamplesMobile: 3,
    maxWakeInstancesDesktop: 32,
    maxWakeInstancesMobile: 24,
    maxSprayInstancesDesktop: 16,
    maxSprayInstancesMobile: 12,
    wakeBaseLength: 1.45,
    wakeExtraLength: 2.2,
    wakeWidth: 0.26,
    wakeSpreadRad: 0.42,
    sprayBackOffset: 1.8,
    sprayBaseLift: 0.20,
    sprayExtraLift: 0.75
  });

  function finite(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, finite(v, 0)));
  }

  function speedStrength(speedMps, options) {
    const cfg = Object.assign({}, DEFAULTS, options || {});
    const min = Math.max(0, finite(cfg.minSpeedMps, DEFAULTS.minSpeedMps));
    const full = Math.max(min + 0.001, finite(cfg.fullSpeedMps, DEFAULTS.fullSpeedMps));
    return clamp01((finite(speedMps, 0) - min) / (full - min));
  }

  function wakeDimensions(speedMps, age01, options) {
    const cfg = Object.assign({}, DEFAULTS, options || {});
    const strength = speedStrength(speedMps, cfg);
    const age = clamp01(age01);
    const fade = 1 - age;
    return {
      strength,
      length: (finite(cfg.wakeBaseLength, DEFAULTS.wakeBaseLength) +
        finite(cfg.wakeExtraLength, DEFAULTS.wakeExtraLength) * strength) * (0.72 + 0.28 * fade),
      width: finite(cfg.wakeWidth, DEFAULTS.wakeWidth) * (0.78 + 0.60 * age) * (0.55 + 0.45 * strength),
      scale: Math.max(0, strength * (0.30 + 0.70 * fade))
    };
  }

  function shouldEmit(speedMps, phase, options) {
    const strength = speedStrength(speedMps, options);
    const driving = phase === 'racing' || phase === 'free-ride';
    return driving && strength > 0.01;
  }

  function estimateSpeed(previous, current, deltaSeconds) {
    const dt = Math.max(0.001, finite(deltaSeconds, 0));
    const dx = finite(current && current.x, 0) - finite(previous && previous.x, 0);
    const dz = finite(current && current.z, 0) - finite(previous && previous.z, 0);
    return Math.hypot(dx, dz) / dt;
  }

  const api = {
    VERSION,
    DEFAULTS,
    clamp01,
    speedStrength,
    wakeDimensions,
    shouldEmit,
    estimateSpeed,
    visualOnly: true,
    collisionAdded: false,
    physicsUntouched: true,
    gameplayUntouched: true,
    aiMovementUntouched: true,
    raceRulesUntouched: true,
    cameraUntouched: true
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_WAKE_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
