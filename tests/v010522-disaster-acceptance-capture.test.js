const assert = require('assert');
const capture = require('../src/v010522-disaster-acceptance-capture.js');

assert.equal(capture.VERSION, 'V0.10.5.2.2');
assert.equal(capture.inferStage({}), 'BASELINE');
assert.equal(capture.inferStage({ rogue: {} }), 'ROGUE');
assert.equal(capture.inferStage({ tsunami: {} }), 'TSUNAMI');

const baselineSamples = Array.from({ length: 32 }, (_, i) => ({
  cpuEventMatch: true,
  shaderPatchInstalled: false,
  waterEventActive: false,
  sampledEventHeight: 0,
  craftAboveSurface: Math.sin(i) * 0.03,
  hydroMode: 'nine-point-plus',
  fps: 58 + Math.sin(i) * 2,
  p95Ms: 18 + (i % 3),
  longFrames: 1
}));
const baseline = capture.summarizeCapture(baselineSamples, 'BASELINE');
assert.equal(baseline.sampleCount, 32);
assert.equal(baseline.cpuSyncPass, true);
assert.equal(baseline.visualSyncPass, true);
assert(capture.evaluateCapture(baseline, null).gate === 'PASS');

const rogueSamples = Array.from({ length: 32 }, (_, i) => ({
  cpuEventMatch: true,
  shaderPatchInstalled: true,
  waterEventActive: true,
  sampledEventHeight: Math.sin(i * 0.2) * 5.5,
  craftAboveSurface: 0.14 + Math.sin(i * 0.1) * 0.08,
  hydroMode: 'nine-point-plus',
  fps: 50 + Math.sin(i) * 2,
  p95Ms: 22 + (i % 4),
  longFrames: 3
}));
const rogue = capture.summarizeCapture(rogueSamples, 'ROGUE');
assert(rogue.eventPeakM > 5);
assert.equal(capture.evaluateCapture(rogue, baseline).gate, 'PASS');

const brokenVisual = rogueSamples.map(sample => ({ ...sample, shaderPatchInstalled: false }));
const broken = capture.summarizeCapture(brokenVisual, 'ROGUE');
const brokenGate = capture.evaluateCapture(broken, baseline);
assert.equal(broken.visualSyncPass, false);
assert.equal(brokenGate.gate, 'REVIEW');
assert(brokenGate.reasons.includes('visual-sync'));

const slowSamples = rogueSamples.map(sample => ({ ...sample, fps: 20, p95Ms: 80, longFrames: 12 }));
const slow = capture.summarizeCapture(slowSamples, 'ROGUE');
const slowGate = capture.evaluateCapture(slow, baseline);
assert.equal(slowGate.gate, 'REVIEW');
assert(slowGate.reasons.includes('fps-regression'));
assert(slowGate.reasons.includes('p95-regression'));
assert(slowGate.reasons.includes('long-frame-regression'));

for (let i = 0; i < 20000; i++) {
  const event = Math.sin(i * 0.013) * 9;
  const samples = [{
    cpuEventMatch: true,
    shaderPatchInstalled: true,
    waterEventActive: true,
    sampledEventHeight: event,
    craftAboveSurface: Math.cos(i * 0.017) * 0.2,
    hydroMode: 'nine-point-plus',
    fps: 55,
    p95Ms: 20,
    longFrames: 1
  }];
  const summary = capture.summarizeCapture(samples, 'ROGUE');
  assert(Number.isFinite(summary.eventPeakM));
  assert(Number.isFinite(summary.craftClearanceMinM));
  assert(Number.isFinite(summary.craftClearanceMaxM));
}

const receipt = capture.formatReceipt([
  { summary: baseline, gate: 'PASS', reasons: [] },
  { summary: rogue, gate: 'PASS', reasons: [] }
]);
assert(receipt.includes('BASELINE: PASS'));
assert(receipt.includes('ROGUE: PASS'));
console.log('V0.10.5.2.2 disaster acceptance capture regression PASS');
