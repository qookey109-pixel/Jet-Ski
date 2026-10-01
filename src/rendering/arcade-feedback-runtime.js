// V0.11.16 Tropical Arcade T4: visual-only race feedback observer.
(function (root) {
  'use strict';

  const Core = root.JETSKI_ARCADE_FEEDBACK_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  const THREE = root.THREE;
  if (!Core || !Manager || !THREE || typeof scene === 'undefined') return;
  if (typeof getWaveHeight !== 'function') return;

  const mobileLike = Math.min(root.innerWidth || 9999, root.innerHeight || 9999) < 620
    || /iPhone|iPad|iPod|Android/i.test((root.navigator && root.navigator.userAgent) || '');
  const poolSize = mobileLike ? Core.DEFAULTS.worldBurstPoolMobile : Core.DEFAULTS.worldBurstPoolDesktop;

  const style = document.createElement('style');
  style.id = 'v01116-arcade-feedback-style';
  style.textContent = `
    .v01116-feedback-flash{position:fixed;inset:0;z-index:24;pointer-events:none;opacity:0;
      background:radial-gradient(circle at 50% 54%,rgba(255,255,255,.04) 0%,rgba(255,221,92,.10) 38%,rgba(255,95,55,.12) 100%)}
    .v01116-feedback-banner{position:fixed;left:50%;top:22%;z-index:34;pointer-events:none;
      transform:translate(-50%,-12px) scale(.94);opacity:0;white-space:nowrap;
      font:1000 clamp(22px,5.6vw,54px)/.92 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      letter-spacing:.04em;color:#fff7cd;text-shadow:0 4px 0 rgba(255,68,48,.55),0 12px 34px rgba(0,0,0,.48);
      transition:opacity .12s ease,transform .18s cubic-bezier(.2,.9,.2,1)}
    .v01116-feedback-banner.show{opacity:1;transform:translate(-50%,0) scale(1)}
    .v01116-feedback-banner[data-kind="checkpoint"]{font-size:clamp(15px,3.6vw,32px);color:#fff3ad}
    .v01116-feedback-banner[data-kind="final-lap"]{color:#ffd334;text-shadow:0 4px 0 rgba(255,59,48,.7),0 12px 38px rgba(0,0,0,.5)}
    .v01116-feedback-banner[data-kind="finish"]{color:#fff8dc;text-shadow:0 5px 0 rgba(255,80,42,.72),0 16px 48px rgba(0,0,0,.55)}
    @media (orientation:landscape) and (max-height:420px){
      .v01116-feedback-banner{top:17%;font-size:clamp(18px,4.8vw,36px)}
      .v01116-feedback-banner[data-kind="checkpoint"]{font-size:clamp(13px,3.1vw,24px)}
    }
  `;
  document.head.appendChild(style);

  const flash = document.createElement('div');
  flash.className = 'v01116-feedback-flash';
  flash.setAttribute('aria-hidden', 'true');
  document.body.appendChild(flash);

  const banner = document.createElement('div');
  banner.className = 'v01116-feedback-banner';
  banner.setAttribute('aria-hidden', 'true');
  document.body.appendChild(banner);

  const burstGroup = new THREE.Group();
  burstGroup.name = 'V01116ArcadeFeedbackBursts';
  scene.add(burstGroup);

  const burstGeometry = new THREE.TorusGeometry(6.25, 0.19, 10, 44);
  const bursts = [];
  for (let i = 0; i < poolSize; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffe57a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(burstGeometry, material);
    mesh.visible = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData.feedback = { active: false, startedAt: 0, duration: Core.DEFAULTS.worldBurstMs };
    burstGroup.add(mesh);
    bursts.push(mesh);
  }

  let cursor = 0;
  let previousRace = Core.snapshot(Manager.state);
  let previousBoostActivations = root.JETSKI_BOOST && root.JETSKI_BOOST.state
    ? Number(root.JETSKI_BOOST.state.activationCount) || 0
    : 0;
  let bannerToken = 0;

  const state = {
    checkpointCount: 0,
    lapCount: 0,
    finalLapCount: 0,
    finishCount: 0,
    goCount: 0,
    boostPulseCount: 0,
    previewCount: 0,
    activeWorldBursts: 0,
    lastType: null,
    lastLabel: '',
    visualOnly: true,
    physicsWrites: false,
    gameplayWrites: false,
    raceRuleWrites: false,
    boostWrites: false,
    cameraWrites: false,
    collisionAdded: false
  };

  function flashScreen(type) {
    const strength = Core.intensityFor(type);
    const duration = type === 'boost' ? Core.DEFAULTS.boostFlashMs : 320 + strength * 180;
    if (type === 'boost') {
      flash.style.background = 'radial-gradient(circle at 50% 62%,transparent 34%,rgba(96,231,255,.08) 68%,rgba(44,168,255,.16) 100%)';
    } else if (type === 'finish' || type === 'final-lap') {
      flash.style.background = 'radial-gradient(circle at 50% 54%,rgba(255,255,255,.08) 0%,rgba(255,220,71,.14) 42%,rgba(255,75,48,.17) 100%)';
    } else {
      flash.style.background = 'radial-gradient(circle at 50% 54%,rgba(255,255,255,.04) 0%,rgba(255,221,92,.10) 38%,rgba(255,95,55,.12) 100%)';
    }
    flash.style.transition = 'none';
    flash.style.opacity = String(0.18 + strength * 0.22);
    root.requestAnimationFrame(() => {
      flash.style.transition = `opacity ${Math.round(duration)}ms ease-out`;
      flash.style.opacity = '0';
    });
  }

  function showBanner(event) {
    const label = Core.labelFor(event);
    if (!label) return;
    const type = event.type;
    let hold = Core.DEFAULTS.checkpointBannerMs;
    if (type === 'lap') hold = Core.DEFAULTS.lapBannerMs;
    if (type === 'final-lap') hold = Core.DEFAULTS.finalLapBannerMs;
    if (type === 'finish') hold = Core.DEFAULTS.finishBannerMs;
    if (type === 'go') hold = 500;

    const token = ++bannerToken;
    banner.textContent = label;
    banner.dataset.kind = type;
    banner.classList.add('show');
    root.setTimeout(() => {
      if (token !== bannerToken) return;
      banner.classList.remove('show');
    }, hold);
  }

  function checkpointYaw(index) {
    const course = Manager.course;
    const cps = course && Array.isArray(course.checkpoints) ? course.checkpoints : [];
    if (!cps.length) return 0;
    const i = ((Number(index) || 0) % cps.length + cps.length) % cps.length;
    const cp = cps[i] || {};
    const next = cps[(i + 1) % cps.length] || cp;
    return Math.atan2((Number(next.x) || 0) - (Number(cp.x) || 0), (Number(next.z) || 0) - (Number(cp.z) || 0));
  }

  function spawnWorldBurst(index, type) {
    const course = Manager.course;
    const cps = course && Array.isArray(course.checkpoints) ? course.checkpoints : [];
    if (!cps.length) return false;
    const i = ((Number(index) || 0) % cps.length + cps.length) % cps.length;
    const cp = cps[i] || {};
    const x = Number(cp.x) || 0;
    const z = Number(cp.z) || 0;
    const t = typeof clock !== 'undefined' ? clock.elapsedTime : 0;
    const y = getWaveHeight(x, z, t) + 6.25;
    const mesh = bursts[cursor++ % bursts.length];
    const feedback = mesh.userData.feedback;
    feedback.active = true;
    feedback.startedAt = performance.now();
    feedback.duration = type === 'finish' ? 760 : Core.DEFAULTS.worldBurstMs;
    mesh.position.set(x, y, z);
    mesh.rotation.set(0, checkpointYaw(i), 0);
    mesh.scale.setScalar(type === 'finish' ? 0.72 : 0.82);
    mesh.material.color.setHex(type === 'finish' || type === 'final-lap' ? 0xffd334 : 0xfff2a8);
    mesh.material.opacity = type === 'finish' ? 0.96 : 0.8;
    mesh.visible = true;
    return true;
  }

  function emit(event, isPreview) {
    if (!event || !event.type) return;
    const type = event.type;
    state.lastType = type;
    state.lastLabel = Core.labelFor(event);
    if (isPreview) state.previewCount += 1;

    if (type === 'checkpoint') state.checkpointCount += 1;
    else if (type === 'lap') state.lapCount += 1;
    else if (type === 'final-lap') state.finalLapCount += 1;
    else if (type === 'finish') state.finishCount += 1;
    else if (type === 'go') state.goCount += 1;
    else if (type === 'boost') state.boostPulseCount += 1;

    flashScreen(type);
    if (type !== 'boost') showBanner(event);
    if (type === 'checkpoint' || type === 'lap' || type === 'final-lap' || type === 'finish') {
      spawnWorldBurst(type === 'checkpoint' ? event.checkpointIndex : 0, type);
    }
  }

  function updateWorldBursts(now) {
    let active = 0;
    for (const mesh of bursts) {
      const f = mesh.userData.feedback;
      if (!f.active) continue;
      const p = Math.max(0, Math.min(1, (now - f.startedAt) / Math.max(1, f.duration)));
      if (p >= 1) {
        f.active = false;
        mesh.visible = false;
        mesh.material.opacity = 0;
        continue;
      }
      active += 1;
      const s = 0.82 + p * 0.72;
      mesh.scale.setScalar(s);
      mesh.material.opacity = (1 - p) * (1 - p) * 0.82;
    }
    state.activeWorldBursts = active;
  }

  function preview(type) {
    const race = Core.snapshot(Manager.state);
    const event = {
      type: type || 'checkpoint',
      checkpointIndex: Math.max(0, race.nextCheckpointIndex),
      lap: race.lap,
      totalLaps: race.totalLaps
    };
    emit(event, true);
  }

  function resetObservers() {
    previousRace = Core.snapshot(Manager.state);
    previousBoostActivations = root.JETSKI_BOOST && root.JETSKI_BOOST.state
      ? Number(root.JETSKI_BOOST.state.activationCount) || 0
      : 0;
  }

  root.addEventListener('jetski:race-ready', resetObservers);
  root.addEventListener('jetski:race-selected', () => {
    resetObservers();
    banner.classList.remove('show');
  });

  function tick(now) {
    const currentRace = Core.snapshot(Manager.state);
    const feedback = Core.detectRaceFeedback(previousRace, currentRace);
    if (feedback) emit(feedback, false);
    previousRace = currentRace;

    const boostState = root.JETSKI_BOOST && root.JETSKI_BOOST.state;
    const currentBoostActivations = boostState ? Number(boostState.activationCount) || 0 : previousBoostActivations;
    if (Core.boostActivated(previousBoostActivations, currentBoostActivations)) {
      emit({ type: 'boost' }, false);
    }
    previousBoostActivations = currentBoostActivations;

    updateWorldBursts(now);
    root.requestAnimationFrame(tick);
  }
  root.requestAnimationFrame(tick);

  root.JETSKI_ARCADE_FEEDBACK = {
    version: Core.VERSION,
    state,
    preview,
    burstGroup,
    visualOnly: true,
    physicsUntouched: true,
    gameplayUntouched: true,
    raceRulesUntouched: true,
    boostAuthorityUntouched: true,
    cameraUntouched: true,
    collisionAdded: false
  };
})(typeof window !== 'undefined' ? window : globalThis);
