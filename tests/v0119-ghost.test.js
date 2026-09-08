const assert = require('assert');
const Ghost = require('../src/game/ghost-core.js');

assert.equal(Ghost.VERSION, 'V0.11.9');
assert.equal(Ghost.DEFAULT_SAMPLE_INTERVAL_MS, 80);
assert.equal(Ghost.MAX_SAMPLES, 5000);

const course = {
  checkpoints: [
    { x: 100, z: -40 },
    { x: 180, z: 40 }
  ]
};
const frame = Ghost.courseFrame(course);
assert(Number.isFinite(frame.heading));

const original = { x: 164.5, z: 33.25, yaw: 2.7 };
const local = Ghost.worldToCourse(original, frame);
const restored = Ghost.courseToWorld({ right: local.right, forward: local.forward, relativeYaw: Ghost.wrapAngle(original.yaw - frame.heading) }, frame);
assert(Math.abs(restored.x - original.x) < 1e-9);
assert(Math.abs(restored.z - original.z) < 1e-9);
assert(Math.abs(Ghost.wrapAngle(restored.yaw - original.yaw)) < 1e-9);

assert(Ghost.wrapAngle(Math.PI + 0.2) < 0);
assert(Ghost.wrapAngle(-Math.PI - 0.2) > 0);

const state = { lap: 1, nextCheckpointIndex: 2 };
const sampleA = Ghost.captureSample(1000, original, state, frame);
const sampleB = Ghost.captureSample(1080, { x: 166.5, z: 35.25, yaw: -3.05 }, state, frame);
assert(Ghost.validSample(sampleA));
assert(Ghost.validSample(sampleB));

const recording = Ghost.createRecording('waikiki-offshore');
assert(Ghost.appendSample(recording, sampleA));
assert(Ghost.appendSample(recording, sampleB));
assert.equal(Ghost.appendSample(recording, sampleB), false, 'duplicate/non-increasing timestamps must be rejected');
const finished = Ghost.finishRecording(recording, 50000);
assert(finished);
assert.equal(finished.eventId, 'waikiki-offshore');
assert.equal(finished.timeMs, 50000);
assert.equal(finished.samples.length, 2);

const midpoint = Ghost.interpolateSample(finished.samples, 1040);
assert(midpoint);
assert(midpoint.right > Math.min(sampleA[1], sampleB[1]) - 1e-9);
assert(midpoint.right < Math.max(sampleA[1], sampleB[1]) + 1e-9);
assert(Number.isFinite(midpoint.relativeYaw));
assert(Math.abs(midpoint.relativeYaw) <= Math.PI);

const nearest = Ghost.nearestProgressTime(finished.samples, { right: sampleB[1], forward: sampleB[2] }, 1, 2);
assert.equal(nearest, 1080);
assert.equal(Ghost.nearestProgressTime(finished.samples, { right: 0, forward: 0 }, 2, 2), null);

assert.equal(Ghost.shouldReplaceGhost(null, 55000, null), true, 'first valid run should create a ghost when no PB exists');
assert.equal(Ghost.shouldReplaceGhost(null, 55000, 50000), false, 'slower than an existing PB must not become PB ghost');
assert.equal(Ghost.shouldReplaceGhost({ timeMs: 52000 }, 51000, 53000), true);
assert.equal(Ghost.shouldReplaceGhost({ timeMs: 50000 }, 51000, 52000), false);
assert.equal(Ghost.shouldReplaceGhost(null, 0, null), false);

const dirty = {
  eventId: 'open-sea-circuit',
  timeMs: 60000,
  sampleIntervalMs: 1,
  samples: [
    [200, 2, 3, 0.1, 1, 2],
    ['bad'],
    [100, 1, 2, 0.0, 1, 1]
  ]
};
const sanitized = Ghost.sanitizeGhost(dirty, 'open-sea-circuit');
assert(sanitized);
assert.equal(sanitized.sampleIntervalMs, 40);
assert.equal(sanitized.samples.length, 2);
assert.equal(sanitized.samples[0][0], 100);
assert.equal(Ghost.sanitizeGhost(dirty, 'wrong-event'), null);

// 20k rotating coast-frame round trips and interpolation inputs stay finite.
for (let i = 0; i < 20000; i++) {
  const heading = Ghost.wrapAngle(i * 0.017 - Math.PI);
  const f = { x: Math.sin(i * 0.003) * 400, z: Math.cos(i * 0.005) * 400, heading };
  const point = { right: Math.sin(i * 0.011) * 120, forward: (i % 350) + 5, relativeYaw: Ghost.wrapAngle(i * 0.023) };
  const world = Ghost.courseToWorld(point, f);
  const back = Ghost.worldToCourse(world, f);
  assert(Number.isFinite(world.x) && Number.isFinite(world.z) && Number.isFinite(world.yaw));
  assert(Math.abs(back.right - point.right) < 1e-7);
  assert(Math.abs(back.forward - point.forward) < 1e-7);
}

console.log('V0.11.9 PB ghost regression PASS');
