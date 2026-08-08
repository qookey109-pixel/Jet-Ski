// V0.8.1 refined near-field FFT ocean visual layer.
// Adds choppy crest shaping, breaking-foam streaks, and rendering-only wake disturbances
// while keeping V0.7/V0.6 gameplay water authoritative.
(function () {
  'use strict';
  if (!window.THREE || !window.createFFTOceanVisualModel || typeof scene === 'undefined') return;

  const visualVersion = 'V0.8.1';
  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = visualVersion;
  document.title = `Swim Ring Racing ${visualVersion}`;

  const mobileLike = Math.min(innerWidth, innerHeight) < 560 || /iPhone|iPad|Android/i.test(navigator.userAgent || '');
  const gridSize = mobileLike ? 32 : 64;
  const patchSize = mobileLike ? 84 : 112;
  const updateHz = mobileLike ? 10 : 18;
  const model = window.createFFTOceanVisualModel({
    size: gridSize,
    patchSize,
    gravity: 9.81,
    gamma: 3.3,
    seed: 109,
    detailHsShare: mobileLike ? 0.30 : 0.42,
    shortWaveDamping: 0.12,
    directionPower: 4.0,
    backwardWaveFactor: 0.16
  });

  const disturbance = window.createOceanDisturbanceModel
    ? window.createOceanDisturbanceModel({
      maxEvents: mobileLike ? 12 : 18,
      wakeLife: mobileLike ? 2.2 : 2.8,
      landingLife: 2.4
    })
    : null;

  const geometry = new THREE.PlaneGeometry(patchSize, patchSize, gridSize - 1, gridSize - 1);
  geometry.rotateX(-Math.PI / 2);
  const basePositions = geometry.attributes.position.array.slice();
  const foamArray = new Float32Array(geometry.attributes.position.count);
  geometry.setAttribute('aFoam', new THREE.BufferAttribute(foamArray, 1));

  const uniforms = {
    uTime: { value: 0 },
    uHs: { value: 0.85 },
    uRough: { value: 0.35 },
    uWaveDir: { value: new THREE.Vector2(0, 1) },
    uDeep: { value: new THREE.Color(0x012f49) },
    uMid: { value: new THREE.Color(0x087a9e) },
    uBright: { value: new THREE.Color(0x3ac7d6) },
    uFoam: { value: new THREE.Color(0xf5fcff) },
    uSky: { value: new THREE.Color(0x87cce9) },
    uSun: { value: new THREE.Color(0xffefbf) },
    uSunDir: { value: new THREE.Vector3(-0.36, 0.78, 0.50).normalize() }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      attribute float aFoam;
      varying float vFoam;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec2 vUv;
      void main() {
        vFoam = aFoam;
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPosition = wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform float uHs;
      uniform float uRough;
      uniform vec2 uWaveDir;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uBright;
      uniform vec3 uFoam;
      uniform vec3 uSky;
      uniform vec3 uSun;
      uniform vec3 uSunDir;
      varying float vFoam;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec2 vUv;

      float sat(float v) { return clamp(v, 0.0, 1.0); }
      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      void main() {
        vec3 V = normalize(cameraPosition - vWorldPosition);
        float r1 = sin(vWorldPosition.x * 2.6 + vWorldPosition.z * 1.7 + uTime * 3.0);
        float r2 = sin(vWorldPosition.x * -1.9 + vWorldPosition.z * 3.2 - uTime * 2.35);
        float r3 = sin((vWorldPosition.x + vWorldPosition.z) * 5.1 + uTime * 4.2);
        vec3 N = normalize(vWorldNormal + vec3(r1 + r3 * .35, 0.0, r2 - r3 * .25) * mix(.018, .060, uRough));
        float slope = 1.0 - sat(N.y);
        float fresnel = pow(1.0 - sat(dot(N, V)), 4.2);

        float heightTint = sat(0.45 + vWorldPosition.y / max(0.18, uHs) * 0.55);
        vec3 waterColor = mix(uDeep, uMid, heightTint);
        waterColor = mix(waterColor, uBright, sat(slope * 4.2) * 0.45);
        waterColor = mix(waterColor, uSky, 0.18 + fresnel * 0.58);

        vec3 R = reflect(-uSunDir, N);
        float spec = pow(sat(dot(R, V)), mix(210.0, 62.0, uRough));
        float glitterNoise = step(0.66 - uRough * 0.18, hash21(floor(vWorldPosition.xz * 6.0) + floor(uTime * 18.0)));
        waterColor += uSun * spec * (0.8 + glitterNoise * 1.65);

        vec2 waveDir = normalize(uWaveDir);
        vec2 crestDir = vec2(waveDir.y, -waveDir.x);
        float alongWave = dot(vWorldPosition.xz, waveDir);
        float alongCrest = dot(vWorldPosition.xz, crestDir);
        float crestWarp = sin(alongWave * 0.13 - uTime * 0.58) * 1.55;
        float streakWide = 0.5 + 0.5 * sin(alongCrest * 0.58 + crestWarp);
        float streakFine = 0.5 + 0.5 * sin(alongCrest * 1.72 + sin(alongWave * 0.21) * 1.1 + uTime * 0.18);
        float breakup = hash21(floor(vec2(alongCrest * 0.62, alongWave * 0.20 - uTime * 0.55)));
        float foamPattern = sat(streakWide * 0.64 + streakFine * 0.36);
        foamPattern *= mix(0.62, 1.18, smoothstep(0.20, 0.82, breakup));
        float foam = sat(vFoam * mix(0.72, 1.45, foamPattern));
        waterColor = mix(waterColor, uFoam, foam);

        vec2 edgeCoord = abs(vUv - 0.5) * 2.0;
        float edge = max(edgeCoord.x, edgeCoord.y);
        float alpha = 1.0 - smoothstep(0.78, 0.995, edge);
        gl_FragColor = vec4(waterColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });

  const patch = new THREE.Mesh(geometry, material);
  patch.frustumCulled = false;
  patch.renderOrder = 2;
  scene.add(patch);

  const legacyUpdateWater = updateWater;
  const legacyUpdateCamera = updateCamera;
  const legacyUpdateJetSki = updateJetSki;
  const pos = geometry.attributes.position;
  let accumulator = 1 / updateHz;
  let lastWaterTime = NaN;
  let lastCenterX = NaN;
  let lastCenterZ = NaN;
  let patchCenterX = 0;
  let patchCenterZ = 0;
  let lastWakeEmit = -Infinity;
  let preLandingVerticalSpeed = 0;

  function edgeFade(localX, localZ) {
    const edge = Math.max(Math.abs(localX), Math.abs(localZ)) / (patchSize * 0.5);
    return 1 - THREE.MathUtils.smoothstep(edge, 0.72, 0.99);
  }

  function recenter() {
    const spacing = patchSize / gridSize;
    patchCenterX = Math.round(ski.position.x / spacing) * spacing;
    patchCenterZ = Math.round(ski.position.z / spacing) * spacing;
    if (patchCenterX !== lastCenterX || patchCenterZ !== lastCenterZ) {
      patch.position.x = patchCenterX;
      patch.position.z = patchCenterZ;
      lastCenterX = patchCenterX;
      lastCenterZ = patchCenterZ;
    }
  }

  function maybeEmitWake(t) {
    if (!disturbance || airborne || !(speed > physics.minimumSteerSpeed)) return;
    const ratio = THREE.MathUtils.clamp(speed / physics.maxSpeed, 0, 1);
    if (ratio < 0.08) return;
    const interval = THREE.MathUtils.lerp(mobileLike ? 0.17 : 0.12, mobileLike ? 0.10 : 0.065, ratio);
    if (t - lastWakeEmit < interval) return;
    lastWakeEmit = t;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const rearX = ski.position.x - fx * 1.55;
    const rearZ = ski.position.z - fz * 1.55;
    const steeringBoost = 1 + Math.abs(steeringValue) * 0.35;
    disturbance.emitWake(rearX, rearZ, yaw, ratio * steeringBoost, t);
  }

  function refreshPatch(t) {
    model.update(t, seaProfile);
    recenter();
    const hs = Number.isFinite(seaProfile.significantWaveHeight) ? seaProfile.significantWaveHeight : 0.85;
    const rough = THREE.MathUtils.clamp(hs / 2.2, 0.05, 1.0);
    const directionRad = THREE.MathUtils.degToRad(Number(seaProfile.meanDirectionDeg) || 0);
    uniforms.uTime.value = t;
    uniforms.uHs.value = hs;
    uniforms.uRough.value = rough;
    uniforms.uWaveDir.value.set(Math.sin(directionRad), Math.cos(directionRad));

    const chopGain = THREE.MathUtils.lerp(1.05, 2.65, rough)
      * THREE.MathUtils.clamp(0.72 + hs * 0.24, 0.75, 1.35);
    let foamMax = 0;

    for (let i = 0; i < pos.count; i++) {
      const idx = i * 3;
      const localX = basePositions[idx];
      const localZ = basePositions[idx + 2];
      const worldX = patchCenterX + localX;
      const worldZ = patchCenterZ + localZ;
      const spectral = model.sample(worldX, worldZ);
      const fade = edgeFade(localX, localZ);
      const baseHeight = getWaveHeight(worldX, worldZ, t);
      const rawDetail = spectral.height * fade;
      const shapedDetail = rawDetail >= 0
        ? rawDetail * (1 + rough * 0.22)
        : rawDetail * (1 - rough * 0.05);

      const shiftX = THREE.MathUtils.clamp(-spectral.slopeX * chopGain * fade, -0.58, 0.58);
      const shiftZ = THREE.MathUtils.clamp(-spectral.slopeZ * chopGain * fade, -0.58, 0.58);
      const wake = disturbance ? disturbance.sample(worldX, worldZ, t) : { height: 0, foam: 0 };
      pos.setX(i, localX + shiftX);
      pos.setZ(i, localZ + shiftZ);
      pos.setY(i, baseHeight + shapedDetail + wake.height * fade + 0.022);

      const slope = Math.hypot(spectral.slopeX, spectral.slopeZ);
      const crestRatio = shapedDetail / Math.max(0.08, hs);
      const crestMask = THREE.MathUtils.smoothstep(crestRatio, 0.008, 0.16);
      const slopeMask = THREE.MathUtils.smoothstep(slope, 0.045, 0.24);
      const crestCurvature = Math.max(0, -spectral.curvature);
      const curvatureMask = THREE.MathUtils.smoothstep(crestCurvature, 0.0018, 0.022);
      const breaking = (crestMask * 0.34 + slopeMask * 0.42 + curvatureMask * 0.56)
        * THREE.MathUtils.lerp(0.58, 1.15, rough);
      const foam = THREE.MathUtils.clamp((breaking + wake.foam * 0.96) * fade, 0, 1);
      foamArray[i] = foam;
      foamMax = Math.max(foamMax, foam);
    }

    pos.needsUpdate = true;
    geometry.attributes.aFoam.needsUpdate = true;
    geometry.computeVertexNormals();
    window.FFT_OCEAN_VISUALS.lastFoamMax = foamMax;
  }

  updateWater = function v081UpdateWater(t) {
    legacyUpdateWater(t);
    maybeEmitWake(t);
    const frameDt = Number.isFinite(lastWaterTime)
      ? THREE.MathUtils.clamp(t - lastWaterTime, 0, 0.05)
      : 1 / updateHz;
    lastWaterTime = t;
    accumulator += frameDt;
    if (accumulator >= 1 / updateHz) {
      accumulator = 0;
      refreshPatch(t);
    } else {
      uniforms.uTime.value = t;
      recenter();
    }
  };

  updateJetSki = function v081UpdateJetSki(dt, t) {
    const wasAirborne = airborne;
    if (airborne) preLandingVerticalSpeed = Math.abs(verticalVelocity);
    legacyUpdateJetSki(dt, t);
    if (disturbance && wasAirborne && !airborne) {
      const strength = THREE.MathUtils.clamp(preLandingVerticalSpeed / 7.5, 0.35, 1.55);
      disturbance.emitLanding(ski.position.x, ski.position.z, strength, t);
    }
  };

  updateCamera = function v081UpdateCamera(dt) {
    legacyUpdateCamera(dt);
    patch.visible = camera.position.y > -2;
  };

  window.FFT_OCEAN_VISUALS = {
    version: visualVersion,
    model,
    disturbance,
    patch,
    material,
    gridSize,
    patchSize,
    updateHz,
    lastFoamMax: 0,
    get activeDisturbances() {
      return disturbance ? disturbance.activeCount(clock.elapsedTime) : 0;
    }
  };

  refreshPatch(0);
})();
