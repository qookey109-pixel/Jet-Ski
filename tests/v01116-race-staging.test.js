const assert = require('assert');
const Staging = require('../src/rendering/race-staging-core.js');

assert.equal(Staging.VERSION, 'V0.11.16-T10');
assert.equal(Staging.visualOnly, true);
assert.equal(Staging.collisionAdded, false);
assert.equal(Staging.physicsUntouched, true);
assert.equal(Staging.gameplayUntouched, true);
assert.equal(Staging.raceRulesUntouched, true);
assert.equal(Staging.checkpointAuthorityUntouched, true);

const course = {
  checkpoints: [
    { x: 0, z: 115 },
    { x: 70, z: 94 },
    { x: 119, z: 34 }
  ]
};
const snapshot = JSON.stringify(course);
const pose = Staging.startPose(course);
assert(pose && Number.isFinite(pose.yaw));
assert(Math.abs(Math.hypot(pose.fx, pose.fz) - 1) < 1e-9);

const desktop = Staging.startTiles(course, { tileCount: 12 });
const mobile = Staging.startTiles(course, { tileCount: 10 });
assert.equal(desktop.length, 12);
assert.equal(mobile.length, 10);
assert(desktop.every(p => Number.isFinite(p.x) && Number.isFinite(p.z) && Number.isFinite(p.yaw)));
assert.equal(JSON.stringify(course), snapshot, 'staging helpers must not mutate race course');

const pylons = Staging.pylonSeeds(course);
assert.equal(pylons.length, 2);
assert(pylons[0].side < 0 && pylons[1].side > 0);
const pylonSeparation = Math.hypot(pylons[0].x - pylons[1].x, pylons[0].z - pylons[1].z);
assert(pylonSeparation > 26 && pylonSeparation < 29);

assert.equal(Staging.countdownStage('3', 'countdown'), 'red');
assert.equal(Staging.countdownStage('2', 'countdown'), 'amber');
assert.equal(Staging.countdownStage('1', 'countdown'), 'amber');
assert.equal(Staging.countdownStage('GO', 'countdown'), 'green');
assert.equal(Staging.countdownStage('', 'racing'), 'green');
assert.equal(Staging.countdownStage('', 'menu'), 'idle');

assert.equal(Staging.shouldShow({ worldMode: 'open-sea' }, false), true);
assert.equal(Staging.shouldShow({ worldMode: 'hawaii-coast' }, false), false);
assert.equal(Staging.shouldShow({ worldMode: 'open-sea' }, true), false);

console.log('V0.11.16 T10 race venue staging regression PASS');
