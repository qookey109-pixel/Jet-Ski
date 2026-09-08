const assert = require('assert');
const Cosmetics = require('../src/game/cosmetics-core.js');

assert.equal(Cosmetics.VERSION, 'V0.11.10');
assert.equal(Cosmetics.LIVERIES.length, 5);
assert.equal(Cosmetics.LIVERIES[0].requiredStars, 0);
assert.equal(Cosmetics.LIVERIES[Cosmetics.LIVERIES.length - 1].requiredStars, 11);

assert.equal(Cosmetics.safeStars(-1), 0);
assert.equal(Cosmetics.safeStars(99), 12);
assert.equal(Cosmetics.safeStars(6.9), 6);
assert.equal(Cosmetics.safeStars(null), 0);

assert.equal(Cosmetics.isUnlocked('sunset-orange', 0), true);
assert.equal(Cosmetics.isUnlocked('lagoon-cyan', 2), false);
assert.equal(Cosmetics.isUnlocked('lagoon-cyan', 3), true);
assert.equal(Cosmetics.isUnlocked('qixingtan-pearl', 6), true);
assert.equal(Cosmetics.isUnlocked('midnight-pacific', 8), false);
assert.equal(Cosmetics.isUnlocked('pacific-crown', 11), true);
assert.equal(Cosmetics.isUnlocked('missing', 12), false);

assert.deepEqual(Cosmetics.unlockedLiveries(0).map(x => x.id), ['sunset-orange']);
assert.deepEqual(Cosmetics.unlockedLiveries(5).map(x => x.id), ['sunset-orange', 'lagoon-cyan']);
assert.equal(Cosmetics.unlockedLiveries(12).length, 5);

assert.equal(Cosmetics.nextUnlock(0).id, 'lagoon-cyan');
assert.equal(Cosmetics.nextUnlock(3).id, 'qixingtan-pearl');
assert.equal(Cosmetics.nextUnlock(12), null);

assert.equal(Cosmetics.sanitizeSelection('lagoon-cyan', 3), 'lagoon-cyan');
assert.equal(Cosmetics.sanitizeSelection('pacific-crown', 10), 'sunset-orange');
assert.equal(Cosmetics.sanitizeSelection('corrupt-id', 12), 'sunset-orange');
assert.equal(Cosmetics.sanitizeSelection(null, 12), 'sunset-orange');

let state = Cosmetics.rewardState(0);
assert.equal(state.unlockedCount, 1);
assert.equal(state.nextUnlockId, 'lagoon-cyan');
assert.equal(state.starsToNext, 3);
assert.equal(state.complete, false);

state = Cosmetics.rewardState(10);
assert.equal(state.unlockedCount, 4);
assert.equal(state.nextUnlockId, 'pacific-crown');
assert.equal(state.starsToNext, 1);

state = Cosmetics.rewardState(11);
assert.equal(state.unlockedCount, 5);
assert.equal(state.complete, true);
assert.equal(state.starsToNext, 0);

for (const livery of Cosmetics.LIVERIES) {
  assert(Cosmetics.BY_ID[livery.id] === livery);
  assert(Number.isInteger(livery.requiredStars));
  assert(livery.requiredStars >= 0 && livery.requiredStars <= 12);
  for (const key of ['primary', 'accent', 'emissive']) {
    assert(Number.isInteger(livery[key]));
    assert(livery[key] >= 0 && livery[key] <= 0xffffff);
  }
}

for (let i = 0; i < 20000; i++) {
  const rawStars = Math.sin(i * 0.019) * 18 + 6;
  const reward = Cosmetics.rewardState(rawStars);
  assert(Number.isInteger(reward.totalStars));
  assert(reward.totalStars >= 0 && reward.totalStars <= 12);
  assert(reward.unlockedCount >= 1 && reward.unlockedCount <= Cosmetics.LIVERIES.length);
  assert(reward.starsToNext >= 0);
  const unlocked = Cosmetics.unlockedLiveries(rawStars);
  assert.equal(unlocked.length, reward.unlockedCount);
}

console.log('V0.11.10 cosmetics reward regression PASS');
