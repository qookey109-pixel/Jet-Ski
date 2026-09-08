const assert = require('assert');
const Onboarding = require('../src/ui/onboarding-core.js');

assert.equal(Onboarding.VERSION, 'V0.11.11');
assert.equal(Onboarding.STEPS.length, 4);
assert.deepEqual(Onboarding.STEPS.map(step => step.id), ['drive', 'race', 'boost', 'career']);

let profile = Onboarding.createProfile();
assert.equal(profile.complete, false);
assert.equal(profile.hintsEnabled, true);
assert.equal(profile.visits, 0);
assert.equal(profile.lastStep, 0);

profile = Onboarding.beginTutorial(profile);
assert.equal(profile.visits, 1);
assert.equal(profile.complete, false);
assert.equal(profile.lastStep, 0);

profile = Onboarding.setHints(profile, false);
assert.equal(profile.hintsEnabled, false);
profile = Onboarding.completeTutorial(profile);
assert.equal(profile.complete, true);
assert.equal(profile.hintsEnabled, false);
assert.equal(profile.lastStep, 3);
assert.equal(profile.visits, 2);

const dirty = Onboarding.sanitizeProfile({ complete: 1, hintsEnabled: 0, visits: -7, lastStep: 99 });
assert.equal(dirty.complete, true);
assert.equal(dirty.hintsEnabled, true, 'only explicit false disables hints');
assert.equal(dirty.visits, 0);
assert.equal(dirty.lastStep, 3);

assert.equal(Onboarding.clampIndex(-10), 0);
assert.equal(Onboarding.clampIndex(2.9), 2);
assert.equal(Onboarding.clampIndex(99), 3);
assert.equal(Onboarding.clampIndex('bad'), 0);
assert.equal(Onboarding.nextStep(0), 1);
assert.equal(Onboarding.nextStep(3), 3);
assert.equal(Onboarding.previousStep(0), 0);
assert.equal(Onboarding.previousStep(3), 2);
assert.equal(Onboarding.stepFor(99).id, 'career');

assert.equal(Onboarding.inputMode({ touch: true, gamepad: true }), 'touch');
assert.equal(Onboarding.inputMode({ touch: false, gamepad: true }), 'gamepad');
assert.equal(Onboarding.inputMode({}), 'keyboard');

for (const step of Onboarding.STEPS) {
  for (const mode of ['keyboard', 'gamepad', 'touch']) {
    const copy = Onboarding.controlCopy(step, mode);
    assert.equal(typeof copy, 'string');
    assert(copy.length > 3);
  }
  assert(step.title.length > 3);
  assert(step.body.length > 20);
}

for (let i = 0; i < 20000; i++) {
  const index = Onboarding.clampIndex(Math.sin(i * 0.031) * 12);
  assert(index >= 0 && index < Onboarding.STEPS.length);
  const next = Onboarding.nextStep(index);
  const previous = Onboarding.previousStep(index);
  assert(next >= index && next < Onboarding.STEPS.length);
  assert(previous <= index && previous >= 0);
  const mode = Onboarding.inputMode({ touch: i % 7 === 0, gamepad: i % 5 === 0 });
  assert(['touch', 'gamepad', 'keyboard'].includes(mode));
}

console.log('V0.11.11 onboarding regression PASS');
