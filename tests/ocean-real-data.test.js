const assert = require('node:assert/strict');

global.window = global;
require('../src/ocean.js');

const model = global.createSpectralOceanModel({
  gravity: 9.81,
  baseHeight: 0,
  jonswapGamma: 3.3,
  orbitalVelocityInfluence: 0,
  frequencyRatios: [1],
  directionOffsets: [0],
  phases: [0]
});

const profile = {
  significantWaveHeight: 1,
  peakPeriod: 6,
  meanDirectionDeg: 180,
  directionalSpreadDeg: 1,
  currentSpeed: 0,
  currentDirectionDeg: 0,
  stokesDriftScale: 1,
  stokesDriftX: 0.12,
  stokesDriftZ: -0.04
};

const sample = model.sample(0, 0, 0, profile);
assert.ok(Math.abs(sample.stokesX - 0.12) < 1e-12);
assert.ok(Math.abs(sample.stokesZ + 0.04) < 1e-12);
assert.ok(Math.abs(sample.waterVelocityX - 0.12) < 1e-12);
assert.ok(Math.abs(sample.waterVelocityZ + 0.04) < 1e-12);

delete profile.stokesDriftX;
delete profile.stokesDriftZ;
const fallback = model.sample(0, 0, 0, profile);
assert.ok(Number.isFinite(fallback.stokesX));
assert.ok(Number.isFinite(fallback.stokesZ));

console.log('ocean real-data tests passed');
