const assert = require('assert');
const { DEFAULTS, computeSteeringLoad } = require('../src/v0993-steering-yaw-moment.js');

let out = computeSteeringLoad({ steering: 0, relativeForward: 20, throttle: 1 });
assert.strictEqual(out.steeringForceN, 0);
assert.strictEqual(out.yawMomentNm, 0);

out = computeSteeringLoad({ steering: 1, relativeForward: 18, throttle: 0.5 });
assert(out.steeringForceN > 0);
assert(out.yawMomentNm > 0);
assert(out.yawMomentNm <= DEFAULTS.maxYawMomentNm + 1e-9);

const opposite = computeSteeringLoad({ steering: -1, relativeForward: 18, throttle: 0.5 });
assert(opposite.steeringForceN < 0);
assert(opposite.yawMomentNm < 0);
assert(Math.abs(opposite.yawMomentNm + out.yawMomentNm) < 1e-9);

const slowNoThrottle = computeSteeringLoad({ steering: 1, relativeForward: 0.5, throttle: 0 });
const slowWithThrottle = computeSteeringLoad({ steering: 1, relativeForward: 0.5, throttle: 1 });
assert(slowWithThrottle.yawMomentNm > slowNoThrottle.yawMomentNm, 'jet thrust must provide low-speed steering authority');

const medium = computeSteeringLoad({ steering: 1, relativeForward: 8, throttle: 0 });
const fast = computeSteeringLoad({ steering: 1, relativeForward: 18, throttle: 0 });
assert(fast.waterAuthority >= medium.waterAuthority);
assert(fast.yawMomentNm >= medium.yawMomentNm);

const landing = computeSteeringLoad({ steering: 1, relativeForward: 18, throttle: 0.6, landingLoad: 1 });
const clean = computeSteeringLoad({ steering: 1, relativeForward: 18, throttle: 0.6, landingLoad: 0 });
assert(Math.abs(landing.yawMomentNm) <= Math.abs(clean.yawMomentNm), 'hard landing should temporarily reduce steering authority');

const saturated = computeSteeringLoad({ steering: 1, relativeForward: 45, throttle: 1 });
assert(Math.abs(saturated.steeringForceN) <= DEFAULTS.maxSteeringForceN + 1e-9);
assert(Math.abs(saturated.yawMomentNm) <= DEFAULTS.maxYawMomentNm + 1e-9);

console.log('v0993-steering-yaw-moment tests PASS');
