const assert = require('assert');
const Islands = require('../src/rendering/tropical-island-core.js');

assert.equal(Islands.VERSION, 'V0.11.16-T2');
assert.equal(Islands.visualOnly, true);
assert.equal(Islands.collisionAdded, false);
assert.equal(Islands.physicsUntouched, true);
assert.equal(Islands.gameplayUntouched, true);
assert.equal(Islands.courseMutation, false);

assert.equal(Islands.distancePointToSegment(5, 4, 0, 0, 10, 0), 4);
assert.equal(Islands.distancePointToSegment(-3, 4, 0, 0, 10, 0), 5);

const course = {
  checkpoints: [
    { x: 0, z: 0 },
    { x: 0, z: -200 },
    { x: 220, z: -200 },
    { x: 220, z: 0 }
  ]
};
const snapshot = JSON.stringify(course);
const first = Islands.deriveIslandPlacements(course, { maxIslands: 4 });
const second = Islands.deriveIslandPlacements(course, { maxIslands: 4 });

assert(first.length >= 3, 'expected several tropical islands around the open-sea course');
assert(first.length <= Islands.DEFAULTS.maxIslandsDesktop, 'desktop island budget exceeded');
assert.deepEqual(first, second, 'island placement must be deterministic');
assert.equal(JSON.stringify(course), snapshot, 'visual island placement must not mutate race course');
assert(first.every(island => Number.isFinite(island.x) && Number.isFinite(island.z) && Number.isFinite(island.radius)));
assert(first.every(island => island.courseDistance >= Islands.DEFAULTS.minCourseClearance + island.radius * 0.35),
  'islands must stay outside the guarded course corridor');

const palms = Islands.palmSeeds(first[0], Islands.DEFAULTS.palmsDesktop);
assert.equal(palms.length, Islands.DEFAULTS.palmsDesktop);
assert(palms.every(palm => palm.scale >= 0.8 && palm.scale <= 1.1));
assert(palms.every(palm => Number.isFinite(palm.x) && Number.isFinite(palm.z) && Number.isFinite(palm.yaw)));

assert.equal(Islands.shouldShowForEvent({ id: 'open-sea-circuit', worldMode: 'open-sea' }, false), true);
assert.equal(Islands.shouldShowForEvent({ worldMode: 'open-sea' }, false), true);
assert.equal(Islands.shouldShowForEvent({ id: 'pacific-crown-final', worldMode: 'open-sea' }, false), false);
assert.equal(Islands.shouldShowForEvent({ id: 'open-sea-circuit', worldMode: 'open-sea' }, true), false);
assert.equal(Islands.shouldShowForEvent({ worldMode: 'hawaii-coast' }, false), false);

console.log('V0.11.16 Tropical Arcade T2 island core regression PASS');
