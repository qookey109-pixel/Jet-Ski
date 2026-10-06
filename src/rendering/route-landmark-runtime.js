// V0.11.16 T14 route landmark + active checkpoint beacon.
(function (root) {
  'use strict';

  const THREE = root.THREE;
  const Core = root.JETSKI_ROUTE_LANDMARK_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  if (!THREE || !Core || !Manager || typeof scene === 'undefined') return;

  const mobileLike = Math.min(root.innerWidth || 9999, root.innerHeight || 9999) < 620
    || /iPhone|iPad|iPod|Android/i.test((root.navigator && root.navigator.userAgent) || '');

  const group = new THREE.Group();
  group.name = 'V01116RouteLandmarksT14';
  scene.add(group);

  const landmarkLayer = new THREE.Group();
  landmarkLayer.name = 'V01116LandmarkLayerT14';
  group.add(landmarkLayer);

  const beaconLayer = new THREE.Group();
  beaconLayer.name = 'V01116CheckpointBeaconT14';
  group.add(beaconLayer);

  const palette = {
    coral: new THREE.MeshStandardMaterial({ color: 0xff6b4a, roughness: 0.44, metalness: 0.01 }),
    sun: new THREE.MeshStandardMaterial({ color: 0xffd84d, roughness: 0.40, metalness: 0.01 }),
    aqua: new THREE.MeshStandardMaterial({ color: 0x6ce6dc, roughness: 0.38, metalness: 0.02 }),
    navy: new THREE.MeshStandardMaterial({ color: 0x15384c, roughness: 0.56, metalness: 0.04 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xfff1cc, roughness: 0.48, metalness: 0.0 })
  };

  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0x8ff7ff,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const beaconHaloMat = new THREE.MeshBasicMaterial({
    color: 0xffe667,
    transparent: true,
    opacity: 0.52,
    depthWrite: false
  });

  const beaconColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(Core.DEFAULTS.beaconRadius, Core.DEFAULTS.beaconRadius * 0.72,
      Core.DEFAULTS.beaconHeight, 14, 1, true),
    beaconMat
  );
  beaconColumn.name = 'V01116ActiveBeaconColumnT14';
  beaconColumn.renderOrder = 17;
  beaconLayer.add(beaconColumn);

  const beaconHalo = new THREE.Mesh(
    new THREE.TorusGeometry(3.2, 0.13, 8, 28),
    beaconHaloMat
  );
  beaconHalo.name = 'V01116ActiveBeaconHaloT14';
  beaconHalo.rotation.x = Math.PI / 2;
  beaconHalo.renderOrder = 18;
  beaconLayer.add(beaconHalo);

  const entries = [];
  let seeds = [];
  let lastUpdate = 0;

  const state = {
    visible: false,
    landmarkCount: 0,
    uniqueTypes: 0,
    activeIndex: -1,
    activeBeaconVisible: false,
    rebuilds: 0,
    physicsWrites: false,
    gameplayWrites: false,
    raceRuleWrites: false,
    checkpointWrites: false,
    cameraWrites: false,
    realWorldCoastUntouched: true,
    google3DRespected: true,
    mobileBudget: mobileLike
  };

  function mark(mesh) {
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData.visualOnly = true;
    return mesh;
  }

  function realWorld3DActive() {
    return Boolean(root.V01051_REAL_WORLD_3D
      && root.V01051_REAL_WORLD_3D.state
      && root.V01051_REAL_WORLD_3D.state.active);
  }

  function shouldShow() {
    return Core.shouldShowForEvent(Manager.selectedEvent, realWorld3DActive());
  }

  function waterY(x, z) {
    if (typeof getWaveHeight === 'function') {
      const t = typeof clock !== 'undefined' ? clock.elapsedTime : performance.now() / 1000;
      return getWaveHeight(x, z, t);
    }
    return 0;
  }

  function createSunSail(seed) {
    const g = new THREE.Group();
    const mast = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.13, 5.8, 8), palette.navy));
    mast.position.y = 3.1;

    const sailGeo = new THREE.BufferGeometry();
    sailGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0,
      0, 4.7, 0,
      2.6, 0.5, 0
    ], 3));
    sailGeo.setIndex([0,1,2]);
    sailGeo.computeVertexNormals();
    const sail = mark(new THREE.Mesh(sailGeo, palette.sun));
    sail.position.set(0.14, 1.0, 0);

    const sun = mark(new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), palette.coral));
    sun.position.set(-0.55, 5.0, 0);

    const float = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.92, 0.28, 14), palette.cream));
    float.position.y = 0.30;

    g.add(mast, sail, sun, float);
    return g;
  }

  function createReefSpire(seed) {
    const g = new THREE.Group();
    const base = mark(new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.65, 0.50, 7), palette.aqua));
    base.position.y = 0.35;
    const spireA = mark(new THREE.Mesh(new THREE.ConeGeometry(0.62, 4.8, 7), palette.coral));
    const spireB = mark(new THREE.Mesh(new THREE.ConeGeometry(0.42, 3.4, 7), palette.sun));
    spireA.position.set(-0.28, 2.6, 0);
    spireB.position.set(0.58, 1.95, 0.16);
    spireB.rotation.z = -0.12;
    g.add(base, spireA, spireB);
    return g;
  }

  function createTwinFin(seed) {
    const g = new THREE.Group();
    const finGeo = new THREE.BoxGeometry(0.36, 4.2, 1.55);
    const left = mark(new THREE.Mesh(finGeo, palette.coral));
    const right = mark(new THREE.Mesh(finGeo, palette.sun));
    left.position.set(-0.72, 2.45, 0);
    right.position.set(0.72, 2.45, 0);
    left.rotation.z = 0.18;
    right.rotation.z = -0.18;
    const bridge = mark(new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.20, 0.28), palette.cream));
    bridge.position.y = 4.2;
    const float = mark(new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 0.30, 12), palette.aqua));
    float.position.y = 0.30;
    g.add(left, right, bridge, float);
    return g;
  }

  function createNavTower(seed) {
    const g = new THREE.Group();
    const body = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.82, 4.6, 8), palette.navy));
    body.position.y = 2.55;
    const cap = mark(new THREE.Mesh(new THREE.ConeGeometry(0.92, 1.2, 8), palette.sun));
    cap.position.y = 5.35;
    const band = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.66, 0.38, 8), palette.coral));
    band.position.y = 3.15;
    const float = mark(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.25, 0.28, 12), palette.cream));
    float.position.y = 0.28;
    g.add(body, cap, band, float);
    return g;
  }

  function createLandmark(seed) {
    let g;
    if (seed.type === 'sun-sail') g = createSunSail(seed);
    else if (seed.type === 'reef-spire') g = createReefSpire(seed);
    else if (seed.type === 'twin-fin') g = createTwinFin(seed);
    else g = createNavTower(seed);

    g.name = `V01116LandmarkT14-${seed.type}-${seed.index}`;
    g.userData.visualVersion = Core.VERSION;
    g.userData.type = seed.type;
    g.userData.courseIndex = seed.index;
    g.position.set(seed.x, waterY(seed.x, seed.z), seed.z);
    g.rotation.y = seed.yaw;
    if (mobileLike) g.scale.setScalar(0.90);
    landmarkLayer.add(g);
    entries.push({ group: g, seed });
  }

  function rebuild() {
    landmarkLayer.clear();
    entries.length = 0;
    seeds = [];
    const course = Manager.course;
    if (!shouldShow() || !course || !Array.isArray(course.checkpoints)) {
      group.visible = false;
      state.visible = false;
      state.landmarkCount = 0;
      return;
    }

    seeds = Core.landmarkSeeds(course, { landmarkCount: Core.DEFAULTS.landmarkCount });
    for (const seed of seeds) createLandmark(seed);

    state.landmarkCount = entries.length;
    state.uniqueTypes = new Set(seeds.map(s => s.type)).size;
    state.rebuilds += 1;
    updateVisibility(true);
  }

  function updateVisibility(force) {
    const phase = Manager.state && Manager.state.phase || 'menu';
    const driving = phase === 'countdown' || phase === 'racing' || phase === 'paused' || phase === 'finished';
    const visible = shouldShow() && driving && entries.length > 0;
    group.visible = visible;
    state.visible = visible;

    const active = visible && (phase === 'countdown' || phase === 'racing')
      ? Number(Manager.state.nextCheckpointIndex)
      : -1;
    state.activeIndex = Number.isFinite(active) ? active : -1;
    const cps = Manager.course && Manager.course.checkpoints;
    const cp = Array.isArray(cps) && state.activeIndex >= 0 ? cps[state.activeIndex] : null;

    if (cp) {
      const y = waterY(cp.x, cp.z);
      beaconColumn.position.set(cp.x, y + Core.DEFAULTS.beaconHeight * 0.5 + 0.12, cp.z);
      beaconHalo.position.set(cp.x, y + 0.18, cp.z);
      const pulse = 1 + 0.10 * Math.sin(performance.now() * 0.006);
      beaconHalo.scale.setScalar(pulse);
      beaconLayer.visible = true;
    } else {
      beaconLayer.visible = false;
    }
    state.activeBeaconVisible = beaconLayer.visible;
  }

  function update(now) {
    const t = Number(now) || performance.now();
    if (t - lastUpdate >= 100) {
      lastUpdate = t;
      for (const entry of entries) {
        entry.group.position.y = waterY(entry.seed.x, entry.seed.z);
      }
      updateVisibility(false);
    }
    root.requestAnimationFrame(update);
  }

  root.addEventListener('jetski:race-ready', rebuild);
  root.addEventListener('jetski:race-origin-shift', rebuild);
  root.addEventListener('jetski:race-selected', () => {
    group.visible = false;
    state.visible = false;
  });

  if (Manager.course && Manager.selectedEvent) rebuild();
  else group.visible = false;
  root.requestAnimationFrame(update);

  root.JETSKI_ROUTE_LANDMARKS = {
    version: Core.VERSION,
    group,
    state,
    rebuild,
    visualOnly: true,
    collisionAdded: false,
    physicsUntouched: true,
    gameplayUntouched: true,
    raceRulesUntouched: true,
    checkpointAuthorityUntouched: true,
    cameraUntouched: true,
    courseMutation: false,
    realWorldCoastUntouched: true,
    google3DRespected: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
