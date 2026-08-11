// V0.9.8.2 Marine Physics Lab UI/runtime. The validated 9-point model remains default;
// Voxel mode can be enabled live without changing ocean/world-mode code.
(function () {
  'use strict';

  const physicsApi = window.JETSKI_PHYSICS && window.JETSKI_PHYSICS.hydroModel;
  if (!physicsApi || typeof physicsApi.setMode !== 'function') return;

  const version = 'V0.9.8.2';
  const buttons = [...document.querySelectorAll('[data-hydro-mode]')];
  const hud = document.querySelector('.hud');
  const row = document.createElement('div');
  row.innerHTML = '船體物理 <span id="marine-physics-state">9-Point</span>';
  if (hud) hud.appendChild(row);
  const stateEl = row.querySelector('#marine-physics-state');
  let lastDiagUpdate = 0;

  function labelFor(mode) {
    return mode === 'voxel' ? 'Voxel 24-cell' : '9-Point';
  }

  function updateUi() {
    const mode = physicsApi.mode || 'nine-point';
    for (const button of buttons) {
      button.classList.toggle('active', button.dataset.hydroMode === mode);
    }
    if (stateEl) stateEl.textContent = labelFor(mode);
  }

  function setMode(mode) {
    physicsApi.setMode(mode);
    updateUi();
  }

  for (const button of buttons) {
    button.addEventListener('click', () => setMode(button.dataset.hydroMode));
  }

  window.addEventListener('keydown', event => {
    if (event.repeat || event.code !== 'KeyP') return;
    physicsApi.toggleMode();
    updateUi();
  });

  // Reuse the existing frame path for low-rate diagnostics; no extra RAF loop.
  if (typeof updateWater === 'function') {
    const previousUpdateWater = updateWater;
    updateWater = function v098MarinePhysicsHud(t) {
      previousUpdateWater(t);
      if (!stateEl || t - lastDiagUpdate < 0.25) return;
      lastDiagUpdate = t;
      const d = physicsApi.diagnostics ? physicsApi.diagnostics() : null;
      if (d && d.mode === 'voxel') {
        const submerged = Number.isFinite(d.submergedFraction) ? `${Math.round(d.submergedFraction * 100)}%` : '--';
        const ay = Number.isFinite(d.heaveAcceleration) ? `${d.heaveAcceleration >= 0 ? '+' : ''}${d.heaveAcceleration.toFixed(1)}` : '--';
        stateEl.textContent = `Voxel ${d.activeCells || 0}/${d.voxelCount || 24} · ${submerged} · aY ${ay}`;
      } else {
        stateEl.textContent = '9-Point';
      }
    };
  }

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = version;
  document.title = `Swim Ring Racing ${version}`;
  updateUi();

  window.V098_MARINE_PHYSICS_LAB = {
    version,
    setMode,
    get mode() { return physicsApi.mode; },
    get diagnostics() { return physicsApi.diagnostics ? physicsApi.diagnostics() : null; },
    get smoothing() { return window.V0982_MARINE_SMOOTHING || null; },
    get fastOceanSampler() { return window.V0982_FAST_OCEAN_SAMPLER || null; }
  };
})();
