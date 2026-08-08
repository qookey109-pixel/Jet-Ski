// V0.9.3 Irregular Infinite Ocean.
// Replaces the visibly repetitive 4-wave giant swell with a deterministic 12-band
// irregular spectrum, keeps gameplay sampling synchronized, and adds floating-origin
// recentering so the player can keep travelling without hitting the old +/-310 m limit.
(function () {
  'use strict';

  if (!window.THREE || !window.V091_VIRTOCEAN_WATER || !window.V0924_GIANT_SURFACE_SYNC) return;

  const visualVersion = 'V0.9.3';
  const G = 9.81;
  const PI = Math.PI;
  const waterApi = window.V091_VIRTOCEAN_WATER;
  const reflectiveWater = waterApi.reflectiveWater;
  const material = reflectiveWater && reflectiveWater.material;
  const uniforms = waterApi.uniforms;
  if (!material || !uniforms || typeof material.vertexShader !== 'string') return;

  // Deterministic component table. No per-frame Math.random(): the sea is irregular
  // but continuous and reproducible, so physics never jitters from random resampling.
  const COMPONENTS = [
    [ 0.00, 1.00, 0.330, 0.31, 0.10, 0.018, 1.2, 0.03, 0.011, 0.4],
    [ 0.34, 0.78, 0.180, 2.17, 0.16, 0.024, 2.5, 0.04, 0.013, 1.1],
    [-0.52, 0.64, 0.120, 4.88, 0.18, 0.031, 0.8, 0.05, 0.017, 2.2],
    [ 0.91, 0.50, 0.080, 1.03, 0.20, 0.027, 3.1, 0.04, 0.019, 0.7],
    [-1.14, 0.39, 0.060, 5.46, 0.22, 0.035, 1.7, 0.06, 0.021, 2.9],
    [ 1.42, 0.31, 0.045, 3.21, 0.24, 0.041, 2.2, 0.07, 0.023, 1.4],
    [-1.61, 0.26, 0.035, 0.74, 0.25, 0.047, 3.8, 0.08, 0.029, 0.2],
    [ 0.18, 1.31, 0.055, 4.12, 0.12, 0.015, 0.3, 0.03, 0.009, 2.0],
    [-0.27, 0.91, 0.045, 2.85, 0.14, 0.020, 2.8, 0.04, 0.012, 3.0],
    [ 2.11, 0.58, 0.030, 5.93, 0.20, 0.038, 1.5, 0.05, 0.026, 0.9],
    [-2.28, 0.44, 0.022, 1.61, 0.22, 0.044, 3.4, 0.06, 0.031, 2.6],
    [ 0.66, 0.35, 0.018, 3.96, 0.24, 0.052, 0.9, 0.08, 0.037, 1.8]
  ];

  const worldOffset = new THREE.Vector2(0, 0);
  uniforms.uWorldOffset = uniforms.uWorldOffset || { value: new THREE.Vector2(0, 0) };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rotate2(x, z, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return { x: c * x - s * z, z: s * x + c * z };
  }

  function sampleIrregularSurface(localX, localZ, t) {
    const x = localX + worldOffset.x;
    const z = localZ + worldOffset.y;
    const hs = Number.isFinite(seaProfile.significantWaveHeight) ? seaProfile.significantWaveHeight : 0.85;
    const tp = Number.isFinite(seaProfile.peakPeriod) ? seaProfile.peakPeriod : 6.2;
    const rough = THREE.MathUtils.clamp(hs / 2.2, 0.04, 1.0);
    const directionRad = THREE.MathUtils.degToRad(Number(seaProfile.meanDirectionDeg) || 0);
    const baseDir = { x: Math.sin(directionRad), z: Math.cos(directionRad) };
    const lambda0 = clamp((G * tp * tp / (2 * PI)) * 1.65, 50, 230);
    const visualAmp = Math.max(3.60, Math.min(10.50, hs * 4.60 + 2.40));
    const visualTime = t * 0.52;

    let height = 0;
    let gradX = 0;
    let gradZ = 0;

    for (let i = 0; i < COMPONENTS.length; i++) {
      const c = COMPONENTS[i];
      const wobble = c[7] * Math.sin(visualTime * c[8] + c[9]);
      const d = rotate2(baseDir.x, baseDir.z, c[0] + wobble);
      const lambda = lambda0 * c[1];
      const ampMod = 1 + c[4] * Math.sin(visualTime * c[5] + c[6]);
      const amp = visualAmp * c[2] * ampMod;
      const k = 2 * PI / Math.max(lambda, 0.5);
      const omega = Math.sqrt(G * k);
      const phase = k * (x * d.x + z * d.z) - omega * visualTime + c[3];
      height += amp * Math.sin(phase);
      const gradientScale = amp * k * Math.cos(phase);
      gradX += d.x * gradientScale;
      gradZ += d.z * gradientScale;
    }

    if (height > 0) height *= 1 + 0.18 * rough;
    return { height, gradX, gradZ, hs, tp, rough, lambda0, visualAmp };
  }

  // Make the gameplay surface authoritative for the new irregular sea.
  const previousGetWaveHeight = getWaveHeight;
  getWaveHeight = function v093GetWaveHeight(x, z, t) {
    const sample = sampleIrregularSurface(x, z, t);
    return Number.isFinite(sample.height) ? sample.height : previousGetWaveHeight(x, z, t);
  };

  // Convert the active 4-band giant-wave shader into the same 12-band model.
  let shader = material.vertexShader;
  if (!shader.includes('uniform vec2 uWorldOffset;')) {
    shader = shader.replace('uniform vec2 uWaveDir;', 'uniform vec2 uWaveDir;\n    uniform vec2 uWorldOffset;');
  }
  shader = shader.replace('vec2 xz = wp.xz;', 'vec2 xz = wp.xz + uWorldOffset;');

  const irregularBlock = `
      vec2 baseDir = normalize(uWaveDir);
      float lambda0 = clamp((G * uTp * uTp / (2.0 * PI)) * 1.65, 50.0, 230.0);
      float visualAmp = max(3.60, min(10.50, uHs * 4.60 + 2.40));
      float h = 0.0;
      vec2 grad = vec2(0.0);

      vec2 d0  = normalize(rotate2(baseDir,  0.00 + 0.03*sin(time*0.011 + 0.4)));
      vec2 d1  = normalize(rotate2(baseDir,  0.34 + 0.04*sin(time*0.013 + 1.1)));
      vec2 d2  = normalize(rotate2(baseDir, -0.52 + 0.05*sin(time*0.017 + 2.2)));
      vec2 d3  = normalize(rotate2(baseDir,  0.91 + 0.04*sin(time*0.019 + 0.7)));
      vec2 d4  = normalize(rotate2(baseDir, -1.14 + 0.06*sin(time*0.021 + 2.9)));
      vec2 d5  = normalize(rotate2(baseDir,  1.42 + 0.07*sin(time*0.023 + 1.4)));
      vec2 d6  = normalize(rotate2(baseDir, -1.61 + 0.08*sin(time*0.029 + 0.2)));
      vec2 d7  = normalize(rotate2(baseDir,  0.18 + 0.03*sin(time*0.009 + 2.0)));
      vec2 d8  = normalize(rotate2(baseDir, -0.27 + 0.04*sin(time*0.012 + 3.0)));
      vec2 d9  = normalize(rotate2(baseDir,  2.11 + 0.05*sin(time*0.026 + 0.9)));
      vec2 d10 = normalize(rotate2(baseDir, -2.28 + 0.06*sin(time*0.031 + 2.6)));
      vec2 d11 = normalize(rotate2(baseDir,  0.66 + 0.08*sin(time*0.037 + 1.8)));

      waveTerm(xz, d0,  lambda0*1.00, visualAmp*0.330*(1.0 + 0.10*sin(time*0.018 + 1.2)), 0.31, h, grad);
      waveTerm(xz, d1,  lambda0*0.78, visualAmp*0.180*(1.0 + 0.16*sin(time*0.024 + 2.5)), 2.17, h, grad);
      waveTerm(xz, d2,  lambda0*0.64, visualAmp*0.120*(1.0 + 0.18*sin(time*0.031 + 0.8)), 4.88, h, grad);
      waveTerm(xz, d3,  lambda0*0.50, visualAmp*0.080*(1.0 + 0.20*sin(time*0.027 + 3.1)), 1.03, h, grad);
      waveTerm(xz, d4,  lambda0*0.39, visualAmp*0.060*(1.0 + 0.22*sin(time*0.035 + 1.7)), 5.46, h, grad);
      waveTerm(xz, d5,  lambda0*0.31, visualAmp*0.045*(1.0 + 0.24*sin(time*0.041 + 2.2)), 3.21, h, grad);
      waveTerm(xz, d6,  lambda0*0.26, visualAmp*0.035*(1.0 + 0.25*sin(time*0.047 + 3.8)), 0.74, h, grad);
      waveTerm(xz, d7,  lambda0*1.31, visualAmp*0.055*(1.0 + 0.12*sin(time*0.015 + 0.3)), 4.12, h, grad);
      waveTerm(xz, d8,  lambda0*0.91, visualAmp*0.045*(1.0 + 0.14*sin(time*0.020 + 2.8)), 2.85, h, grad);
      waveTerm(xz, d9,  lambda0*0.58, visualAmp*0.030*(1.0 + 0.20*sin(time*0.038 + 1.5)), 5.93, h, grad);
      waveTerm(xz, d10, lambda0*0.44, visualAmp*0.022*(1.0 + 0.22*sin(time*0.044 + 3.4)), 1.61, h, grad);
      waveTerm(xz, d11, lambda0*0.35, visualAmp*0.018*(1.0 + 0.24*sin(time*0.052 + 0.9)), 3.96, h, grad);

      h += max(h, 0.0) * 0.18 * uRough;`;

  shader = shader.replace(
    /vec2 d0 = normalize\(uWaveDir\);[\s\S]*?h \+= max\(h, 0\.0\) \* 0\.20 \* uRough;/,
    irregularBlock.trim()
  );
  material.vertexShader = shader;
  material.needsUpdate = true;

  // Keep normal-detail UVs stable across floating-origin recenter operations.
  let fragmentShader = material.fragmentShader;
  if (!fragmentShader.includes('uniform vec2 uWorldOffset;')) {
    fragmentShader = fragmentShader.replace('uniform float uSpeedRatio;', 'uniform float uSpeedRatio;\n    uniform vec2 uWorldOffset;');
  }
  fragmentShader = fragmentShader.replace(
    'vec4 noise = getNoise(worldPosition.xz * size);',
    'vec4 noise = getNoise((worldPosition.xz + uWorldOffset) * size);'
  );
  material.fragmentShader = fragmentShader;
  material.needsUpdate = true;

  // The old main loop clamps at +/-310 m. Recenter well before that threshold, so
  // it never reaches the clamp. Accumulated worldOffset preserves world-space phase.
  const previousUpdateJetSki = updateJetSki;
  const recenterThreshold = 220;
  const recenterQuantum = 160;
  let recenterCount = 0;

  function syncWorldUniforms() {
    uniforms.uWorldOffset.value.copy(worldOffset);
    if (uniforms.uCraftPos) uniforms.uCraftPos.value.set(ski.position.x, ski.position.z);
  }

  updateJetSki = function v093InfiniteWorldUpdate(dt, t) {
    previousUpdateJetSki(dt, t);

    let shiftX = 0;
    let shiftZ = 0;
    if (Math.abs(ski.position.x) > recenterThreshold) {
      shiftX = Math.trunc(ski.position.x / recenterQuantum) * recenterQuantum;
    }
    if (Math.abs(ski.position.z) > recenterThreshold) {
      shiftZ = Math.trunc(ski.position.z / recenterQuantum) * recenterQuantum;
    }

    if (shiftX || shiftZ) {
      ski.position.x -= shiftX;
      ski.position.z -= shiftZ;
      camera.position.x -= shiftX;
      camera.position.z -= shiftZ;
      worldOffset.x += shiftX;
      worldOffset.y += shiftZ;
      recenterCount += 1;
      syncWorldUniforms();
    }

    // Final guard uses the new irregular surface, not the superseded 4-wave shape.
    const minimumY = getWaveHeight(ski.position.x, ski.position.z, t) + physics.floatClearance;
    if (ski.position.y < minimumY) {
      ski.position.y = minimumY;
      if (airborne) {
        airborne = false;
        verticalVelocity = 0;
        landingCooldown = Math.max(landingCooldown, 0.18);
      }
    }
  };

  const previousUpdateWater = updateWater;
  updateWater = function v093IrregularOceanUpdate(t) {
    previousUpdateWater(t);
    syncWorldUniforms();
  };

  syncWorldUniforms();

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = visualVersion;
  document.title = `Swim Ring Racing ${visualVersion}`;

  window.V093_IRREGULAR_INFINITE_OCEAN = {
    version: visualVersion,
    components: COMPONENTS.length,
    sampleSurface: sampleIrregularSurface,
    worldOffset,
    recenterThreshold,
    recenterQuantum,
    get recenterCount() { return recenterCount; },
    deterministic: true,
    gameplaySurfaceSynced: true,
    floatingOrigin: true
  };
})();
