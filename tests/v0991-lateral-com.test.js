const assert = require('assert');
const {
  computeLateralAcceleration,
  combineLateralAcceleration
} = require('../src/v0991-lateral-com-runtime.js');

assert.strictEqual(computeLateralAcceleration(0, 1), 0);
assert(computeLateralAcceleration(2, 0.8) < 0);
assert(computeLateralAcceleration(-2, 0.8) > 0);
assert(Math.abs(computeLateralAcceleration(20, 1)) <= 4.6);

const lowSpeed = Math.abs(computeLateralAcceleration(1.5, 0.2));
const highSpeed = Math.abs(computeLateralAcceleration(1.5, 0.9));
assert(highSpeed > lowSpeed);

assert.strictEqual(combineLateralAcceleration(0, 0, 0), 0);
assert(combineLateralAcceleration(0, 20, 0.5) > 0);
assert(combineLateralAcceleration(0, 20, -0.5) < 0);
assert(Math.abs(combineLateralAcceleration(4.6, 45, 1.8)) <= 6.5);

console.log('v0991-lateral-com tests PASS');
