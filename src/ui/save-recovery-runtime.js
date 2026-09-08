// V0.11.15 save/recovery center. Browser-local UI only; secrets are excluded by policy.
(function (root) {
  'use strict';

  const Core = root.JETSKI_SAVE_RECOVERY_CORE;
  if (!Core || typeof document === 'undefined') return;

  const VERSION = 'V0.11.15';
  let pendingResetUntil = 0;

  const style = document.createElement('style');
  style.textContent = `
    .jr-save-panel{position:fixed;inset:0;z-index:82;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(1,8,16,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
    .jr-save-panel.show{display:flex}.jr-save-card{width:min(640px,92vw);max-height:84vh;overflow:auto;padding:26px;border:1px solid rgba(255,255,255,.18);border-radius:24px;background:linear-gradient(145deg,rgba(5,28,45,.98),rgba(3,17,31,.96));box-shadow:0 30px 90px rgba(0,0,0,.45)}
    .jr-save-title{font-size:clamp(30px,6vw,48px);font-weight:950;line-height:1}.jr-save-copy{font-size:12px;line-height:1.65;opacity:.72;margin:12px 0 18px}.jr-save-actions{display:flex;gap:9px;flex-wrap:wrap}.jr-save-note{font-size:10px;line-height:1.55;opacity:.56;margin-top:16px}.jr-save-status{min-height:20px;margin-top:14px;font-size:11px;font-weight:850;color:#aef4ff}.jr-save-danger{border-color:rgba(255,111,111,.3)!important;background:rgba(255,76,76,.10)!important}
    @media(max-height:520px) and (orientation:landscape){.jr-save-panel{align-items:flex-start;padding-top:10px}.jr-save-card{padding:18px;max-height:calc(100vh - 20px)}.jr-save-copy{margin:8px 0 12px}.jr-save-actions .jr-btn{min-height:40px}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'jr-save-panel';
  panel.innerHTML = `
    <div class="jr-save-card">
      <div style="font-size:11px;font-weight:900;letter-spacing:.24em;color:#8fe9ff;margin-bottom:8px">LOCAL PROFILE</div>
      <div class="jr-save-title">SAVE & RECOVERY</div>
      <div class="jr-save-copy">Back up Championship progress, PB Ghosts, Garage rewards, Challenges and local preferences. Importing never includes your Google Maps Platform API key.</div>
      <div class="jr-save-actions">
        <button class="jr-btn primary" data-save-export>Export Backup</button>
        <button class="jr-btn" data-save-import>Import Backup</button>
        <button class="jr-btn jr-save-danger" data-save-reset>Reset Progress</button>
        <button class="jr-btn" data-save-close>Done</button>
      </div>
      <input data-save-file type="file" accept="application/json,.json" hidden>
      <div class="jr-save-status" data-save-status></div>
      <div class="jr-save-note">Stored only in this browser unless you export a backup. Graphics/audio preferences are preserved by Reset Progress. Sensitive keys and credentials are excluded from backup policy.</div>
    </div>`;
  document.body.appendChild(panel);

  const fileInput = panel.querySelector('[data-save-file]');
  const status = panel.querySelector('[data-save-status]');
  const resetButton = panel.querySelector('[data-save-reset]');

  function setStatus(message, error) {
    status.textContent = String(message || '');
    status.style.color = error ? '#ffb3b3' : '#aef4ff';
  }

  function openPanel() {
    pendingResetUntil = 0;
    resetButton.textContent = 'Reset Progress';
    setStatus('');
    panel.classList.add('show');
  }

  function closePanel() { panel.classList.remove('show'); }

  function backupObject() {
    return Core.createBackup(key => {
      try { return localStorage.getItem(key); } catch (_) { return null; }
    }, new Date().toISOString());
  }

  function exportBackup() {
    try {
      const backup = backupObject();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `swim-ring-racing-backup-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      const summary = Core.backupSummary(backup);
      setStatus(`Backup exported · ${summary.entries} local entries · API keys excluded`);
    } catch (_) {
      setStatus('Backup export failed in this browser.', true);
    }
  }

  function importBackupObject(input) {
    const entries = Core.restoreEntries(input);
    if (!entries) {
      setStatus('Invalid or unsupported backup file.', true);
      return false;
    }
    try {
      for (const { key, value } of entries) localStorage.setItem(key, value);
      setStatus(`Imported ${entries.length} entries. Reloading to apply…`);
      setTimeout(() => root.location.reload(), 650);
      return true;
    } catch (_) {
      setStatus('Import failed: browser storage is unavailable or full.', true);
      return false;
    }
  }

  function readImportFile(file) {
    if (!file || file.size > 2_500_000) {
      setStatus('Backup file is too large.', true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try { importBackupObject(JSON.parse(String(reader.result || ''))); }
      catch (_) { setStatus('Backup file is not valid JSON.', true); }
    };
    reader.onerror = () => setStatus('Could not read backup file.', true);
    reader.readAsText(file);
  }

  function resetProgress() {
    const now = Date.now();
    if (now > pendingResetUntil) {
      pendingResetUntil = now + 5000;
      resetButton.textContent = 'Confirm Reset';
      setStatus('Press Confirm Reset within 5 seconds. Graphics/audio preferences will stay.');
      return;
    }
    try {
      for (const key of Core.progressResetKeys()) localStorage.removeItem(key);
      pendingResetUntil = 0;
      resetButton.textContent = 'Reset Progress';
      setStatus('Progress reset. Reloading…');
      setTimeout(() => root.location.reload(), 650);
    } catch (_) {
      setStatus('Could not reset browser progress.', true);
    }
  }

  panel.querySelector('[data-save-export]').addEventListener('click', exportBackup);
  panel.querySelector('[data-save-import]').addEventListener('click', () => fileInput.click());
  panel.querySelector('[data-save-close]').addEventListener('click', closePanel);
  resetButton.addEventListener('click', resetProgress);
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (file) readImportFile(file);
    fileInput.value = '';
  });
  panel.addEventListener('click', event => { if (event.target === panel) closePanel(); });

  function installButton(screen) {
    const more = document.querySelector(`[data-v01114-more-panel="${screen}"]`);
    const actions = document.querySelector(`[data-jr-screen="${screen}"] .jr-actions`);
    const target = more || actions;
    if (!target || target.querySelector('[data-save-open]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'jr-btn';
    button.dataset.saveOpen = '1';
    button.textContent = 'Save Data';
    button.addEventListener('click', openPanel);
    target.appendChild(button);
  }

  installButton('menu');
  installButton('pause');

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_SAVE_RECOVERY = {
    version: VERSION,
    openPanel,
    closePanel,
    exportBackup,
    importBackupObject,
    backupObject,
    localOnly: true,
    sensitiveKeysExcluded: true,
    physicsUntouched: true,
    gameplayRulesUntouched: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
