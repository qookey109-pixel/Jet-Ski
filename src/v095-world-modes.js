// V0.9.5 World Modes — Open Sea + Sun Moon Lake.
// Adds a switchable infinite open-ocean mode without deleting the real-world lake prototype.
(function () {
  'use strict';

  if (!window.THREE || !window.V093_IRREGULAR_INFINITE_OCEAN || !window.V094_REAL_WORLD_WATER) return;
  if (typeof ski === 'undefined' || typeof updateJetSki !== 'function') return;

  const THREE = window.THREE;
  const visualVersion = 'V0.9.5';
  const ocean = window.V093_IRREGULAR_INFINITE_OCEAN;
  const lake = window.V094_REAL_WORLD_WATER;
  const Geo = window.REAL_WORLD_WATER;
  const MODES = Object.freeze({ OPEN_SEA: 'open-sea', LAKE: 'sun-moon-lake' });

  let mode = MODES.OPEN_SEA;
  let openSeaSnapshot = null;
  let lakeSnapshot = null;

  const modeButtons = [...document.querySelectorAll('[data-world-mode]')];
  const hud = document.querySelector('.hud');
  const row = document.createElement('div');
  row.innerHTML = '世界 <span id="world-mode-state">外海 Open Sea</span>';
  if (hud) hud.appendChild(row);
  const modeStateEl = row.querySelector('#world-mode-state');

  const osmAttribution = [...document.querySelectorAll('div')]
    .find(el => el.textContent && el.textContent.trim() === '© OpenStreetMap contributors');

  function worldOffset() {
    return ocean.worldOffset;
  }

  function captureSnapshot() {
    const offset = worldOffset();
    return {
      x: ski.position.x,
      z: ski.position.z,
      offsetX: offset.x,
      offsetZ: offset.y,
      yaw: typeof yaw === 'number' ? yaw : Math.PI,
      speed: typeof speed === 'number' ? speed : 0
    };
  }

  function setWorldOffset(x, z) {
    const offset = worldOffset();
    if (offset && typeof offset.set === 'function') offset.set(x, z);
    else {
      offset.x = x;
      offset.y = z;
    }
  }

  function settleOnWater() {
    if (typeof getWaveHeight === 'function' && typeof physics !== 'undefined') {
      const h = getWaveHeight(ski.position.x, ski.position.z, clock ? clock.elapsedTime : 0);
      ski.position.y = h + physics.floatClearance;
    }
    if (typeof speed !== 'undefined') speed = 0;
    if (typeof lateralSlip !== 'undefined') lateralSlip = 0;
    if (typeof throttleValue !== 'undefined') throttleValue = 0;
    if (typeof verticalVelocity !== 'undefined') verticalVelocity = 0;
    if (typeof airborne !== 'undefined') airborne = false;
  }

  function snapCamera() {
    if (typeof camera === 'undefined' || typeof cameraConfig === 'undefined') return;
    const heading = typeof yaw === 'number' ? yaw : Math.PI;
    const dir = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)).normalize();
    camera.position.copy(ski.position)
      .addScaledVector(dir, -cameraConfig.followDistance)
      .add(new THREE.Vector3(0, cameraConfig.followHeight, 0));
    const target = ski.position.clone()
      .addScaledVector(dir, cameraConfig.lookAhead)
      .add(new THREE.Vector3(0, cameraConfig.lookHeight, 0));
    camera.lookAt(target);
  }

  function restoreSnapshot(snapshot) {
    if (!snapshot) return false;
    setWorldOffset(snapshot.offsetX, snapshot.offsetZ);
    ski.position.x = snapshot.x;
    ski.position.z = snapshot.z;
    if (typeof yaw !== 'undefined') yaw = snapshot.yaw;
    settleOnWater();
    snapCamera();
    return true;
  }

  function ringCentroid(ring) {
    if (!ring || ring.length < 3) return { x: 0, z: 0 };
    let twiceArea = 0, cx = 0, cz = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i], b = ring[i + 1];
      const cross = a.x * b.z - b.x * a.z;
      twiceArea += cross;
      cx += (a.x + b.x) * cross;
      cz += (a.z + b.z) * cross;
    }
    if (Math.abs(twiceArea) < 1e-6) return { x: ring[0].x, z: ring[0].z };
    return { x: cx / (3 * twiceArea), z: cz / (3 * twiceArea) };
  }

  function findLakeSpawn() {
    const polygon = lake.state && lake.state.polygon;
    if (!polygon || !Geo) return { x: 0, z: 0 };
    const origin = { x: 0, z: 0 };
    if (Geo.pointInWater(origin, polygon.outer, polygon.holes)) return origin;
    const center = ringCentroid(polygon.outer);
    if (Geo.pointInWater(center, polygon.outer, polygon.holes)) return center;
    for (let i = 0; i < polygon.outer.length; i += Math.max(1, Math.floor(polygon.outer.length / 48))) {
      const p = polygon.outer[i];
      const c = { x: p.x * 0.75 + center.x * 0.25, z: p.z * 0.75 + center.z * 0.25 };
      if (Geo.pointInWater(c, polygon.outer, polygon.holes)) return c;
    }
    return center;
  }

  function setLakeVisibility(enabled) {
    if (lake.worldGroup) lake.worldGroup.visible = Boolean(enabled && lake.state && lake.state.polygon);
    if (lake.state) lake.state.active = Boolean(enabled && lake.state.polygon);
    if (osmAttribution) osmAttribution.style.display = enabled ? '' : 'none';
  }

  function updateUi() {
    for (const button of modeButtons) {
      button.classList.toggle('active', button.dataset.worldMode === mode);
    }
    if (modeStateEl) {
      modeStateEl.textContent = mode === MODES.OPEN_SEA
        ? '外海 Open Sea · Infinite Ocean'
        : '日月潭 Sun Moon Lake · OSM';
    }
  }

  function enterOpenSea(options) {
    const firstEntry = options && options.firstEntry;
    if (mode === MODES.LAKE) lakeSnapshot = captureSnapshot();
    mode = MODES.OPEN_SEA;
    setLakeVisibility(false);

    if (!restoreSnapshot(openSeaSnapshot)) {
      setWorldOffset(0, 0);
      ski.position.x = 0;
      ski.position.z = 0;
      if (typeof yaw !== 'undefined') yaw = Math.PI;
      settleOnWater();
      snapCamera();
    }
    openSeaSnapshot = captureSnapshot();
    updateUi();

    if (!firstEntry) {
      try { localStorage.setItem('swimRing.worldMode', MODES.OPEN_SEA); } catch (_) {}
    }
  }

  function enterLake() {
    if (mode === MODES.OPEN_SEA) openSeaSnapshot = captureSnapshot();
    mode = MODES.LAKE;

    if (lake.state && lake.state.polygon) {
      if (!restoreSnapshot(lakeSnapshot)) {
        setWorldOffset(0, 0);
        const spawn = findLakeSpawn();
        ski.position.x = spawn.x;
        ski.position.z = spawn.z;
        settleOnWater();
        snapCamera();
      }
      setLakeVisibility(true);
      lakeSnapshot = captureSnapshot();
    } else {
      setLakeVisibility(false);
      if (lake.state && lake.state.error && typeof lake.reload === 'function') lake.reload();
    }

    updateUi();
    try { localStorage.setItem('swimRing.worldMode', MODES.LAKE); } catch (_) {}
  }

  function setMode(nextMode) {
    if (nextMode === MODES.LAKE) enterLake();
    else enterOpenSea();
  }

  for (const button of modeButtons) {
    button.addEventListener('click', () => setMode(button.dataset.worldMode));
  }

  // V0.9.4 loads OSM asynchronously. If it finishes while the user is in Open Sea,
  // it may briefly mark the lake active and move the craft. Catch that before rendering
  // and restore the last Open Sea pose, keeping the lake loaded in the background.
  const previousUpdateJetSki = updateJetSki;
  updateJetSki = function v095WorldModeUpdate(dt, t) {
    if (mode === MODES.OPEN_SEA && lake.state && lake.state.active) {
      setLakeVisibility(false);
      if (openSeaSnapshot) restoreSnapshot(openSeaSnapshot);
    }

    previousUpdateJetSki(dt, t);

    if (mode === MODES.OPEN_SEA) {
      setLakeVisibility(false);
      openSeaSnapshot = captureSnapshot();
    } else if (lake.state && lake.state.polygon) {
      setLakeVisibility(true);
      lakeSnapshot = captureSnapshot();
    }
  };

  // Open Sea is the new default. The lake continues loading/caching in the background.
  enterOpenSea({ firstEntry: true });

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = visualVersion;
  document.title = `Swim Ring Racing ${visualVersion}`;

  window.V095_WORLD_MODES = {
    version: visualVersion,
    modes: MODES,
    setMode,
    get mode() { return mode; },
    get openSeaSnapshot() { return openSeaSnapshot; },
    get lakeSnapshot() { return lakeSnapshot; }
  };
})();
