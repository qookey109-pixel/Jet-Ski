const assert = require('assert');
const AI = require('../src/ai/race-ai-core.js');
const Race = require('../src/game/race-course.js');

assert.equal(AI.VERSION, 'V0.11.1');
const course = Race.OPEN_SEA_CIRCUIT;
const agent = AI.createAgent({ id: 'a', name: 'A', speedMps: 12, x: 0, z: 82, yaw: 2.35 }, course);
assert.equal(agent.nextCheckpointIndex, 1);

for (let i = 0; i < 20000 && !agent.finished; i++) {
  AI.advanceAgent(agent, 1 / 60, course, i * (1000 / 60));
  assert(Number.isFinite(agent.x));
  assert(Number.isFinite(agent.z));
  assert(Number.isFinite(agent.yaw));
}
assert.equal(agent.finished, true);
assert.equal(agent.lap, 2);
assert(agent.distanceTravelledM > 0);

const player = { id: 'player', x: 58, z: 58, lap: 1, nextCheckpointIndex: 2, finished: false };
const behind = { id: 'behind', x: 0, z: 82, lap: 1, nextCheckpointIndex: 1, finished: false };
const ranking = AI.rankRacers([behind, player], course);
assert.equal(ranking[0].id, 'player');

const finishedFast = { id: 'fast', finished: true, finishMs: 50000 };
const finishedSlow = { id: 'slow', finished: true, finishMs: 60000 };
const finishedRanking = AI.rankRacers([finishedSlow, finishedFast], course);
assert.equal(finishedRanking[0].id, 'fast');

for (let i = 0; i < 20000; i++) {
  const score = AI.progressScore({
    x: Math.sin(i * 0.01) * 90,
    z: Math.cos(i * 0.013) * 90,
    lap: 1 + (i % 2),
    nextCheckpointIndex: i % course.checkpoints.length,
    finished: false
  }, course);
  assert(Number.isFinite(score));
}
console.log('V0.11.1 race AI regression PASS');
