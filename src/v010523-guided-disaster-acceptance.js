// V0.10.5.2.3 Guided Disaster Acceptance.
// Guides the user through existing disaster controls and observer-only captures.
(function (root) {
  'use strict';

  const VERSION = 'V0.10.5.2.3';
  const REQUIRED_STAGES = Object.freeze(['BASELINE', 'ROGUE', 'TSUNAMI', 'LIGHTNING', 'RAIN']);
  const VISUAL_STAGES = Object.freeze(['ROGUE', 'TSUNAMI', 'LIGHTNING', 'RAIN']);

  function latestRecordFor(records, label) {
    const list = Array.isArray(records) ? records : [];
    for (let i = list.length - 1; i >= 0; i--) {
      const record = list[i];
      if (record && record.summary && record.summary.label === label) return record;
    }
    return null;
  }

  function evaluateGuidedAcceptance(records, observations) {
    const reasons = [];
    const stages = {};
    for (const label of REQUIRED_STAGES) {
      const record = latestRecordFor(records, label);
      stages[label] = record;
      if (!record) reasons.push(`missing-${label.toLowerCase()}`);
      else if (record.gate !== 'PASS') reasons.push(`capture-${label.toLowerCase()}-${String(record.gate || 'review').toLowerCase()}`);
    }
    const seen = observations || {};
    for (const label of VISUAL_STAGES) {
      if (seen[label] !== true) reasons.push(`visual-${label.toLowerCase()}-unconfirmed`);
    }
    return { gate: reasons.length ? 'REVIEW' : 'PASS', reasons, stages };
  }

  function formatGuidedReceipt(captureReceipt, records, observations) {
    const evaluation = evaluateGuidedAcceptance(records, observations);
    const seen = observations || {};
    const visual = VISUAL_STAGES.map(label => `${label}=${seen[label] === true ? 'PASS' : seen[label] === false ? 'REVIEW' : 'UNCONFIRMED'}`).join(' · ');
    const reasons = evaluation.reasons.length ? ` · ${evaluation.reasons.join(',')}` : '';
    return [
      captureReceipt || `Jet-Ski ${VERSION} Guided Acceptance`,
      `GUIDED: ${evaluation.gate}${reasons}`,
      `USER VISUAL: ${visual}`,
      'NOTE: Guided PASS is a browser candidate only; formal repository acceptance still requires the user to report the result.'
    ].join('\n');
  }

  const pureApi = { VERSION, REQUIRED_STAGES, VISUAL_STAGES, latestRecordFor, evaluateGuidedAcceptance, formatGuidedReceipt };
  if (typeof module !== 'undefined' && module.exports) module.exports = pureApi;
  if (typeof window === 'undefined') return;

  const disasters = root.V01052_NATURAL_DISASTERS;
  const capture = root.V010522_DISASTER_ACCEPTANCE_CAPTURE;
  if (!disasters || disasters.available !== true || !capture || capture.available !== true) {
    root.V010523_GUIDED_DISASTER_ACCEPTANCE = Object.assign({}, pureApi, {
      available: false,
      reason: 'disaster-or-capture-layer-unavailable'
    });
    return;
  }

  const state = {
    running: false,
    step: 'IDLE',
    observations: {},
    startedLabels: {},
    lastRecordCount: 0,
    completed: false
  };

  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed', 'right:14px', 'top:228px', 'z-index:9', 'display:flex', 'gap:5px',
    'align-items:center', 'flex-wrap:wrap', 'justify-content:flex-end', 'max-width:min(560px,82vw)',
    'padding:5px', 'border-radius:12px', 'background:rgba(0,20,32,.48)',
    'backdrop-filter:blur(8px)', 'user-select:none'
  ].join(';');
  document.body.appendChild(panel);

  const status = document.createElement('span');
  status.textContent = 'Guided test ready';
  status.style.cssText = 'padding:0 5px;font:700 12px system-ui;color:#fff;white-space:nowrap';
  panel.appendChild(status);

  function addButton(label, handler) {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = label;
    el.style.cssText = [
      'min-height:30px', 'padding:0 8px', 'border:1px solid rgba(255,255,255,.28)',
      'border-radius:9px', 'background:rgba(0,27,43,.62)', 'color:#fff',
      'font-weight:750', 'cursor:pointer', 'white-space:nowrap'
    ].join(';');
    el.addEventListener('click', handler);
    panel.appendChild(el);
    return el;
  }

  let currentObservationLabel = null;
  const yesButton = addButton('✓ 看到了/正常', () => recordObservation(true));
  const noButton = addButton('⚠ 有問題', () => recordObservation(false));
  yesButton.hidden = true;
  noButton.hidden = true;

  function setObservationPrompt(label, text) {
    currentObservationLabel = label;
    status.textContent = text;
    yesButton.hidden = false;
    noButton.hidden = false;
  }

  function hideObservationButtons() {
    currentObservationLabel = null;
    yesButton.hidden = true;
    noButton.hidden = true;
  }

  function stageState() {
    const s = disasters.state || {};
    return {
      baseline: !s.rogue && !s.tsunami && !s.lightning && !s.rain,
      rogueOnly: Boolean(s.rogue) && !s.tsunami,
      tsunamiOnly: Boolean(s.tsunami) && !s.rogue,
      lightning: Boolean(s.lightning),
      rain: Boolean(s.rain)
    };
  }

  function tryStartCapture(label) {
    if (capture.capturing || state.startedLabels[label]) return false;
    state.startedLabels[label] = true;
    capture.startCapture();
    status.textContent = `${label} recording 8s…`;
    return true;
  }

  function recordObservation(ok) {
    if (!currentObservationLabel) return;
    const label = currentObservationLabel;
    state.observations[label] = Boolean(ok);
    hideObservationButtons();
    if (label === 'ROGUE') {
      state.step = 'WAIT_TSUNAMI';
      status.textContent = '按 0 Clear，再按 5 Tsunami';
    } else if (label === 'TSUNAMI') {
      state.step = 'WAIT_LIGHTNING';
      status.textContent = '按 0 Clear，再按 6 Lightning';
    } else if (label === 'LIGHTNING') {
      state.step = 'WAIT_RAIN';
      status.textContent = '按 0 Clear，再按 7 Rain';
    } else if (label === 'RAIN') {
      finishGuided();
    }
  }

  function startGuided() {
    if (state.running) return;
    capture.reset();
    state.running = true;
    state.completed = false;
    state.step = 'WAIT_BASELINE';
    state.observations = {};
    state.startedLabels = {};
    state.lastRecordCount = 0;
    hideObservationButtons();
    status.textContent = '先按 0 Clear；等待 Baseline…';
  }

  function resetGuided() {
    state.running = false;
    state.completed = false;
    state.step = 'IDLE';
    state.observations = {};
    state.startedLabels = {};
    state.lastRecordCount = capture.records.length;
    hideObservationButtons();
    status.textContent = 'Guided test ready';
  }

  function finishGuided() {
    state.running = false;
    state.completed = true;
    state.step = 'DONE';
    const evaluation = evaluateGuidedAcceptance(capture.records, state.observations);
    status.textContent = `Guided ${evaluation.gate} · 按 Copy Guided`;
  }

  async function copyGuided() {
    const base = capture.formatReceipt(capture.records);
    const text = formatGuidedReceipt(base, capture.records, state.observations);
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'Guided receipt copied ✓';
    } catch (_) {
      window.prompt('Copy guided acceptance receipt', text);
    }
  }

  addButton('▶ Guided Test', startGuided);
  addButton('↻ Guided Reset', resetGuided);
  addButton('Copy Guided', copyGuided);

  function onCaptureFinished(label) {
    if (label === 'BASELINE') {
      state.step = 'WAIT_ROGUE';
      status.textContent = 'Baseline 完成 · 按 4 Rogue';
    } else if (label === 'ROGUE') {
      state.step = 'CONFIRM_ROGUE';
      setObservationPrompt('ROGUE', 'Rogue：浪有看到，而且船跟著浪？');
    } else if (label === 'TSUNAMI') {
      state.step = 'CONFIRM_TSUNAMI';
      setObservationPrompt('TSUNAMI', 'Tsunami：浪有看到，而且船跟著浪？');
    } else if (label === 'LIGHTNING') {
      state.step = 'CONFIRM_LIGHTNING';
      setObservationPrompt('LIGHTNING', 'Lightning：有看到閃電，而且沒有明顯卡頓？');
    } else if (label === 'RAIN') {
      state.step = 'CONFIRM_RAIN';
      setObservationPrompt('RAIN', 'Rain：有看到雨，而且沒有明顯卡頓？');
    }
  }

  function monitor() {
    if (!state.running) return;
    const s = stageState();

    if (state.step === 'WAIT_BASELINE' && s.baseline) tryStartCapture('BASELINE');
    else if (state.step === 'WAIT_ROGUE' && s.rogueOnly) tryStartCapture('ROGUE');
    else if (state.step === 'WAIT_TSUNAMI') {
      if (s.tsunamiOnly) tryStartCapture('TSUNAMI');
      else if ((disasters.state || {}).tsunami && (disasters.state || {}).rogue) status.textContent = 'Rogue 還在：先按 0 Clear，再按 5 Tsunami';
    } else if (state.step === 'WAIT_LIGHTNING' && s.lightning) tryStartCapture('LIGHTNING');
    else if (state.step === 'WAIT_RAIN' && s.rain) tryStartCapture('RAIN');

    if (capture.records.length > state.lastRecordCount) {
      const record = capture.records[capture.records.length - 1];
      state.lastRecordCount = capture.records.length;
      if (record && record.summary) onCaptureFinished(record.summary.label);
    }
  }

  const interval = setInterval(monitor, 150);

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.V010523_GUIDED_DISASTER_ACCEPTANCE = Object.assign({}, pureApi, {
    available: true,
    observerOnly: true,
    eventWrites: false,
    physicsWrites: false,
    waterWrites: false,
    state,
    startGuided,
    resetGuided,
    copyGuided,
    interval
  });
})(typeof window !== 'undefined' ? window : globalThis);
