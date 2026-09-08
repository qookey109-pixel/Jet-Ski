// V0.11.13 race intro + podium recap. UI/observer only; no gameplay writes.
(function (root) {
  'use strict';

  const Core = root.JETSKI_RACE_PRESENTATION_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  const Race = root.JETSKI_RACE_COURSE;
  if (!Core || !Manager || !Race || typeof document === 'undefined') return;

  const VERSION = 'V0.11.13';
  let introTimer = 0;

  const style = document.createElement('style');
  style.textContent = `
    .jr-event-intro{position:fixed;left:50%;top:13%;z-index:34;transform:translate(-50%,-8px);opacity:0;pointer-events:none;min-width:min(520px,80vw);padding:12px 18px;border-radius:18px;border:1px solid rgba(255,255,255,.15);background:rgba(2,18,31,.66);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);text-align:center;color:#fff;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:.22s opacity,.22s transform;box-shadow:0 18px 55px rgba(0,0,0,.24)}
    .jr-event-intro.show{opacity:1;transform:translate(-50%,0)}.jr-event-intro-name{font-size:clamp(18px,4vw,30px);font-weight:1000;line-height:1.05}.jr-event-intro-meta{font-size:10px;font-weight:850;letter-spacing:.13em;opacity:.68;margin-top:6px;text-transform:uppercase}
    .jr-result-placement{font-size:clamp(48px,11vw,92px);font-weight:1000;line-height:.85;margin:8px 0 2px;letter-spacing:-.05em}.jr-result-event{font-size:10px;font-weight:900;letter-spacing:.17em;text-transform:uppercase;opacity:.66;margin:6px 0 12px}
    .jr-standings{display:grid;gap:7px;margin:16px 0 20px}.jr-standing-row{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:10px;padding:9px 11px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045)}.jr-standing-row.player{border-color:rgba(143,233,255,.28);background:rgba(74,175,255,.09)}.jr-standing-place{font-size:16px;font-weight:1000}.jr-standing-name{font-size:11px;font-weight:900;letter-spacing:.06em}.jr-standing-status{font-size:10px;font-weight:850;opacity:.64;white-space:nowrap}
    @media(max-width:720px){.jr-event-intro{top:8%;min-width:76vw}.jr-standing-row{grid-template-columns:34px minmax(0,1fr) auto;padding:8px 9px}.jr-result-placement{font-size:50px}}
  `;
  document.head.appendChild(style);

  const intro = document.createElement('div');
  intro.className = 'jr-event-intro';
  intro.innerHTML = '<div class="jr-event-intro-name" data-present-intro-name></div><div class="jr-event-intro-meta" data-present-intro-meta></div>';
  document.body.appendChild(intro);
  const introName = intro.querySelector('[data-present-intro-name]');
  const introMeta = intro.querySelector('[data-present-intro-meta]');

  const resultsCard = document.querySelector('[data-jr-screen="results"] .jr-card');
  const resultKicker = resultsCard && resultsCard.querySelector('.jr-kicker');
  const resultTitle = resultsCard && resultsCard.querySelector('.jr-title');
  const resultGrid = resultsCard && resultsCard.querySelector('.jr-result-grid');

  const placementEl = document.createElement('div');
  placementEl.className = 'jr-result-placement';
  const eventEl = document.createElement('div');
  eventEl.className = 'jr-result-event';
  const standingsEl = document.createElement('div');
  standingsEl.className = 'jr-standings';
  if (resultsCard && resultTitle) {
    resultTitle.insertAdjacentElement('afterend', placementEl);
    placementEl.insertAdjacentElement('afterend', eventEl);
  }
  if (resultsCard && resultGrid) resultGrid.insertAdjacentElement('afterend', standingsEl);

  function selectedIdentity() {
    return Core.identity(Manager.selectedEvent || {});
  }

  function applyAccent(identity) {
    const accent = identity && identity.accent || Core.ACCENTS.open;
    intro.style.borderColor = accent.accent;
    intro.style.boxShadow = `0 18px 55px ${accent.glow}`;
    placementEl.style.color = accent.accent;
  }

  function showIntro() {
    clearTimeout(introTimer);
    const identity = selectedIdentity();
    applyAccent(identity);
    introName.textContent = identity.name;
    introMeta.textContent = `${identity.laps} LAP${identity.laps === 1 ? '' : 'S'} · 4 RACERS · P1 = 3★${identity.finale ? ' · CHAMPIONSHIP FINAL' : ''}`;
    intro.classList.add('show');
    introTimer = setTimeout(() => intro.classList.remove('show'), 2250);
  }

  function formatStatus(entry) {
    const status = Core.standingStatus(entry);
    if (status.type === 'time') return Race.formatRaceTime(status.value);
    if (status.type === 'finished') return 'FINISHED';
    return status.gate === 0 ? `LAP ${status.lap} · FINAL GATE` : `LAP ${status.lap} · GATE ${status.gate}`;
  }

  function renderStandings(entries) {
    standingsEl.innerHTML = '';
    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = `jr-standing-row${entry.isPlayer ? ' player' : ''}`;
      const place = document.createElement('div');
      place.className = 'jr-standing-place';
      place.textContent = `P${entry.place}`;
      const name = document.createElement('div');
      name.className = 'jr-standing-name';
      name.textContent = entry.name;
      const status = document.createElement('div');
      status.className = 'jr-standing-status';
      status.textContent = formatStatus(entry);
      row.append(place, name, status);
      standingsEl.appendChild(row);
    }
  }

  function renderResult(detail) {
    const d = detail || {};
    const ai = root.JETSKI_RACE_AI;
    const ranked = ai && typeof ai.rankedEntries === 'function' ? ai.rankedEntries() : [];
    const standings = Core.sanitizeStandings(ranked, d.elapsedMs);
    let placement = standings.findIndex(entry => entry.isPlayer) + 1;
    if (placement <= 0 && ai && typeof ai.getPlayerRank === 'function') placement = ai.getPlayerRank();
    const presentation = Core.placementPresentation(placement || 4);
    const identity = selectedIdentity();
    applyAccent(identity);

    if (resultKicker) resultKicker.textContent = presentation.kicker;
    if (resultTitle) resultTitle.textContent = presentation.headline;
    placementEl.textContent = presentation.label;
    eventEl.textContent = `${identity.name}${identity.finale ? ' · PACIFIC CROWN FINAL' : ''}`;
    renderStandings(standings);
  }

  root.addEventListener('jetski:race-ready', showIntro);
  root.addEventListener('jetski:race-finished', event => renderResult(event && event.detail));
  root.addEventListener('jetski:race-selected', () => {
    intro.classList.remove('show');
    applyAccent(selectedIdentity());
  });

  applyAccent(selectedIdentity());

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_RACE_PRESENTATION = {
    version: VERSION,
    showIntro,
    renderResult,
    uiOnly: true,
    observerOnly: true,
    physicsUntouched: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
