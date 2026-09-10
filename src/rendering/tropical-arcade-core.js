// V0.11.16 Tropical Arcade visual-pass core. Pure helpers only; no gameplay/physics authority.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.16-T1';
  const DEFAULTS = Object.freeze({
    cameraExtraDistance: 2.65,
    cameraSpeedDistance: 0.95,
    cameraExtraHeight: 0.72,
    cameraSpeedHeight: 0.24,
    laneHalfWidth: 7.6,
    buoySpacing: 12.5,
    gateRadius: 7.05,
    gateTube: 0.62,
    maxBuoysDesktop: 72,
    maxBuoysMobile: 48
  });

  function finite(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, finite(value, 0)));
  }

  function isDrivingPhase(phase) {
    return phase === 'countdown' || phase === 'racing' || phase === 'paused' || phase === 'free-ride';
  }

  function cameraOffsets(speedRatio, options) {
    const cfg = Object.assign({}, DEFAULTS, options || {});
    const ratio = clamp01(speedRatio);
    return {
      distance: finite(cfg.cameraExtraDistance) + finite(cfg.cameraSpeedDistance) * ratio,
      height: finite(cfg.cameraExtraHeight) + finite(cfg.cameraSpeedHeight) * ratio
    };
  }

  function gatePose(checkpoint, nextCheckpoint) {
    const cp = checkpoint || {};
    const next = nextCheckpoint || cp;
    const dx = finite(next.x) - finite(cp.x);
    const dz = finite(next.z) - finite(cp.z);
    return {
      x: finite(cp.x),
      z: finite(cp.z),
      yaw: Math.atan2(dx, dz)
    };
  }

  function sampleLaneMarkers(course, options) {
    const cfg = Object.assign({}, DEFAULTS, options || {});
    const checkpoints = course && Array.isArray(course.checkpoints) ? course.checkpoints : [];
    if (checkpoints.length < 2) return [];

    const laneHalfWidth = Math.max(2, finite(cfg.laneHalfWidth, DEFAULTS.laneHalfWidth));
    const spacing = Math.max(5, finite(cfg.buoySpacing, DEFAULTS.buoySpacing));
    const maxBuoys = Math.max(2, Math.floor(finite(cfg.maxBuoys, cfg.maxBuoysDesktop)));
    const markers = [];

    for (let i = 0; i < checkpoints.length && markers.length < maxBuoys; i++) {
      const a = checkpoints[i] || {};
      const b = checkpoints[(i + 1) % checkpoints.length] || a;
      const ax = finite(a.x), az = finite(a.z), bx = finite(b.x), bz = finite(b.z);
      const dx = bx - ax, dz = bz - az;
      const length = Math.hypot(dx, dz);
      if (length < 1) continue;
      const nx = dz / length;
      const nz = -dx / length;
      const count = Math.max(1, Math.floor(length / spacing));

      for (let j = 1; j <= count && markers.length < maxBuoys; j++) {
        const t = j / (count + 1);
        const cx = ax + dx * t;
        const cz = az + dz * t;
        for (const side of [-1, 1]) {
          if (markers.length >= maxBuoys) break;
          markers.push({
            x: cx + nx * laneHalfWidth * side,
            z: cz + nz * laneHalfWidth * side,
            yaw: Math.atan2(dx, dz),
            side,
            segment: i,
            t
          });
        }
      }
    }
    return markers;
  }

  const api = {
    VERSION,
    DEFAULTS,
    clamp01,
    isDrivingPhase,
    cameraOffsets,
    gatePose,
    sampleLaneMarkers,
    visualOnly: true,
    checkpointRulesUntouched: true,
    boostAuthorityUntouched: true,
    physicsUntouched: true
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_TROPICAL_ARCADE_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
