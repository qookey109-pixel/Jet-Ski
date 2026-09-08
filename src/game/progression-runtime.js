// V0.11.5 Race selection + local progression UI/runtime.
(function (root) {
  'use strict';

  const Core = root.JETSKI_PROGRESSION_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  const Race = root.JETSKI_RACE_COURSE;
  if (!Core || !Manager || !Race || typeof document === 'undefined') return;

  const VERSION = 'V0.11.5';
  const PROFILE_KEY = 'swimRing.progression.v0115';
  const SELECTED_KEY = 'swimRing.progression.selectedEvent';
  let profile = Core.createProfile();
  let selectedId = Core.EVENTS[0].id;
  let lastOutcome = null;

  function loadProfile() {
    try {
      profile = Core.sanitizeProfile(JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'));
    } catch (_) {
      profile = Core.createProfile();
    }
    try {
      const saved = localStorage.getItem(SELECTED_KEY);
      if (saved && Core.isUnlocked(profile, saved)) selectedId = saved;
    } catch (_) {}
  }

  function persist() {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      localStorage.setItem(SELECTED_KEY, selectedId);
    } catch (_) {}
  }

  const style = document.createElement('style');
  style.textContent = `
    .jr-event-select{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:18px 0 22px}
    .jr-event-card{appearance:none;text-align:left;min-height:108px;padding:12px;border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(255,255,255,.05);color:#fff;cursor:pointer;transition:.18s transform,.18s border-color,.18s background}
    .jr-event-card:hover:not(:disabled),.jr-event-card:focus-visible:not(:disabled){transform:translateY(-2px);border-color:rgba(143,233,255,.5);outline:none}
    .jr-event-card.selected{border-color:#72e9ff;background:linear-gradient(145deg,rgba(28,175,227,.22),rgba(76,104,255,.12));box-shadow:inset 0 0 0 1px rgba(114,233,255,.12)}
    .jr-event-card:disabled{cursor:not-allowed;opacity:.46;filter:saturate(.55)}
    .jr-event-name{font-size:13px;font-weight:950;line-height:1.2;margin-bottom:6px}
    .jr-event-sub{font-size:10px;line-height:1.35;opacity:.64;min-height:28px}
    .jr-event-meta{display:flex;justify-content:space-between;gap:6px;margin-top:9px;font-size:10px;font-weight:850;color:#aeeeff}
    .jr-tour-status{font-size:10px;font-weight:850;letter-spacing:.12em;color:#aeeeff;margin-top:-9px;margin-bottom:8px;text-transform:uppercase}
    .jr-progression-result{margin:4px 0 20px;padding:14px 15px;border-radius:16px;background:rgba(91,220,255,.07);border:1px solid rgba(126,229,255,.13);font-size:12px;line-height:1.65}
    .jr-progression-result strong{color:#b7f5ff}
    @media(max-width:720px){.jr-event-select{grid-template-columns:1fr}.jr-event-card{min-height:82px}.jr-event-sub{min-height:0}}
  `;
  document.head.appendChild(style);

  const menuCard = document.querySelector('[data-jr-screen="menu"] .jr-card');
  const menuActions = menuCard && menuCard.querySelector('.jr-actions');
  const kicker = menuCard && menuCard.querySelector('.jr-kicker');
  const subtitle = menuCard && menuCard.querySelector('.jr-sub');
  const resultsCard = document.querySelector('[data-jr-screen="results"] .jr-card');
  const resultsActions = resultsCard && resultsCard.querySelector('.jr-actions');

  const tourStatus = document.createElement('div');
  tourStatus.className = 'jr-tour-status';
  const eventSelect = document.createElement('div');
  eventSelect.className = 'jr-event-select';
  eventSelect.setAttribute('aria-label', 'race selection');
  if (menuCard && menuActions) {
    menuCard.insertBefore(tourStatus, menuActions);
    menuCard.insertBefore(eventSelect, menuActions);
  }

  const resultSummary = document.createElement('div');
  resultSummary.className = 'jr-progression-result';
  resultSummary.style.display = 'none';
  if (resultsCard && resultsActions) resultsCard.insertBefore(resultSummary, resultsActions);

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'jr-btn primary';
  nextButton.textContent = 'Next Race';
  nextButton.style.display = 'none';
  if (resultsActions) resultsActions.prepend(nextButton);

  function formatBest(ms) {
    return Number.isFinite(ms) && ms > 0 ? Race.formatRaceTime(ms) : '—';
  }

  function updateSelectedCopy() {
    const event = Core.getEvent(selectedId);
    if (kicker) kicker.textContent = `${VERSION} · ${event.name}`;
    if (subtitle) subtitle.textContent = `${event.subtitle}. Two laps against three rivals. Finish to unlock the next coast event; place higher to earn more stars.`;
  }

  function renderCards() {
    if (!eventSelect) return;
    eventSelect.innerHTML = '';
    const completed = Core.EVENTS.filter(event => (profile.completions[event.id] || 0) > 0).length;
    tourStatus.textContent = `Coast Tour ${completed} / ${Core.EVENTS.length} complete · ${profile.totalFinishes || 0} total finishes`;

    for (const event of Core.EVENTS) {
      const unlocked = Core.isUnlocked(profile, event.id);
      const selected = event.id === selectedId;
      const stars = profile.stars[event.id] || 0;
      const best = profile.bestTimes[event.id];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `jr-event-card${selected ? ' selected' : ''}`;
      button.disabled = !unlocked;
      button.dataset.eventId = event.id;
      button.innerHTML = `
        <div class="jr-event-name">${unlocked ? '' : '🔒 '}${event.name}</div>
        <div class="jr-event-sub">${event.subtitle}</div>
        <div class="jr-event-meta"><span>${unlocked ? `★${stars}/3` : 'LOCKED'}</span><span>PB ${formatBest(best)}</span></div>`;
      button.addEventListener('click', () => selectEvent(event.id));
      eventSelect.appendChild(button);
    }
    updateSelectedCopy();
  }

  function selectEvent(eventId) {
    if (!Core.isUnlocked(profile, eventId)) return false;
    if (!Manager.selectEvent(eventId)) return false;
    selectedId = eventId;
    persist();
    renderCards();
    return true;
  }

  function renderOutcome() {
    if (!resultSummary || !lastOutcome) return;
    const event = Core.getEvent(lastOutcome.eventId);
    const unlock = lastOutcome.unlockedEventId ? Core.getEvent(lastOutcome.unlockedEventId) : null;
    const lines = [
      `<strong>${event.name}</strong> · P${lastOutcome.placement} · ${lastOutcome.starsEarned}★`,
      `${lastOutcome.newBest ? 'NEW PB' : 'PB'} ${formatBest(profile.bestTimes[event.id])}`
    ];
    if (unlock) lines.push(`🔓 Unlocked: <strong>${unlock.name}</strong>`);
    if (Core.campaignComplete(profile)) lines.push('🏆 <strong>COAST TOUR COMPLETE</strong> · all three race locations finished');
    resultSummary.innerHTML = lines.join('<br>');
    resultSummary.style.display = '';

    const nextId = Core.nextEventId(profile, event.id);
    if (nextId) {
      nextButton.style.display = '';
      nextButton.textContent = `Next · ${Core.getEvent(nextId).name}`;
      nextButton.dataset.nextEventId = nextId;
    } else {
      nextButton.style.display = 'none';
      nextButton.dataset.nextEventId = '';
    }
  }

  nextButton.addEventListener('click', () => {
    const nextId = nextButton.dataset.nextEventId;
    if (!nextId || !Core.isUnlocked(profile, nextId)) return;
    if (selectEvent(nextId)) Manager.startRace();
  });

  root.addEventListener('jetski:race-selected', event => {
    const id = event && event.detail && event.detail.eventId;
    if (id && Core.EVENT_BY_ID[id]) {
      selectedId = id;
      persist();
      renderCards();
    }
  });

  root.addEventListener('jetski:race-finished', event => {
    const detail = event && event.detail;
    if (!detail || !detail.finished) return;
    setTimeout(() => {
      const ai = root.JETSKI_RACE_AI;
      const placement = ai && typeof ai.getPlayerRank === 'function' ? ai.getPlayerRank() : 4;
      const recorded = Core.recordResult(profile, {
        eventId: detail.eventId,
        elapsedMs: detail.elapsedMs,
        placement,
        finished: true
      });
      profile = recorded.profile;
      selectedId = detail.eventId;
      lastOutcome = {
        eventId: detail.eventId,
        placement,
        starsEarned: recorded.starsEarned,
        newBest: recorded.newBest,
        unlockedEventId: recorded.unlockedEventId
      };
      persist();
      renderCards();
      renderOutcome();
    }, 0);
  });

  loadProfile();
  if (!Core.isUnlocked(profile, selectedId)) selectedId = Core.EVENTS[0].id;
  Manager.selectEvent(selectedId);
  renderCards();

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_PROGRESSION = {
    version: VERSION,
    get profile() { return profile; },
    get selectedId() { return selectedId; },
    selectEvent,
    renderCards,
    storageKey: PROFILE_KEY,
    localOnly: true,
    resetProfile() {
      profile = Core.createProfile();
      selectedId = Core.EVENTS[0].id;
      lastOutcome = null;
      persist();
      Manager.selectEvent(selectedId);
      renderCards();
      if (resultSummary) resultSummary.style.display = 'none';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
