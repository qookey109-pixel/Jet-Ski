const assert = require('assert');
const Core = require('../src/game/progression-core.js');

assert.equal(Core.VERSION, 'V0.11.6');
assert.equal(Core.EVENTS.length, 4);
const finalEvent = Core.getEvent('pacific-crown-final');
assert.equal(finalEvent.finale, true);
assert.equal(finalEvent.worldMode, 'open-sea');
assert.equal(finalEvent.seaState, 'rough');
assert.equal(finalEvent.laps, 3);

const finalCourse = Core.buildCourse(finalEvent);
assert.equal(finalCourse.finale, true);
assert.equal(finalCourse.checkpoints.length, 8);
assert(finalCourse.checkpoints.every(cp => Number.isFinite(cp.x) && Number.isFinite(cp.z)));

let profile = Core.createProfile();
const finishes = [
  ['open-sea-circuit', 90000, 1],
  ['waikiki-offshore', 100000, 2],
  ['qixingtan-bluewater', 110000, 1]
];
for (const [eventId, elapsedMs, placement] of finishes) {
  profile = Core.recordResult(profile, { eventId, elapsedMs, placement, finished: true }).profile;
}
assert.equal(Core.isUnlocked(profile, 'pacific-crown-final'), true);
assert.equal(Core.campaignComplete(profile), false);
assert.equal(Core.championshipTier(profile), 'QUALIFYING');
assert.equal(Core.totalStars(profile), 8);

let result = Core.recordResult(profile, {
  eventId: 'pacific-crown-final', elapsedMs: 145000, placement: 2, finished: true
});
profile = result.profile;
assert.equal(result.newBest, true);
assert.equal(result.starsEarned, 2);
assert.equal(Core.campaignComplete(profile), true);
assert.equal(Core.totalStars(profile), 10);
assert.equal(Core.championshipTier(profile), 'GOLD');

result = Core.recordResult(profile, {
  eventId: 'pacific-crown-final', elapsedMs: 139000, placement: 1, finished: true
});
profile = result.profile;
assert.equal(result.newBest, true);
assert.equal(Core.totalStars(profile), 11);
assert.equal(Core.championshipTier(profile), 'PACIFIC CROWN');
assert.equal(profile.bestTimes['pacific-crown-final'], 139000);

for (let i = 0; i < 20000; i++) {
  const p = Core.sanitizeProfile({
    unlocked: Core.EVENTS.map(e => e.id),
    stars: {
      'open-sea-circuit': i % 4,
      'waikiki-offshore': (i + 1) % 4,
      'qixingtan-bluewater': (i + 2) % 4,
      'pacific-crown-final': (i + 3) % 4
    },
    completions: { 'pacific-crown-final': i % 3 ? 1 : 0 }
  });
  const stars = Core.totalStars(p);
  assert(Number.isFinite(stars));
  assert(stars >= 0 && stars <= 12);
  assert(['QUALIFYING', 'BRONZE', 'SILVER', 'GOLD', 'PACIFIC CROWN'].includes(Core.championshipTier(p)));
}

console.log('V0.11.6 championship regression PASS');
