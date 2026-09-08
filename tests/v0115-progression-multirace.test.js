const assert = require('assert');
const Race = require('../src/game/race-course.js');
const Progress = require('../src/game/progression-core.js');

assert.equal(Race.COURSE_DEFINITIONS.length, 3);
assert.equal(Race.COURSE_DEFINITIONS[0].id, 'open-sea-circuit');
assert.equal(Race.COURSE_DEFINITIONS[1].worldMode, 'hawaii-coast');
assert.equal(Race.COURSE_DEFINITIONS[2].worldMode, 'taiwan-coast');

const origin = { x: 125, z: -88 };
const yaw = Math.PI / 3;
for (const def of [Race.WAIKIKI_PACIFIC_RUN, Race.QIXINGTAN_OCEAN_RUN]) {
  const course = Race.materializeCourse(def, origin, yaw);
  assert.equal(course.id, def.id);
  assert.equal(course.checkpoints.length, 8);
  assert.equal(course.checkpoints[0].x, origin.x);
  assert.equal(course.checkpoints[0].z, origin.z);
  for (const cp of course.checkpoints) {
    assert(Number.isFinite(cp.x));
    assert(Number.isFinite(cp.z));
  }
  const state = Race.createRaceState(course);
  Race.beginRace(state, 0);
  let now = 1000;
  for (let lap = 0; lap < course.laps; lap++) {
    for (let cp = 1; cp < course.checkpoints.length; cp++) {
      assert.equal(Race.passCheckpoint(state, cp, now, course).accepted, true);
      now += 1000;
    }
    assert.equal(Race.passCheckpoint(state, 0, now, course).accepted, true);
    now += 1000;
  }
  assert.equal(state.finished, true);
}

let p = Progress.createProgress(Race.COURSE_DEFINITIONS);
assert.equal(p.unlockedCount, 1);
assert.equal(Progress.isUnlocked(p, Race.OPEN_SEA_CIRCUIT), true);
assert.equal(Progress.isUnlocked(p, Race.WAIKIKI_PACIFIC_RUN), false);

let result = Progress.recordFinish(p, Race.OPEN_SEA_CIRCUIT, 120000, Race.COURSE_DEFINITIONS);
p = result.progress;
assert.equal(result.personalBest, true);
assert.equal(result.unlockedId, 'waikiki-pacific-run');
assert.equal(p.unlockedCount, 2);
assert.equal(p.personalBests['open-sea-circuit'], 120000);

result = Progress.recordFinish(p, Race.OPEN_SEA_CIRCUIT, 130000, Race.COURSE_DEFINITIONS);
p = result.progress;
assert.equal(result.personalBest, false);
assert.equal(p.personalBests['open-sea-circuit'], 120000);

result = Progress.recordFinish(p, Race.WAIKIKI_PACIFIC_RUN, 150000, Race.COURSE_DEFINITIONS);
p = result.progress;
assert.equal(result.unlockedId, 'qixingtan-ocean-run');
assert.equal(p.unlockedCount, 3);
assert.equal(Progress.isUnlocked(p, Race.QIXINGTAN_OCEAN_RUN), true);

for (let i = 0; i < 20000; i++) {
  const def = Race.COURSE_DEFINITIONS[i % Race.COURSE_DEFINITIONS.length];
  const course = Race.materializeCourse(def, { x: Math.sin(i) * 500, z: Math.cos(i) * 500 }, i * 0.001);
  const cp = course.checkpoints[i % course.checkpoints.length];
  assert(Number.isFinite(cp.x));
  assert(Number.isFinite(cp.z));
}

console.log('V0.11.5 progression + multi-race regression PASS');
