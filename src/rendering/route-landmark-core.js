// V0.11.16 T14 pure route-landmark helpers.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.16-T14';
  const DEFAULTS = Object.freeze({
    landmarkOffset: 20,
    minLandmarkOffset: 16,
    maxLandmarkOffset: 26,
    landmarkCount: 4,
    beaconHeight: 16,
    beaconRadius: 1.15,
    laneHalfWidth: 11.5
  });

  const TYPES = Object.freeze(['sun-sail', 'reef-spire', 'twin-fin', 'nav-tower']);

  function finite(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function courseCenter(course) {
    const cps = course && Array.isArray(course.checkpoints) ? course.checkpoints : [];
    if (!cps.length) return { x: 0, z: 0 };
    let x = 0, z = 0;
    for (const cp of cps) {
      x += finite(cp && cp.x, 0);
      z += finite(cp && cp.z, 0);
    }
    return { x: x / cps.length, z: z / cps.length };
  }

  function selectedIndices(count, desiredCount) {
    const n = Math.max(0, count | 0);
    const d = Math.max(0, Math.min(n, desiredCount == null ? DEFAULTS.landmarkCount : desiredCount | 0));
    if (n < 2 || d === 0) return [];
    const out = [];
    const step = n / d;
    for (let i = 0; i < d; i++) {
      let idx = Math.round((i + 0.5) * step) % n;
      if (idx === 0 && n > 2) idx = 1;
      while (out.includes(idx)) idx = (idx + 1) % n;
      out.push(idx);
    }
    return out.sort((a, b) => a - b);
  }

  function landmarkSeeds(course, options) {
    const cfg = Object.assign({}, DEFAULTS, options || {});
    const cps = course && Array.isArray(course.checkpoints) ? course.checkpoints : [];
    if (cps.length < 2) return [];
    const center = courseCenter(course);
    const count = Math.max(1, Math.min(cps.length, finite(cfg.landmarkCount, DEFAULTS.landmarkCount) | 0));
    const indices = selectedIndices(cps.length, count);
    const offset = Math.max(
      finite(cfg.minLandmarkOffset, DEFAULTS.minLandmarkOffset),
      Math.min(finite(cfg.maxLandmarkOffset, DEFAULTS.maxLandmarkOffset),
        finite(cfg.landmarkOffset, DEFAULTS.landmarkOffset))
    );

    return indices.map((index, order) => {
      const cp = cps[index] || {};
      const next = cps[(index + 1) % cps.length] || cp;
      let ox = finite(cp.x, 0) - center.x;
      let oz = finite(cp.z, 0) - center.z;
      let len = Math.hypot(ox, oz);
      if (len < 0.001) {
        const dx = finite(next.x, 0) - finite(cp.x, 0);
        const dz = finite(next.z, 0) - finite(cp.z, 0);
        len = Math.max(0.001, Math.hypot(dx, dz));
        ox = dz / len;
        oz = -dx / len;
        len = 1;
      }
      ox /= len;
      oz /= len;

      const x = finite(cp.x, 0) + ox * offset;
      const z = finite(cp.z, 0) + oz * offset;
      const toCpX = finite(cp.x, 0) - x;
      const toCpZ = finite(cp.z, 0) - z;

      return {
        index,
        order,
        type: TYPES[order % TYPES.length],
        x,
        z,
        yaw: Math.atan2(toCpX, toCpZ),
        courseX: finite(cp.x, 0),
        courseZ: finite(cp.z, 0),
        outwardDistance: Math.hypot(x - finite(cp.x, 0), z - finite(cp.z, 0))
      };
    });
  }

  function shouldShowForEvent(event, realWorld3DActive) {
    if (realWorld3DActive) return false;
    const e = event || {};
    return e.id === 'open-sea-circuit' || e.worldMode === 'open-sea';
  }

  const api = {
    VERSION,
    DEFAULTS,
    TYPES,
    courseCenter,
    selectedIndices,
    landmarkSeeds,
    shouldShowForEvent,
    visualOnly: true,
    collisionAdded: false,
    physicsUntouched: true,
    gameplayUntouched: true,
    raceRulesUntouched: true,
    checkpointAuthorityUntouched: true,
    cameraUntouched: true,
    courseMutation: false
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_ROUTE_LANDMARK_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
