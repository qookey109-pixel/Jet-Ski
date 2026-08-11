// V0.9.8.2 Voxel marine smoothing.
// Loaded after V0.9.3 but before coastline collision runtimes, so it can soften
// water/landing impulses without weakening intentional shoreline collision stops.
(function () {
  'use strict';

  const hydro = window.JETSKI_PHYSICS && window.JETSKI_PHYSICS.hydroModel;
  if (!hydro || typeof updateJetSki !== 'function') return;

  const previousUpdateJetSki = updateJetSki;
  const state = {
    landingSoftened: 0,
    decelLimited: 0,
    lastLandingAt: -Infinity,
    lastDecelLimitAt: -Infinity
  };

  const maxVoxelLandingLoss = 0.055; // Keep impact feedback, remove the 9–18% speed cliff.
  const maxPassiveVoxelDecel = 9.5;  // m/s²; braking and shoreline collision remain uncapped.

  function voxelActive() {
    return hydro.mode === 'voxel';
  }

  updateJetSki = function v0982SmoothVoxelDynamics(dt, t) {
    const active = voxelActive();
    const wasAirborne = airborne;
    const speedBefore = speed;

    previousUpdateJetSki(dt, t);
    if (!active || !Number.isFinite(speedBefore) || speedBefore <= 0) return;

    const landedThisFrame = wasAirborne && !airborne;

    // The original arcade landing path removes 9% or 18% speed instantly, then V0.6 can
    // add more slamming loss. With giant waves that feels like hitting an invisible object.
    // Voxel mode caps only that one-frame water-impact cliff; it does not erase the impact.
    if (landedThisFrame && !input.brake) {
      const landingFloor = speedBefore * (1 - maxVoxelLandingLoss);
      if (speed < landingFloor) {
        speed = landingFloor;
        state.landingSoftened += 1;
        state.lastLandingAt = t;
      }
      return;
    }

    // Giant-wave slope drag can also make a single frame lose too much speed. Limit only
    // passive water deceleration here. Brake input, reverse logic, and later coast collisions
    // still retain their own full authority.
    if (!airborne && !input.brake) {
      const safeDt = Math.min(Math.max(dt || 0, 0), 1 / 20);
      const passiveFloor = Math.max(0, speedBefore - maxPassiveVoxelDecel * safeDt);
      if (speed < passiveFloor) {
        speed = passiveFloor;
        state.decelLimited += 1;
        state.lastDecelLimitAt = t;
      }
    }
  };

  window.V0982_MARINE_SMOOTHING = {
    version: 'V0.9.8.2',
    state,
    maxVoxelLandingLoss,
    maxPassiveVoxelDecel,
    voxelOnly: true,
    coastlineCollisionAuthorityPreserved: true
  };
})();
