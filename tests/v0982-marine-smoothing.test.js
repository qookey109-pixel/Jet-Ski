const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../src/v0982-marine-smoothing.js'), 'utf8');

function runCase({ mode = 'voxel', airborne = false, speed = 20, brake = false, previous }) {
  const context = {
    console,
    JETSKI_PHYSICS: { hydroModel: { mode } },
    airborne,
    speed,
    input: { brake },
    updateJetSki(dt, t) { previous(context, dt, t); }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  context.updateJetSki(1 / 60, 10);
  return context;
}

let c = runCase({
  airborne: true,
  previous(ctx) {
    ctx.airborne = false;
    ctx.speed = 12; // simulate a large discrete landing/slamming loss
  }
});
assert(c.speed >= 20 * (1 - 0.055) - 1e-9);
assert.strictEqual(c.V0982_MARINE_SMOOTHING.state.landingSoftened, 1);

c = runCase({
  airborne: false,
  previous(ctx) { ctx.speed = 15; }
});
assert(c.speed >= 20 - 9.5 / 60 - 1e-9);
assert.strictEqual(c.V0982_MARINE_SMOOTHING.state.decelLimited, 1);

// Intentional brake authority must remain untouched.
c = runCase({
  airborne: false,
  brake: true,
  previous(ctx) { ctx.speed = 15; }
});
assert.strictEqual(c.speed, 15);

// Baseline 9-Point behavior must remain untouched.
c = runCase({
  mode: 'nine-point',
  airborne: false,
  previous(ctx) { ctx.speed = 15; }
});
assert.strictEqual(c.speed, 15);

console.log('v0982-marine-smoothing tests PASS');
