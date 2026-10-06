// V0.11.16 T10 race-venue staging helpers. Pure presentation geometry only.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.16-T10';
  const DEFAULTS = Object.freeze({
    laneHalfWidth: 11.5,
    lineForwardOffset: 4.5,
    pylonSideOffset: 13.6,
    pylonForwardOffset: 4.5,
    tileCountDesktop: 12,
    tileCountMobile: 10,
    tileInset: 0.92
  });

  function finite(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }

  function startPose(course) {
    const cps = course && Array.isArray(course.checkpoints) ? course.checkpoints : [];
    if (cps.length < 2) return null;
    const start = cps[0] || {};
    const next = cps[1] || start;
    const dx = finite(next.x) - finite(start.x);
    const dz = finite(next.z) - finite(start.z);
    const len = Math.max(0.001, Math.hypot(dx, dz));
    const fx = dx / len;
    const fz = dz / len;
    const rx = fz;
    const rz = -fx;
    return {
      x: finite(start.x),
      z: finite(start.z),
      fx, fz, rx, rz,
      yaw: Math.atan2(fx, fz)
    };
  }

  function startTiles(course, options) {
    const pose = startPose(course);
    if (!pose) return [];
    const cfg = Object.assign({}, DEFAULTS, options || {});
    const count = Math.max(4, Math.floor(finite(cfg.tileCount, DEFAULTS.tileCountDesktop)));
    const half = Math.max(4, finite(cfg.laneHalfWidth, DEFAULTS.laneHalfWidth));
    const inset = Math.max(0.5, Math.min(0.98, finite(cfg.tileInset, DEFAULTS.tileInset)));
    const forward = finite(cfg.lineForwardOffset, DEFAULTS.lineForwardOffset);
    const out = [];
    for (let i = 0; i < count; i++) {
      const u = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
      const lateral = u * half * inset;
      out.push({
        x: pose.x + pose.fx * forward + pose.rx * lateral,
        z: pose.z + pose.fz * forward + pose.rz * lateral,
        yaw: pose.yaw,
        index: i,
        side: u
      });
    }
    return out;
  }

  function pylonSeeds(course, options) {
    const pose = startPose(course);
    if (!pose) return [];
    const cfg = Object.assign({}, DEFAULTS, options || {});
    const side = Math.max(6, finite(cfg.pylonSideOffset, DEFAULTS.pylonSideOffset));
    const forward = finite(cfg.pylonForwardOffset, DEFAULTS.pylonForwardOffset);
    return [-1, 1].map(sign => ({
      x: pose.x + pose.fx * forward + pose.rx * side * sign,
      z: pose.z + pose.fz * forward + pose.rz * side * sign,
      yaw: pose.yaw,
      side: sign
    }));
  }

  function countdownStage(text, phase) {
    const value = String(text == null ? '' : text).trim().toUpperCase();
    if (phase === 'countdown') {
      if (value === '3') return 'red';
      if (value === '2') return 'amber';
      if (value === '1') return 'amber';
      if (value === 'GO') return 'green';
      return 'ready';
    }
    if (phase === 'racing') return 'green';
    return 'idle';
  }

  function shouldShow(event, realWorld3DActive) {
    if (realWorld3DActive) return false;
    const e = event || {};
    return e.worldMode === 'open-sea';
  }

  const api = {
    VERSION,
    DEFAULTS,
    startPose,
    startTiles,
    pylonSeeds,
    countdownStage,
    shouldShow,
    visualOnly: true,
    collisionAdded: false,
    physicsUntouched: true,
    gameplayUntouched: true,
    raceRulesUntouched: true,
    checkpointAuthorityUntouched: true
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_RACE_STAGING_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
