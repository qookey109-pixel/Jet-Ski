const assert = require('assert');
const guided = require('../src/v010523-guided-disaster-acceptance.js');

assert.equal(guided.VERSION, 'V0.10.5.2.3');
assert.deepEqual(guided.REQUIRED_STAGES, ['BASELINE', 'ROGUE', 'TSUNAMI', 'LIGHTNING', 'RAIN']);

function record(label, gate = 'PASS') {
  return {
    gate,
    reasons: gate === 'PASS' ? [] : ['test-review'],
    summary: {
      label,
      sampleCount: 32,
      cpuSyncPass: true,
      visualSyncPass: true,
      eventPeakM: label === 'BASELINE' ? 0 : 4,
      craftClearanceMinM: -0.1,
      craftClearanceMaxM: 0.2,
      fpsAvg: 55,
      p95MaxMs: 20,
      longFramesMax: 2,
      hydroMode: 'nine-point-plus'
    }
  };
}

const records = guided.REQUIRED_STAGES.map(label => record(label));
const observations = { ROGUE: true, TSUNAMI: true, LIGHTNING: true, RAIN: true };
const pass = guided.evaluateGuidedAcceptance(records, observations);
assert.equal(pass.gate, 'PASS');
assert.deepEqual(pass.reasons, []);

const missing = guided.evaluateGuidedAcceptance(records.filter(r => r.summary.label !== 'TSUNAMI'), observations);
assert.equal(missing.gate, 'REVIEW');
assert(missing.reasons.includes('missing-tsunami'));

const reviewed = records.map(r => r.summary.label === 'ROGUE' ? record('ROGUE', 'REVIEW') : r);
const reviewedGate = guided.evaluateGuidedAcceptance(reviewed, observations);
assert.equal(reviewedGate.gate, 'REVIEW');
assert(reviewedGate.reasons.includes('capture-rogue-review'));

const visualReview = guided.evaluateGuidedAcceptance(records, { ...observations, LIGHTNING: false });
assert.equal(visualReview.gate, 'REVIEW');
assert(visualReview.reasons.includes('visual-lightning-unconfirmed'));

const unconfirmed = guided.evaluateGuidedAcceptance(records, {});
assert.equal(unconfirmed.gate, 'REVIEW');
for (const label of guided.VISUAL_STAGES) {
  assert(unconfirmed.reasons.includes(`visual-${label.toLowerCase()}-unconfirmed`));
}

const duplicate = records.concat([record('ROGUE', 'REVIEW')]);
assert.equal(guided.latestRecordFor(duplicate, 'ROGUE').gate, 'REVIEW');

const receipt = guided.formatGuidedReceipt('BASE RECEIPT', records, observations);
assert(receipt.includes('GUIDED: PASS'));
assert(receipt.includes('ROGUE=PASS'));
assert(receipt.includes('TSUNAMI=PASS'));
assert(receipt.includes('formal repository acceptance still requires the user'));

for (let i = 0; i < 20000; i++) {
  const obs = {
    ROGUE: true,
    TSUNAMI: true,
    LIGHTNING: true,
    RAIN: (i % 17) !== 0
  };
  const result = guided.evaluateGuidedAcceptance(records, obs);
  assert(result.gate === (obs.RAIN ? 'PASS' : 'REVIEW'));
  assert(Array.isArray(result.reasons));
}

console.log('V0.10.5.2.3 guided disaster acceptance regression PASS');
