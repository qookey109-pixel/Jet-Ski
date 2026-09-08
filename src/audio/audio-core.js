// V0.11.7 pure audio mix policy. No Web Audio side effects.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.7';
  const DEFAULT_SETTINGS = Object.freeze({ master: 0.78, music: 0.62, ambience: 0.68, muted: false });
  const CHORDS = Object.freeze([
    Object.freeze([220.00, 277.18, 329.63]),
    Object.freeze([196.00, 246.94, 293.66]),
    Object.freeze([174.61, 220.00, 261.63]),
    Object.freeze([207.65, 261.63, 311.13])
  ]);
  const FINAL_CHORDS = Object.freeze([
    Object.freeze([146.83, 220.00, 293.66]),
    Object.freeze([164.81, 246.94, 329.63]),
    Object.freeze([174.61, 261.63, 349.23]),
    Object.freeze([196.00, 293.66, 392.00])
  ]);

  function clamp(value, min, max) {
    const v = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));
  }

  function normalizeSettings(input) {
    const source = input || {};
    return {
      master: clamp(source.master == null ? DEFAULT_SETTINGS.master : source.master, 0, 1),
      music: clamp(source.music == null ? DEFAULT_SETTINGS.music : source.music, 0, 1),
      ambience: clamp(source.ambience == null ? DEFAULT_SETTINGS.ambience : source.ambience, 0, 1),
      muted: source.muted === true
    };
  }

  function phaseMix(phase, options) {
    const p = String(phase || 'menu');
    const o = options || {};
    const finale = Boolean(o.finale);
    const rough = o.seaState === 'rough';
    const speedRatio = clamp(o.speedRatio || 0, 0, 1);

    let music = 0.32;
    let ambience = 0.58;
    let wind = rough ? 0.72 : 0.42;
    let ocean = rough ? 0.88 : 0.64;
    let pulse = 0;

    if (p === 'racing') {
      music = finale ? 0.82 : 0.66;
      ambience = 0.62;
      wind += speedRatio * 0.20;
      ocean += speedRatio * 0.08;
      pulse = finale ? 0.86 : 0.48;
    } else if (p === 'countdown' || p === 'preparing') {
      music = finale ? 0.55 : 0.40;
      ambience = 0.54;
      pulse = finale ? 0.42 : 0.18;
    } else if (p === 'paused') {
      music = 0.14;
      ambience = 0.20;
      wind *= 0.42;
      ocean *= 0.46;
    } else if (p === 'finished') {
      music = finale ? 0.44 : 0.28;
      ambience = 0.48;
    } else if (p === 'free-ride') {
      music = 0.18;
      ambience = 0.74;
      wind += speedRatio * 0.18;
      ocean += speedRatio * 0.06;
    } else {
      music = 0.30;
      ambience = 0.48;
      wind *= 0.72;
      ocean *= 0.70;
    }

    return {
      music: clamp(music, 0, 1),
      ambience: clamp(ambience, 0, 1),
      wind: clamp(wind, 0, 1),
      ocean: clamp(ocean, 0, 1),
      pulse: clamp(pulse, 0, 1),
      finale
    };
  }

  function effectiveGains(settings, mix) {
    const s = normalizeSettings(settings);
    const m = mix || phaseMix('menu');
    const master = s.muted ? 0 : s.master;
    return {
      master,
      music: master * s.music * clamp(m.music, 0, 1),
      ambience: master * s.ambience * clamp(m.ambience, 0, 1),
      wind: master * s.ambience * clamp(m.ambience, 0, 1) * clamp(m.wind, 0, 1),
      ocean: master * s.ambience * clamp(m.ambience, 0, 1) * clamp(m.ocean, 0, 1),
      pulse: master * s.music * clamp(m.pulse, 0, 1)
    };
  }

  function chordAt(step, finale) {
    const bank = finale ? FINAL_CHORDS : CHORDS;
    const index = Math.abs(Math.floor(Number(step) || 0)) % bank.length;
    return bank[index];
  }

  function worldTone(worldMode) {
    if (worldMode === 'hawaii-coast') return { windHz: 1260, oceanHz: 580 };
    if (worldMode === 'taiwan-coast') return { windHz: 1040, oceanHz: 520 };
    if (worldMode === 'sun-moon-lake') return { windHz: 820, oceanHz: 360 };
    return { windHz: 1160, oceanHz: 540 };
  }

  const api = {
    VERSION,
    DEFAULT_SETTINGS,
    CHORDS,
    FINAL_CHORDS,
    clamp,
    normalizeSettings,
    phaseMix,
    effectiveGains,
    chordAt,
    worldTone
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_AUDIO_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
