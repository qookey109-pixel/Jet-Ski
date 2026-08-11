// V0.9.4 Real World Water Map MVP — Sun Moon Lake.
// Loads OSM water geometry through Overpass, renders a simple shoreline bank mesh,
// and constrains the swim ring to the real water polygon while preserving V0.9.3 ocean physics.
(function () {
  'use strict';

  if (!window.THREE || !window.REAL_WORLD_WATER || typeof scene === 'undefined' || typeof ski === 'undefined') return;

  const THREE = window.THREE;
  const Geo = window.REAL_WORLD_WATER;
  const visualVersion = 'V0.9.4';
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
  worldGroup.name = 'V094SunMoonLakeWorld';
  scene.add(worldGroup);

  const state = {
    active: false,
    loading: true,
    error: null,
    polygon: null,
    source: null,
    endpoint: null,
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

  function makeBankMesh(ring, options) {
    const bottom = options && options.bottom != null ? options.bottom : -8;
    const top = options && options.top != null ? options.top : 9;
    const positions = [];
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i], b = ring[i + 1];
      positions.push(
        a.x, bottom, a.z, b.x, bottom, b.z, b.x, top, b.z,
        a.x, bottom, a.z, b.x, top, b.z, a.x, top, a.z
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: options && options.color ? options.color : 0x496842,
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  function makeShoreLine(ring, color) {
    const pts = ring.map(p => new THREE.Vector3(p.x, 9.05, p.z));
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.82 }));
  }

  function renderPolygon(polygon) {
    worldGroup.clear();
    const outer = Geo.simplifyRing(polygon.outer, 9);
    worldGroup.add(makeBankMesh(outer, { color: 0x496842, bottom: -8, top: 9 }));
    worldGroup.add(makeShoreLine(outer, 0xbed79c));

    for (const holeRaw of polygon.holes || []) {
      const hole = Geo.simplifyRing(holeRaw, 7);
      if (hole.length < 4) continue;
      worldGroup.add(makeBankMesh(hole, { color: 0x5b6b3d, bottom: -8, top: 9 }));
      worldGroup.add(makeShoreLine(hole, 0xd7e0a8));
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

  function activatePolygon(polygon, endpoint) {
    polygon.outer = Geo.simplifyRing(polygon.outer, 5);
    polygon.holes = (polygon.holes || []).map(h => Geo.simplifyRing(h, 5));
    state.polygon = polygon;
    state.source = `${polygon.sourceType}/${polygon.sourceId}`;
    state.endpoint = endpoint;
    state.loading = false;
    state.active = true;
    renderPolygon(polygon);

    const spawnWorld = chooseSafeSpawn(polygon);
    const spawnLocal = toLocalWorld(spawnWorld);
    ski.position.x = spawnLocal.x;
    ski.position.z = spawnLocal.z;
    speed = 0;
    lateralSlip = 0;
    setStatus(`${site.label} · OSM ${state.source}`);
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
        activatePolygon(polygon, endpoint);
        return;
      } catch (error) {
        lastError = error;
        console.warn('[V0.9.4] Overpass endpoint failed:', endpoint, error);
      }
    }
    state.loading = false;
    state.error = lastError || new Error('OSM load failed');
    setStatus('OSM 載入失敗 · 保留純海洋模式');
  }

  const previousUpdateJetSki = updateJetSki;
  let lastSafeWorld = currentWorldPoint();
  updateJetSki = function v094RealWorldCollision(dt, t) {
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
  updateWater = function v094RealWorldUpdateWater(t) {
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
    get isActive() { return state.active; }
  };

  loadWorld();
})();
