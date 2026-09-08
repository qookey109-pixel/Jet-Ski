const assert = require('assert');
const Core = require('../src/ui/onboarding-core.js');

assert.equal(Core.VERSION, 'V0.11.12');
assert.deepEqual(Core.createProfile(), { version: 1, seen: false, opens: 0 });
assert.deepEqual(Core.sanitizeProfile(null), { version: 1, seen: false, opens: 0 });
assert.deepEqual(Core.sanitizeProfile({ seen: 1, opens: 3.9 }), { version: 1, seen: true, opens: 3 });
assert.equal(Core.sanitizeProfile({ opens: -8 }).opens, 0);
assert.equal(Core.sanitizeProfile({ opens: 999999 }).opens, 100000);

assert.equal(Core.inputMode({ touch: false, gamepad: false }), 'keyboard');
assert.equal(Core.inputMode({ touch: true, gamepad: false }), 'touch');
assert.equal(Core.inputMode({ touch: true, gamepad: true }), 'gamepad');

for (const mode of ['keyboard', 'touch', 'gamepad']) {
  const hints = Core.hintsForMode(mode);
  assert.equal(typeof hints.steer, 'string');
  assert.equal(typeof hints.brake, 'string');
  assert.equal(typeof hints.boost, 'string');
  assert.equal(typeof hints.camera, 'string');
  assert(hints.steer.length > 0);
  assert(hints.brake.length > 0);
  assert(hints.boost.length > 0);
  assert(hints.camera.length > 0);
}

assert.deepEqual(Core.careerSummary({
  stars: 20,
  medals: -2,
  ghostEnabled: 1,
  livery: '  Pacific Crown  '
}), {
  stars: 12,
  medals: 0,
  ghostEnabled: true,
  livery: 'Pacific Crown'
});

assert.equal(Core.careerSummary({ livery: '' }).livery, 'Sunset Orange');
assert.equal(Core.careerSummary({ livery: 'x'.repeat(100) }).livery.length, 48);

for (let i = 0; i < 20000; i++) {
  const profile = Core.sanitizeProfile({
    seen: i % 2,
    opens: Math.sin(i * 0.17) * 150000
  });
  assert(profile.opens >= 0 && profile.opens <= 100000);
  assert.equal(typeof profile.seen, 'boolean');

  const summary = Core.careerSummary({
    stars: (i % 31) - 7,
    medals: (i % 19) - 4,
    ghostEnabled: i % 3,
    livery: i % 5 ? `Livery ${i}` : ''
  });
  assert(summary.stars >= 0 && summary.stars <= 12);
  assert(summary.medals >= 0 && summary.medals <= 8);
  assert.equal(typeof summary.ghostEnabled, 'boolean');
  assert(summary.livery.length > 0 && summary.livery.length <= 48);
}

console.log('V0.11.12 onboarding/status hub regression PASS');
