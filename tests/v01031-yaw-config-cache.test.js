const assert = require('assert');
const planar = require('../src/v0992-planar-3dof-runtime.js');
const steering = require('../src/v0993-steering-yaw-moment.js');

function stressIdentityCache(factory, label) {
  let calls = 0;
  const cache = factory(() => ({ token: ++calls }));
  const contractA = {};
  const first = cache.resolve(contractA);
  for (let i = 0; i < 20000; i++) {
    assert.strictEqual(cache.resolve(contractA), first, `${label} must reuse the same resolved object`);
  }
  assert.strictEqual(calls, 1, `${label} resolver must run once for a stable contract identity`);
  assert.strictEqual(cache.resolutions, 1);

  const contractB = {};
  const second = cache.resolve(contractB);
  assert.notStrictEqual(second, first);
  assert.strictEqual(calls, 2, `${label} must resolve again only when contract identity changes`);
  for (let i = 0; i < 20000; i++) cache.resolve(contractB);
  assert.strictEqual(calls, 2);
  assert.strictEqual(cache.resolutions, 2);
}

stressIdentityCache(planar.createIdentityConfigCache, 'planar yaw cache');
stressIdentityCache(steering.createIdentityConfigCache, 'steering cache');

const contract = {
  authority: { yawSourceOfTruth: true },
  rigidBody: { inertiaKgM2: { yaw: 165 } },
  addedMassRatio: { yaw: 0.38 },
  damping: { yawLinear: 0.88, yawNonlinear: 0.16 },
  responseTuning: { yawResponse: 5.0 },
  responseLimits: { maxYawAcceleration: 3.2, maxYawRate: 1.55 },
  steering: {
    leverArmM: 1.45,
    hydroForceCoeff: 1.05,
    lowSpeedJetForceN: 82,
    maxSteeringForceN: 360,
    maxYawMomentNm: 520,
    hydroAuthorityStartMps: 1.2,
    hydroAuthorityFullMps: 12.0,
    landingAuthorityLoss: 0.14
  }
};
const root = { V0101_CALIBRATION: { contract } };

const directYaw = planar.resolveYawDynamicsConfig(root, planar.DEFAULTS);
let yawCalls = 0;
const yawCache = planar.createIdentityConfigCache(() => {
  yawCalls += 1;
  return planar.resolveYawDynamicsConfig(root, planar.DEFAULTS);
});
const cachedYaw = yawCache.resolve(contract);
assert.deepStrictEqual(cachedYaw, directYaw);
for (let i = 0; i < 20000; i++) yawCache.resolve(contract);
assert.strictEqual(yawCalls, 1);
assert.strictEqual(cachedYaw.config.yawInertiaKgM2, 165);
assert.strictEqual(cachedYaw.config.addedMassYawRatio, 0.38);
assert.strictEqual(cachedYaw.config.yawLinearDamping, 0.88);
assert.strictEqual(cachedYaw.config.nonlinearYawDamping, 0.16);
assert.strictEqual(cachedYaw.config.maxYawRate, 1.55);

const directSteering = steering.resolveSteeringConfig(root, steering.DEFAULTS);
let steeringCalls = 0;
const steeringCache = steering.createIdentityConfigCache(() => {
  steeringCalls += 1;
  return steering.resolveSteeringConfig(root, steering.DEFAULTS);
});
const cachedSteering = steeringCache.resolve(contract);
assert.deepStrictEqual(cachedSteering, directSteering);
for (let i = 0; i < 20000; i++) steeringCache.resolve(contract);
assert.strictEqual(steeringCalls, 1);
assert.strictEqual(cachedSteering.config.sternLeverArmM, 1.45);
assert.strictEqual(cachedSteering.config.maxYawMomentNm, 520);
assert.strictEqual(cachedSteering.config.landingAuthorityLoss, 0.14);

const legacyLoad = steering.computeSteeringLoad(
  { steering: 1, relativeForward: 18, throttle: 0.6, landingLoad: 0.4 },
  steering.DEFAULTS
);
const cachedLoad = steering.computeSteeringLoad(
  { steering: 1, relativeForward: 18, throttle: 0.6, landingLoad: 0.4 },
  cachedSteering.config
);
assert.deepStrictEqual(cachedLoad, legacyLoad, 'cache hotfix must not change steering output');

console.log('V0.10.3.1 yaw config cache regression PASS');
