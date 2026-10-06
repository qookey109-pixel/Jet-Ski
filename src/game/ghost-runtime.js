// V0.11.9 Personal Best Ghost observer/replay runtime.
(function (root) {
  'use strict';

  const Core = root.JETSKI_GHOST_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  const THREE = root.THREE;
  if (!Core || !Manager || !THREE || typeof document === 'undefined' || typeof scene === 'undefined' || typeof ski === 'undefined') return;

  const VERSION = 'V0.11.9';
  const STORAGE = 'swimRing.ghosts.v0119';
  const ENABLED_KEY = 'swimRing.ghosts.enabled.v0119';
  const SAMPLE_INTERVAL_MS = Core.DEFAULT_SAMPLE_INTERVAL_MS;
  const VISUAL_INTERVAL_MS = 50;
  const DELTA_INTERVAL_MS = 200;

  let ghosts = {};
  let enabled = true;
  let activeGhost = null;
  let activeFrame = null;
  let activeEventId = null;
  let recording = null;
  let lastSampleAt = -Infinity;
  let lastVisualAt = 0;
  let lastDeltaAt = 0;
  let lastPhase = Manager.state.phase;

  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE) || '{}');
    if (raw && typeof raw === 'object') {
      for (const [eventId, value] of Object.entries(raw)) {
        const ghost = Core.sanitizeGhost(value, eventId);
        if (ghost) ghosts[eventId] = ghost;
      }
    }
  } catch (_) {}
  try { enabled = localStorage.getItem(ENABLED_KEY) !== '0'; } catch (_) {}

  function persist() {
    try { localStorage.setItem(STORAGE, JSON.stringify(ghosts)); } catch (_) {}
    try { localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0'); } catch (_) {}
  }

  const ghostGroup = new THREE.Group();
  ghostGroup.name = 'V0119PersonalBestGhost';

  // T14: the PB ghost now uses the same Jet Ski visual language as the player.
  const ghostCraft = root.JETSKI_CRAFT_VISUAL && typeof root.JETSKI_CRAFT_VISUAL.build === 'function'
    ? root.JETSKI_CRAFT_VISUAL.build(ghostGroup, {
        kind: 'ai',
        name: 'V01116GhostCraftT14',
        scale: 0.78,
        primary: 0x70e4ff,
        accent: 0xe4fdff,
        dark: 0x3a9fbd
      })
    : null;

  if (ghostCraft) {
    ghostCraft.traverse(node => {
      if (!node || !node.material) return;
      node.material.transparent = true;
      node.material.opacity = node.name === 'T11Windshield' ? 0.14 : 0.25;
      node.material.depthWrite = false;
      if (node.material.emissive && typeof node.material.emissive.setHex === 'function') {
        node.material.emissive.setHex(0x27bfe8);
        node.material.emissiveIntensity = 0.24;
      }
      node.material.needsUpdate = true;
    });
  } else {
    const fallback = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.38, 2.65),
      new THREE.MeshBasicMaterial({
        color: 0x7de8ff,
        transparent: true,
        opacity: 0.24,
        depthWrite: false
      })
    );
    fallback.name = 'V01116GhostCraftFallbackT14';
    fallback.position.y = 0.46;
    ghostGroup.add(fallback);
  }

  ghostGroup.visible = false;
  scene.add(ghostGroup);

  let deltaEl = document.querySelector('[data-jr-ghost-delta]');
  if (!deltaEl) {
    const hud = document.querySelector('.jr-hud');
    if (hud) {
      const item = document.createElement('div');
      item.className = 'jr-hud-item';
      item.innerHTML = '<span class="jr-hud-label">PB Δ</span><span class="jr-hud-value" data-jr-ghost-delta>—</span>';
      hud.appendChild(item);
      deltaEl = item.querySelector('[data-jr-ghost-delta]');
    }
  }

  const localPoint = { right: 0, forward: 0 };
  const interpolated = { timeMs: 0, right: 0, forward: 0, relativeYaw: 0, lap: 1, nextCheckpointIndex: 0 };
  const ghostWorld = { x: 0, z: 0, yaw: 0 };

  function selectedEventId() {
    const event = Manager.selectedEvent;
    return event && event.id ? event.id : null;
  }

  function knownPersonalBest(eventId) {
    const progression = root.JETSKI_PROGRESSION;
    const profile = progression && progression.profile;
    const value = profile && profile.bestTimes && profile.bestTimes[eventId];
    return Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
  }

  function setDeltaText(text, state) {
    if (!deltaEl) return;
    deltaEl.textContent = text;
    if (state === 'ahead') deltaEl.style.color = '#8fffe5';
    else if (state === 'behind') deltaEl.style.color = '#ffd18a';
    else deltaEl.style.color = '';
  }

  function formatDelta(ms) {
    const seconds = Math.abs(ms) / 1000;
    return `${ms < 0 ? '−' : '+'}${seconds.toFixed(2)}`;
  }

  function loadGhostFor(eventId) {
    activeEventId = eventId || selectedEventId();
    activeGhost = activeEventId ? Core.sanitizeGhost(ghosts[activeEventId], activeEventId) : null;
    ghostGroup.visible = false;
    if (!enabled) setDeltaText('OFF', 'neutral');
    else if (activeGhost) setDeltaText('0.00', 'neutral');
    else if (knownPersonalBest(activeEventId)) setDeltaText('SET NEW PB', 'neutral');
    else setDeltaText('NO GHOST', 'neutral');
  }

  function prepareCourse(course, eventId) {
    activeFrame = Core.courseFrame(course || Manager.course);
    loadGhostFor(eventId || selectedEventId());
    recording = null;
    lastSampleAt = -Infinity;
    lastVisualAt = 0;
    lastDeltaAt = 0;
  }

  function beginRecording() {
    const eventId = activeEventId || selectedEventId();
    if (!eventId || !activeFrame) return;
    recording = Core.createRecording(eventId, SAMPLE_INTERVAL_MS);
    lastSampleAt = -Infinity;
  }

  function captureCurrentSample(force) {
    if (!recording || !activeFrame || (!force && Manager.state.phase !== 'racing')) return;
    const elapsed = Number(Manager.state.elapsedMs) || 0;
    if (!force && elapsed - lastSampleAt < recording.sampleIntervalMs) return;
    const pose = { x: ski.position.x, z: ski.position.z, yaw: typeof yaw === 'number' ? yaw : ski.rotation.y };
    const sample = Core.captureSample(elapsed, pose, Manager.state, activeFrame);
    if (Core.appendSample(recording, sample)) lastSampleAt = elapsed;
  }

  function updateGhostVisual(now) {
    const phase = Manager.state.phase;
    if (!enabled || !activeGhost || !activeFrame || (phase !== 'countdown' && phase !== 'racing' && phase !== 'paused')) {
      ghostGroup.visible = false;
      return;
    }
    if (now - lastVisualAt < VISUAL_INTERVAL_MS) return;
    lastVisualAt = now;
    const elapsed = phase === 'countdown' ? 0 : (Number(Manager.state.elapsedMs) || 0);
    const sample = Core.interpolateSample(activeGhost.samples, elapsed, interpolated);
    if (!sample) {
      ghostGroup.visible = false;
      return;
    }
    Core.courseToWorld(sample, activeFrame, ghostWorld);
    const t = typeof clock !== 'undefined' ? clock.elapsedTime : 0;
    const waterY = typeof getWaveHeight === 'function' ? getWaveHeight(ghostWorld.x, ghostWorld.z, t) : 0;
    ghostGroup.position.set(ghostWorld.x, waterY + 0.28, ghostWorld.z);
    ghostGroup.rotation.y = ghostWorld.yaw;
    ghostGroup.visible = true;
  }

  function updateDelta(now) {
    if (!enabled) {
      setDeltaText('OFF', 'neutral');
      return;
    }
    if (!activeGhost || !activeFrame) return;
    if (Manager.state.phase !== 'racing') return;
    if (now - lastDeltaAt < DELTA_INTERVAL_MS) return;
    lastDeltaAt = now;
    Core.worldToCourse(ski.position, activeFrame, localPoint);
    const ghostTime = Core.nearestProgressTime(
      activeGhost.samples,
      localPoint,
      Manager.state.lap,
      Manager.state.nextCheckpointIndex
    );
    if (ghostTime == null) {
      setDeltaText('—', 'neutral');
      return;
    }
    const delta = (Number(Manager.state.elapsedMs) || 0) - ghostTime;
    setDeltaText(formatDelta(delta), delta <= 0 ? 'ahead' : 'behind');
  }

  function saveIfPersonalBest(detail) {
    if (!recording || !detail || !detail.finished) return false;
    captureCurrentSample(true);
    const completed = Core.finishRecording(recording, detail.elapsedMs);
    recording = null;
    if (!completed) return false;
    const eventId = detail.eventId || completed.eventId;
    const existing = ghosts[eventId] || null;
    const knownBest = knownPersonalBest(eventId);
    if (!Core.shouldReplaceGhost(existing, detail.elapsedMs, knownBest)) return false;
    ghosts[eventId] = completed;
    persist();
    activeGhost = completed;
    setDeltaText('NEW GHOST', 'ahead');
    const ui = document.querySelector('.jr-toast');
    if (ui) {
      ui.textContent = 'PERSONAL BEST GHOST SAVED';
      ui.classList.add('show');
      setTimeout(() => ui.classList.remove('show'), 1400);
    }
    return true;
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    persist();
    toggleButton.textContent = `Ghost: ${enabled ? 'ON' : 'OFF'}`;
    if (!enabled) ghostGroup.visible = false;
    loadGhostFor(activeEventId || selectedEventId());
  }

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'jr-btn';
  toggleButton.dataset.ghostToggle = '1';
  toggleButton.textContent = `Ghost: ${enabled ? 'ON' : 'OFF'}`;
  toggleButton.addEventListener('click', () => setEnabled(!enabled));
  const menuActions = document.querySelector('[data-jr-screen="menu"] .jr-actions');
  if (menuActions) menuActions.appendChild(toggleButton);

  root.addEventListener('jetski:race-ready', event => {
    const detail = event && event.detail || {};
    prepareCourse(detail.course || Manager.course, detail.eventId || selectedEventId());
  });

  root.addEventListener('jetski:race-selected', event => {
    const detail = event && event.detail || {};
    activeEventId = detail.eventId || selectedEventId();
    activeGhost = activeEventId ? Core.sanitizeGhost(ghosts[activeEventId], activeEventId) : null;
  });

  root.addEventListener('jetski:race-finished', event => {
    saveIfPersonalBest(event && event.detail || null);
  });

  function tick(now) {
    const phase = Manager.state.phase;
    if (phase !== lastPhase) {
      if (phase === 'racing' && lastPhase === 'countdown') beginRecording();
      if (phase === 'menu' || phase === 'free-ride' || phase === 'finished') ghostGroup.visible = false;
      lastPhase = phase;
    }
    if (phase === 'racing') captureCurrentSample(false);
    updateGhostVisual(now);
    updateDelta(now);
    root.requestAnimationFrame(tick);
  }

  if (Manager.course) prepareCourse(Manager.course, selectedEventId());
  root.requestAnimationFrame(tick);

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Jet Ski Racing ${VERSION}`;

  root.JETSKI_GHOST = {
    version: VERSION,
    get enabled() { return enabled; },
    get ghosts() { return ghosts; },
    get activeGhost() { return activeGhost; },
    setEnabled,
    loadGhostFor,
    storageKey: STORAGE,
    sampleIntervalMs: SAMPLE_INTERVAL_MS,
    visualOnly: true,
    collisionAdded: false,
    physicsUntouched: true,
    craftVisualVersion: ghostCraft ? 'V0.11.16-T11' : 'fallback',
    t14JetSkiGhost: true,
    legacyRingVisual: false
  };
})(typeof window !== 'undefined' ? window : globalThis);
