// V0.7.1 Visual Ocean Pass.
// Upgrades rendering only. V0.7 sea-state data and V0.6 hydrodynamics remain authoritative.
(function () {
  if (!window.THREE || typeof water === 'undefined' || typeof scene === 'undefined') return;

  const visualVersion = 'V0.7.1';
  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = visualVersion;
  document.title = `Swim Ring Racing ${visualVersion}`;

  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  if (THREE.ACESFilmicToneMapping != null) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
  }

  const uniforms = {
    uTime: { value: 0 },
    uHs: { value: 0.85 },
    uRoughness: { value: 0.35 },
    uDeepColor: { value: new THREE.Color(0x03516e) },
    uShallowColor: { value: new THREE.Color(0x20aeca) },
    uHorizonColor: { value: new THREE.Color(0xa9e9f5) },
    uFoamColor: { value: new THREE.Color(0xf4fbff) },
    uSunDirection: { value: new THREE.Vector3(-0.36, 0.78, 0.50).normalize() },
    uSunColor: { value: new THREE.Color(0xfff1c4) },
    uFogColor: { value: new THREE.Color(0x92d6ec) },
    uFogNear: { value: 80.0 },
    uFogFar: { value: 360.0 }
  };

  const waterVisualMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform float uTime;
      uniform float uHs;
      uniform float uRoughness;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uFoamColor;
      uniform vec3 uSunDirection;
      uniform vec3 uSunColor;
      uniform vec3 uFogColor;
      uniform float uFogNear;
      uniform float uFogFar;

      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      float sat(float x) { return clamp(x, 0.0, 1.0); }

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);

        float rippleA = sin(vWorldPosition.x * 1.35 + vWorldPosition.z * 0.73 + uTime * 2.15);
        float rippleB = sin(vWorldPosition.x * -0.82 + vWorldPosition.z * 1.57 - uTime * 1.72);
        float rippleC = sin((vWorldPosition.x + vWorldPosition.z) * 2.35 + uTime * 2.85);
        float microStrength = mix(0.025, 0.085, uRoughness);
        vec3 normal = normalize(vWorldNormal + vec3(
          (rippleA + rippleC * 0.45) * microStrength,
          0.0,
          (rippleB - rippleC * 0.35) * microStrength
        ));

        float ndv = sat(dot(normal, viewDir));
        float fresnel = pow(1.0 - ndv, 3.2);
        float slope = 1.0 - sat(normal.y);
        float crestRatio = vWorldPosition.y / max(uHs, 0.12);

        vec3 base = mix(uShallowColor, uDeepColor, sat(0.30 + slope * 2.4));
        vec3 skyReflection = mix(vec3(0.24, 0.66, 0.84), uHorizonColor, fresnel);
        vec3 color = mix(base, skyReflection, 0.26 + fresnel * 0.54);

        vec3 reflectedSun = reflect(-uSunDirection, normal);
        float specPower = mix(150.0, 55.0, uRoughness);
        float sunSpec = pow(sat(dot(reflectedSun, viewDir)), specPower);
        float glint = sat(0.58 + 0.42 * rippleC);
        color += uSunColor * sunSpec * mix(1.25, 0.72, uRoughness) * glint;

        float foamNoise = sat(
          0.52
          + 0.24 * sin(vWorldPosition.x * 0.52 + vWorldPosition.z * 0.83 + uTime * 0.72)
          + 0.24 * sin(vWorldPosition.x * -0.93 + vWorldPosition.z * 0.41 - uTime * 1.03)
        );
        float crestMask = smoothstep(0.10, 0.48, crestRatio);
        float slopeMask = smoothstep(0.025, 0.16, slope);
        float foam = sat(crestMask * slopeMask * foamNoise * mix(0.65, 1.55, uRoughness));
        color = mix(color, uFoamColor, foam * 0.88);

        float distanceToCamera = length(cameraPosition - vWorldPosition);
        float fogFactor = smoothstep(uFogNear, uFogFar, distanceToCamera);
        color = mix(color, uFogColor, fogFactor * 0.82);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: true
  });

  // Keep the original waterMat alive because sea-state transition and V0.5 FX still read it.
  // Only the mesh's visible material is replaced.
  water.material = waterVisualMaterial;

  const skyUniforms = {
    uSunDirection: uniforms.uSunDirection,
    uSunColor: uniforms.uSunColor
  };
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform vec3 uSunDirection;
      uniform vec3 uSunColor;
      varying vec3 vWorldPosition;

      void main() {
        vec3 dir = normalize(vWorldPosition - cameraPosition);
        float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 horizon = vec3(0.70, 0.89, 0.98);
        vec3 zenith = vec3(0.18, 0.49, 0.78);
        vec3 sky = mix(horizon, zenith, pow(h, 0.58));

        float sunDot = max(dot(dir, normalize(uSunDirection)), 0.0);
        float sunDisc = smoothstep(0.9986, 0.9997, sunDot);
        float sunGlow = pow(sunDot, 56.0) * 0.42;
        sky += uSunColor * (sunDisc * 1.45 + sunGlow);

        float horizonGlow = pow(1.0 - abs(dir.y), 5.0) * 0.09;
        sky += vec3(1.0, 0.78, 0.55) * horizonGlow;
        gl_FragColor = vec4(sky, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false
  });

  const sky = new THREE.Mesh(new THREE.SphereGeometry(520, 36, 20), skyMaterial);
  sky.renderOrder = -1000;
  scene.add(sky);
  scene.background = new THREE.Color(0x8acfee);
  scene.fog.color.setHex(0x92d6ec);

  // Add a wide translucent horizon haze band to separate sea and sky visually.
  const hazeMaterial = new THREE.MeshBasicMaterial({
    color: 0xdaf5fb,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const haze = new THREE.Mesh(new THREE.CylinderGeometry(275, 275, 20, 64, 1, true), hazeMaterial);
  haze.position.y = 1.5;
  scene.add(haze);

  const baseColor = new THREE.Color();
  const deepTint = new THREE.Color(0x012f48);
  const shallowTint = new THREE.Color(0x32c7d5);
  const legacyTransition = updateSeaTransition;
  const legacyCamera = updateCamera;

  updateSeaTransition = function v071UpdateSeaTransition(dt) {
    legacyTransition(dt);

    const hs = Number.isFinite(seaProfile.significantWaveHeight)
      ? seaProfile.significantWaveHeight
      : 0.85;
    const roughness = THREE.MathUtils.clamp(hs / 2.2, 0.08, 1.0);
    uniforms.uHs.value = hs;
    uniforms.uRoughness.value = roughness;
    uniforms.uTime.value = clock.elapsedTime;

    baseColor.copy(waterMat.color);
    uniforms.uDeepColor.value.copy(baseColor).lerp(deepTint, 0.58);
    uniforms.uShallowColor.value.copy(baseColor).lerp(shallowTint, 0.42);

    if (scene.fog) {
      uniforms.uFogColor.value.copy(scene.fog.color);
      uniforms.uFogNear.value = scene.fog.near;
      uniforms.uFogFar.value = scene.fog.far;
    }
  };

  updateCamera = function v071UpdateCamera(dt) {
    legacyCamera(dt);
    sky.position.copy(camera.position);
    haze.position.x = camera.position.x;
    haze.position.z = camera.position.z;
  };

  window.OCEAN_VISUALS = {
    version: visualVersion,
    material: waterVisualMaterial,
    sky,
    haze,
    uniforms
  };
})();
