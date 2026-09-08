// V0.11.7 pure audio/atmosphere mix policy.
(function (root) {
  'use strict';
  const VERSION = 'V0.11.7';
  const DEFAULT_PREFS = Object.freeze({ master: 0.78, music: 0.55, ambience: 0.72 });

  function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
  function sanitizePreferences(input) {
    const src = input && typeof input === 'object' ? input : {};
    return {
      master: clamp01(src.master == null ? DEFAULT_PREFS.master : src.master),
      music: clamp01(src.music == null ? DEFAULT_PREFS.music : src.music),
      ambience: clamp01(src.ambience == null ? DEFAULT_PREFS.ambience : src.ambience)
    };
  }

  function atmosphereProfile(worldMode, eventId) {
    if (eventId === 'pacific-crown-final') return { wind: 0.90, ocean: 0.95, warmth: 0.18, tension: 1.0 };
    if (worldMode === 'hawaii-coast') return { wind: 0.48, ocean: 0.66, warmth: 0.86, tension: 0.30 };
    if (worldMode === 'taiwan-coast') return { wind: 0.74, ocean: 0.70, warmth: 0.40, tension: 0.42 };
    if (worldMode === 'sun-moon-lake') return { wind: 0.28, ocean: 0.22, warmth: 0.62, tension: 0.18 };
    return { wind: 0.58, ocean: 0.76, warmth: 0.52, tension: 0.40 };
  }

  function phaseProfile(phase) {
    if (phase === 'racing') return { ambience: 0.92, music: 1.0, intensity: 1.0 };
    if (phase === 'countdown' || phase === 'preparing') return { ambience: 0.72, music: 0.70, intensity: 0.72 };
    if (phase === 'paused') return { ambience: 0.22, music: 0.28, intensity: 0.15 };
    if (phase === 'finished') return { ambience: 0.48, music: 0.76, intensity: 0.44 };
    if (phase === 'free-ride') return { ambience: 1.0, music: 0.36, intensity: 0.32 };
    return { ambience: 0.50, music: 0.46, intensity: 0.22 };
  }

  function computeMix(input) {
    const i = input || {};
    const prefs = sanitizePreferences(i.preferences);
    const atmosphere = atmosphereProfile(i.worldMode, i.eventId);
    const phase = phaseProfile(i.phase);
    const speedRatio = clamp01(i.speedRatio);
    const boost = Boolean(i.boostActive);
    const master = prefs.master;
    return {
      master,
      wind: master * prefs.ambience * phase.ambience * atmosphere.wind * (0.55 + speedRatio * 0.55 + (boost ? 0.18 : 0)),
      ocean: master * prefs.ambience * phase.ambience * atmosphere.ocean,
      music: master * prefs.music * phase.music,
      warmth: atmosphere.warmth,
      tension: Math.max(atmosphere.tension, phase.intensity * 0.48),
      intensity: Math.max(phase.intensity, boost ? 1 : 0),
      muted: master <= 0.001
    };
  }

  const api = { VERSION, DEFAULT_PREFS, clamp01, sanitizePreferences, atmosphereProfile, phaseProfile, computeMix };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_AUDIO_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
