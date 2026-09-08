// V0.11.5 Race Course core. Pure progression logic; no render/physics writes.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.5';

  function freezeCheckpoint(cp) { return Object.freeze(cp); }
  function freezeCourse(course) {
    const copy = Object.assign({}, course);
    if (copy.checkpoints) copy.checkpoints = Object.freeze(copy.checkpoints.map(freezeCheckpoint));
    if (copy.route) copy.route = Object.freeze(copy.route.map(point => Object.freeze(Object.assign({}, point))));
    return Object.freeze(copy);
  }

  const OPEN_SEA_CIRCUIT = freezeCourse({
    id: 'open-sea-circuit',
    name: 'Open Sea Circuit',
    shortName: 'OPEN SEA',
    description: 'Two fast laps through an exposed-ocean ring. Pure racing baseline.',
    worldMode: 'open-sea',
    seaState: 'normal',
    laps: 2,
    checkpointRadiusM: 14,
    unlockIndex: 0,
    checkpoints: [
      { id: 'start', label: 'START / FINISH', x: 0, z: 82 },
      { id: 'cp1', label: 'GATE 1', x: 58, z: 58 },
      { id: 'cp2', label: 'GATE 2', x: 82, z: 0 },
      { id: 'cp3', label: 'GATE 3', x: 58, z: -58 },
      { id: 'cp4', label: 'GATE 4', x: 0, z: -82 },
      { id: 'cp5', label: 'GATE 5', x: -58, z: -58 },
      { id: 'cp6', label: 'GATE 6', x: -82, z: 0 },
      { id: 'cp7', label: 'GATE 7', x: -58, z: 58 }
    ]
  });

  // Coast routes are expressed in spawn-local coordinates. `forward` follows the
  // coast runtime's safe water-facing spawn yaw; `side` is perpendicular to it.
  // They are materialized only after the coast world reports ready.
  const WAIKIKI_PACIFIC_RUN = freezeCourse({
    id: 'waikiki-pacific-run',
    name: 'Waikīkī Pacific Run',
    shortName: 'WAIKĪKĪ',
    description: 'Launch from the safe Waikīkī offshore spawn, sweep into the Pacific, then carve back toward the coast.',
    worldMode: 'hawaii-coast',
    seaState: 'normal',
    laps: 2,
    checkpointRadiusM: 17,
    unlockIndex: 1,
    relativeToSpawn: true,
    route: [
      { side: 0, forward: 0 },
      { side: 34, forward: 65 },
      { side: 82, forward: 125 },
      { side: 58, forward: 205 },
      { side: -8, forward: 248 },
      { side: -75, forward: 205 },
      { side: -96, forward: 118 },
      { side: -45, forward: 48 }
    ]
  });

  const QIXINGTAN_OCEAN_RUN = freezeCourse({
    id: 'qixingtan-ocean-run',
    name: 'Qixingtan Ocean Run',
    shortName: '七星潭',
    description: 'A longer offshore loop from Qixingtan, built around the coastline-safe spawn and Pacific-facing heading.',
    worldMode: 'taiwan-coast',
    seaState: 'normal',
    laps: 2,
    checkpointRadiusM: 17,
    unlockIndex: 2,
    relativeToSpawn: true,
    route: [
      { side: 0, forward: 0 },
      { side: 42, forward: 72 },
      { side: 95, forward: 145 },
      { side: 72, forward: 235 },
      { side: 8, forward: 282 },
      { side: -66, forward: 242 },
      { side: -104, forward: 150 },
      { side: -52, forward: 62 }
    ]
  });

  const COURSE_DEFINITIONS = Object.freeze([
    OPEN_SEA_CIRCUIT,
    WAIKIKI_PACIFIC_RUN,
    QIXINGTAN_OCEAN_RUN
  ]);

  const COURSES_BY_ID = Object.freeze(COURSE_DEFINITIONS.reduce((map, course) => {
    map[course.id] = course;
    return map;
  }, {}));

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

  function getCourseDefinition(id) {
    return COURSES_BY_ID[id] || OPEN_SEA_CIRCUIT;
  }

  function spawnLocalToWorld(side, forward, origin, yaw) {
    const heading = finite(yaw, Math.PI);
    const start = origin || { x: 0, z: 0 };
    return {
      x: finite(start.x, 0) + Math.sin(heading) * finite(forward, 0) + Math.cos(heading) * finite(side, 0),
      z: finite(start.z, 0) + Math.cos(heading) * finite(forward, 0) - Math.sin(heading) * finite(side, 0)
    };
  }

  function materializeCourse(definition, origin, yaw) {
    const def = definition || OPEN_SEA_CIRCUIT;
    if (!def.relativeToSpawn) return def;
    const checkpoints = def.route.map((point, index) => {
      const world = spawnLocalToWorld(point.side, point.forward, origin, yaw);
      return Object.freeze({
        id: index === 0 ? 'start' : `cp${index}`,
        label: index === 0 ? 'START / FINISH' : `GATE ${index}`,
        x: world.x,
        z: world.z
      });
    });
    return Object.freeze({
      id: def.id,
      name: def.name,
      shortName: def.shortName,
      description: def.description,
      worldMode: def.worldMode,
      seaState: def.seaState,
      laps: def.laps,
      checkpointRadiusM: def.checkpointRadiusM,
      unlockIndex: def.unlockIndex,
      relativeToSpawn: false,
      sourceDefinitionId: def.id,
      checkpoints: Object.freeze(checkpoints)
    });
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
    WAIKIKI_PACIFIC_RUN,
    QIXINGTAN_OCEAN_RUN,
    COURSE_DEFINITIONS,
    COURSES_BY_ID,
    getCourseDefinition,
    spawnLocalToWorld,
    materializeCourse,
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
