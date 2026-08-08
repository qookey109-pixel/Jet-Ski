// V0.9.1 VirtOcean / 2050-style reflective water port.
// Rendering strategy follows MIT-licensed references credited by VirtOcean:
// XORXOR "2050" CodePen + Three.js Water addon. Gameplay physics stays authoritative.
(function () {
  'use strict';
  if (!window.THREE || typeof scene === 'undefined' || typeof renderer === 'undefined') return;

  const visualVersion = 'V0.9.1';
  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = visualVersion;
  document.title = `Swim Ring Racing ${visualVersion}`;

  const mobileLike = Math.min(innerWidth, innerHeight) < 620 || /iPhone|iPad|Android/i.test(navigator.userAgent || '');
  const pixelRatioCap = mobileLike ? 1.20 : 1.45;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  renderer.setSize(innerWidth, innerHeight);

  if (typeof water !== 'undefined') water.visible = false;

  const normalFallback = new THREE.DataTexture(
    new Uint8Array([128, 128, 255, 255]), 1, 1, THREE.RGBAFormat
  );
  normalFallback.needsUpdate = true;
  normalFallback.wrapS = normalFallback.wrapT = THREE.RepeatWrapping;

  const mirrorPlane = new THREE.Plane();
  const normal = new THREE.Vector3();
  const mirrorWorldPosition = new THREE.Vector3();
  const cameraWorldPosition = new THREE.Vector3();
  const rotationMatrix = new THREE.Matrix4();
  const lookAtPosition = new THREE.Vector3(0, 0, -1);
  const clipPlane = new THREE.Vector4();
  const view = new THREE.Vector3();
  const target = new THREE.Vector3();
  const q = new THREE.Vector4();
  const textureMatrix = new THREE.Matrix4();
  const mirrorCamera = new THREE.PerspectiveCamera();
  const renderTarget = new THREE.WebGLRenderTarget(mobileLike ? 256 : 512, mobileLike ? 256 : 512);
  renderTarget.texture.generateMipmaps = false;

  const uniforms = {
    mirrorSampler: { value: renderTarget.texture },
    normalSampler: { value: normalFallback },
    alpha: { value: 1.0 },
    time: { value: 0.0 },
    size: { value: 1.0 },
    distortionScale: { value: 15.0 },
    textureMatrix: { value: textureMatrix },
    sunColor: { value: new THREE.Color(0xf5ebce) },
    sunDirection: { value: new THREE.Vector3(-0.36, 0.78, 0.50).normalize() },
    eye: { value: new THREE.Vector3() },
    waterColor: { value: new THREE.Color(0x5b899b) },
    uHs: { value: 0.85 },
    uTp: { value: 6.2 },
    uWaveDir: { value: new THREE.Vector2(0, 1) },
    uRough: { value: 0.35 },
    uCraftPos: { value: new THREE.Vector2() },
    uCraftDir: { value: new THREE.Vector2(0, 1) },
    uSpeedRatio: { value: 0 }
  };

  const vertexShader = `
    precision highp float;
    uniform mat4 textureMatrix;
    uniform float time;
    uniform float uHs;
    uniform float uTp;
    uniform float uRough;
    uniform vec2 uWaveDir;
    varying vec4 mirrorCoord;
    varying vec4 worldPosition;
    varying vec3 vGeomNormal;
    varying float vWaveHeight;
    varying float vWaveSlope;
    const float PI = 3.141592653589793;
    const float G = 9.81;

    vec2 rotate2(vec2 v, float a) {
      float c = cos(a), s = sin(a);
      return vec2(c*v.x - s*v.y, s*v.x + c*v.y);
    }

    void waveTerm(vec2 xz, vec2 d, float lambda, float amp, float phase0,
                  inout float h, inout vec2 grad) {
      float k = 2.0 * PI / max(lambda, 0.5);
      float omega = sqrt(G * k);
      float p = k * dot(xz, d) - omega * time + phase0;
      h += amp * sin(p);
      grad += d * (amp * k * cos(p));
    }

    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vec2 xz = wp.xz;
      vec2 d0 = normalize(uWaveDir);
      vec2 d1 = normalize(rotate2(d0, 0.42));
      vec2 d2 = normalize(rotate2(d0, -0.67));
      vec2 d3 = normalize(rotate2(d0, 1.08));

      float lambda0 = clamp(G * uTp * uTp / (2.0 * PI), 22.0, 105.0);
      float visualAmp = max(0.34, min(1.55, uHs * 0.62 + 0.20));
      float h = 0.0;
      vec2 grad = vec2(0.0);
      waveTerm(xz, d0, lambda0,        visualAmp * 0.52, 0.0, h, grad);
      waveTerm(xz, d1, lambda0 * 0.54, visualAmp * 0.22, 1.8, h, grad);
      waveTerm(xz, d2, lambda0 * 0.31, visualAmp * 0.12, 3.7, h, grad);
      waveTerm(xz, d3, lambda0 * 0.18, visualAmp * 0.055, 5.2, h, grad);
      h += max(h, 0.0) * 0.08 * uRough;
      wp.y += h;

      vGeomNormal = normalize(vec3(-grad.x, 1.0, -grad.y));
      vWaveHeight = h;
      vWaveSlope = length(grad);
      worldPosition = wp;
      mirrorCoord = textureMatrix * wp;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const fragmentShader = `
    precision highp float;
    uniform sampler2D mirrorSampler;
    uniform sampler2D normalSampler;
    uniform float alpha;
    uniform float time;
    uniform float size;
    uniform float distortionScale;
    uniform vec3 sunColor;
    uniform vec3 sunDirection;
    uniform vec3 eye;
    uniform vec3 waterColor;
    uniform float uHs;
    uniform float uRough;
    uniform vec2 uCraftPos;
    uniform vec2 uCraftDir;
    uniform float uSpeedRatio;
    varying vec4 mirrorCoord;
    varying vec4 worldPosition;
    varying vec3 vGeomNormal;
    varying float vWaveHeight;
    varying float vWaveSlope;

    vec4 getNoise(vec2 uv) {
      vec2 uv0 = (uv / 103.0) + vec2(time / 17.0, time / 29.0);
      vec2 uv1 = uv / 107.0 - vec2(time / -19.0, time / 31.0);
      vec2 uv2 = uv / vec2(8907.0, 9803.0) + vec2(time / 101.0, time / 97.0);
      vec2 uv3 = uv / vec2(1091.0, 1027.0) - vec2(time / 109.0, time / -113.0);
      vec4 n = texture2D(normalSampler, uv0) + texture2D(normalSampler, uv1)
             + texture2D(normalSampler, uv2) + texture2D(normalSampler, uv3);
      return n * 0.5 - 1.0;
    }

    void sunLight(const vec3 surfaceNormal, const vec3 eyeDirection,
                  inout vec3 diffuseColor, inout vec3 specularColor) {
      vec3 reflection = normalize(reflect(-sunDirection, surfaceNormal));
      float direction = max(0.0, dot(eyeDirection, reflection));
      specularColor += pow(direction, 100.0) * sunColor * 2.0;
      diffuseColor += max(dot(sunDirection, surfaceNormal), 0.0) * sunColor * 0.5;
    }

    void main() {
      vec4 noise = getNoise(worldPosition.xz * size);
      vec3 detailNormal = normalize(noise.xzy * vec3(1.15, 0.82, 1.15));
      vec3 surfaceNormal = normalize(mix(vGeomNormal, detailNormal, mix(0.46, 0.68, uRough)));

      vec3 diffuseLight = vec3(0.0);
      vec3 specularLight = vec3(0.0);
      vec3 worldToEye = eye - worldPosition.xyz;
      vec3 eyeDirection = normalize(worldToEye);
      sunLight(surfaceNormal, eyeDirection, diffuseLight, specularLight);

      float distanceToEye = length(worldToEye);
      vec2 distortion = surfaceNormal.xz * (0.001 + 1.0 / max(distanceToEye, 1.0)) * distortionScale;
      vec2 mirrorUv = mirrorCoord.xy / mirrorCoord.w + distortion;
      vec3 reflectionSample = texture2D(mirrorSampler, mirrorUv).rgb;

      float theta = max(dot(eyeDirection, surfaceNormal), 0.0);
      float rf0 = 0.30;
      float reflectance = rf0 + (1.0 - rf0) * pow(1.0 - theta, 5.0);
      vec3 scatter = max(0.0, dot(surfaceNormal, eyeDirection)) * waterColor;
      vec3 base = sunColor * diffuseLight * 0.20 + scatter;
      vec3 reflected = vec3(0.10) + reflectionSample * 0.92 + specularLight * 0.55;
      vec3 color = mix(base, reflected, reflectance);

      float crest = smoothstep(max(0.14, uHs * 0.12), max(0.28, uHs * 0.34), vWaveHeight + vWaveSlope * 0.26);
      color = mix(color, vec3(0.78, 0.91, 0.93), crest * mix(0.05, 0.22, uRough));

      vec2 rel = worldPosition.xz - uCraftPos;
      vec2 d = normalize(uCraftDir);
      vec2 r = vec2(d.y, -d.x);
      float along = dot(rel, d);
      float side = dot(rel, r);
      float behind = max(0.0, -along);
      float arm = exp(-pow(abs(side) - behind * 0.54, 2.0) / 0.80)
                * exp(-behind / 21.0) * step(0.3, behind) * uSpeedRatio;
      float trail = exp(-(side * side) / 0.58) * exp(-behind / 12.0)
                  * step(0.2, behind) * uSpeedRatio;
      float wake = clamp(arm * 0.55 + trail * 0.18, 0.0, 0.65);
      color = mix(color, vec3(0.86, 0.95, 0.96), wake);

      gl_FragColor = vec4(color, alpha);
    }
  `;

  const material = new THREE.ShaderMaterial({
    name: 'V091ReflectiveWater', uniforms, vertexShader, fragmentShader,
    side: THREE.FrontSide, transparent: false, depthWrite: true
  });

  const geometry = new THREE.PlaneGeometry(4400, 4400, mobileLike ? 72 : 120, mobileLike ? 72 : 120);
  const reflectiveWater = new THREE.Mesh(geometry, material);
  reflectiveWater.rotation.x = -Math.PI * 0.5;
  reflectiveWater.frustumCulled = false;
  scene.add(reflectiveWater);

  let lastReflectionMs = -Infinity;
  reflectiveWater.onBeforeRender = function (rdr, scn, cam) {
    const now = performance.now();
    const minInterval = mobileLike ? 1000 / 30 : 0;
    if (now - lastReflectionMs < minInterval) return;
    lastReflectionMs = now;

    mirrorWorldPosition.setFromMatrixPosition(reflectiveWater.matrixWorld);
    cameraWorldPosition.setFromMatrixPosition(cam.matrixWorld);
    rotationMatrix.extractRotation(reflectiveWater.matrixWorld);
    normal.set(0, 0, 1).applyMatrix4(rotationMatrix);
    view.subVectors(mirrorWorldPosition, cameraWorldPosition);
    if (view.dot(normal) > 0) return;

    view.reflect(normal).negate().add(mirrorWorldPosition);
    rotationMatrix.extractRotation(cam.matrixWorld);
    lookAtPosition.set(0, 0, -1).applyMatrix4(rotationMatrix).add(cameraWorldPosition);
    target.subVectors(mirrorWorldPosition, lookAtPosition).reflect(normal).negate().add(mirrorWorldPosition);

    mirrorCamera.position.copy(view);
    mirrorCamera.up.set(0, 1, 0).applyMatrix4(rotationMatrix).reflect(normal);
    mirrorCamera.lookAt(target);
    mirrorCamera.far = cam.far;
    mirrorCamera.updateMatrixWorld();
    mirrorCamera.projectionMatrix.copy(cam.projectionMatrix);

    textureMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    textureMatrix.multiply(mirrorCamera.projectionMatrix);
    textureMatrix.multiply(mirrorCamera.matrixWorldInverse);

    mirrorPlane.setFromNormalAndCoplanarPoint(normal, mirrorWorldPosition);
    mirrorPlane.applyMatrix4(mirrorCamera.matrixWorldInverse);
    clipPlane.set(mirrorPlane.normal.x, mirrorPlane.normal.y, mirrorPlane.normal.z, mirrorPlane.constant);
    const pm = mirrorCamera.projectionMatrix;
    q.x = (Math.sign(clipPlane.x) + pm.elements[8]) / pm.elements[0];
    q.y = (Math.sign(clipPlane.y) + pm.elements[9]) / pm.elements[5];
    q.z = -1.0;
    q.w = (1.0 + pm.elements[10]) / pm.elements[14];
    clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));
    pm.elements[2] = clipPlane.x;
    pm.elements[6] = clipPlane.y;
    pm.elements[10] = clipPlane.z + 1.0;
    pm.elements[14] = clipPlane.w;

    uniforms.eye.value.setFromMatrixPosition(cam.matrixWorld);
    const currentTarget = rdr.getRenderTarget();
    const xrEnabled = rdr.xr.enabled;
    const shadowAuto = rdr.shadowMap.autoUpdate;
    reflectiveWater.visible = false;
    rdr.xr.enabled = false;
    rdr.shadowMap.autoUpdate = false;
    rdr.setRenderTarget(renderTarget);
    rdr.state.buffers.depth.setMask(true);
    if (rdr.autoClear === false) rdr.clear();
    rdr.render(scn, mirrorCamera);
    reflectiveWater.visible = true;
    rdr.xr.enabled = xrEnabled;
    rdr.shadowMap.autoUpdate = shadowAuto;
    rdr.setRenderTarget(currentTarget);
    if (cam.viewport !== undefined) rdr.state.viewport(cam.viewport);
  };

  const normalUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/r152/examples/textures/waternormals.jpg';
  new THREE.TextureLoader().load(normalUrl, function (texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    if ('colorSpace' in texture && THREE.NoColorSpace != null) texture.colorSpace = THREE.NoColorSpace;
    uniforms.normalSampler.value = texture;
  }, undefined, function () {
    console.warn('[V0.9.1] water normal texture failed; using neutral fallback.');
  });

  scene.background = new THREE.Color(0xa9d4df);
  if (scene.fog) {
    scene.fog.color.setHex(0xb7dce4);
    scene.fog.near = 170;
    scene.fog.far = 620;
  }
  if (window.OCEAN_VISUALS && window.OCEAN_VISUALS.haze) {
    window.OCEAN_VISUALS.haze.material.opacity = 0.055;
  }

  updateWater = function v091ReflectiveWaterUpdate(t) {
    const hs = Number.isFinite(seaProfile.significantWaveHeight) ? seaProfile.significantWaveHeight : 0.85;
    const tp = Number.isFinite(seaProfile.peakPeriod) ? seaProfile.peakPeriod : 6.2;
    const rough = THREE.MathUtils.clamp(hs / 2.2, 0.04, 1.0);
    const dir = THREE.MathUtils.degToRad(Number(seaProfile.meanDirectionDeg) || 0);
    uniforms.time.value = t * 0.72;
    uniforms.uHs.value = hs;
    uniforms.uTp.value = tp;
    uniforms.uRough.value = rough;
    uniforms.uWaveDir.value.set(Math.sin(dir), Math.cos(dir));
    uniforms.uCraftPos.value.set(ski.position.x, ski.position.z);
    uniforms.uCraftDir.value.set(Math.sin(yaw), Math.cos(yaw));
    uniforms.uSpeedRatio.value = THREE.MathUtils.clamp(speed / physics.maxSpeed, 0, 1);
    uniforms.waterColor.value.setHex(rough > 0.68 ? 0x4c7889 : 0x5b899b);
  };

  addEventListener('resize', () => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
  });

  window.V091_VIRTOCEAN_WATER = {
    version: visualVersion, reflectiveWater, renderTarget, uniforms,
    sourceStyle: 'VirtOcean credited 2050 + Three.js Water', normalUrl, pixelRatioCap
  };
})();
