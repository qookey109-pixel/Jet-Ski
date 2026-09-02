// V0.10.5.2 Natural Disaster Events EXP.
// Adapted from Token-Gremlin/natural-disasters (ABYSSAL), MIT License.
// Upstream event concepts: analytic tsunami soliton + localized rogue-wave group.
// This layer is opt-in and preserves the current ocean/9-Point+/Planar baseline.
(function (root) {
  'use strict';

  const VERSION = 'V0.10.5.2';
  const STORAGE_KEY = 'swimRing.disasterExp.enabled';
  const TWO_PI = Math.PI * 2;

  const DEFAULTS = Object.freeze({
    tsunami: Object.freeze({
      height: 10.0,
      width: 95,
      steep: 1.08,
      lateral: 2600,
      speed: 36,
      distance: 720,
      maxLife: 34,
      rampSeconds: 1.8,
      fadeSeconds: 5.0
    }),
    rogue: Object.freeze({
      height: 7.5,
      radius: 155,
      wavelength: 120,
      speed: 24,
      distance: 310,
      maxLife: 22,
      rampSeconds: 2.4,
      fadeSeconds: 4.5
    })
  });

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function smoothstep(edge0, edge1, x) {
    if (edge0 === edge1) return x < edge0 ? 0 : 1;
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function safeSech(x) {
    const c = clamp(Number(x) || 0, -12, 12);
    const ex = Math.exp(c);
    const enx = Math.exp(-c);
    return 2 / (ex + enx);
  }

  // Same analytic family as ABYSSAL's MIT-licensed solitary-wave modifier,
  // reduced to the browser-safe height profile needed by Jet-Ski.
  function solitonProfile(x, width, steep) {
    const w = Math.max(Number(width) || 1, 1);
    const s = clamp(Number(steep) || 0, 0, 2.5);
    const xf = x > 0 ? x * (1 + s * 1.35) : x;
    const crest = safeSech(xf / w);
    const draw = safeSech((x - w * 1.6) / (w * 1.1));
    return crest * crest - draw * draw * 0.16 * s;
  }

  function eventEnvelope(age, maxLife, rampSeconds, fadeSeconds) {
    if (!Number.isFinite(age) || age < 0 || age > maxLife) return 0;
    const up = smoothstep(0, Math.max(rampSeconds, 0.01), age);
    const downStart = Math.max(0, maxLife - Math.max(fadeSeconds, 0.01));
    const down = 1 - smoothstep(downStart, maxLife, age);
    return up * down;
  }

  function normalizeDir(x, z) {
    const len = Math.hypot(Number(x) || 0, Number(z) || 0) || 1;
    return { x: (Number(x) || 0) / len, z: (Number(z) || 0) / len };
  }

  function sampleTsunami(event, worldX, worldZ, t) {
    if (!event) return 0;
    const age = (Number(t) || 0) - event.startT;
    const envLife = eventEnvelope(age, event.maxLife, event.rampSeconds, event.fadeSeconds);
    if (envLife <= 0) return 0;
    const dir = normalizeDir(event.dirX, event.dirZ);
    const frontDist = event.startDist + event.speed * age;
    const along = worldX * dir.x + worldZ * dir.z - frontDist;
    const lat = worldX * -dir.z + worldZ * dir.x - event.lateralCenter;
    const latEnv = Math.exp(-(lat * lat) / (event.lateral * event.lateral + 1));
    return event.height * envLife * solitonProfile(along, event.width, event.steep) * latEnv;
  }

  function rogueCarrier(relativeAlong, wavelength, phase) {
    const k = TWO_PI / Math.max(wavelength, 4);
    const p = relativeAlong * k + phase;
    const raw = Math.cos(p) * 0.72
      + Math.cos(p * 1.73 + 0.9) * 0.18
      + Math.cos(p * 0.57 - 0.4) * 0.10;
    return Math.sign(raw) * Math.pow(Math.abs(raw), 0.72);
  }

  function sampleRogue(event, worldX, worldZ, t) {
    if (!event) return 0;
    const age = (Number(t) || 0) - event.startT;
    const envLife = eventEnvelope(age, event.maxLife, event.rampSeconds, event.fadeSeconds);
    if (envLife <= 0) return 0;
    const dir = normalizeDir(event.dirX, event.dirZ);
    const cx = event.startX + dir.x * event.speed * age;
    const cz = event.startZ + dir.z * event.speed * age;
    const dx = worldX - cx;
    const dz = worldZ - cz;
    const radius = Math.max(event.radius, 1);
    const spatial = Math.exp(-(dx * dx + dz * dz) / (radius * radius));
    const along = dx * dir.x + dz * dir.z;
    const omega = Math.sqrt(9.81 * TWO_PI / Math.max(event.wavelength, 4));
    const carrier = rogueCarrier(along, event.wavelength, -omega * age);
    return event.height * envLife * spatial * carrier;
  }

  function sampleEventHeight(events, worldX, worldZ, t) {
    if (!events) return 0;
    const tsunami = sampleTsunami(events.tsunami, worldX, worldZ, t);
    const rogue = sampleRogue(events.rogue, worldX, worldZ, t);
    const sum = tsunami + rogue;
    return Number.isFinite(sum) ? sum : 0;
  }

  function makeTsunamiAt(worldX, worldZ, forwardX, forwardZ, startT, overrides) {
    const o = Object.assign({}, DEFAULTS.tsunami, overrides || {});
    const f = normalizeDir(forwardX, forwardZ);
    const dir = { x: -f.x, z: -f.z };
    const frontX = worldX + f.x * o.distance;
    const frontZ = worldZ + f.z * o.distance;
    return {
      type: 'tsunami',
      startT: Number(startT) || 0,
      dirX: dir.x,
      dirZ: dir.z,
      startDist: frontX * dir.x + frontZ * dir.z,
      lateralCenter: frontX * -dir.z + frontZ * dir.x,
      height: o.height,
      width: o.width,
      steep: o.steep,
      lateral: o.lateral,
      speed: o.speed,
      maxLife: o.maxLife,
      rampSeconds: o.rampSeconds,
      fadeSeconds: o.fadeSeconds
    };
  }

  function makeRogueAt(worldX, worldZ, forwardX, forwardZ, startT, overrides) {
    const o = Object.assign({}, DEFAULTS.rogue, overrides || {});
    const f = normalizeDir(forwardX, forwardZ);
    const dir = { x: -f.x, z: -f.z };
    return {
      type: 'rogue',
      startT: Number(startT) || 0,
      startX: worldX + f.x * o.distance,
      startZ: worldZ + f.z * o.distance,
      dirX: dir.x,
      dirZ: dir.z,
      height: o.height,
      radius: o.radius,
      wavelength: o.wavelength,
      speed: o.speed,
      maxLife: o.maxLife,
      rampSeconds: o.rampSeconds,
      fadeSeconds: o.fadeSeconds
    };
  }

  const pureApi = {
    VERSION,
    DEFAULTS,
    clamp,
    smoothstep,
    solitonProfile,
    eventEnvelope,
    normalizeDir,
    rogueCarrier,
    sampleTsunami,
    sampleRogue,
    sampleEventHeight,
    makeTsunamiAt,
    makeRogueAt
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = pureApi;
  if (typeof window === 'undefined') return;

  if (!root.THREE || typeof scene === 'undefined' || typeof camera === 'undefined'
      || typeof getWaveHeight !== 'function' || typeof updateWater !== 'function') {
    root.V01052_NATURAL_DISASTERS = Object.assign({}, pureApi, {
      available: false,
      reason: 'game-runtime-unavailable'
    });
    return;
  }

  const THREE = root.THREE;
  const ocean = root.V093_IRREGULAR_INFINITE_OCEAN;
  const waterApi = root.V091_VIRTOCEAN_WATER;
  const material = waterApi && waterApi.reflectiveWater && waterApi.reflectiveWater.material;
  const uniforms = waterApi && waterApi.uniforms;
  const mobileLike = Math.min(innerWidth, innerHeight) < 620 || /iPhone|iPad|Android/i.test(navigator.userAgent || '');
  const safari = /Safari/i.test(navigator.userAgent || '') && !/Chrome|Chromium|CriOS|Edg|OPR/i.test(navigator.userAgent || '');

  const state = {
    enabled: false,
    tsunami: null,
    rogue: null,
    rain: false,
    lightning: null,
    triggers: { tsunami: 0, rogue: 0, rain: 0, lightning: 0, clear: 0 },
    physicsSurfaceModified: false,
    visualSurfaceModified: false,
    shaderPatched: false,
    maxObservedEventHeight: 0
  };

  try { state.enabled = localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) {}

  function currentTime() {
    return typeof clock !== 'undefined' && Number.isFinite(clock.elapsedTime)
      ? clock.elapsedTime
      : performance.now() / 1000;
  }

  function worldOffset() {
    const offset = ocean && ocean.worldOffset;
    return offset || { x: 0, y: 0 };
  }

  function craftWorldPosition() {
    const offset = worldOffset();
    return {
      x: ski.position.x + (Number(offset.x) || 0),
      z: ski.position.z + (Number(offset.y) || 0)
    };
  }

  function craftForward() {
    const heading = typeof yaw === 'number' ? yaw : 0;
    return { x: Math.sin(heading), z: Math.cos(heading) };
  }

  function sampleCurrentEvents(worldX, worldZ, t) {
    if (!state.enabled) return 0;
    return sampleEventHeight(state, worldX, worldZ, t);
  }

  const previousGetWaveHeight = getWaveHeight;
  getWaveHeight = function v01052DisasterWaveHeight(x, z, t) {
    const base = previousGetWaveHeight(x, z, t);
    if (!state.enabled) return base;
    const offset = worldOffset();
    const eventHeight = sampleCurrentEvents(
      x + (Number(offset.x) || 0),
      z + (Number(offset.y) || 0),
      t
    );
    if (Number.isFinite(eventHeight)) {
      state.maxObservedEventHeight = Math.max(state.maxObservedEventHeight, Math.abs(eventHeight));
      return base + eventHeight;
    }
    return base;
  };
  state.physicsSurfaceModified = true;

  function installShaderPatch() {
    if (!material || !uniforms || typeof material.vertexShader !== 'string') return false;
    if (material.vertexShader.includes('uDisasterTsunamiA')) return true;

    uniforms.uDisasterTsunamiA = { value: new THREE.Vector4(0, -1, 0, 0) };
    uniforms.uDisasterTsunamiB = { value: new THREE.Vector4(95, 1.08, 2600, 0) };
    uniforms.uDisasterRogueA = { value: new THREE.Vector4(0, 0, 155, 0) };
    uniforms.uDisasterRogueB = { value: new THREE.Vector4(0, -1, 120, 0) };

    const uniformBlock = `
    uniform vec4 uDisasterTsunamiA;
    uniform vec4 uDisasterTsunamiB;
    uniform vec4 uDisasterRogueA;
    uniform vec4 uDisasterRogueB;`;

    let shader = material.vertexShader;
    if (shader.includes('uniform vec2 uWorldOffset;')) {
      shader = shader.replace('uniform vec2 uWorldOffset;', 'uniform vec2 uWorldOffset;' + uniformBlock);
    } else {
      shader = shader.replace('uniform vec2 uWaveDir;', 'uniform vec2 uWaveDir;' + uniformBlock);
    }

    const helpers = `
    float disasterSech(float x) {
      float c = clamp(x, -12.0, 12.0);
      return 2.0 / (exp(c) + exp(-c));
    }
    float disasterSolitonProfile(float x, float w, float steep) {
      float width = max(w, 1.0);
      float xf = x > 0.0 ? x * (1.0 + steep * 1.35) : x;
      float a = disasterSech(xf / width);
      float b = disasterSech((x - width * 1.6) / (width * 1.1));
      return a * a - b * b * 0.16 * steep;
    }
    float disasterHeight(vec2 p) {
      float h = 0.0;
      if (uDisasterTsunamiA.w > 0.0001) {
        vec2 d = normalize(uDisasterTsunamiA.xy + vec2(1e-6, 0.0));
        float along = dot(p, d) - uDisasterTsunamiA.z;
        float lat = dot(p, vec2(-d.y, d.x)) - uDisasterTsunamiB.w;
        float lateral = max(uDisasterTsunamiB.z, 1.0);
        float latEnv = exp(-(lat * lat) / (lateral * lateral + 1.0));
        h += uDisasterTsunamiA.w * disasterSolitonProfile(along, uDisasterTsunamiB.x, uDisasterTsunamiB.y) * latEnv;
      }
      if (uDisasterRogueA.w > 0.0001) {
        vec2 rel = p - uDisasterRogueA.xy;
        float radius = max(uDisasterRogueA.z, 1.0);
        float spatial = exp(-dot(rel, rel) / (radius * radius));
        vec2 d = normalize(uDisasterRogueB.xy + vec2(1e-6, 0.0));
        float phase = dot(rel, d) * (2.0 * PI / max(uDisasterRogueB.z, 4.0)) + uDisasterRogueB.w;
        float raw = cos(phase) * 0.72 + cos(phase * 1.73 + 0.9) * 0.18 + cos(phase * 0.57 - 0.4) * 0.10;
        float peaky = sign(raw) * pow(abs(raw), 0.72);
        h += uDisasterRogueA.w * spatial * peaky;
      }
      return h;
    }
    `;

    shader = shader.replace('void main() {', helpers + '\n    void main() {');

    const anchor = 'h += max(h, 0.0) * 0.18 * uRough;';
    const fallbackAnchor = 'h += max(h, 0.0) * 0.08 * uRough;';
    const target = shader.includes(anchor) ? anchor : fallbackAnchor;
    if (!shader.includes(target)) return false;
    shader = shader.replace(target, `${target}
      if (uDisasterTsunamiA.w > 0.0001 || uDisasterRogueA.w > 0.0001) {
        float eh = disasterHeight(xz);
        float ex = disasterHeight(xz + vec2(1.0, 0.0));
        float ez = disasterHeight(xz + vec2(0.0, 1.0));
        h += eh;
        grad += vec2(ex - eh, ez - eh);
      }`);

    material.vertexShader = shader;
    material.needsUpdate = true;
    state.shaderPatched = true;
    state.visualSurfaceModified = true;
    return true;
  }

  installShaderPatch();

  function expireEvents(t) {
    for (const key of ['tsunami', 'rogue']) {
      const event = state[key];
      if (event && t - event.startT > event.maxLife) state[key] = null;
    }
  }

  function syncShaderEvents(t) {
    if (!uniforms || !uniforms.uDisasterTsunamiA) return;
    expireEvents(t);

    const ts = state.enabled ? state.tsunami : null;
    if (ts) {
      const age = t - ts.startT;
      const amp = ts.height * eventEnvelope(age, ts.maxLife, ts.rampSeconds, ts.fadeSeconds);
      const dist = ts.startDist + ts.speed * age;
      uniforms.uDisasterTsunamiA.value.set(ts.dirX, ts.dirZ, dist, amp);
      uniforms.uDisasterTsunamiB.value.set(ts.width, ts.steep, ts.lateral, ts.lateralCenter);
    } else {
      uniforms.uDisasterTsunamiA.value.set(0, -1, 0, 0);
    }

    const r = state.enabled ? state.rogue : null;
    if (r) {
      const age = t - r.startT;
      const life = eventEnvelope(age, r.maxLife, r.rampSeconds, r.fadeSeconds);
      const dir = normalizeDir(r.dirX, r.dirZ);
      const cx = r.startX + dir.x * r.speed * age;
      const cz = r.startZ + dir.z * r.speed * age;
      const omega = Math.sqrt(9.81 * TWO_PI / Math.max(r.wavelength, 4));
      uniforms.uDisasterRogueA.value.set(cx, cz, r.radius, r.height * life);
      uniforms.uDisasterRogueB.value.set(dir.x, dir.z, r.wavelength, -omega * age);
    } else {
      uniforms.uDisasterRogueA.value.set(0, 0, 1, 0);
    }
  }

  // Lightweight rain: no volumetric cloud march or ABYSSAL renderer import.
  const rainCount = mobileLike ? 160 : (safari ? 260 : 420);
  const rainPositions = new Float32Array(rainCount * 2 * 3);
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMaterial = new THREE.LineBasicMaterial({
    color: 0xcfe9ff,
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });
  const rainLines = new THREE.LineSegments(rainGeometry, rainMaterial);
  rainLines.frustumCulled = false;
  scene.add(rainLines);

  const rainSeeds = new Float32Array(rainCount * 4);
  for (let i = 0; i < rainCount; i++) {
    rainSeeds[i * 4] = Math.random();
    rainSeeds[i * 4 + 1] = Math.random();
    rainSeeds[i * 4 + 2] = Math.random();
    rainSeeds[i * 4 + 3] = Math.random();
  }

  function updateRain(t) {
    const active = state.enabled && state.rain;
    rainLines.visible = active;
    rainMaterial.opacity = active ? 0.46 : 0;
    if (!active) return;
    const radius = mobileLike ? 34 : 46;
    const height = mobileLike ? 20 : 28;
    for (let i = 0; i < rainCount; i++) {
      const i4 = i * 4;
      const i6 = i * 6;
      const a = rainSeeds[i4] * TWO_PI;
      const r = radius * Math.sqrt(rainSeeds[i4 + 1]);
      const phase = (rainSeeds[i4 + 2] + t * (0.72 + rainSeeds[i4 + 3] * 0.55)) % 1;
      const x = camera.position.x + Math.cos(a) * r - phase * 4.5;
      const z = camera.position.z + Math.sin(a) * r + phase * 2.2;
      const y = camera.position.y + height * (1 - phase) - 4;
      rainPositions[i6] = x;
      rainPositions[i6 + 1] = y;
      rainPositions[i6 + 2] = z;
      rainPositions[i6 + 3] = x + 0.35;
      rainPositions[i6 + 4] = y - (mobileLike ? 2.4 : 3.2);
      rainPositions[i6 + 5] = z - 0.18;
    }
    rainGeometry.attributes.position.needsUpdate = true;
  }

  // Lightweight lightning: a short-lived line bolt + local flash only.
  const lightningGroup = new THREE.Group();
  lightningGroup.visible = false;
  scene.add(lightningGroup);
  const lightningLight = new THREE.PointLight(0xdcecff, 0, 260, 2);
  scene.add(lightningLight);

  function deterministicJitter(seed) {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  }

  function buildLightningBolt() {
    lightningGroup.clear();
    const forward = craftForward();
    const baseX = camera.position.x + forward.x * 85;
    const baseZ = camera.position.z + forward.z * 85;
    const topY = Math.max(camera.position.y + 72, 78);
    const bottomY = Math.max(getWaveHeight(baseX, baseZ, currentTime()) + 1.5, 2.0);
    const points = [];
    const segments = 15;
    for (let i = 0; i <= segments; i++) {
      const f = i / segments;
      const spread = (1 - f) * 7 + 0.8;
      points.push(new THREE.Vector3(
        baseX + deterministicJitter(i + 1.3) * spread,
        THREE.MathUtils.lerp(topY, bottomY, f),
        baseZ + deterministicJitter(i + 8.1) * spread
      ));
    }
    const material = new THREE.LineBasicMaterial({
      color: 0xe8f4ff,
      transparent: true,
      opacity: 1,
      depthWrite: false
    });
    const bolt = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
    lightningGroup.add(bolt);
    lightningLight.position.set(baseX, topY * 0.55, baseZ);
  }

  function updateLightning(t) {
    const bolt = state.lightning;
    if (!state.enabled || !bolt) {
      lightningGroup.visible = false;
      lightningLight.intensity = 0;
      return;
    }
    const age = t - bolt.startT;
    if (age > 0.34) {
      state.lightning = null;
      lightningGroup.visible = false;
      lightningLight.intensity = 0;
      return;
    }
    const flicker = age < 0.08 ? 1 : age < 0.14 ? 0.2 : age < 0.23 ? 0.85 : 0.18;
    lightningGroup.visible = true;
    for (const child of lightningGroup.children) {
      if (child.material) child.material.opacity = flicker;
    }
    lightningLight.intensity = 6.0 * flicker;
  }

  function persistEnabled() {
    try { localStorage.setItem(STORAGE_KEY, state.enabled ? '1' : '0'); } catch (_) {}
  }

  function triggerTsunami(overrides) {
    const p = craftWorldPosition();
    const f = craftForward();
    state.enabled = true;
    state.tsunami = makeTsunamiAt(p.x, p.z, f.x, f.z, currentTime(), overrides);
    state.triggers.tsunami += 1;
    persistEnabled();
    refreshUi();
    return state.tsunami;
  }

  function triggerRogue(overrides) {
    const p = craftWorldPosition();
    const f = craftForward();
    state.enabled = true;
    state.rogue = makeRogueAt(p.x, p.z, f.x, f.z, currentTime(), overrides);
    state.triggers.rogue += 1;
    persistEnabled();
    refreshUi();
    return state.rogue;
  }

  function triggerLightning() {
    state.enabled = true;
    state.lightning = { startT: currentTime() };
    buildLightningBolt();
    state.triggers.lightning += 1;
    persistEnabled();
    refreshUi();
  }

  function toggleRain(force) {
    state.enabled = true;
    state.rain = typeof force === 'boolean' ? force : !state.rain;
    state.triggers.rain += 1;
    persistEnabled();
    refreshUi();
    return state.rain;
  }

  function clearEvents() {
    state.tsunami = null;
    state.rogue = null;
    state.lightning = null;
    state.rain = false;
    state.triggers.clear += 1;
    syncShaderEvents(currentTime());
    refreshUi();
  }

  function setEnabled(enabled) {
    state.enabled = Boolean(enabled);
    if (!state.enabled) clearEvents();
    persistEnabled();
    refreshUi();
  }

  // Compact EXP controls. Keys 4/5/6/7/0 mirror the buttons.
  const hud = document.querySelector('.hud');
  const statusRow = document.createElement('div');
  statusRow.innerHTML = '災害 <span id="disaster-exp-state">OFF</span>';
  if (hud) hud.appendChild(statusRow);
  const statusEl = statusRow.querySelector('#disaster-exp-state');

  const panel = document.createElement('div');
  panel.className = 'disaster-exp-controls';
  panel.setAttribute('aria-label', 'natural disaster experimental controls');
  panel.style.cssText = [
    'position:fixed',
    'top:102px',
    'right:14px',
    'z-index:9',
    'display:flex',
    'gap:5px',
    'max-width:min(430px,72vw)',
    'flex-wrap:wrap',
    'justify-content:flex-end',
    'padding:5px',
    'border-radius:12px',
    'background:rgba(0,20,32,.42)',
    'backdrop-filter:blur(8px)',
    'user-select:none'
  ].join(';');
  document.body.appendChild(panel);

  function addButton(label, title, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    button.style.cssText = [
      'min-height:30px',
      'padding:0 8px',
      'border:1px solid rgba(255,255,255,.28)',
      'border-radius:9px',
      'background:rgba(0,27,43,.62)',
      'color:#fff',
      'font-weight:750',
      'cursor:pointer',
      'white-space:nowrap'
    ].join(';');
    button.addEventListener('click', action);
    panel.appendChild(button);
    return button;
  }

  addButton('🌊 Rogue', 'Rogue Wave EXP · key 4', () => triggerRogue());
  addButton('🌊 Tsunami', 'Tsunami EXP · key 5', () => triggerTsunami());
  addButton('⚡ Lightning', 'Lightning EXP · key 6', triggerLightning);
  const rainButton = addButton('🌧 Rain', 'Rain EXP · key 7', () => toggleRain());
  addButton('✕ Clear', 'Clear disaster events · key 0', clearEvents);

  function refreshUi() {
    if (!statusEl) return;
    const active = [];
    if (state.tsunami) active.push('TSUNAMI');
    if (state.rogue) active.push('ROGUE');
    if (state.rain) active.push('RAIN');
    if (state.lightning) active.push('LIGHTNING');
    statusEl.textContent = !state.enabled ? 'OFF' : (active.length ? active.join(' + ') : 'EXP READY');
    rainButton.style.background = state.rain ? 'rgba(255,255,255,.26)' : 'rgba(0,27,43,.62)';
  }

  addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'Digit4') { triggerRogue(); event.preventDefault(); }
    else if (event.code === 'Digit5') { triggerTsunami(); event.preventDefault(); }
    else if (event.code === 'Digit6') { triggerLightning(); event.preventDefault(); }
    else if (event.code === 'Digit7') { toggleRain(); event.preventDefault(); }
    else if (event.code === 'Digit0') { clearEvents(); event.preventDefault(); }
  });

  const previousUpdateWater = updateWater;
  let lastT = currentTime();
  updateWater = function v01052NaturalDisasterUpdate(t) {
    previousUpdateWater(t);
    const nowT = Number.isFinite(t) ? t : currentTime();
    lastT = nowT;
    syncShaderEvents(nowT);
    updateRain(nowT);
    updateLightning(nowT);
    refreshUi();
  };

  refreshUi();

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.V01052_NATURAL_DISASTERS = Object.assign({}, pureApi, {
    available: true,
    experimental: true,
    upstream: 'Token-Gremlin/natural-disasters',
    license: 'MIT',
    state,
    triggerTsunami,
    triggerRogue,
    triggerLightning,
    toggleRain,
    clearEvents,
    setEnabled,
    sampleCurrentEvents,
    previousGetWaveHeight,
    shaderPatchInstalled: state.shaderPatched,
    physicsAuthority: 'existing ocean + event height modifier',
    visualAuthority: 'existing reflective ocean shader + matching event height modifier',
    gameplaySamplerModified: true,
    baseOceanReplaced: false,
    ninePointRewritten: false,
    planarRewritten: false,
    mobileHeavyVolumetricsImported: false
  });
})(typeof window !== 'undefined' ? window : globalThis);
