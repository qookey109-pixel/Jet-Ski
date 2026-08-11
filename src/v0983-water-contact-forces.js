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

  function landingImpactFromVerticalSpeed(verticalSpeed) {
    return clamp(((Number(verticalSpeed) || 0) - 1.5) / 5.5, 0, 1);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { computeVoxelContactDecel, landingImpactFromVerticalSpeed };
  }

  if (typeof window === 'undefined') return;
  const hydro = root.JETSKI_PHYSICS && root.JETSKI_PHYSICS.hydroModel;
  if (!hydro || typeof updateJetSki !== 'function') return;

  const previousUpdateJetSki = updateJetSki;
  const state = {
    contactFrames: 0,
    slamFrames: 0,
    landingEvents: 0,
    landingImpact: 0,
    accumulatedSpeedLoss: 0,
    lastDecel: 0,
    lastSlamLoad: 0
  };

  updateJetSki = function v0983WaterContactForces(dt, t) {
    const wasAirborne = airborne;
    const preLandingVerticalSpeed = Math.abs(verticalVelocity);
    previousUpdateJetSki(dt, t);

    const safeDt = clamp(dt || 0, 0, 1 / 20);
    if (hydro.mode === 'voxel' && wasAirborne && !airborne) {
      state.landingImpact = Math.max(state.landingImpact, landingImpactFromVerticalSpeed(preLandingVerticalSpeed));
      state.landingEvents += 1;
    } else {
      state.landingImpact *= Math.exp(-8.5 * safeDt);
      if (state.landingImpact < 0.001) state.landingImpact = 0;
    }

    if (hydro.mode !== 'voxel' || airborne || input.brake || !Number.isFinite(speed) || speed <= 0) {
      state.lastDecel = 0;
      state.lastSlamLoad = state.landingImpact;
      return;
    }

    const d = typeof hydro.diagnostics === 'function' ? hydro.diagnostics() : null;
    if (!d) return;
    const speedRatio = clamp(speed / physics.maxSpeed, 0, 1);
    const effectiveSlam = Math.max(clamp(d.slamLoad || 0, 0, 1), state.landingImpact);
    const decel = computeVoxelContactDecel({ wetness: d.wetness, slamLoad: effectiveSlam, speedRatio });
    if (decel <= 0) return;

    const loss = Math.min(speed, decel * safeDt);
    speed = Math.max(0, speed - loss);
    state.contactFrames += 1;
    if (effectiveSlam > 0.08) state.slamFrames += 1;
    state.accumulatedSpeedLoss += loss;
    state.lastDecel = decel;
    state.lastSlamLoad = effectiveSlam;
  };

  root.V0983_WATER_CONTACT_FORCES = {
    version: 'V0.9.8.3',
    state,
    computeVoxelContactDecel,
    landingImpactFromVerticalSpeed,
    maxContactDecel: 6.8,
    landingImpactReleasePerSecond: 8.5,
    voxelOnly: true,
    brakeAuthorityPreserved: true,
    shorelineCollisionAuthorityPreserved: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
