const assert = require('assert');
const Art = require('../src/rendering/art-direction-core.js');

assert.equal(Art.VERSION, 'V0.11.8');
assert.equal(Object.keys(Art.PROFILES).length, 5);

const open = Art.profileFor('open-sea');
const hawaii = Art.profileFor('hawaii-coast');
const taiwan = Art.profileFor('taiwan-coast');
const lake = Art.profileFor('sun-moon-lake');
const final = Art.profileFor('open-sea', 'pacific-crown-final');

assert.strictEqual(open, Art.PROFILES['open-sea']);
assert.strictEqual(hawaii, Art.PROFILES['hawaii-coast']);
assert.strictEqual(taiwan, Art.PROFILES['taiwan-coast']);
assert.strictEqual(lake, Art.PROFILES['sun-moon-lake']);
assert.strictEqual(final, Art.PROFILES['pacific-crown-final']);
assert.strictEqual(Art.profileFor('unknown-world'), open);
assert.notEqual(hawaii.zenith, taiwan.zenith);
assert(final.exposure < open.exposure);
assert(final.fogFar < open.fogFar);
assert(hawaii.sunIntensity > taiwan.sunIntensity);

assert.equal(Art.clamp01(-2), 0);
assert.equal(Art.clamp01(2), 1);
assert.equal(Art.clamp01(0.37), 0.37);
assert.equal(Art.dressingCount(8, 1, open), 8);
assert.equal(Art.dressingCount(8, 0.45, open), 4);
assert.equal(Art.dressingCount(8, 1, final), 3);
assert.equal(Art.dressingCount(4, 1, lake), 2);

for (const [name, profile] of Object.entries(Art.PROFILES)) {
  for (const key of ['zenith','upper','horizon','low','fog','sun','hemiSky','hemiGround','sunIntensity','hemiIntensity','exposure','fogNear','fogFar','dressing']) {
    assert(Number.isFinite(profile[key]), `${name}.${key} must be finite`);
  }
  assert(profile.fogNear >= 0, `${name} fogNear`);
  assert(profile.fogFar > profile.fogNear, `${name} fog range`);
  assert(profile.exposure > 0, `${name} exposure`);
  assert(profile.dressing >= 0 && profile.dressing <= 1, `${name} dressing`);
}

for (let i = 0; i < 20000; i++) {
  const quality = (Math.sin(i * 0.031) + 1) * 0.5;
  const profile = [open, hawaii, taiwan, lake, final][i % 5];
  const count = Art.dressingCount(i % 12, quality, profile);
  assert(Number.isInteger(count));
  assert(count >= 0);
  assert(count <= Math.max(0, (i % 12)));
}

console.log('V0.11.8 art direction regression PASS');
