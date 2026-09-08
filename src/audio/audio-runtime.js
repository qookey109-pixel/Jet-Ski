// V0.11.7 procedural ambience/music runtime. Complements the existing V0.11.2 engine/Boost audio.
(function (root) {
  'use strict';

  const Core = root.JETSKI_AUDIO_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  if (!Core || !Manager || typeof document === 'undefined') return;

  const VERSION = 'V0.11.7';
  const STORAGE = 'swimRing.audio.v0117';
  let settings = Core.normalizeSettings(Core.DEFAULT_SETTINGS);
  let audio = null;
  let chordStep = -1;
  let lastPhase = '';
  let lastEventId = '';

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null');
    if (saved) settings = Core.normalizeSettings(saved);
  } catch (_) {}

  function persist() {
    try { localStorage.setItem(STORAGE, JSON.stringify(settings)); } catch (_) {}
  }

  function makeNoiseBuffer(context, seconds, seedOffset) {
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = (0x1234567 + (seedOffset || 0)) >>> 0;
    for (let i = 0; i < length; i++) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      const white = (seed / 4294967295) * 2 - 1;
      data[i] = white * 0.66;
    }
    return buffer;
  }

  function ensureAudio() {
    if (audio) {
      if (audio.context.state === 'suspended') audio.context.resume().catch(() => {});
      return audio;
    }
    const AudioCtx = root.AudioContext || root.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      const context = new AudioCtx();
      const master = context.createGain();
      const ambienceBus = context.createGain();
      const musicBus = context.createGain();
      const stingerBus = context.createGain();
      master.gain.value = 0.0001;
      ambienceBus.gain.value = 0.0001;
      musicBus.gain.value = 0.0001;
      stingerBus.gain.value = 0.72;
      ambienceBus.connect(master);
      musicBus.connect(master);
      stingerBus.connect(master);
      master.connect(context.destination);

      const oceanSource = context.createBufferSource();
      oceanSource.buffer = makeNoiseBuffer(context, 2.2, 11);
      oceanSource.loop = true;
      const oceanFilter = context.createBiquadFilter();
      oceanFilter.type = 'lowpass';
      oceanFilter.frequency.value = 540;
      const oceanGain = context.createGain();
      oceanGain.gain.value = 0.0001;
      oceanSource.connect(oceanFilter);
      oceanFilter.connect(oceanGain);
      oceanGain.connect(ambienceBus);
      oceanSource.start();

      const windSource = context.createBufferSource();
      windSource.buffer = makeNoiseBuffer(context, 1.7, 79);
      windSource.loop = true;
      const windFilter = context.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.Q.value = 0.58;
      windFilter.frequency.value = 1160;
      const windGain = context.createGain();
      windGain.gain.value = 0.0001;
      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ambienceBus);
      windSource.start();

      const pad = [];
      for (let i = 0; i < 3; i++) {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = Core.CHORDS[0][i];
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(musicBus);
        osc.start();
        pad.push({ osc, gain });
      }

      const pulse = context.createOscillator();
      const pulseGain = context.createGain();
      pulse.type = 'sine';
      pulse.frequency.value = 73.42;
      pulseGain.gain.value = 0.0001;
      pulse.connect(pulseGain);
      pulseGain.connect(musicBus);
      pulse.start();

      audio = {
        context, master, ambienceBus, musicBus, stingerBus,
        oceanSource, oceanFilter, oceanGain,
        windSource, windFilter, windGain,
        pad, pulse, pulseGain,
        startedAt: context.currentTime
      };
      if (context.state === 'suspended') context.resume().catch(() => {});
      return audio;
    } catch (_) {
      return null;
    }
  }

  function setTarget(param, value, timeConstant) {
    if (!param || !audio) return;
    const safe = Math.max(0.0001, Number(value) || 0.0001);
    try { param.setTargetAtTime(safe, audio.context.currentTime, timeConstant || 0.16); } catch (_) {}
  }

  function currentSnapshot() {
    const phase = Manager.state && Manager.state.phase || 'menu';
    const event = Manager.selectedEvent || {};
    const worldApi = root.V097_WORLD_MODES;
    const worldMode = worldApi && worldApi.mode || event.worldMode || 'open-sea';
    const seaState = event.seaState || 'normal';
    const maxSpeed = typeof physics !== 'undefined' && physics ? Math.max(0.1, Number(physics.maxSpeed) || 36) : 36;
    const currentSpeed = typeof speed !== 'undefined' ? Math.max(0, Number(speed) || 0) : 0;
    return {
      phase,
      eventId: event.id || '',
      finale: Boolean(event.finale),
      worldMode,
      seaState,
      speedRatio: Core.clamp(currentSpeed / maxSpeed, 0, 1)
    };
  }

  function applyMix() {
    const a = audio;
    if (!a) return;
    const snapshot = currentSnapshot();
    const mix = Core.phaseMix(snapshot.phase, snapshot);
    const gains = Core.effectiveGains(settings, mix);
    const tone = Core.worldTone(snapshot.worldMode);

    setTarget(a.master.gain, gains.master, 0.12);
    setTarget(a.ambienceBus.gain, gains.ambience * 0.26, 0.28);
    setTarget(a.musicBus.gain, gains.music * 0.17, 0.35);
    setTarget(a.oceanGain.gain, 0.025 + gains.ocean * 0.14, 0.32);
    setTarget(a.windGain.gain, 0.012 + gains.wind * 0.105, 0.30);
    setTarget(a.pulseGain.gain, gains.pulse * 0.11, 0.20);

    try {
      a.oceanFilter.frequency.setTargetAtTime(tone.oceanHz + (snapshot.seaState === 'rough' ? 120 : 0), a.context.currentTime, 0.35);
      a.windFilter.frequency.setTargetAtTime(tone.windHz + snapshot.speedRatio * 540, a.context.currentTime, 0.28);
      a.pulse.frequency.setTargetAtTime(snapshot.finale ? 82.41 : 73.42, a.context.currentTime, 0.25);
    } catch (_) {}

    const elapsed = Math.max(0, a.context.currentTime - a.startedAt);
    const nextStep = Math.floor(elapsed / (snapshot.finale ? 3.2 : 4.6));
    if (nextStep !== chordStep || snapshot.eventId !== lastEventId) {
      chordStep = nextStep;
      lastEventId = snapshot.eventId;
      const chord = Core.chordAt(chordStep, snapshot.finale);
      for (let i = 0; i < a.pad.length; i++) {
        try {
          a.pad[i].osc.frequency.setTargetAtTime(chord[i], a.context.currentTime, 0.32);
          a.pad[i].gain.gain.setTargetAtTime(0.18 / (i + 1), a.context.currentTime, 0.28);
        } catch (_) {}
      }
    }
    lastPhase = snapshot.phase;
    updateStatus(snapshot);
  }

  function playStinger(kind) {
    const a = ensureAudio();
    if (!a || a.context.state === 'suspended') return;
    const now = a.context.currentTime;
    const notes = kind === 'championship'
      ? [293.66, 392.00, 493.88, 587.33]
      : kind === 'finish'
        ? [261.63, 329.63, 392.00]
        : [220.00, 277.18];
    notes.forEach((frequency, index) => {
      try {
        const osc = a.context.createOscillator();
        const gain = a.context.createGain();
        osc.type = index % 2 ? 'triangle' : 'sine';
        const start = now + index * 0.11;
        osc.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(kind === 'championship' ? 0.14 : 0.10, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
        osc.connect(gain);
        gain.connect(a.stingerBus);
        osc.start(start);
        osc.stop(start + 0.46);
      } catch (_) {}
    });
  }

  const panel = document.createElement('div');
  panel.setAttribute('aria-label', 'audio settings');
  panel.style.cssText = 'position:fixed;inset:0;z-index:76;display:none;align-items:center;justify-content:center;background:rgba(1,8,16,.74);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff';
  panel.innerHTML = `
    <div style="width:min(520px,88vw);padding:26px;border:1px solid rgba(255,255,255,.18);border-radius:22px;background:linear-gradient(145deg,rgba(5,28,45,.96),rgba(3,17,31,.94));box-shadow:0 30px 90px rgba(0,0,0,.42)">
      <div style="font-size:11px;font-weight:900;letter-spacing:.24em;color:#8fe9ff;margin-bottom:8px">AUDIO</div>
      <div style="font-size:30px;font-weight:950;margin-bottom:16px">Ocean Soundscape</div>
      <div data-audio-sliders></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
        <button data-audio-mute class="jr-btn"></button>
        <button data-audio-close class="jr-btn primary">Done</button>
      </div>
      <div data-audio-status style="margin-top:16px;font-size:11px;line-height:1.6;opacity:.65"></div>
    </div>`;
  document.body.appendChild(panel);
  const sliders = panel.querySelector('[data-audio-sliders]');
  const muteButton = panel.querySelector('[data-audio-mute]');
  const statusEl = panel.querySelector('[data-audio-status]');

  const controls = {};
  for (const entry of [
    ['master', 'Master'], ['music', 'Music'], ['ambience', 'Ocean / Wind']
  ]) {
    const key = entry[0], label = entry[1];
    const row = document.createElement('label');
    row.style.cssText = 'display:block;margin:13px 0;font-size:12px;font-weight:850';
    row.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>${label}</span><span data-value></span></div><input type="range" min="0" max="1" step="0.05" style="width:100%">`;
    const input = row.querySelector('input');
    const value = row.querySelector('[data-value]');
    input.addEventListener('input', () => {
      settings[key] = Core.clamp(Number(input.value), 0, 1);
      persist();
      refreshPanel();
      ensureAudio();
      applyMix();
    });
    controls[key] = { input, value };
    sliders.appendChild(row);
  }

  function refreshPanel() {
    for (const key of ['master', 'music', 'ambience']) {
      controls[key].input.value = String(settings[key]);
      controls[key].value.textContent = `${Math.round(settings[key] * 100)}%`;
    }
    muteButton.textContent = settings.muted ? '🔇 Muted' : '🔊 Sound ON';
  }

  function openPanel() {
    panel.style.display = 'flex';
    refreshPanel();
    ensureAudio();
  }

  panel.querySelector('[data-audio-close]').addEventListener('click', () => { panel.style.display = 'none'; });
  panel.addEventListener('click', event => { if (event.target === panel) panel.style.display = 'none'; });
  muteButton.addEventListener('click', () => {
    settings.muted = !settings.muted;
    persist();
    refreshPanel();
    ensureAudio();
    applyMix();
  });

  function installButtons() {
    const targets = [
      document.querySelector('[data-jr-screen="menu"] .jr-actions'),
      document.querySelector('[data-jr-screen="pause"] .jr-actions')
    ];
    for (const target of targets) {
      if (!target || target.querySelector('[data-audio-open]')) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'jr-btn';
      button.dataset.audioOpen = '1';
      button.textContent = 'Audio';
      button.addEventListener('click', openPanel);
      target.appendChild(button);
    }
  }

  const hud = document.querySelector('.hud');
  let statusNode = null;
  if (hud) {
    const row = document.createElement('div');
    row.innerHTML = '音景 <span data-audio-hud>待互動</span>';
    hud.appendChild(row);
    statusNode = row.querySelector('[data-audio-hud]');
  }

  function updateStatus(snapshot) {
    if (statusNode) {
      const label = settings.muted ? 'MUTED' : !audio ? '待互動' : snapshot.finale ? 'PACIFIC CROWN' : snapshot.phase === 'racing' ? 'RACE' : snapshot.phase === 'free-ride' ? 'FREE RIDE' : 'AMBIENCE';
      statusNode.textContent = label;
    }
    if (statusEl) statusEl.textContent = `Procedural Web Audio · ${snapshot.worldMode} · ${snapshot.seaState} · no bundled music/sample files`;
  }

  function unlockAudio() {
    ensureAudio();
    applyMix();
  }
  root.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
  root.addEventListener('keydown', unlockAudio, { once: true });
  root.addEventListener('jetski:race-finished', () => playStinger('finish'));
  root.addEventListener('jetski:championship-ending', () => playStinger('championship'));

  installButtons();
  refreshPanel();
  updateStatus(currentSnapshot());

  const mixTimer = root.setInterval(() => {
    if (audio) applyMix();
    else updateStatus(currentSnapshot());
  }, 250);

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_AUDIO = {
    version: VERSION,
    get settings() { return Object.assign({}, settings); },
    get ready() { return Boolean(audio); },
    openPanel,
    ensureAudio,
    playStinger,
    applyMix,
    setSettings(next) {
      settings = Core.normalizeSettings(Object.assign({}, settings, next || {}));
      persist();
      refreshPanel();
      if (audio) applyMix();
      return Object.assign({}, settings);
    },
    dispose() {
      root.clearInterval(mixTimer);
      if (audio && audio.context) audio.context.close().catch(() => {});
      audio = null;
    },
    ownsAmbienceAndMusic: true,
    engineLayerStillOwnedByBoost: true,
    noThirdPartyAudioAssets: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
