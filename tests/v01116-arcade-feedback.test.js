const assert = require('assert');
const Feedback = require('../src/rendering/arcade-feedback-core.js');

assert.equal(Feedback.VERSION, 'V0.11.16-T4');
assert.equal(Feedback.visualOnly, true);
assert.equal(Feedback.physicsUntouched, true);
assert.equal(Feedback.gameplayUntouched, true);
assert.equal(Feedback.raceRulesUntouched, true);
assert.equal(Feedback.boostAuthorityUntouched, true);
assert.equal(Feedback.cameraUntouched, true);

const base = { phase: 'racing', lap: 1, totalLaps: 3, nextCheckpointIndex: 1, finished: false };

assert.deepEqual(
  Feedback.detectRaceFeedback({ phase: 'countdown', lap: 1, totalLaps: 3, nextCheckpointIndex: 1 }, base),
  { type: 'go', lap: 1, totalLaps: 3 }
);

assert.deepEqual(
  Feedback.detectRaceFeedback(base, { phase: 'racing', lap: 1, totalLaps: 3, nextCheckpointIndex: 2 }),
  { type: 'checkpoint', checkpointIndex: 1, lap: 1, totalLaps: 3 }
);

assert.deepEqual(
  Feedback.detectRaceFeedback(
    { phase: 'racing', lap: 1, totalLaps: 3, nextCheckpointIndex: 0 },
    { phase: 'racing', lap: 2, totalLaps: 3, nextCheckpointIndex: 1 }
  ),
  { type: 'lap', lap: 2, totalLaps: 3, checkpointIndex: 0 }
);

assert.deepEqual(
  Feedback.detectRaceFeedback(
    { phase: 'racing', lap: 2, totalLaps: 3, nextCheckpointIndex: 0 },
    { phase: 'racing', lap: 3, totalLaps: 3, nextCheckpointIndex: 1 }
  ),
  { type: 'final-lap', lap: 3, totalLaps: 3, checkpointIndex: 0 }
);

assert.deepEqual(
  Feedback.detectRaceFeedback(
    { phase: 'racing', lap: 3, totalLaps: 3, nextCheckpointIndex: 0 },
    { phase: 'finished', lap: 3, totalLaps: 3, nextCheckpointIndex: 0, finished: true }
  ),
  { type: 'finish', lap: 3, totalLaps: 3, checkpointIndex: 0 }
);

assert.equal(Feedback.detectRaceFeedback(base, base), null);
assert.equal(Feedback.boostActivated(2, 3), true);
assert.equal(Feedback.boostActivated(3, 3), false);
assert.equal(Feedback.labelFor({ type: 'checkpoint' }), 'CHECKPOINT');
assert.equal(Feedback.labelFor({ type: 'final-lap' }), 'FINAL LAP');
assert.equal(Feedback.labelFor({ type: 'finish' }), 'FINISH!');
assert(Feedback.intensityFor('finish') > Feedback.intensityFor('checkpoint'));

console.log('V0.11.16 Tropical Arcade T4 feedback core regression PASS');
