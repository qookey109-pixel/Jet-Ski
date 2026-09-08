'use strict';

const assert = require('assert');
const Core = require('../src/ui/mobile-ux-core.js');

assert.strictEqual(Core.VERSION, 'V0.11.14');

const iphoneLandscape = Core.viewportProfile(844, 390, true);
assert.strictEqual(iphoneLandscape.landscape, true);
assert.strictEqual(iphoneLandscape.phoneLandscape, true);
assert.strictEqual(iphoneLandscape.touchFirst, true);
assert.strictEqual(iphoneLandscape.shouldSuggestRotate, false);

const iphonePortrait = Core.viewportProfile(390, 844, true);
assert.strictEqual(iphonePortrait.portrait, true);
assert.strictEqual(iphonePortrait.shouldSuggestRotate, true);

const desktop = Core.viewportProfile(1440, 900, false);
assert.strictEqual(desktop.phoneLandscape, false);
assert.strictEqual(desktop.touchFirst, false);
assert.strictEqual(desktop.shouldSuggestRotate, false);

for (const phase of ['preparing', 'countdown', 'racing', 'paused', 'finished']) {
  assert.strictEqual(Core.isRaceFocusedPhase(phase), true, phase);
}
for (const phase of ['menu', 'free-ride', '', null]) {
  assert.strictEqual(Core.isRaceFocusedPhase(phase), false, String(phase));
}

assert.strictEqual(Core.actionTier('start', true), 'primary');
assert.strictEqual(Core.actionTier('resume', true), 'primary');
assert.strictEqual(Core.actionTier('restart', true), 'standard');
assert.strictEqual(Core.actionTier('free', true), 'standard');
assert.strictEqual(Core.actionTier('menu', true), 'standard');
assert.strictEqual(Core.actionTier('controls', true), 'secondary');
assert.strictEqual(Core.actionTier('', false), 'secondary');

const compact = Core.compactHudPolicy(iphoneLandscape);
assert.strictEqual(compact.hideBestLap, true);
assert.strictEqual(compact.hideGhostDelta, true);
assert.strictEqual(compact.compactLabels, true);
assert.strictEqual(compact.touchTargetsPx, 52);

const roomy = Core.compactHudPolicy(desktop);
assert.strictEqual(roomy.hideBestLap, false);
assert.strictEqual(roomy.hideGhostDelta, false);
assert.strictEqual(roomy.touchTargetsPx, 44);

assert.strictEqual(Core.safeInset(-20), 0);
assert.strictEqual(Core.safeInset(999), 80);
assert.strictEqual(Core.safeInset(24), 24);

for (let i = 0; i < 20000; i++) {
  const w = 280 + (i % 1500);
  const h = 240 + ((i * 17) % 900);
  const p = Core.viewportProfile(w, h, i % 2 === 0);
  const policy = Core.compactHudPolicy(p);
  assert.ok(Number.isFinite(p.width) && p.width >= 1);
  assert.ok(Number.isFinite(p.height) && p.height >= 1);
  assert.ok(policy.touchTargetsPx === 44 || policy.touchTargetsPx === 52);
  assert.strictEqual(p.landscape, !p.portrait);
  if (p.phoneLandscape) {
    assert.strictEqual(p.landscape, true);
    assert.strictEqual(p.compactHeight, true);
    assert.ok(p.width <= 980);
  }
}

console.log('V0.11.14 mobile UX policy regression PASS');
