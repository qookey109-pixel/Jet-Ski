const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const context = { console, Math, globalThis: null };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname + '/../src/ocean-disturbance.js', 'utf8'), context);

assert.strictEqual(typeof context.createOceanDisturbanceModel, 'function');
const model = context.createOceanDisturbanceModel({ maxEvents: 6 });

model.emitWake(0, 0, 0, 1.0, 0);
let s = model.sample(0, 0, 0.15);
assert(Number.isFinite(s.height) && Number.isFinite(s.foam));
assert(Math.abs(s.height) <= 0.34 + 1e-9);
assert(model.activeCount(0.15) === 1);

const far = model.sample(100, 100, 0.15);
assert(Math.abs(far.height) < 1e-12);
assert(far.foam === 0);

model.emitLanding(2, 3, 1.3, 1.0);
s = model.sample(2, 3, 1.1);
assert(Number.isFinite(s.height));
assert(s.foam >= 0 && s.foam <= 1);
assert(model.activeCount(1.1) >= 1);

const expired = model.sample(0, 0, 10);
assert(Number.isFinite(expired.height));
assert(model.activeCount(10) === 0);
console.log('ocean-disturbance tests PASS');
