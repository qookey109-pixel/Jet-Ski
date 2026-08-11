// V0.9.6 Taiwan Coast runtime — Qixingtan / Hualien prototype.
// OSM coastline is a local land boundary; the water side remains the existing infinite ocean.
(function () {
  'use strict';

  if (!window.THREE || !window.REAL_WORLD_COAST || typeof scene === 'undefined' || typeof ski === 'undefined') return;

  const THREE = window.THREE;
  const Coast = window.REAL_WORLD_COAST;
  const site = {
    id: 'qixingtan-hualien',
    label: '花蓮七星潭 Qixingtan',
    origin: { lat: 24.031426, lon: 121.62717 },
    bounds: { south: 23.990, west: 121.585, north: 24.075, east: 121.665 }
  };
  const cacheKey = 'swimRing.osm.qixingtanCoast.v1';
  const endpoints = [
    'https://overpass-api.de/api/interpreter?data=',
    'https://overpass.kumi.systems/api/interpreter?data='
  ];

  const worldGroup = new THREE.Group();
  worldGroup.name = 'V096QixingtanCoastWorld';
  worldGroup.visible = false;
  scene.add(worldGroup);

  const hud = document.querySelector('.hud');
  const statusRow = document.createElement('div');
  statusRow.style.display = 'none';
  statusRow.innerHTML = '海岸 <span id="coast-map-state">OSM 準備中…</span>';
  if (hud) hud.appendChild(statusRow);
  const statusEl = statusRow.querySelector('#coast-map-state');

  const state = {
    requested: false,
    active: false,
    loading: true,
    loaded: false,
    error: null,
    coastlines: [],
    endpoint: null,
    fromCache: false,
    collisions: 0
  };

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function worldOffset() {
    const runtime = window.V093_IRREGULAR_INFINITE_OCEAN;
    return runtime && runtime.worldOffset ? runtime.worldOffset : { x: 0, y: 0 };
  }

  function syncWorldGroup() {
    const offset = worldOffset();
    worldGroup.position.set(-offset.x, 0, -offset.y);
  }

  function currentWorldPoint() {
    const offset = worldOffset();
    return { x: ski.position.x + offset.x, z: ski.position.z + offset.y };
  }

  function toLocalWorld(point) {
    const offset = worldOffset();
    return { x: point.x - offset.x, z: point.z - offset.y };
  }

  function lineNormal(points, index, waterSide) {
    const last = points.length - 1;
    const prev = points[Math.max(0, index - 1)];
    const next = points[Math.min(last, index + 1)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    // Local +cross/left side is water; local right side is land.
    return waterSide
      ? { x: -dz / len, z: dx / len }
      : { x: dz / len, z: -dx / len };
  }

  function buildRibbon(points, nearOffset, farOffset, nearY, farY) {
    const positions = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const na = lineNormal(points, i, false);
      const nb = lineNormal(points, i + 1, false);
      const a0 = { x: a.x + na.x * nearOffset, z: a.z + na.z * nearOffset };
      const a1 = { x: a.x + na.x * farOffset, z: a.z + na.z * farOffset };
      const b0 = { x: b.x + nb.x * nearOffset, z: b.z + nb.z * nearOffset };
      const b1 = { x: b.x + nb.x * farOffset, z: b.z + nb.z * farOffset };
      positions.push(
        a0.x, nearY, a0.z, b0.x, nearY, b0.z, b1.x, farY, b1.z,
        a0.x, nearY, a0.z, b1.x, farY, b1.z, a1.x, farY, a1.z
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  function renderCoastlines(lines) {
    worldGroup.clear();
    const wetMaterial = new THREE.MeshStandardMaterial({
      color: 0x827968, roughness: 0.98, metalness: 0, side: THREE.DoubleSide
    });
    const landMaterial = new THREE.MeshStandardMaterial({
      color: 0x4e6844, roughness: 1, metalness: 0, side: THREE.DoubleSide
    });
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xe0d7bd, transparent: true, opacity: 0.55
    });

    for (const item of lines) {
      const points = Coast.simplifyLine(item.points, 8);
      if (points.length < 2) continue;

      const wet = new THREE.Mesh(buildRibbon(points, 0, 18, -4.5, 2.2), wetMaterial);
      wet.receiveShadow = true;
      worldGroup.add(wet);

      // Phase 2A terrain placeholder: a broad rising land shelf. DEM replaces this later.
      const land = new THREE.Mesh(buildRibbon(points, 18, 650, 2.2, 52), landMaterial);
      land.receiveShadow = true;
      worldGroup.add(land);

      const coastLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, 0.35, p.z))),
        lineMaterial
      );
      worldGroup.add(coastLine);
    }
    syncWorldGroup();
  }

  function saveCache(json) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), json }));
    } catch (error) {
      console.warn('[V0.9.6] coast cache write failed:', error);
    }
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      const coastlines = Coast.extractCoastlines(cached.json, site.origin);
      return coastlines.length ? { coastlines, savedAt: cached.savedAt || 0 } : null;
    } catch (error) {
      console.warn('[V0.9.6] coast cache read failed:', error);
      return null;
    }
  }

  async function fetchEndpoint(base) {
    const query = Coast.buildOverpassQuery(site.bounds);
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 14000) : null;
    try {
      const response = await fetch(base + encodeURIComponent(query), controller ? { signal: controller.signal } : undefined);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const coastlines = Coast.extractCoastlines(json, site.origin);
      if (!coastlines.length) throw new Error('No coastline ways found');
      saveCache(json);
      return coastlines;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  function finishLoad(coastlines, endpoint, fromCache) {
    state.coastlines = coastlines;
    state.endpoint = endpoint;
    state.fromCache = Boolean(fromCache);
    state.loading = false;
    state.loaded = true;
    state.error = null;
    renderCoastlines(coastlines);
    state.active = state.requested;
    worldGroup.visible = state.active;
    setStatus(`${site.label} · ${coastlines.length} coastline ways${fromCache ? ' · CACHE' : ''}`);
  }

  async function load() {
    state.loading = true;
    state.error = null;
    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        setStatus(`OSM 海岸載入中… ${endpoint.includes('kumi') ? '備援' : '主站'}`);
        const coastlines = await fetchEndpoint(endpoint);
        finishLoad(coastlines, endpoint, false);
        return;
      } catch (error) {
        lastError = error;
        console.warn('[V0.9.6] Overpass coastline endpoint failed:', endpoint, error);
      }
    }

    const cached = loadCache();
    if (cached) {
      finishLoad(cached.coastlines, 'localStorage-cache', true);
      return;
    }

    state.loading = false;
    state.loaded = false;
    state.active = false;
    state.error = lastError || new Error('Coastline load failed');
    worldGroup.visible = false;
    setStatus('OSM 海岸載入失敗');
  }

  function setEnabled(enabled) {
    state.requested = Boolean(enabled);
    state.active = Boolean(enabled && state.loaded && state.coastlines.length);
    worldGroup.visible = state.active;
    statusRow.style.display = enabled ? '' : 'none';
    syncWorldGroup();
    if (enabled && !state.loading && !state.loaded && typeof load === 'function') load();
  }

  function findSpawn(distanceFromShore) {
    if (!state.coastlines.length) return null;
    const nearest = Coast.nearestCoast({ x: 0, z: 0 }, state.coastlines);
    if (!nearest) return null;
    const distance = Number.isFinite(distanceFromShore) ? distanceFromShore : 180;
    return {
      x: nearest.x + nearest.waterNormal.x * distance,
      z: nearest.z + nearest.waterNormal.z * distance
    };
  }

  let lastSafeWorld = null;
  const previousUpdateJetSki = updateJetSki;
  updateJetSki = function v096TaiwanCoastCollision(dt, t) {
    if (state.active && state.coastlines.length) {
      const before = currentWorldPoint();
      if (Coast.isWaterSide(before, state.coastlines, 2.5)) lastSafeWorld = before;
    }

    previousUpdateJetSki(dt, t);

    if (!state.active || !state.coastlines.length) return;
    const after = currentWorldPoint();
    if (!Coast.isWaterSide(after, state.coastlines, 2.5)) {
      const fallback = lastSafeWorld || findSpawn(35);
      if (fallback) {
        const local = toLocalWorld(fallback);
        ski.position.x = local.x;
        ski.position.z = local.z;
      }
      if (typeof speed !== 'undefined') speed *= 0.22;
      if (typeof lateralSlip !== 'undefined') lateralSlip *= -0.10;
      state.collisions += 1;
      if (typeof airStateEl !== 'undefined' && airStateEl) airStateEl.textContent = '海岸 COAST';
    } else {
      lastSafeWorld = after;
    }
  };

  const previousUpdateWater = updateWater;
  updateWater = function v096TaiwanCoastUpdateWater(t) {
    previousUpdateWater(t);
    if (state.active) syncWorldGroup();
  };

  window.V096_TAIWAN_COAST = {
    version: 'V0.9.6',
    site,
    state,
    worldGroup,
    cacheKey,
    load,
    setEnabled,
    findSpawn,
    currentWorldPoint,
    toLocalWorld,
    syncWorldGroup
  };

  load();
})();
