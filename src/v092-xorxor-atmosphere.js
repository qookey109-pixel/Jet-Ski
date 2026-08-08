// V0.9.2 XORXOR atmosphere/composition pass.
// Builds on V0.9.1 reflective water. Adds a clearer sky/sun/haze composition,
// lower ocean camera and softer legacy particle wake without changing gameplay physics.
(function () {
  'use strict';
  if (!window.THREE || typeof scene === 'undefined' || typeof renderer === 'undefined') return;
  if (!window.V091_VIRTOCEAN_WATER) return;

  const visualVersion = 'V0.9.2';
  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = visualVersion;
  document.title = `Swim Ring Racing ${visualVersion}`;

  const waterPass = window.V091_VIRTOCEAN_WATER;
  const uniforms = waterPass.uniforms;
  const mobileLike = Math.min(innerWidth, innerHeight) < 620 || /iPhone|iPad|Android/i.test(navigator.userAgent || '');

  // Retire the older gradient sky/haze so the reflection target only sees one atmosphere.
  if (window.OCEAN_VISUALS) {
    if (window.OCEAN_VISUALS.sky) window.OCEAN_VISUALS.sky.visible = false;
    if (window.OCEAN_VISUALS.haze) window.OCEAN_VISUALS.haze.visible = false;
  }

  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (THREE.ACESFilmicToneMapping != null) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
  }

  const sunDirection = new THREE.Vector3(-0.30, 0.42, 0.86).normalize();
  const skyUniforms = {
    uSunDir: { value: sunDirection },
    uSunColor: { value: new THREE.Color(0xffe7bd) },
    uZenith: { value: new THREE.Color(0x3c78a7) },
    uUpper: { value: new THREE.Color(0x73a9c8) },
    uHorizon: { value: new THREE.Color(0xc7dfe3) },
    uLowHorizon: { value: new THREE.Color(0x9fc7d0) },
    uTurbidity: { value: 0.62 }
  };

  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vDir = normalize(world.xyz - cameraPosition);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uZenith;
      uniform vec3 uUpper;
      uniform vec3 uHorizon;
      uniform vec3 uLowHorizon;
      uniform float uTurbidity;
      varying vec3 vDir;

      float sat(float x) { return clamp(x, 0.0, 1.0); }

      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;
        float up = sat(y);
        float horizonBand = exp(-abs(y) * mix(4.4, 2.7, uTurbidity));
        float upperMix = pow(up, 0.34);
        float zenithMix = pow(up, 1.8);

        vec3 sky = mix(uLowHorizon, uHorizon, sat(y * 6.0 + 0.5));
        sky = mix(sky, uUpper, upperMix);
        sky = mix(sky, uZenith, zenithMix * 0.62);
        sky += vec3(0.08, 0.055, 0.035) * horizonBand * uTurbidity;

        float mu = max(dot(d, normalize(uSunDir)), 0.0);
        float sunDisc = smoothstep(0.99955, 0.99992, mu);
        float innerGlow = pow(mu, 350.0);
        float outerGlow = pow(mu, 24.0);
        sky += uSunColor * (sunDisc * 3.3 + innerGlow * 1.2 + outerGlow * 0.15);

        float antiSun = max(dot(d, -normalize(uSunDir)), 0.0);
        sky += vec3(0.045, 0.065, 0.08) * pow(antiSun, 8.0) * horizonBand;

        gl_FragColor = vec4(sky, 1.0);
      }
    `
  });

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1800, mobileLike ? 28 : 40, mobileLike ? 16 : 24),
    skyMaterial
  );
  sky.renderOrder = -2000;
  sky.frustumCulled = false;
  scene.add(sky);
  scene.background = new THREE.Color(0xaecfd8);

  // Thin horizon veil: wide and low contrast; also appears in mirror reflection.
  const horizonMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(0xc7dfe3) },
      uOpacity: { value: 0.10 }
    },
    vertexShader: `
      varying float vY;
      void main() {
        vY = uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vY;
      void main() {
        float a = sin(vY * 3.14159265) * uOpacity;
        gl_FragColor = vec4(uColor, a);
      }
    `
  });
  const horizon = new THREE.Mesh(
    new THREE.CylinderGeometry(980, 980, 34, mobileLike ? 48 : 72, 1, true),
    horizonMaterial
  );
  horizon.position.y = 4.0;
  horizon.frustumCulled = false;
  scene.add(horizon);

  // Water palette and reflection feel: keep the 2050 lineage, but bias toward the
  // softer cyan/grey visual seen in VirtOcean rather than dark arcade-blue water.
  const calmColor = new THREE.Color(0x729dac);
  const normalColor = new THREE.Color(0x5f8e9f);
  const roughColor = new THREE.Color(0x496f7d);
  uniforms.sunDirection.value.copy(sunDirection);
  uniforms.sunColor.value.setHex(0xffe6bd);

  const legacyUpdateWater = updateWater;
  updateWater = function v092WaterUpdate(t) {
    legacyUpdateWater(t);
    const hs = Number.isFinite(seaProfile.significantWaveHeight) ? seaProfile.significantWaveHeight : 0.85;
    const rough = THREE.MathUtils.clamp(hs / 2.2, 0.04, 1.0);

    if (rough < 0.26) {
      uniforms.waterColor.value.copy(calmColor).lerp(normalColor, rough / 0.26);
    } else {
      uniforms.waterColor.value.copy(normalColor).lerp(roughColor, (rough - 0.26) / 0.74);
    }
    uniforms.distortionScale.value = THREE.MathUtils.lerp(9.5, 16.5, rough);
    uniforms.size.value = THREE.MathUtils.lerp(0.72, 1.06, rough);
    uniforms.sunDirection.value.copy(sunDirection);
    uniforms.sunColor.value.setHex(0xffe6bd);
  };

  // Camera composition: a little lower and farther back so the ocean occupies more
  // of the frame and large rolling waves read as volume instead of texture detail.
  const legacyUpdateCamera = updateCamera;
  const camForward = new THREE.Vector3();
  const camDesired = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const upVector = new THREE.Vector3(0, 1, 0);
  if (camera.isPerspectiveCamera) {
    camera.fov = mobileLike ? 61 : 63;
    camera.updateProjectionMatrix();
  }

  updateCamera = function v092CameraUpdate(dt) {
    legacyUpdateCamera(dt);
    camForward.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    camDesired.copy(ski.position)
      .addScaledVector(camForward, mobileLike ? -10.9 : -11.7)
      .addScaledVector(upVector, mobileLike ? 4.35 : 4.10);
    const blend = 1 - Math.exp(-(mobileLike ? 3.8 : 3.4) * dt);
    camera.position.lerp(camDesired, blend);
    camLook.copy(ski.position)
      .addScaledVector(camForward, mobileLike ? 8.8 : 10.2)
      .addScaledVector(upVector, 0.60);
    camera.lookAt(camLook);
    sky.position.copy(camera.position);
    horizon.position.x = camera.position.x;
    horizon.position.z = camera.position.z;
  };

  if (scene.fog) {
    scene.fog.color.setHex(0xb6d5dc);
    scene.fog.near = mobileLike ? 190 : 230;
    scene.fog.far = mobileLike ? 650 : 820;
  }

  // The original V0.5 particle wake is visually too bright beside the new reflective
  // water. Tone down only the long wake Points object; keep spray and landing splash.
  for (const child of scene.children) {
    if (!child || !child.isPoints || !child.material) continue;
    const size = Number(child.material.size) || 0;
    if (Math.abs(size - GAME_CONFIG.effects.wake.size) < 0.08) {
      child.material.size = mobileLike ? 0.27 : 0.31;
      child.material.opacity = 0.30;
      child.material.needsUpdate = true;
    } else if (Math.abs(size - GAME_CONFIG.effects.spray.size) < 0.08) {
      child.material.opacity = 0.70;
      child.material.needsUpdate = true;
    }
  }

  window.V092_XORXOR_PASS = {
    version: visualVersion,
    mode: '2050-inspired atmosphere + composition pass',
    sky,
    horizon,
    sunDirection,
    waterUniforms: uniforms
  };
})();
