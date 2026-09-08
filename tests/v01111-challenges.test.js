const assert = require('assert');
const Core = require('../src/game/challenge-core.js');

assert.equal(Core.VERSION, 'V0.11.11');
assert.equal(Core.CHALLENGES.length, 8);
assert.equal(new Set(Core.CHALLENGES.map(item => item.id)).size, 8);
assert.equal(Core.completedCount(Core.createProfile()), 0);
assert.equal(Core.complete(Core.createProfile()), false);
assert.equal(Core.nextIncomplete(Core.createProfile()).id, 'first-finish');

const sanitized = Core.sanitizeProfile({
  completed: { 'first-finish': true, bogus: true, podium: true },
  completedOrder: ['podium', 'podium', 'bogus', 'first-finish']
});
assert.deepEqual(sanitized.completed, { 'first-finish': true, podium: true });
assert.deepEqual(sanitized.completedOrder, ['podium', 'first-finish']);

assert.equal(Core.qualifies('pure-water', { finished: true, boostObserved: false, boostActivations: 0 }), false);
assert.equal(Core.qualifies('pure-water', { finished: true, boostObserved: true, boostActivations: 0 }), true);
assert.equal(Core.qualifies('pb-breaker', { finished: true, previousBestMs: 60000, elapsedMs: 61000 }), false);
assert.equal(Core.qualifies('pb-breaker', { finished: true, previousBestMs: 60000, elapsedMs: 59000 }), true);
assert.equal(Core.qualifies('unknown', { finished: true }), false);

let profile = Core.createProfile();
let result = Core.recordRun(profile, {
  eventId: 'open-sea-circuit', finished: false, placement: 1,
  boostObserved: true, boostActivations: 0, elapsedMs: 50000,
  previousBestMs: 60000, completedEvents: 4, totalStars: 12
});
assert.equal(result.newlyCompleted.length, 0);

result = Core.recordRun(profile, {
  eventId: 'open-sea-circuit', finished: true, placement: 3,
  boostObserved: true, boostActivations: 1, elapsedMs: 70000,
  previousBestMs: 0, completedEvents: 1, totalStars: 1
});
profile = result.profile;
assert.deepEqual(result.newlyCompleted, ['first-finish']);
assert.equal(result.medals, 1);

result = Core.recordRun(profile, {
  eventId: 'waikiki-offshore', finished: true, placement: 2,
  boostObserved: true, boostActivations: 0, elapsedMs: 68000,
  previousBestMs: 0, completedEvents: 2, totalStars: 3
});
profile = result.profile;
assert(result.newlyCompleted.includes('podium'));
assert(result.newlyCompleted.includes('pure-water'));
assert(!result.newlyCompleted.includes('victory'));

result = Core.recordRun(profile, {
  eventId: 'qixingtan-bluewater', finished: true, placement: 1,
  boostObserved: true, boostActivations: 2, elapsedMs: 59000,
  previousBestMs: 61000, completedEvents: 3, totalStars: 8
});
profile = result.profile;
assert(result.newlyCompleted.includes('victory'));
assert(result.newlyCompleted.includes('pb-breaker'));

result = Core.recordRun(profile, {
  eventId: 'pacific-crown-final', finished: true, placement: 1,
  boostObserved: true, boostActivations: 3, elapsedMs: 85000,
  previousBestMs: 0, completedEvents: 4, totalStars: 12
});
profile = result.profile;
assert(result.newlyCompleted.includes('full-tour'));
assert(result.newlyCompleted.includes('perfect-stars'));
assert(result.newlyCompleted.includes('crown-victory'));
assert.equal(Core.completedCount(profile), 8);
assert.equal(Core.complete(profile), true);
assert.equal(Core.nextIncomplete(profile), null);

const fixedCount = Core.completedCount(profile);
for (let i = 0; i < 20000; i++) {
  const snapshot = {
    eventId: i % 7 === 0 ? 'pacific-crown-final' : 'open-sea-circuit',
    finished: i % 3 !== 0,
    placement: (i % 4) + 1,
    boostObserved: i % 11 !== 0,
    boostActivations: i % 5,
    elapsedMs: 50000 + (i % 10000),
    previousBestMs: 54000 + (i % 3000),
    completedEvents: i % 6,
    totalStars: i % 15
  };
  const next = Core.recordRun(profile, snapshot);
  assert(next.medals >= fixedCount);
  assert(next.medals <= Core.CHALLENGES.length);
  assert.equal(new Set(next.profile.completedOrder).size, next.profile.completedOrder.length);
  profile = next.profile;
}

assert.equal(Core.completedCount(profile), 8);
assert.equal(Core.complete(profile), true);
console.log('V0.11.11 challenge board regression PASS');
