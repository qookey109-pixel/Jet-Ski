// V0.9.2.4 Giant Wave Surface Sync.
// Makes gameplay surface sampling use the same giant-wave equation as the active visual shader,
// then adds an anti-penetration guard so the swim ring cannot disappear through a rising crest.
(function () {
  'use strict';

  if (!window.THREE || !window.V0923_GIANT_WAVES || typeof seaProfile === 'undefined') return;

  const visualVersion = 'V0.9.2.4';
  const PI = Math.PI;
  const G = 9.81;
  const legacyGetWaveHeight = getWaveHeight;
  const legacyUpdateJetSki = updateJetSki;
  const voxelHardImmersionAllowanceM = 0.58;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rotate2(x, z, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return { x: c * x - s * z, z: s * x + c * z };
  }

  function addWave(out, x, z, dx, dz, lambda, amp, phase0, visualTime) {
    const k = 2 * PI / Math.max(lambda, 0.5);
    const omega = Math.sqrt(G * k);
    const phase = k * (x * dx + z * dz) - omega * visualTime + phase0;
    out.height += amp * Math.sin(phase);
    const gradientScale = amp * k * Math.cos(phase);
    out.gradX += dx * gradientScale;
    out.gradZ += dz * gradientScale;
  }

  function sampleGiantSurface(x, z, t) {
    const hs = Number.isFinite(seaProfile.significantWaveHeight)
      ? seaProfile.significantWaveHeight
      : 0.85;
    const tp = Number.isFinite(seaProfile.peakPeriod)
      ? seaProfile.peakPeriod
      : 6.2;
    const rough = THREE.MathUtils.clamp(hs / 2.2, 0.04, 1.0);
    const directionRad = THREE.MathUtils.degToRad(Number(seaProfile.meanDirectionDeg) || 0);
    const d0 = { x: Math.sin(directionRad), z: Math.cos(directionRad) };
    const d1 = rotate2(d0.x, d0.z, 0.42);
    const d2 = rotate2(d0.x, d0.z, -0.67);
    const d3 = rotate2(d0.x, d0.z, 1.08);

    const lambda0 = clamp((G * tp * tp / (2 * PI)) * 1.65, 50, 230);
    const visualAmp = Math.max(3.60, Math.min(10.50, hs * 4.60 + 2.40));
    const visualTime = t * 0.52;
    const out = { height: 0, gradX: 0, gradZ: 0, hs, tp, rough, lambda0, visualAmp };

    addWave(out, x, z, d0.x, d0.z, lambda0,        visualAmp * 0.72, 0.0, visualTime);
    addWave(out, x, z, d1.x, d1.z, lambda0 * 0.68, visualAmp * 0.16, 1.8, visualTime);
    addWave(out, x, z, d2.x, d2.z, lambda0 * 0.44, visualAmp * 0.055, 3.7, visualTime);
    addWave(out, x, z, d3.x, d3.z, lambda0 * 0.30, visualAmp * 0.018, 5.2, visualTime);

    if (out.height > 0) out.height *= 1 + 0.20 * rough;
    return out;
  }

  function contactGuard() {
    const hydro = window.JETSKI_PHYSICS && window.JETSKI_PHYSICS.hydroModel;
    const voxelWaterborne = Boolean(hydro && hydro.mode === 'voxel' && !airborne);
    return {
      hydro,
      voxelWaterborne,
      // Voxel buoyancy now owns normal water contact. The hard guard is moved much deeper
      // and is only a catastrophic escape hatch, not a per-wave contact solver.
      allowance: voxelWaterborne ? voxelHardImmersionAllowanceM : 0
    };
  }

  // From this point onward the gameplay surface and the giant visible surface share one equation.
  getWaveHeight = function v0924GetWaveHeight(x, z, t) {
    const sample = sampleGiantSurface(x, z, t);
    return Number.isFinite(sample.height) ? sample.height : legacyGetWaveHeight(x, z, t);
  };

  updateJetSki = function v0924UpdateJetSki(dt, t) {
    legacyUpdateJetSki(dt, t);

    // Deliberately call the active global sampler here. Later ocean overlays can replace
    // getWaveHeight() and this guard will automatically follow the new authoritative surface.
    const activeSurfaceHeight = getWaveHeight(ski.position.x, ski.position.z, t);
    const guard = contactGuard();
    const minimumY = activeSurfaceHeight + physics.floatClearance - guard.allowance;

    // 9-point preserves the original hard guard. Voxel can immerse naturally; position
    // snapping is reserved for genuinely catastrophic penetration only.
    if (ski.position.y < minimumY) {
      ski.position.y = minimumY;
      if (guard.voxelWaterborne && guard.hydro && typeof guard.hydro.syncPose === 'function') {
        guard.hydro.syncPose(ski.position.y, ski.rotation.x, ski.rotation.z);
      }
      if (airborne) {
        airborne = false;
        verticalVelocity = 0;
        landingCooldown = Math.max(landingCooldown, 0.18);
      }
    }

    if (airStateEl) airStateEl.textContent = airborne ? '騰空 AIR' : '水面 WATER';
  };

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = visualVersion;
  document.title = `Swim Ring Racing ${visualVersion}`;

  window.V0924_GIANT_SURFACE_SYNC = {
    version: visualVersion,
    sampleSurface: sampleGiantSurface,
    gameplaySurfaceSynced: true,
    antiPenetrationGuard: true,
    activeGuardUsesGlobalSampler: true,
    voxelImmersionAllowanceM: voxelHardImmersionAllowanceM,
    voxelHardGuardOnly: true,
    previousSurfaceSampler: legacyGetWaveHeight
  };
})();
