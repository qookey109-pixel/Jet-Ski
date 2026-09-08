// V0.11.0 Race Course core. Pure progression logic; no render/physics writes.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.0';

  const OPEN_SEA_CIRCUIT = Object.freeze({
    id: 'open-sea-circuit',
    name: 'Open Sea Circuit',
    worldMode: 'open-sea',
    seaState: 'normal',
    laps: 2,
    checkpointRadiusM: 14,
    checkpoints: Object.freeze([
      Object.freeze({ id: 'start', label: 'START / FINISH', x: 0, z: 82 }),
      Object.freeze({ id: 'cp1', label: 'GATE 1', x: 58, z: 58 }),
      Object.freeze({ id: 'cp2', label: 'GATE 2', x: 82, z: 0 }),
      Object.freeze({ id: 'cp3', label: 'GATE 3', x: 58, z: -58 }),
      Object.freeze({ id: 'cp4', label: 'GATE 4', x: 0, z: -82 }),
      Object.freeze({ id: 'cp5', label: 'GATE 5', x: -58, z: -58 }),
      Object.freeze({ id: 'cp6', label: 'GATE 6', x: -82, z: 0 }),
      Object.freeze({ id: 'cp7', label: 'GATE 7', x: -58, z: 58 })
    ])
  });

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function distanceSq2D(a, b) {
    const dx = finite(a && a.x, 0) - finite(b && b.x, 0);
    const dz = finite(a && a.z, 0) - finite(b && b.z, 0);
    return dx * dx + dz * dz;
  }

  function formatRaceTime(ms) {
    const safe = Math.max(0, Math.floor(finite(ms, 0)));
    const minutes = Math.floor(safe / 60000);
    const seconds = Math.floor((safe % 60000) / 1000);
    const millis = safe % 1000;
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }

  function createRaceState(course) {
    const c = course || OPEN_SEA_CIRCUIT;
    return {
      phase: 'menu',
      lap: 1,
      totalLaps: Math.max(1, c.laps | 0),
      nextCheckpointIndex: 1,
      checkpointCount: c.checkpoints.length,
      elapsedMs: 0,
      currentLapMs: 0,
      bestLapMs: null,
      lastLapMs: null,
      lapStartMs: 0,
      raceStartMs: 0,
      finishMs: 0,
      checkpointsPassed: 0,
      wrongWayHits: 0,
      finished: false
    };
  }

  function beginRace(state, nowMs) {
    const now = finite(nowMs, 0);
    state.phase = 'racing';
    state.lap = 1;
    state.nextCheckpointIndex = 1;
    state.elapsedMs = 0;
    state.currentLapMs = 0;
    state.bestLapMs = null;
    state.lastLapMs = null;
    state.raceStartMs = now;
    state.lapStartMs = now;
    state.finishMs = 0;
    state.checkpointsPassed = 0;
    state.wrongWayHits = 0;
    state.finished = false;
    return state;
  }

  function completeLap(state, nowMs) {
    const now = finite(nowMs, state.lapStartMs);
    const lapMs = Math.max(0, now - state.lapStartMs);
    state.lastLapMs = lapMs;
    state.bestLapMs = state.bestLapMs == null ? lapMs : Math.min(state.bestLapMs, lapMs);
    if (state.lap >= state.totalLaps) {
      state.phase = 'finished';
      state.finished = true;
      state.finishMs = now;
      state.elapsedMs = Math.max(0, now - state.raceStartMs);
      state.currentLapMs = lapMs;
      return 'finish';
    }
    state.lap += 1;
    state.lapStartMs = now;
    state.currentLapMs = 0;
    state.nextCheckpointIndex = 1;
    return 'lap';
  }

  function passCheckpoint(state, checkpointIndex, nowMs, course) {
    const c = course || OPEN_SEA_CIRCUIT;
    if (state.phase !== 'racing') return { accepted: false, event: 'inactive' };
    if (checkpointIndex !== state.nextCheckpointIndex) {
      state.wrongWayHits += 1;
      return { accepted: false, event: 'wrong-checkpoint' };
    }
    state.checkpointsPassed += 1;
    if (checkpointIndex === 0) return { accepted: true, event: completeLap(state, nowMs) };
    state.nextCheckpointIndex = checkpointIndex + 1;
    if (state.nextCheckpointIndex >= c.checkpoints.length) state.nextCheckpointIndex = 0;
    return { accepted: true, event: 'checkpoint' };
  }

  function updateRaceClock(state, nowMs) {
    if (state.phase !== 'racing') return state;
    const now = finite(nowMs, state.raceStartMs);
    state.elapsedMs = Math.max(0, now - state.raceStartMs);
    state.currentLapMs = Math.max(0, now - state.lapStartMs);
    return state;
  }

  function targetCheckpoint(state, course) {
    const c = course || OPEN_SEA_CIRCUIT;
    return c.checkpoints[state.nextCheckpointIndex] || c.checkpoints[0];
  }

  function isInsideTarget(state, position, course) {
    const c = course || OPEN_SEA_CIRCUIT;
    const target = targetCheckpoint(state, c);
    const radius = finite(c.checkpointRadiusM, 14);
    return distanceSq2D(position, target) <= radius * radius;
  }

  const api = {
    VERSION,
    OPEN_SEA_CIRCUIT,
    distanceSq2D,
    formatRaceTime,
    createRaceState,
    beginRace,
    passCheckpoint,
    updateRaceClock,
    targetCheckpoint,
    isInsideTarget
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_RACE_COURSE = api;
})(typeof window !== 'undefined' ? window : globalThis);
