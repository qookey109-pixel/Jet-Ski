// V0.11.16 race-frame adapter for the existing V0.9.3 floating origin.
// Keeps race-local checkpoints, gate visuals and reduced-order AI in the same local
// coordinate frame when the authoritative ocean recenters the player/camera.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.16';

  function finite(value) {
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function shiftRaceLocalFrame(course, gateGroups, racers, shiftX, shiftZ) {
    const dx = finite(shiftX);
    const dz = finite(shiftZ);
    if (!dx && !dz) return { shifted: false, checkpoints: 0, gates: 0, racers: 0, shiftX: 0, shiftZ: 0 };

    let checkpoints = 0;
    if (course && Array.isArray(course.checkpoints)) {
      for (const checkpoint of course.checkpoints) {
        if (!checkpoint) continue;
        checkpoint.x = finite(checkpoint.x) - dx;
        checkpoint.z = finite(checkpoint.z) - dz;
        checkpoints += 1;
      }
    }

    let gates = 0;
    for (const group of Array.isArray(gateGroups) ? gateGroups : []) {
      if (!group || !group.position) continue;
      group.position.x = finite(group.position.x) - dx;
      group.position.z = finite(group.position.z) - dz;
      gates += 1;
    }

    let racerCount = 0;
    for (const entry of Array.isArray(racers) ? racers : []) {
      if (!entry) continue;
      const agent = entry.agent;
      if (agent) {
        agent.x = finite(agent.x) - dx;
        agent.z = finite(agent.z) - dz;
      }
      const visual = entry.visual;
      if (visual && visual.position) {
        visual.position.x = finite(visual.position.x) - dx;
        visual.position.z = finite(visual.position.z) - dz;
      }
      if (agent || (visual && visual.position)) racerCount += 1;
    }

    return { shifted: true, checkpoints, gates, racers: racerCount, shiftX: dx, shiftZ: dz };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VERSION, shiftRaceLocalFrame };
  }

  if (typeof window === 'undefined' || typeof updateJetSki !== 'function') return;
  const Manager = root.JETSKI_RACE_MANAGER;
  const Ocean = root.V093_IRREGULAR_INFINITE_OCEAN;
  if (!Manager || !Ocean || !Ocean.worldOffset) return;

  let lastOffsetX = finite(Ocean.worldOffset.x);
  let lastOffsetZ = finite(Ocean.worldOffset.y);
  const state = {
    shiftEvents: 0,
    accumulatedShiftX: 0,
    accumulatedShiftZ: 0,
    lastShift: null
  };

  function liveGateGroups() {
    if (typeof scene === 'undefined' || !scene || typeof scene.getObjectByName !== 'function') return [];
    const group = scene.getObjectByName('V0115RaceCourse');
    return group && Array.isArray(group.children) ? group.children : [];
  }

  function liveRacers() {
    const runtime = root.JETSKI_RACE_AI;
    return runtime && Array.isArray(runtime.racers) ? runtime.racers : [];
  }

  function syncFromOceanOffset() {
    const currentX = finite(Ocean.worldOffset.x);
    const currentZ = finite(Ocean.worldOffset.y);
    const shiftX = currentX - lastOffsetX;
    const shiftZ = currentZ - lastOffsetZ;
    if (!shiftX && !shiftZ) return null;

    const result = shiftRaceLocalFrame(Manager.course, liveGateGroups(), liveRacers(), shiftX, shiftZ);
    lastOffsetX = currentX;
    lastOffsetZ = currentZ;
    state.shiftEvents += 1;
    state.accumulatedShiftX += shiftX;
    state.accumulatedShiftZ += shiftZ;
    state.lastShift = result;

    try {
      root.dispatchEvent(new CustomEvent('jetski:race-origin-shift', { detail: result }));
    } catch (_) {}
    return result;
  }

  const previousUpdateJetSki = updateJetSki;
  updateJetSki = function v01116RaceOriginSync(dt, t) {
    // Catch a recenter from an earlier frame before Race Manager evaluates checkpoints.
    syncFromOceanOffset();
    previousUpdateJetSki(dt, t);
    // If V0.9.3 recenters inside this frame, align race-local state immediately. The
    // existing Race Manager consumes the corrected target on the following frame.
    syncFromOceanOffset();
  };

  root.JETSKI_RACE_ORIGIN_SYNC = {
    version: VERSION,
    state,
    shiftRaceLocalFrame,
    syncFromOceanOffset,
    observesExistingFloatingOrigin: true,
    oceanAuthorityUntouched: true,
    checkpointRulesUntouched: true,
    physicsUntouched: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
