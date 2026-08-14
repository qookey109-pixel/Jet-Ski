// V0.10.5.1 Real-World 3D Preview.
// Optional visual-only Google Photorealistic 3D Tiles layer for Taiwan/Hawaii coast worlds.
// OSM remains authoritative for coastline collision / sea-land logic. Physics is untouched.
(function (root) {
  'use strict';

  const VERSION = 'V0.10.5.1';
  const RENDERER_VERSION = '0.3.36';
  const THREE_VERSION = '0.152.2';
  const MODULE_URL = `https://esm.sh/3d-tiles-renderer@${RENDERER_VERSION}?deps=three@${THREE_VERSION}`;
  const GLTF_LOADER_URL = `https://esm.sh/three@${THREE_VERSION}/examples/jsm/loaders/GLTFLoader.js`;
  const DRACO_LOADER_URL = `https://esm.sh/three@${THREE_VERSION}/examples/jsm/loaders/DRACOLoader.js`;
  const DRACO_DECODER_PATH = `https://unpkg.com/three@${THREE_VERSION}/examples/jsm/libs/draco/gltf/`;
  const API_KEY_STORAGE = 'swimRing.googleMaps3d.apiKey';
  const ENABLED_STORAGE = 'swimRing.googleMaps3d.enabled';
  const VERTICAL_OFFSET_STORAGE = 'swimRing.googleMaps3d.verticalOffsetM';

  const SITE_PROFILES = Object.freeze({
    'taiwan-coast': Object.freeze({
      id: 'qixingtan-hualien',
      label: '花蓮七星潭 Qixingtan',
      lat: 24.031426,
      lon: 121.62717
    }),
    'hawaii-coast': Object.freeze({
      id: 'waikiki-oahu',
      label: '夏威夷 Waikīkī / Oʻahu',
      lat: 21.2767,
      lon: -157.8271
    })
  });

  function normalizeApiKey(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function isCoastMode(mode) {
    return Object.prototype.hasOwnProperty.call(SITE_PROFILES, mode);
  }

  function resolveSiteForMode(mode) {
    const site = SITE_PROFILES[mode];
    return site ? Object.assign({}, site) : null;
  }

  // v0.3.36 setLatLonToYUp local axes: X+ north, Z+ east.
  // Jet-Ski local axes: X+ east, Z+ south (-north).
  function tileLocalToGameLocal(point) {
    point = point || {};
    const north = Number(point.x) || 0;
    const up = Number(point.y) || 0;
    const east = Number(point.z) || 0;
    return { x: east, y: up, z: -north };
  }

  function getPerformanceBudget(userAgent, minViewport) {
    const ua = String(userAgent || '');
    const mobileLike = Number(minViewport) < 620 || /iPhone|iPad|Android/i.test(ua);
    const safari = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR/i.test(ua);
    if (mobileLike) return { updateHz: 8, errorTarget: 26, farM: 3200, fogFarM: 2800 };
    if (safari) return { updateHz: 10, errorTarget: 22, farM: 5200, fogFarM: 4600 };
    return { updateHz: 15, errorTarget: 18, farM: 7000, fogFarM: 6200 };
  }

  function isNetwork3DSupported(protocol) {
    return protocol === 'https:' || protocol === 'http:';
  }

  const pureApi = {
    VERSION,
    RENDERER_VERSION,
    THREE_VERSION,
    SITE_PROFILES,
    normalizeApiKey,
    isCoastMode,
    resolveSiteForMode,
    tileLocalToGameLocal,
    getPerformanceBudget,
    isNetwork3DSupported
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = pureApi;
  if (typeof window === 'undefined') return;

  if (!root.THREE || typeof scene === 'undefined' || typeof camera === 'undefined' || typeof renderer === 'undefined') {
    root.V01051_REAL_WORLD_3D = Object.assign({}, pureApi, {
      available: false,
      reason: 'three-scene-unavailable'
    });
    return;
  }

  const THREE = root.THREE;
  const budget = getPerformanceBudget(navigator.userAgent || '', Math.min(innerWidth, innerHeight));
  const originalCameraFar = camera.far;
  const originalFogNear = scene.fog ? scene.fog.near : null;
  const originalFogFar = scene.fog ? scene.fog.far : null;

  const state = {
    requested: false,
    active: false,
    loading: false,
    mode: null,
    siteId: null,
    error: null,
    fallback: 'OSM',
    updates: 0,
    credits: '',
    apiKeyPresent: false,
    protocolSupported: isNetwork3DSupported(location.protocol),
    rendererVersion: RENDERER_VERSION,
    threeVersion: THREE_VERSION,
    verticalOffsetM: -1.5
  };

  try {
    const storedOffset = Number(localStorage.getItem(VERTICAL_OFFSET_STORAGE));
    if (Number.isFinite(storedOffset)) state.verticalOffsetM = storedOffset;
    state.requested = localStorage.getItem(ENABLED_STORAGE) === '1';
    state.apiKeyPresent = Boolean(normalizeApiKey(localStorage.getItem(API_KEY_STORAGE)));
  } catch (_) {}

  let modulePromise = null;
  let tiles = null;
  let tileParent = null;
  let activeSite = null;
  let loadGeneration = 0;
  let lastTilesUpdateT = -Infinity;
  let lastCreditsUpdateT = -Infinity;

  const hud = document.querySelector('.hud');
  const statusRow = document.createElement('div');
  statusRow.innerHTML = '真實3D <span id="real-world-3d-state">OFF · OSM</span>';
  if (hud) hud.appendChild(statusRow);
  const statusEl = statusRow.querySelector('#real-world-3d-state');

  const worldControls = document.querySelector('.world-controls');
  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.textContent = '🌍 真實3D';
  toggleButton.setAttribute('aria-label', '切換 Google Photorealistic 3D 預覽');
  if (worldControls) worldControls.appendChild(toggleButton);

  const attribution = document.createElement('div');
  attribution.id = 'real-world-3d-attribution';
  attribution.style.cssText = [
    'position:fixed',
    'right:6px',
    'bottom:4px',
    'z-index:60',
    'max-width:min(92vw,720px)',
    'padding:3px 6px',
    'border-radius:4px',
    'background:rgba(0,0,0,.55)',
    'color:#fff',
    'font:10px/1.25 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
    'pointer-events:none',
    'display:none'
  ].join(';');
  attribution.textContent = '3D basemap: Google Maps';
  document.body.appendChild(attribution);

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function safeGetKey() {
    try { return normalizeApiKey(localStorage.getItem(API_KEY_STORAGE)); }
    catch (_) { return ''; }
  }

  function safeStore(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch (_) { return false; }
  }

  function getCurrentMode() {
    const worldModes = root.V097_WORLD_MODES;
    return worldModes && worldModes.mode ? worldModes.mode : 'open-sea';
  }

  function getCoastRuntime(mode) {
    if (mode === 'hawaii-coast') return root.V097_HAWAII_COAST || null;
    if (mode === 'taiwan-coast') return root.V096_TAIWAN_COAST || null;
    return null;
  }

  function getRuntimeSite(mode) {
    const profile = resolveSiteForMode(mode);
    if (!profile) return null;
    const runtime = getCoastRuntime(mode);
    const origin = runtime && runtime.site && runtime.site.origin;
    if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lon)) {
      profile.lat = origin.lat;
      profile.lon = origin.lon;
      if (runtime.site.label) profile.label = runtime.site.label;
    }
    return profile;
  }

  function syncOsmVisuals() {
    for (const mode of ['taiwan-coast', 'hawaii-coast']) {
      const runtime = getCoastRuntime(mode);
      if (!runtime || !runtime.worldGroup || !runtime.state) continue;
      const coveredBy3D = state.active && state.mode === mode;
      runtime.worldGroup.visible = Boolean(runtime.state.active && !coveredBy3D);
    }
  }

  function applyWorldOffset() {
    if (!tileParent) return;
    const ocean = root.V093_IRREGULAR_INFINITE_OCEAN;
    const offset = ocean && ocean.worldOffset ? ocean.worldOffset : { x: 0, y: 0 };
    tileParent.position.set(-(Number(offset.x) || 0), state.verticalOffsetM, -(Number(offset.y) || 0));
  }

  function applyViewBudget() {
    if (!state.active) return;
    if (camera.isPerspectiveCamera && camera.far < budget.farM) {
      camera.far = budget.farM;
      camera.updateProjectionMatrix();
    }
    if (scene.fog && scene.fog.far < budget.fogFarM) scene.fog.far = budget.fogFarM;
  }

  function restoreViewBudget() {
    if (camera.isPerspectiveCamera && camera.far !== originalCameraFar) {
      camera.far = originalCameraFar;
      camera.updateProjectionMatrix();
    }
    if (scene.fog && originalFogNear != null && originalFogFar != null) {
      scene.fog.near = originalFogNear;
      scene.fog.far = originalFogFar;
    }
  }

  function updateAttribution() {
    if (!state.active || !tiles) {
      attribution.style.display = 'none';
      return;
    }
    let credits = '';
    try {
      credits = typeof tiles.getCreditsString === 'function' ? String(tiles.getCreditsString() || '') : '';
    } catch (_) {}
    state.credits = credits;
    attribution.textContent = credits
      ? `3D basemap: Google Maps · ${credits}`
      : '3D basemap: Google Maps';
    attribution.style.display = '';
  }

  function cleanupTiles(options) {
    options = options || {};
    loadGeneration += 1;
    if (tileParent) scene.remove(tileParent);
    if (tiles && typeof tiles.dispose === 'function') {
      try { tiles.dispose(); } catch (_) {}
    }
    tiles = null;
    tileParent = null;
    activeSite = null;
    state.active = false;
    state.loading = false;
    state.mode = null;
    state.siteId = null;
    lastTilesUpdateT = -Infinity;
    lastCreditsUpdateT = -Infinity;
    attribution.style.display = 'none';
    restoreViewBudget();
    if (!options.keepStatus) setStatus(state.requested ? '待沿岸模式 · OSM' : 'OFF · OSM');
    syncOsmVisuals();
  }

  async function loadModules() {
    if (!modulePromise) {
      modulePromise = Promise.all([
        import(MODULE_URL),
        import(GLTF_LOADER_URL),
        import(DRACO_LOADER_URL)
      ]).then(([tilesModule, gltfModule, dracoModule]) => ({
        GooglePhotorealisticTilesRenderer: tilesModule.GooglePhotorealisticTilesRenderer,
        GoogleCloudAuthPlugin: tilesModule.GoogleCloudAuthPlugin,
        GLTFLoader: gltfModule.GLTFLoader,
        DRACOLoader: dracoModule.DRACOLoader
      }));
    }
    return modulePromise;
  }

  async function instantiateForSite(site, mode) {
    const apiKey = safeGetKey();
    state.apiKeyPresent = Boolean(apiKey);
    if (!apiKey) {
      state.error = new Error('Google Maps API key missing');
      setStatus('需要 Google API key · OSM fallback');
      cleanupTiles({ keepStatus: true });
      return;
    }
    if (!state.protocolSupported) {
      state.error = new Error('Photorealistic 3D requires HTTP(S)');
      setStatus('file:// 保留 OSM · GitHub Pages 才啟用3D');
      cleanupTiles({ keepStatus: true });
      return;
    }

    const generation = ++loadGeneration;
    cleanupTiles({ keepStatus: true });
    // cleanup increments generation; use a fresh token after cleanup.
    const token = ++loadGeneration;
    state.loading = true;
    state.error = null;
    state.mode = mode;
    state.siteId = site.id;
    setStatus(`${site.label} · 3D 模組載入中…`);

    try {
      const modules = await loadModules();
      if (token !== loadGeneration || !state.requested || getCurrentMode() !== mode) return;
      if (!modules.GooglePhotorealisticTilesRenderer || !modules.GoogleCloudAuthPlugin) {
        throw new Error('3D Tiles renderer exports unavailable');
      }

      const nextTiles = new modules.GooglePhotorealisticTilesRenderer();
      nextTiles.registerPlugin(new modules.GoogleCloudAuthPlugin({ apiToken: apiKey }));
      nextTiles.errorTarget = budget.errorTarget;
      nextTiles.setLatLonToYUp(site.lat * Math.PI / 180, site.lon * Math.PI / 180);

      if (modules.GLTFLoader && modules.DRACOLoader && nextTiles.manager) {
        const dracoLoader = new modules.DRACOLoader();
        dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
        const gltfLoader = new modules.GLTFLoader(nextTiles.manager);
        gltfLoader.setDRACOLoader(dracoLoader);
        nextTiles.manager.addHandler(/\.gltf(\?.*)?$/i, gltfLoader);
      }

      const nextParent = new THREE.Group();
      nextParent.name = `V01051PhotorealWorld-${site.id}`;
      // Google renderer local X = north, Z = east. Rotate into game X = east, Z = south.
      nextParent.rotation.y = Math.PI / 2;
      nextParent.add(nextTiles.group);
      scene.add(nextParent);

      tiles = nextTiles;
      tileParent = nextParent;
      activeSite = site;
      state.active = true;
      state.loading = false;
      state.fallback = 'OSM collision + Google visual';
      applyWorldOffset();
      applyViewBudget();
      camera.updateMatrixWorld();
      tiles.setResolutionFromRenderer(camera, renderer);
      tiles.setCamera(camera);
      tiles.update();
      updateAttribution();
      syncOsmVisuals();
      setStatus(`${site.label} · Google 3D EXP`);
    } catch (error) {
      if (token !== loadGeneration) return;
      console.warn('[V0.10.5.1] Photorealistic 3D unavailable, falling back to OSM:', error);
      state.error = error;
      setStatus('Google 3D 載入失敗 · OSM fallback');
      cleanupTiles({ keepStatus: true });
    }
  }

  function ensureCurrentSite() {
    const mode = getCurrentMode();
    const site = getRuntimeSite(mode);
    if (!state.requested || !site) {
      if (state.active || state.loading) cleanupTiles();
      syncOsmVisuals();
      return;
    }
    if (state.active && state.mode === mode && activeSite && activeSite.id === site.id) return;
    if (state.loading && state.mode === mode && state.siteId === site.id) return;
    instantiateForSite(site, mode);
  }

  function setRequested(enabled) {
    state.requested = Boolean(enabled);
    safeStore(ENABLED_STORAGE, state.requested ? '1' : '0');
    toggleButton.classList.toggle('active', state.requested);
    if (!state.requested) {
      cleanupTiles();
      return;
    }
    ensureCurrentSite();
  }

  function setApiKey(value) {
    const key = normalizeApiKey(value);
    if (!key) return false;
    safeStore(API_KEY_STORAGE, key);
    state.apiKeyPresent = true;
    state.error = null;
    if (state.requested) ensureCurrentSite();
    return true;
  }

  function clearApiKey() {
    try { localStorage.removeItem(API_KEY_STORAGE); } catch (_) {}
    state.apiKeyPresent = false;
    cleanupTiles({ keepStatus: true });
    setStatus('API key 已清除 · OSM fallback');
  }

  function setVerticalOffsetM(value) {
    const next = Number(value);
    if (!Number.isFinite(next) || Math.abs(next) > 200) return false;
    state.verticalOffsetM = next;
    safeStore(VERTICAL_OFFSET_STORAGE, String(next));
    applyWorldOffset();
    return true;
  }

  toggleButton.addEventListener('click', () => {
    const mode = getCurrentMode();
    if (state.requested) {
      setRequested(false);
      return;
    }
    if (!isCoastMode(mode)) {
      setStatus('請先選「台灣」或「夏威夷」');
      return;
    }
    if (!safeGetKey()) {
      const entered = prompt('Google Maps Platform API key\n請先限制 HTTP referrer，並只允許 Map Tiles API。\nAPI key 只存於此瀏覽器 localStorage，不會寫進 GitHub。');
      if (!setApiKey(entered)) {
        setStatus('未設定 API key · OSM');
        return;
      }
    }
    setRequested(true);
  });

  const previousUpdateWater = typeof updateWater === 'function' ? updateWater : null;
  if (previousUpdateWater) {
    updateWater = function v01051RealWorld3DUpdate(t) {
      previousUpdateWater(t);
      const mode = getCurrentMode();
      if (state.requested && isCoastMode(mode)) {
        ensureCurrentSite();
      } else if ((state.active || state.loading) && (!state.requested || !isCoastMode(mode))) {
        cleanupTiles();
      }

      if (!state.active || !tiles || !tileParent) {
        syncOsmVisuals();
        return;
      }

      applyWorldOffset();
      applyViewBudget();
      const nowT = Number.isFinite(t) ? t : performance.now() / 1000;
      if (nowT - lastTilesUpdateT >= 1 / budget.updateHz) {
        try {
          camera.updateMatrixWorld();
          tiles.setResolutionFromRenderer(camera, renderer);
          tiles.setCamera(camera);
          tiles.update();
          state.updates += 1;
          lastTilesUpdateT = nowT;
        } catch (error) {
          console.warn('[V0.10.5.1] 3D tile update failed; restoring OSM visual:', error);
          state.error = error;
          setStatus('Google 3D 更新失敗 · OSM fallback');
          cleanupTiles({ keepStatus: true });
          return;
        }
      }
      if (nowT - lastCreditsUpdateT >= 1) {
        updateAttribution();
        lastCreditsUpdateT = nowT;
      }
      syncOsmVisuals();
    };
  }

  toggleButton.classList.toggle('active', state.requested);
  if (!state.protocolSupported) setStatus('file:// 模式使用 OSM · 3D 需 HTTP(S)');
  else if (state.requested && !state.apiKeyPresent) setStatus('需要 Google API key · OSM fallback');
  else setStatus(state.requested ? '待沿岸模式 · 3D EXP' : 'OFF · OSM');

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.V01051_REAL_WORLD_3D = Object.assign({}, pureApi, {
    available: true,
    visualOnly: true,
    osmCollisionAuthorityPreserved: true,
    physicsUntouched: true,
    googleContentCachingAdded: false,
    state,
    budget,
    setRequested,
    setApiKey,
    clearApiKey,
    setVerticalOffsetM,
    ensureCurrentSite,
    get currentTiles() { return tiles; },
    get currentParent() { return tileParent; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
