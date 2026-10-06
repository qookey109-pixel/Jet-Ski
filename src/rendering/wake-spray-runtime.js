// V0.11.16 T12 visual-only wake + jet spray dynamics.
// Reads racer transforms only. Never writes physics, gameplay, AI or race state.
(function (root) {
  'use strict';

  const THREE = root.THREE;
  const Core = root.JETSKI_WAKE_CORE;
  if (!THREE || !Core || typeof scene === 'undefined') return;

  const mobileLike = Math.min(root.innerWidth || 9999, root.innerHeight || 9999) < 620
    || /iPhone|iPad|iPod|Android/i.test((root.navigator && root.navigator.userAgent) || '');
  const cfg = Core.DEFAULTS;
  const trailSamples = mobileLike ? cfg.trailSamplesMobile : cfg.trailSamplesDesktop;
  const maxWakeInstances = mobileLike ? cfg.maxWakeInstancesMobile : cfg.maxWakeInstancesDesktop;
  const maxSprayInstances = mobileLike ? cfg.maxSprayInstancesMobile : cfg.maxSprayInstancesDesktop;

  const group = new THREE.Group();
  group.name = 'V01116WakeSprayT12';
  scene.add(group);

  const wakeGeo = new THREE.PlaneGeometry(1, 1);

  function makeFoamTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y++) {
      const v = y / (canvas.height - 1);
      const along = Math.pow(Math.sin(Math.PI * v), 0.58) * Math.pow(1 - v * 0.72, 0.55);
      for (let x = 0; x < canvas.width; x++) {
        const u = x / (canvas.width - 1);
        const edge = Math.max(0, 1 - Math.pow(Math.abs(u - 0.5) / 0.5, 1.55));
        const ripple = 0.86 + 0.14 * Math.sin(v * 42 + u * 11);
        const alpha = Math.max(0, Math.min(1, edge * along * ripple));
        const i = (y * canvas.width + x) * 4;
        image.data[i] = 236;
        image.data[i + 1] = 253;
        image.data[i + 2] = 255;
        image.data[i + 3] = Math.round(alpha * 255);
      }
    }
    ctx.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  const foamTexture = makeFoamTexture();
  const wakeMat = new THREE.MeshBasicMaterial({
    color: 0xf3feff,
    map: foamTexture,
    transparent: true,
    opacity: cfg.wakeOpacity,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const wakeMesh = new THREE.InstancedMesh(wakeGeo, wakeMat, maxWakeInstances);
  wakeMesh.name = 'V01116WakeFoamT12';
  wakeMesh.frustumCulled = false;
  wakeMesh.renderOrder = 18;
  group.add(wakeMesh);

  const sprayGeo = new THREE.SphereGeometry(0.12, 6, 5);
  const sprayMat = new THREE.MeshBasicMaterial({
    color: 0xedfeff,
    transparent: true,
    opacity: cfg.sprayOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const sprayMesh = new THREE.InstancedMesh(sprayGeo, sprayMat, maxSprayInstances);
  sprayMesh.name = 'V01116JetSprayT12';
  sprayMesh.frustumCulled = false;
  sprayMesh.renderOrder = 19;
  group.add(sprayMesh);

  const trackers = [];
  const matrix = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();

  const state = {
    visualOnly: true,
    collisionAdded: false,
    physicsWrites: false,
    gameplayWrites: false,
    aiMovementWrites: false,
    raceRuleWrites: false,
    cameraWrites: false,
    trackedCrafts: 0,
    wakeInstances: 0,
    sprayInstances: 0,
    lastMaxSpeedEstimate: 0,
    mobileBudget: mobileLike,
    frameCount: 0,
    previewCount: 0,
    previewActive: false
  };
  let previewUntil = 0;

  function phase() {
    const m = root.JETSKI_RACE_MANAGER;
    return m && m.state ? m.state.phase : 'free-ride';
  }

  function addTracker(id, source) {
    if (!source) return;
    trackers.push({
      id,
      source,
      lastX: source.position.x,
      lastZ: source.position.z,
      lastSampleAt: performance.now(),
      lastUpdateAt: performance.now(),
      speedMps: 0,
      samples: []
    });
  }

  function rebuildTrackers() {
    trackers.length = 0;
    if (typeof ski !== 'undefined') addTracker('player', ski);
    const ai = root.JETSKI_RACE_AI;
    if (ai && Array.isArray(ai.racers)) {
      for (const entry of ai.racers) {
        if (entry && entry.visual) addTracker(entry.config && entry.config.id || 'ai', entry.visual);
      }
    }
    state.trackedCrafts = trackers.length;
  }

  function waterY(x, z) {
    if (typeof getWaveHeight === 'function') {
      const t = typeof clock !== 'undefined' ? clock.elapsedTime : performance.now() / 1000;
      return getWaveHeight(x, z, t) + cfg.surfaceOffset;
    }
    return cfg.surfaceOffset;
  }

  function updateTracker(tr, now) {
    const dt = Math.max(0.001, (now - tr.lastUpdateAt) / 1000);
    const current = { x: tr.source.position.x, z: tr.source.position.z };
    tr.speedMps = Math.min(36, Core.estimateSpeed({ x: tr.lastX, z: tr.lastZ }, current, dt));
    tr.lastX = current.x;
    tr.lastZ = current.z;
    tr.lastUpdateAt = now;

    if (now - tr.lastSampleAt >= cfg.sampleIntervalMs) {
      tr.samples.unshift({
        x: current.x,
        z: current.z,
        yaw: tr.source.rotation.y || 0,
        speedMps: tr.speedMps,
        bornAt: now
      });
      tr.samples.length = Math.min(tr.samples.length, trailSamples);
      tr.lastSampleAt = now;
    }
  }

  function composeWake(index, sample, side, age01) {
    if (index >= maxWakeInstances) return index;
    const dims = Core.wakeDimensions(sample.speedMps, age01);
    if (dims.scale <= 0.01) return index;
    const yaw = sample.yaw || 0;
    const forwardX = Math.sin(yaw), forwardZ = Math.cos(yaw);
    const rightX = forwardZ, rightZ = -forwardX;
    const back = 1.45 + age01 * 2.15;
    const lateral = side * (0.40 + age01 * 0.72);
    const x = sample.x - forwardX * back + rightX * lateral;
    const z = sample.z - forwardZ * back + rightZ * lateral;
    pos.set(x, waterY(x, z), z);
    euler.set(-Math.PI / 2, -(yaw + side * cfg.wakeSpreadRad), 0, 'YXZ');
    quat.setFromEuler(euler);
    scale.set(dims.width * (1.15 + dims.scale * 0.65), dims.length * dims.scale * 1.22, 1);
    matrix.compose(pos, quat, scale);
    wakeMesh.setMatrixAt(index, matrix);
    return index + 1;
  }

  function composeSpray(index, tr, particleIndex, now) {
    if (index >= maxSprayInstances) return index;
    const strength = Core.speedStrength(tr.speedMps);
    if (strength <= 0.01) return index;
    const yaw = tr.source.rotation.y || 0;
    const forwardX = Math.sin(yaw), forwardZ = Math.cos(yaw);
    const rightX = forwardZ, rightZ = -forwardX;
    const wave = Math.sin(now * 0.013 + particleIndex * 1.73 + index) * 0.5 + 0.5;
    const back = cfg.sprayBackOffset + particleIndex * (0.46 + 0.24 * strength);
    const lateral = (particleIndex - 1.5) * 0.24 * (0.55 + strength);
    const x = tr.source.position.x - forwardX * back + rightX * lateral;
    const z = tr.source.position.z - forwardZ * back + rightZ * lateral;
    const lift = cfg.sprayBaseLift + cfg.sprayExtraLift * strength * (0.50 + 0.72 * wave);
    pos.set(x, waterY(x, z) + lift, z);
    quat.identity();
    const s = (0.34 + 0.46 * strength) * (0.78 + 0.28 * wave);
    scale.set(s * 0.86, s * 1.65, s * 1.08);
    matrix.compose(pos, quat, scale);
    sprayMesh.setMatrixAt(index, matrix);
    return index + 1;
  }

  function renderPreview(now) {
    const tr = trackers[0];
    if (!tr) return false;
    const yaw = tr.source.rotation.y || 0;
    const fakeSpeed = 16;
    let wi = 0;
    let si = 0;
    for (let i = 0; i < trailSamples; i++) {
      const age01 = trailSamples <= 1 ? 0 : i / (trailSamples - 1);
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      const sample = {
        x: tr.source.position.x - fx * i * 1.4,
        z: tr.source.position.z - fz * i * 1.4,
        yaw,
        speedMps: fakeSpeed
      };
      wi = composeWake(wi, sample, -1, age01);
      wi = composeWake(wi, sample, 1, age01);
    }
    const previousSpeed = tr.speedMps;
    tr.speedMps = fakeSpeed;
    for (let i = 0; i < 4; i++) si = composeSpray(si, tr, i, now);
    tr.speedMps = previousSpeed;

    wakeMesh.count = wi;
    sprayMesh.count = si;
    wakeMesh.instanceMatrix.needsUpdate = true;
    sprayMesh.instanceMatrix.needsUpdate = true;
    state.wakeInstances = wi;
    state.sprayInstances = si;
    state.previewActive = true;
    group.visible = true;
    return true;
  }

  function preview() {
    if (!trackers.length) rebuildTrackers();
    previewUntil = performance.now() + 720;
    state.previewCount += 1;
    return renderPreview(performance.now());
  }

  function update() {
    const now = performance.now();
    const p = phase();

    if (!trackers.length || trackers.some(t => !t.source.parent)) rebuildTrackers();
    if (now < previewUntil) {
      renderPreview(now);
      state.frameCount += 1;
      root.requestAnimationFrame(update);
      return;
    }
    state.previewActive = false;
    state.lastMaxSpeedEstimate = 0;

    for (const tr of trackers) {
      updateTracker(tr, now);
      state.lastMaxSpeedEstimate = Math.max(state.lastMaxSpeedEstimate, tr.speedMps);
    }

    let wakeIndex = 0;
    let sprayIndex = 0;
    for (const tr of trackers) {
      const emit = Core.shouldEmit(tr.speedMps, p);
      if (!emit) continue;
      for (let i = 0; i < tr.samples.length; i++) {
        const sample = tr.samples[i];
        const age01 = tr.samples.length <= 1 ? 0 : i / (tr.samples.length - 1);
        wakeIndex = composeWake(wakeIndex, sample, -1, age01);
        wakeIndex = composeWake(wakeIndex, sample, 1, age01);
      }
      for (let i = 0; i < 4; i++) sprayIndex = composeSpray(sprayIndex, tr, i, now);
    }

    wakeMesh.count = wakeIndex;
    sprayMesh.count = sprayIndex;
    wakeMesh.instanceMatrix.needsUpdate = true;
    sprayMesh.instanceMatrix.needsUpdate = true;

    state.wakeInstances = wakeIndex;
    state.sprayInstances = sprayIndex;
    state.frameCount += 1;
    group.visible = p === 'racing' || p === 'free-ride';
    root.requestAnimationFrame(update);
  }

  rebuildTrackers();
  root.addEventListener('jetski:race-ready', rebuildTrackers);
  root.addEventListener('jetski:race-origin-shift', () => {
    for (const tr of trackers) tr.samples.length = 0;
  });
  root.requestAnimationFrame(update);

  root.JETSKI_WAKE_SPRAY = {
    version: Core.VERSION,
    state,
    group,
    wakeMesh,
    sprayMesh,
    foamTexture,
    rebuildTrackers,
    preview,
    visualOnly: true,
    collisionAdded: false,
    physicsUntouched: true,
    gameplayUntouched: true,
    aiMovementUntouched: true,
    raceRulesUntouched: true,
    cameraUntouched: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
