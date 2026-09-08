// V0.11.11 pure onboarding/tutorial policy.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.11';
  const PROFILE_VERSION = 1;

  const STEPS = Object.freeze([
    Object.freeze({
      id: 'drive',
      kicker: 'STEP 1 · DRIVE',
      title: 'READ THE WATER',
      body: 'Accelerate into the swell, steer smoothly and use brake/reverse to recover when you overshoot a line.',
      keyboard: 'W / ↑ Gas · S / ↓ Brake/Reverse · A D / ← → Steer',
      gamepad: 'Left Stick Drive · Start Pause',
      touch: 'Left arrows steer · GAS / BRAKE controls drive'
    }),
    Object.freeze({
      id: 'race',
      kicker: 'STEP 2 · RACE',
      title: 'CHASE THE GLOW',
      body: 'Pass the glowing gate in order. Complete every gate and lap while three rivals race the same course.',
      keyboard: 'ESC Pause · follow the cyan target gate',
      gamepad: 'Follow the cyan target gate',
      touch: 'Follow the cyan target gate'
    }),
    Object.freeze({
      id: 'boost',
      kicker: 'STEP 3 · GAME FEEL',
      title: 'SPEND NITRO WISELY',
      body: 'Boost is strongest when the ring is planted and driving forward. It recharges after a short delay.',
      keyboard: 'SPACE Boost',
      gamepad: 'A / South Button Boost',
      touch: 'BOOST button'
    }),
    Object.freeze({
      id: 'career',
      kicker: 'STEP 4 · CHAMPIONSHIP',
      title: 'BUILD YOUR RUN',
      body: 'Finish races to unlock coast events and the Pacific Crown Final. Stars unlock Garage liveries; Personal Bests create a Ghost to race against.',
      keyboard: 'Race Select · PB Ghost · Garage · Settings / Audio',
      gamepad: 'Race Select · PB Ghost · Garage',
      touch: 'Race Select · PB Ghost · Garage'
    })
  ]);

  function clampIndex(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(STEPS.length - 1, Math.floor(number)));
  }

  function createProfile() {
    return {
      version: PROFILE_VERSION,
      complete: false,
      hintsEnabled: true,
      visits: 0,
      lastStep: 0
    };
  }

  function sanitizeProfile(input) {
    const base = createProfile();
    if (!input || typeof input !== 'object') return base;
    base.complete = Boolean(input.complete);
    base.hintsEnabled = input.hintsEnabled !== false;
    base.visits = Math.max(0, Math.floor(Number(input.visits) || 0));
    base.lastStep = clampIndex(input.lastStep);
    return base;
  }

  function completeTutorial(profile) {
    const next = sanitizeProfile(profile);
    next.complete = true;
    next.lastStep = STEPS.length - 1;
    next.visits += 1;
    return next;
  }

  function beginTutorial(profile) {
    const next = sanitizeProfile(profile);
    next.lastStep = 0;
    next.visits += 1;
    return next;
  }

  function setHints(profile, enabled) {
    const next = sanitizeProfile(profile);
    next.hintsEnabled = Boolean(enabled);
    return next;
  }

  function nextStep(index) {
    return Math.min(STEPS.length - 1, clampIndex(index) + 1);
  }

  function previousStep(index) {
    return Math.max(0, clampIndex(index) - 1);
  }

  function stepFor(index) {
    return STEPS[clampIndex(index)];
  }

  function inputMode(options) {
    const o = options || {};
    if (o.touch) return 'touch';
    if (o.gamepad) return 'gamepad';
    return 'keyboard';
  }

  function controlCopy(step, mode) {
    const s = step || STEPS[0];
    if (mode === 'touch') return s.touch;
    if (mode === 'gamepad') return s.gamepad;
    return s.keyboard;
  }

  const api = {
    VERSION,
    PROFILE_VERSION,
    STEPS,
    clampIndex,
    createProfile,
    sanitizeProfile,
    completeTutorial,
    beginTutorial,
    setHints,
    nextStep,
    previousStep,
    stepFor,
    inputMode,
    controlCopy
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_ONBOARDING_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
