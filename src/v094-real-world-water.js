// V0.9.4.1 Real World Water — Sun Moon Lake shoreline refinement.
// Loads OSM water geometry through Overpass, renders a sloped shoreline ribbon,
// caches the latest successful OSM response, and constrains the swim ring to water.
(function () {
  'use strict';

  if (!window.THREE || !window.REAL_WORLD_WATER || typeof scene === 'undefined' || typeof ski === 'undefined') return;

  const THREE = window.THREE;
  const Geo = window.REAL_WORLD_WATER;
  const visualVersion = 'V0.9.4.1';
  const cacheKey = 'swimRing.osm.sunMoonLake.v1';
  const site = {
    id: 'sun-moon-lake',
    label: '日月潭 Sun Moon Lake',
    origin: { lat: 23.8610, lon: 120.9183 },
    bounds: { south: 23.82, west: 120.88, north: 23.90, east: 120.96 }
  };

  const endpoints = [
    'https://overpass-api.de/api/interpreter?data=',
    'https://overpass.kumi.systems/api/interpreter?data='
  ];

  const hud = document.querySelector('.hud');
  const statusRow = document.createElement('div');
  statusRow.innerHTML = '地圖 <span id="world-map-state">OSM 載入中…</span>';
  if (hud) hud.appendChild(statusRow);
  const statusEl = statusRow.querySelector('#world-map-state');

  const attribution = document.createElement('div');
  attribution.textContent = '© OpenStreetMap contributors';
  attribution.style.cssText = 'position:fixed;right:10px;bottom:7px;z-index:12;padding:3px 7px;border-radius:7px;background:rgba(8,25,36,.58);color:#dceff4;font:11px/1.2 system-ui,sans-serif;pointer-events:none';
  document.body.appendChild(attribution);

  const worldGroup = new THREE.Group();
  worldGroup.name = 'V0941SunMoonLakeWorld';
  scene.add(worldGroup);

  const state = {
    active: false,
    loading: true,
    error: null,
    polygon: null,
    source: null,
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

  function ringCentroid(ring) {
    let twiceArea = 0, cx = 0, cz = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i], b = ring[i + 1];
      const cross = a.x * b.z - b.x * a.z;
      twiceArea += cross;
      cx += (a.x + b.x) * cross;
      cz += (a.z + b.z) * cross;
    }
    if (Math.abs(twiceArea) < 1e-6) {
      let sx = 0, sz = 0;
      for (const p of ring) { sx += p.x; sz += p.z; }
      return { x: sx / ring.length, z: sz / ring.length };
    }
    return { x: cx / (3 * twiceArea), z: cz / (3 * twiceArea) };
  }

  function normalized(x, z) {
    const len = Math.hypot(x, z) || 1;
    return { x: x / len, z: z / len };
  }

  // Find the land-facing normal at each shoreline vertex. We test both sides against
  // the actual water polygon, so concave bays and island holes do not rely only on winding.
  function landNormal(ring, index, polygon) {
    const n = ring.length - 1;
    const prev = ring[(index - 1 + n) % n];
    const curr = ring[index % n];
    const next = ring[(index + 1) % n];
    const tangent = normalized(next.x - prev.x, next.z - prev.z);
    const a = { x: -tangent.z, z: tangent.x };
    const b = { x: tangent.z, z: -tangent.x };
    const probe = 14;
    const pa = { x: curr.x + a.x * probe, z: curr.z + a.z * probe };
    const pb = { x: curr.x + b.x * probe, z: curr.z + b.z * probe };
    const aWater = Geo.pointInWater(pa, polygon.outer, polygon.holes);
    const bWater = Geo.pointInWater(pb, polygon.outer, polygon.holes);
    if (aWater !== bWater) return aWater ? b : a;

    // Ambiguous narrow geometry fallback: point away from the ring centroid.
    const center = ringCentroid(ring);
    const fallback = normalized(curr.x - center.x, curr.z - center.z);
    return fallback;
  }

  function buildRibbonGeometry(ring, polygon, nearOffset, farOffset, nearY, farY) {
    const positions = [];
    const n = ring.length - 1;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a = ring[i], b = ring[j];
      const na = landNormal(ring, i, polygon);
      const nb = landNormal(ring, j, polygon);
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

  function makeShoreRibbon(ring, polygon) {
    const group = new THREE.Group();

    const wetGeometry = buildRibbonGeometry(ring, polygon, 0, 10, -3.0, 2.4);
    const wetMaterial = new THREE.MeshStandardMaterial({
      color: 0x8c8169, roughness: 0.98, metalness: 0, side: THREE.DoubleSide
    });
    const wet = new THREE.Mesh(wetGeometry, wetMaterial);
    wet.receiveShadow = true;
    group.add(wet);

    const landGeometry = buildRibbonGeometry(ring, polygon, 10, 34, 2.4, 10.5);
    const landMaterial = new THREE.MeshStandardMaterial({
      color: 0x557347, roughness: 1, metalness: 0, side: THREE.DoubleSide
    });
    const land = new THREE.Mesh(landGeometry, landMaterial);
    land.receiveShadow = true;
    group.add(land);

    const pts = ring.map(p => new THREE.Vector3(p.x, 0.25, p.z));
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({ color: 0xd8d2b0, transparent: true, opacity: 0.48 })
    ));
    return group;
  }

  function renderPolygon(polygon) {
    worldGroup.clear();
    const outer = Geo.simplifyRing(polygon.outer, 9);
    worldGroup.add(makeShoreRibbon(outer, polygon));

    for (const holeRaw of polygon.holes || []) {
      const hole = Geo.simplifyRing(holeRaw, 7);
      if (hole.length < 4) continue;
      worldGroup.add(makeShoreRibbon(hole, polygon));
    }
    syncWorldGroup();
  }

  function chooseSafeSpawn(polygon) {
    const current = currentWorldPoint();
    if (Geo.pointInWater(current, polygon.outer, polygon.holes)) return current;

    const center = ringCentroid(polygon.outer);
    if (Geo.pointInWater(center, polygon.outer, polygon.holes)) return center;

    for (let i = 0; i < polygon.outer.length; i += Math.max(1, Math.floor(polygon.outer.length / 32))) {
      const p = polygon.outer[i];
      const candidate = { x: p.x * 0.82 + center.x * 0.18, z: p.z * 0.82 + center.z * 0.18 };
      if (Geo.pointInWater(candidate, polygon.outer, polygon.holes)) return candidate;
    }
    return { x: 0, z: 0 };
  }

  function activatePolygon(polygon, endpoint, fromCache) {
    polygon.outer = Geo.simplifyRing(polygon.outer, 5);
    polygon.holes = (polygon.holes || []).map(h => Geo.simplifyRing(h, 5));
    state.polygon = polygon;
    state.source = `${polygon.sourceType}/${polygon.sourceId}`;
    state.endpoint = endpoint;
    state.fromCache = Boolean(fromCache);
    state.loading = false;
    state.active = true;
    renderPolygon(polygon);

    const spawnWorld = chooseSafeSpawn(polygon);
    const spawnLocal = toLocalWorld(spawnWorld);
    ski.position.x = spawnLocal.x;
    ski.position.z = spawnLocal.z;
    speed = 0;
    lateralSlip = 0;
    setStatus(`${site.label} · OSM ${state.source}${state.fromCache ? ' · CACHE' : ''}`);
  }

  function saveCache(json) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), json }));
    } catch (error) {
      console.warn('[V0.9.4.1] OSM cache write failed:', error);
    }
  }

  function loadCachedPolygon() {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      const polygon = Geo.extractBestWaterPolygon(cached.json, site.origin);
      return polygon ? { polygon, savedAt: cached.savedAt || 0 } : null;
    } catch (error) {
      console.warn('[V0.9.4.1] OSM cache read failed:', error);
      return null;
    }
  }

  async function fetchFromEndpoint(base) {
    const query = Geo.buildOverpassQuery(site.bounds);
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 14000) : null;
    try {
      const response = await fetch(base + encodeURIComponent(query), controller ? { signal: controller.signal } : undefined);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const polygon = Geo.extractBestWaterPolygon(json, site.origin);
      if (!polygon) throw new Error('No named water polygon found');
      saveCache(json);
      return polygon;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  async function loadWorld() {
    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        setStatus(`OSM 載入中… ${endpoint.includes('kumi') ? '備援' : '主站'}`);
        const polygon = await fetchFromEndpoint(endpoint);
        activatePolygon(polygon, endpoint, false);
        return;
      } catch (error) {
        lastError = error;
        console.warn('[V0.9.4.1] Overpass endpoint failed:', endpoint, error);
      }
    }

    const cached = loadCachedPolygon();
    if (cached) {
      activatePolygon(cached.polygon, 'localStorage-cache', true);
      return;
    }

    state.loading = false;
    state.error = lastError || new Error('OSM load failed');
    setStatus('OSM 載入失敗 · 保留純海洋模式');
  }

  const previousUpdateJetSki = updateJetSki;
  let lastSafeWorld = currentWorldPoint();
  updateJetSki = function v0941RealWorldCollision(dt, t) {
    if (state.active && state.polygon) {
      const before = currentWorldPoint();
      if (Geo.pointInWater(before, state.polygon.outer, state.polygon.holes)) lastSafeWorld = before;
    }

    previousUpdateJetSki(dt, t);

    if (!state.active || !state.polygon) return;
    const after = currentWorldPoint();
    if (!Geo.pointInWater(after, state.polygon.outer, state.polygon.holes)) {
      const local = toLocalWorld(lastSafeWorld);
      ski.position.x = local.x;
      ski.position.z = local.z;
      speed *= 0.28;
      lateralSlip *= -0.12;
      state.collisions += 1;
      if (airStateEl) airStateEl.textContent = '岸邊 SHORE';
    } else {
      lastSafeWorld = after;
    }
  };

  const previousUpdateWater = updateWater;
  updateWater = function v0941RealWorldUpdateWater(t) {
    previousUpdateWater(t);
    syncWorldGroup();
  };

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = visualVersion;
  document.title = `Swim Ring Racing ${visualVersion}`;

  window.V094_REAL_WORLD_WATER = {
    version: visualVersion,
    site,
    state,
    worldGroup,
    reload: loadWorld,
    cacheKey,
    get isActive() { return state.active; }
  };

  loadWorld();
})();
