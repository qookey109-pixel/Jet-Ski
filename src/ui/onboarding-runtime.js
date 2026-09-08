// V0.11.11 first-run tutorial + lightweight contextual hints. UI/event observer only.
(function (root) {
  'use strict';

  const Core = root.JETSKI_ONBOARDING_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  if (!Core || !Manager || typeof document === 'undefined') return;

  const VERSION = 'V0.11.11';
  const STORAGE = 'swimRing.onboarding.v01111';
  let profile = Core.createProfile();
  let stepIndex = 0;
  let lastFocused = null;
  const sessionHints = new Set();
  const hintTimers = new Set();

  try { profile = Core.sanitizeProfile(JSON.parse(localStorage.getItem(STORAGE) || 'null')); } catch (_) {}

  function persist() {
    try { localStorage.setItem(STORAGE, JSON.stringify(profile)); } catch (_) {}
  }

  function detectInputMode() {
    let gamepad = false;
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      gamepad = Array.from(pads || []).some(pad => pad && pad.connected);
    } catch (_) {}
    const touch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in root;
    return Core.inputMode({ touch, gamepad });
  }

  const style = document.createElement('style');
  style.textContent = `
    .jr-tutorial{position:fixed;inset:0;z-index:82;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(1,8,16,.76);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
    .jr-tutorial.show{display:flex}.jr-tutorial-card{width:min(610px,92vw);padding:28px;border-radius:24px;border:1px solid rgba(255,255,255,.18);background:linear-gradient(145deg,rgba(5,30,49,.98),rgba(2,16,29,.96));box-shadow:0 32px 90px rgba(0,0,0,.44)}
    .jr-tutorial-kicker{font-size:10px;font-weight:900;letter-spacing:.25em;color:#8fe9ff}.jr-tutorial-title{margin:9px 0 12px;font-size:clamp(31px,7vw,54px);line-height:.96;font-weight:950}.jr-tutorial-body{font-size:14px;line-height:1.65;opacity:.82}.jr-tutorial-control{margin:16px 0 18px;padding:12px 14px;border-radius:14px;background:rgba(89,219,255,.08);border:1px solid rgba(120,229,255,.13);font-size:12px;font-weight:850;color:#c7f6ff}.jr-tutorial-dots{display:flex;gap:6px;margin:16px 0}.jr-tutorial-dot{width:20px;height:4px;border-radius:999px;background:rgba(255,255,255,.15)}.jr-tutorial-dot.active{background:#78e9ff}.jr-tutorial-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.jr-tutorial-spacer{flex:1}.jr-tutorial-hints{font-size:11px;opacity:.7;display:flex;align-items:center;gap:7px}.jr-tutorial-hints input{width:18px;height:18px}
    .jr-coach-hint{position:fixed;left:50%;bottom:92px;z-index:60;transform:translate(-50%,12px);opacity:0;max-width:min(520px,86vw);padding:10px 15px;border-radius:999px;background:rgba(2,18,31,.84);border:1px solid rgba(126,237,255,.2);box-shadow:0 10px 32px rgba(0,0,0,.28);font:850 11px/1.35 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#dffaff;text-align:center;pointer-events:none;transition:opacity .2s ease,transform .2s ease}.jr-coach-hint.show{opacity:1;transform:translate(-50%,0)}
    @media(max-width:720px){.jr-tutorial{align-items:flex-start;padding-top:5vh;overflow:auto}.jr-tutorial-card{padding:22px 19px}.jr-tutorial-body{font-size:13px}.jr-coach-hint{bottom:112px;border-radius:16px}}
    @media(prefers-reduced-motion:reduce){.jr-coach-hint{transition:none}.jr-tutorial *{scroll-behavior:auto!important}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'jr-tutorial';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'How to play Swim Ring Racing');
  panel.innerHTML = `
    <div class="jr-tutorial-card">
      <div class="jr-tutorial-kicker" data-tutorial-kicker></div>
      <div class="jr-tutorial-title" data-tutorial-title></div>
      <div class="jr-tutorial-body" data-tutorial-body></div>
      <div class="jr-tutorial-control" data-tutorial-control></div>
      <div class="jr-tutorial-dots" data-tutorial-dots></div>
      <div class="jr-tutorial-actions">
        <button class="jr-btn" type="button" data-tutorial-skip>Skip</button>
        <label class="jr-tutorial-hints"><input type="checkbox" data-tutorial-hints checked> In-race hints</label>
        <span class="jr-tutorial-spacer"></span>
        <button class="jr-btn" type="button" data-tutorial-prev>Back</button>
        <button class="jr-btn primary" type="button" data-tutorial-next>Next</button>
      </div>
    </div>`;
  document.body.appendChild(panel);

  const kicker = panel.querySelector('[data-tutorial-kicker]');
  const title = panel.querySelector('[data-tutorial-title]');
  const body = panel.querySelector('[data-tutorial-body]');
  const control = panel.querySelector('[data-tutorial-control]');
  const dots = panel.querySelector('[data-tutorial-dots]');
  const hintsCheckbox = panel.querySelector('[data-tutorial-hints]');
  const prevButton = panel.querySelector('[data-tutorial-prev]');
  const nextButton = panel.querySelector('[data-tutorial-next]');

  const coach = document.createElement('div');
  coach.className = 'jr-coach-hint';
  coach.setAttribute('aria-live', 'polite');
  document.body.appendChild(coach);
  let coachTimer = 0;

  function renderStep() {
    const step = Core.stepFor(stepIndex);
    const mode = detectInputMode();
    kicker.textContent = step.kicker;
    title.textContent = step.title;
    body.textContent = step.body;
    control.textContent = Core.controlCopy(step, mode);
    dots.innerHTML = '';
    for (let i = 0; i < Core.STEPS.length; i++) {
      const dot = document.createElement('span');
      dot.className = `jr-tutorial-dot${i === stepIndex ? ' active' : ''}`;
      dots.appendChild(dot);
    }
    hintsCheckbox.checked = profile.hintsEnabled;
    prevButton.style.visibility = stepIndex === 0 ? 'hidden' : 'visible';
    nextButton.textContent = stepIndex === Core.STEPS.length - 1 ? 'Let’s Race' : 'Next';
    profile.lastStep = stepIndex;
    persist();
  }

  function openTutorial(fromStart) {
    lastFocused = document.activeElement;
    if (fromStart) profile = Core.beginTutorial(profile);
    stepIndex = 0;
    renderStep();
    panel.classList.add('show');
    nextButton.focus();
  }

  function closeTutorial(markComplete) {
    if (markComplete) profile = Core.completeTutorial(profile);
    profile.hintsEnabled = hintsCheckbox.checked;
    persist();
    panel.classList.remove('show');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  hintsCheckbox.addEventListener('change', () => {
    profile = Core.setHints(profile, hintsCheckbox.checked);
    persist();
  });
  panel.querySelector('[data-tutorial-skip]').addEventListener('click', () => closeTutorial(true));
  prevButton.addEventListener('click', () => { stepIndex = Core.previousStep(stepIndex); renderStep(); });
  nextButton.addEventListener('click', () => {
    if (stepIndex >= Core.STEPS.length - 1) closeTutorial(true);
    else { stepIndex = Core.nextStep(stepIndex); renderStep(); }
  });

  addEventListener('keydown', event => {
    if (!panel.classList.contains('show')) return;
    if (event.code === 'Escape') {
      closeTutorial(false);
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  function installTutorialButtons() {
    const targets = [
      document.querySelector('[data-jr-screen="menu"] .jr-actions'),
      document.querySelector('[data-jr-screen="pause"] .jr-actions')
    ];
    for (const target of targets) {
      if (!target || target.querySelector('[data-tutorial-open]')) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'jr-btn';
      button.dataset.tutorialOpen = '1';
      button.textContent = 'Tutorial';
      button.addEventListener('click', () => openTutorial(true));
      target.appendChild(button);
    }
  }

  function showHint(id, message, duration) {
    if (!profile.hintsEnabled || sessionHints.has(id)) return false;
    sessionHints.add(id);
    clearTimeout(coachTimer);
    coach.textContent = message;
    coach.classList.add('show');
    coachTimer = setTimeout(() => coach.classList.remove('show'), duration || 3000);
    return true;
  }

  function scheduleHint(delay, id, message, duration) {
    const timer = setTimeout(() => {
      hintTimers.delete(timer);
      if (Manager.state.phase === 'racing') showHint(id, message, duration);
    }, delay);
    hintTimers.add(timer);
  }

  root.addEventListener('jetski:race-ready', () => {
    scheduleHint(3400, 'target-gate', 'Follow the glowing cyan gate — checkpoints must be passed in order.', 3600);
    scheduleHint(7000, 'boost', detectInputMode() === 'touch' ? 'Use BOOST on a clean straight when the ring is planted.' : 'Use Boost on a clean straight — SPACE / Gamepad A.', 3200);
  });

  root.addEventListener('jetski:race-finished', () => {
    setTimeout(() => showHint('career', 'Stars unlock Garage liveries. Beat your PB to create a faster Ghost.', 4200), 450);
  });

  installTutorialButtons();
  persist();

  if (!profile.complete) setTimeout(() => openTutorial(true), 260);

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_ONBOARDING = {
    version: VERSION,
    get profile() { return profile; },
    openTutorial,
    showHint,
    storageKey: STORAGE,
    uiOnly: true,
    inputWrites: false,
    physicsUntouched: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
