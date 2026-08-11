const assert = require('assert');
const { createFastIrregularHeightSampler, COMPONENTS } = require('../src/v0982-fast-ocean-sampler.js');

const G = 9.81;
const PI = Math.PI;
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function referenceHeight(localX, localZ, t, sea, offset) {
  const x = localX + offset.x;
  const z = localZ + offset.y;
  const hs = Number.isFinite(sea.significantWaveHeight) ? sea.significantWaveHeight : 0.85;
  const tp = Number.isFinite(sea.peakPeriod) ? sea.peakPeriod : 6.2;
  const rough = clamp(hs / 2.2, 0.04, 1.0);
  const directionRad = (Number(sea.meanDirectionDeg) || 0) * PI / 180;
  const baseX = Math.sin(directionRad);
  const baseZ = Math.cos(directionRad);
  const lambda0 = clamp((G * tp * tp / (2 * PI)) * 1.65, 50, 230);
  const visualAmp = Math.max(3.60, Math.min(10.50, hs * 4.60 + 2.40));
  const visualTime = t * 0.52;
  let height = 0;

  for (const c of COMPONENTS) {
    const wobble = c[7] * Math.sin(visualTime * c[8] + c[9]);
    const angle = c[0] + wobble;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const dx = baseX * ca - baseZ * sa;
    const dz = baseX * sa + baseZ * ca;
    const lambda = lambda0 * c[1];
    const ampMod = 1 + c[4] * Math.sin(visualTime * c[5] + c[6]);
    const amp = visualAmp * c[2] * ampMod;
    const k = 2 * PI / Math.max(lambda, 0.5);
    const omega = Math.sqrt(G * k);
    const phase = k * (x * dx + z * dz) - omega * visualTime + c[3];
    height += amp * Math.sin(phase);
  }

  if (height > 0) height *= 1 + 0.18 * rough;
  return height;
}

const sea = {
  significantWaveHeight: 0.85,
  peakPeriod: 6.2,
  meanDirectionDeg: 205
};
const offset = { x: 320, y: -160 };
const sampler = createFastIrregularHeightSampler({
  getSeaProfile: () => sea,
  getWorldOffset: () => offset
});

for (let ti = 0; ti < 12; ti++) {
  const t = 0.37 + ti * 1.113;
  for (let i = 0; i < 40; i++) {
    const x = -240 + i * 12.37;
    const z = 180 - i * 7.91;
    const expected = referenceHeight(x, z, t, sea, offset);
    const actual = sampler.getHeight(x, z, t);
    assert(Math.abs(actual - expected) < 1e-10, `height mismatch ${actual} vs ${expected}`);
  }
}

// All samples at one animation time share one prepared component set.
const before = sampler.prepareCount;
for (let i = 0; i < 200; i++) sampler.getHeight(i * 0.5, -i * 0.25, 99.5);
assert.strictEqual(sampler.prepareCount, before + 1);

// Sea-state changes at the same t must invalidate the cache.
sea.significantWaveHeight = 1.8;
sampler.getHeight(0, 0, 99.5);
assert.strictEqual(sampler.prepareCount, before + 2);

console.log('fast-ocean-sampler tests PASS');
