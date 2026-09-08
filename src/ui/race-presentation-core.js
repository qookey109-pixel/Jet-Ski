// V0.11.13 race presentation policy. Pure UI data shaping only.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.13';

  const ACCENTS = Object.freeze({
    open: Object.freeze({ accent: '#8fe9ff', glow: 'rgba(78,210,255,.24)' }),
    hawaii: Object.freeze({ accent: '#ffd38a', glow: 'rgba(255,178,74,.22)' }),
    taiwan: Object.freeze({ accent: '#bce8ff', glow: 'rgba(116,190,255,.22)' }),
    final: Object.freeze({ accent: '#ffe08a', glow: 'rgba(255,194,67,.30)' })
  });

  function finite(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function safeText(value, fallback, maxLength) {
    const text = typeof value === 'string' ? value.trim() : '';
    return (text || fallback || '').slice(0, maxLength || 64);
  }

  function placementPresentation(value) {
    const place = Math.max(1, Math.min(4, Math.floor(finite(value, 4))));
    if (place === 1) return { place, label: 'P1', headline: 'VICTORY', kicker: 'First Across The Water' };
    if (place === 2) return { place, label: 'P2', headline: 'PODIUM', kicker: 'Second Place Finish' };
    if (place === 3) return { place, label: 'P3', headline: 'FINISH', kicker: 'Third Place Finish' };
    return { place, label: 'P4', headline: 'FINISH', kicker: 'Race Complete' };
  }

  function identity(event) {
    const e = event || {};
    const eventId = safeText(e.id, 'open-sea-circuit', 48);
    const worldMode = safeText(e.worldMode, 'open-sea', 32);
    const finale = Boolean(e.finale) || eventId === 'pacific-crown-final';
    const key = finale ? 'final' : worldMode === 'hawaii-coast' ? 'hawaii' : worldMode === 'taiwan-coast' ? 'taiwan' : 'open';
    return {
      id: eventId,
      name: safeText(e.name, 'Open Sea Circuit', 64),
      subtitle: safeText(e.subtitle, 'Championship Event', 96),
      laps: Math.max(1, Math.min(9, Math.floor(finite(e.laps, 1)))),
      finale,
      accent: ACCENTS[key]
    };
  }

  function sanitizeStandings(entries, playerElapsedMs) {
    const source = Array.isArray(entries) ? entries.slice(0, 4) : [];
    return source.map((entry, index) => {
      const e = entry || {};
      const isPlayer = e.id === 'player';
      const playerTime = Math.max(0, finite(playerElapsedMs, 0));
      const rawFinish = Math.max(0, finite(e.finishMs, 0));
      return {
        place: index + 1,
        id: safeText(e.id, `racer-${index + 1}`, 32),
        name: safeText(e.name, isPlayer ? 'YOU' : 'RIVAL', 32),
        isPlayer,
        finished: isPlayer ? true : Boolean(e.finished),
        finishMs: isPlayer ? playerTime : rawFinish,
        lap: Math.max(1, Math.floor(finite(e.lap, 1))),
        nextCheckpointIndex: Math.max(0, Math.floor(finite(e.nextCheckpointIndex, 0)))
      };
    });
  }

  function standingStatus(entry) {
    const e = entry || {};
    if (e.isPlayer) return { type: 'time', value: Math.max(0, finite(e.finishMs, 0)) };
    if (e.finished) return { type: 'finished', value: Math.max(0, finite(e.finishMs, 0)) };
    return { type: 'progress', lap: Math.max(1, Math.floor(finite(e.lap, 1))), gate: Math.max(0, Math.floor(finite(e.nextCheckpointIndex, 0))) };
  }

  const api = { VERSION, ACCENTS, safeText, placementPresentation, identity, sanitizeStandings, standingStatus };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_RACE_PRESENTATION_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
