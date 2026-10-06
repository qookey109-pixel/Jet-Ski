// V0.11.16 T11 Jet Ski craft visual profile. Pure data only.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.16-T11';
  const DEFAULTS = Object.freeze({
    playerScale: 1,
    aiScale: 0.86,
    minVisualMeshes: 11,
    maxVisualMeshes: 16,
    hullLength: 3.7,
    hullWidth: 1.85,
    hullHeight: 0.72
  });

  function finite(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function profile(kind, overrides) {
    const o = overrides || {};
    const isAI = kind === 'ai';
    const scale = Math.max(0.65, Math.min(1.15,
      finite(o.scale, isAI ? DEFAULTS.aiScale : DEFAULTS.playerScale)));
    return Object.freeze({
      kind: isAI ? 'ai' : 'player',
      scale,
      primary: finite(o.primary, isAI ? 0xff6b6b : 0xff8a2b),
      accent: finite(o.accent, 0xfff1bd),
      dark: finite(o.dark, 0x17283a),
      hullLength: DEFAULTS.hullLength * scale,
      hullWidth: DEFAULTS.hullWidth * scale,
      hullHeight: DEFAULTS.hullHeight * scale
    });
  }

  const api = {
    VERSION,
    DEFAULTS,
    profile,
    visualOnly: true,
    collisionAdded: false,
    massUntouched: true,
    physicsUntouched: true,
    gameplayUntouched: true,
    aiMovementUntouched: true
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_CRAFT_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
