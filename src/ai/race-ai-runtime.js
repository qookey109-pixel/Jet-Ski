// V0.11.5 AI Opponents + Ranking runtime. Dynamic course-aware reduced-order rivals.
(function (root) {
  'use strict';
  const THREE = root.THREE;
  const Core = root.JETSKI_RACE_AI_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  if (!THREE || !Core || !Manager || typeof scene === 'undefined' || typeof getWaveHeight !== 'function') return;

  const VERSION = 'V0.11.5';
  const configs = [
    { id: 'coral', name: 'CORAL', speedMps: 10.1, steeringResponse: 2.8, color: 0xff6b6b, lane: -6.4 },
    { id: 'tide', name: 'TIDE', speedMps: 10.7, steeringResponse: 3.0, color: 0x67e8f9, lane: 0 },
    { id: 'mango', name: 'MANGO', speedMps: 9.7, steeringResponse: 2.65, color: 0xffc857, lane: 6.4 }
  ];

  const group = new THREE.Group();
  group.name = 'V0115AIRacers';
  scene.add(group);
  const racers = [];
  let lastPhase = 'menu';
  let lastCourseId = null;
  let startedAtMs = 0;

  function currentCourse() {
    return Manager.course;
  }

  function makeVisual(config) {
    const g = new THREE.Group();
    const craftVisual = root.JETSKI_CRAFT_VISUAL && typeof root.JETSKI_CRAFT_VISUAL.build === 'function'
      ? root.JETSKI_CRAFT_VISUAL.build(g, {
          kind: 'ai',
          name: `V01116AICraftT11-${config.id}`,
          primary: config.color,
          accent: 0xfff1bd,
          dark: 0x243142
        })
      : null;
    if (!craftVisual) {
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(1.38, 0.48, 2.75),
        new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.42 })
      );
      fallback.position.y = 0.42;
      fallback.name = `T11AIFallback-${config.id}`;
      g.add(fallback);
    }

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf2c39c, roughness: 0.78 });
    const vestMat = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.50,
      metalness: 0.01
    });
    const vestLightMat = new THREE.MeshStandardMaterial({ color: 0xfff1bd, roughness: 0.56 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x243142, roughness: 0.72 });
    const helmetMat = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.34,
      metalness: 0.04
    });
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x162633, roughness: 0.24, metalness: 0.20 });

    const rider = new THREE.Group();
    rider.name = `V01116AIRider-${config.id}`;
    rider.userData.visualVersion = 'V0.11.16-T7';

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, 0.92, 8), vestMat);
    torso.position.y = 1.18;
    torso.rotation.x = -0.27;

    const vestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.52, 0.14), vestLightMat);
    vestPanel.position.set(0, 1.18, 0.37);
    vestPanel.rotation.x = -0.27;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 7), skinMat);
    head.position.set(0, 1.82, 0.10);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.288, 10, 7), helmetMat);
    helmet.position.set(0, 1.91, 0.115);
    helmet.scale.set(1.04, 0.62, 1.05);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.08, 0.05), visorMat);
    visor.position.set(0, 1.84, 0.35);
    visor.rotation.x = 0.04;

    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.24, 0.40), darkMat);
    hips.position.set(0, 0.82, -0.02);

    const armGeo = new THREE.CylinderGeometry(0.085, 0.095, 0.72, 7);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    const rightArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.39, 1.19, 0.27);
    rightArm.position.set(0.39, 1.19, 0.27);
    leftArm.rotation.set(0.82, 0, -0.58);
    rightArm.rotation.set(0.82, 0, 0.58);

    const handGeo = new THREE.SphereGeometry(0.095, 7, 5);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    const rightHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(-0.48, 1.03, 0.51);
    rightHand.position.set(0.48, 1.03, 0.51);

    const thighGeo = new THREE.CylinderGeometry(0.11, 0.14, 0.48, 7);
    const leftThigh = new THREE.Mesh(thighGeo, darkMat);
    const rightThigh = new THREE.Mesh(thighGeo, darkMat);
    leftThigh.position.set(-0.24, 0.69, -0.02);
    rightThigh.position.set(0.24, 0.69, -0.02);
    leftThigh.rotation.z = -0.68;
    rightThigh.rotation.z = 0.68;

    const handBar = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.08, 0.08), darkMat);
    handBar.position.set(0, 1.02, 0.51);

    for (const mesh of [
      torso, vestPanel, head, helmet, visor, hips, leftArm, rightArm,
      leftHand, rightHand, leftThigh, rightThigh, handBar
    ]) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }
    rider.add(
      torso, vestPanel, head, helmet, visor, hips, leftArm, rightArm,
      leftHand, rightHand, leftThigh, rightThigh, handBar
    );

    g.userData.rider = rider;
    g.userData.riderVisualVersion = 'V0.11.16-T7';
    g.userData.craftVisualVersion = craftVisual ? 'V0.11.16-T11' : 'fallback';
    g.add(rider);
    return g;
  }

  function resetAll() {
    const course = currentCourse();
    if (!course || !course.checkpoints || course.checkpoints.length < 2) return;
    const start = course.checkpoints[0];
    const next = course.checkpoints[1];
    const baseYaw = Math.atan2(next.x - start.x, next.z - start.z);
    racers.length = 0;
    group.clear();
    for (let i = 0; i < configs.length; i++) {
      const cfg = configs[i];
      const sideX = Math.cos(baseYaw) * cfg.lane;
      const sideZ = -Math.sin(baseYaw) * cfg.lane;
      const agent = Core.createAgent({
        id: cfg.id,
        name: cfg.name,
        speedMps: cfg.speedMps,
        steeringResponse: cfg.steeringResponse,
        x: start.x - Math.sin(baseYaw) * (5 + i * 2.6) + sideX,
        z: start.z - Math.cos(baseYaw) * (5 + i * 2.6) + sideZ,
        yaw: baseYaw
      }, course);
      const visual = makeVisual(cfg);
      visual.position.set(agent.x, 0.8, agent.z);
      visual.rotation.y = agent.yaw;
      group.add(visual);
      racers.push({ agent, visual, config: cfg });
    }
    lastCourseId = course.id || null;
  }

  function wavePose(entry, t) {
    const a = entry.agent;
    const fX = Math.sin(a.yaw), fZ = Math.cos(a.yaw);
    const rX = fZ, rZ = -fX;
    const center = getWaveHeight(a.x, a.z, t);
    const front = getWaveHeight(a.x + fX * 2.1, a.z + fZ * 2.1, t);
    const rear = getWaveHeight(a.x - fX * 2.1, a.z - fZ * 2.1, t);
    const right = getWaveHeight(a.x + rX * 1.8, a.z + rZ * 1.8, t);
    const left = getWaveHeight(a.x - rX * 1.8, a.z - rZ * 1.8, t);
    entry.visual.position.set(a.x, center + 0.78, a.z);
    entry.visual.rotation.y = a.yaw;
    entry.visual.rotation.x = Math.atan2(front - rear, 4.2) * 0.72;
    entry.visual.rotation.z = -Math.atan2(right - left, 3.6) * 0.64;
  }

  function playerSnapshot() {
    const s = Manager.state;
    return {
      id: 'player', name: 'YOU', x: ski.position.x, z: ski.position.z,
      lap: s.lap, nextCheckpointIndex: s.nextCheckpointIndex,
      finished: s.finished, finishMs: s.finishMs ? s.finishMs - startedAtMs : 0
    };
  }

  function rankedEntries() {
    const course = currentCourse();
    if (!course) return [];
    return Core.rankRacers([playerSnapshot(), ...racers.map(r => r.agent)], course);
  }

  function getPlayerRank() {
    const ranked = rankedEntries();
    const index = ranked.findIndex(r => r.id === 'player');
    return index >= 0 ? index + 1 : ranked.length || 1;
  }

  function ensureRankingHud() {
    let el = document.querySelector('[data-jr-position]');
    if (el) return el;
    const hud = document.querySelector('.jr-hud');
    if (!hud) return null;
    const item = document.createElement('div');
    item.className = 'jr-hud-item';
    item.innerHTML = '<span class="jr-hud-label">POS</span><span class="jr-hud-value" data-jr-position>1 / 4</span>';
    hud.prepend(item);
    return item.querySelector('[data-jr-position]');
  }
  const positionEl = ensureRankingHud();

  function updateRanking() {
    if (!positionEl) return;
    const ranked = rankedEntries();
    const index = ranked.findIndex(r => r.id === 'player');
    positionEl.textContent = `${Math.max(0, index) + 1} / ${ranked.length || 4}`;
  }

  function update(dt, t) {
    const phase = Manager.state.phase;
    const course = currentCourse();
    const courseId = course && course.id;
    if (courseId && courseId !== lastCourseId && phase !== 'racing') resetAll();
    if (phase !== lastPhase) {
      if (phase === 'countdown') resetAll();
      if (phase === 'racing' && lastPhase === 'countdown') startedAtMs = performance.now();
      lastPhase = phase;
    }
    group.visible = phase === 'countdown' || phase === 'racing' || phase === 'paused' || phase === 'finished';
    if (!group.visible || !course) return;
    if (phase === 'racing') {
      const now = performance.now() - startedAtMs;
      for (const entry of racers) Core.advanceAgent(entry.agent, dt, course, now);
    }
    for (const entry of racers) wavePose(entry, t);
    updateRanking();
  }

  const previousUpdateJetSki = updateJetSki;
  updateJetSki = function v0115AIRaceUpdate(dt, t) {
    previousUpdateJetSki(dt, t);
    update(dt, t);
  };

  resetAll();
  group.visible = false;
  root.JETSKI_RACE_AI = {
    version: VERSION,
    racers,
    resetAll,
    update,
    getPlayerRank,
    rankedEntries,
    reducedOrderAI: true,
    playerPhysicsRewritten: false,
    riderVisuals: true,
    riderVisualVersion: 'V0.11.16-T7',
    riderCount: configs.length,
    craftVisuals: true,
    craftVisualVersion: 'V0.11.16-T11',
    craftCount: configs.length
  };
})(typeof window !== 'undefined' ? window : globalThis);
