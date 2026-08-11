// V0.9.9.2 Marine Physics Lab UI/runtime.
// 9-Point Plus is mainline; Base remains the trusted A/B reference; Voxel is experimental.
(function () {
  'use strict';

  const physicsApi = window.JETSKI_PHYSICS && window.JETSKI_PHYSICS.hydroModel;
  if (!physicsApi || typeof physicsApi.setMode !== 'function') return;

  const version = 'V0.9.9.2';
  const buttons = [...document.querySelectorAll('[data-hydro-mode]')];
  const hud = document.querySelector('.hud');
  const row = document.createElement('div');
  row.innerHTML = '船體物理 <span id="marine-physics-state">9-Point+</span>';
  if (hud) hud.appendChild(row);
  const stateEl = row.querySelector('#marine-physics-state');
  let lastDiagUpdate = 0;

  function labelFor(mode) {
    if (mode === 'nine-point-plus') return '9-Point+';
    if (mode === 'voxel') return 'Voxel EXP';
    return '9-Point Base';
  }

  function updateUi() {
    const mode = physicsApi.mode || 'nine-point-plus';
    for (const button of buttons) {
      button.classList.toggle('active', button.dataset.hydroMode === mode);
    }
    if (stateEl) stateEl.textContent = labelFor(mode);
  }

  function setMode(mode) {
    physicsApi.setMode(mode);
    updateUi();
  }

  for (const button of buttons) button.addEventListener('click', () => setMode(button.dataset.hydroMode));
  window.addEventListener('keydown', event => {
    if (event.repeat || event.code !== 'KeyP') return;
    physicsApi.toggleMode();
    updateUi();
  });

  if (typeof updateWater === 'function') {
    const previousUpdateWater = updateWater;
    updateWater = function v0992MarinePhysicsHud(t) {
      previousUpdateWater(t);
      if (!stateEl || t - lastDiagUpdate < 0.25) return;
      lastDiagUpdate = t;
      const d = physicsApi.diagnostics ? physicsApi.diagnostics() : null;
      if (d && d.mode === 'voxel') {
        const submerged = Number.isFinite(d.submergedFraction) ? `${Math.round(d.submergedFraction * 100)}%` : '--';
        const ay = Number.isFinite(d.heaveAcceleration) ? `${d.heaveAcceleration >= 0 ? '+' : ''}${d.heaveAcceleration.toFixed(1)}` : '--';
        const slam = Number.isFinite(d.slamLoad) ? `${Math.round(d.slamLoad * 100)}%` : '--';
        stateEl.textContent = `Voxel EXP · ${submerged} · aY ${ay} · slam ${slam}`;
      } else if (d && d.mode === 'nine-point-plus') {
        const planar = window.V0992_PLANAR_3DOF && window.V0992_PLANAR_3DOF.state;
        if (planar && planar.initialized) {
          const u = Number.isFinite(planar.u) ? planar.u.toFixed(1) : '--';
          const v = Number.isFinite(planar.v) ? `${planar.v >= 0 ? '+' : ''}${planar.v.toFixed(2)}` : '--';
          const r = Number.isFinite(planar.r) ? `${planar.r >= 0 ? '+' : ''}${planar.r.toFixed(2)}` : '--';
          stateEl.textContent = `9-Point+ · u ${u} · v ${v} · r ${r}`;
        } else {
          const ay = Number.isFinite(d.heaveAcceleration) ? `${d.heaveAcceleration >= 0 ? '+' : ''}${d.heaveAcceleration.toFixed(1)}` : '--';
          stateEl.textContent = `9-Point+ · aY ${ay}`;
        }
      } else {
        stateEl.textContent = '9-Point Base';
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
    get fastOceanSampler() { return window.V0982_FAST_OCEAN_SAMPLER || null; },
    get waterContactForces() { return window.V0983_WATER_CONTACT_FORCES || null; },
    get ninePointPlus() { return window.V099_NINE_POINT_PLUS_RUNTIME || null; },
    get lateralCom() { return window.V0991_LATERAL_COM || null; },
    get planar3dof() { return window.V0992_PLANAR_3DOF || null; }
  };
})();
