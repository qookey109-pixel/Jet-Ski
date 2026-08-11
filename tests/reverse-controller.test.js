const assert = require('assert');
const { createReverseController } = require('../src/reverse-controller.js');

const reverse = createReverseController();

// S/Down stays a brake while still moving forward.
let v = reverse.step({ dt: 0.1, forwardSpeed: 5, brakeHeld: true, gasHeld: false, grounded: true });
assert.strictEqual(v, 0);

// Once nearly stopped, holding brake engages reverse.
for (let i = 0; i < 10; i++) {
  v = reverse.step({ dt: 0.1, forwardSpeed: 0, brakeHeld: true, gasHeld: false, grounded: true });
}
assert(v > 0);
assert(v <= reverse.config.maxReverseSpeed + 1e-9);

const beforeGas = v;
v = reverse.step({ dt: 0.1, forwardSpeed: 0, brakeHeld: false, gasHeld: true, grounded: true });
assert(v < beforeGas, 'gas should cancel reverse before forward drive resumes');

reverse.reset();
assert.strictEqual(reverse.speed, 0);
assert.strictEqual(reverse.active, false);

for (let i = 0; i < 200; i++) {
  reverse.step({ dt: 0.05, forwardSpeed: 0, brakeHeld: true, gasHeld: false, grounded: true });
}
assert(reverse.speed <= reverse.config.maxReverseSpeed + 1e-9);

console.log('reverse-controller tests PASS');
