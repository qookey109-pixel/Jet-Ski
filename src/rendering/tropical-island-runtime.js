// V0.11.16 Tropical Arcade T2: low-cost tropical island/palm dressing, visual-only.
(function (root) {
  'use strict';

  const Core = root.JETSKI_TROPICAL_ISLAND_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  const THREE = root.THREE;
  if (!Core || !Manager || !THREE || typeof scene === 'undefined') return;
  if (typeof getWaveHeight !== 'function') return;

  const VERSION = Core.VERSION;
  const mobileLike = Math.min(root.innerWidth || 9999, root.innerHeight || 9999) < 620
    || /iPhone|iPad|iPod|Android/i.test((root.navigator && root.navigator.userAgent) || '');
  const maxIslands = mobileLike ? Core.DEFAULTS.maxIslandsMobile : Core.DEFAULTS.maxIslandsDesktop;
  const palmsPerIsland = mobileLike ? Core.DEFAULTS.palmsMobile : Core.DEFAULTS.palmsDesktop;
  const maxPalms = maxIslands * palmsPerIsland;

  const group = new THREE.Group();
  group.name = 'V01116TropicalIslands';
  scene.add(group);

  const sandGeometry = new THREE.CylinderGeometry(1, 1.13, 1.15, 14, 1);
  const greenGeometry = new THREE.CylinderGeometry(0.82, 0.96, 0.42, 14, 1);
  const trunkGeometry = new THREE.CylinderGeometry(0.18, 0.28, 5.7, 6, 1);
  const crownGeometry = new THREE.SphereGeometry(1.75, 6, 4);

  const sandMaterial = new THREE.MeshStandardMaterial({ color: 0xf2d28b, roughness: 0.92, metalness: 0 });
  const greenMaterial = new THREE.MeshStandardMaterial({ color: 0x55a85a, roughness: 0.9, metalness: 0 });
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.94, metalness: 0 });
  const crownMaterial = new THREE.MeshStandardMaterial({ color: 0x238a4f, roughness: 0.88, metalness: 0 });

  const sand = new THREE.InstancedMesh(sandGeometry, sandMaterial, maxIslands);
  const green = new THREE.InstancedMesh(greenGeometry, greenMaterial, maxIslands);
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, maxPalms);
  const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, maxPalms);
  sand.name = 'V01116TropicalIslandSand';
  green.name = 'V01116TropicalIslandGreen';
  trunks.name = 'V01116TropicalPalmTrunks';
  crowns.name = 'V01116TropicalPalmCrowns';
  for (const mesh of [sand, green, trunks, crowns]) {
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    mesh.count = 0;
    group.add(mesh);
  }

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();
  const placements = [];
  const palms = [];

  const state = {
    islandCount: 0,
    palmCount: 0,
    rebuilds: 0,
    visible: false,
    currentEventId: null,
    minCourseClearance: Infinity,
    visualOnly: true,
    collisionAdded: false,
    physicsWrites: false,
    gameplayWrites: false,
    raceRuleWrites: false,
    realWorldCoastUntouched: true
  };

  function realWorld3DActive() {
    return Boolean(root.V01051_REAL_WORLD_3D && root.V01051_REAL_WORLD_3D.state && root.V01051_REAL_WORLD_3D.state.active);
  }

  function shouldShow() {
    return Core.shouldShowForEvent(Manager.selectedEvent, realWorld3DActive());
  }

  function composeInstance(mesh, index, x, y, z, sx, sy, sz, yaw) {
    position.set(x, y, z);
    euler.set(0, yaw || 0, 0);
    quaternion.setFromEuler(euler);
    scale.set(sx, sy, sz);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  }

  function rebuild() {
    placements.length = 0;
    palms.length = 0;
    const event = Manager.selectedEvent || {};
    state.currentEventId = event.id || null;

    if (!Core.shouldShowForEvent(event, false)) {
      sand.count = green.count = trunks.count = crowns.count = 0;
      state.islandCount = 0;
      state.palmCount = 0;
      state.minCourseClearance = Infinity;
      state.rebuilds += 1;
      group.visible = false;
      state.visible = false;
      return;
    }

    const course = Manager.course;
    const nextPlacements = Core.deriveIslandPlacements(course, { maxIslands });
    placements.push(...nextPlacements);
    let minClearance = Infinity;
    let palmIndex = 0;
    const t = typeof clock !== 'undefined' ? clock.elapsedTime : 0;

    for (let i = 0; i < placements.length; i++) {
      const island = placements[i];
      const waterY = getWaveHeight(island.x, island.z, t);
      const baseY = waterY - 0.15;
      const radius = island.radius;
      minClearance = Math.min(minClearance, island.courseDistance);
      composeInstance(sand, i, island.x, baseY, island.z, radius, 1, radius * 0.82, island.yaw);
      composeInstance(green, i, island.x, baseY + 0.52, island.z, radius * 0.78, 1, radius * 0.63, island.yaw);

      const islandPalms = Core.palmSeeds(island, palmsPerIsland);
      for (const palm of islandPalms) {
        if (palmIndex >= maxPalms) break;
        palms.push(palm);
        const localWaterY = getWaveHeight(palm.x, palm.z, t);
        const palmBaseY = Math.max(baseY + 0.66, localWaterY + 0.25);
        const s = palm.scale;
        composeInstance(trunks, palmIndex, palm.x, palmBaseY + 2.75 * s, palm.z, s, s, s, palm.yaw);
        composeInstance(crowns, palmIndex, palm.x, palmBaseY + 5.72 * s, palm.z, 1.08 * s, 0.34 * s, 1.08 * s, palm.yaw);
        palmIndex += 1;
      }
    }

    sand.count = green.count = placements.length;
    trunks.count = crowns.count = palmIndex;
    for (const mesh of [sand, green, trunks, crowns]) mesh.instanceMatrix.needsUpdate = true;
    state.islandCount = placements.length;
    state.palmCount = palmIndex;
    state.minCourseClearance = minClearance;
    state.rebuilds += 1;
    group.visible = shouldShow() && placements.length > 0;
    state.visible = group.visible;
  }

  function refreshVisibility() {
    const visible = shouldShow() && placements.length > 0;
    if (group.visible !== visible) group.visible = visible;
    state.visible = visible;
  }

  root.addEventListener('jetski:race-ready', rebuild);
  root.addEventListener('jetski:race-origin-shift', rebuild);
  root.addEventListener('jetski:race-selected', () => {
    group.visible = false;
    state.visible = false;
  });

  let lastVisibilityCheck = 0;
  function tick(now) {
    if (now - lastVisibilityCheck >= 500) {
      refreshVisibility();
      lastVisibilityCheck = now;
    }
    root.requestAnimationFrame(tick);
  }
  root.requestAnimationFrame(tick);

  const phase = Manager.state && Manager.state.phase;
  if (phase === 'countdown' || phase === 'racing' || phase === 'paused') rebuild();
  else group.visible = false;

  root.JETSKI_TROPICAL_ISLANDS = {
    version: VERSION,
    state,
    group,
    placements,
    rebuild,
    refreshVisibility,
    visualOnly: true,
    collisionAdded: false,
    physicsUntouched: true,
    gameplayUntouched: true,
    realWorldCoastUntouched: true,
    google3DRespected: true,
    instancedDressing: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
