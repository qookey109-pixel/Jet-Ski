const assert = require('assert');
const Quality = require('../src/rendering/quality-core.js');

assert.equal(Quality.VERSION, 'V0.11.4');
assert.equal(Quality.normalizeMode('banana'), 'auto');
assert.equal(Quality.effectivePreset('auto', 'medium'), 'medium');

let budget = Quality.buildBudget('ultra', 'high', 2, 1, false, null);
assert.equal(budget.level, 'ultra');
assert.equal(budget.effectivePixelRatio, 2);
assert.equal(budget.reflectionSize, 512);
assert.equal(budget.shadows, true);

budget = Quality.buildBudget('ultra', 'high', 3, 1, true, null);
assert.equal(budget.effectivePixelRatio, 1.15);
assert.equal(budget.reflectionSize, 256);
assert.equal(budget.safariHardCap, 1.15);
assert.equal(budget.safariReflectionHardCap, 256);

budget = Quality.buildBudget('high', 'high', 2, 0.7, false, false);
assert(Math.abs(budget.effectivePixelRatio - 1.05) < 1e-9);
assert.equal(budget.shadows, false);

let timers = { badSeconds: 0, goodSeconds: 0 };
let level = 'high';
for (let i = 0; i < 6; i++) {
  const result = Quality.nextAutoLevel(level, { fps: 36, p95Ms: 29, longFrames: 30 }, timers, 1);
  level = result.level;
  timers = result.timers;
}
assert.equal(level, 'medium');

for (let i = 0; i < 13; i++) {
  const result = Quality.nextAutoLevel(level, { fps: 60, p95Ms: 15, longFrames: 1 }, timers, 1);
  level = result.level;
  timers = result.timers;
}
assert.equal(level, 'high');

for (let i = 0; i < 20000; i++) {
  const fps = 35 + (Math.sin(i * 0.011) + 1) * 15;
  const p95 = 14 + (Math.cos(i * 0.017) + 1) * 8;
  const result = Quality.nextAutoLevel(level, { fps, p95Ms: p95, longFrames: i % 33 }, timers, 1 / 60);
  level = result.level;
  timers = result.timers;
  assert(Quality.PRESETS[level]);
  const b = Quality.buildBudget('auto', level, 2, 0.85, i % 2 === 0, null);
  assert(Number.isFinite(b.effectivePixelRatio));
  assert(b.effectivePixelRatio > 0);
  assert(b.reflectionSize >= 192 && b.reflectionSize <= 512);
}

console.log('V0.11.4 quality core regression PASS');
