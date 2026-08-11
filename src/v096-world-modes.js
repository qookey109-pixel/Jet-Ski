// V0.9.6 World Modes — Open Sea, Taiwan Coast, Sun Moon Lake.
// Taiwan Coast is continuous: OSM land exists locally while the water side stays infinite ocean.
(function () {
  'use strict';

  if (!window.THREE || !window.V093_IRREGULAR_INFINITE_OCEAN || !window.V094_REAL_WORLD_WATER || !window.V096_TAIWAN_COAST) return;
  if (typeof ski === 'undefined' || typeof updateJetSki !== 'function') return;

  const THREE = window.THREE;
  const ocean = window.V093_IRREGULAR_INFINITE_OCEAN;
  const lake = window.V094_REAL_WORLD_WATER;
  const coast = window.V096_TAIWAN_COAST;
  const Geo = window.REAL_WORLD_WATER;
  const MODES = Object.freeze({
    OPEN_SEA: 'open-sea',
    COAST: 'taiwan-coast',
    LAKE: 'sun-moon-lake'
  });

  let mode = MODES.OPEN_SEA;
  let pendingCoastSpawn = false;
  let coastInitialized = false;
  const snapshots = {
    [MODES.OPEN_SEA]: null,
    [MODES.COAST]: null,
    [MODES.LAKE]: null
  };

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
      yaw: typeof yaw === 'number' ? yaw : Math.PI
    };
  }

  function saveCurrentSnapshot() {
    snapshots[mode] = captureSnapshot();
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
    const t = typeof clock !== 'undefined' ? clock.elapsedTime : 0;
    if (typeof getWaveHeight === 'function' && typeof physics !== 'undefined') {
      ski.position.y = getWaveHeight(ski.position.x, ski.position.z, t) + physics.floatClearance;
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

  function setLakeEnabled(enabled) {
    if (lake.worldGroup) lake.worldGroup.visible = Boolean(enabled && lake.state && lake.state.polygon);
    if (lake.state) lake.state.active = Boolean(enabled && lake.state.polygon);
  }

  function setAttribution(enabled) {
    if (osmAttribution) osmAttribution.style.display = enabled ? '' : 'none';
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
    if (Geo.pointInWater({ x: 0, z: 0 }, polygon.outer, polygon.holes)) return { x: 0, z: 0 };
    const center = ringCentroid(polygon.outer);
    if (Geo.pointInWater(center, polygon.outer, polygon.holes)) return center;
    for (let i = 0; i < polygon.outer.length; i += Math.max(1, Math.floor(polygon.outer.length / 48))) {
      const p = polygon.outer[i];
      const candidate = { x: p.x * 0.75 + center.x * 0.25, z: p.z * 0.75 + center.z * 0.25 };
      if (Geo.pointInWater(candidate, polygon.outer, polygon.holes)) return candidate;
    }
    return center;
  }

  function updateUi() {
    for (const button of modeButtons) {
      button.classList.toggle('active', button.dataset.worldMode === mode);
    }
    if (!modeStateEl) return;
    if (mode === MODES.COAST) modeStateEl.textContent = '台灣東岸 · 七星潭 → 太平洋外海';
    else if (mode === MODES.LAKE) modeStateEl.textContent = '日月潭 Sun Moon Lake · OSM';
    else modeStateEl.textContent = '外海 Open Sea · Infinite Ocean';
  }

  function resetOceanPose() {
    setWorldOffset(0, 0);
    ski.position.x = 0;
    ski.position.z = 0;
    if (typeof yaw !== 'undefined') yaw = Math.PI;
    settleOnWater();
    snapCamera();
  }

  function enterOpenSea() {
    saveCurrentSnapshot();
    mode = MODES.OPEN_SEA;
    pendingCoastSpawn = false;
    setLakeEnabled(false);
    coast.setEnabled(false);
    setAttribution(false);
    if (!restoreSnapshot(snapshots[MODES.OPEN_SEA])) resetOceanPose();
    updateUi();
  }

  function placeAtCoastSpawn() {
    const spawn = coast.findSpawn(180);
    if (!spawn) return false;
    setWorldOffset(0, 0);
    ski.position.x = spawn.x;
    ski.position.z = spawn.z;
    const nearest = window.REAL_WORLD_COAST && window.REAL_WORLD_COAST.nearestCoast
      ? window.REAL_WORLD_COAST.nearestCoast(spawn, coast.state.coastlines)
      : null;
    if (nearest && typeof yaw !== 'undefined') yaw = Math.atan2(nearest.waterNormal.x, nearest.waterNormal.z);
    settleOnWater();
    snapCamera();
    coastInitialized = true;
    snapshots[MODES.COAST] = captureSnapshot();
    return true;
  }

  function enterCoast() {
    saveCurrentSnapshot();
    mode = MODES.COAST;
    setLakeEnabled(false);
    coast.setEnabled(true);
    setAttribution(true);

    if (coastInitialized && snapshots[MODES.COAST]) {
      restoreSnapshot(snapshots[MODES.COAST]);
      pendingCoastSpawn = false;
    } else if (coast.state.loaded) {
      pendingCoastSpawn = !placeAtCoastSpawn();
    } else {
      pendingCoastSpawn = true;
      resetOceanPose();
      snapshots[MODES.COAST] = captureSnapshot();
    }
    updateUi();
  }

  function enterLake() {
    saveCurrentSnapshot();
    mode = MODES.LAKE;
    pendingCoastSpawn = false;
    coast.setEnabled(false);
    setAttribution(true);

    if (lake.state && lake.state.polygon) {
      if (!restoreSnapshot(snapshots[MODES.LAKE])) {
        setWorldOffset(0, 0);
        const spawn = findLakeSpawn();
        ski.position.x = spawn.x;
        ski.position.z = spawn.z;
        settleOnWater();
        snapCamera();
      }
      setLakeEnabled(true);
    } else {
      setLakeEnabled(false);
      if (lake.state && lake.state.error && typeof lake.reload === 'function') lake.reload();
    }
    updateUi();
  }

  function setMode(nextMode) {
    if (nextMode === MODES.COAST) enterCoast();
    else if (nextMode === MODES.LAKE) enterLake();
    else enterOpenSea();
    try { localStorage.setItem('swimRing.worldMode', mode); } catch (_) {}
  }

  for (const button of modeButtons) {
    button.addEventListener('click', () => setMode(button.dataset.worldMode));
  }

  const previousUpdateJetSki = updateJetSki;
  updateJetSki = function v096WorldModeUpdate(dt, t) {
    if (mode !== MODES.LAKE && lake.state && lake.state.active) {
      setLakeEnabled(false);
      const snapshot = snapshots[mode];
      if (snapshot) restoreSnapshot(snapshot);
    }

    if (mode !== MODES.COAST && coast.state.active) coast.setEnabled(false);
    if (mode === MODES.COAST && !coast.state.requested) coast.setEnabled(true);

    previousUpdateJetSki(dt, t);

    if (mode === MODES.COAST) {
      if (pendingCoastSpawn && coast.state.loaded) {
        pendingCoastSpawn = !placeAtCoastSpawn();
        coast.setEnabled(true);
      }
      snapshots[MODES.COAST] = captureSnapshot();
      setLakeEnabled(false);
      setAttribution(true);
    } else if (mode === MODES.LAKE) {
      if (lake.state && lake.state.polygon) {
        setLakeEnabled(true);
        snapshots[MODES.LAKE] = captureSnapshot();
      }
      coast.setEnabled(false);
      setAttribution(true);
    } else {
      snapshots[MODES.OPEN_SEA] = captureSnapshot();
      setLakeEnabled(false);
      coast.setEnabled(false);
      setAttribution(false);
    }
  };

  setLakeEnabled(false);
  coast.setEnabled(false);
  setAttribution(false);
  snapshots[MODES.OPEN_SEA] = captureSnapshot();
  updateUi();

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = 'V0.9.6';
  document.title = 'Swim Ring Racing V0.9.6';

  window.V096_WORLD_MODES = {
    version: 'V0.9.6',
    modes: MODES,
    setMode,
    snapshots,
    get mode() { return mode; },
    get coastInitialized() { return coastInitialized; }
  };
})();
