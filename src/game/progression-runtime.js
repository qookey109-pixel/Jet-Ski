// V0.11.5 progression + race selection. Local-only persistence; no physics authority.
(function (root) {
  'use strict';
  const Core = root.JETSKI_PROGRESSION_CORE;
  const Race = root.JETSKI_RACE_COURSE;
  const Manager = root.JETSKI_RACE_MANAGER;
  if (!Core || !Race || !Manager) return;

  const VERSION = 'V0.11.5';
  const STORAGE = 'swimRing.progress.v0115';
  const defs = Race.COURSE_DEFINITIONS;
  let progress = Core.createProgress(defs);
  try { progress = Core.normalizeProgress(JSON.parse(localStorage.getItem(STORAGE) || 'null'), defs); } catch (_) {}

  function persist() { try { localStorage.setItem(STORAGE, JSON.stringify(progress)); } catch (_) {} }
  function formatTime(ms) { return Race.formatRaceTime(ms || 0); }

  const slot = document.querySelector('[data-jr-course-slot]');
  if (slot) {
    const style = document.createElement('style');
    style.textContent = `.jr-course-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.jr-course-card{min-height:108px;text-align:left;padding:12px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045);color:#fff;cursor:pointer}.jr-course-card.selected{border-color:#72e9ff;background:linear-gradient(145deg,rgba(22,142,185,.25),rgba(47,83,177,.18));box-shadow:0 0 0 1px rgba(114,233,255,.16) inset}.jr-course-card.locked{opacity:.42;cursor:not-allowed}.jr-course-name{font-size:13px;font-weight:950}.jr-course-meta{font-size:10px;opacity:.62;margin-top:5px;line-height:1.45}.jr-course-pb{font-size:10px;color:#9ff4ff;margin-top:8px;font-weight:800}.jr-progress-line{font-size:10px;opacity:.62;margin-top:10px}@media(max-width:720px){.jr-course-grid{grid-template-columns:1fr}.jr-course-card{min-height:82px}}`;
    document.head.appendChild(style);
  }

  function render() {
    if (!slot) return;
    slot.innerHTML = '';
    const grid = document.createElement('div'); grid.className = 'jr-course-grid';
    for (const def of defs) {
      const unlocked = Core.isUnlocked(progress, def);
      const selected = Manager.selectedDefinition && Manager.selectedDefinition.id === def.id;
      const button = document.createElement('button'); button.type = 'button'; button.className = `jr-course-card${selected?' selected':''}${unlocked?'':' locked'}`;
      const best = progress.personalBests[def.id];
      button.innerHTML = `<div class="jr-course-name">${unlocked ? '' : '🔒 '}${def.name}</div><div class="jr-course-meta">${def.laps} laps · ${def.worldMode === 'open-sea' ? 'Open Sea' : def.worldMode === 'hawaii-coast' ? 'Waikīkī' : 'Qixingtan'}</div><div class="jr-course-pb">${best ? `PB ${formatTime(best)}` : unlocked ? 'PB —' : 'Finish previous race to unlock'}</div>`;
      button.disabled = !unlocked;
      button.addEventListener('click', () => { if (Manager.setCourseDefinition(def.id)) render(); });
      grid.appendChild(button);
    }
    slot.appendChild(grid);
    const line = document.createElement('div'); line.className='jr-progress-line'; line.textContent = `Career ${Math.min(progress.unlockedCount, defs.length)} / ${defs.length} routes unlocked · ${progress.totalFinishes} finishes saved locally`;
    slot.appendChild(line);
  }

  root.addEventListener('jetski:race-finished', event => {
    const detail = event.detail || {}, def = detail.definition, state = detail.state || {};
    const result = Core.recordFinish(progress, def, state.elapsedMs, defs);
    progress = result.progress; persist(); render();
    const messages = [];
    if (result.personalBest) messages.push(`NEW PB · ${formatTime(state.elapsedMs)}`);
    if (result.unlockedId) messages.push(`UNLOCKED · ${Race.getCourseDefinition(result.unlockedId).name}`);
    if (messages.length) setTimeout(() => {
      const results = document.querySelector('[data-jr-screen="results"] .jr-card'); if (!results) return;
      let banner = results.querySelector('[data-jr-progression-banner]');
      if (!banner) { banner=document.createElement('div'); banner.dataset.jrProgressionBanner='1'; banner.style.cssText='margin:14px 0;padding:11px 13px;border-radius:14px;background:rgba(63,210,255,.11);border:1px solid rgba(105,227,255,.2);font-size:12px;font-weight:850;line-height:1.6;color:#baf5ff'; const actions=results.querySelector('.jr-actions'); results.insertBefore(banner,actions); }
      banner.textContent = messages.join(' · ');
    }, 0);
  });

  root.addEventListener('jetski:race-course-changed', render);
  render();

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_PROGRESSION = { version: VERSION, get progress(){return progress;}, render, reset(){progress=Core.resetProgress(defs);persist();Manager.setCourseDefinition(defs[0].id);render();}, localOnly:true, physicsUntouched:true };
})(typeof window !== 'undefined' ? window : globalThis);
