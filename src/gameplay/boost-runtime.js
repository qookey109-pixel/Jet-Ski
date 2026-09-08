// V0.11.2 Boost/Nitro runtime: bounded surge assist + lightweight VFX/audio/camera feedback.
(function (root) {
  'use strict';

  const Core = root.JETSKI_BOOST_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  const THREE = root.THREE;
  if (!Core || !Manager || !THREE) return;
  if (typeof updateJetSki !== 'function' || typeof ski === 'undefined' || typeof camera === 'undefined') return;

  const VERSION = 'V0.11.2';
  const config = Object.freeze(Object.assign({}, Core.DEFAULTS));
  const state = Core.createBoostState(config);
  let keyboardRequested = false;
  let pointerRequested = false;
  let previousPhase = Manager.state.phase;
  let fovKick = 0;
  let audio = null;

  const lowParticleBudget = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
  const particleCount = lowParticleBudget ? 32 : 56;
  const jetPositions = new Float32Array(particleCount * 3);
  const jetSeeds = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const seed = i + 1;
    jetSeeds[i * 3] = (Math.sin(seed * 12.9898) * 43758.5453) % 1;
    jetSeeds[i * 3 + 1] = (Math.sin(seed * 78.233) * 12345.6789) % 1;
    jetSeeds[i * 3 + 2] = (Math.sin(seed * 39.425) * 24680.1357) % 1;
  }
  for (let i = 0; i < jetSeeds.length; i++) jetSeeds[i] = Math.abs(jetSeeds[i]);

  const jetGeometry = new THREE.BufferGeometry();
  jetGeometry.setAttribute('position', new THREE.BufferAttribute(jetPositions, 3));
  const jetMaterial = new THREE.PointsMaterial({
    color: 0x8ff7ff,
    size: lowParticleBudget ? 0.22 : 0.28,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    sizeAttenuation: true
  });
  const jetPoints = new THREE.Points(jetGeometry, jetMaterial);
  jetPoints.frustumCulled = false;
  jetPoints.visible = false;
  scene.add(jetPoints);

  const overlay = document.createElement('div');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:23', 'pointer-events:none', 'opacity:0',
    'transition:opacity .12s linear',
    'box-shadow:inset 0 0 110px rgba(64,222,255,.22)',
    'background:radial-gradient(circle at 50% 62%,transparent 42%,rgba(76,218,255,.08) 78%,rgba(30,150,255,.16) 100%)'
  ].join(';');
  document.body.appendChild(overlay);

  const hud = document.createElement('div');
  hud.setAttribute('aria-label', 'nitro energy');
  hud.style.cssText = [
    'position:fixed', 'left:50%', 'bottom:18px', 'z-index:28', 'transform:translateX(-50%)',
    'width:min(280px,46vw)', 'padding:7px 9px', 'border-radius:999px',
    'background:rgba(2,18,31,.58)', 'border:1px solid rgba(255,255,255,.15)',
    'backdrop-filter:blur(8px)', '-webkit-backdrop-filter:blur(8px)', 'display:none',
    'font:800 10px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'letter-spacing:.15em', 'color:#dffaff', 'user-select:none', 'pointer-events:none'
  ].join(';');
  hud.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;margin:0 3px 5px"><span>NITRO</span><span data-boost-value>100%</span></div><div style="height:6px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden"><div data-boost-fill style="height:100%;width:100%;border-radius:inherit;background:linear-gradient(90deg,#31d9ff,#7df9ff,#d8ffff);box-shadow:0 0 14px rgba(84,227,255,.55);transform-origin:left center"></div></div>';
  document.body.appendChild(hud);
  const energyValue = hud.querySelector('[data-boost-value]');
  const energyFill = hud.querySelector('[data-boost-fill]');

  const boostButton = document.createElement('button');
  boostButton.type = 'button';
  boostButton.textContent = 'BOOST';
  boostButton.setAttribute('aria-label', 'Boost / Nitro');
  boostButton.style.cssText = [
    'position:fixed', 'right:18px', 'bottom:142px', 'z-index:29', 'min-width:76px', 'min-height:46px',
    'border-radius:999px', 'border:1px solid rgba(126,240,255,.5)',
    'background:linear-gradient(145deg,rgba(16,166,218,.86),rgba(28,97,195,.82))',
    'color:white', 'font-weight:950', 'letter-spacing:.08em', 'box-shadow:0 10px 30px rgba(0,118,196,.28)',
    'touch-action:none', 'user-select:none', '-webkit-user-select:none'
  ].join(';');
  document.body.appendChild(boostButton);

  function setPointerRequested(value, event) {
    if (event) event.preventDefault();
    pointerRequested = Boolean(value);
    if (pointerRequested) ensureAudio();
  }
  boostButton.addEventListener('pointerdown', event => setPointerRequested(true, event));
  boostButton.addEventListener('pointerup', event => setPointerRequested(false, event));
  boostButton.addEventListener('pointercancel', event => setPointerRequested(false, event));
  boostButton.addEventListener('pointerleave', event => setPointerRequested(false, event));

  addEventListener('keydown', event => {
    if (event.code !== 'Space') return;
    keyboardRequested = true;
    ensureAudio();
    event.preventDefault();
  });
  addEventListener('keyup', event => {
    if (event.code !== 'Space') return;
    keyboardRequested = false;
    event.preventDefault();
  });
  addEventListener('blur', () => {
    keyboardRequested = false;
    pointerRequested = false;
  });
  addEventListener('pointerdown', ensureAudio, { once: true, passive: true });

  function gamepadRequested() {
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : null;
      if (!pads) return false;
      for (const pad of pads) {
        if (pad && pad.connected && pad.buttons && pad.buttons[0] && pad.buttons[0].pressed) return true;
      }
    } catch (_) {}
    return false;
  }

  function ensureAudio() {
    if (audio) return audio;
    const AudioCtx = root.AudioContext || root.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      const context = new AudioCtx();
      const master = context.createGain();
      const filter = context.createBiquadFilter();
      const engine = context.createOscillator();
      const jet = context.createOscillator();
      master.gain.value = 0.0001;
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      engine.type = 'sawtooth';
      engine.frequency.value = 72;
      jet.type = 'triangle';
      jet.frequency.value = 118;
      engine.connect(filter);
      jet.connect(filter);
      filter.connect(master);
      master.connect(context.destination);
      engine.start();
      jet.start();
      audio = { context, master, filter, engine, jet };
      if (context.state === 'suspended') context.resume();
      return audio;
    } catch (_) {
      return null;
    }
  }

  function boostWhoosh() {
    const a = ensureAudio();
    if (!a) return;
    try {
      const now = a.context.currentTime;
      const osc = a.context.createOscillator();
      const gain = a.context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.16);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.075, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.23);
      osc.connect(gain);
      gain.connect(a.master);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (_) {}
  }

  function updateAudio(speedRatio, active, enabled) {
    const a = audio;
    if (!a) return;
    try {
      if (a.context.state === 'suspended') return;
      const now = a.context.currentTime;
      const targetGain = enabled ? 0.018 + speedRatio * 0.028 + (active ? 0.018 : 0) : 0.0001;
      a.master.gain.setTargetAtTime(Math.max(0.0001, targetGain), now, 0.08);
      a.engine.frequency.setTargetAtTime(68 + speedRatio * 118 + (active ? 34 : 0), now, 0.05);
      a.jet.frequency.setTargetAtTime(116 + speedRatio * 92 + (active ? 80 : 0), now, 0.05);
      a.filter.frequency.setTargetAtTime(720 + speedRatio * 980 + (active ? 620 : 0), now, 0.08);
    } catch (_) {}
  }

  function updateJetVfx(t, active, speedRatio) {
    jetPoints.visible = active;
    overlay.style.opacity = active ? String(0.34 + speedRatio * 0.22) : '0';
    if (!active) return;
    const fX = Math.sin(yaw), fZ = Math.cos(yaw);
    const rX = fZ, rZ = -fX;
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const phase = (jetSeeds[i3] + t * (1.9 + jetSeeds[i3 + 2] * 1.7)) % 1;
      const back = 2.0 + phase * (6.0 + speedRatio * 5.5);
      const lateral = (jetSeeds[i3 + 1] - 0.5) * (0.6 + phase * 2.0);
      jetPositions[i3] = ski.position.x - fX * back + rX * lateral;
      jetPositions[i3 + 1] = ski.position.y + 0.36 - phase * 0.55 + Math.sin((i + t * 15) * 0.9) * 0.08;
      jetPositions[i3 + 2] = ski.position.z - fZ * back + rZ * lateral;
    }
    jetGeometry.attributes.position.needsUpdate = true;
  }

  function resetBoost() {
    state.energy = config.capacity;
    state.requested = false;
    state.active = false;
    state.wasActive = false;
    state.rechargeDelay = 0;
    state.accelerationMps2 = 0;
    keyboardRequested = false;
    pointerRequested = false;
  }

  function phaseAllowsDriving(phase) {
    return phase === 'racing' || phase === 'free-ride';
  }

  function updateHud(phase) {
    const visible = phase === 'countdown' || phaseAllowsDriving(phase) || phase === 'paused';
    hud.style.display = visible ? '' : 'none';
    boostButton.style.display = phaseAllowsDriving(phase) ? '' : 'none';
    const ratio = Core.energyRatio(state, config);
    energyValue.textContent = `${Math.round(ratio * 100)}%`;
    energyFill.style.transform = `scaleX(${ratio.toFixed(4)})`;
    boostButton.style.opacity = state.energy >= config.minActivateEnergy ? '1' : '.45';
    boostButton.style.transform = state.active ? 'scale(.96)' : 'scale(1)';
  }

  const baseFov = Number(camera.fov) || 66;
  function updateCameraFeel(dt, speedRatio, active) {
    if (active && !state.wasActive) fovKick = Math.max(fovKick, 2.0);
    fovKick *= Math.exp(-Math.max(0, dt) * 4.8);
    const target = baseFov + speedRatio * 1.6 + (active ? 3.6 : 0) + fovKick;
    const next = THREE.MathUtils.lerp(camera.fov, target, 1 - Math.exp(-Math.max(0, dt) * 5.6));
    if (Math.abs(next - camera.fov) > 0.01) {
      camera.fov = next;
      camera.updateProjectionMatrix();
    }
  }

  function applySurgeAssist(dt) {
    if (!state.active || !Number.isFinite(speed)) return;
    const safeDt = Math.max(0, Math.min(Number(dt) || 0, 1 / 20));
    const room = Math.max(0, physics.maxSpeed - speed);
    if (room <= 0) return;
    const speedRatio = THREE.MathUtils.clamp(speed / Math.max(0.1, physics.maxSpeed), 0, 1);
    const authority = 0.48 + (1 - speedRatio) * 0.52;
    const delta = Math.min(room, state.accelerationMps2 * authority * safeDt);
    if (delta <= 0) return;
    speed += delta;
    const planar = root.V0992_PLANAR_3DOF && root.V0992_PLANAR_3DOF.state;
    if (planar && planar.initialized && Number.isFinite(planar.u)) planar.u = speed;
    if (speedEl) speedEl.textContent = Math.round(speed * 3.6);
  }

  const previousUpdateJetSki = updateJetSki;
  updateJetSki = function v0112BoostGameFeelUpdate(dt, t) {
    previousUpdateJetSki(dt, t);

    const phase = Manager.state.phase;
    if (phase !== previousPhase) {
      if (phase === 'countdown') resetBoost();
      previousPhase = phase;
    }

    const hydro = root.JETSKI_PHYSICS && root.JETSKI_PHYSICS.hydroModel;
    const plusActive = Boolean(hydro && hydro.mode === 'nine-point-plus');
    const reverseActive = Boolean(root.V0941_REVERSE && root.V0941_REVERSE.controller && root.V0941_REVERSE.controller.active);
    const requested = keyboardRequested || pointerRequested || gamepadRequested();
    const speedRatio = THREE.MathUtils.clamp((Number(speed) || 0) / Math.max(0.1, physics.maxSpeed), 0, 1);
    const activationBefore = state.activationCount;

    Core.stepBoost(state, {
      requested,
      enabled: phaseAllowsDriving(phase) && plusActive,
      airborne: Boolean(airborne),
      reverse: reverseActive,
      forwardHeld: Boolean(input && input.gas),
      speedRatio
    }, dt, config);

    applySurgeAssist(dt);
    if (state.activationCount > activationBefore) boostWhoosh();
    updateJetVfx(t, state.active, speedRatio);
    updateCameraFeel(dt, speedRatio, state.active);
    updateAudio(speedRatio, state.active, phaseAllowsDriving(phase));
    updateHud(phase);
  };

  updateHud(Manager.state.phase);
  boostButton.style.display = 'none';

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_BOOST = {
    version: VERSION,
    config,
    state,
    resetBoost,
    surgeAssistBoundedToExistingMaxSpeed: true,
    planarStateSynchronized: true,
    playerHydrodynamicsRewritten: false,
    baseOceanReplaced: false,
    proceduralAudioOnly: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
