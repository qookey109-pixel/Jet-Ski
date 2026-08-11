// V0.9.8.2 fast gameplay height sampler for the V0.9.3 irregular ocean.
// Keeps the exact 12-band height equation, but prepares direction/wavenumber/amplitude
// once per animation time instead of rebuilding them for every 24-cell buoyancy sample.
(function (root) {
  'use strict';

  const G = 9.81;
  const PI = Math.PI;
  const COMPONENTS = [
    [ 0.00, 1.00, 0.330, 0.31, 0.10, 0.018, 1.2, 0.03, 0.011, 0.4],
    [ 0.34, 0.78, 0.180, 2.17, 0.16, 0.024, 2.5, 0.04, 0.013, 1.1],
    [-0.52, 0.64, 0.120, 4.88, 0.18, 0.031, 0.8, 0.05, 0.017, 2.2],
    [ 0.91, 0.50, 0.080, 1.03, 0.20, 0.027, 3.1, 0.04, 0.019, 0.7],
    [-1.14, 0.39, 0.060, 5.46, 0.22, 0.035, 1.7, 0.06, 0.021, 2.9],
    [ 1.42, 0.31, 0.045, 3.21, 0.24, 0.041, 2.2, 0.07, 0.023, 1.4],
    [-1.61, 0.26, 0.035, 0.74, 0.25, 0.047, 3.8, 0.08, 0.029, 0.2],
    [ 0.18, 1.31, 0.055, 4.12, 0.12, 0.015, 0.3, 0.03, 0.009, 2.0],
    [-0.27, 0.91, 0.045, 2.85, 0.14, 0.020, 2.8, 0.04, 0.012, 3.0],
    [ 2.11, 0.58, 0.030, 5.93, 0.20, 0.038, 1.5, 0.05, 0.026, 0.9],
    [-2.28, 0.44, 0.022, 1.61, 0.22, 0.044, 3.4, 0.06, 0.031, 2.6],
    [ 0.66, 0.35, 0.018, 3.96, 0.24, 0.052, 0.9, 0.08, 0.037, 1.8]
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createFastIrregularHeightSampler(options) {
    options = options || {};
    const getSeaProfile = options.getSeaProfile;
    const getWorldOffset = options.getWorldOffset;
    if (typeof getSeaProfile !== 'function' || typeof getWorldOffset !== 'function') {
      throw new Error('Fast irregular sampler requires getSeaProfile/getWorldOffset');
    }

    // kx/kz already include wavenumber, so a hot sample only needs 12 dot products + sin().
    const kx = new Float64Array(COMPONENTS.length);
    const kz = new Float64Array(COMPONENTS.length);
    const amp = new Float64Array(COMPONENTS.length);
    const phaseBase = new Float64Array(COMPONENTS.length);

    let cachedT = NaN;
    let cachedHs = NaN;
    let cachedTp = NaN;
    let cachedDirection = NaN;
    let crestFactor = 1;
    let prepareCount = 0;
    let sampleCount = 0;

    function prepare(t) {
      const sea = getSeaProfile() || {};
      const hs = Number.isFinite(sea.significantWaveHeight) ? sea.significantWaveHeight : 0.85;
      const tp = Number.isFinite(sea.peakPeriod) ? sea.peakPeriod : 6.2;
      const directionDeg = Number(sea.meanDirectionDeg) || 0;

      if (t === cachedT && hs === cachedHs && tp === cachedTp && directionDeg === cachedDirection) return;
      cachedT = t;
      cachedHs = hs;
      cachedTp = tp;
      cachedDirection = directionDeg;
      prepareCount += 1;

      const rough = clamp(hs / 2.2, 0.04, 1.0);
      crestFactor = 1 + 0.18 * rough;
      const directionRad = directionDeg * PI / 180;
      const baseX = Math.sin(directionRad);
      const baseZ = Math.cos(directionRad);
      const lambda0 = clamp((G * tp * tp / (2 * PI)) * 1.65, 50, 230);
      const visualAmp = Math.max(3.60, Math.min(10.50, hs * 4.60 + 2.40));
      const visualTime = t * 0.52;

      for (let i = 0; i < COMPONENTS.length; i++) {
        const c = COMPONENTS[i];
        const angle = c[0] + c[7] * Math.sin(visualTime * c[8] + c[9]);
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        const dx = baseX * ca - baseZ * sa;
        const dz = baseX * sa + baseZ * ca;
        const lambda = lambda0 * c[1];
        const k = 2 * PI / Math.max(lambda, 0.5);
        const omega = Math.sqrt(G * k);
        const ampMod = 1 + c[4] * Math.sin(visualTime * c[5] + c[6]);

        kx[i] = k * dx;
        kz[i] = k * dz;
        amp[i] = visualAmp * c[2] * ampMod;
        phaseBase[i] = -omega * visualTime + c[3];
      }
    }

    function getHeight(localX, localZ, t) {
      prepare(t);
      const offset = getWorldOffset() || { x: 0, y: 0 };
      const x = localX + (Number(offset.x) || 0);
      const z = localZ + (Number(offset.y) || 0);
      let height = 0;
      for (let i = 0; i < COMPONENTS.length; i++) {
        height += amp[i] * Math.sin(x * kx[i] + z * kz[i] + phaseBase[i]);
      }
      sampleCount += 1;
      return height > 0 ? height * crestFactor : height;
    }

    return {
      getHeight,
      prepare,
      componentCount: COMPONENTS.length,
      get prepareCount() { return prepareCount; },
      get sampleCount() { return sampleCount; }
    };
  }

  root.createFastIrregularHeightSampler = createFastIrregularHeightSampler;

  // Browser install: V0.9.3 remains the source of truth for world offset and GPU shader;
  // this replaces only the hot gameplay height-only path.
  if (typeof window !== 'undefined'
      && window.V093_IRREGULAR_INFINITE_OCEAN
      && typeof getWaveHeight === 'function'
      && typeof seaProfile !== 'undefined') {
    const previousGetWaveHeight = getWaveHeight;
    const sampler = createFastIrregularHeightSampler({
      getSeaProfile: () => seaProfile,
      getWorldOffset: () => window.V093_IRREGULAR_INFINITE_OCEAN.worldOffset
    });

    getWaveHeight = function v0982FastWaveHeight(x, z, t) {
      const height = sampler.getHeight(x, z, t);
      return Number.isFinite(height) ? height : previousGetWaveHeight(x, z, t);
    };

    window.V0982_FAST_OCEAN_SAMPLER = {
      version: 'V0.9.8.2',
      exactV093HeightEquation: true,
      componentCount: COMPONENTS.length,
      sampler,
      previousGetWaveHeight
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createFastIrregularHeightSampler, COMPONENTS };
  }
})(typeof window !== 'undefined' ? window : globalThis);
