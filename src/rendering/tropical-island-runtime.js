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
  const frondsPerPalm = mobileLike ? 6 : 7;
  const maxFronds = maxPalms * frondsPerPalm;

  const group = new THREE.Group();
  group.name = 'V01116TropicalIslands';
  scene.add(group);

  const shoreGeometry = new THREE.CylinderGeometry(1, 1.14, 0.22, 16, 1);
  const sandGeometry = new THREE.CylinderGeometry(0.94, 1.06, 0.72, 16, 1);
  const greenGeometry = new THREE.CylinderGeometry(0.73, 0.86, 0.34, 14, 1);
  const trunkGeometry = new THREE.CylinderGeometry(0.16, 0.27, 5.8, 7, 1);
  const crownCoreGeometry = new THREE.SphereGeometry(0.42, 6, 4);
  const leafGeometry = new THREE.BufferGeometry();
  leafGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
     0.00,  0.00, 0.00,
    -0.34, -0.04, 1.55,
    -0.25, -0.12, 3.45,
     0.00, -0.34, 5.35,
     0.25, -0.12, 3.45,
     0.34, -0.04, 1.55
  ], 3));
  leafGeometry.setIndex([
    0, 1, 2,
    0, 2, 3,
    0, 3, 4,
    0, 4, 5
  ]);
  leafGeometry.computeVertexNormals();

  const shoreMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe3a2, roughness: 0.96, metalness: 0, flatShading: true
  });
  const sandMaterial = new THREE.MeshStandardMaterial({
    color: 0xf3c66d, roughness: 0.92, metalness: 0, flatShading: true
  });
  const greenMaterial = new THREE.MeshStandardMaterial({
    color: 0x46ad56, roughness: 0.9, metalness: 0, flatShading: true
  });
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d5524, roughness: 0.94, metalness: 0, flatShading: true
  });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x168f46, roughness: 0.88, metalness: 0,
    side: THREE.DoubleSide, flatShading: true
  });

  const shore = new THREE.InstancedMesh(shoreGeometry, shoreMaterial, maxIslands);
  const sand = new THREE.InstancedMesh(sandGeometry, sandMaterial, maxIslands);
  const green = new THREE.InstancedMesh(greenGeometry, greenMaterial, maxIslands);
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, maxPalms);
  const crownCores = new THREE.InstancedMesh(crownCoreGeometry, leafMaterial, maxPalms);
  const fronds = new THREE.InstancedMesh(leafGeometry, leafMaterial, maxFronds);

  shore.name = 'V01116TropicalIslandShore';
  sand.name = 'V01116TropicalIslandSand';
  green.name = 'V01116TropicalIslandGreen';
  trunks.name = 'V01116TropicalPalmTrunks';
  crownCores.name = 'V01116TropicalPalmCores';
  fronds.name = 'V01116TropicalPalmFronds';

  for (const mesh of [shore, sand, green, trunks, crownCores, fronds]) {
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
    frondCount: 0,
    rebuilds: 0,
    visible: false,
    currentEventId: null,
    minCourseClearance: Infinity,
    drawSurfaces: 6,
    visualOnly: true,
    collisionAdded: false,
    physicsWrites: false,
    gameplayWrites: false,
    raceRuleWrites: false,
    realWorldCoastUntouched: true
  };

  function realWorld3DActive() {
    return Boolean(root.V01051_REAL_WORLD_3D
      && root.V01051_REAL_WORLD_3D.state
      && root.V01051_REAL_WORLD_3D.state.active);
  }

  function shouldShow() {
    return Core.shouldShowForEvent(Manager.selectedEvent, realWorld3DActive());
  }

  function compose(mesh, index, x, y, z, sx, sy, sz, rx, ry, rz) {
    position.set(x, y, z);
    euler.set(rx || 0, ry || 0, rz || 0, 'XYZ');
    quaternion.setFromEuler(euler);
    scale.set(sx, sy, sz);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  }

  function clearInstances() {
    for (const mesh of [shore, sand, green, trunks, crownCores, fronds]) mesh.count = 0;
  }

  function rebuild() {
    placements.length = 0;
    palms.length = 0;
    const event = Manager.selectedEvent || {};
    state.currentEventId = event.id || null;

    if (!Core.shouldShowForEvent(event, false)) {
      clearInstances();
      state.islandCount = 0;
      state.palmCount = 0;
      state.frondCount = 0;
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
    let frondIndex = 0;
    const t = typeof clock !== 'undefined' ? clock.elapsedTime : 0;

    for (let i = 0; i < placements.length; i++) {
      const island = placements[i];
      const waterY = getWaveHeight(island.x, island.z, t);
      const baseY = waterY - 0.18;
      const radius = island.radius;
      const stretchX = 1 + (i % 3) * 0.08;
      const stretchZ = 0.74 + (i % 2) * 0.09;
      minClearance = Math.min(minClearance, island.courseDistance);

      compose(shore, i, island.x, baseY - 0.05, island.z,
        radius * 1.13 * stretchX, 0.55, radius * stretchZ, 0, island.yaw, 0);
      compose(sand, i, island.x, baseY + 0.12, island.z,
        radius * stretchX, 0.85, radius * stretchZ * 0.91, 0, island.yaw, 0);
      compose(green, i, island.x, baseY + 0.56, island.z,
        radius * 0.76 * stretchX, 0.7, radius * stretchZ * 0.69, 0, island.yaw, 0);

      const islandPalms = Core.palmSeeds(island, palmsPerIsland);
      for (const palm of islandPalms) {
        if (palmIndex >= maxPalms) break;
        palms.push(palm);
        const localWaterY = getWaveHeight(palm.x, palm.z, t);
        const palmBaseY = Math.max(baseY + 0.75, localWaterY + 0.28);
        const s = palm.scale;
        const leanX = Math.sin(palm.yaw * 1.7) * 0.06;
        const leanZ = Math.cos(palm.yaw * 1.3) * 0.055;
        const crownY = palmBaseY + 5.76 * s;

        compose(trunks, palmIndex, palm.x, palmBaseY + 2.78 * s, palm.z,
          s, s, s, leanX, palm.yaw, leanZ);
        compose(crownCores, palmIndex, palm.x, crownY, palm.z,
          0.8 * s, 0.55 * s, 0.8 * s, 0, palm.yaw, 0);

        for (let leaf = 0; leaf < frondsPerPalm && frondIndex < maxFronds; leaf++) {
          const angle = palm.yaw + (leaf / frondsPerPalm) * Math.PI * 2;
          const pitch = 0.08 + (leaf % 3) * 0.045;
          const leafScale = s * (0.72 + (leaf % 2) * 0.08);
          compose(fronds, frondIndex, palm.x, crownY, palm.z,
            leafScale, leafScale, leafScale, pitch, angle, 0);
          frondIndex += 1;
        }
        palmIndex += 1;
      }
    }

    shore.count = sand.count = green.count = placements.length;
    trunks.count = crownCores.count = palmIndex;
    fronds.count = frondIndex;
    for (const mesh of [shore, sand, green, trunks, crownCores, fronds]) {
      mesh.instanceMatrix.needsUpdate = true;
    }

    state.islandCount = placements.length;
    state.palmCount = palmIndex;
    state.frondCount = frondIndex;
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
    instancedDressing: true,
    palmFrondGeometry: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
