// V0.11.5 Multi-race catalog + persistent progression pure core.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.5';
  const PROFILE_VERSION = 1;

  function freezePoints(points) {
    return Object.freeze(points.map(point => Object.freeze(Object.assign({}, point))));
  }

  const EVENTS = Object.freeze([
    Object.freeze({
      id: 'open-sea-circuit',
      name: 'Open Sea Circuit',
      subtitle: 'Pure ocean · 2 laps',
      worldMode: 'open-sea',
      seaState: 'normal',
      laps: 2,
      checkpointRadiusM: 14,
      relative: false,
      points: freezePoints([
        { id: 'start', label: 'START / FINISH', x: 0, z: 82 },
        { id: 'cp1', label: 'GATE 1', x: 58, z: 58 },
        { id: 'cp2', label: 'GATE 2', x: 82, z: 0 },
        { id: 'cp3', label: 'GATE 3', x: 58, z: -58 },
        { id: 'cp4', label: 'GATE 4', x: 0, z: -82 },
        { id: 'cp5', label: 'GATE 5', x: -58, z: -58 },
        { id: 'cp6', label: 'GATE 6', x: -82, z: 0 },
        { id: 'cp7', label: 'GATE 7', x: -58, z: 58 }
      ])
    }),
    Object.freeze({
      id: 'waikiki-offshore',
      name: 'Waikīkī Offshore Sprint',
      subtitle: 'Oʻahu coast · blue-water loop',
      worldMode: 'hawaii-coast',
      seaState: 'normal',
      laps: 2,
      checkpointRadiusM: 16,
      relative: true,
      coastSpawnDistanceM: 220,
      points: freezePoints([
        { id: 'start', label: 'START / FINISH', right: 0, forward: 0 },
        { id: 'cp1', label: 'GATE 1', right: 42, forward: 78 },
        { id: 'cp2', label: 'GATE 2', right: 92, forward: 158 },
        { id: 'cp3', label: 'GATE 3', right: 54, forward: 246 },
        { id: 'cp4', label: 'GATE 4', right: -48, forward: 260 },
        { id: 'cp5', label: 'GATE 5', right: -96, forward: 168 },
        { id: 'cp6', label: 'GATE 6', right: -44, forward: 82 }
      ])
    }),
    Object.freeze({
      id: 'qixingtan-bluewater',
      name: 'Qixingtan Bluewater Run',
      subtitle: 'Hualien coast · long offshore arc',
      worldMode: 'taiwan-coast',
      seaState: 'normal',
      laps: 2,
      checkpointRadiusM: 16,
      relative: true,
      coastSpawnDistanceM: 180,
      points: freezePoints([
        { id: 'start', label: 'START / FINISH', right: 0, forward: 0 },
        { id: 'cp1', label: 'GATE 1', right: 36, forward: 86 },
        { id: 'cp2', label: 'GATE 2', right: 76, forward: 182 },
        { id: 'cp3', label: 'GATE 3', right: 28, forward: 286 },
        { id: 'cp4', label: 'GATE 4', right: -66, forward: 250 },
        { id: 'cp5', label: 'GATE 5', right: -92, forward: 148 },
        { id: 'cp6', label: 'GATE 6', right: -38, forward: 68 }
      ])
    })
  ]);

  const EVENT_BY_ID = Object.freeze(EVENTS.reduce((map, event) => {
    map[event.id] = event;
    return map;
  }, {}));

  function finite(value, fallback) {
    return Number.isFinite(value) ? Number(value) : fallback;
  }

  function getEvent(id) {
    return EVENT_BY_ID[id] || EVENTS[0];
  }

  function transformRelativePoint(point, anchor, heading) {
    const a = anchor || { x: 0, z: 0 };
    const yaw = finite(heading, 0);
    const forward = finite(point && point.forward, 0);
    const right = finite(point && point.right, 0);
    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    return {
      id: point.id,
      label: point.label,
      x: finite(a.x, 0) + forwardX * forward + rightX * right,
      z: finite(a.z, 0) + forwardZ * forward + rightZ * right
    };
  }

  function buildCourse(eventOrId, anchor, heading) {
    const event = typeof eventOrId === 'string' ? getEvent(eventOrId) : (eventOrId || EVENTS[0]);
    const checkpoints = event.relative
      ? event.points.map(point => transformRelativePoint(point, anchor, heading))
      : event.points.map(point => ({ id: point.id, label: point.label, x: point.x, z: point.z }));
    return {
      id: event.id,
      name: event.name,
      subtitle: event.subtitle,
      worldMode: event.worldMode,
      seaState: event.seaState,
      laps: event.laps,
      checkpointRadiusM: event.checkpointRadiusM,
      checkpoints
    };
  }

  function createProfile() {
    return {
      version: PROFILE_VERSION,
      unlocked: [EVENTS[0].id],
      bestTimes: {},
      completions: {},
      stars: {},
      totalFinishes: 0
    };
  }

  function sanitizeProfile(input) {
    const base = createProfile();
    if (!input || typeof input !== 'object') return base;
    const unlocked = Array.isArray(input.unlocked)
      ? input.unlocked.filter(id => Boolean(EVENT_BY_ID[id]))
      : [];
    if (!unlocked.includes(EVENTS[0].id)) unlocked.unshift(EVENTS[0].id);
    base.unlocked = [...new Set(unlocked)];
    for (const event of EVENTS) {
      const best = Number(input.bestTimes && input.bestTimes[event.id]);
      if (Number.isFinite(best) && best > 0) base.bestTimes[event.id] = best;
      const completions = Math.max(0, Math.floor(Number(input.completions && input.completions[event.id]) || 0));
      if (completions) base.completions[event.id] = completions;
      const stars = Math.max(0, Math.min(3, Math.floor(Number(input.stars && input.stars[event.id]) || 0)));
      if (stars) base.stars[event.id] = stars;
    }
    base.totalFinishes = Math.max(0, Math.floor(Number(input.totalFinishes) || 0));
    return base;
  }

  function isUnlocked(profile, eventId) {
    const p = profile || createProfile();
    return Array.isArray(p.unlocked) && p.unlocked.includes(eventId);
  }

  function starsForPlacement(placement) {
    const place = Math.max(1, Math.floor(finite(placement, 4)));
    return place === 1 ? 3 : place === 2 ? 2 : 1;
  }

  function recordResult(profile, result) {
    const p = sanitizeProfile(profile);
    const r = result || {};
    const event = getEvent(r.eventId);
    if (!r.finished || !isUnlocked(p, event.id)) return { profile: p, unlockedEventId: null, newBest: false, starsEarned: 0 };

    const elapsedMs = Math.max(1, finite(r.elapsedMs, Infinity));
    const previousBest = p.bestTimes[event.id];
    const newBest = Number.isFinite(elapsedMs) && (!previousBest || elapsedMs < previousBest);
    if (newBest) p.bestTimes[event.id] = elapsedMs;
    p.completions[event.id] = (p.completions[event.id] || 0) + 1;
    p.totalFinishes += 1;
    const starsEarned = starsForPlacement(r.placement);
    p.stars[event.id] = Math.max(p.stars[event.id] || 0, starsEarned);

    const index = EVENTS.findIndex(item => item.id === event.id);
    const next = EVENTS[index + 1];
    let unlockedEventId = null;
    if (next && !p.unlocked.includes(next.id)) {
      p.unlocked.push(next.id);
      unlockedEventId = next.id;
    }
    return { profile: p, unlockedEventId, newBest, starsEarned };
  }

  function nextEventId(profile, currentId) {
    const p = sanitizeProfile(profile);
    const index = EVENTS.findIndex(item => item.id === currentId);
    for (let i = index + 1; i < EVENTS.length; i++) {
      if (p.unlocked.includes(EVENTS[i].id)) return EVENTS[i].id;
    }
    return null;
  }

  function campaignComplete(profile) {
    const p = sanitizeProfile(profile);
    return EVENTS.every(event => (p.completions[event.id] || 0) > 0);
  }

  const api = {
    VERSION,
    PROFILE_VERSION,
    EVENTS,
    EVENT_BY_ID,
    getEvent,
    transformRelativePoint,
    buildCourse,
    createProfile,
    sanitizeProfile,
    isUnlocked,
    starsForPlacement,
    recordResult,
    nextEventId,
    campaignComplete
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_PROGRESSION_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
