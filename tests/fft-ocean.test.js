const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const context = { console, Math, Float64Array, Int32Array, globalThis: null };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname + '/../src/fft-ocean.js', 'utf8'), context);

assert.strictEqual(typeof context.createFFTOceanVisualModel, 'function');
assert.throws(() => context.createFFTOceanVisualModel({ size: 48 }), /power of two/);

const model = context.createFFTOceanVisualModel({ size: 32, patchSize: 96, seed: 7, detailHsShare: 0.4 });
const profile = { significantWaveHeight: 1.2, peakPeriod: 6.8, meanDirectionDeg: 210 };
model.update(0, profile);
model.update(1.25, profile);

assert(Number.isFinite(model.rms) && model.rms > 0, 'RMS must be finite and positive');
const sample = model.sample(12.3, -4.8);
for (const key of ['height', 'slopeX', 'slopeZ', 'curvature']) {
  assert(Number.isFinite(sample[key]), `${key} must be finite`);
}

const a = model.sample(4.2, 8.1);
const b = model.sample(100.2, 104.1);
assert(Math.abs(a.height - b.height) < 1e-8, 'FFT field should be periodic over patchSize');

const targetRms = profile.significantWaveHeight * 0.4 / 4;
assert(Math.abs(model.rms - targetRms) < 1e-8, `RMS should normalize to ${targetRms}, got ${model.rms}`);

model.update(2.5, { significantWaveHeight: 2.0, peakPeriod: 8.0, meanDirectionDeg: 180 });
const changed = model.sample(4.2, 8.1);
assert(Number.isFinite(changed.height));
assert(Math.abs(model.rms - 0.2) < 1e-8, `RMS should track changed Hs, got ${model.rms}`);
console.log('fft-ocean tests PASS', { rms: model.rms, sample: changed.height });
