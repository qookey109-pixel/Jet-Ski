// V0.11.12 first-run onboarding + status summary pure policy.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.12';
  const PROFILE_VERSION = 1;

  function clampInt(value, min, max) {
    const n = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : min;
    return Math.max(min, Math.min(max, n));
  }

  function createProfile() {
    return { version: PROFILE_VERSION, seen: false, opens: 0 };
  }

  function sanitizeProfile(input) {
    const src = input && typeof input === 'object' ? input : {};
    return {
      version: PROFILE_VERSION,
      seen: Boolean(src.seen),
      opens: clampInt(src.opens, 0, 100000)
    };
  }

  function inputMode(capabilities) {
    const c = capabilities || {};
    if (c.gamepad) return 'gamepad';
    if (c.touch) return 'touch';
    return 'keyboard';
  }

  function hintsForMode(mode) {
    if (mode === 'gamepad') {
      return {
        steer: 'Left stick · steer / throttle',
        brake: 'Left stick down · brake / reverse',
        boost: 'A · Boost',
        camera: 'Right stick · camera · Start pauses'
      };
    }
    if (mode === 'touch') {
      return {
        steer: '◀ ▶ · steer',
        brake: 'GAS · accelerate · BRAKE / REV · slow / reverse',
        boost: 'BOOST · short surge assist',
        camera: 'Drag the view · follow the glowing gate'
      };
    }
    return {
      steer: 'W / ↑ accelerate · A D / ← → steer',
      brake: 'S / ↓ · brake / reverse',
      boost: 'SPACE · Boost',
      camera: 'Mouse drag · camera · ESC pauses'
    };
  }

  function sanitizeLabel(value, fallback) {
    const text = typeof value === 'string' ? value.trim() : '';
    return (text || fallback).slice(0, 48);
  }

  function careerSummary(input) {
    const i = input || {};
    return {
      stars: clampInt(i.stars, 0, 12),
      medals: clampInt(i.medals, 0, 8),
      ghostEnabled: Boolean(i.ghostEnabled),
      livery: sanitizeLabel(i.livery, 'Sunset Orange')
    };
  }

  const api = {
    VERSION,
    PROFILE_VERSION,
    createProfile,
    sanitizeProfile,
    inputMode,
    hintsForMode,
    careerSummary
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_ONBOARDING_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
