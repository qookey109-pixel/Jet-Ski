// V0.11.5 pure progression state. Browser persistence lives in progression-runtime.js.
(function (root) {
  'use strict';
  const VERSION = 'V0.11.5';

  function createProgress(courseDefinitions) {
    const defs = Array.isArray(courseDefinitions) ? courseDefinitions : [];
    return {
      unlockedCount: defs.length ? 1 : 0,
      completions: {},
      personalBests: {},
      totalFinishes: 0
    };
  }

  function normalizeProgress(input, courseDefinitions) {
    const defs = Array.isArray(courseDefinitions) ? courseDefinitions : [];
    const base = createProgress(defs);
    const src = input && typeof input === 'object' ? input : {};
    base.unlockedCount = Math.max(0, Math.min(defs.length, Number(src.unlockedCount) || base.unlockedCount));
    base.completions = src.completions && typeof src.completions === 'object' ? Object.assign({}, src.completions) : {};
    base.personalBests = src.personalBests && typeof src.personalBests === 'object' ? Object.assign({}, src.personalBests) : {};
    base.totalFinishes = Math.max(0, Number(src.totalFinishes) || 0);
    return base;
  }

  function isUnlocked(progress, definition) {
    if (!progress || !definition) return false;
    return Number(definition.unlockIndex) < Number(progress.unlockedCount || 0);
  }

  function recordFinish(progress, definition, elapsedMs, courseDefinitions) {
    const defs = Array.isArray(courseDefinitions) ? courseDefinitions : [];
    const p = normalizeProgress(progress, defs);
    const id = definition && definition.id;
    if (!id) return { progress: p, personalBest: false, unlockedId: null };
    const elapsed = Math.max(0, Number(elapsedMs) || 0);
    p.totalFinishes += 1;
    p.completions[id] = Math.max(0, Number(p.completions[id]) || 0) + 1;
    const previousBest = Number(p.personalBests[id]) || 0;
    const personalBest = elapsed > 0 && (previousBest <= 0 || elapsed < previousBest);
    if (personalBest) p.personalBests[id] = elapsed;

    let unlockedId = null;
    const nextIndex = Number(definition.unlockIndex) + 1;
    if (nextIndex < defs.length && p.unlockedCount <= nextIndex) {
      p.unlockedCount = Math.min(defs.length, nextIndex + 1);
      unlockedId = defs[nextIndex].id;
    }
    return { progress: p, personalBest, unlockedId };
  }

  function resetProgress(courseDefinitions) {
    return createProgress(courseDefinitions);
  }

  const api = { VERSION, createProgress, normalizeProgress, isUnlocked, recordFinish, resetProgress };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_PROGRESSION_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
