// V0.9.9.3.1 Safari frame-time hotfix.
// Keep gameplay/physics at full RAF cadence while reducing the extra mirror render cost on Safari desktop.
(function (root) {
  'use strict';

  function isSafariDesktop(userAgent) {
    const ua = String(userAgent || '');
    const safari = /Safari\//.test(ua) && /AppleWebKit\//.test(ua);
    const otherChromium = /(Chrome|Chromium|CriOS|Edg|OPR)\//.test(ua);
    const mobileApple = /(iPhone|iPad|iPod)/.test(ua);
    const android = /Android/.test(ua);
    return safari && !otherChromium && !mobileApple && !android;
  }

  function computeFrameStats(samples) {
    const values = (samples || []).filter(Number.isFinite);
    if (!values.length) return { avgMs: 0, p95Ms: 0, maxMs: 0, fps: 0, longFrames: 0 };
    const sorted = values.slice().sort((a, b) => a - b);
    const avgMs = values.reduce((sum, value) => sum + value, 0) / values.length;
    const p95Index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * 0.95) - 1));
    const p95Ms = sorted[p95Index];
    const maxMs = sorted[sorted.length - 1];
    return {
      avgMs,
      p95Ms,
      maxMs,
      fps: avgMs > 0 ? 1000 / avgMs : 0,
      longFrames: values.filter(value => value > 25).length
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { isSafariDesktop, computeFrameStats };
  }

  if (typeof window === 'undefined') return;

  const ua = (root.navigator && root.navigator.userAgent) || '';
  const safariDesktop = isSafariDesktop(ua);
  const waterApi = root.V091_VIRTOCEAN_WATER;
  const reflectiveWater = waterApi && waterApi.reflectiveWater;
  const originalOnBeforeRender = reflectiveWater && reflectiveWater.onBeforeRender;
  const reflectionIntervalMs = safariDesktop ? 1000 / 30 : 0;
  let reflectionThrottleActive = false;
  let reflectionCalls = 0;
  let reflectionRenders = 0;

  if (safariDesktop && reflectiveWater && typeof originalOnBeforeRender === 'function') {
    let lastReflectionMs = -Infinity;
    reflectiveWater.onBeforeRender = function v09931SafariReflectionThrottle(renderer, scene, camera) {
      reflectionCalls += 1;
      const now = performance.now();
      if (now - lastReflectionMs < reflectionIntervalMs) return;
      lastReflectionMs = now;
      reflectionRenders += 1;
      return originalOnBeforeRender.call(this, renderer, scene, camera);
    };
    reflectionThrottleActive = true;
  }

  const state = {
    safariDesktop,
    reflectionThrottleActive,
    reflectionTargetFps: reflectionThrottleActive ? 30 : 0,
    avgMs: 0,
    p95Ms: 0,
    maxMs: 0,
    fps: 0,
    longFrames: 0,
    sampleCount: 0,
    reflectionCalls: 0,
    reflectionRenders: 0
  };

  const hud = document.querySelector('.hud');
  let perfEl = document.querySelector('#frame-perf');
  if (hud && !perfEl) {
    const row = document.createElement('div');
    row.innerHTML = '效能 <span id="frame-perf">測量中…</span>';
    hud.appendChild(row);
    perfEl = row.querySelector('#frame-perf');
  }

  const samples = [];
  let lastFrameMs = performance.now();
  let lastPublishMs = lastFrameMs;

  function publish(now) {
    const stats = computeFrameStats(samples);
    state.avgMs = stats.avgMs;
    state.p95Ms = stats.p95Ms;
    state.maxMs = stats.maxMs;
    state.fps = stats.fps;
    state.longFrames = stats.longFrames;
    state.sampleCount = samples.length;
    state.reflectionCalls = reflectionCalls;
    state.reflectionRenders = reflectionRenders;

    if (perfEl) {
      const suffix = reflectionThrottleActive ? ' · 反射30' : '';
      perfEl.textContent = `${Math.round(stats.fps)} FPS · p95 ${stats.p95Ms.toFixed(1)}ms · >25ms ${stats.longFrames}${suffix}`;
    }
    lastPublishMs = now;
  }

  function frameTelemetry(now) {
    const delta = now - lastFrameMs;
    lastFrameMs = now;
    if (Number.isFinite(delta) && delta > 0 && delta < 1000) {
      samples.push(delta);
      if (samples.length > 180) samples.shift();
    }
    if (now - lastPublishMs >= 1000) publish(now);
    requestAnimationFrame(frameTelemetry);
  }
  requestAnimationFrame(frameTelemetry);

  root.V09931_SAFARI_PERFORMANCE = {
    version: 'V0.9.9.3.1',
    state,
    isSafariDesktop,
    computeFrameStats,
    reflectionThrottleFps: reflectionThrottleActive ? 30 : null,
    physicsCadenceUntouched: true,
    gameplaySurfaceUntouched: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
