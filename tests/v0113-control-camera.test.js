const assert = require('assert');
const Core = require('../src/input/control-camera-core.js');

assert.equal(Core.VERSION, 'V0.11.3');
assert.equal(Core.applyDeadzone(0.1, 0.18), 0);
assert(Core.applyDeadzone(1, 0.18) > 0.99);
assert(Core.applyDeadzone(-1, 0.18) < -0.99);

let orbit = Core.createOrbitState();
Core.applyPointerDelta(orbit, 120, -80);
assert(orbit.targetYaw < 0);
assert(orbit.targetPitch < 0);
assert(orbit.targetYaw >= -Core.DEFAULTS.maxYawOffset);
assert(orbit.targetPitch >= Core.DEFAULTS.minPitchOffset);

for (let i = 0; i < 10000; i++) {
  const lookX = Math.sin(i * 0.013) * 0.9;
  const lookY = Math.cos(i * 0.017) * 0.7;
  Core.stepOrbit(orbit, { lookX, lookY }, 1 / 120);
  assert(Number.isFinite(orbit.yaw));
  assert(Number.isFinite(orbit.pitch));
  assert(orbit.yaw >= -Core.DEFAULTS.maxYawOffset - 1e-9);
  assert(orbit.yaw <= Core.DEFAULTS.maxYawOffset + 1e-9);
  assert(orbit.pitch >= Core.DEFAULTS.minPitchOffset - 1e-9);
  assert(orbit.pitch <= Core.DEFAULTS.maxPitchOffset + 1e-9);
}

orbit.targetYaw = 1;
orbit.targetPitch = 0.4;
orbit.idleSeconds = 0;
for (let i = 0; i < 10000; i++) {
  Core.stepOrbit(orbit, { lookX: 0, lookY: 0 }, 1 / 120);
  assert(Number.isFinite(orbit.targetYaw));
  assert(Number.isFinite(orbit.targetPitch));
}
assert(Math.abs(orbit.targetYaw) < 1e-4);
assert(Math.abs(orbit.targetPitch) < 1e-4);
assert(Math.abs(orbit.yaw) < 1e-4);
assert(Math.abs(orbit.pitch) < 1e-4);

console.log('V0.11.3 control camera regression PASS');
