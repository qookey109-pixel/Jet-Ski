// V0.11.14 mobile landscape / HUD UX pure policy. No DOM or gameplay writes.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.14';
  const RACE_PHASES = Object.freeze(new Set(['preparing', 'countdown', 'racing', 'paused', 'finished']));

  function finite(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function viewportProfile(width, height, coarsePointer) {
    const w = Math.max(1, finite(width, 1));
    const h = Math.max(1, finite(height, 1));
    const landscape = w >= h;
    const compactHeight = h <= 520;
    const phoneWidth = w <= 980;
    return Object.freeze({
      width: w,
      height: h,
      landscape,
      portrait: !landscape,
      compactHeight,
      phoneLandscape: landscape && compactHeight && phoneWidth,
      touchFirst: Boolean(coarsePointer),
      shouldSuggestRotate: Boolean(coarsePointer) && !landscape && w <= 900
    });
  }

  function isRaceFocusedPhase(phase) {
    return RACE_PHASES.has(String(phase || '').toLowerCase());
  }

  function actionTier(action, hasNativeRaceAction) {
    const value = String(action || '').toLowerCase();
    if (hasNativeRaceAction) {
      if (value === 'start' || value === 'resume') return 'primary';
      if (value === 'restart' || value === 'free' || value === 'menu') return 'standard';
      return 'secondary';
    }
    return 'secondary';
  }

  function compactHudPolicy(profile) {
    const p = profile || viewportProfile(1, 1, false);
    return Object.freeze({
      hideBestLap: Boolean(p.phoneLandscape),
      hideGhostDelta: Boolean(p.phoneLandscape),
      compactLabels: Boolean(p.compactHeight),
      touchTargetsPx: p.touchFirst ? 52 : 44
    });
  }

  function safeInset(value) {
    return Math.max(0, Math.min(80, finite(value, 0)));
  }

  const api = { VERSION, viewportProfile, isRaceFocusedPhase, actionTier, compactHudPolicy, safeInset };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_MOBILE_UX_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
