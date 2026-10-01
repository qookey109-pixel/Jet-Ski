// V0.11.16 Tropical Arcade T3: visual-only environment + water polish.
(function (root) {
  'use strict';

  const Core = root.JETSKI_TROPICAL_POLISH_CORE;
  const Islands = root.JETSKI_TROPICAL_ISLANDS;
  const Manager = root.JETSKI_RACE_MANAGER;
  const THREE = root.THREE;
  if (!Core || !Islands || !Manager || !THREE || typeof scene === 'undefined') return;
  if (typeof getWaveHeight !== 'function') return;

  const mobileLike = Math.min(root.innerWidth || 9999, root.innerHeight || 9999) < 620
    || /iPhone|iPad|iPod|Android/i.test((root.navigator && root.navigator.userAgent) || '');

  const maxRocks = mobileLike ? Core.DEFAULTS.maxRocksMobile : Core.DEFAULTS.maxRocksDesktop;
  const maxFoam = mobileLike ? Core.DEFAULTS.maxFoamRingsMobile : Core.DEFAULTS.maxFoamRingsDesktop;
  const maxShallow = mobileLike ? Core.DEFAULTS.maxShallowRingsMobile : Core.DEFAULTS.maxShallowRingsDesktop;
  const maxDistant = mobileLike ? Core.DEFAULTS.maxDistantIslandsMobile : Core.DEFAULTS.maxDistantIslandsDesktop;

  const group = new THREE.Group();
  group.name = 'V01116TropicalPolish';
  scene.add(group);

  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  const distantGeo = new THREE.ConeGeometry(1, 1.6, 7, 1);
  const ringGeo = new THREE.RingGeometry(0.72, 1.0, 36, 1);

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x465453, roughness: 0.98, metalness: 0, flatShading: true
  });
  const distantMat = new THREE.MeshStandardMaterial({
    color: 0x27735d, roughness: 0.95, metalness: 0, flatShading: true,
    transparent: true, opacity: 0.72
  });
  const shallowMat = new THREE.MeshBasicMaterial({
    color: 0x55e7dc, transparent: true, opacity: 0.16,
    depthWrite: false, side: THREE.DoubleSide
  });
  const foamMat = new THREE.MeshBasicMaterial({
    color: 0xf4fff8, transparent: true, opacity: 0.48,
    depthWrite: false, side: THREE.DoubleSide
  });

  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, maxRocks);
  const shallow = new THREE.InstancedMesh(ringGeo, shallowMat, maxShallow);
  const foam = new THREE.InstancedMesh(ringGeo, foamMat, maxFoam);
  const distant = new THREE.InstancedMesh(distantGeo, distantMat, maxDistant);
  rocks.name = 'V01116TropicalPolishRocks';
  shallow.name = 'V01116TropicalPolishShallow';
  foam.name = 'V01116TropicalPolishFoam';
  distant.name = 'V01116TropicalPolishDistantIslands';

  for (const mesh of [rocks, shallow, foam, distant]) {
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
  const rockSeeds = [];
  const foamSeeds = [];
  const shallowSeeds = [];
  const distantSeeds = [];

  const state = {
    visible: false,
    rebuilds: 0,
    rockCount: 0,
    foamCount: 0,
    shallowCount: 0,
    distantIslandCount: 0,
    speedStrength: 0,
    waterColorOnly: true,
    drawSurfaces: 4,
    collisionAdded: false,
    physicsWrites: false,
    gameplayWrites: false,
    raceRuleWrites: false,
    waterPhysicsWrites: false,
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

  function clear() {
    for (const mesh of [rocks, shallow, foam, distant]) mesh.count = 0;
    state.rockCount = state.foamCount = state.shallowCount = state.distantIslandCount = 0;
  }

  function rebuild() {
    rockSeeds.length = foamSeeds.length = shallowSeeds.length = distantSeeds.length = 0;
    if (!Core.shouldShowForEvent(Manager.selectedEvent, false) || !Islands.placements.length) {
      clear();
      group.visible = false;
      state.visible = false;
      state.rebuilds += 1;
      return;
    }

    rockSeeds.push(...Core.rockSeeds(Islands.placements, maxRocks));
    foamSeeds.push(...Core.shorelineSeeds(Islands.placements, maxFoam, Core.DEFAULTS.shorelineScale));
    shallowSeeds.push(...Core.shorelineSeeds(Islands.placements, maxShallow, Core.DEFAULTS.shallowScale));
    distantSeeds.push(...Core.distantIslandSeeds(Manager.course, maxDistant));

    const t = typeof clock !== 'undefined' ? clock.elapsedTime : 0;

    for (let i = 0; i < rockSeeds.length; i++) {
      const s = rockSeeds[i];
      const y = getWaveHeight(s.x, s.z, t) + 0.16;
      compose(rocks, i, s.x, y, s.z, 1.6 * s.scale, 0.9 * s.scale, 1.25 * s.scale, 0.1, s.yaw, 0.08);
    }
    rocks.count = rockSeeds.length;

    for (let i = 0; i < shallowSeeds.length; i++) {
      const s = shallowSeeds[i];
      const y = getWaveHeight(s.x, s.z, t) + 0.035;
      compose(shallow, i, s.x, y, s.z, s.radius, s.radius * s.squash, s.radius, -Math.PI / 2, s.yaw, 0);
    }
    shallow.count = shallowSeeds.length;

    for (let i = 0; i < foamSeeds.length; i++) {
      const s = foamSeeds[i];
      const y = getWaveHeight(s.x, s.z, t) + 0.075;
      compose(foam, i, s.x, y, s.z, s.radius, s.radius * s.squash, s.radius, -Math.PI / 2, s.yaw, 0);
    }
    foam.count = foamSeeds.length;

    for (let i = 0; i < distantSeeds.length; i++) {
      const s = distantSeeds[i];
      const y = getWaveHeight(s.x, s.z, t) - 1.2;
      compose(distant, i, s.x, y + 7 * s.scale, s.z, 18 * s.scale, 10 * s.scale, 13 * s.scale, 0, s.yaw, 0);
    }
    distant.count = distantSeeds.length;

    for (const mesh of [rocks, shallow, foam, distant]) mesh.instanceMatrix.needsUpdate = true;
    state.rockCount = rocks.count;
    state.foamCount = foam.count;
    state.shallowCount = shallow.count;
    state.distantIslandCount = distant.count;
    state.rebuilds += 1;
    group.visible = shouldShow();
    state.visible = group.visible;
  }

  function update(now) {
    const visible = shouldShow() && Islands.state && Islands.state.visible;
    group.visible = visible;
    state.visible = visible;

    const maxSpeed = typeof physics !== 'undefined' ? Number(physics.maxSpeed) || 1 : 1;
    const currentSpeed = typeof speed !== 'undefined' ? Number(speed) || 0 : 0;
    const strength = Core.speedVisualStrength(currentSpeed, maxSpeed);
    state.speedStrength = strength;

    // Presentation-only pulse: shoreline foam becomes slightly brighter at speed.
    foamMat.opacity = 0.42 + strength * 0.12;
    shallowMat.opacity = 0.13 + strength * 0.05;

    if (visible && foam.count) {
      const pulse = 1 + Math.sin(now * 0.0018) * 0.025;
      foam.scale.set(pulse, pulse, pulse);
    } else {
      foam.scale.set(1, 1, 1);
    }
  }

  root.addEventListener('jetski:race-ready', rebuild);
  root.addEventListener('jetski:race-origin-shift', rebuild);
  root.addEventListener('jetski:race-selected', () => {
    group.visible = false;
    state.visible = false;
  });

  let last = 0;
  function tick(now) {
    if (now - last >= 100) {
      update(now);
      last = now;
    }
    root.requestAnimationFrame(tick);
  }
  root.requestAnimationFrame(tick);

  const phase = Manager.state && Manager.state.phase;
  if (phase === 'countdown' || phase === 'racing' || phase === 'paused') {
    root.setTimeout(rebuild, 0);
  } else {
    group.visible = false;
  }

  root.JETSKI_TROPICAL_POLISH = {
    version: Core.VERSION,
    state,
    group,
    rocks,
    shallow,
    foam,
    distant,
    rebuild,
    visualOnly: true,
    collisionAdded: false,
    physicsUntouched: true,
    gameplayUntouched: true,
    raceRulesUntouched: true,
    waterPhysicsUntouched: true,
    google3DRespected: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
