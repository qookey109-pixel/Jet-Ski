// V0.11.6 Race selection + championship progression UI/runtime.
(function (root) {
  'use strict';

  const Core = root.JETSKI_PROGRESSION_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  const Race = root.JETSKI_RACE_COURSE;
  if (!Core || !Manager || !Race || typeof document === 'undefined') return;

  const VERSION = 'V0.11.6';
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
    .jr-event-select{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:18px 0 22px}
    .jr-event-card{appearance:none;text-align:left;min-height:108px;padding:12px;border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(255,255,255,.05);color:#fff;cursor:pointer;transition:.18s transform,.18s border-color,.18s background}
    .jr-event-card:hover:not(:disabled),.jr-event-card:focus-visible:not(:disabled){transform:translateY(-2px);border-color:rgba(143,233,255,.5);outline:none}
    .jr-event-card.selected{border-color:#72e9ff;background:linear-gradient(145deg,rgba(28,175,227,.22),rgba(76,104,255,.12));box-shadow:inset 0 0 0 1px rgba(114,233,255,.12)}
    .jr-event-card.finale{background:linear-gradient(145deg,rgba(255,183,59,.10),rgba(255,255,255,.045))}
    .jr-event-card:disabled{cursor:not-allowed;opacity:.46;filter:saturate(.55)}
    .jr-event-name{font-size:13px;font-weight:950;line-height:1.2;margin-bottom:6px}
    .jr-event-sub{font-size:10px;line-height:1.35;opacity:.64;min-height:28px}
    .jr-event-meta{display:flex;justify-content:space-between;gap:6px;margin-top:9px;font-size:10px;font-weight:850;color:#aeeeff}
    .jr-tour-status{font-size:10px;font-weight:850;letter-spacing:.11em;color:#aeeeff;margin-top:-9px;margin-bottom:8px;text-transform:uppercase}
    .jr-progression-result{margin:4px 0 20px;padding:14px 15px;border-radius:16px;background:rgba(91,220,255,.07);border:1px solid rgba(126,229,255,.13);font-size:12px;line-height:1.65}
    .jr-progression-result strong{color:#b7f5ff}
    .jr-ending{position:fixed;inset:0;z-index:85;display:none;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at 50% 35%,rgba(9,79,117,.72),rgba(1,8,16,.96) 62%);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff;text-align:center}
    .jr-ending.show{display:flex}
    .jr-ending-card{width:min(680px,90vw);padding:38px 28px;border:1px solid rgba(255,227,150,.25);border-radius:28px;background:linear-gradient(145deg,rgba(5,30,49,.88),rgba(2,14,27,.90));box-shadow:0 40px 120px rgba(0,0,0,.5)}
    .jr-ending-kicker{font-size:11px;font-weight:950;letter-spacing:.35em;color:#ffd98a;text-transform:uppercase}
    .jr-ending-title{font-size:clamp(46px,10vw,92px);font-weight:1000;line-height:.9;margin:12px 0;text-shadow:0 18px 60px rgba(0,0,0,.45)}
    .jr-ending-tier{font-size:18px;font-weight:950;color:#aef4ff;margin:12px 0}
    .jr-ending-stats{font-size:13px;line-height:1.8;opacity:.76;margin:20px 0 26px}
    .jr-ending-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
    @media(max-width:720px){.jr-event-select{grid-template-columns:1fr}.jr-event-card{min-height:82px}.jr-event-sub{min-height:0}.jr-ending-card{padding:30px 20px}}
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

  const ending = document.createElement('div');
  ending.className = 'jr-ending';
  ending.innerHTML = `
    <div class="jr-ending-card">
      <div class="jr-ending-kicker">Journey Complete</div>
      <div class="jr-ending-title">PACIFIC<br>CROWN</div>
      <div class="jr-ending-tier" data-ending-tier></div>
      <div class="jr-ending-stats" data-ending-stats></div>
      <div class="jr-ending-actions">
        <button class="jr-btn primary" data-ending-continue>Continue Racing</button>
        <button class="jr-btn" data-ending-menu>Main Menu</button>
      </div>
    </div>`;
  document.body.appendChild(ending);
  const endingTier = ending.querySelector('[data-ending-tier]');
  const endingStats = ending.querySelector('[data-ending-stats]');

  function formatBest(ms) {
    return Number.isFinite(ms) && ms > 0 ? Race.formatRaceTime(ms) : '—';
  }

  function updateSelectedCopy() {
    const event = Core.getEvent(selectedId);
    if (kicker) kicker.textContent = `${VERSION} · ${event.name}`;
    if (subtitle) subtitle.textContent = `${event.subtitle}. ${event.laps} lap${event.laps === 1 ? '' : 's'} against three rivals. Finish to progress; place higher to earn more stars.`;
  }

  function renderCards() {
    if (!eventSelect) return;
    eventSelect.innerHTML = '';
    const completed = Core.EVENTS.filter(event => (profile.completions[event.id] || 0) > 0).length;
    const stars = Core.totalStars(profile);
    tourStatus.textContent = `Championship ${completed} / ${Core.EVENTS.length} · ★${stars}/${Core.EVENTS.length * 3} · ${Core.championshipTier(profile)}`;

    for (const event of Core.EVENTS) {
      const unlocked = Core.isUnlocked(profile, event.id);
      const selected = event.id === selectedId;
      const eventStars = profile.stars[event.id] || 0;
      const best = profile.bestTimes[event.id];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `jr-event-card${selected ? ' selected' : ''}${event.finale ? ' finale' : ''}`;
      button.disabled = !unlocked;
      button.dataset.eventId = event.id;
      button.innerHTML = `
        <div class="jr-event-name">${event.finale ? '🏆 ' : ''}${unlocked ? '' : '🔒 '}${event.name}</div>
        <div class="jr-event-sub">${event.subtitle}</div>
        <div class="jr-event-meta"><span>${unlocked ? `★${eventStars}/3` : 'LOCKED'}</span><span>PB ${formatBest(best)}</span></div>`;
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

  function showEnding() {
    const tier = Core.championshipTier(profile);
    const stars = Core.totalStars(profile);
    endingTier.textContent = `CHAMPIONSHIP TIER · ${tier}`;
    endingStats.innerHTML = `Total Stars <strong>${stars} / ${Core.EVENTS.length * 3}</strong><br>Total Finishes <strong>${profile.totalFinishes || 0}</strong><br>All four championship events completed`;
    ending.classList.add('show');
  }

  function hideEnding() {
    ending.classList.remove('show');
  }

  ending.querySelector('[data-ending-continue]').addEventListener('click', hideEnding);
  ending.querySelector('[data-ending-menu]').addEventListener('click', () => {
    hideEnding();
    Manager.showMainMenu();
  });

  function renderOutcome() {
    if (!resultSummary || !lastOutcome) return;
    const event = Core.getEvent(lastOutcome.eventId);
    const unlock = lastOutcome.unlockedEventId ? Core.getEvent(lastOutcome.unlockedEventId) : null;
    const lines = [
      `<strong>${event.name}</strong> · P${lastOutcome.placement} · ${lastOutcome.starsEarned}★`,
      `${lastOutcome.newBest ? 'NEW PB' : 'PB'} ${formatBest(profile.bestTimes[event.id])}`
    ];
    if (unlock) lines.push(`🔓 Unlocked: <strong>${unlock.name}</strong>`);
    if (Core.campaignComplete(profile)) lines.push(`🏆 <strong>CHAMPIONSHIP COMPLETE</strong> · ${Core.championshipTier(profile)} · ★${Core.totalStars(profile)}/${Core.EVENTS.length * 3}`);
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

    if (event.finale && Core.campaignComplete(profile)) setTimeout(showEnding, 550);
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
    showEnding,
    hideEnding,
    storageKey: PROFILE_KEY,
    localOnly: true,
    resetProfile() {
      profile = Core.createProfile();
      selectedId = Core.EVENTS[0].id;
      lastOutcome = null;
      hideEnding();
      persist();
      Manager.selectEvent(selectedId);
      renderCards();
      if (resultSummary) resultSummary.style.display = 'none';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
