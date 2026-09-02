// V0.10.5.2.2 Disaster Acceptance Capture.
// Observer-only helper: records existing sync/performance telemetry for browser acceptance.
(function (root) {
  'use strict';

  const VERSION = 'V0.10.5.2.2';
  const CAPTURE_MS = 8000;
  const SAMPLE_MS = 250;

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function inferStage(disasterState) {
    const state = disasterState || {};
    if (state.tsunami) return 'TSUNAMI';
    if (state.rogue) return 'ROGUE';
    if (state.lightning) return 'LIGHTNING';
    if (state.rain) return 'RAIN';
    return 'BASELINE';
  }

  function summarizeCapture(samples, label) {
    const list = Array.isArray(samples) ? samples.filter(Boolean) : [];
    if (!list.length) {
      return {
        label: label || 'UNKNOWN',
        sampleCount: 0,
        cpuSyncPass: false,
        visualSyncPass: false,
        eventPeakM: 0,
        craftClearanceMinM: 0,
        craftClearanceMaxM: 0,
        fpsAvg: 0,
        p95MaxMs: 0,
        longFramesMax: 0,
        hydroMode: 'unknown'
      };
    }

    let cpuSyncPass = true;
    let visualSyncPass = true;
    let eventPeakM = 0;
    let clearanceMin = Infinity;
    let clearanceMax = -Infinity;
    let fpsSum = 0;
    let fpsCount = 0;
    let p95MaxMs = 0;
    let longFramesMax = 0;
    let hydroMode = 'unknown';

    for (const sample of list) {
      if (sample.cpuEventMatch === false) cpuSyncPass = false;
      if (sample.waterEventActive && !sample.shaderPatchInstalled) visualSyncPass = false;
      eventPeakM = Math.max(eventPeakM, Math.abs(finite(sample.sampledEventHeight, 0)));
      const clearance = finite(sample.craftAboveSurface, 0);
      clearanceMin = Math.min(clearanceMin, clearance);
      clearanceMax = Math.max(clearanceMax, clearance);
      if (Number.isFinite(sample.fps) && sample.fps > 0) {
        fpsSum += sample.fps;
        fpsCount += 1;
      }
      p95MaxMs = Math.max(p95MaxMs, finite(sample.p95Ms, 0));
      longFramesMax = Math.max(longFramesMax, finite(sample.longFrames, 0));
      if (sample.hydroMode) hydroMode = String(sample.hydroMode);
    }

    return {
      label: label || 'UNKNOWN',
      sampleCount: list.length,
      cpuSyncPass,
      visualSyncPass,
      eventPeakM,
      craftClearanceMinM: clearanceMin === Infinity ? 0 : clearanceMin,
      craftClearanceMaxM: clearanceMax === -Infinity ? 0 : clearanceMax,
      fpsAvg: fpsCount ? fpsSum / fpsCount : 0,
      p95MaxMs,
      longFramesMax,
      hydroMode
    };
  }

  function evaluateCapture(summary, baseline) {
    if (!summary || summary.sampleCount < 8) return { gate: 'REVIEW', reasons: ['insufficient-samples'] };
    const reasons = [];
    if (!summary.cpuSyncPass) reasons.push('cpu-sync');
    if (!summary.visualSyncPass) reasons.push('visual-sync');
    if ((summary.label === 'ROGUE' || summary.label === 'TSUNAMI') && summary.eventPeakM < 0.1) {
      reasons.push('event-not-observed');
    }

    if (baseline && baseline.sampleCount >= 8 && summary.label !== 'BASELINE') {
      if (baseline.fpsAvg > 0 && summary.fpsAvg > 0 && summary.fpsAvg < baseline.fpsAvg * 0.75) {
        reasons.push('fps-regression');
      }
      const allowedP95 = Math.max(baseline.p95MaxMs * 1.35, baseline.p95MaxMs + 8);
      if (baseline.p95MaxMs > 0 && summary.p95MaxMs > allowedP95) reasons.push('p95-regression');
      if (summary.longFramesMax > baseline.longFramesMax + 5) reasons.push('long-frame-regression');
    }

    return { gate: reasons.length ? 'REVIEW' : 'PASS', reasons };
  }

  function formatReceipt(records) {
    const list = Array.isArray(records) ? records : [];
    const lines = [`Jet-Ski ${VERSION} Disaster Acceptance Capture`];
    for (const record of list) {
      const summary = record.summary || record;
      const gate = record.gate || 'REVIEW';
      const reasons = record.reasons && record.reasons.length ? ` · ${record.reasons.join(',')}` : '';
      lines.push(
        `${summary.label}: ${gate}${reasons} · samples ${summary.sampleCount}`
        + ` · CPU ${summary.cpuSyncPass ? 'PASS' : 'REVIEW'}`
        + ` · VIS ${summary.visualSyncPass ? 'PASS' : 'REVIEW'}`
        + ` · eventPeak ${summary.eventPeakM.toFixed(2)}m`
        + ` · craft ${summary.craftClearanceMinM.toFixed(2)}..${summary.craftClearanceMaxM.toFixed(2)}m`
        + ` · FPS ${summary.fpsAvg.toFixed(1)}`
        + ` · p95 ${summary.p95MaxMs.toFixed(1)}ms`
        + ` · >25ms ${summary.longFramesMax}`
        + ` · ${summary.hydroMode}`
      );
    }
    return lines.join('\n');
  }

  const pureApi = { VERSION, CAPTURE_MS, SAMPLE_MS, inferStage, summarizeCapture, evaluateCapture, formatReceipt };
  if (typeof module !== 'undefined' && module.exports) module.exports = pureApi;
  if (typeof window === 'undefined') return;

  const diagnostics = root.V010521_DISASTER_SYNC_DIAGNOSTICS;
  const disasters = root.V01052_NATURAL_DISASTERS;
  const perfApi = root.V09931_SAFARI_PERFORMANCE;
  if (!diagnostics || diagnostics.available !== true || !disasters || disasters.available !== true) {
    root.V010522_DISASTER_ACCEPTANCE_CAPTURE = Object.assign({}, pureApi, {
      available: false,
      reason: 'diagnostics-or-disaster-layer-unavailable'
    });
    return;
  }

  const records = [];
  let capturing = false;
  let captureTimer = null;
  let finishTimer = null;
  let activeSamples = [];
  let activeLabel = 'BASELINE';

  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed', 'right:14px', 'top:180px', 'z-index:9', 'display:flex', 'gap:5px',
    'flex-wrap:wrap', 'justify-content:flex-end', 'max-width:min(470px,78vw)', 'padding:5px',
    'border-radius:12px', 'background:rgba(0,20,32,.42)', 'backdrop-filter:blur(8px)', 'user-select:none'
  ].join(';');
  document.body.appendChild(panel);

  const status = document.createElement('span');
  status.textContent = 'Capture ready';
  status.style.cssText = 'align-self:center;padding:0 5px;font:700 12px system-ui;color:#fff;white-space:nowrap';
  panel.appendChild(status);

  function button(label, handler) {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = label;
    el.style.cssText = [
      'min-height:30px', 'padding:0 8px', 'border:1px solid rgba(255,255,255,.28)',
      'border-radius:9px', 'background:rgba(0,27,43,.62)', 'color:#fff', 'font-weight:750', 'cursor:pointer'
    ].join(';');
    el.addEventListener('click', handler);
    panel.appendChild(el);
    return el;
  }

  function readSample() {
    const d = diagnostics.state || {};
    const p = perfApi && perfApi.state ? perfApi.state : {};
    const waterEventActive = Boolean(disasters.state && (disasters.state.tsunami || disasters.state.rogue));
    return {
      cpuEventMatch: d.cpuEventMatch !== false,
      shaderPatchInstalled: Boolean(d.shaderPatchInstalled),
      waterEventActive,
      sampledEventHeight: finite(d.sampledEventHeight, 0),
      craftAboveSurface: finite(d.craftAboveSurface, 0),
      hydroMode: d.hydroMode || 'unknown',
      fps: finite(p.fps, 0),
      p95Ms: finite(p.p95Ms, 0),
      longFrames: finite(p.longFrames, 0)
    };
  }

  function latestBaseline() {
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].summary && records[i].summary.label === 'BASELINE') return records[i].summary;
    }
    return null;
  }

  function finishCapture() {
    if (!capturing) return;
    clearInterval(captureTimer);
    clearTimeout(finishTimer);
    captureTimer = null;
    finishTimer = null;
    activeSamples.push(readSample());
    const summary = summarizeCapture(activeSamples, activeLabel);
    const evaluation = evaluateCapture(summary, latestBaseline());
    records.push({ summary, gate: evaluation.gate, reasons: evaluation.reasons });
    capturing = false;
    status.textContent = `${summary.label} ${evaluation.gate} · ${summary.fpsAvg.toFixed(0)} FPS · p95 ${summary.p95MaxMs.toFixed(1)}ms`;
  }

  function startCapture() {
    if (capturing) return;
    activeLabel = inferStage(disasters.state);
    activeSamples = [readSample()];
    capturing = true;
    status.textContent = `${activeLabel} recording 8s…`;
    captureTimer = setInterval(() => activeSamples.push(readSample()), SAMPLE_MS);
    finishTimer = setTimeout(finishCapture, CAPTURE_MS);
  }

  function reset() {
    if (capturing) finishCapture();
    records.length = 0;
    status.textContent = 'Capture ready';
  }

  async function copyReceipt() {
    const text = formatReceipt(records);
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'Receipt copied ✓';
    } catch (_) {
      window.prompt('Copy acceptance receipt', text);
    }
  }

  button('📋 Capture 8s', startCapture);
  button('↻ Reset', reset);
  button('Copy', copyReceipt);

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.V010522_DISASTER_ACCEPTANCE_CAPTURE = Object.assign({}, pureApi, {
    available: true,
    observerOnly: true,
    physicsWrites: false,
    waterWrites: false,
    records,
    startCapture,
    finishCapture,
    reset,
    copyReceipt,
    get capturing() { return capturing; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
