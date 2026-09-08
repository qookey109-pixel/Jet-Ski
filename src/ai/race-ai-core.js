// V0.11.1 AI racer pure core. Reduced-order opponent logic; no player physics writes.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.1';

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function finite(v, fallback) { return Number.isFinite(v) ? v : fallback; }
  function normalizeAngle(a) {
    let value = finite(a, 0);
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  }
  function distance2D(a, b) {
    const dx = finite(a && a.x, 0) - finite(b && b.x, 0);
    const dz = finite(a && a.z, 0) - finite(b && b.z, 0);
    return Math.hypot(dx, dz);
  }
  function targetYaw(from, to) {
    return Math.atan2(finite(to && to.x, 0) - finite(from && from.x, 0), finite(to && to.z, 0) - finite(from && from.z, 0));
  }

  function createAgent(config, course) {
    const c = config || {};
    const track = course || { checkpoints: [{ x: 0, z: 0 }], laps: 1 };
    return {
      id: String(c.id || 'ai'),
      name: String(c.name || 'Rival'),
      speedMps: Math.max(1, finite(c.speedMps, 10)),
      steeringResponse: Math.max(0.1, finite(c.steeringResponse, 2.8)),
      x: finite(c.x, 0),
      z: finite(c.z, 0),
      yaw: finite(c.yaw, 0),
      lap: 1,
      totalLaps: Math.max(1, track.laps | 0),
      nextCheckpointIndex: 1,
      finished: false,
      finishMs: 0,
      distanceTravelledM: 0
    };
  }

  function resetAgent(agent, config, course) {
    const fresh = createAgent(config, course);
    Object.assign(agent, fresh);
    return agent;
  }

  function advanceAgent(agent, dt, course, nowMs) {
    if (!agent || agent.finished) return agent;
    const c = course;
    if (!c || !Array.isArray(c.checkpoints) || c.checkpoints.length < 2) return agent;
    const safeDt = clamp(finite(dt, 0), 0, 1 / 20);
    const target = c.checkpoints[agent.nextCheckpointIndex] || c.checkpoints[0];
    const desiredYaw = targetYaw(agent, target);
    const delta = normalizeAngle(desiredYaw - agent.yaw);
    const alpha = 1 - Math.exp(-agent.steeringResponse * safeDt);
    agent.yaw = normalizeAngle(agent.yaw + delta * alpha);

    const step = agent.speedMps * safeDt;
    agent.x += Math.sin(agent.yaw) * step;
    agent.z += Math.cos(agent.yaw) * step;
    agent.distanceTravelledM += step;

    const radius = Math.max(1, finite(c.checkpointRadiusM, 12));
    if (distance2D(agent, target) <= radius) {
      if (agent.nextCheckpointIndex === 0) {
        if (agent.lap >= agent.totalLaps) {
          agent.finished = true;
          agent.finishMs = Math.max(0, finite(nowMs, 0));
        } else {
          agent.lap += 1;
          agent.nextCheckpointIndex = 1;
        }
      } else {
        agent.nextCheckpointIndex += 1;
        if (agent.nextCheckpointIndex >= c.checkpoints.length) agent.nextCheckpointIndex = 0;
      }
    }
    return agent;
  }

  function progressScore(racer, course) {
    const c = course;
    if (!racer || !c || !Array.isArray(c.checkpoints) || !c.checkpoints.length) return 0;
    if (racer.finished) return 1e9 - finite(racer.finishMs, 0) * 1e-3;
    const lapBase = Math.max(0, finite(racer.lap, 1) - 1) * c.checkpoints.length;
    const nextIndex = Math.max(0, finite(racer.nextCheckpointIndex, 1));
    const completedThisLap = nextIndex === 0 ? c.checkpoints.length - 1 : Math.max(0, nextIndex - 1);
    const target = c.checkpoints[nextIndex] || c.checkpoints[0];
    const previousIndex = nextIndex === 0 ? c.checkpoints.length - 1 : Math.max(0, nextIndex - 1);
    const previous = c.checkpoints[previousIndex] || target;
    const segmentLength = Math.max(0.001, distance2D(previous, target));
    const remaining = distance2D(racer, target);
    const segmentProgress = clamp(1 - remaining / segmentLength, 0, 0.999);
    return lapBase + completedThisLap + segmentProgress;
  }

  function rankRacers(racers, course) {
    return (Array.isArray(racers) ? racers : []).slice().sort((a, b) => {
      if (a.finished && b.finished) return finite(a.finishMs, Infinity) - finite(b.finishMs, Infinity);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return progressScore(b, course) - progressScore(a, course);
    });
  }

  const api = { VERSION, normalizeAngle, distance2D, targetYaw, createAgent, resetAgent, advanceAgent, progressScore, rankRacers };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_RACE_AI_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
