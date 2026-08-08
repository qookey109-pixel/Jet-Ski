// V0.7 Real Sea Data runtime overlay.
// Keeps the V0.6 hydrodynamics model intact and only replaces its sea-state inputs.
(function () {
  const api = window.REAL_SEA_DATA;
  const physicsRuntime = window.JETSKI_PHYSICS;
  const config = GAME_CONFIG.realSeaData || {};
  if (!api || !physicsRuntime) return;

  const profile = physicsRuntime.seaProfile;
  const waveStateEl = document.querySelector('#wave-state');
  const sourceEl = document.querySelector('#data-source');
  const seaStateLabelEl = document.querySelector('#sea-state');
  const transitionResponse = config.transitionResponse || 1.5;
  const maxAgeMinutes = config.staleAfterMinutes || 180;
  let activeState = null, lastError = null, requestSerial = 0;

  const legacyUpdateSeaTransition = updateSeaTransition;
  const legacySelectSeaState = selectSeaState;

  function formatSource(state) {
    const station = state.stationName || state.stationId;
    return station ? `${state.source} · ${station}` : state.source;
  }

  function updateHud() {
    if (!activeState) {
      if (sourceEl) sourceEl.textContent = 'Preset';
      return;
    }
    const stale = api.isStale(activeState, maxAgeMinutes);
    if (sourceEl) {
      sourceEl.textContent = `${formatSource(activeState)}${stale ? ' · STALE' : ''}`;
      sourceEl.dataset.stale = stale ? 'true' : 'false';
    }
    if (seaStateLabelEl) seaStateLabelEl.textContent = activeState.stationName || activeState.source;
    if (waveStateEl) {
      waveStateEl.textContent = `Hs ${activeState.significantWaveHeight.toFixed(2)} m · Tp ${activeState.peakPeriod.toFixed(1)} s · ${Math.round(activeState.meanDirectionDeg)}°`;
    }
  }

  function applyState(state) {
    activeState = api.normalize(state);
    lastError = null;
    updateHud();
    return activeState;
  }

  function clearState(reason = 'preset') {
    activeState = null;
    if (sourceEl) {
      sourceEl.textContent = reason === 'preset' ? 'Preset' : reason;
      delete sourceEl.dataset.stale;
    }
    if (seaStateLabelEl && targetSeaState && targetSeaState.label) seaStateLabelEl.textContent = targetSeaState.label;
  }

  // Keys/buttons 1/2/3 deliberately return to deterministic presets.
  selectSeaState = function v07SelectSeaState(key) {
    clearState('preset');
    return legacySelectSeaState(key);
  };

  updateSeaTransition = function v07UpdateSeaTransition(dt) {
    legacyUpdateSeaTransition(dt);
    if (!activeState) return;
    const alpha = 1 - Math.exp(-transitionResponse * dt);
    for (const field of ['significantWaveHeight','peakPeriod','meanDirectionDeg','directionalSpreadDeg','currentSpeed','currentDirectionDeg','stokesDriftScale']) {
      const target = activeState[field];
      if (Number.isFinite(target)) {
        const current = Number.isFinite(profile[field]) ? profile[field] : target;
        profile[field] = THREE.MathUtils.lerp(current, target, alpha);
      }
    }
    if (activeState.stokesDriftX != null && activeState.stokesDriftZ != null) {
      profile.stokesDriftX = activeState.stokesDriftX;
      profile.stokesDriftZ = activeState.stokesDriftZ;
    } else {
      delete profile.stokesDriftX;
      delete profile.stokesDriftZ;
    }
    updateHud();
  };

  async function loadWith(label, loader) {
    const serial = ++requestSerial;
    if (sourceEl) sourceEl.textContent = `${label} · loading…`;
    try {
      const state = await loader();
      if (serial !== requestSerial) return null;
      return applyState(state);
    } catch (error) {
      if (serial !== requestSerial) return null;
      lastError = error;
      if (sourceEl) sourceEl.textContent = `${label} · ERROR`;
      console.error('[RealSeaData]', error);
      throw error;
    }
  }

  function storageKey() {
    return config.cwa && config.cwa.apiKeyStorageKey ? config.cwa.apiKeyStorageKey : 'swimRing.cwaApiKey';
  }
  function getStoredCwaApiKey() {
    try { return localStorage.getItem(storageKey()); } catch (_) { return null; }
  }
  function setCwaApiKey(apiKey) {
    if (!apiKey) throw new Error('CWA API key cannot be empty.');
    try { localStorage.setItem(storageKey(), apiKey); }
    catch (error) { throw new Error(`Could not store CWA API key locally: ${error.message}`); }
    return true;
  }
  function clearCwaApiKey() {
    try { localStorage.removeItem(storageKey()); } catch (_) {}
  }

  function loadCwa(options = {}) {
    const cwaConfig = config.cwa || {};
    return loadWith('CWA', () => api.cwa.fetch({
      dataId: options.dataId || cwaConfig.dataId || 'O-B0075-001',
      stationId: options.stationId || null,
      apiKey: options.apiKey || getStoredCwaApiKey(),
      directionConvention: options.directionConvention || cwaConfig.directionConvention || 'to',
      currentDirectionConvention: options.currentDirectionConvention || cwaConfig.currentDirectionConvention || 'to',
      directionalSpreadDeg: options.directionalSpreadDeg || config.defaultDirectionalSpreadDeg || 28
    }));
  }

  function loadNoaa(stationId, options = {}) {
    const id = stationId || options.stationId || (config.noaa && config.noaa.stationId);
    return loadWith('NOAA', () => api.noaa.fetch({
      stationId: id,
      directionalSpreadDeg: options.directionalSpreadDeg || config.defaultDirectionalSpreadDeg || 28
    }));
  }

  function applyCopernicusPoint(record, options = {}) {
    return applyState(api.copernicus.normalizePoint(record, {
      productId: options.productId || null,
      pointId: options.pointId || null,
      observedAt: options.observedAt || null,
      directionalSpreadDeg: options.directionalSpreadDeg || config.defaultDirectionalSpreadDeg || 28
    }));
  }

  async function maybeAutoLoad() {
    if (!config.autoLoad) return;
    const params = new URLSearchParams(location.search);
    const source = (params.get('seaSource') || '').toLowerCase();
    const station = params.get('station');
    if (source === 'noaa' && station) { try { await loadNoaa(station); } catch (_) {} }
    else if (source === 'cwa') { try { await loadCwa({ stationId: station }); } catch (_) {} }
  }

  window.REAL_SEA_RUNTIME = {
    get activeState() { return activeState; },
    get lastError() { return lastError; },
    apply: applyState,
    clear: () => { requestSerial++; clearState('preset'); },
    setCwaApiKey, getCwaApiKey: getStoredCwaApiKey, clearCwaApiKey,
    loadCwa, loadNoaa, applyCopernicusPoint
  };

  updateHud();
  maybeAutoLoad();
})();
