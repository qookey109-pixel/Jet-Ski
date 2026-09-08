// V0.11.7 procedural atmosphere/music runtime. No external audio assets or gameplay writes.
(function (root) {
  'use strict';
  const Core = root.JETSKI_AUDIO_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  if (!Core || !Manager || typeof document === 'undefined') return;

  const VERSION = 'V0.11.7';
  const STORAGE = 'swimRing.audio.v0117';
  let preferences = Core.sanitizePreferences(null);
  try { preferences = Core.sanitizePreferences(JSON.parse(localStorage.getItem(STORAGE) || 'null')); } catch (_) {}

  let audio = null;
  let lastMixAt = 0;
  let lastPhase = '';
  let lastEventId = '';

  function persist() { try { localStorage.setItem(STORAGE, JSON.stringify(preferences)); } catch (_) {} }
  function makeNoiseBuffer(context, seconds) {
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let prev = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      prev = prev * 0.86 + white * 0.14;
      data[i] = prev * 0.72 + white * 0.28;
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
      const windGain = context.createGain();
      const oceanGain = context.createGain();
      const windFilter = context.createBiquadFilter();
      const oceanFilter = context.createBiquadFilter();
      const wind = context.createBufferSource();
      const ocean = context.createBufferSource();
      const padA = context.createOscillator();
      const padB = context.createOscillator();
      const padGain = context.createGain();
      const musicFilter = context.createBiquadFilter();

      master.gain.value = 0.0001;
      ambienceBus.gain.value = 0.0001;
      musicBus.gain.value = 0.0001;
      windGain.gain.value = 0.0001;
      oceanGain.gain.value = 0.0001;
      padGain.gain.value = 0.0001;
      windFilter.type = 'bandpass'; windFilter.frequency.value = 700; windFilter.Q.value = 0.55;
      oceanFilter.type = 'lowpass'; oceanFilter.frequency.value = 460; oceanFilter.Q.value = 0.35;
      musicFilter.type = 'lowpass'; musicFilter.frequency.value = 1200; musicFilter.Q.value = 0.35;
      wind.buffer = makeNoiseBuffer(context, 3.7); wind.loop = true;
      ocean.buffer = makeNoiseBuffer(context, 5.3); ocean.loop = true;
      padA.type = 'sine'; padB.type = 'triangle';
      padA.frequency.value = 110; padB.frequency.value = 164.81;

      wind.connect(windFilter); windFilter.connect(windGain); windGain.connect(ambienceBus);
      ocean.connect(oceanFilter); oceanFilter.connect(oceanGain); oceanGain.connect(ambienceBus);
      padA.connect(padGain); padB.connect(padGain); padGain.connect(musicFilter); musicFilter.connect(musicBus);
      ambienceBus.connect(master); musicBus.connect(master); master.connect(context.destination);
      wind.start(); ocean.start(); padA.start(); padB.start();
      audio = { context, master, ambienceBus, musicBus, windGain, oceanGain, windFilter, oceanFilter, padA, padB, padGain, musicFilter };
      if (context.state === 'suspended') context.resume().catch(() => {});
      return audio;
    } catch (_) { return null; }
  }

  function currentContext() {
    const event = Manager.selectedEvent || {};
    const phase = Manager.state && Manager.state.phase || 'menu';
    const worldMode = root.V097_WORLD_MODES && root.V097_WORLD_MODES.mode || event.worldMode || 'open-sea';
    const maxSpeed = typeof physics !== 'undefined' && physics.maxSpeed ? physics.maxSpeed : 36;
    const speedRatio = typeof speed === 'number' ? Math.max(0, Math.min(1, speed / Math.max(0.1, maxSpeed))) : 0;
    const boostActive = Boolean(root.JETSKI_BOOST && root.JETSKI_BOOST.state && root.JETSKI_BOOST.state.active);
    return { preferences, worldMode, eventId: event.id || '', phase, speedRatio, boostActive };
  }

  function applyMix(mix, contextInfo) {
    const a = audio; if (!a || a.context.state === 'closed') return;
    const now = a.context.currentTime;
    const t = 0.18;
    a.master.gain.setTargetAtTime(Math.max(0.0001, mix.master), now, t);
    a.windGain.gain.setTargetAtTime(Math.max(0.0001, mix.wind * 0.14), now, t);
    a.oceanGain.gain.setTargetAtTime(Math.max(0.0001, mix.ocean * 0.18), now, t);
    a.musicBus.gain.setTargetAtTime(Math.max(0.0001, mix.music * 0.15), now, 0.35);
    a.padGain.gain.setTargetAtTime(Math.max(0.0001, mix.music * 0.22), now, 0.35);
    a.windFilter.frequency.setTargetAtTime(500 + mix.intensity * 900, now, 0.25);
    a.oceanFilter.frequency.setTargetAtTime(320 + mix.intensity * 520, now, 0.25);
    a.musicFilter.frequency.setTargetAtTime(720 + mix.warmth * 1150 + mix.intensity * 420, now, 0.35);
    const final = contextInfo.eventId === 'pacific-crown-final';
    const base = final ? 98 : contextInfo.worldMode === 'hawaii-coast' ? 123.47 : contextInfo.worldMode === 'taiwan-coast' ? 110 : 116.54;
    a.padA.frequency.setTargetAtTime(base, now, 0.5);
    a.padB.frequency.setTargetAtTime(base * (final ? 1.5 : mix.warmth > 0.65 ? 1.4983 : 1.3333), now, 0.5);
  }

  function tick(nowMs) {
    if (audio && nowMs - lastMixAt >= 100) {
      const info = currentContext();
      const mix = Core.computeMix(info);
      applyMix(mix, info);
      lastMixAt = nowMs;
      lastPhase = info.phase; lastEventId = info.eventId;
    }
    root.requestAnimationFrame(tick);
  }

  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;inset:0;z-index:75;display:none;align-items:center;justify-content:center;background:rgba(1,8,16,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:Inter,-apple-system,sans-serif;color:#fff';
  panel.innerHTML = `<div style="width:min(500px,88vw);padding:26px;border:1px solid rgba(255,255,255,.18);border-radius:22px;background:rgba(3,20,34,.96)"><div style="font-size:11px;font-weight:900;letter-spacing:.22em;color:#8fe9ff">AUDIO</div><h2 style="margin:8px 0 18px">Sound & Atmosphere</h2><div data-audio-controls></div><div style="margin-top:20px;display:flex;justify-content:flex-end"><button data-audio-close class="jr-btn primary">Done</button></div></div>`;
  document.body.appendChild(panel);
  const controls = panel.querySelector('[data-audio-controls]');

  function addSlider(key, label) {
    const row = document.createElement('label'); row.style.cssText='display:block;margin:14px 0;font-size:12px;font-weight:800';
    row.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:7px"><span>${label}</span><span data-audio-value>${Math.round(preferences[key]*100)}%</span></div><input type="range" min="0" max="1" step="0.05" value="${preferences[key]}" style="width:100%">`;
    const input = row.querySelector('input'), value = row.querySelector('[data-audio-value]');
    input.addEventListener('input', () => { preferences[key] = Core.clamp01(input.value); value.textContent=`${Math.round(preferences[key]*100)}%`; persist(); ensureAudio(); });
    controls.appendChild(row);
  }
  addSlider('master','Master'); addSlider('music','Music'); addSlider('ambience','Ocean / Wind');
  panel.querySelector('[data-audio-close]').addEventListener('click',()=>panel.style.display='none');
  panel.addEventListener('click',event=>{if(event.target===panel)panel.style.display='none';});

  function openPanel() { ensureAudio(); panel.style.display='flex'; }
  function installButtons() {
    for (const actions of document.querySelectorAll('[data-jr-screen="menu"] .jr-actions,[data-jr-screen="pause"] .jr-actions')) {
      if (actions.querySelector('[data-audio-open]')) continue;
      const button=document.createElement('button'); button.type='button'; button.className='jr-btn'; button.dataset.audioOpen='1'; button.textContent='Audio'; button.addEventListener('click',openPanel); actions.appendChild(button);
    }
  }

  const unlock = () => ensureAudio();
  root.addEventListener('pointerdown', unlock, { once:true, passive:true });
  root.addEventListener('keydown', unlock, { once:true });
  root.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.hidden) audio.context.suspend().catch(()=>{}); else audio.context.resume().catch(()=>{});
  });

  installButtons();
  root.requestAnimationFrame(tick);
  const versionNode=document.querySelector('#version'); if(versionNode)versionNode.textContent=VERSION;
  document.title=`Swim Ring Racing ${VERSION}`;

  root.JETSKI_AUDIO = { version:VERSION, get preferences(){return Object.assign({},preferences);}, openPanel, ensureAudio, computeCurrentMix(){return Core.computeMix(currentContext());}, proceduralOnly:true, externalAssets:false, physicsUntouched:true, get lastPhase(){return lastPhase;}, get lastEventId(){return lastEventId;} };
})(typeof window !== 'undefined' ? window : globalThis);
