// V0.11.9 Personal Best Ghost pure coordinate/replay core.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.9';
  const PROFILE_VERSION = 1;
  const DEFAULT_SAMPLE_INTERVAL_MS = 80;
  const MAX_SAMPLES = 5000;

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function round(value, precision) {
    const p = precision || 100;
    return Math.round(finite(value, 0) * p) / p;
  }

  function wrapAngle(angle) {
    let value = finite(angle, 0);
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  }

  function courseFrame(course) {
    const checkpoints = course && Array.isArray(course.checkpoints) ? course.checkpoints : [];
    const start = checkpoints[0] || { x: 0, z: 0 };
    const next = checkpoints[1] || { x: finite(start.x, 0), z: finite(start.z, 0) + 1 };
    const dx = finite(next.x, 0) - finite(start.x, 0);
    const dz = finite(next.z, 1) - finite(start.z, 0);
    return {
      x: finite(start.x, 0),
      z: finite(start.z, 0),
      heading: Math.atan2(dx, dz)
    };
  }

  function worldToCourse(point, frame, out) {
    const f = frame || { x: 0, z: 0, heading: 0 };
    const result = out || {};
    const dx = finite(point && point.x, 0) - finite(f.x, 0);
    const dz = finite(point && point.z, 0) - finite(f.z, 0);
    const h = finite(f.heading, 0);
    const sin = Math.sin(h);
    const cos = Math.cos(h);
    result.right = dx * cos - dz * sin;
    result.forward = dx * sin + dz * cos;
    return result;
  }

  function courseToWorld(point, frame, out) {
    const f = frame || { x: 0, z: 0, heading: 0 };
    const result = out || {};
    const right = finite(point && point.right, 0);
    const forward = finite(point && point.forward, 0);
    const h = finite(f.heading, 0);
    const sin = Math.sin(h);
    const cos = Math.cos(h);
    result.x = finite(f.x, 0) + sin * forward + cos * right;
    result.z = finite(f.z, 0) + cos * forward - sin * right;
    result.yaw = wrapAngle(h + finite(point && point.relativeYaw, 0));
    return result;
  }

  // Compact sample layout: [timeMs, rightM, forwardM, relativeYaw, lap, nextCheckpointIndex]
  function captureSample(elapsedMs, pose, raceState, frame) {
    const local = worldToCourse(pose, frame);
    return [
      Math.max(0, Math.round(finite(elapsedMs, 0))),
      round(local.right, 100),
      round(local.forward, 100),
      round(wrapAngle(finite(pose && pose.yaw, 0) - finite(frame && frame.heading, 0)), 1000),
      Math.max(1, Math.floor(finite(raceState && raceState.lap, 1))),
      Math.max(0, Math.floor(finite(raceState && raceState.nextCheckpointIndex, 0)))
    ];
  }

  function validSample(sample) {
    return Array.isArray(sample) && sample.length >= 6 &&
      Number.isFinite(Number(sample[0])) && Number(sample[0]) >= 0 &&
      Number.isFinite(Number(sample[1])) && Number.isFinite(Number(sample[2])) &&
      Number.isFinite(Number(sample[3])) && Number.isFinite(Number(sample[4])) &&
      Number.isFinite(Number(sample[5]));
  }

  function sanitizeGhost(input, eventId) {
    if (!input || typeof input !== 'object') return null;
    if (eventId && input.eventId !== eventId) return null;
    const timeMs = Math.round(finite(input.timeMs, 0));
    if (timeMs <= 0 || !Array.isArray(input.samples)) return null;
    const samples = input.samples.filter(validSample).slice(0, MAX_SAMPLES).map(sample => [
      Math.max(0, Math.round(finite(sample[0], 0))),
      round(sample[1], 100),
      round(sample[2], 100),
      round(wrapAngle(sample[3]), 1000),
      Math.max(1, Math.floor(finite(sample[4], 1))),
      Math.max(0, Math.floor(finite(sample[5], 0)))
    ]);
    if (samples.length < 2) return null;
    samples.sort((a, b) => a[0] - b[0]);
    return {
      version: PROFILE_VERSION,
      eventId: String(input.eventId || eventId || ''),
      timeMs,
      sampleIntervalMs: Math.max(40, Math.min(250, Math.round(finite(input.sampleIntervalMs, DEFAULT_SAMPLE_INTERVAL_MS)))),
      samples
    };
  }

  function createRecording(eventId, sampleIntervalMs) {
    return {
      version: PROFILE_VERSION,
      eventId: String(eventId || ''),
      timeMs: 0,
      sampleIntervalMs: Math.max(40, Math.min(250, Math.round(finite(sampleIntervalMs, DEFAULT_SAMPLE_INTERVAL_MS)))),
      samples: []
    };
  }

  function appendSample(recording, sample) {
    if (!recording || !validSample(sample) || recording.samples.length >= MAX_SAMPLES) return false;
    const last = recording.samples[recording.samples.length - 1];
    if (last && Number(sample[0]) <= Number(last[0])) return false;
    recording.samples.push(sample);
    return true;
  }

  function finishRecording(recording, timeMs) {
    if (!recording) return null;
    recording.timeMs = Math.max(1, Math.round(finite(timeMs, 0)));
    return sanitizeGhost(recording, recording.eventId);
  }

  function interpolateSample(samples, timeMs, out) {
    if (!Array.isArray(samples) || !samples.length) return null;
    const t = Math.max(0, finite(timeMs, 0));
    if (t <= samples[0][0]) {
      const result = out || {};
      result.timeMs = samples[0][0]; result.right = samples[0][1]; result.forward = samples[0][2]; result.relativeYaw = samples[0][3]; result.lap = samples[0][4]; result.nextCheckpointIndex = samples[0][5];
      return result;
    }
    const last = samples[samples.length - 1];
    if (t >= last[0]) {
      const result = out || {};
      result.timeMs = last[0]; result.right = last[1]; result.forward = last[2]; result.relativeYaw = last[3]; result.lap = last[4]; result.nextCheckpointIndex = last[5];
      return result;
    }

    let low = 0, high = samples.length - 1;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (samples[mid][0] <= t) low = mid;
      else high = mid;
    }
    const a = samples[low], b = samples[high];
    const span = Math.max(1, b[0] - a[0]);
    const alpha = Math.max(0, Math.min(1, (t - a[0]) / span));
    const yawDelta = wrapAngle(b[3] - a[3]);
    const result = out || {};
    result.timeMs = t;
    result.right = a[1] + (b[1] - a[1]) * alpha;
    result.forward = a[2] + (b[2] - a[2]) * alpha;
    result.relativeYaw = wrapAngle(a[3] + yawDelta * alpha);
    result.lap = alpha < 0.5 ? a[4] : b[4];
    result.nextCheckpointIndex = alpha < 0.5 ? a[5] : b[5];
    return result;
  }

  function nearestProgressTime(samples, localPoint, lap, nextCheckpointIndex) {
    if (!Array.isArray(samples) || !samples.length) return null;
    const targetLap = Math.max(1, Math.floor(finite(lap, 1)));
    const targetCp = Math.max(0, Math.floor(finite(nextCheckpointIndex, 0)));
    const right = finite(localPoint && localPoint.right, 0);
    const forward = finite(localPoint && localPoint.forward, 0);
    let bestTime = null;
    let bestDistanceSq = Infinity;
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      if (sample[4] !== targetLap || sample[5] !== targetCp) continue;
      const dr = right - sample[1];
      const df = forward - sample[2];
      const distanceSq = dr * dr + df * df;
      if (distanceSq < bestDistanceSq) {
        bestDistanceSq = distanceSq;
        bestTime = sample[0];
      }
    }
    return bestTime;
  }

  function shouldReplaceGhost(existingGhost, elapsedMs, knownBestMs) {
    const elapsed = finite(elapsedMs, Infinity);
    if (!Number.isFinite(elapsed) || elapsed <= 0) return false;
    const knownBest = finite(knownBestMs, Infinity);
    if (Number.isFinite(knownBest) && elapsed > knownBest) return false;
    const existing = existingGhost && finite(existingGhost.timeMs, Infinity);
    return !Number.isFinite(existing) || elapsed < existing;
  }

  const api = {
    VERSION,
    PROFILE_VERSION,
    DEFAULT_SAMPLE_INTERVAL_MS,
    MAX_SAMPLES,
    wrapAngle,
    courseFrame,
    worldToCourse,
    courseToWorld,
    captureSample,
    validSample,
    sanitizeGhost,
    createRecording,
    appendSample,
    finishRecording,
    interpolateSample,
    nearestProgressTime,
    shouldReplaceGhost
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_GHOST_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
