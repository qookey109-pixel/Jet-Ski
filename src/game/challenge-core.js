// V0.11.11 persistent challenge/achievement policy. Pure logic only.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.11';
  const PROFILE_VERSION = 1;

  const CHALLENGES = Object.freeze([
    Object.freeze({ id: 'first-finish', name: 'FIRST SPLASH', description: 'Finish any Championship race.' }),
    Object.freeze({ id: 'podium', name: 'PODIUM HUNTER', description: 'Finish P1 or P2 in any race.' }),
    Object.freeze({ id: 'victory', name: 'VICTORY LAP', description: 'Win any Championship race.' }),
    Object.freeze({ id: 'pure-water', name: 'PURE WATER', description: 'Finish a race without activating Boost.' }),
    Object.freeze({ id: 'pb-breaker', name: 'PB BREAKER', description: 'Beat a Personal Best that already existed before the run.' }),
    Object.freeze({ id: 'full-tour', name: 'FOUR HORIZONS', description: 'Complete all four Championship events.' }),
    Object.freeze({ id: 'perfect-stars', name: 'STAR MASTER', description: 'Reach the maximum 12 Championship stars.' }),
    Object.freeze({ id: 'crown-victory', name: 'CROWN VICTORY', description: 'Win the Pacific Crown Final.' })
  ]);

  const BY_ID = Object.freeze(CHALLENGES.reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {}));

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function createProfile() {
    return { version: PROFILE_VERSION, completed: {}, completedOrder: [] };
  }

  function sanitizeProfile(input) {
    const next = createProfile();
    if (!input || typeof input !== 'object') return next;
    const completed = input.completed && typeof input.completed === 'object' ? input.completed : {};
    for (const challenge of CHALLENGES) {
      if (completed[challenge.id]) next.completed[challenge.id] = true;
    }
    const order = Array.isArray(input.completedOrder) ? input.completedOrder : [];
    for (const id of order) {
      if (BY_ID[id] && next.completed[id] && !next.completedOrder.includes(id)) next.completedOrder.push(id);
    }
    for (const challenge of CHALLENGES) {
      if (next.completed[challenge.id] && !next.completedOrder.includes(challenge.id)) next.completedOrder.push(challenge.id);
    }
    return next;
  }

  function qualifies(id, run) {
    const r = run || {};
    const finished = Boolean(r.finished);
    const placement = Math.max(1, Math.floor(finite(r.placement, 99)));
    const boostActivations = Math.max(0, Math.floor(finite(r.boostActivations, 0)));
    const elapsedMs = finite(r.elapsedMs, 0);
    const previousBestMs = finite(r.previousBestMs, 0);
    const completedEvents = Math.max(0, Math.floor(finite(r.completedEvents, 0)));
    const totalStars = Math.max(0, Math.floor(finite(r.totalStars, 0)));

    if (id === 'first-finish') return finished;
    if (id === 'podium') return finished && placement <= 2;
    if (id === 'victory') return finished && placement === 1;
    if (id === 'pure-water') return finished && r.boostObserved === true && boostActivations === 0;
    if (id === 'pb-breaker') return finished && previousBestMs > 0 && elapsedMs > 0 && elapsedMs < previousBestMs;
    if (id === 'full-tour') return finished && completedEvents >= 4;
    if (id === 'perfect-stars') return finished && totalStars >= 12;
    if (id === 'crown-victory') return finished && r.eventId === 'pacific-crown-final' && placement === 1;
    return false;
  }

  function recordRun(profile, run) {
    const next = sanitizeProfile(profile);
    const newlyCompleted = [];
    for (const challenge of CHALLENGES) {
      if (next.completed[challenge.id]) continue;
      if (!qualifies(challenge.id, run)) continue;
      next.completed[challenge.id] = true;
      next.completedOrder.push(challenge.id);
      newlyCompleted.push(challenge.id);
    }
    return { profile: next, newlyCompleted, medals: completedCount(next) };
  }

  function completedCount(profile) {
    const p = sanitizeProfile(profile);
    let count = 0;
    for (const challenge of CHALLENGES) if (p.completed[challenge.id]) count += 1;
    return count;
  }

  function complete(profile) {
    return completedCount(profile) === CHALLENGES.length;
  }

  function nextIncomplete(profile) {
    const p = sanitizeProfile(profile);
    return CHALLENGES.find(challenge => !p.completed[challenge.id]) || null;
  }

  const api = {
    VERSION,
    PROFILE_VERSION,
    CHALLENGES,
    BY_ID,
    createProfile,
    sanitizeProfile,
    qualifies,
    recordRun,
    completedCount,
    complete,
    nextIncomplete
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_CHALLENGE_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
