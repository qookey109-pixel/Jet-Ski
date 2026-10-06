const assert = require('assert');
const Core = require('../src/rendering/route-landmark-core.js');

assert.equal(Core.VERSION, 'V0.11.16-T14');
assert.equal(Core.visualOnly, true);
assert.equal(Core.collisionAdded, false);
assert.equal(Core.physicsUntouched, true);
assert.equal(Core.gameplayUntouched, true);
assert.equal(Core.raceRulesUntouched, true);
assert.equal(Core.checkpointAuthorityUntouched, true);
assert.equal(Core.cameraUntouched, true);
assert.equal(Core.courseMutation, false);

const course = {
  checkpoints: [
    {x:0,z:115},{x:70,z:94},{x:119,z:34},{x:106,z:-52},
    {x:29,z:-119},{x:-65,z:-106},{x:-121,z:-31},{x:-92,z:68}
  ]
};

const before = JSON.stringify(course);
const center = Core.courseCenter(course);
assert(Number.isFinite(center.x) && Number.isFinite(center.z));

const indices = Core.selectedIndices(8, 4);
assert.equal(indices.length, 4);
assert.equal(new Set(indices).size, 4);
assert(indices.every(i => i >= 0 && i < 8));

const seeds = Core.landmarkSeeds(course);
assert.equal(seeds.length, 4);
assert.equal(new Set(seeds.map(s => s.type)).size, 4);
assert(seeds.every(s => Number.isFinite(s.x) && Number.isFinite(s.z) && Number.isFinite(s.yaw)));
assert(seeds.every(s => s.outwardDistance >= Core.DEFAULTS.minLandmarkOffset - 0.001));
assert(seeds.every(s => s.outwardDistance <= Core.DEFAULTS.maxLandmarkOffset + 0.001));
assert.equal(JSON.stringify(course), before);

assert.equal(Core.shouldShowForEvent({id:'open-sea-circuit',worldMode:'open-sea'}, false), true);
assert.equal(Core.shouldShowForEvent({id:'waikiki-offshore',worldMode:'hawaii-coast'}, false), false);
assert.equal(Core.shouldShowForEvent({id:'open-sea-circuit',worldMode:'open-sea'}, true), false);

for (let n=2;n<40;n++) {
  const ids=Core.selectedIndices(n, Math.min(4,n));
  assert.equal(new Set(ids).size, ids.length);
  assert(ids.every(i => i >= 0 && i < n));
}

console.log('V0.11.16 T14 route landmark regression PASS');
