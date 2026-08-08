// V0.7 directional spectral ocean foundation.
// Compact deterministic JONSWAP-like components approximate a directional
// sea spectrum in real time without running a full CFD solver in the browser.
(function () {
  const DEG = Math.PI / 180;
  const TWO_PI = Math.PI * 2;

  function normalizeWeights(values) {
    const total = values.reduce((sum, value) => sum + value, 0) || 1;
    return values.map(value => value / total);
  }

  function jonswapShape(ratio, gamma) {
    const r = Math.max(0.2, ratio);
    const sigma = r <= 1 ? 0.07 : 0.09;
    const peak = Math.exp(-Math.pow(r - 1, 2) / (2 * sigma * sigma));
    return Math.pow(r, -5) * Math.exp(-1.25 * Math.pow(r, -4)) * Math.pow(gamma, peak);
  }

  window.createSpectralOceanModel = function createSpectralOceanModel(config) {
    const gravity = config.gravity || 9.81;
    const ratios = config.frequencyRatios || [0.62, 0.76, 0.88, 0.97, 1.05, 1.17, 1.34, 1.58];
    const offsets = config.directionOffsets || [-0.82, 0.48, -0.28, 0.05, 0.73, -0.55, 0.31, -0.12];
    const phases = config.phases || [0.21, 1.76, 3.34, 5.13, 2.55, 4.42, 0.96, 5.87];
    const gamma = config.jonswapGamma || 3.3;
    const weights = normalizeWeights(ratios.map(ratio => jonswapShape(ratio, gamma)));
    const sqrtWeights = weights.map(Math.sqrt);
    const amplitudeFactor = 1 / (2 * Math.sqrt(2));

    const cache = {
      hs: NaN,
      tp: NaN,
      direction: NaN,
      spread: NaN,
      currentSpeed: NaN,
      currentDirection: NaN,
      stokesScale: NaN,
      amplitude: new Float64Array(ratios.length),
      omega: new Float64Array(ratios.length),
      k: new Float64Array(ratios.length),
      dirX: new Float64Array(ratios.length),
      dirZ: new Float64Array(ratios.length),
      currentX: 0,
      currentZ: 0,
      derivedStokesX: 0,
      derivedStokesZ: 0,
      stokesX: 0,
      stokesZ: 0
    };

    function updateCache(profile) {
      const hs = Math.max(0.03, profile.significantWaveHeight || 0.6);
      const tp = Math.max(1.2, profile.peakPeriod || 5.5);
      const direction = profile.meanDirectionDeg || 0;
      const spread = profile.directionalSpreadDeg || 25;
      const currentSpeed = Math.max(0, profile.currentSpeed || 0);
      const currentDirection = profile.currentDirectionDeg || 0;
      const stokesScale = profile.stokesDriftScale == null ? 1 : profile.stokesDriftScale;

      const spectrumChanged = !Number.isFinite(cache.hs)
        || Math.abs(hs - cache.hs) > 1e-4
        || Math.abs(tp - cache.tp) > 1e-4
        || Math.abs(direction - cache.direction) > 1e-4
        || Math.abs(spread - cache.spread) > 1e-4
        || Math.abs(stokesScale - cache.stokesScale) > 1e-4;

      if (spectrumChanged) {
        cache.hs = hs;
        cache.tp = tp;
        cache.direction = direction;
        cache.spread = spread;
        cache.stokesScale = stokesScale;
        cache.derivedStokesX = 0;
        cache.derivedStokesZ = 0;

        for (let i = 0; i < ratios.length; i++) {
          const frequency = ratios[i] / tp;
          const omega = TWO_PI * frequency;
          const k = (omega * omega) / gravity; // deep-water dispersion: omega^2 = g k
          const angle = (direction + offsets[i] * spread) * DEG;
          const dirX = Math.sin(angle);
          const dirZ = Math.cos(angle);
          const amplitude = hs * amplitudeFactor * sqrtWeights[i];
          cache.omega[i] = omega;
          cache.k[i] = k;
          cache.dirX[i] = dirX;
          cache.dirZ[i] = dirZ;
          cache.amplitude[i] = amplitude;

          const stokes = omega * k * amplitude * amplitude * stokesScale;
          cache.derivedStokesX += stokes * dirX;
          cache.derivedStokesZ += stokes * dirZ;
        }
      }

      // When a real data source publishes Stokes drift vector components
      // (e.g. Copernicus VSDX/VSDY), use those directly. Otherwise fall back
      // to the spectrum-derived approximation from V0.6.
      cache.stokesX = Number.isFinite(profile.stokesDriftX)
        ? profile.stokesDriftX
        : cache.derivedStokesX;
      cache.stokesZ = Number.isFinite(profile.stokesDriftZ)
        ? profile.stokesDriftZ
        : cache.derivedStokesZ;

      if (!Number.isFinite(cache.currentSpeed)
          || Math.abs(currentSpeed - cache.currentSpeed) > 1e-4
          || Math.abs(currentDirection - cache.currentDirection) > 1e-4) {
        cache.currentSpeed = currentSpeed;
        cache.currentDirection = currentDirection;
        const currentAngle = currentDirection * DEG;
        cache.currentX = Math.sin(currentAngle) * currentSpeed;
        cache.currentZ = Math.cos(currentAngle) * currentSpeed;
      }
    }

    function getHeight(x, z, t, profile) {
      updateCache(profile);
      let height = config.baseHeight || 0;
      for (let i = 0; i < ratios.length; i++) {
        const phase = cache.k[i] * (cache.dirX[i] * x + cache.dirZ[i] * z)
          - cache.omega[i] * t + phases[i];
        height += cache.amplitude[i] * Math.cos(phase);
      }
      return height;
    }

    function sample(x, z, t, profile) {
      updateCache(profile);
      let height = config.baseHeight || 0;
      let slopeX = 0;
      let slopeZ = 0;
      let orbitalX = 0;
      let orbitalZ = 0;
      let orbitalY = 0;

      for (let i = 0; i < ratios.length; i++) {
        const phase = cache.k[i] * (cache.dirX[i] * x + cache.dirZ[i] * z)
          - cache.omega[i] * t + phases[i];
        const cos = Math.cos(phase);
        const sin = Math.sin(phase);
        const amplitude = cache.amplitude[i];
        const ak = amplitude * cache.k[i];

        height += amplitude * cos;
        slopeX += -ak * sin * cache.dirX[i];
        slopeZ += -ak * sin * cache.dirZ[i];

        // Linear deep-water orbital velocity at the free surface.
        const horizontalOrbital = amplitude * cache.omega[i] * cos;
        orbitalX += horizontalOrbital * cache.dirX[i];
        orbitalZ += horizontalOrbital * cache.dirZ[i];
        orbitalY += amplitude * cache.omega[i] * sin;
      }

      const orbitalScale = config.orbitalVelocityInfluence == null ? 0.16 : config.orbitalVelocityInfluence;
      return {
        height,
        slopeX,
        slopeZ,
        orbitalY,
        currentX: cache.currentX,
        currentZ: cache.currentZ,
        stokesX: cache.stokesX,
        stokesZ: cache.stokesZ,
        waterVelocityX: cache.currentX + cache.stokesX + orbitalX * orbitalScale,
        waterVelocityZ: cache.currentZ + cache.stokesZ + orbitalZ * orbitalScale
      };
    }

    return {
      getHeight,
      sample,
      componentCount: ratios.length,
      modelName: 'Directional JONSWAP-like spectrum'
    };
  };
})();
