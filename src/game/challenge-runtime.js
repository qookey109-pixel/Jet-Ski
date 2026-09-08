// V0.11.11 persistent challenge board. Observer/UI only; no gameplay or physics writes.
(function (root) {
  'use strict';

  const Core = root.JETSKI_CHALLENGE_CORE;
  const ProgressionCore = root.JETSKI_PROGRESSION_CORE;
  if (!Core || typeof document === 'undefined') return;

  const VERSION = 'V0.11.11';
  const STORAGE = 'swimRing.challenges.v01111';
  let profile = Core.createProfile();
  try { profile = Core.sanitizeProfile(JSON.parse(localStorage.getItem(STORAGE) || 'null')); } catch (_) {}

  function persist() {
    try { localStorage.setItem(STORAGE, JSON.stringify(profile)); } catch (_) {}
  }

  const style = document.createElement('style');
  style.textContent = `
    .jr-challenge-panel{position:fixed;inset:0;z-index:78;display:none;align-items:center;justify-content:center;background:rgba(1,8,16,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
    .jr-challenge-panel.show{display:flex}.jr-challenge-card{width:min(760px,92vw);max-height:84vh;overflow:auto;padding:26px;border:1px solid rgba(255,255,255,.18);border-radius:24px;background:linear-gradient(145deg,rgba(5,28,45,.98),rgba(3,17,31,.96));box-shadow:0 30px 90px rgba(0,0,0,.44)}
    .jr-challenge-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:18px 0}.jr-challenge-item{padding:13px 14px;border-radius:16px;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.045)}.jr-challenge-item.done{border-color:rgba(126,237,255,.28);background:linear-gradient(145deg,rgba(28,175,227,.14),rgba(76,104,255,.08))}.jr-challenge-name{font-size:12px;font-weight:950;letter-spacing:.04em}.jr-challenge-desc{font-size:10px;line-height:1.5;opacity:.64;margin-top:5px}.jr-challenge-state{font-size:10px;font-weight:900;color:#aef4ff;margin-top:8px}.jr-challenge-status{font-size:12px;line-height:1.6;opacity:.78;margin-top:10px}.jr-challenge-toast{position:fixed;left:50%;top:118px;z-index:92;transform:translate(-50%,-8px);opacity:0;pointer-events:none;padding:9px 14px;border-radius:999px;background:rgba(4,29,45,.90);border:1px solid rgba(136,241,255,.25);font:900 11px/1.2 Inter,-apple-system,sans-serif;color:#d9fbff;transition:.2s opacity,.2s transform}.jr-challenge-toast.show{opacity:1;transform:translate(-50%,0)}
    @media(max-width:720px){.jr-challenge-grid{grid-template-columns:1fr}.jr-challenge-card{padding:20px}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'jr-challenge-panel';
  panel.innerHTML = `
    <div class="jr-challenge-card">
      <div style="font-size:11px;font-weight:900;letter-spacing:.24em;color:#8fe9ff;margin-bottom:8px">REPLAY OBJECTIVES</div>
      <div style="font-size:clamp(30px,6vw,48px);font-weight:950;line-height:1">CHALLENGES</div>
      <div class="jr-challenge-status" data-challenge-status></div>
      <div class="jr-challenge-grid" data-challenge-grid></div>
      <div style="display:flex;justify-content:flex-end"><button class="jr-btn primary" data-challenge-close>Done</button></div>
    </div>`;
  document.body.appendChild(panel);

  const toast = document.createElement('div');
  toast.className = 'jr-challenge-toast';
  document.body.appendChild(toast);
  let toastTimer = 0;

  const grid = panel.querySelector('[data-challenge-grid]');
  const status = panel.querySelector('[data-challenge-status]');

  function renderBoard() {
    if (!grid || !status) return;
    const medals = Core.completedCount(profile);
    const next = Core.nextIncomplete(profile);
    status.textContent = Core.complete(profile)
      ? `${medals} / ${Core.CHALLENGES.length} medals · All replay challenges complete.`
      : `${medals} / ${Core.CHALLENGES.length} medals · Next objective: ${next ? next.name : '—'}`;
    grid.innerHTML = '';
    for (const challenge of Core.CHALLENGES) {
      const done = Boolean(profile.completed[challenge.id]);
      const item = document.createElement('div');
      item.className = `jr-challenge-item${done ? ' done' : ''}`;
      item.innerHTML = `<div class="jr-challenge-name">${done ? '🏅 ' : '○ '}${challenge.name}</div><div class="jr-challenge-desc">${challenge.description}</div><div class="jr-challenge-state">${done ? 'COMPLETE' : 'INCOMPLETE'}</div>`;
      grid.appendChild(item);
    }
  }

  function openBoard() { renderBoard(); panel.classList.add('show'); }
  function closeBoard() { panel.classList.remove('show'); }
  panel.querySelector('[data-challenge-close]').addEventListener('click', closeBoard);
  panel.addEventListener('click', event => { if (event.target === panel) closeBoard(); });

  function installButtons() {
    const targets = [
      document.querySelector('[data-jr-screen="menu"] .jr-actions'),
      document.querySelector('[data-jr-screen="pause"] .jr-actions')
    ];
    for (const target of targets) {
      if (!target || target.querySelector('[data-challenge-open]')) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'jr-btn';
      button.dataset.challengeOpen = '1';
      button.textContent = 'Challenges';
      button.addEventListener('click', openBoard);
      target.appendChild(button);
    }
  }

  function showCompletion(ids) {
    if (!ids || !ids.length) return;
    clearTimeout(toastTimer);
    const names = ids.map(id => Core.BY_ID[id] && Core.BY_ID[id].name).filter(Boolean);
    toast.textContent = `CHALLENGE COMPLETE · ${names.join(' + ')}`;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), Math.min(3600, 1600 + names.length * 500));
  }

  function currentProgression() {
    const progression = root.JETSKI_PROGRESSION;
    return progression && progression.profile ? progression.profile : null;
  }

  root.addEventListener('jetski:race-finished', event => {
    const detail = event && event.detail;
    if (!detail || !detail.finished) return;

    // Capture pre-result PB before progression-runtime writes the new result on its deferred tick.
    const before = currentProgression();
    const previousBestMs = before && before.bestTimes ? Number(before.bestTimes[detail.eventId]) || 0 : 0;
    const ai = root.JETSKI_RACE_AI;
    const placement = ai && typeof ai.getPlayerRank === 'function' ? ai.getPlayerRank() : 4;
    const boost = root.JETSKI_BOOST && root.JETSKI_BOOST.state;
    const boostActivations = boost ? Math.max(0, Number(boost.activationCount) || 0) : 0;

    // Progression/Garage process the same finish first. Read the updated Championship
    // profile shortly afterward so all-four / 12-star challenges use repository authority.
    setTimeout(() => {
      const progression = currentProgression();
      let completedEvents = 0;
      let totalStars = 0;
      if (progression) {
        if (progression.completions) completedEvents = Object.values(progression.completions).filter(value => Number(value) > 0).length;
        if (ProgressionCore && typeof ProgressionCore.totalStars === 'function') totalStars = ProgressionCore.totalStars(progression);
        else if (progression.stars) totalStars = Object.values(progression.stars).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
      }

      const result = Core.recordRun(profile, {
        eventId: detail.eventId,
        elapsedMs: Number(detail.elapsedMs) || 0,
        previousBestMs,
        placement,
        boostActivations,
        completedEvents,
        totalStars,
        finished: true
      });
      profile = result.profile;
      persist();
      renderBoard();
      if (result.newlyCompleted.length) showCompletion(result.newlyCompleted);
    }, 120);
  });

  installButtons();
  renderBoard();

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_CHALLENGES = {
    version: VERSION,
    get profile() { return profile; },
    openBoard,
    closeBoard,
    renderBoard,
    storageKey: STORAGE,
    localOnly: true,
    observerOnly: true,
    physicsUntouched: true,
    reset() {
      profile = Core.createProfile();
      persist();
      renderBoard();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
