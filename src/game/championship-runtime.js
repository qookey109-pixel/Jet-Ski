// V0.11.6 Coast Championship runtime. Sequential 3-race cup layered on V0.11.5 progression.
(function (root) {
  'use strict';
  const Core = root.JETSKI_CHAMPIONSHIP_CORE;
  const ProgressionCore = root.JETSKI_PROGRESSION_CORE;
  const Progression = root.JETSKI_PROGRESSION;
  const Manager = root.JETSKI_RACE_MANAGER;
  const AI = root.JETSKI_RACE_AI;
  if (!Core || !ProgressionCore || !Progression || !Manager || !AI || typeof document === 'undefined') return;

  const VERSION = 'V0.11.6';
  const STORAGE = 'swimRing.championship.v0116';
  const EVENT_IDS = ProgressionCore.EVENTS.map(event => event.id);
  const RACER_IDS = ['player', 'coral', 'tide', 'mango'];
  let records = Core.createRecords();
  let championship = Core.createChampionship(EVENT_IDS, RACER_IDS);
  let awaitingAdvance = false;
  let internalSelection = false;

  try { records = Core.sanitizeRecords(JSON.parse(localStorage.getItem(STORAGE) || 'null')); } catch (_) {}
  function persist() { try { localStorage.setItem(STORAGE, JSON.stringify(records)); } catch (_) {} }
  function eligible() { return ProgressionCore.campaignComplete(Progression.profile); }
  function currentEventId() { return EVENT_IDS[Math.min(championship.stageIndex, EVENT_IDS.length - 1)] || EVENT_IDS[0]; }

  const style = document.createElement('style');
  style.textContent = `
    .jr-championship-panel{margin:13px 0 2px;padding:13px 14px;border-radius:16px;background:linear-gradient(145deg,rgba(255,190,58,.11),rgba(84,111,255,.08));border:1px solid rgba(255,215,111,.16);font-size:11px;line-height:1.55}
    .jr-championship-title{font-size:12px;font-weight:950;color:#ffe2a0;letter-spacing:.08em}.jr-championship-meta{opacity:.68;margin-top:4px}.jr-championship-table{display:grid;grid-template-columns:1.5fr .7fr .7fr;gap:5px 10px;margin-top:10px;font-size:11px}.jr-championship-table strong{color:#fff}.jr-championship-table .you{color:#aef3ff;font-weight:900}
  `;
  document.head.appendChild(style);

  const menuActions = document.querySelector('[data-jr-screen="menu"] .jr-actions');
  const menuCard = document.querySelector('[data-jr-screen="menu"] .jr-card');
  const resultsActions = document.querySelector('[data-jr-screen="results"] .jr-actions');
  const resultsCard = document.querySelector('[data-jr-screen="results"] .jr-card');

  const champPanel = document.createElement('div'); champPanel.className = 'jr-championship-panel';
  const champButton = document.createElement('button'); champButton.type = 'button'; champButton.className = 'jr-btn'; champButton.textContent = '🏆 Coast Championship';
  if (menuCard && menuActions) menuCard.insertBefore(champPanel, menuActions);
  if (menuActions) menuActions.prepend(champButton);

  const stageButton = document.createElement('button'); stageButton.type = 'button'; stageButton.className = 'jr-btn primary'; stageButton.style.display = 'none';
  if (resultsActions) resultsActions.prepend(stageButton);

  const champResult = document.createElement('div'); champResult.className = 'jr-championship-panel'; champResult.style.display = 'none';
  if (resultsCard && resultsActions) resultsCard.insertBefore(champResult, resultsActions);

  function nameFor(id) {
    if (id === 'player') return 'YOU';
    const racer = AI.racers && AI.racers.find(entry => entry.agent && entry.agent.id === id);
    return racer && racer.agent ? racer.agent.name : String(id).toUpperCase();
  }

  function renderStandings(target) {
    const rows = Core.standingsArray(championship);
    target.innerHTML = `<div class="jr-championship-title">COAST CHAMPIONSHIP · ${Math.min(championship.stageIndex, EVENT_IDS.length)} / ${EVENT_IDS.length}</div>`;
    const table = document.createElement('div'); table.className = 'jr-championship-table';
    table.innerHTML = '<span>RACER</span><span>PTS</span><span>WINS</span>' + rows.map(row => `<span class="${row.id==='player'?'you':''}">${nameFor(row.id)}</span><strong>${row.points}</strong><span>${row.wins}</span>`).join('');
    target.appendChild(table);
  }

  function renderMenu() {
    const unlocked = eligible();
    champButton.disabled = !unlocked;
    champButton.textContent = unlocked ? '🏆 Coast Championship' : '🔒 Championship';
    if (!unlocked) champPanel.innerHTML = '<div class="jr-championship-title">COAST CHAMPIONSHIP LOCKED</div><div class="jr-championship-meta">Finish all three Coast Tour events to unlock the 3-stage championship.</div>';
    else champPanel.innerHTML = `<div class="jr-championship-title">COAST CHAMPIONSHIP</div><div class="jr-championship-meta">3 stages · 10/7/5/3 points · Best ${records.bestPoints || 0} pts · Wins ${records.championshipWins || 0}</div>`;
  }

  function startStage() {
    const eventId = currentEventId();
    internalSelection = true;
    Manager.selectEvent(eventId);
    internalSelection = false;
    awaitingAdvance = false;
    stageButton.style.display = 'none';
    champResult.style.display = 'none';
    Manager.startRace(eventId);
  }

  function startChampionship() {
    if (!eligible()) return false;
    championship = Core.createChampionship(EVENT_IDS, RACER_IDS);
    championship.active = true;
    championship.complete = false;
    awaitingAdvance = false;
    startStage();
    return true;
  }

  function cancelChampionship() {
    championship.active = false;
    awaitingAdvance = false;
    stageButton.style.display = 'none';
  }

  function rankedIds() {
    const ranked = typeof AI.rankedEntries === 'function' ? AI.rankedEntries() : [];
    return ranked.length ? ranked.map(entry => entry.id) : ['player','coral','tide','mango'];
  }

  function renderStageResult(eventId) {
    champResult.style.display = '';
    renderStandings(champResult);
    const event = ProgressionCore.getEvent(eventId);
    const note = document.createElement('div'); note.className = 'jr-championship-meta'; note.textContent = `${event.name} complete · points added to championship standings.`; champResult.appendChild(note);
  }

  function finishChampionship() {
    const recorded = Core.recordChampionship(records, championship, 'player');
    records = recorded.records; persist();
    champResult.style.display = '';
    renderStandings(champResult);
    const title = document.createElement('div'); title.className='jr-championship-title'; title.style.marginTop='12px';
    title.textContent = recorded.placement === 1 ? '🏆 COAST CHAMPION' : `CHAMPIONSHIP COMPLETE · P${recorded.placement}`;
    champResult.appendChild(title);
    const meta = document.createElement('div'); meta.className='jr-championship-meta'; meta.textContent=`${recorded.points} points · Best ${records.bestPoints} · Championships ${records.championshipsCompleted} · Wins ${records.championshipWins}`; champResult.appendChild(meta);
    stageButton.style.display='none';
    renderMenu();
  }

  champButton.addEventListener('click', startChampionship);
  stageButton.addEventListener('click', () => { if (championship.active && awaitingAdvance) startStage(); });

  root.addEventListener('jetski:race-selected', event => {
    if (!championship.active || internalSelection) return;
    const selected = event && event.detail && event.detail.eventId;
    if (selected !== currentEventId()) cancelChampionship();
  });

  root.addEventListener('jetski:race-ready', event => {
    if (!championship.active) return;
    const eventId = event && event.detail && event.detail.eventId;
    if (awaitingAdvance || eventId !== currentEventId()) cancelChampionship();
  });

  root.addEventListener('jetski:race-finished', event => {
    if (!championship.active) { renderMenu(); return; }
    const detail = event && event.detail;
    if (!detail || !detail.finished || detail.eventId !== currentEventId()) { cancelChampionship(); return; }
    const finishedEventId = detail.eventId;
    Core.addStageResult(championship, finishedEventId, rankedIds());
    setTimeout(() => {
      renderStageResult(finishedEventId);
      const progressionNext = document.querySelector('[data-next-race]') || [...document.querySelectorAll('[data-jr-screen="results"] .jr-btn')].find(button => /^Next ·/.test(button.textContent || ''));
      if (progressionNext) progressionNext.style.display = 'none';
      if (championship.complete) {
        finishChampionship();
      } else {
        awaitingAdvance = true;
        const nextEvent = ProgressionCore.getEvent(currentEventId());
        stageButton.textContent = `Championship Next · ${nextEvent.name}`;
        stageButton.style.display = '';
      }
    }, 0);
  });

  renderMenu();
  const versionNode = document.querySelector('#version'); if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_CHAMPIONSHIP = {
    version: VERSION,
    get state(){ return championship; },
    get records(){ return records; },
    startChampionship,
    cancelChampionship,
    eligible,
    storageKey: STORAGE,
    physicsUntouched: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
