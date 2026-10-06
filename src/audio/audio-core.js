// V0.11.16 T13 pure race-audio mix policy.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.16-T13';
  const DEFAULT_PREFS = Object.freeze({
    master: 0.78,
    music: 0.50,
    ambience: 0.68,
    effects: 0.82
  });

  function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }

  function sanitizePreferences(input) {
    const src = input && typeof input === 'object' ? input : {};
    return {
      master: clamp01(src.master == null ? DEFAULT_PREFS.master : src.master),
      music: clamp01(src.music == null ? DEFAULT_PREFS.music : src.music),
      ambience: clamp01(src.ambience == null ? DEFAULT_PREFS.ambience : src.ambience),
      effects: clamp01(src.effects == null ? DEFAULT_PREFS.effects : src.effects)
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
    if (phase === 'racing') return { ambience: 0.92, music: 1.0, effects: 1.0, intensity: 1.0, driving: 1.0 };
    if (phase === 'countdown' || phase === 'preparing') return { ambience: 0.72, music: 0.68, effects: 0.92, intensity: 0.72, driving: 0.18 };
    if (phase === 'paused') return { ambience: 0.22, music: 0.28, effects: 0.24, intensity: 0.15, driving: 0.0 };
    if (phase === 'finished') return { ambience: 0.48, music: 0.76, effects: 0.78, intensity: 0.44, driving: 0.0 };
    if (phase === 'free-ride') return { ambience: 1.0, music: 0.34, effects: 0.92, intensity: 0.32, driving: 1.0 };
    return { ambience: 0.50, music: 0.46, effects: 0.56, intensity: 0.22, driving: 0.0 };
  }

  function engineProfile(speedRatio, throttleRatio, boostActive) {
    const speed = clamp01(speedRatio);
    const throttle = clamp01(throttleRatio);
    const boost = Boolean(boostActive);
    return {
      fundamentalHz: 54 + speed * 116 + throttle * 28 + (boost ? 30 : 0),
      harmonicRatio: 1.86 + speed * 0.12,
      filterHz: 680 + speed * 1220 + throttle * 360 + (boost ? 620 : 0),
      engineGain: 0.10 + speed * 0.54 + throttle * 0.22 + (boost ? 0.12 : 0),
      waterGain: 0.04 + speed * 0.74 + (boost ? 0.12 : 0)
    };
  }

  const CUES = Object.freeze({
    countdown: Object.freeze({ tones: Object.freeze([440]), duration: 0.09, gain: 0.055, spacing: 0.0 }),
    go: Object.freeze({ tones: Object.freeze([740, 980]), duration: 0.13, gain: 0.060, spacing: 0.055 }),
    checkpoint: Object.freeze({ tones: Object.freeze([660, 920]), duration: 0.10, gain: 0.050, spacing: 0.055 }),
    lap: Object.freeze({ tones: Object.freeze([560, 720, 900]), duration: 0.13, gain: 0.052, spacing: 0.070 }),
    'final-lap': Object.freeze({ tones: Object.freeze([620, 830, 1110]), duration: 0.16, gain: 0.058, spacing: 0.085 }),
    finish: Object.freeze({ tones: Object.freeze([523.25, 659.25, 783.99]), duration: 0.22, gain: 0.064, spacing: 0.13 }),
    boost: Object.freeze({ tones: Object.freeze([180, 720]), duration: 0.20, gain: 0.050, spacing: 0.0, sweep: true })
  });

  function cueProfile(type) {
    return CUES[type] || CUES.checkpoint;
  }

  function computeMix(input) {
    const i = input || {};
    const prefs = sanitizePreferences(i.preferences);
    const atmosphere = atmosphereProfile(i.worldMode, i.eventId);
    const phase = phaseProfile(i.phase);
    const speedRatio = clamp01(i.speedRatio);
    const boost = Boolean(i.boostActive);
    const musicDuck = boost ? 0.82 : 1;
    return {
      master: prefs.master,
      wind: prefs.ambience * phase.ambience * atmosphere.wind * (0.55 + speedRatio * 0.55 + (boost ? 0.18 : 0)),
      ocean: prefs.ambience * phase.ambience * atmosphere.ocean,
      music: prefs.music * phase.music * musicDuck,
      effects: prefs.effects * phase.effects,
      engine: prefs.effects * phase.driving * (0.10 + speedRatio * 0.90),
      waterRush: prefs.effects * phase.driving * (0.06 + speedRatio * 0.94),
      sfx: prefs.effects * phase.effects,
      warmth: atmosphere.warmth,
      tension: Math.max(atmosphere.tension, phase.intensity * 0.48),
      intensity: Math.max(phase.intensity, boost ? 1 : 0),
      muted: prefs.master <= 0.001
    };
  }

  const api = {
    VERSION,
    DEFAULT_PREFS,
    CUES,
    clamp01,
    sanitizePreferences,
    atmosphereProfile,
    phaseProfile,
    engineProfile,
    cueProfile,
    computeMix
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_AUDIO_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
