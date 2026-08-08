// V0.9 VirtOcean-inspired GPU Ocean Rebuild.
// Clean-room implementation: GPU Gerstner/spectral-style displacement, reflection,
// crest foam and GPU wake. Keeps V0.7/V0.6 gameplay water authoritative.
(function () {
  'use strict';

  if (!window.THREE || typeof scene === 'undefined' || typeof water === 'undefined') return;

  const visualVersion = 'V0.9';
  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = visualVersion;
  document.title = `Swim Ring Racing ${visualVersion}`;

  const mobileLike =
    Math.min(innerWidth, innerHeight) < 620 ||
    /iPhone|iPad|Android/i.test(navigator.userAgent || '');

  // The old CPU FFT patch was useful as a prototype but caused periodic stalls.
  // Remove it from the render tree; gameplay water remains untouched.
  if (window.FFT_OCEAN_VISUALS && window.FFT_OCEAN_VISUALS.patch) {
    scene.remove(window.FFT_OCEAN_VISUALS.patch);
    window.FFT_OCEAN_VISUALS.patch.visible = false;
    window.FFT_OCEAN_VISUALS.disabledByV09 = true;
  }

  // Reduce fill-rate pressure on Retina/mobile without a large visual penalty.
  const pixelRatioCap = mobileLike ? 1.25 : 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.setSize(innerWidth, innerHeight);

  // Reset the legacy far-ocean mesh once. From this point on wave displacement
  // happens in the GPU vertex shader instead of mutating 8k+ CPU vertices/frame.
  const farPosition = waterGeo.attributes.position;
  for (let i = 0; i < farPosition.count; i++) {
    farPosition.setY(i, waterConfig.baseHeight || 0);
  }
  farPosition.needsUpdate = true;
  waterGeo.computeVertexNormals();
  if (THREE.StaticDrawUsage != null) farPosition.setUsage(THREE.StaticDrawUsage);

  const commonUniforms = {
    uTime: { value: 0 },
    uHs: { value: 0.85 },
    uTp: { value: 6.2 },
    uRough: { value: 0.35 },
    uWaveDir: { value: new THREE.Vector2(0, 1) },
    uDeepColor: { value: new THREE.Color(0x012c43) },
    uBodyColor: { value: new THREE.Color(0x056b89) },
    uCrestColor: { value: new THREE.Color(0x48bed0) },
    uSkyZenith: { value: new THREE.Color(0x2d75ad) },
    uSkyHorizon: { value: new THREE.Color(0xc6edf5) },
    uSunColor: { value: new THREE.Color(0xffefc9) },
    uFoamColor: { value: new THREE.Color(0xf6fdff) },
    uFogColor: { value: new THREE.Color(0x92d6ec) },
    uFogNear: { value: 95.0 },
    uFogFar: { value: 430.0 },
    uSunDir: { value: new THREE.Vector3(-0.36, 0.78, 0.50).normalize() },
    uCraftPos: { value: new THREE.Vector2(0, 0) },
    uCraftDir: { value: new THREE.Vector2(0, 1) },
    uSpeedRatio: { value: 0 }
  };

  const vertexShader = `
    precision highp float;

    uniform float uTime;
    uniform float uHs;
    uniform float uTp;
    uniform float uRough;
    uniform vec2 uWaveDir;

    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying float vHeight;
    varying float vSlope;
    varying vec2 vWorldXZ;
    varying vec2 vUv;

    const float PI = 3.141592653589793;
    const float G = 9.81;

    vec2 rot(vec2 v, float a) {
      float c = cos(a);
      float s = sin(a);
      return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
    }

    void addWave(
      inout vec3 p,
      inout vec2 grad,
      vec2 dir,
      float wavelength,
      float amplitude,
      float steepness,
      float phaseOffset
    ) {
      float k = 2.0 * PI / max(wavelength, 0.25);
      float omega = sqrt(G * k);
      float phase = k * dot(dir, p.xz) - omega * uTime + phaseOffset;
      float s = sin(phase);
      float c = cos(phase);

      // Horizontal Gerstner displacement gives the characteristic compressed,
      // sharper crest profile without CPU-side mesh rewriting.
      p.xz += dir * (steepness * amplitude * c);
      p.y += amplitude * (s + 0.10 * uRough * sin(2.0 * phase));

      grad += dir * (amplitude * k * c);
    }

    void main() {
      vec4 baseWorld = modelMatrix * vec4(position, 1.0);
      vec3 p = baseWorld.xyz;
      vec2 grad = vec2(0.0);

      vec2 d0 = normalize(uWaveDir);
      vec2 d1 = normalize(rot(d0, 0.31));
      vec2 d2 = normalize(rot(d0, -0.48));
      vec2 d3 = normalize(rot(d0, 0.77));
      vec2 d4 = normalize(rot(d0, -0.92));
      vec2 d5 = normalize(rot(d0, 1.31));

      // Deep-water dominant wavelength from Tp. This keeps real sea-state data
      // visibly meaningful while limiting the visual amplitude to safe ranges.
      float lambda0 = clamp(G * uTp * uTp / (2.0 * PI), 16.0, 110.0);
      float ampScale = clamp(uHs, 0.18, 2.8);

      addWave(p, grad, d0, lambda0,        ampScale * 0.205, mix(0.36, 0.70, uRough), 0.0);
      addWave(p, grad, d1, lambda0 * 0.57, ampScale * 0.105, mix(0.28, 0.56, uRough), 1.7);
      addWave(p, grad, d2, lambda0 * 0.34, ampScale * 0.060, mix(0.24, 0.48, uRough), 3.3);
      addWave(p, grad, d3, lambda0 * 0.21, ampScale * 0.037, mix(0.18, 0.40, uRough), 5.1);
      addWave(p, grad, d4, lambda0 * 0.125,ampScale * 0.020, mix(0.14, 0.32, uRough), 2.4);
      addWave(p, grad, d5, lambda0 * 0.075,ampScale * 0.011, mix(0.10, 0.26, uRough), 4.2);

      vec3 n = normalize(vec3(-grad.x, 1.0, -grad.y));

      vWorldPosition = p;
      vWorldNormal = n;
      vHeight = p.y;
      vSlope = length(grad);
      vWorldXZ = p.xz;
      vUv = uv;

      gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;

    uniform float uTime;
    uniform float uHs;
    uniform float uRough;
    uniform vec2 uWaveDir;
    uniform vec3 uDeepColor;
    uniform vec3 uBodyColor;
    uniform vec3 uCrestColor;
    uniform vec3 uSkyZenith;
    uniform vec3 uSkyHorizon;
    uniform vec3 uSunColor;
    uniform vec3 uFoamColor;
    uniform vec3 uFogColor;
    uniform float uFogNear;
    uniform float uFogFar;
    uniform vec3 uSunDir;
    uniform vec2 uCraftPos;
    uniform vec2 uCraftDir;
    uniform float uSpeedRatio;

    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    varying float vHeight;
    varying float vSlope;
    varying vec2 vWorldXZ;
    varying vec2 vUv;

    float sat(float v) { return clamp(v, 0.0, 1.0); }

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }

    float valueNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    void main() {
      vec3 V = normalize(cameraPosition - vWorldPosition);

      // Capillary-scale normal detail stays in the fragment shader so the
      // silhouette remains stable and GPU cost stays low.
      float r1 = sin(vWorldXZ.x * 2.9 + vWorldXZ.y * 1.7 + uTime * 2.9);
      float r2 = sin(vWorldXZ.x * -2.1 + vWorldXZ.y * 3.4 - uTime * 2.2);
      float r3 = sin((vWorldXZ.x + vWorldXZ.y) * 5.6 + uTime * 4.6);
      float micro = mix(0.018, 0.075, uRough);
      vec3 N = normalize(vWorldNormal + vec3(
        (r1 + 0.35 * r3) * micro,
        0.0,
        (r2 - 0.25 * r3) * micro
      ));

      float ndv = sat(dot(N, V));
      float fresnel = pow(1.0 - ndv, 4.4);
      float normalizedHeight = vHeight / max(uHs, 0.18);
      float crestLight = sat(0.48 + normalizedHeight * 0.70);
      float slopeLight = sat(vSlope * 1.8);

      vec3 body = mix(uDeepColor, uBodyColor, crestLight);
      body = mix(body, uCrestColor, slopeLight * 0.34);

      // Cheap sky reflection gradient: strong near the horizon like VirtOcean,
      // without a reflection render target.
      float reflectedY = sat(reflect(-V, N).y * 0.5 + 0.5);
      vec3 reflectedSky = mix(uSkyHorizon, uSkyZenith, pow(reflectedY, 0.70));
      vec3 color = mix(body, reflectedSky, 0.18 + fresnel * 0.70);

      // Broken sun glitter path rather than one plastic-looking specular spot.
      vec3 R = reflect(-uSunDir, N);
      float spec = pow(sat(dot(R, V)), mix(260.0, 68.0, uRough));
      float glitterCell = hash21(floor(vWorldXZ * 5.8) + floor(uTime * 16.0));
      float glitter = smoothstep(0.72 - uRough * 0.16, 0.96, glitterCell);
      float sunPath = pow(sat(dot(normalize(vWorldXZ - cameraPosition.xz), normalize(uSunDir.xz))), 5.0);
      color += uSunColor * spec * (0.85 + glitter * 2.0 + sunPath * 0.30);

      // Crest foam: sparse in calm water, increasingly continuous in rough seas.
      vec2 waveDir = normalize(uWaveDir);
      vec2 crestDir = vec2(waveDir.y, -waveDir.x);
      float alongCrest = dot(vWorldXZ, crestDir);
      float alongWave = dot(vWorldXZ, waveDir);
      float breakup = valueNoise(vec2(alongCrest * 0.22, alongWave * 0.08 - uTime * 0.18));
      float crestMask = smoothstep(mix(0.34, 0.18, uRough), mix(0.72, 0.50, uRough),
                                  normalizedHeight + vSlope * 0.55);
      float foam = crestMask * smoothstep(0.38, 0.72, breakup);

      // GPU V-shaped craft wake. This replaces the expensive CPU event scan.
      vec2 rel = vWorldXZ - uCraftPos;
      vec2 craftDir = normalize(uCraftDir);
      vec2 craftRight = vec2(craftDir.y, -craftDir.x);
      float along = dot(rel, craftDir);
      float side = dot(rel, craftRight);
      float behind = max(0.0, -along);
      float armDistance = abs(abs(side) - behind * 0.56);
      float wakeArm = exp(-armDistance * armDistance / 0.42)
                    * exp(-behind / 25.0)
                    * step(0.15, behind)
                    * uSpeedRatio;
      float centerTrail = exp(-side * side / 0.32)
                        * exp(-behind / 14.0)
                        * step(0.10, behind)
                        * uSpeedRatio;
      float wakeTexture = 0.62 + 0.38 * sin(behind * 3.1 - uTime * 8.0);
      foam = sat(foam + wakeArm * (0.38 + 0.34 * wakeTexture) + centerTrail * 0.22);

      color = mix(color, uFoamColor, foam * mix(0.74, 0.96, uRough));

      float distanceToCamera = length(cameraPosition - vWorldPosition);
      float fogFactor = smoothstep(uFogNear, uFogFar, distanceToCamera);
      color = mix(color, uFogColor, fogFactor * 0.80);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function makeMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: commonUniforms,
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      transparent: false,
      depthWrite: true,
      fog: false
    });
  }

  // Far ocean: existing 700 m mesh, now entirely GPU-displaced.
  const farMaterial = makeMaterial();
  water.material = farMaterial;
  water.frustumCulled = false;

  // Near ocean: more tessellation for a smoother rolling silhouette.
  const nearSize = mobileLike ? 150 : 210;
  const nearSegments = mobileLike ? 72 : 128;
  const nearGeometry = new THREE.PlaneGeometry(
    nearSize, nearSize, nearSegments, nearSegments
  );
  nearGeometry.rotateX(-Math.PI / 2);

  const nearMaterial = makeMaterial();
  nearMaterial.polygonOffset = true;
  nearMaterial.polygonOffsetFactor = -1;
  nearMaterial.polygonOffsetUnits = -1;

  const nearOcean = new THREE.Mesh(nearGeometry, nearMaterial);
  nearOcean.frustumCulled = false;
  nearOcean.renderOrder = 1;
  scene.add(nearOcean);

  // Preserve existing sky/horizon from V0.7.1, but tune it toward the
  // lower-contrast blue/cyan ambience seen in VirtOcean.
  if (window.OCEAN_VISUALS && window.OCEAN_VISUALS.uniforms) {
    const u = window.OCEAN_VISUALS.uniforms;
    if (u.uDeepColor) u.uDeepColor.value.setHex(0x023e59);
    if (u.uShallowColor) u.uShallowColor.value.setHex(0x1f9db5);
    if (u.uHorizonColor) u.uHorizonColor.value.setHex(0xb9e7f0);
  }
  scene.background = new THREE.Color(0x78bddb);
  if (scene.fog) {
    scene.fog.color.setHex(0x8ccbdc);
    scene.fog.near = 110;
    scene.fog.far = 430;
  }

  const legacyUpdateWaterV081 = updateWater;
  // Intentionally do NOT call the V0.8.1 CPU visual update here.
  // Gameplay physics never depended on that mesh mutation.
  updateWater = function v09GpuOceanUpdate(t) {
    const hs = Number.isFinite(seaProfile.significantWaveHeight)
      ? seaProfile.significantWaveHeight
      : 0.85;
    const tp = Number.isFinite(seaProfile.peakPeriod)
      ? seaProfile.peakPeriod
      : 6.2;
    const rough = THREE.MathUtils.clamp(hs / 2.2, 0.06, 1.0);
    const direction = THREE.MathUtils.degToRad(
      Number(seaProfile.meanDirectionDeg) || 0
    );

    commonUniforms.uTime.value = t;
    commonUniforms.uHs.value = hs;
    commonUniforms.uTp.value = tp;
    commonUniforms.uRough.value = rough;
    commonUniforms.uWaveDir.value.set(Math.sin(direction), Math.cos(direction));
    commonUniforms.uCraftPos.value.set(ski.position.x, ski.position.z);
    commonUniforms.uCraftDir.value.set(Math.sin(yaw), Math.cos(yaw));
    commonUniforms.uSpeedRatio.value = THREE.MathUtils.clamp(
      speed / physics.maxSpeed, 0, 1
    );

    if (scene.fog) {
      commonUniforms.uFogColor.value.copy(scene.fog.color);
      commonUniforms.uFogNear.value = scene.fog.near;
      commonUniforms.uFogFar.value = scene.fog.far;
    }

    // Snap the high-resolution patch around the player to avoid visible swimming.
    const snap = mobileLike ? 3.0 : 2.0;
    nearOcean.position.x = Math.round(ski.position.x / snap) * snap;
    nearOcean.position.z = Math.round(ski.position.z / snap) * snap;
  };

  // On resize preserve the pixel-ratio cap.
  addEventListener('resize', () => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  });

  window.V09_GPU_OCEAN = {
    version: visualVersion,
    mode: 'VirtOcean-inspired GPU Gerstner spectral sea',
    nearOcean,
    farOcean: water,
    uniforms: commonUniforms,
    mobileLike,
    pixelRatioCap,
    disabledCpuFft: true,
    legacyUpdateWaterV081
  };
})();
