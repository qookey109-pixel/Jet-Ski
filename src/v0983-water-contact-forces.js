// V0.9.8.3 progressive water-contact forces for Voxel mode.
// Converts per-cell immersion / slamming diagnostics into bounded, continuous forward drag.
(function (root) {
  'use strict';

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function computeVoxelContactDecel(input) {
    input = input || {};
    const wetness = clamp(Number(input.wetness) || 0, 0, 1);
    const slamLoad = clamp(Number(input.slamLoad) || 0, 0, 1);
    const speedRatio = clamp(Number(input.speedRatio) || 0, 0, 1);
    const baseDrag = (0.55 + 2.35 * speedRatio * speedRatio) * Math.pow(wetness, 1.25);
    const slamDrag = 4.2 * slamLoad * (0.30 + 0.70 * speedRatio);
    return clamp(baseDrag + slamDrag, 0, 6.8);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { computeVoxelContactDecel };
  }

  if (typeof window === 'undefined') return;
  const hydro = root.JETSKI_PHYSICS && root.JETSKI_PHYSICS.hydroModel;
  if (!hydro || typeof root.updateJetSki !== 'function') return;

  const previousUpdateJetSki = root.updateJetSki;
  const state = {
    contactFrames: 0,
    slamFrames: 0,
    accumulatedSpeedLoss: 0,
    lastDecel: 0,
    lastSlamLoad: 0
  };

  root.updateJetSki = function v0983WaterContactForces(dt, t) {
    previousUpdateJetSki(dt, t);
    if (hydro.mode !== 'voxel' || root.airborne || root.input.brake || !Number.isFinite(root.speed) || root.speed <= 0) {
      state.lastDecel = 0;
      state.lastSlamLoad = 0;
      return;
    }

    const d = typeof hydro.diagnostics === 'function' ? hydro.diagnostics() : null;
    if (!d) return;
    const speedRatio = clamp(root.speed / root.physics.maxSpeed, 0, 1);
    const decel = computeVoxelContactDecel({ wetness: d.wetness, slamLoad: d.slamLoad, speedRatio });
    if (decel <= 0) return;

    const safeDt = clamp(dt || 0, 0, 1 / 20);
    const loss = Math.min(root.speed, decel * safeDt);
    root.speed = Math.max(0, root.speed - loss);
    state.contactFrames += 1;
    if ((d.slamLoad || 0) > 0.08) state.slamFrames += 1;
    state.accumulatedSpeedLoss += loss;
    state.lastDecel = decel;
    state.lastSlamLoad = d.slamLoad || 0;
  };

  root.V0983_WATER_CONTACT_FORCES = {
    version: 'V0.9.8.3',
    state,
    computeVoxelContactDecel,
    maxContactDecel: 6.8,
    voxelOnly: true,
    brakeAuthorityPreserved: true,
    shorelineCollisionAuthorityPreserved: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
