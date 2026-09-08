const assert = require('assert');
const Boost = require('../src/gameplay/boost-core.js');

assert.equal(Boost.VERSION, 'V0.11.2');
const cfg = Boost.DEFAULTS;
let state = Boost.createBoostState(cfg);
assert.equal(state.energy, 100);
assert.equal(Boost.energyRatio(state, cfg), 1);

Boost.stepBoost(state, {
  requested: true,
  enabled: true,
  airborne: false,
  reverse: false,
  forwardHeld: true,
  speedRatio: 0.5
}, 1 / 60, cfg);
assert.equal(state.active, true);
assert(state.energy < 100);
assert.equal(state.activationCount, 1);
assert.equal(state.accelerationMps2, cfg.accelerationMps2);

const afterFirst = state.energy;
Boost.stepBoost(state, {
  requested: true,
  enabled: true,
  airborne: true,
  reverse: false,
  forwardHeld: true,
  speedRatio: 0.5
}, 1 / 60, cfg);
assert.equal(state.active, false);
assert.equal(state.energy, afterFirst);

Boost.stepBoost(state, {
  requested: true,
  enabled: true,
  airborne: false,
  reverse: true,
  forwardHeld: true,
  speedRatio: 0.5
}, 1 / 60, cfg);
assert.equal(state.active, false);

for (let i = 0; i < 500; i++) {
  Boost.stepBoost(state, {
    requested: false,
    enabled: true,
    airborne: false,
    reverse: false,
    forwardHeld: false,
    speedRatio: 0.2
  }, 1 / 60, cfg);
}
assert(state.energy > afterFirst);
assert(state.energy <= cfg.capacity);

state = Boost.createBoostState(cfg);
for (let i = 0; i < 10000; i++) {
  const requested = (i % 240) < 150;
  const airborne = i % 997 < 9;
  const reverse = i % 1201 < 7;
  const speedRatio = 0.1 + 0.85 * (0.5 + 0.5 * Math.sin(i * 0.017));
  Boost.stepBoost(state, {
    requested,
    enabled: true,
    airborne,
    reverse,
    forwardHeld: true,
    speedRatio
  }, 1 / 120, cfg);
  assert(Number.isFinite(state.energy));
  assert(Number.isFinite(state.accelerationMps2));
  assert(state.energy >= 0 && state.energy <= cfg.capacity);
  assert(state.accelerationMps2 >= 0 && state.accelerationMps2 <= cfg.accelerationMps2);
}

for (let i = 0; i < 10000; i++) {
  Boost.stepBoost(state, {
    requested: false,
    enabled: true,
    airborne: false,
    reverse: false,
    forwardHeld: false,
    speedRatio: 0
  }, 1 / 120, cfg);
  assert(Number.isFinite(Boost.energyRatio(state, cfg)));
}
assert(Math.abs(state.energy - cfg.capacity) < 1e-6);
assert(state.activationCount > 0);
assert(state.activeSeconds > 0);

console.log('V0.11.2 boost core regression PASS');
