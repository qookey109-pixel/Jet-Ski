const assert = require('assert');
const Core = require('../src/game/progression-core.js');

assert.equal(Core.VERSION, 'V0.11.5');
assert.equal(Core.EVENTS.length, 3);
assert.equal(Core.EVENTS[0].id, 'open-sea-circuit');
assert.equal(Core.EVENTS[1].worldMode, 'hawaii-coast');
assert.equal(Core.EVENTS[2].worldMode, 'taiwan-coast');

const open = Core.buildCourse('open-sea-circuit');
assert.equal(open.checkpoints.length, 8);
assert.equal(open.checkpoints[0].x, 0);
assert.equal(open.checkpoints[0].z, 82);

const anchor = { x: 100, z: -50 };
const north = Core.buildCourse('waikiki-offshore', anchor, 0);
assert.equal(north.checkpoints[0].x, anchor.x);
assert.equal(north.checkpoints[0].z, anchor.z);
assert(north.checkpoints.slice(1).every(cp => cp.z >= anchor.z - 1e-9));

const east = Core.buildCourse('qixingtan-bluewater', anchor, Math.PI / 2);
assert(east.checkpoints.slice(1).every(cp => cp.x >= anchor.x - 1e-9));

let profile = Core.createProfile();
assert.equal(Core.isUnlocked(profile, 'open-sea-circuit'), true);
assert.equal(Core.isUnlocked(profile, 'waikiki-offshore'), false);

let recorded = Core.recordResult(profile, {
  eventId: 'open-sea-circuit', elapsedMs: 91000, placement: 2, finished: true
});
profile = recorded.profile;
assert.equal(recorded.unlockedEventId, 'waikiki-offshore');
assert.equal(recorded.newBest, true);
assert.equal(recorded.starsEarned, 2);
assert.equal(profile.bestTimes['open-sea-circuit'], 91000);
assert.equal(profile.stars['open-sea-circuit'], 2);
assert.equal(Core.isUnlocked(profile, 'waikiki-offshore'), true);

recorded = Core.recordResult(profile, {
  eventId: 'open-sea-circuit', elapsedMs: 95000, placement: 1, finished: true
});
profile = recorded.profile;
assert.equal(recorded.newBest, false);
assert.equal(profile.bestTimes['open-sea-circuit'], 91000);
assert.equal(profile.stars['open-sea-circuit'], 3);

recorded = Core.recordResult(profile, {
  eventId: 'waikiki-offshore', elapsedMs: 103000, placement: 3, finished: true
});
profile = recorded.profile;
assert.equal(recorded.unlockedEventId, 'qixingtan-bluewater');
assert.equal(Core.nextEventId(profile, 'waikiki-offshore'), 'qixingtan-bluewater');

recorded = Core.recordResult(profile, {
  eventId: 'qixingtan-bluewater', elapsedMs: 111000, placement: 1, finished: true
});
profile = recorded.profile;
assert.equal(Core.campaignComplete(profile), true);
assert.equal(profile.totalFinishes, 4);

for (let i = 0; i < 20000; i++) {
  const heading = (i * 0.017) % (Math.PI * 2) - Math.PI;
  const a = { x: Math.sin(i * 0.013) * 10000, z: Math.cos(i * 0.011) * 10000 };
  const event = i % 2 ? Core.EVENTS[1] : Core.EVENTS[2];
  const course = Core.buildCourse(event, a, heading);
  const fx = Math.sin(heading), fz = Math.cos(heading);
  for (const cp of course.checkpoints) {
    assert(Number.isFinite(cp.x));
    assert(Number.isFinite(cp.z));
    const forwardDot = (cp.x - a.x) * fx + (cp.z - a.z) * fz;
    assert(forwardDot >= -1e-7);
  }
}

console.log('V0.11.5 progression regression PASS');
