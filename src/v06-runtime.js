// V0.6 realistic-water runtime overlay.
// Intentionally wraps the validated V0.5 gameplay loop instead of replacing it.
// After this script loads, the existing animation loop automatically uses the
// overridden global functions on the next frame.
(function () {
  const oceanConfig = GAME_CONFIG.ocean;
  const hydroConfig = GAME_CONFIG.hydrodynamics;
  const oceanModel = window.createSpectralOceanModel && oceanConfig
    ? window.createSpectralOceanModel(oceanConfig)
    : null;
  const hydroModel = window.createHydrodynamicsModel && hydroConfig && hydroConfig.enabled
    ? window.createHydrodynamicsModel(hydroConfig)
    : null;
  const waveStateEl = document.querySelector('#wave-state');

  // Extend V0.5's mutable seaProfile with physical sea-state variables. The
  // legacy transition function will then interpolate these numeric fields too.
  for (const [key, value] of Object.entries(targetSeaState)) {
    if (typeof value === 'number' && key !== 'color' && !(key in seaProfile)) {
      seaProfile[key] = value;
    }
  }

  const legacyGetWaveHeight = getWaveHeight;
  const legacyUpdateSeaTransition = updateSeaTransition;
  const legacyUpdateJetSki = updateJetSki;

  getWaveHeight = function v06GetWaveHeight(x, z, t) {
    if (oceanModel) return oceanModel.getHeight(x, z, t, seaProfile);
    return legacyGetWaveHeight(x, z, t);
  };

  function getOceanSample(x, z, t) {
    if (oceanModel) return oceanModel.sample(x, z, t, seaProfile);
    return {
      height: getWaveHeight(x, z, t),
      orbitalY: 0,
      waterVelocityX: 0,
      waterVelocityZ: 0
    };
  }

  updateSeaTransition = function v06UpdateSeaTransition(dt) {
    legacyUpdateSeaTransition(dt);
    if (waveStateEl && Number.isFinite(seaProfile.significantWaveHeight) && Number.isFinite(seaProfile.peakPeriod)) {
      waveStateEl.textContent = `Hs ${seaProfile.significantWaveHeight.toFixed(2)} m · Tp ${seaProfile.peakPeriod.toFixed(1)} s`;
    }
  };

  let lastHydroPose = null;

  updateJetSki = function v06UpdateJetSki(dt, t) {
    const wasAirborne = airborne;
    const preLandingVerticalSpeed = Math.abs(verticalVelocity);

    // Preserve V0.5 drive / steering / jump state transitions first.
    legacyUpdateJetSki(dt, t);

    if (!oceanModel) return;

    forward.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    right.set(forward.z, 0, -forward.x);
    const waterSample = getOceanSample(ski.position.x, ski.position.z, t);
    const speedRatio = THREE.MathUtils.clamp(speed / physics.maxSpeed, 0, 1);

    // Background current + Stokes drift + a small share of orbital velocity.
    if (!airborne) {
      const advectionScale = hydroConfig ? hydroConfig.currentAdvectionScale : 1;
      ski.position.x += waterSample.waterVelocityX * advectionScale * dt;
      ski.position.z += waterSample.waterVelocityZ * advectionScale * dt;
    }

    if (hydroModel) {
      // Nonlinear cross-flow damping adds a more plausible water-relative side force.
      if (!airborne) {
        lateralSlip -= hydroModel.lateralDamping(lateralSlip, speedRatio) * dt;
        lateralSlip = THREE.MathUtils.clamp(lateralSlip, -physics.slipMax, physics.slipMax);

        const accelerationPitch = -throttleValue * physics.throttlePitch * (1 - speedRatio * 0.45);
        const brakingPitch = input.brake ? physics.brakingPitch * (0.35 + speedRatio * 0.65) : 0;
        const slipLean = lateralSlip / physics.slipMax;
        const dynamicRoll = THREE.MathUtils.clamp(
          -steeringValue * speedRatio * physics.rollMax - slipLean * 0.10,
          -hydroConfig.maxRoll,
          hydroConfig.maxRoll
        );

        lastHydroPose = hydroModel.updateSurfacePose({
          dt,
          position: ski.position,
          forward,
          right,
          speedRatio,
          dynamicPitch: accelerationPitch + brakingPitch,
          dynamicRoll,
          surfaceAt: (x, z) => getWaveHeight(x, z, t),
          floatClearance: physics.floatClearance
        });
        ski.position.y = lastHydroPose.y;
        ski.rotation.x = lastHydroPose.pitch;
        ski.rotation.z = lastHydroPose.roll;
      } else {
        hydroModel.syncPose(ski.position.y, ski.rotation.x, ski.rotation.z);
      }

      // V0.5 already applies its landing loss. Add only the extra slamming term
      // above the hard-landing threshold so the validated base loss is retained.
      if (wasAirborne && !airborne && preLandingVerticalSpeed > physics.landingVerticalThreshold) {
        const baseLoss = physics.hardLandingSpeedLoss;
        const calibratedLoss = hydroModel.getLandingLoss(
          preLandingVerticalSpeed,
          physics.landingSpeedLoss,
          physics.hardLandingSpeedLoss,
          physics.landingVerticalThreshold
        );
        const extraLoss = THREE.MathUtils.clamp(calibratedLoss - baseLoss, 0, 0.35);
        speed *= (1 - extraLoss);
        hydroModel.syncPose(ski.position.y, ski.rotation.x, ski.rotation.z);
      }
    }

    // Vertical orbital water motion contributes a small encounter-drag term.
    if (!airborne && speed > 0) {
      const encounterDrag = Math.abs(waterSample.orbitalY)
        * 0.22 * seaProfile.speedInfluence * speedRatio;
      speed = Math.max(0, speed - encounterDrag * dt);
    }
  };

  window.JETSKI_PHYSICS = {
    oceanModel,
    hydroModel,
    seaProfile,
    surrogate: window.PHYSICS_SURROGATE || null,
    get lastHydroPose() { return lastHydroPose; }
  };
})();
