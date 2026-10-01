// V0.11.16 Tropical Arcade T4 pure arcade-feedback helpers.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.16-T4';
  const DEFAULTS = Object.freeze({
    checkpointBannerMs: 360,
    lapBannerMs: 860,
    finalLapBannerMs: 1080,
    finishBannerMs: 1320,
    boostFlashMs: 180,
    worldBurstMs: 540,
    worldBurstPoolDesktop: 5,
    worldBurstPoolMobile: 3
  });

  function finite(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }

  function snapshot(state) {
    const s = state || {};
    return {
      phase: String(s.phase || 'menu'),
      lap: Math.max(1, Math.floor(finite(s.lap, 1))),
      totalLaps: Math.max(1, Math.floor(finite(s.totalLaps, 1))),
      nextCheckpointIndex: Math.max(0, Math.floor(finite(s.nextCheckpointIndex, 0))),
      finished: Boolean(s.finished)
    };
  }

  function detectRaceFeedback(previous, current) {
    const prev = snapshot(previous);
    const now = snapshot(current);

    if (prev.phase !== 'racing' && now.phase === 'racing') {
      return { type: 'go', lap: now.lap, totalLaps: now.totalLaps };
    }

    if (prev.phase === 'racing' && now.phase === 'finished') {
      return { type: 'finish', lap: now.lap, totalLaps: now.totalLaps, checkpointIndex: 0 };
    }

    if (prev.phase !== 'racing' || now.phase !== 'racing') return null;

    if (now.lap > prev.lap) {
      return {
        type: now.lap >= now.totalLaps ? 'final-lap' : 'lap',
        lap: now.lap,
        totalLaps: now.totalLaps,
        checkpointIndex: 0
      };
    }

    if (now.nextCheckpointIndex !== prev.nextCheckpointIndex) {
      return {
        type: 'checkpoint',
        checkpointIndex: prev.nextCheckpointIndex,
        lap: now.lap,
        totalLaps: now.totalLaps
      };
    }

    return null;
  }

  function boostActivated(previousCount, currentCount) {
    const prev = Math.max(0, Math.floor(finite(previousCount, 0)));
    const now = Math.max(0, Math.floor(finite(currentCount, 0)));
    return now > prev;
  }

  function labelFor(event) {
    const e = event || {};
    if (e.type === 'go') return 'GO!';
    if (e.type === 'checkpoint') return 'CHECKPOINT';
    if (e.type === 'lap') return `LAP ${Math.max(1, e.lap | 0)}`;
    if (e.type === 'final-lap') return 'FINAL LAP';
    if (e.type === 'finish') return 'FINISH!';
    return '';
  }

  function intensityFor(type) {
    if (type === 'finish') return 1;
    if (type === 'final-lap') return 0.88;
    if (type === 'lap') return 0.72;
    if (type === 'checkpoint') return 0.48;
    if (type === 'boost') return 0.34;
    if (type === 'go') return 0.62;
    return 0;
  }

  const api = {
    VERSION,
    DEFAULTS,
    snapshot,
    detectRaceFeedback,
    boostActivated,
    labelFor,
    intensityFor,
    visualOnly: true,
    physicsUntouched: true,
    gameplayUntouched: true,
    raceRulesUntouched: true,
    boostAuthorityUntouched: true,
    cameraUntouched: true
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_ARCADE_FEEDBACK_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
