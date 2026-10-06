// V0.11.16 T10 race-venue staging. Visual-only start/finish line + countdown pylons.
(function (root) {
  'use strict';

  const THREE = root.THREE;
  const Core = root.JETSKI_RACE_STAGING_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  if (!THREE || !Core || !Manager || typeof scene === 'undefined' || typeof getWaveHeight !== 'function') return;

  const mobileLike = Math.min(root.innerWidth || 9999, root.innerHeight || 9999) < 620
    || /iPhone|iPad|iPod|Android/i.test((root.navigator && root.navigator.userAgent) || '');
  const tileCount = mobileLike ? Core.DEFAULTS.tileCountMobile : Core.DEFAULTS.tileCountDesktop;

  const group = new THREE.Group();
  group.name = 'V01116RaceVenueT10';
  scene.add(group);

  const tileGeo = new THREE.BoxGeometry(1.7, 0.10, 1.25);
  const tileRedMat = new THREE.MeshStandardMaterial({
    color: 0xff4b3e, emissive: 0x6f0d08, emissiveIntensity: 0.42, roughness: 0.42
  });
  const tileYellowMat = new THREE.MeshStandardMaterial({
    color: 0xffd849, emissive: 0x755200, emissiveIntensity: 0.34, roughness: 0.40
  });
  const redTiles = new THREE.InstancedMesh(tileGeo, tileRedMat, Math.ceil(tileCount / 2));
  const yellowTiles = new THREE.InstancedMesh(tileGeo, tileYellowMat, Math.ceil(tileCount / 2));
  redTiles.name = 'V01116T10StartLineRed';
  yellowTiles.name = 'V01116T10StartLineYellow';
  redTiles.castShadow = false; redTiles.receiveShadow = false;
  yellowTiles.castShadow = false; yellowTiles.receiveShadow = false;
  group.add(redTiles, yellowTiles);

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x173344, roughness: 0.62, metalness: 0.06 });
  const panelRedMat = new THREE.MeshStandardMaterial({ color: 0xff4b3e, emissive: 0x6f0d08, emissiveIntensity: 0.32, roughness: 0.42 });
  const panelYellowMat = new THREE.MeshStandardMaterial({ color: 0xffd849, emissive: 0x755200, emissiveIntensity: 0.28, roughness: 0.42 });
  const redLightMat = new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff1609, emissiveIntensity: 0.18, roughness: 0.28 });
  const amberLightMat = new THREE.MeshStandardMaterial({ color: 0xffc928, emissive: 0xff9c00, emissiveIntensity: 0.16, roughness: 0.28 });
  const greenLightMat = new THREE.MeshStandardMaterial({ color: 0x52ef9a, emissive: 0x16df73, emissiveIntensity: 0.14, roughness: 0.28 });

  const poleGeo = new THREE.CylinderGeometry(0.16, 0.21, 5.4, 8);
  const panelGeo = new THREE.BoxGeometry(1.35, 0.62, 0.12);
  const lightGeo = new THREE.SphereGeometry(0.24, 10, 7);
  const pylons = [];

  function makePylon(side) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.7;
    const panel = new THREE.Mesh(panelGeo, side < 0 ? panelRedMat : panelYellowMat);
    panel.position.set(side < 0 ? -0.55 : 0.55, 4.3, 0);
    const lights = [
      new THREE.Mesh(lightGeo, redLightMat),
      new THREE.Mesh(lightGeo, amberLightMat),
      new THREE.Mesh(lightGeo, greenLightMat)
    ];
    lights[0].position.set(-0.62, 5.15, 0);
    lights[1].position.set(0, 5.15, 0);
    lights[2].position.set(0.62, 5.15, 0);
    for (const mesh of [pole, panel, ...lights]) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }
    g.add(pole, panel, ...lights);
    g.userData.lights = lights;
    group.add(g);
    pylons.push(g);
    return g;
  }
  makePylon(-1);
  makePylon(1);

  const tileSeeds = [];
  const pylonSeeds = [];
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1,1,1);
  const euler = new THREE.Euler();

  const state = {
    visible: false,
    rebuilds: 0,
    tileCount: 0,
    pylonCount: 2,
    lightCount: 6,
    countdownStage: 'idle',
    visualOnly: true,
    collisionAdded: false,
    physicsWrites: false,
    gameplayWrites: false,
    raceRuleWrites: false,
    checkpointWrites: false,
    realWorldCoastUntouched: true
  };

  function realWorld3DActive() {
    return Boolean(root.V01051_REAL_WORLD_3D && root.V01051_REAL_WORLD_3D.state && root.V01051_REAL_WORLD_3D.state.active);
  }

  function shouldShow() {
    const phase = Manager.state && Manager.state.phase;
    const activePhase = phase === 'countdown' || phase === 'racing' || phase === 'paused' || phase === 'finished';
    return activePhase && Core.shouldShow(Manager.selectedEvent, realWorld3DActive());
  }

  function composeTile(mesh, index, seed, y) {
    position.set(seed.x, y, seed.z);
    euler.set(0, seed.yaw, 0, 'XYZ');
    quaternion.setFromEuler(euler);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  }

  function rebuild() {
    tileSeeds.length = 0;
    pylonSeeds.length = 0;
    tileSeeds.push(...Core.startTiles(Manager.course, { tileCount }));
    pylonSeeds.push(...Core.pylonSeeds(Manager.course));
    redTiles.count = 0;
    yellowTiles.count = 0;

    const t = typeof clock !== 'undefined' ? clock.elapsedTime : 0;
    let redIndex = 0, yellowIndex = 0;
    for (let i = 0; i < tileSeeds.length; i++) {
      const seed = tileSeeds[i];
      const y = getWaveHeight(seed.x, seed.z, t) + 0.08;
      if (i % 2 === 0) composeTile(redTiles, redIndex++, seed, y);
      else composeTile(yellowTiles, yellowIndex++, seed, y);
    }
    redTiles.count = redIndex;
    yellowTiles.count = yellowIndex;
    redTiles.instanceMatrix.needsUpdate = true;
    yellowTiles.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < pylons.length; i++) {
      const seed = pylonSeeds[i];
      if (!seed) {
        pylons[i].visible = false;
        continue;
      }
      pylons[i].visible = true;
      pylons[i].position.set(seed.x, getWaveHeight(seed.x, seed.z, t) + 0.02, seed.z);
      pylons[i].rotation.y = seed.yaw;
    }

    state.tileCount = tileSeeds.length;
    state.rebuilds += 1;
    group.visible = shouldShow();
    state.visible = group.visible;
  }

  function setLightStage(stage) {
    const intensity = {
      red: [2.2, 0.14, 0.10],
      amber: [0.45, 2.0, 0.10],
      green: [0.20, 0.30, 2.25],
      ready: [0.8, 0.8, 0.22],
      idle: [0.16, 0.14, 0.12]
    }[stage] || [0.16,0.14,0.12];
    redLightMat.emissiveIntensity = intensity[0];
    amberLightMat.emissiveIntensity = intensity[1];
    greenLightMat.emissiveIntensity = intensity[2];
    state.countdownStage = stage;
  }

  function update() {
    group.visible = shouldShow();
    state.visible = group.visible;
    if (!group.visible) {
      setLightStage('idle');
      return;
    }

    const phase = Manager.state && Manager.state.phase;
    const countdown = document.querySelector('.jr-countdown.show');
    setLightStage(Core.countdownStage(countdown ? countdown.textContent : '', phase));

    const t = typeof clock !== 'undefined' ? clock.elapsedTime : performance.now() / 1000;
    let redIndex = 0, yellowIndex = 0;
    for (let i = 0; i < tileSeeds.length; i++) {
      const seed = tileSeeds[i];
      const y = getWaveHeight(seed.x, seed.z, t) + 0.08;
      if (i % 2 === 0) composeTile(redTiles, redIndex++, seed, y);
      else composeTile(yellowTiles, yellowIndex++, seed, y);
    }
    if (tileSeeds.length) {
      redTiles.instanceMatrix.needsUpdate = true;
      yellowTiles.instanceMatrix.needsUpdate = true;
    }
    for (let i = 0; i < pylons.length; i++) {
      const seed = pylonSeeds[i];
      if (!seed) continue;
      pylons[i].position.y = getWaveHeight(seed.x, seed.z, t) + 0.02;
    }
  }

  root.addEventListener('jetski:race-ready', rebuild);
  root.addEventListener('jetski:race-origin-shift', rebuild);
  root.addEventListener('jetski:race-selected', () => {
    group.visible = false;
    state.visible = false;
  });

  const phase = Manager.state && Manager.state.phase;
  if (phase === 'countdown' || phase === 'racing' || phase === 'paused') root.setTimeout(rebuild, 0);
  else group.visible = false;

  const timer = root.setInterval(update, 100);

  root.JETSKI_RACE_STAGING = {
    version: Core.VERSION,
    state,
    group,
    redTiles,
    yellowTiles,
    pylons,
    rebuild,
    visualOnly: true,
    collisionAdded: false,
    physicsUntouched: true,
    gameplayUntouched: true,
    raceRulesUntouched: true,
    checkpointAuthorityUntouched: true,
    dispose() { root.clearInterval(timer); group.removeFromParent(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
