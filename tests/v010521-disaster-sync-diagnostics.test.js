const assert = require('assert');
const diagnostics = require('../src/v010521-disaster-sync-diagnostics.js');

assert.equal(diagnostics.VERSION, 'V0.10.5.2.1');

const idle = diagnostics.computeSyncDiagnostics({
  baseHeight: 1.25,
  totalHeight: 1.25,
  expectedEventHeight: 0,
  craftY: 1.43,
  floatClearance: 0.18
});
assert.equal(idle.sampledEventHeight, 0);
assert.equal(idle.eventHeightError, 0);
assert.equal(idle.cpuEventMatch, true);
assert(Math.abs(idle.craftAboveSurface) < 1e-12);

const tsunami = diagnostics.computeSyncDiagnostics({
  baseHeight: -0.8,
  totalHeight: 7.6,
  expectedEventHeight: 8.4,
  craftY: 7.9,
  floatClearance: 0.18
});
assert(Math.abs(tsunami.sampledEventHeight - 8.4) < 1e-12);
assert(Math.abs(tsunami.eventHeightError) < 1e-12);
assert.equal(tsunami.cpuEventMatch, true);
assert(Math.abs(tsunami.craftAboveSurface - 0.12) < 1e-12);

const mismatch = diagnostics.computeSyncDiagnostics({
  baseHeight: 0.2,
  totalHeight: 4.0,
  expectedEventHeight: 3.7,
  craftY: 4.1,
  floatClearance: 0.18
});
assert(Math.abs(mismatch.eventHeightError - 0.1) < 1e-12);
assert.equal(mismatch.cpuEventMatch, false);

for (let i = 0; i < 20000; i++) {
  const baseHeight = Math.sin(i * 0.037) * 4;
  const eventHeight = Math.cos(i * 0.021) * 10;
  const totalHeight = baseHeight + eventHeight;
  const craftY = totalHeight + 0.18 + Math.sin(i * 0.011) * 0.08;
  const result = diagnostics.computeSyncDiagnostics({
    baseHeight,
    totalHeight,
    expectedEventHeight: eventHeight,
    craftY,
    floatClearance: 0.18
  });
  assert(Number.isFinite(result.eventHeightError));
  assert(Number.isFinite(result.craftAboveSurface));
  assert(Math.abs(result.eventHeightError) < 1e-12);
  assert.equal(result.cpuEventMatch, true);
}

console.log('V0.10.5.2.1 disaster sync diagnostics regression PASS');
