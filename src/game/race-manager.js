// V0.11.0 Race Manager. Integrates race flow with the existing validated craft/ocean stack.
(function (root) {
  'use strict';

  const Race = root.JETSKI_RACE_COURSE;
  const RaceUI = root.JETSKI_RACE_UI;
  const THREE = root.THREE;
  if (!Race || !RaceUI || !THREE) return;
  if (typeof ski === 'undefined' || typeof updateJetSki !== 'function' || typeof getWaveHeight !== 'function') return;

  const VERSION = 'V0.11.0';
  const course = Race.OPEN_SEA_CIRCUIT;
  let raceState = Race.createRaceState(course);
  let countdownEndMs = 0;
  let countdownLastValue = null;
  let goHideAtMs = 0;
  let pauseStartedMs = 0;
  let wasInsideTarget = false;
  let activeGateIndex = -1;
  let audioContext = null;

  const worldButtons = [...document.querySelectorAll('[data-world-mode]')];
  const physicsButtons = [...document.querySelectorAll('[data-hydro-mode]')];
  const seaButtonsLocal = [...document.querySelectorAll('[data-sea]')];

  function tone(frequency, duration, gain, offset) {
    try {
      if (!audioContext) audioContext = new (root.AudioContext || root.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const start = audioContext.currentTime + (offset || 0);
      const osc = audioContext.createOscillator();
      const amp = audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, start);
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(gain || 0.06, start + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(amp);
      amp.connect(audioContext.destination);
      osc.start(start);
      osc.stop(start + duration + 0.03);
    } catch (_) {}
  }

  function checkpointTone() {
    tone(620, 0.11, 0.045, 0);
    tone(880, 0.10, 0.035, 0.06);
  }

  function finishTone() {
    tone(523, 0.20, 0.05, 0);
    tone(659, 0.20, 0.05, 0.13);
    tone(784, 0.32, 0.06, 0.26);
  }

  const ui = RaceUI.createRaceUI({
    formatTime: Race.formatRaceTime,
    onStart: startRace,
    onFree: enterFreeRide,
    onResume: resumeRace,
    onRestart: startRace,
    onMenu: showMainMenu
  });

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.textContent = '🏁 Race';
  launcher.setAttribute('aria-label', 'Open race menu');
  launcher.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:27;display:none;min-height:36px;padding:0 12px;border:1px solid rgba(255,255,255,.24);border-radius:999px;background:rgba(3,22,38,.62);color:#fff;font-weight:850;backdrop-filter:blur(8px);cursor:pointer';
  launcher.addEventListener('click', showMainMenu);
  document.body.appendChild(launcher);

  // Checkpoint visuals are independent of the old decorative buoy ring.
  const courseGroup = new THREE.Group();
  courseGroup.name = 'V0110RaceCourse';
  scene.add(courseGroup);

  const gateGeometry = new THREE.TorusGeometry(6.2, 0.34, 10, 34);
  const postGeometry = new THREE.CylinderGeometry(0.32, 0.46, 3.8, 10);
  const activeMaterial = new THREE.MeshStandardMaterial({ color: 0x77f4ff, emissive: 0x19bfff, emissiveIntensity: 2.2, roughness: 0.3, metalness: 0.15 });
  const inactiveMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x20445a, emissiveIntensity: 0.42, roughness: 0.52, metalness: 0.08, transparent: true, opacity: 0.48 });
  const finishMaterial = new THREE.MeshStandardMaterial({ color: 0xffdc72, emissive: 0xff9b18, emissiveIntensity: 2.0, roughness: 0.3, metalness: 0.08 });
  const gateGroups = [];

  function buildGate(index) {
    const cp = course.checkpoints[index];
    const next = course.checkpoints[(index + 1) % course.checkpoints.length];
    const group = new THREE.Group();
    const ringMesh = new THREE.Mesh(gateGeometry, index === 0 ? finishMaterial : inactiveMaterial);
    const leftPost = new THREE.Mesh(postGeometry, index === 0 ? finishMaterial : inactiveMaterial);
    const rightPost = new THREE.Mesh(postGeometry, index === 0 ? finishMaterial : inactiveMaterial);
    ringMesh.castShadow = false;
    leftPost.castShadow = false;
    rightPost.castShadow = false;
    ringMesh.position.y = 6.25;
    leftPost.position.set(-6.2, 1.9, 0);
    rightPost.position.set(6.2, 1.9, 0);
    const heading = Math.atan2(next.x - cp.x, next.z - cp.z);
    group.rotation.y = heading;
    group.position.set(cp.x, 0, cp.z);
    group.add(ringMesh, leftPost, rightPost);
    group.userData.ring = ringMesh;
    group.userData.leftPost = leftPost;
    group.userData.rightPost = rightPost;
    courseGroup.add(group);
    gateGroups.push(group);
  }

  for (let i = 0; i < course.checkpoints.length; i++) buildGate(i);

  function setGateMaterial(index, active) {
    const group = gateGroups[index];
    if (!group) return;
    const material = active ? (index === 0 ? finishMaterial : activeMaterial) : (index === 0 ? finishMaterial : inactiveMaterial);
    group.userData.ring.material = material;
    group.userData.leftPost.material = material;
    group.userData.rightPost.material = material;
  }

  function updateActiveGate() {
    const next = raceState.phase === 'racing' ? raceState.nextCheckpointIndex : -1;
    if (next === activeGateIndex) return;
    if (activeGateIndex >= 0) setGateMaterial(activeGateIndex, false);
    activeGateIndex = next;
    if (activeGateIndex >= 0) setGateMaterial(activeGateIndex, true);
  }

  function setCourseVisible(visible) {
    courseGroup.visible = Boolean(visible);
  }

  function setConfigLocked(locked) {
    for (const button of worldButtons) button.disabled = Boolean(locked);
    for (const button of physicsButtons) button.disabled = Boolean(locked);
    for (const button of seaButtonsLocal) button.disabled = Boolean(locked);
  }

  function normalizeRaceConfig() {
    if (root.V097_WORLD_MODES && typeof root.V097_WORLD_MODES.setMode === 'function') {
      root.V097_WORLD_MODES.setMode(course.worldMode);
    }
    if (typeof selectSeaState === 'function') selectSeaState(course.seaState);
    const hydro = root.JETSKI_PHYSICS && root.JETSKI_PHYSICS.hydroModel;
    if (hydro && typeof hydro.setMode === 'function') hydro.setMode('nine-point-plus');
    if (root.V01052_NATURAL_DISASTERS && typeof root.V01052_NATURAL_DISASTERS.clearEvents === 'function') {
      root.V01052_NATURAL_DISASTERS.clearEvents();
    }
  }

  function snapCameraToCraft() {
    if (typeof camera === 'undefined' || typeof cameraConfig === 'undefined') return;
    const dirX = Math.sin(yaw);
    const dirZ = Math.cos(yaw);
    camera.position.set(
      ski.position.x - dirX * cameraConfig.followDistance,
      ski.position.y + cameraConfig.followHeight,
      ski.position.z - dirZ * cameraConfig.followDistance
    );
    camera.lookAt(
      ski.position.x + dirX * cameraConfig.lookAhead,
      ski.position.y + cameraConfig.lookHeight,
      ski.position.z + dirZ * cameraConfig.lookAhead
    );
  }

  function resetCraftToGrid() {
    const start = course.checkpoints[0];
    const next = course.checkpoints[1];
    ski.position.x = start.x;
    ski.position.z = start.z;
    if (typeof yaw !== 'undefined') yaw = Math.atan2(next.x - start.x, next.z - start.z);
    if (typeof speed !== 'undefined') speed = 0;
    if (typeof lateralSlip !== 'undefined') lateralSlip = 0;
    if (typeof steeringValue !== 'undefined') steeringValue = 0;
    if (typeof throttleValue !== 'undefined') throttleValue = 0;
    if (typeof verticalVelocity !== 'undefined') verticalVelocity = 0;
    if (typeof airborne !== 'undefined') airborne = false;
    const t = typeof clock !== 'undefined' ? clock.elapsedTime : 0;
    if (typeof physics !== 'undefined') ski.position.y = getWaveHeight(start.x, start.z, t) + physics.floatClearance;
    ski.rotation.y = yaw;
    ski.rotation.x = 0;
    ski.rotation.z = 0;
    snapCameraToCraft();
  }

  function startRace() {
    normalizeRaceConfig();
    setConfigLocked(true);
    setCourseVisible(true);
    resetCraftToGrid();
    raceState = Race.createRaceState(course);
    raceState.phase = 'countdown';
    countdownEndMs = performance.now() + 3200;
    countdownLastValue = null;
    goHideAtMs = 0;
    pauseStartedMs = 0;
    wasInsideTarget = false;
    activeGateIndex = -1;
    ui.showRaceHud();
    ui.updateHud(raceState);
    launcher.style.display = 'none';
    updateActiveGate();
  }

  function enterFreeRide() {
    raceState.phase = 'free-ride';
    setConfigLocked(false);
    setCourseVisible(false);
    ui.showRaceHud();
    ui.root.style.display = 'none';
    launcher.style.display = '';
  }

  function showMainMenu() {
    raceState.phase = 'menu';
    setConfigLocked(false);
    setCourseVisible(false);
    ui.root.style.display = '';
    ui.showMenu();
    launcher.style.display = 'none';
    if (typeof speed !== 'undefined') speed = 0;
  }

  function pauseRace() {
    if (raceState.phase !== 'racing') return;
    raceState.phase = 'paused';
    pauseStartedMs = performance.now();
    ui.showPause();
  }

  function resumeRace() {
    if (raceState.phase !== 'paused') return;
    const now = performance.now();
    const pausedFor = Math.max(0, now - pauseStartedMs);
    raceState.raceStartMs += pausedFor;
    raceState.lapStartMs += pausedFor;
    raceState.phase = 'racing';
    pauseStartedMs = 0;
    ui.showRaceHud();
  }

  function finishRace() {
    setConfigLocked(false);
    setCourseVisible(true);
    ui.setCountdown(null);
    ui.showResults(raceState);
    finishTone();
  }

  function updateCountdown(nowMs) {
    if (raceState.phase !== 'countdown') return;
    const remaining = countdownEndMs - nowMs;
    if (remaining <= 0) {
      Race.beginRace(raceState, nowMs);
      ui.setCountdown('GO');
      goHideAtMs = nowMs + 650;
      countdownLastValue = 'GO';
      tone(880, 0.22, 0.06, 0);
      updateActiveGate();
      return;
    }
    const value = Math.max(1, Math.ceil(remaining / 1000));
    if (value !== countdownLastValue) {
      countdownLastValue = value;
      ui.setCountdown(value);
      tone(440 + (3 - value) * 70, 0.09, 0.045, 0);
    }
  }

  function updateGateHeights(t) {
    for (let i = 0; i < gateGroups.length; i++) {
      const cp = course.checkpoints[i];
      const waterY = getWaveHeight(cp.x, cp.z, t);
      gateGroups[i].position.y = waterY;
    }
  }

  function updateRaceProgress(nowMs) {
    if (raceState.phase !== 'racing') return;
    Race.updateRaceClock(raceState, nowMs);
    const inside = Race.isInsideTarget(raceState, ski.position, course);
    if (inside && !wasInsideTarget) {
      const targetIndex = raceState.nextCheckpointIndex;
      const result = Race.passCheckpoint(raceState, targetIndex, nowMs, course);
      if (result.accepted) {
        checkpointTone();
        if (result.event === 'checkpoint') ui.toast(`GATE ${targetIndex} ✓`);
        else if (result.event === 'lap') ui.toast(`LAP ${raceState.lap} / ${raceState.totalLaps}`);
        else if (result.event === 'finish') finishRace();
        updateActiveGate();
      }
    }
    wasInsideTarget = inside;
    ui.updateHud(raceState);
  }

  function runtimeUpdate(dt, t) {
    const nowMs = performance.now();
    updateGateHeights(t);
    updateCountdown(nowMs);
    if (goHideAtMs && nowMs >= goHideAtMs) {
      ui.setCountdown(null);
      goHideAtMs = 0;
    }
    updateRaceProgress(nowMs);
  }

  function drivingLocked() {
    return raceState.phase === 'menu' || raceState.phase === 'countdown' || raceState.phase === 'paused' || raceState.phase === 'finished';
  }

  // One allocation-free race control wrapper: lock inputs outside active driving, then delegate to the full existing stack.
  const previousUpdateJetSki = updateJetSki;
  updateJetSki = function v0110RaceManagedUpdate(dt, t) {
    const locked = drivingLocked();
    const gasBefore = input.gas;
    const brakeBefore = input.brake;
    const leftBefore = input.left;
    const rightBefore = input.right;
    if (locked) {
      input.gas = false;
      input.brake = false;
      input.left = false;
      input.right = false;
    }

    previousUpdateJetSki(dt, t);

    if (locked) {
      speed = 0;
      lateralSlip = 0;
      throttleValue = 0;
    }

    input.gas = gasBefore;
    input.brake = brakeBefore;
    input.left = leftBefore;
    input.right = rightBefore;
    runtimeUpdate(dt, t);
  };

  addEventListener('keydown', event => {
    if (event.code !== 'Escape') return;
    if (raceState.phase === 'racing') {
      pauseRace();
      event.preventDefault();
    } else if (raceState.phase === 'paused') {
      resumeRace();
      event.preventDefault();
    }
  });

  setCourseVisible(false);
  setConfigLocked(false);
  ui.showMenu();

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_RACE_MANAGER = {
    version: VERSION,
    course,
    get state() { return raceState; },
    startRace,
    enterFreeRide,
    showMainMenu,
    pauseRace,
    resumeRace,
    resetCraftToGrid,
    baseOceanReplaced: false,
    hydrodynamicsRewritten: false,
    perFrameConfigAllocationAdded: false
  };
})(typeof window !== 'undefined' ? window : globalThis);
