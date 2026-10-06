const assert = require('assert');
const Wake = require('../src/rendering/wake-spray-core.js');

assert.equal(Wake.VERSION, 'V0.11.16-T12');
assert.equal(Wake.visualOnly, true);
assert.equal(Wake.collisionAdded, false);
assert.equal(Wake.physicsUntouched, true);
assert.equal(Wake.gameplayUntouched, true);
assert.equal(Wake.aiMovementUntouched, true);
assert.equal(Wake.raceRulesUntouched, true);
assert.equal(Wake.cameraUntouched, true);

assert.equal(Wake.speedStrength(0), 0);
assert.equal(Wake.speedStrength(2), 0);
assert(Wake.speedStrength(10) > 0 && Wake.speedStrength(10) < 1);
assert.equal(Wake.speedStrength(30), 1);
assert.equal(Wake.shouldEmit(10, 'racing'), true);
assert.equal(Wake.shouldEmit(10, 'free-ride'), true);
assert.equal(Wake.shouldEmit(10, 'countdown'), false);
assert.equal(Wake.shouldEmit(0, 'racing'), false);

const d0 = Wake.wakeDimensions(18, 0);
const d1 = Wake.wakeDimensions(18, 1);
assert(d0.length > 0 && d0.width > 0 && d0.scale > d1.scale);
assert(d1.width > d0.width * 0.9);
assert(Math.abs(Wake.estimateSpeed({x:0,z:0},{x:3,z:4},1)-5) < 1e-9);

assert(Wake.DEFAULTS.maxWakeInstancesDesktop <= 32);
assert(Wake.DEFAULTS.maxWakeInstancesMobile <= 24);
assert(Wake.DEFAULTS.maxSprayInstancesDesktop <= 16);
assert(Wake.DEFAULTS.maxSprayInstancesMobile <= 12);

for (let i=0;i<20000;i++) {
  const s=Wake.speedStrength((i%50)-10);
  const d=Wake.wakeDimensions(i%30,(i%100)/99);
  assert(s>=0 && s<=1);
  assert(Number.isFinite(d.length) && d.length>0);
  assert(Number.isFinite(d.width) && d.width>0);
  assert(d.scale>=0 && d.scale<=1);
}

console.log('V0.11.16 T12 wake/spray regression PASS');
