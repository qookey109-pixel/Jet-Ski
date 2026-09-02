// V0.10.5.2.1 Disaster Sync Diagnostics.
// Observer-only diagnostics for Natural Disaster EXP browser acceptance.
(function (root) {
  'use strict';

  const VERSION = 'V0.10.5.2.1';

  function finiteOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function computeSyncDiagnostics(input) {
    input = input || {};
    const baseHeight = finiteOr(input.baseHeight, 0);
    const totalHeight = finiteOr(input.totalHeight, baseHeight);
    const expectedEventHeight = finiteOr(input.expectedEventHeight, 0);
    const craftY = finiteOr(input.craftY, totalHeight);
    const floatClearance = finiteOr(input.floatClearance, 0);
    const sampledEventHeight = totalHeight - baseHeight;
    const eventHeightError = sampledEventHeight - expectedEventHeight;
    const craftAboveSurface = craftY - (totalHeight + floatClearance);
    return {
      baseHeight,
      totalHeight,
      expectedEventHeight,
      sampledEventHeight,
      eventHeightError,
      craftAboveSurface,
      cpuEventMatch: Math.abs(eventHeightError) <= 1e-6
    };
  }

  const pureApi = { VERSION, computeSyncDiagnostics };
  if (typeof module !== 'undefined' && module.exports) module.exports = pureApi;
  if (typeof window === 'undefined') return;

  const disasters = root.V01052_NATURAL_DISASTERS;
  if (!disasters || disasters.available !== true || typeof disasters.previousGetWaveHeight !== 'function') {
    root.V010521_DISASTER_SYNC_DIAGNOSTICS = Object.assign({}, pureApi, {
      available: false,
      reason: 'v01052-unavailable'
    });
    return;
  }

  const state = {
    updates: 0,
    cpuEventMatch: true,
    eventHeightError: 0,
    sampledEventHeight: 0,
    expectedEventHeight: 0,
    totalHeight: 0,
    baseHeight: 0,
    craftAboveSurface: 0,
    hydroMode: 'unknown',
    shaderPatchInstalled: false,
    heightPatchInstalled: false
  };

  const hud = document.querySelector('.hud');
  const syncRow = document.createElement('div');
  syncRow.innerHTML = '事件同步 <span id="disaster-sync-state">待命</span>';
  if (hud) hud.appendChild(syncRow);
  const syncEl = syncRow.querySelector('#disaster-sync-state');

  const craftRow = document.createElement('div');
  craftRow.innerHTML = '事件水面 <span id="disaster-craft-state">—</span>';
  if (hud) hud.appendChild(craftRow);
  const craftEl = craftRow.querySelector('#disaster-craft-state');

  function currentTime() {
    return typeof clock !== 'undefined' && Number.isFinite(clock.elapsedTime)
      ? clock.elapsedTime
      : performance.now() / 1000;
  }

  function getHydroMode() {
    const physicsApi = root.JETSKI_PHYSICS;
    const hydro = physicsApi && physicsApi.hydroModel;
    return hydro && hydro.mode ? String(hydro.mode) : 'unknown';
  }

  function update() {
    if (typeof ski === 'undefined' || typeof getWaveHeight !== 'function') return;
    const t = currentTime();
    const ocean = root.V093_IRREGULAR_INFINITE_OCEAN;
    const offset = ocean && ocean.worldOffset ? ocean.worldOffset : { x: 0, y: 0 };
    const localX = finiteOr(ski.position.x, 0);
    const localZ = finiteOr(ski.position.z, 0);
    const worldX = localX + finiteOr(offset.x, 0);
    const worldZ = localZ + finiteOr(offset.y, 0);
    const baseHeight = disasters.previousGetWaveHeight(localX, localZ, t);
    const totalHeight = getWaveHeight(localX, localZ, t);
    const expectedEventHeight = disasters.state && disasters.state.enabled
      ? disasters.sampleEventHeight(disasters.state, worldX, worldZ, t)
      : 0;
    const floatClearance = typeof physics !== 'undefined' ? finiteOr(physics.floatClearance, 0) : 0;
    const diagnostics = computeSyncDiagnostics({
      baseHeight,
      totalHeight,
      expectedEventHeight,
      craftY: ski.position.y,
      floatClearance
    });

    Object.assign(state, diagnostics);
    state.hydroMode = getHydroMode();
    state.shaderPatchInstalled = Boolean(disasters.shaderPatchInstalled);
    state.heightPatchInstalled = Boolean(disasters.heightPatchInstalled);
    state.updates += 1;

    const waterEventActive = Boolean(disasters.state && (disasters.state.tsunami || disasters.state.rogue));
    if (syncEl) {
      if (!waterEventActive) {
        syncEl.textContent = '待命 · Base ocean';
      } else {
        const cpu = diagnostics.cpuEventMatch ? 'CPU✓' : 'CPU⚠';
        const visual = state.shaderPatchInstalled ? 'VIS✓' : 'VIS⚠';
        syncEl.textContent = `${cpu} ${visual} · Δ ${diagnostics.eventHeightError.toFixed(4)}m`;
      }
    }
    if (craftEl) {
      craftEl.textContent = `Event ${diagnostics.sampledEventHeight >= 0 ? '+' : ''}${diagnostics.sampledEventHeight.toFixed(2)}m · craft ${diagnostics.craftAboveSurface >= 0 ? '+' : ''}${diagnostics.craftAboveSurface.toFixed(2)}m · ${state.hydroMode}`;
    }
  }

  const interval = setInterval(update, 250);
  update();

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.V010521_DISASTER_SYNC_DIAGNOSTICS = Object.assign({}, pureApi, {
    available: true,
    observerOnly: true,
    physicsWrites: false,
    waterWrites: false,
    state,
    update,
    interval
  });
})(typeof window !== 'undefined' ? window : globalThis);
