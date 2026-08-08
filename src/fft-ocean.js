// V0.8 FFT Ocean Visual Foundation.
// Browser-safe CPU inverse FFT for a local visual ocean patch.
// The authoritative gameplay water remains the V0.7/V0.6 ocean model.
(function (global) {
  'use strict';

  const TWO_PI = Math.PI * 2;
  const SQRT_HALF = Math.SQRT1_2;

  function isPowerOfTwo(value) {
    return value > 1 && (value & (value - 1)) === 0;
  }

  function wrap01(value) {
    return value - Math.floor(value);
  }

  function seededGaussianPairs(count, seed) {
    let state = (seed >>> 0) || 0x6d2b79f5;
    function random() {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    const out = new Float64Array(count * 2);
    for (let i = 0; i < count; i += 2) {
      const u1 = Math.max(1e-9, random());
      const u2 = random();
      const radius = Math.sqrt(-2 * Math.log(u1));
      const angle = TWO_PI * u2;
      out[i * 2] = radius * Math.cos(angle);
      out[i * 2 + 1] = radius * Math.sin(angle);
      if (i + 1 < count) {
        out[(i + 1) * 2] = radius * Math.cos(angle + Math.PI * 0.5);
        out[(i + 1) * 2 + 1] = radius * Math.sin(angle + Math.PI * 0.5);
      }
    }
    return out;
  }

  function fft1D(real, imag, inverse) {
    const n = real.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        const tr = real[i]; real[i] = real[j]; real[j] = tr;
        const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
      }
    }

    for (let len = 2; len <= n; len <<= 1) {
      const angle = (inverse ? 2 : -2) * Math.PI / len;
      const wLenR = Math.cos(angle);
      const wLenI = Math.sin(angle);
      for (let i = 0; i < n; i += len) {
        let wr = 1;
        let wi = 0;
        for (let j = 0; j < len / 2; j++) {
          const uR = real[i + j];
          const uI = imag[i + j];
          const vR = real[i + j + len / 2] * wr - imag[i + j + len / 2] * wi;
          const vI = real[i + j + len / 2] * wi + imag[i + j + len / 2] * wr;
          real[i + j] = uR + vR;
          imag[i + j] = uI + vI;
          real[i + j + len / 2] = uR - vR;
          imag[i + j + len / 2] = uI - vI;
          const nextWr = wr * wLenR - wi * wLenI;
          wi = wr * wLenI + wi * wLenR;
          wr = nextWr;
        }
      }
    }

    if (inverse) {
      for (let i = 0; i < n; i++) {
        real[i] /= n;
        imag[i] /= n;
      }
    }
  }

  function ifft2D(real, imag, n, scratchR, scratchI) {
    for (let row = 0; row < n; row++) {
      const offset = row * n;
      for (let x = 0; x < n; x++) {
        scratchR[x] = real[offset + x];
        scratchI[x] = imag[offset + x];
      }
      fft1D(scratchR, scratchI, true);
      for (let x = 0; x < n; x++) {
        real[offset + x] = scratchR[x];
        imag[offset + x] = scratchI[x];
      }
    }

    for (let col = 0; col < n; col++) {
      for (let y = 0; y < n; y++) {
        const index = y * n + col;
        scratchR[y] = real[index];
        scratchI[y] = imag[index];
      }
      fft1D(scratchR, scratchI, true);
      for (let y = 0; y < n; y++) {
        const index = y * n + col;
        real[index] = scratchR[y];
        imag[index] = scratchI[y];
      }
    }
  }

  function jonswapShape(omega, peakOmega, gamma) {
    if (!(omega > 0) || !(peakOmega > 0)) return 0;
    const sigma = omega <= peakOmega ? 0.07 : 0.09;
    const r = omega / peakOmega;
    const peak = Math.exp(-Math.pow(r - 1, 2) / (2 * sigma * sigma));
    const pm = Math.pow(omega, -5) * Math.exp(-1.25 * Math.pow(peakOmega / omega, 4));
    return pm * Math.pow(gamma, peak);
  }

  global.createFFTOceanVisualModel = function createFFTOceanVisualModel(options) {
    const config = Object.assign({
      size: 64,
      patchSize: 112,
      gravity: 9.81,
      gamma: 3.3,
      seed: 109,
      detailHsShare: 0.42,
      shortWaveDamping: 0.11,
      directionPower: 4.0,
      backwardWaveFactor: 0.18
    }, options || {});

    const n = config.size | 0;
    if (!isPowerOfTwo(n)) throw new Error('FFT ocean grid size must be a power of two.');
    const count = n * n;
    const gaussian = seededGaussianPairs(count, config.seed);
    const real = new Float64Array(count);
    const imag = new Float64Array(count);
    const h0r = new Float64Array(count);
    const h0i = new Float64Array(count);
    const heights = new Float64Array(count);
    const slopesX = new Float64Array(count);
    const slopesZ = new Float64Array(count);
    const curvature = new Float64Array(count);
    const scratchR = new Float64Array(n);
    const scratchI = new Float64Array(n);
    const kx = new Float64Array(count);
    const kz = new Float64Array(count);
    const kLen = new Float64Array(count);
    const omega = new Float64Array(count);
    const baseIndexMirror = new Int32Array(count);
    const dx = config.patchSize / n;

    for (let y = 0; y < n; y++) {
      const kyIndex = y <= n / 2 ? y : y - n;
      for (let x = 0; x < n; x++) {
        const kxIndex = x <= n / 2 ? x : x - n;
        const i = y * n + x;
        const xk = TWO_PI * kxIndex / config.patchSize;
        const zk = TWO_PI * kyIndex / config.patchSize;
        const length = Math.hypot(xk, zk);
        kx[i] = xk;
        kz[i] = zk;
        kLen[i] = length;
        omega[i] = Math.sqrt(config.gravity * length);
        const mx = (n - x) % n;
        const my = (n - y) % n;
        baseIndexMirror[i] = my * n + mx;
      }
    }

    let lastProfileSignature = '';
    let lastTime = NaN;
    let lastRms = 0;

    function fillH0(profile) {
      const hs = Math.max(0.08, Number(profile.significantWaveHeight) || 0.85);
      const tp = Math.max(1.4, Number(profile.peakPeriod) || 6.2);
      const direction = (Number(profile.meanDirectionDeg) || 0) * Math.PI / 180;
      const peakOmega = TWO_PI / tp;
      const windX = Math.sin(direction);
      const windZ = Math.cos(direction);
      const gamma = Math.max(1, config.gamma);
      const targetRms = hs * config.detailHsShare / 4;

      let energy = 0;
      for (let i = 0; i < count; i++) {
        const k = kLen[i];
        if (!(k > 1e-6)) {
          h0r[i] = 0;
          h0i[i] = 0;
          continue;
        }
        const dirDot = (kx[i] * windX + kz[i] * windZ) / k;
        const directional = Math.pow(Math.abs(dirDot), config.directionPower)
          * (dirDot >= 0 ? 1 : config.backwardWaveFactor);
        const spectral = jonswapShape(omega[i], peakOmega, gamma);
        const damping = Math.exp(-Math.pow(k * config.shortWaveDamping, 2));
        const density = Math.max(0, spectral * directional * damping);
        const amplitude = Math.sqrt(density) * SQRT_HALF;
        const gr = gaussian[i * 2];
        const gi = gaussian[i * 2 + 1];
        h0r[i] = gr * amplitude;
        h0i[i] = gi * amplitude;
        energy += amplitude * amplitude * 2;
      }

      const expectedRms = Math.sqrt(Math.max(energy, 1e-18)) / count;
      const scale = targetRms / Math.max(expectedRms, 1e-9);
      for (let i = 0; i < count; i++) {
        h0r[i] *= scale;
        h0i[i] *= scale;
      }
      lastProfileSignature = `${hs.toFixed(3)}|${tp.toFixed(3)}|${direction.toFixed(4)}`;
    }

    function update(timeSeconds, profile) {
      const hs = Math.max(0.08, Number(profile.significantWaveHeight) || 0.85);
      const tp = Math.max(1.4, Number(profile.peakPeriod) || 6.2);
      const direction = (Number(profile.meanDirectionDeg) || 0) * Math.PI / 180;
      const signature = `${hs.toFixed(3)}|${tp.toFixed(3)}|${direction.toFixed(4)}`;
      if (signature !== lastProfileSignature) fillH0(profile);

      const t = Number.isFinite(timeSeconds) ? timeSeconds : 0;
      if (t === lastTime) return;
      lastTime = t;

      for (let i = 0; i < count; i++) {
        const mirror = baseIndexMirror[i];
        const wt = omega[i] * t;
        const c = Math.cos(wt);
        const s = Math.sin(wt);

        const ar = h0r[i];
        const ai = h0i[i];
        const br = h0r[mirror];
        const bi = -h0i[mirror];

        const firstR = ar * c - ai * s;
        const firstI = ar * s + ai * c;
        const secondR = br * c + bi * s;
        const secondI = -br * s + bi * c;
        real[i] = firstR + secondR;
        imag[i] = firstI + secondI;
      }

      ifft2D(real, imag, n, scratchR, scratchI);

      let sumSq = 0;
      for (let i = 0; i < count; i++) sumSq += real[i] * real[i];
      const rawRms = Math.sqrt(sumSq / count);
      const targetRms = hs * config.detailHsShare / 4;
      const normalization = targetRms / Math.max(rawRms, 1e-9);
      let normalizedSumSq = 0;
      for (let i = 0; i < count; i++) {
        const h = real[i] * normalization;
        heights[i] = h;
        normalizedSumSq += h * h;
      }
      lastRms = Math.sqrt(normalizedSumSq / count);

      const inv2dx = 1 / (2 * dx);
      const invDx2 = 1 / (dx * dx);
      for (let y = 0; y < n; y++) {
        const ym = (y - 1 + n) % n;
        const yp = (y + 1) % n;
        for (let x = 0; x < n; x++) {
          const xm = (x - 1 + n) % n;
          const xp = (x + 1) % n;
          const i = y * n + x;
          const left = heights[y * n + xm];
          const right = heights[y * n + xp];
          const down = heights[ym * n + x];
          const up = heights[yp * n + x];
          slopesX[i] = (right - left) * inv2dx;
          slopesZ[i] = (up - down) * inv2dx;
          curvature[i] = (left + right + down + up - 4 * heights[i]) * invDx2;
        }
      }
    }

    function bilerp(field, worldX, worldZ) {
      const u = wrap01(worldX / config.patchSize) * n;
      const v = wrap01(worldZ / config.patchSize) * n;
      const x0 = Math.floor(u) % n;
      const y0 = Math.floor(v) % n;
      const x1 = (x0 + 1) % n;
      const y1 = (y0 + 1) % n;
      const tx = u - Math.floor(u);
      const ty = v - Math.floor(v);
      const a = field[y0 * n + x0];
      const b = field[y0 * n + x1];
      const c = field[y1 * n + x0];
      const d = field[y1 * n + x1];
      return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
    }

    return {
      size: n,
      patchSize: config.patchSize,
      update,
      sample(worldX, worldZ) {
        return {
          height: bilerp(heights, worldX, worldZ),
          slopeX: bilerp(slopesX, worldX, worldZ),
          slopeZ: bilerp(slopesZ, worldX, worldZ),
          curvature: bilerp(curvature, worldX, worldZ)
        };
      },
      get heights() { return heights; },
      get slopesX() { return slopesX; },
      get slopesZ() { return slopesZ; },
      get curvature() { return curvature; },
      get rms() { return lastRms; },
      modelName: 'CPU 2D IFFT JONSWAP-Phillips hybrid detail spectrum'
    };
  };

  global.__FFT_OCEAN_TEST__ = { fft1D, ifft2D, jonswapShape };
})(typeof window !== 'undefined' ? window : globalThis);
