// V0.11.10 pure championship reward / livery policy.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.10';

  const LIVERIES = Object.freeze([
    Object.freeze({ id: 'sunset-orange', name: 'Sunset Orange', requiredStars: 0, primary: 0xff9f1c, accent: 0xfff3d6, emissive: 0x3a1800 }),
    Object.freeze({ id: 'lagoon-cyan', name: 'Lagoon Cyan', requiredStars: 3, primary: 0x20c9d6, accent: 0xd9ffff, emissive: 0x064a52 }),
    Object.freeze({ id: 'qixingtan-pearl', name: 'Qixingtan Pearl', requiredStars: 6, primary: 0x8ea5ae, accent: 0xf1f7f8, emissive: 0x263c45 }),
    Object.freeze({ id: 'midnight-pacific', name: 'Midnight Pacific', requiredStars: 9, primary: 0x4956c8, accent: 0xbfc7ff, emissive: 0x151c5a }),
    Object.freeze({ id: 'pacific-crown', name: 'Pacific Crown', requiredStars: 11, primary: 0xf0b429, accent: 0xfff0a3, emissive: 0x6b3a00 })
  ]);

  const BY_ID = Object.freeze(LIVERIES.reduce((map, livery) => {
    map[livery.id] = livery;
    return map;
  }, {}));

  function safeStars(value) {
    return Math.max(0, Math.min(12, Math.floor(Number(value) || 0)));
  }

  function isUnlocked(liveryOrId, totalStars) {
    const livery = typeof liveryOrId === 'string' ? BY_ID[liveryOrId] : liveryOrId;
    if (!livery) return false;
    return safeStars(totalStars) >= livery.requiredStars;
  }

  function unlockedLiveries(totalStars) {
    const stars = safeStars(totalStars);
    return LIVERIES.filter(livery => stars >= livery.requiredStars);
  }

  function nextUnlock(totalStars) {
    const stars = safeStars(totalStars);
    return LIVERIES.find(livery => livery.requiredStars > stars) || null;
  }

  function sanitizeSelection(id, totalStars) {
    if (id && isUnlocked(id, totalStars)) return id;
    return LIVERIES[0].id;
  }

  function rewardState(totalStars) {
    const stars = safeStars(totalStars);
    const unlocked = unlockedLiveries(stars);
    const next = nextUnlock(stars);
    return {
      totalStars: stars,
      unlockedCount: unlocked.length,
      totalCount: LIVERIES.length,
      nextUnlockId: next ? next.id : null,
      starsToNext: next ? Math.max(0, next.requiredStars - stars) : 0,
      complete: !next
    };
  }

  const api = {
    VERSION,
    LIVERIES,
    BY_ID,
    safeStars,
    isUnlocked,
    unlockedLiveries,
    nextUnlock,
    sanitizeSelection,
    rewardState
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_COSMETICS_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
