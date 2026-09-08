// V0.11.4 pure graphics-quality policy.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.4';
  const PRESETS = Object.freeze({
    low: Object.freeze({ pixelRatioCap: 0.9, reflectionSize: 192, shadows: false }),
    medium: Object.freeze({ pixelRatioCap: 1.0, reflectionSize: 256, shadows: true }),
    high: Object.freeze({ pixelRatioCap: 1.5, reflectionSize: 384, shadows: true }),
    ultra: Object.freeze({ pixelRatioCap: 2.0, reflectionSize: 512, shadows: true })
  });
  const ORDER = Object.freeze(['low', 'medium', 'high', 'ultra']);

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function normalizeMode(mode) {
    return mode === 'auto' || PRESETS[mode] ? mode : 'auto';
  }

  function effectivePreset(mode, autoLevel) {
    const m = normalizeMode(mode);
    return m === 'auto' ? (PRESETS[autoLevel] ? autoLevel : 'high') : m;
  }

  function buildBudget(mode, autoLevel, devicePixelRatio, resolutionScale, safariDesktop, shadowOverride) {
    const level = effectivePreset(mode, autoLevel);
    const preset = PRESETS[level];
    const dpr = Math.max(0.5, Number(devicePixelRatio) || 1);
    const scale = clamp(resolutionScale == null ? 1 : resolutionScale, 0.6, 1.0);
    const hardSafariCap = safariDesktop ? 1.15 : Infinity;
    const effectivePixelRatio = Math.min(dpr, preset.pixelRatioCap * scale, hardSafariCap);
    const shadows = typeof shadowOverride === 'boolean' ? shadowOverride : preset.shadows;
    return {
      level,
      effectivePixelRatio,
      reflectionSize: preset.reflectionSize,
      shadows,
      resolutionScale: scale,
      safariHardCap: safariDesktop ? 1.15 : null
    };
  }

  function nextAutoLevel(current, metrics, timers, dt) {
    const level = PRESETS[current] ? current : 'high';
    const m = metrics || {};
    const t = timers || { badSeconds: 0, goodSeconds: 0 };
    const safeDt = clamp(dt, 0, 2);
    const fps = Number(m.fps) || 0;
    const p95 = Number(m.p95Ms) || 0;
    const longFrames = Number(m.longFrames) || 0;
    const bad = (fps > 0 && fps < 45) || p95 > 24 || longFrames > 22;
    const good = fps >= 58 && p95 > 0 && p95 < 18 && longFrames <= 5;

    t.badSeconds = bad ? t.badSeconds + safeDt : Math.max(0, t.badSeconds - safeDt * 0.5);
    t.goodSeconds = good ? t.goodSeconds + safeDt : Math.max(0, t.goodSeconds - safeDt * 0.5);

    let next = level;
    const index = ORDER.indexOf(level);
    if (t.badSeconds >= 5 && index > 0) {
      next = ORDER[index - 1];
      t.badSeconds = 0;
      t.goodSeconds = 0;
    } else if (t.goodSeconds >= 12 && index < ORDER.length - 1) {
      next = ORDER[index + 1];
      t.badSeconds = 0;
      t.goodSeconds = 0;
    }
    return { level: next, timers: t };
  }

  const api = { VERSION, PRESETS, ORDER, clamp, normalizeMode, effectivePreset, buildBudget, nextAutoLevel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_QUALITY_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
