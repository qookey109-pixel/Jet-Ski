// V0.11.4 Graphics Settings + Dynamic Quality runtime.
(function (root) {
  'use strict';

  const Core = root.JETSKI_QUALITY_CORE;
  if (!Core || typeof renderer === 'undefined') return;

  const VERSION = 'V0.11.4';
  const STORAGE = 'swimRing.graphics.v0114';
  const safariBudget = root.V09932_SAFARI_GPU_BUDGET;
  const safariDesktop = Boolean(safariBudget && safariBudget.budget && safariBudget.budget.safariDesktop);
  const state = {
    mode: 'auto',
    autoLevel: safariDesktop ? 'medium' : 'high',
    resolutionScale: 1,
    shadowOverride: null,
    motionEffects: true,
    appliedLevel: null,
    effectivePixelRatio: 1,
    reflectionSize: null,
    shadows: true,
    autoChanges: 0,
    lastReason: 'initial',
    badSeconds: 0,
    goodSeconds: 0
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null');
    if (saved && typeof saved === 'object') {
      state.mode = Core.normalizeMode(saved.mode);
      state.resolutionScale = Core.clamp(saved.resolutionScale == null ? 1 : saved.resolutionScale, 0.6, 1);
      state.shadowOverride = typeof saved.shadowOverride === 'boolean' ? saved.shadowOverride : null;
      state.motionEffects = saved.motionEffects !== false;
    }
  } catch (_) {}

  const motionStyle = document.createElement('style');
  motionStyle.textContent = `
    body.v0114-ui-motion-off .jr-countdown{animation:none!important}
    body.v0114-ui-motion-off .jr-btn,
    body.v0114-ui-motion-off .jr-toast{transition:none!important}
  `;
  document.head.appendChild(motionStyle);

  function applyMotionPreference() {
    document.body.classList.toggle('v0114-ui-motion-off', !state.motionEffects);
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify({
        mode: state.mode,
        resolutionScale: state.resolutionScale,
        shadowOverride: state.shadowOverride,
        motionEffects: state.motionEffects
      }));
    } catch (_) {}
  }

  function currentBudget() {
    return Core.buildBudget(
      state.mode,
      state.autoLevel,
      root.devicePixelRatio || 1,
      state.resolutionScale,
      safariDesktop,
      state.shadowOverride
    );
  }

  function applyBudget(reason) {
    const budget = currentBudget();
    renderer.setPixelRatio(budget.effectivePixelRatio);
    renderer.setSize(root.innerWidth, root.innerHeight);
    if (renderer.shadowMap) {
      renderer.shadowMap.enabled = Boolean(budget.shadows);
      if (budget.shadows) renderer.shadowMap.needsUpdate = true;
    }
    const waterApi = root.V091_VIRTOCEAN_WATER;
    if (waterApi && waterApi.renderTarget && typeof waterApi.renderTarget.setSize === 'function') {
      waterApi.renderTarget.setSize(budget.reflectionSize, budget.reflectionSize);
    }
    state.appliedLevel = budget.level;
    state.effectivePixelRatio = budget.effectivePixelRatio;
    state.reflectionSize = budget.reflectionSize;
    state.shadows = budget.shadows;
    state.lastReason = reason || 'manual';
    refreshUi();
    return budget;
  }

  function setMode(mode) {
    state.mode = Core.normalizeMode(mode);
    if (state.mode === 'auto' && !Core.PRESETS[state.autoLevel]) state.autoLevel = safariDesktop ? 'medium' : 'high';
    state.badSeconds = 0;
    state.goodSeconds = 0;
    persist();
    return applyBudget('mode');
  }

  function setResolutionScale(value) {
    state.resolutionScale = Core.clamp(value, 0.6, 1);
    persist();
    return applyBudget('resolution');
  }

  function setShadowOverride(value) {
    state.shadowOverride = value == null ? null : Boolean(value);
    persist();
    return applyBudget('shadow');
  }

  function setMotionEffects(value) {
    state.motionEffects = Boolean(value);
    applyMotionPreference();
    persist();
    refreshUi();
  }

  const panel = document.createElement('div');
  panel.setAttribute('aria-label', 'graphics settings');
  panel.style.cssText = [
    'position:fixed','inset:0','z-index:70','display:none','align-items:center','justify-content:center',
    'background:rgba(1,8,16,.72)','backdrop-filter:blur(10px)','-webkit-backdrop-filter:blur(10px)',
    'font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif','color:#fff'
  ].join(';');
  panel.innerHTML = `
    <div style="width:min(560px,88vw);padding:26px;border:1px solid rgba(255,255,255,.18);border-radius:22px;background:linear-gradient(145deg,rgba(5,28,45,.96),rgba(3,17,31,.94));box-shadow:0 30px 90px rgba(0,0,0,.42)">
      <div style="font-size:11px;font-weight:900;letter-spacing:.24em;color:#8fe9ff;margin-bottom:8px">GRAPHICS</div>
      <div style="font-size:30px;font-weight:950;margin-bottom:20px">Visual Quality</div>
      <div data-quality-modes style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px"></div>
      <label style="display:block;font-size:12px;font-weight:800;margin:12px 0 6px">Resolution Scale <span data-quality-scale-value></span></label>
      <input data-quality-scale type="range" min="0.6" max="1" step="0.05" style="width:100%">
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
        <button data-quality-shadow style="min-height:42px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-weight:850"></button>
        <button data-quality-motion style="min-height:42px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-weight:850"></button>
      </div>
      <div data-quality-status style="margin-top:18px;font-size:12px;line-height:1.6;opacity:.72"></div>
      <div style="display:flex;justify-content:flex-end;margin-top:22px"><button data-quality-close style="min-height:44px;padding:0 18px;border:0;border-radius:999px;background:linear-gradient(135deg,#10c8ff,#4a7dff);color:#fff;font-weight:900">Done</button></div>
    </div>`;
  document.body.appendChild(panel);

  const modesEl = panel.querySelector('[data-quality-modes]');
  const scaleEl = panel.querySelector('[data-quality-scale]');
  const scaleValueEl = panel.querySelector('[data-quality-scale-value]');
  const shadowButton = panel.querySelector('[data-quality-shadow]');
  const motionButton = panel.querySelector('[data-quality-motion]');
  const statusEl = panel.querySelector('[data-quality-status]');

  for (const mode of ['auto', 'low', 'medium', 'high', 'ultra']) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.qualityMode = mode;
    button.textContent = mode.toUpperCase();
    button.style.cssText = 'min-height:40px;padding:0 13px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.07);color:#fff;font-weight:850;cursor:pointer';
    button.addEventListener('click', () => setMode(mode));
    modesEl.appendChild(button);
  }

  scaleEl.addEventListener('input', () => setResolutionScale(Number(scaleEl.value)));
  shadowButton.addEventListener('click', () => {
    const next = state.shadowOverride == null ? !state.shadows : !state.shadowOverride;
    setShadowOverride(next);
  });
  motionButton.addEventListener('click', () => setMotionEffects(!state.motionEffects));
  panel.querySelector('[data-quality-close]').addEventListener('click', () => { panel.style.display = 'none'; });
  panel.addEventListener('click', event => { if (event.target === panel) panel.style.display = 'none'; });

  function openPanel() {
    panel.style.display = 'flex';
    refreshUi();
  }

  function installSettingsButtons() {
    const targets = [
      document.querySelector('[data-jr-screen="menu"] .jr-actions'),
      document.querySelector('[data-jr-screen="pause"] .jr-actions')
    ];
    for (const target of targets) {
      if (!target || target.querySelector('[data-quality-open]')) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'jr-btn';
      button.dataset.qualityOpen = '1';
      button.textContent = 'Settings';
      button.addEventListener('click', openPanel);
      target.appendChild(button);
    }
  }

  function refreshUi() {
    if (!modesEl) return;
    for (const button of modesEl.querySelectorAll('[data-quality-mode]')) {
      const active = button.dataset.qualityMode === state.mode;
      button.style.background = active ? 'linear-gradient(135deg,#10c8ff,#4a7dff)' : 'rgba(255,255,255,.07)';
      button.style.borderColor = active ? 'transparent' : 'rgba(255,255,255,.2)';
    }
    scaleEl.value = String(state.resolutionScale);
    scaleValueEl.textContent = `${Math.round(state.resolutionScale * 100)}%`;
    shadowButton.textContent = `Shadows: ${state.shadows ? 'ON' : 'OFF'}`;
    motionButton.textContent = `UI Motion: ${state.motionEffects ? 'ON' : 'OFF'}`;
    const safariNote = safariDesktop ? ' · Safari safety cap 1.15x / reflection 256' : '';
    const modeText = state.mode === 'auto' ? `AUTO → ${String(state.appliedLevel || state.autoLevel).toUpperCase()}` : String(state.appliedLevel || state.mode).toUpperCase();
    statusEl.textContent = `${modeText} · ${state.effectivePixelRatio.toFixed(2)}x · reflection ${state.reflectionSize || '—'} · ${state.shadows ? 'shadows' : 'no shadows'}${safariNote}`;
  }

  installSettingsButtons();
  applyMotionPreference();
  root.addEventListener('resize', () => applyBudget('resize'));

  let lastAutoCheck = performance.now();
  function autoTick(now) {
    if (state.mode === 'auto' && now - lastAutoCheck >= 1000) {
      const perf = root.V09931_SAFARI_PERFORMANCE && root.V09931_SAFARI_PERFORMANCE.state;
      if (perf && perf.sampleCount > 30) {
        const result = Core.nextAutoLevel(state.autoLevel, perf, state, (now - lastAutoCheck) / 1000);
        if (result.level !== state.autoLevel) {
          state.autoLevel = result.level;
          state.autoChanges += 1;
          applyBudget('auto');
        }
      }
      lastAutoCheck = now;
    }
    requestAnimationFrame(autoTick);
  }

  applyBudget('initial');
  requestAnimationFrame(autoTick);

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_QUALITY = {
    version: VERSION,
    state,
    openPanel,
    setMode,
    setResolutionScale,
    setShadowOverride,
    setMotionEffects,
    applyBudget,
    safariBaselinePreserved: true,
    physicsCadenceUntouched: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
