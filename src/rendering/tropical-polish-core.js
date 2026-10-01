// V0.11.16 Tropical Arcade T3 pure visual-polish helpers.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.16-T3';
  const DEFAULTS = Object.freeze({
    maxRocksDesktop: 20,
    maxRocksMobile: 12,
    maxFoamRingsDesktop: 4,
    maxFoamRingsMobile: 3,
    maxShallowRingsDesktop: 4,
    maxShallowRingsMobile: 3,
    maxDistantIslandsDesktop: 5,
    maxDistantIslandsMobile: 3,
    shorelineScale: 1.23,
    shallowScale: 1.42,
    distantMinRadius: 330,
    distantRadiusStep: 72
  });

  function finite(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, finite(value, min)));
  }

  function rockSeeds(placements, maxRocks) {
    const islands = Array.isArray(placements) ? placements : [];
    const limit = Math.max(0, Math.floor(finite(maxRocks, DEFAULTS.maxRocksDesktop)));
    const out = [];
    for (let i = 0; i < islands.length && out.length < limit; i++) {
      const island = islands[i] || {};
      const radius = Math.max(6, finite(island.radius, 14));
      const count = Math.min(6, Math.max(3, Math.floor(radius / 4)));
      for (let j = 0; j < count && out.length < limit; j++) {
        const angle = (j / count) * Math.PI * 2 + i * 0.73 + (j % 2) * 0.21;
        const radial = radius * (0.79 + (j % 3) * 0.07);
        out.push({
          x: finite(island.x) + Math.cos(angle) * radial,
          z: finite(island.z) + Math.sin(angle) * radial,
          yaw: angle * 0.7,
          scale: 0.55 + ((i + j) % 4) * 0.13
        });
      }
    }
    return out;
  }

  function shorelineSeeds(placements, maxCount, scaleMultiplier) {
    const islands = Array.isArray(placements) ? placements : [];
    const limit = Math.max(0, Math.floor(finite(maxCount, islands.length)));
    const mul = Math.max(1.02, finite(scaleMultiplier, DEFAULTS.shorelineScale));
    return islands.slice(0, limit).map((island, i) => ({
      x: finite(island && island.x),
      z: finite(island && island.z),
      radius: Math.max(6, finite(island && island.radius, 14)) * mul,
      yaw: finite(island && island.yaw) + i * 0.11,
      squash: 0.72 + (i % 2) * 0.08
    }));
  }

  function distantIslandSeeds(course, maxCount) {
    const cps = course && Array.isArray(course.checkpoints) ? course.checkpoints : [];
    const limit = Math.max(0, Math.floor(finite(maxCount, DEFAULTS.maxDistantIslandsDesktop)));
    if (cps.length < 2 || !limit) return [];

    let cx = 0, cz = 0;
    for (const cp of cps) {
      cx += finite(cp && cp.x);
      cz += finite(cp && cp.z);
    }
    cx /= cps.length;
    cz /= cps.length;

    const out = [];
    for (let i = 0; i < limit; i++) {
      const angle = 0.47 + i * 2.399963229728653;
      const radius = DEFAULTS.distantMinRadius + (i % 3) * DEFAULTS.distantRadiusStep;
      out.push({
        x: cx + Math.cos(angle) * radius,
        z: cz + Math.sin(angle) * radius,
        yaw: -angle,
        scale: 0.75 + (i % 4) * 0.18
      });
    }
    return out;
  }

  function speedVisualStrength(speed, maxSpeed) {
    const max = Math.max(0.1, finite(maxSpeed, 1));
    return clamp(finite(speed, 0) / max, 0, 1);
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
    rockSeeds,
    shorelineSeeds,
    distantIslandSeeds,
    speedVisualStrength,
    shouldShowForEvent,
    visualOnly: true,
    collisionAdded: false,
    physicsUntouched: true,
    gameplayUntouched: true,
    raceRulesUntouched: true,
    waterPhysicsUntouched: true
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_TROPICAL_POLISH_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
