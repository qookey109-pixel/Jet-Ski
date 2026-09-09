// V0.11.16 hands-on acceptance helper.
// Observer-only: enabled only with ?accept=1 (or any accept query value).
(function (root) {
  'use strict';

  const VERSION = 'V0.11.16-A1';
  const CAPTURE_MS = 30000;
  const SAMPLE_MS = 250;

  const CHECKS = Object.freeze({
    SAFARI_DESKTOP: Object.freeze([
      ['bootMenu', '啟動 / 主選單正常'],
      ['controls', '操控 / 鏡頭 / Boost 正常'],
      ['championship', '完整 Championship 正常'],
      ['saveRecovery', '儲存 / 重載 / Recovery 正常'],
      ['visualAudio', '畫面 / 音效主觀正常']
    ]),
    MOBILE: Object.freeze([
      ['landscapeSafeArea', '橫向 / Safe Area 正常'],
      ['touchControls', '觸控轉向 / 油門 / 煞車 / Boost 正常'],
      ['raceHud', '比賽 HUD 無主要遮擋'],
      ['moreOverlays', '更多 / 各面板可正常開關'],
      ['noScrollZoom', '比賽中無誤捲動 / 誤縮放']
    ]),
    OTHER: Object.freeze([
      ['bootMenu', '啟動 / 主選單正常'],
      ['controls', '操控 / 鏡頭 / Boost 正常'],
      ['raceFlow', 'Race / Progression 流程正常'],
      ['visualAudio', '畫面 / 音效主觀正常']
    ])
  });

  function finite(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function detectDeviceContext(input) {
    const source = input || {};
    const ua = String(source.userAgent || '');
    const width = Math.max(0, finite(Number(source.width), 0));
    const height = Math.max(0, finite(Number(source.height), 0));
    const dpr = Math.max(0, finite(Number(source.dpr), 0));
    const touchPoints = Math.max(0, Math.floor(finite(Number(source.touchPoints), 0)));
    const safari = /Safari\//.test(ua) && /AppleWebKit\//.test(ua);
    const chromium = /(Chrome|Chromium|CriOS|Edg|OPR)\//.test(ua);
    const appleMobile = /(iPhone|iPad|iPod)/.test(ua);
    const android = /Android/.test(ua);
    const touchMobileLike = appleMobile || android || touchPoints > 0;
    const safariDesktop = safari && !chromium && !touchMobileLike;
    const smallViewport = width > 0 && height > 0 && Math.min(width, height) <= 600;
    const mobileLike = touchMobileLike || (!safariDesktop && smallViewport);
    return {
      mode: safariDesktop ? 'SAFARI_DESKTOP' : mobileLike ? 'MOBILE' : 'OTHER',
      safariDesktop,
      appleMobile,
      mobileLike,
      userAgent: ua,
      width,
      height,
      dpr,
      touchPoints,
      orientation: width && height ? (width >= height ? 'landscape' : 'portrait') : 'unknown'
    };
  }

  function summarizePerformance(samples) {
    const list = Array.isArray(samples) ? samples.filter(Boolean) : [];
    const fps = list.map(sample => finite(sample.fps, 0)).filter(value => value > 0);
    const p95 = list.map(sample => finite(sample.p95Ms, 0)).filter(value => value > 0);
    const maxMs = list.map(sample => finite(sample.maxMs, 0)).filter(value => value > 0);
    const longFrames = list.map(sample => Math.max(0, Math.floor(finite(sample.longFrames, 0))));
    return {
      sampleCount: list.length,
      perfSampleCount: fps.length,
      fpsAvg: fps.length ? fps.reduce((sum, value) => sum + value, 0) / fps.length : 0,
      fpsMin: fps.length ? Math.min(...fps) : 0,
      p95MaxMs: p95.length ? Math.max(...p95) : 0,
      frameMaxMs: maxMs.length ? Math.max(...maxMs) : 0,
      longFramesMax: longFrames.length ? Math.max(...longFrames) : 0
    };
  }

  function requiredChecks(mode) {
    const rows = CHECKS[mode] || CHECKS.OTHER;
    return rows.map(row => row[0]);
  }

  function evaluateCandidate(context, perf, observations) {
    const reasons = [];
    const mode = context && context.mode ? context.mode : 'OTHER';
    if (!perf || perf.perfSampleCount < 8) reasons.push('performance-samples-insufficient');
    for (const key of requiredChecks(mode)) {
      const value = observations && observations[key];
      if (value !== true) reasons.push(value === false ? `check-${key}-review` : `check-${key}-unconfirmed`);
    }
    if (mode === 'MOBILE' && context && context.orientation !== 'landscape') reasons.push('mobile-not-landscape');
    return { gate: reasons.length ? 'REVIEW' : 'CANDIDATE_PASS', reasons };
  }

  function formatReceipt(payload) {
    const data = payload || {};
    const context = data.context || {};
    const perf = data.performance || {};
    const observations = data.observations || {};
    const evaluation = data.evaluation || evaluateCandidate(context, perf, observations);
    const rows = CHECKS[context.mode] || CHECKS.OTHER;
    const checks = rows.map(row => {
      const value = observations[row[0]];
      return `${row[0]}=${value === true ? 'PASS' : value === false ? 'REVIEW' : 'UNCONFIRMED'}`;
    }).join(' · ');
    const reasons = evaluation.reasons && evaluation.reasons.length ? ` · ${evaluation.reasons.join(',')}` : '';
    return [
      `Jet-Ski ${VERSION} Hands-on Acceptance`,
      `RELEASE: ${data.releaseVersion || 'unknown'} · mode ${context.mode || 'OTHER'} · ${context.orientation || 'unknown'} ${context.width || 0}x${context.height || 0} · DPR ${finite(context.dpr, 0).toFixed(2)} · touch ${context.touchPoints || 0}`,
      `DEVICE: safariDesktop=${Boolean(context.safariDesktop)} · appleMobile=${Boolean(context.appleMobile)}`,
      `PERF: samples ${perf.perfSampleCount || 0} · FPS avg ${finite(perf.fpsAvg, 0).toFixed(1)} · min ${finite(perf.fpsMin, 0).toFixed(1)} · p95 max ${finite(perf.p95MaxMs, 0).toFixed(1)}ms · frame max ${finite(perf.frameMaxMs, 0).toFixed(1)}ms · >25ms ${perf.longFramesMax || 0}`,
      `CHECKS: ${checks}`,
      `CANDIDATE: ${evaluation.gate}${reasons}`,
      `UA: ${context.userAgent || 'unknown'}`,
      'NOTE: CANDIDATE_PASS is not formal repository acceptance. Formal Safari/mobile acceptance requires the user to report the real-device result.'
    ].join('\n');
  }

  const pureApi = {
    VERSION,
    CAPTURE_MS,
    SAMPLE_MS,
    CHECKS,
    detectDeviceContext,
    summarizePerformance,
    requiredChecks,
    evaluateCandidate,
    formatReceipt
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = pureApi;
  if (typeof window === 'undefined') return;

  let enabled = false;
  try {
    enabled = new URLSearchParams(root.location && root.location.search || '').has('accept');
  } catch (_) {}

  if (!enabled) {
    root.JETSKI_HANDS_ON_ACCEPTANCE = Object.assign({}, pureApi, {
      available: false,
      observerOnly: true,
      reason: 'enable-with-accept-query'
    });
    return;
  }

  const context = detectDeviceContext({
    userAgent: root.navigator && root.navigator.userAgent,
    width: root.innerWidth,
    height: root.innerHeight,
    dpr: root.devicePixelRatio,
    touchPoints: root.navigator && root.navigator.maxTouchPoints
  });
  const perfApi = root.V09931_SAFARI_PERFORMANCE;
  const observations = {};
  const samples = [];
  let capturing = false;
  let collapsed = false;
  let captureTimer = null;
  let finishTimer = null;

  const panel = document.createElement('div');
  panel.id = 'hands-on-acceptance';
  panel.style.cssText = [
    'position:fixed', 'right:max(8px,env(safe-area-inset-right))', 'bottom:max(8px,env(safe-area-inset-bottom))',
    'z-index:30', 'width:min(430px,calc(100vw - 16px))', 'max-height:min(78vh,560px)', 'overflow:auto',
    'padding:10px', 'border:1px solid rgba(255,255,255,.22)', 'border-radius:14px',
    'background:rgba(0,18,30,.88)', 'backdrop-filter:blur(10px)', 'color:#fff',
    'font:600 12px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'box-shadow:0 10px 30px rgba(0,0,0,.28)'
  ].join(';');
  document.body.appendChild(panel);

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px';
  panel.appendChild(header);

  const title = document.createElement('div');
  title.textContent = `實機驗收 ${VERSION}`;
  title.style.cssText = 'font-weight:850;font-size:13px;white-space:nowrap';
  header.appendChild(title);

  const collapseButton = document.createElement('button');
  collapseButton.type = 'button';
  collapseButton.textContent = '縮小';
  collapseButton.style.cssText = [
    'min-height:26px', 'padding:0 7px', 'border-radius:8px', 'border:1px solid rgba(255,255,255,.2)',
    'background:rgba(255,255,255,.08)', 'color:#fff', 'font:750 11px system-ui', 'cursor:pointer'
  ].join(';');
  header.appendChild(collapseButton);

  const content = document.createElement('div');
  content.style.cssText = 'margin-top:5px';
  panel.appendChild(content);

  const deviceLine = document.createElement('div');
  deviceLine.textContent = `${context.mode} · ${context.orientation} ${context.width}×${context.height} · DPR ${context.dpr.toFixed(2)}`;
  deviceLine.style.cssText = 'opacity:.82;margin-bottom:7px';
  content.appendChild(deviceLine);

  const status = document.createElement('div');
  status.textContent = '先完成下方實機檢查，再記錄 30 秒效能。';
  status.style.cssText = 'margin-bottom:8px;color:#d8f4ff';
  content.appendChild(status);

  const checklist = document.createElement('div');
  checklist.style.cssText = 'display:grid;gap:5px;margin-bottom:8px';
  content.appendChild(checklist);

  const rows = CHECKS[context.mode] || CHECKS.OTHER;
  for (const row of rows) {
    const key = row[0];
    const item = document.createElement('button');
    item.type = 'button';
    item.dataset.acceptanceKey = key;
    item.style.cssText = [
      'min-height:34px', 'padding:5px 8px', 'text-align:left', 'border-radius:9px',
      'border:1px solid rgba(255,255,255,.2)', 'background:rgba(255,255,255,.07)',
      'color:#fff', 'font:700 12px system-ui', 'cursor:pointer'
    ].join(';');
    function render() {
      const value = observations[key];
      const prefix = value === true ? '✓' : value === false ? '⚠' : '○';
      const suffix = value === true ? '正常' : value === false ? '有問題' : '未確認';
      item.textContent = `${prefix} ${row[1]} · ${suffix}`;
    }
    item.addEventListener('click', () => {
      const value = observations[key];
      observations[key] = value === undefined ? true : value === true ? false : undefined;
      render();
    });
    render();
    checklist.appendChild(item);
  }

  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
  content.appendChild(controls);

  function addButton(label, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.style.cssText = [
      'min-height:32px', 'padding:0 9px', 'border-radius:9px', 'border:1px solid rgba(255,255,255,.24)',
      'background:rgba(0,110,160,.34)', 'color:#fff', 'font-weight:800', 'cursor:pointer'
    ].join(';');
    button.addEventListener('click', handler);
    controls.appendChild(button);
    return button;
  }

  function setCollapsed(next) {
    collapsed = Boolean(next);
    content.hidden = collapsed;
    collapseButton.textContent = collapsed ? '展開' : '縮小';
    panel.style.width = collapsed ? 'auto' : 'min(430px,calc(100vw - 16px))';
    panel.style.maxHeight = collapsed ? 'none' : 'min(78vh,560px)';
    panel.style.overflow = collapsed ? 'visible' : 'auto';
    panel.style.padding = collapsed ? '6px 8px' : '10px';
    if (collapsed && context.mode === 'MOBILE') {
      panel.style.bottom = 'auto';
      panel.style.top = 'max(8px,env(safe-area-inset-top))';
      panel.style.right = 'max(8px,env(safe-area-inset-right))';
    } else {
      panel.style.top = 'auto';
      panel.style.bottom = 'max(8px,env(safe-area-inset-bottom))';
      panel.style.right = 'max(8px,env(safe-area-inset-right))';
    }
  }

  collapseButton.addEventListener('click', () => setCollapsed(!collapsed));

  function readPerfSample() {
    const state = perfApi && perfApi.state ? perfApi.state : {};
    return {
      fps: finite(state.fps, 0),
      p95Ms: finite(state.p95Ms, 0),
      maxMs: finite(state.maxMs, 0),
      longFrames: finite(state.longFrames, 0)
    };
  }

  function stopCapture() {
    if (!capturing) return;
    clearInterval(captureTimer);
    clearTimeout(finishTimer);
    captureTimer = null;
    finishTimer = null;
    samples.push(readPerfSample());
    capturing = false;
    const perf = summarizePerformance(samples);
    const evaluation = evaluateCandidate(context, perf, observations);
    title.textContent = `實機驗收 ${VERSION}`;
    setCollapsed(false);
    status.textContent = `30 秒完成 · ${evaluation.gate} · ${perf.fpsAvg.toFixed(0)} FPS · p95 ${perf.p95MaxMs.toFixed(1)}ms`;
  }

  function startCapture() {
    if (capturing) return;
    samples.length = 0;
    samples.push(readPerfSample());
    capturing = true;
    status.textContent = '正在記錄 30 秒效能…請正常遊玩，不要切換分頁。';
    title.textContent = '● 記錄中 30 秒';
    if (context.mode === 'MOBILE') setCollapsed(true);
    captureTimer = setInterval(() => samples.push(readPerfSample()), SAMPLE_MS);
    finishTimer = setTimeout(stopCapture, CAPTURE_MS);
  }

  function reset() {
    if (capturing) stopCapture();
    samples.length = 0;
    for (const key of Object.keys(observations)) delete observations[key];
    checklist.querySelectorAll('button').forEach(button => {
      const key = button.dataset.acceptanceKey;
      const row = rows.find(entry => entry[0] === key);
      if (row) button.textContent = `○ ${row[1]} · 未確認`;
    });
    title.textContent = `實機驗收 ${VERSION}`;
    setCollapsed(false);
    status.textContent = '已重設。';
  }

  function currentPayload() {
    const performance = summarizePerformance(samples);
    return {
      releaseVersion: root.JETSKI_RELEASE && root.JETSKI_RELEASE.version || 'V0.11.16',
      context,
      performance,
      observations: Object.assign({}, observations),
      evaluation: evaluateCandidate(context, performance, observations)
    };
  }

  async function copyReceipt() {
    const text = formatReceipt(currentPayload());
    try {
      await root.navigator.clipboard.writeText(text);
      status.textContent = 'Receipt 已複製 ✓';
    } catch (_) {
      root.prompt('Copy hands-on acceptance receipt', text);
    }
  }

  addButton('▶ 記錄 30 秒', startCapture);
  addButton('Copy Receipt', copyReceipt);
  addButton('↻ 重設', reset);

  root.JETSKI_HANDS_ON_ACCEPTANCE = Object.assign({}, pureApi, {
    available: true,
    observerOnly: true,
    physicsWrites: false,
    gameplayWrites: false,
    storageWrites: false,
    context,
    observations,
    samples,
    startCapture,
    stopCapture,
    reset,
    copyReceipt,
    setCollapsed,
    currentPayload,
    get capturing() { return capturing; },
    get collapsed() { return collapsed; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
