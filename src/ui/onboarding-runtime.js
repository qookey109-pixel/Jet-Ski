// V0.11.12 first-run onboarding + player status hub. UI/observer only.
(function (root) {
  'use strict';

  const Core = root.JETSKI_ONBOARDING_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  const ProgressionCore = root.JETSKI_PROGRESSION_CORE;
  const ChallengeCore = root.JETSKI_CHALLENGE_CORE;
  if (!Core || !Manager || typeof document === 'undefined') return;

  const VERSION = 'V0.11.12';
  const STORAGE = 'swimRing.onboarding.v01112';
  let profile = Core.createProfile();
  try { profile = Core.sanitizeProfile(JSON.parse(localStorage.getItem(STORAGE) || 'null')); } catch (_) {}

  function persist() {
    try { localStorage.setItem(STORAGE, JSON.stringify(profile)); } catch (_) {}
  }

  function hasGamepad() {
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : null;
      if (!pads) return false;
      for (const pad of pads) if (pad && pad.connected) return true;
    } catch (_) {}
    return false;
  }

  function hasTouch() {
    if (Number(navigator.maxTouchPoints) > 0) return true;
    try { return Boolean(root.matchMedia && root.matchMedia('(pointer: coarse)').matches); } catch (_) { return false; }
  }

  const style = document.createElement('style');
  style.textContent = `
    .jr-onboarding{position:fixed;inset:0;z-index:96;display:none;align-items:center;justify-content:center;padding:22px;background:radial-gradient(circle at 50% 30%,rgba(10,77,112,.72),rgba(1,8,16,.96) 64%);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}.jr-onboarding.show{display:flex}.jr-onboarding-card{width:min(760px,92vw);max-height:88vh;overflow:auto;padding:28px;border:1px solid rgba(255,255,255,.18);border-radius:26px;background:linear-gradient(145deg,rgba(5,28,45,.98),rgba(2,14,27,.97));box-shadow:0 38px 120px rgba(0,0,0,.5)}
    .jr-onboarding-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:18px 0}.jr-onboarding-step{padding:14px;border-radius:16px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.045)}.jr-onboarding-step strong{display:block;font-size:11px;letter-spacing:.08em;color:#aef4ff;margin-bottom:5px}.jr-onboarding-step span{font-size:11px;line-height:1.55;opacity:.76}.jr-onboarding-actions{display:flex;gap:9px;flex-wrap:wrap}
    .jr-player-status{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:12px 0 16px}.jr-player-status-item{padding:9px 10px;border-radius:14px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);min-width:0}.jr-player-status-item small{display:block;font-size:8px;font-weight:900;letter-spacing:.12em;opacity:.5;margin-bottom:3px}.jr-player-status-item strong{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    @media(max-width:720px){.jr-onboarding-grid{grid-template-columns:1fr}.jr-onboarding-card{padding:21px}.jr-player-status{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'jr-onboarding';
  overlay.innerHTML = `
    <div class="jr-onboarding-card">
      <div style="font-size:11px;font-weight:900;letter-spacing:.26em;color:#8fe9ff">HOW TO PLAY</div>
      <div style="font-size:clamp(34px,7vw,62px);font-weight:1000;line-height:.95;margin:9px 0 6px">RIDE THE<br>HORIZON</div>
      <div style="font-size:12px;opacity:.68;line-height:1.55">Follow the glowing gates, keep momentum through the waves, use Boost deliberately, and chase stars, PB ghosts and Challenge Medals.</div>
      <div class="jr-onboarding-grid" data-onboarding-grid></div>
      <div class="jr-onboarding-actions">
        <button class="jr-btn primary" data-onboarding-start>Start Selected Race</button>
        <button class="jr-btn" data-onboarding-free>Practice Free Ride</button>
        <button class="jr-btn" data-onboarding-close>Got It</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const hintGrid = overlay.querySelector('[data-onboarding-grid]');

  function renderHints() {
    if (!hintGrid) return;
    const mode = Core.inputMode({ gamepad: hasGamepad(), touch: hasTouch() });
    const hints = Core.hintsForMode(mode);
    hintGrid.innerHTML = [
      ['DRIVE', hints.steer],
      ['BRAKE / REVERSE', hints.brake],
      ['BOOST', hints.boost],
      ['CAMERA / RACE FLOW', hints.camera]
    ].map(([title, copy]) => `<div class="jr-onboarding-step"><strong>${title}</strong><span>${copy}</span></div>`).join('');
  }

  function markSeen() {
    profile.seen = true;
    persist();
  }

  function openTutorial() {
    profile.opens = Math.min(100000, (Number(profile.opens) || 0) + 1);
    persist();
    renderHints();
    renderStatus();
    overlay.classList.add('show');
  }

  function closeTutorial() {
    markSeen();
    overlay.classList.remove('show');
  }

  overlay.querySelector('[data-onboarding-close]').addEventListener('click', closeTutorial);
  overlay.querySelector('[data-onboarding-start]').addEventListener('click', () => {
    closeTutorial();
    Manager.startRace();
  });
  overlay.querySelector('[data-onboarding-free]').addEventListener('click', () => {
    closeTutorial();
    Manager.enterFreeRide();
  });

  function stars() {
    const progression = root.JETSKI_PROGRESSION;
    const p = progression && progression.profile;
    if (ProgressionCore && typeof ProgressionCore.totalStars === 'function') return ProgressionCore.totalStars(p);
    if (!p || !p.stars) return 0;
    return Object.values(p.stars).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  }

  function medals() {
    const challenges = root.JETSKI_CHALLENGES;
    const p = challenges && challenges.profile;
    if (ChallengeCore && typeof ChallengeCore.completedCount === 'function') return ChallengeCore.completedCount(p);
    return 0;
  }

  function statusSnapshot() {
    const ghost = root.JETSKI_GHOST;
    const cosmetics = root.JETSKI_COSMETICS;
    return Core.careerSummary({
      stars: stars(),
      medals: medals(),
      ghostEnabled: Boolean(ghost && ghost.enabled),
      livery: cosmetics && cosmetics.livery ? cosmetics.livery.name : 'Sunset Orange'
    });
  }

  const menuCard = document.querySelector('[data-jr-screen="menu"] .jr-card');
  const menuActions = menuCard && menuCard.querySelector('.jr-actions');
  const statusStrip = document.createElement('div');
  statusStrip.className = 'jr-player-status';
  if (menuCard && menuActions) menuCard.insertBefore(statusStrip, menuActions);

  function renderStatus() {
    if (!statusStrip) return;
    const s = statusSnapshot();
    statusStrip.innerHTML = `
      <div class="jr-player-status-item"><small>CHAMPIONSHIP</small><strong>★ ${s.stars} / 12</strong></div>
      <div class="jr-player-status-item"><small>CHALLENGES</small><strong>🏅 ${s.medals} / 8</strong></div>
      <div class="jr-player-status-item"><small>PB GHOST</small><strong>${s.ghostEnabled ? 'ON' : 'OFF'}</strong></div>
      <div class="jr-player-status-item"><small>LIVERY</small><strong>${s.livery}</strong></div>`;
  }

  function installHowToPlayButtons() {
    const targets = [
      document.querySelector('[data-jr-screen="menu"] .jr-actions'),
      document.querySelector('[data-jr-screen="pause"] .jr-actions')
    ];
    for (const target of targets) {
      if (!target || target.querySelector('[data-onboarding-open]')) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'jr-btn';
      button.dataset.onboardingOpen = '1';
      button.textContent = 'How to Play';
      button.addEventListener('click', openTutorial);
      target.appendChild(button);
    }
  }

  root.addEventListener('jetski:race-finished', () => setTimeout(renderStatus, 220));
  root.addEventListener('jetski:race-selected', renderStatus);
  document.addEventListener('click', event => {
    const target = event.target && event.target.closest ? event.target.closest('.jr-livery-card,[data-ghost-toggle],[data-challenge-close]') : null;
    if (target) setTimeout(renderStatus, 0);
  });
  root.addEventListener('gamepadconnected', renderHints);

  installHowToPlayButtons();
  renderStatus();
  if (!profile.seen) setTimeout(() => {
    if (Manager.state && Manager.state.phase === 'menu') openTutorial();
  }, 280);

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_ONBOARDING = {
    version: VERSION,
    get profile() { return profile; },
    openTutorial,
    closeTutorial,
    renderStatus,
    storageKey: STORAGE,
    uiOnly: true,
    physicsUntouched: true,
    reset() {
      profile = Core.createProfile();
      persist();
      renderStatus();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
