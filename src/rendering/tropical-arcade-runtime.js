// V0.11.16 Tropical Arcade visual pass: camera framing, course dressing and HUD skin only.
(function (root) {
  'use strict';

  const Core = root.JETSKI_TROPICAL_ARCADE_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  const THREE = root.THREE;
  if (!Core || !Manager || !THREE) return;
  if (typeof scene === 'undefined' || typeof camera === 'undefined' || typeof ski === 'undefined') return;
  if (typeof updateCamera !== 'function' || typeof getWaveHeight !== 'function') return;

  const VERSION = Core.VERSION;
  const mobileLike = Math.min(root.innerWidth || 9999, root.innerHeight || 9999) < 620
    || /iPhone|iPad|iPod|Android/i.test((root.navigator && root.navigator.userAgent) || '');
  const maxBuoys = mobileLike ? Core.DEFAULTS.maxBuoysMobile : Core.DEFAULTS.maxBuoysDesktop;

  const state = {
    gateCount: 0,
    buoyCount: 0,
    rebuilds: 0,
    lastPhase: Manager.state && Manager.state.phase || 'menu',
    lastCameraDistanceExtra: 0,
    lastCameraHeightExtra: 0,
    visualOnly: true,
    physicsWrites: false,
    gameplayWrites: false,
    raceRuleWrites: false,
    boostFovWrites: false
  };

  const rootGroup = new THREE.Group();
  rootGroup.name = 'V01116TropicalArcade';
  const gateLayer = new THREE.Group();
  gateLayer.name = 'V01116TropicalArcadeGates';
  rootGroup.add(gateLayer);
  scene.add(rootGroup);

  const redMaterial = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0x7b0904,
    emissiveIntensity: 0.82,
    roughness: 0.34,
    metalness: 0.03
  });
  const yellowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd334,
    emissive: 0x8e5700,
    emissiveIntensity: 0.78,
    roughness: 0.32,
    metalness: 0.03
  });
  const buoyMaterial = new THREE.MeshStandardMaterial({
    color: 0xff4438,
    emissive: 0x5e0804,
    emissiveIntensity: 0.38,
    roughness: 0.38,
    metalness: 0.02
  });

  const quarterGateGeometry = new THREE.TorusGeometry(
    Core.DEFAULTS.gateRadius,
    Core.DEFAULTS.gateTube,
    12,
    20,
    Math.PI / 2
  );
  const buoyGeometry = new THREE.SphereGeometry(0.72, 12, 8);
  const buoyMesh = new THREE.InstancedMesh(buoyGeometry, buoyMaterial, maxBuoys);
  buoyMesh.name = 'V01116TropicalArcadeBuoys';
  buoyMesh.castShadow = false;
  buoyMesh.receiveShadow = false;
  buoyMesh.frustumCulled = true;
  buoyMesh.count = 0;
  rootGroup.add(buoyMesh);

  const markers = [];
  const gateEntries = [];
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1.38, 0.72, 0.9);
  const euler = new THREE.Euler();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const cameraHorizontal = new THREE.Vector3();
  const cameraView = new THREE.Vector3();
  const cameraFocus = new THREE.Vector3();
  let lastBuoyUpdateMs = -Infinity;

  function clearGateLayer() {
    gateLayer.clear();
    gateEntries.length = 0;
    state.gateCount = 0;
  }

  function buildGate(checkpoint, nextCheckpoint, index) {
    const pose = Core.gatePose(checkpoint, nextCheckpoint);
    const group = new THREE.Group();
    group.name = `V01116TropicalGate${index}`;
    group.position.set(pose.x, 0, pose.z);
    group.rotation.y = pose.yaw;

    for (let quarter = 0; quarter < 4; quarter++) {
      const mesh = new THREE.Mesh(quarterGateGeometry, quarter % 2 === 0 ? redMaterial : yellowMaterial);
      mesh.rotation.z = quarter * Math.PI / 2;
      mesh.position.y = 7.35;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);
    }

    group.userData.courseIndex = index;
    gateLayer.add(group);
    gateEntries.push({ group, x: pose.x, z: pose.z, index });
  }

  function rebuildCourseVisuals() {
    const course = Manager.course;
    const checkpoints = course && Array.isArray(course.checkpoints) ? course.checkpoints : [];
    clearGateLayer();
    markers.length = 0;

    if (checkpoints.length >= 2) {
      for (let i = 0; i < checkpoints.length; i++) {
        buildGate(checkpoints[i], checkpoints[(i + 1) % checkpoints.length], i);
      }
      markers.push(...Core.sampleLaneMarkers(course, { maxBuoys }));
    }

    buoyMesh.count = Math.min(markers.length, maxBuoys);
    state.gateCount = gateEntries.length;
    state.buoyCount = buoyMesh.count;
    state.rebuilds += 1;
    lastBuoyUpdateMs = -Infinity;
    updateVisualHeights(performance.now(), true);
  }

  function updateVisualHeights(nowMs, force) {
    const t = typeof clock !== 'undefined' ? clock.elapsedTime : nowMs / 1000;
    for (const entry of gateEntries) {
      entry.group.position.y = getWaveHeight(entry.x, entry.z, t);
    }

    if (!force && nowMs - lastBuoyUpdateMs < 100) return;
    lastBuoyUpdateMs = nowMs;
    for (let i = 0; i < buoyMesh.count; i++) {
      const marker = markers[i];
      const y = getWaveHeight(marker.x, marker.z, t) + 0.38;
      position.set(marker.x, y, marker.z);
      euler.set(0, marker.yaw, 0);
      quaternion.setFromEuler(euler);
      matrix.compose(position, quaternion, scale);
      buoyMesh.setMatrixAt(i, matrix);
    }
    buoyMesh.instanceMatrix.needsUpdate = true;
  }

  function updateGateFocus() {
    const raceState = Manager.state || {};
    const activeIndex = raceState.phase === 'racing' || raceState.phase === 'countdown'
      ? Number(raceState.nextCheckpointIndex)
      : -1;
    for (const entry of gateEntries) {
      const active = entry.index === activeIndex;
      const targetScale = active ? 1.055 : 1;
      entry.group.scale.setScalar(targetScale);
    }
  }

  function updateVisibility(nowMs) {
    const phase = Manager.state && Manager.state.phase || 'menu';
    state.lastPhase = phase;
    const visible = phase === 'countdown' || phase === 'racing' || phase === 'paused' || phase === 'finished';
    rootGroup.visible = visible;
    if (visible) {
      updateVisualHeights(nowMs, false);
      updateGateFocus();
    }
  }

  const previousUpdateCamera = updateCamera;
  updateCamera = function v01116TropicalArcadeCamera(dt) {
    previousUpdateCamera(dt);
    const phase = Manager.state && Manager.state.phase;
    if (!Core.isDrivingPhase(phase)) {
      state.lastCameraDistanceExtra = 0;
      state.lastCameraHeightExtra = 0;
      updateVisibility(performance.now());
      return;
    }

    const ratio = typeof speed !== 'undefined' && typeof physics !== 'undefined'
      ? THREE.MathUtils.clamp((Number(speed) || 0) / Math.max(0.1, Number(physics.maxSpeed) || 1), 0, 1)
      : 0;
    const offsets = Core.cameraOffsets(ratio);
    camera.getWorldDirection(cameraView);
    const focusDistance = Math.max(13, camera.position.distanceTo(ski.position) + 8);
    cameraFocus.copy(camera.position).addScaledVector(cameraView, focusDistance);

    cameraHorizontal.copy(camera.position).sub(ski.position);
    cameraHorizontal.y = 0;
    if (cameraHorizontal.lengthSq() < 0.0001) {
      const heading = typeof yaw === 'number' ? yaw : 0;
      cameraHorizontal.set(-Math.sin(heading), 0, -Math.cos(heading));
    } else {
      cameraHorizontal.normalize();
    }

    camera.position.addScaledVector(cameraHorizontal, offsets.distance);
    camera.position.addScaledVector(worldUp, offsets.height);
    camera.lookAt(cameraFocus);
    state.lastCameraDistanceExtra = offsets.distance;
    state.lastCameraHeightExtra = offsets.height;
    updateVisibility(performance.now());
  };

  function installArcadeSkin() {
    document.body.classList.add('v01116-tropical-arcade');
    if (document.querySelector('#v01116-tropical-arcade-style')) return;
    const style = document.createElement('style');
    style.id = 'v01116-tropical-arcade-style';
    style.textContent = `
      body.v01116-tropical-arcade .jr-hud{
        border:2px solid rgba(255,255,255,.88);border-left:6px solid #ff3b30;border-radius:12px;
        background:linear-gradient(145deg,rgba(8,35,58,.88),rgba(3,18,34,.78));
        box-shadow:0 9px 28px rgba(0,0,0,.28),0 0 0 2px rgba(255,211,52,.16) inset;
      }
      body.v01116-tropical-arcade .jr-hud-item{padding:1px 3px}
      body.v01116-tropical-arcade .jr-hud-label{color:#fff4c2;opacity:.8}
      body.v01116-tropical-arcade .jr-hud-value{font-weight:1000;text-shadow:0 2px 8px rgba(0,0,0,.45)}
      body.v01116-tropical-arcade .jr-target{color:#ffd334;text-shadow:0 0 12px rgba(255,211,52,.55)}
      body.v01116-tropical-arcade .jr-toast{border:2px solid rgba(255,211,52,.72);background:rgba(23,29,36,.86);font-weight:950}
      body.v01116-tropical-arcade .jr-countdown{color:#fff3bd;text-shadow:0 8px 0 rgba(255,59,48,.42),0 18px 70px rgba(0,0,0,.55)}
      body.v01116-tropical-arcade .mobile-controls button{
        border:2px solid rgba(255,255,255,.7);background:linear-gradient(160deg,rgba(18,64,86,.88),rgba(5,30,47,.82));
        box-shadow:0 8px 20px rgba(0,0,0,.24),0 0 0 2px rgba(76,220,255,.12) inset;
      }
      body.v01116-tropical-arcade .mobile-controls .gas{
        border-color:rgba(255,224,111,.92);background:linear-gradient(150deg,rgba(255,111,44,.94),rgba(210,43,37,.9));
        box-shadow:0 9px 24px rgba(213,50,32,.3),0 0 0 2px rgba(255,227,120,.16) inset;
      }
      body.v01116-tropical-arcade #brake{border-color:rgba(255,121,111,.82)}
      body.v01116-tropical-arcade .v01116-arcade-boost{
        border:2px solid rgba(255,229,112,.9)!important;
        background:linear-gradient(145deg,rgba(255,66,52,.96),rgba(241,139,27,.92))!important;
        box-shadow:0 10px 28px rgba(222,67,29,.32),0 0 18px rgba(255,211,52,.18) inset!important;
      }
      @media (orientation:landscape) and (max-height:420px){
        body.v01116-tropical-arcade .jr-hud{top:max(7px,env(safe-area-inset-top));padding:6px 9px;gap:8px}
      }
    `;
    document.head.appendChild(style);
    const boost = document.querySelector('[aria-label="Boost / Nitro"]');
    if (boost) boost.classList.add('v01116-arcade-boost');
  }

  root.addEventListener('jetski:race-ready', rebuildCourseVisuals);
  root.addEventListener('jetski:race-origin-shift', rebuildCourseVisuals);
  root.addEventListener('jetski:race-selected', () => { rootGroup.visible = false; });
  installArcadeSkin();
  rootGroup.visible = false;

  root.JETSKI_TROPICAL_ARCADE = {
    version: VERSION,
    state,
    rootGroup,
    gateLayer,
    buoyMesh,
    rebuildCourseVisuals,
    visualOnly: true,
    physicsUntouched: true,
    raceRulesUntouched: true,
    boostAuthorityUntouched: true,
    existingCameraOrbitPreserved: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
