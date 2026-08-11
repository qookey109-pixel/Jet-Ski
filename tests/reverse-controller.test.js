const assert = require('assert');
const { createReverseController } = require('../src/reverse-controller.js');

const reverse = createReverseController();

let v = reverse.step({ dt: 0.1, forwardSpeed: 5, brakeHeld: true, gasHeld: false, grounded: true });
assert.strictEqual(v, 0, 'brake must not engage reverse while still moving forward');

for (let i = 0; i < 10; i++) {
  v = reverse.step({ dt: 0.1, forwardSpeed: 0, brakeHeld: true, gasHeld: false, grounded: true });
}
assert(v > 0, 'holding brake at near-stop should engage reverse');
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
assert(reverse.speed <= reverse.config.maxReverseSpeed + 1e-9, 'reverse must respect max speed');

console.log('reverse-controller tests PASS');
