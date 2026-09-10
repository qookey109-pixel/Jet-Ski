// V0.11.16 Tropical Arcade T2 pure helpers: deterministic visual island placement only.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.16-T2';
  const DEFAULTS = Object.freeze({
    maxIslandsDesktop: 4,
    maxIslandsMobile: 3,
    minCourseClearance: 52,
    offsetStart: 64,
    offsetStep: 15,
    offsetAttempts: 5,
    islandRadiusMin: 14,
    islandRadiusMax: 21,
    palmsDesktop: 4,
    palmsMobile: 3
  });

  function finite(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, finite(value, min)));
  }

  function distancePointToSegment(px, pz, ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    const lengthSq = dx * dx + dz * dz;
    if (lengthSq < 1e-8) return Math.hypot(px - ax, pz - az);
    const t = clamp(((px - ax) * dx + (pz - az) * dz) / lengthSq, 0, 1);
    return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
  }

  function minDistanceToCourse(x, z, course) {
    const checkpoints = course && Array.isArray(course.checkpoints) ? course.checkpoints : [];
    if (checkpoints.length < 2) return Infinity;
    let best = Infinity;
    for (let i = 0; i < checkpoints.length; i++) {
      const a = checkpoints[i] || {};
      const b = checkpoints[(i + 1) % checkpoints.length] || a;
      const d = distancePointToSegment(
        finite(x), finite(z),
        finite(a.x), finite(a.z), finite(b.x), finite(b.z)
      );
      if (d < best) best = d;
    }
    return best;
  }

  function islandRadius(index, options) {
    const cfg = Object.assign({}, DEFAULTS, options || {});
    const low = Math.max(8, finite(cfg.islandRadiusMin, DEFAULTS.islandRadiusMin));
    const high = Math.max(low, finite(cfg.islandRadiusMax, DEFAULTS.islandRadiusMax));
    const sequence = [0.18, 0.72, 0.42, 0.9, 0.58];
    return low + (high - low) * sequence[Math.abs(index | 0) % sequence.length];
  }

  function deriveIslandPlacements(course, options) {
    const cfg = Object.assign({}, DEFAULTS, options || {});
    const checkpoints = course && Array.isArray(course.checkpoints) ? course.checkpoints : [];
    if (checkpoints.length < 2) return [];
    const requested = Math.max(0, Math.floor(finite(cfg.maxIslands, cfg.maxIslandsDesktop)));
    const maxIslands = Math.min(requested, checkpoints.length);
    if (!maxIslands) return [];

    const placements = [];
    const clearance = Math.max(30, finite(cfg.minCourseClearance, DEFAULTS.minCourseClearance));
    const offsetStart = Math.max(clearance + 4, finite(cfg.offsetStart, DEFAULTS.offsetStart));
    const offsetStep = Math.max(6, finite(cfg.offsetStep, DEFAULTS.offsetStep));
    const attempts = Math.max(1, Math.floor(finite(cfg.offsetAttempts, DEFAULTS.offsetAttempts)));

    for (let slot = 0; slot < maxIslands; slot++) {
      const segment = Math.floor(((slot + 0.5) / maxIslands) * checkpoints.length) % checkpoints.length;
      const a = checkpoints[segment] || {};
      const b = checkpoints[(segment + 1) % checkpoints.length] || a;
      const ax = finite(a.x), az = finite(a.z), bx = finite(b.x), bz = finite(b.z);
      const dx = bx - ax, dz = bz - az;
      const length = Math.hypot(dx, dz);
      if (length < 2) continue;
      const nx = dz / length;
      const nz = -dx / length;
      const side = slot % 2 === 0 ? 1 : -1;
      const t = slot % 3 === 0 ? 0.38 : slot % 3 === 1 ? 0.62 : 0.5;
      const cx = ax + dx * t;
      const cz = az + dz * t;
      const radius = islandRadius(slot, cfg);
      let candidate = null;

      for (let attempt = 0; attempt < attempts; attempt++) {
        const offset = offsetStart + attempt * offsetStep + (slot % 3) * 5;
        const x = cx + nx * side * offset;
        const z = cz + nz * side * offset;
        const courseDistance = minDistanceToCourse(x, z, course);
        if (courseDistance >= clearance + radius * 0.35) {
          candidate = { x, z, radius, side, segment, t, courseDistance, yaw: Math.atan2(dx, dz) };
          break;
        }
      }
      if (candidate) placements.push(candidate);
    }
    return placements;
  }

  function palmSeeds(island, count) {
    const total = Math.max(0, Math.floor(finite(count, 0)));
    const radius = Math.max(1, finite(island && island.radius, 12));
    const seeds = [];
    for (let i = 0; i < total; i++) {
      const angle = (i / Math.max(1, total)) * Math.PI * 2 + ((i * 1.73) % 1) * 0.58;
      const radial = radius * (0.18 + (i % 3) * 0.13);
      seeds.push({
        x: finite(island && island.x) + Math.cos(angle) * radial,
        z: finite(island && island.z) + Math.sin(angle) * radial,
        yaw: angle + Math.PI * 0.5,
        scale: 0.82 + (i % 4) * 0.08
      });
    }
    return seeds;
  }

  function shouldShowForEvent(event, realWorld3DActive) {
    if (realWorld3DActive) return false;
    const e = event || {};
    if (e.id === 'pacific-crown-final') return false;
    return e.id === 'open-sea-circuit' || e.worldMode === 'open-sea';
  }

  const api = {
    VERSION,
    DEFAULTS,
    distancePointToSegment,
    minDistanceToCourse,
    islandRadius,
    deriveIslandPlacements,
    palmSeeds,
    shouldShowForEvent,
    visualOnly: true,
    collisionAdded: false,
    physicsUntouched: true,
    gameplayUntouched: true,
    courseMutation: false
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_TROPICAL_ISLAND_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
