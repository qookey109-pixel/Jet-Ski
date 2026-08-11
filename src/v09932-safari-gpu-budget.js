// V0.9.9.3.2 Safari desktop GPU budget pass.
// Reduces Retina fill-rate / shadow / reflection target cost without changing gameplay or physics cadence.
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

  function chooseBudget(userAgent, devicePixelRatio) {
    const safariDesktop = isSafariDesktop(userAgent);
    return {
      safariDesktop,
      pixelRatioCap: safariDesktop ? 1.15 : Math.max(1, Number(devicePixelRatio) || 1),
      reflectionTargetSize: safariDesktop ? 256 : null,
      shadowTargetFps: safariDesktop ? 30 : null
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { isSafariDesktop, chooseBudget };
  }

  if (typeof window === 'undefined') return;

  const budget = chooseBudget((root.navigator && root.navigator.userAgent) || '', root.devicePixelRatio || 1);
  if (!budget.safariDesktop || typeof renderer === 'undefined') {
    root.V09932_SAFARI_GPU_BUDGET = { version: 'V0.9.9.3.2', active: false, budget };
    return;
  }

  function applyPixelRatioBudget() {
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, budget.pixelRatioCap));
    renderer.setSize(root.innerWidth, root.innerHeight);
  }

  applyPixelRatioBudget();
  root.addEventListener('resize', applyPixelRatioBudget);

  const waterApi = root.V091_VIRTOCEAN_WATER;
  if (waterApi && waterApi.renderTarget && typeof waterApi.renderTarget.setSize === 'function') {
    waterApi.renderTarget.setSize(budget.reflectionTargetSize, budget.reflectionTargetSize);
  }

  let shadowUpdates = 0;
  if (renderer.shadowMap && renderer.shadowMap.enabled) {
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    let lastShadowMs = -Infinity;
    const shadowIntervalMs = 1000 / budget.shadowTargetFps;
    function shadowBudgetTick(now) {
      if (now - lastShadowMs >= shadowIntervalMs) {
        renderer.shadowMap.needsUpdate = true;
        lastShadowMs = now;
        shadowUpdates += 1;
      }
      root.requestAnimationFrame(shadowBudgetTick);
    }
    root.requestAnimationFrame(shadowBudgetTick);
  }

  const hud = document.querySelector('.hud');
  let gpuEl = document.querySelector('#gpu-budget');
  if (hud && !gpuEl) {
    const row = document.createElement('div');
    row.innerHTML = 'GPU <span id="gpu-budget"></span>';
    hud.appendChild(row);
    gpuEl = row.querySelector('#gpu-budget');
  }
  if (gpuEl) gpuEl.textContent = `Safari ${budget.pixelRatioCap.toFixed(2)}x · 反射${budget.reflectionTargetSize} · 陰影${budget.shadowTargetFps}`;

  root.V09932_SAFARI_GPU_BUDGET = {
    version: 'V0.9.9.3.2',
    active: true,
    budget,
    get shadowUpdates() { return shadowUpdates; },
    physicsCadenceUntouched: true,
    gameplaySurfaceUntouched: true,
    steeringUntouched: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
