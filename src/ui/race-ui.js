// V0.11.0 Minimal cinematic race UI. DOM only; no physics/gameplay authority.
(function (root) {
  'use strict';

  function createRaceUI(options) {
    const opts = options || {};
    const formatTime = typeof opts.formatTime === 'function' ? opts.formatTime : (ms => String(ms || 0));

    const style = document.createElement('style');
    style.textContent = `
      .jr-ui{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff;letter-spacing:.02em}
      .jr-screen{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(2,12,22,.42),rgba(1,9,18,.78));backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
      .jr-screen.show{display:flex}
      .jr-card{width:min(620px,88vw);padding:34px 34px 28px;border:1px solid rgba(255,255,255,.18);border-radius:24px;background:linear-gradient(145deg,rgba(5,28,45,.84),rgba(3,17,31,.68));box-shadow:0 30px 90px rgba(0,0,0,.36),inset 0 1px rgba(255,255,255,.12)}
      .jr-kicker{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.28em;color:#8fe9ff;margin-bottom:10px}
      .jr-title{font-size:clamp(34px,7vw,68px);font-weight:950;line-height:.92;margin:0;text-shadow:0 10px 36px rgba(0,0,0,.35)}
      .jr-sub{font-size:14px;opacity:.78;margin:16px 0 26px;line-height:1.6}
      .jr-actions{display:flex;gap:10px;flex-wrap:wrap}
      .jr-btn{appearance:none;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:12px 18px;background:rgba(255,255,255,.08);color:#fff;font-weight:850;cursor:pointer;transition:.18s transform,.18s background,.18s border-color;min-height:44px}
      .jr-btn:hover,.jr-btn:focus-visible{transform:translateY(-1px);background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.4);outline:none}
      .jr-btn.primary{background:linear-gradient(135deg,#10c8ff,#4a7dff);border-color:transparent;box-shadow:0 12px 32px rgba(37,154,255,.28)}
      .jr-btn.danger{background:rgba(255,76,76,.15)}
      .jr-hud{position:fixed;top:14px;left:50%;z-index:25;transform:translateX(-50%);display:none;align-items:center;gap:18px;padding:9px 15px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(2,18,31,.52);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 8px 30px rgba(0,0,0,.2);pointer-events:none}
      .jr-hud.show{display:flex}
      .jr-hud-item{display:flex;gap:7px;align-items:baseline;white-space:nowrap}
      .jr-hud-label{font-size:9px;opacity:.55;font-weight:900;letter-spacing:.18em}
      .jr-hud-value{font-size:14px;font-weight:950}
      .jr-target{color:#9ff4ff}
      .jr-countdown{position:fixed;inset:0;z-index:35;display:none;align-items:center;justify-content:center;pointer-events:none;font:950 clamp(76px,18vw,180px)/1 Inter,-apple-system,sans-serif;text-shadow:0 18px 70px rgba(0,0,0,.5)}
      .jr-countdown.show{display:flex;animation:jr-pop .24s ease-out}
      @keyframes jr-pop{from{transform:scale(.72);opacity:.3}to{transform:scale(1);opacity:1}}
      .jr-toast{position:fixed;left:50%;top:82px;z-index:28;transform:translate(-50%,-8px);opacity:0;pointer-events:none;padding:8px 14px;border-radius:999px;background:rgba(2,18,31,.72);border:1px solid rgba(255,255,255,.14);font-size:12px;font-weight:850;transition:.2s opacity,.2s transform}
      .jr-toast.show{opacity:1;transform:translate(-50%,0)}
      .jr-result-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:18px 0 24px}
      .jr-stat{padding:13px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
      .jr-stat small{display:block;font-size:9px;letter-spacing:.15em;opacity:.55;font-weight:900;margin-bottom:5px}
      .jr-stat strong{font-size:18px}
      .jr-controls{display:none;margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.1);font-size:12px;line-height:1.8;opacity:.82}
      .jr-controls.show{display:block}
      @media(max-width:720px){.jr-card{padding:24px 20px 20px}.jr-hud{top:8px;gap:9px;padding:7px 10px}.jr-hud-label{display:none}.jr-hud-value{font-size:12px}.jr-result-grid{grid-template-columns:1fr 1fr}.jr-screen{align-items:flex-start;padding-top:8vh;overflow:auto}}
    `;
    document.head.appendChild(style);

    const uiRoot = document.createElement('div');
    uiRoot.className = 'jr-ui';
    uiRoot.innerHTML = `
      <div class="jr-screen show" data-jr-screen="menu">
        <div class="jr-card">
          <div class="jr-kicker">V0.11.0 · Open Sea Circuit</div>
          <h1 class="jr-title">SWIM RING<br>RACING</h1>
          <div class="jr-sub">Two laps through eight ocean gates. Read the water, carry momentum, and keep the ring planted through rough sections.</div>
          <div class="jr-actions">
            <button class="jr-btn primary" data-jr-action="start">Start Race</button>
            <button class="jr-btn" data-jr-action="free">Free Ride</button>
            <button class="jr-btn" data-jr-action="controls">Controls</button>
          </div>
          <div class="jr-controls" data-jr-controls>
            <strong>W / ↑</strong> Gas · <strong>S / ↓</strong> Brake / Reverse · <strong>A D / ← →</strong> Steer · <strong>ESC</strong> Pause<br>
            Pass the glowing gate in order. Open Sea / Normal / 9-Point+ is locked during an active race for a stable baseline.
          </div>
        </div>
      </div>

      <div class="jr-hud" data-jr-hud>
        <div class="jr-hud-item"><span class="jr-hud-label">LAP</span><span class="jr-hud-value" data-jr-lap>1 / 2</span></div>
        <div class="jr-hud-item"><span class="jr-hud-label">GATE</span><span class="jr-hud-value jr-target" data-jr-gate>1 / 7</span></div>
        <div class="jr-hud-item"><span class="jr-hud-label">TIME</span><span class="jr-hud-value" data-jr-time>0:00.000</span></div>
        <div class="jr-hud-item"><span class="jr-hud-label">BEST</span><span class="jr-hud-value" data-jr-best>—</span></div>
      </div>

      <div class="jr-countdown" data-jr-countdown>3</div>
      <div class="jr-toast" data-jr-toast></div>

      <div class="jr-screen" data-jr-screen="pause">
        <div class="jr-card">
          <div class="jr-kicker">Race Paused</div>
          <h2 class="jr-title" style="font-size:clamp(34px,6vw,58px)">PAUSED</h2>
          <div class="jr-sub">The race clock and controls are held.</div>
          <div class="jr-actions">
            <button class="jr-btn primary" data-jr-action="resume">Resume</button>
            <button class="jr-btn" data-jr-action="restart">Restart Race</button>
            <button class="jr-btn" data-jr-action="menu">Main Menu</button>
          </div>
        </div>
      </div>

      <div class="jr-screen" data-jr-screen="results">
        <div class="jr-card">
          <div class="jr-kicker">Journey Complete</div>
          <h2 class="jr-title" style="font-size:clamp(36px,7vw,64px)">FINISH</h2>
          <div class="jr-result-grid">
            <div class="jr-stat"><small>TOTAL</small><strong data-jr-result-total>0:00.000</strong></div>
            <div class="jr-stat"><small>BEST LAP</small><strong data-jr-result-best>—</strong></div>
            <div class="jr-stat"><small>GATES</small><strong data-jr-result-gates>0</strong></div>
          </div>
          <div class="jr-actions">
            <button class="jr-btn primary" data-jr-action="restart">Race Again</button>
            <button class="jr-btn" data-jr-action="free">Free Ride</button>
            <button class="jr-btn" data-jr-action="menu">Main Menu</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(uiRoot);

    const screens = {
      menu: uiRoot.querySelector('[data-jr-screen="menu"]'),
      pause: uiRoot.querySelector('[data-jr-screen="pause"]'),
      results: uiRoot.querySelector('[data-jr-screen="results"]')
    };
    const hud = uiRoot.querySelector('[data-jr-hud]');
    const countdown = uiRoot.querySelector('[data-jr-countdown]');
    const toastEl = uiRoot.querySelector('[data-jr-toast]');
    const controls = uiRoot.querySelector('[data-jr-controls]');
    const lapEl = uiRoot.querySelector('[data-jr-lap]');
    const gateEl = uiRoot.querySelector('[data-jr-gate]');
    const timeEl = uiRoot.querySelector('[data-jr-time]');
    const bestEl = uiRoot.querySelector('[data-jr-best]');
    const resultTotal = uiRoot.querySelector('[data-jr-result-total]');
    const resultBest = uiRoot.querySelector('[data-jr-result-best]');
    const resultGates = uiRoot.querySelector('[data-jr-result-gates]');
    let toastTimer = 0;

    function hideScreens() {
      Object.values(screens).forEach(el => el.classList.remove('show'));
    }

    function showMenu() {
      hideScreens();
      screens.menu.classList.add('show');
      hud.classList.remove('show');
      setCountdown(null);
    }

    function showRaceHud() {
      hideScreens();
      hud.classList.add('show');
    }

    function showPause() {
      hideScreens();
      screens.pause.classList.add('show');
      hud.classList.add('show');
    }

    function showResults(data) {
      hideScreens();
      hud.classList.remove('show');
      screens.results.classList.add('show');
      const d = data || {};
      resultTotal.textContent = formatTime(d.elapsedMs || 0);
      resultBest.textContent = d.bestLapMs == null ? '—' : formatTime(d.bestLapMs);
      resultGates.textContent = String(d.checkpointsPassed || 0);
    }

    function updateHud(data) {
      const d = data || {};
      lapEl.textContent = `${d.lap || 1} / ${d.totalLaps || 1}`;
      const gate = d.nextCheckpointIndex === 0 ? 'FINISH' : `${d.nextCheckpointIndex || 1} / ${(d.checkpointCount || 8) - 1}`;
      gateEl.textContent = gate;
      timeEl.textContent = formatTime(d.elapsedMs || 0);
      bestEl.textContent = d.bestLapMs == null ? '—' : formatTime(d.bestLapMs);
    }

    function setCountdown(value) {
      if (value == null || value === '') {
        countdown.classList.remove('show');
        return;
      }
      countdown.textContent = String(value);
      countdown.classList.remove('show');
      void countdown.offsetWidth;
      countdown.classList.add('show');
    }

    function toast(message, duration) {
      clearTimeout(toastTimer);
      toastEl.textContent = message;
      toastEl.classList.add('show');
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration || 1100);
    }

    uiRoot.addEventListener('click', event => {
      const action = event.target && event.target.closest ? event.target.closest('[data-jr-action]') : null;
      if (!action) return;
      const type = action.dataset.jrAction;
      if (type === 'controls') {
        controls.classList.toggle('show');
        return;
      }
      const handler = opts[`on${type.charAt(0).toUpperCase()}${type.slice(1)}`];
      if (typeof handler === 'function') handler();
    });

    return { showMenu, showRaceHud, showPause, showResults, updateHud, setCountdown, toast, root: uiRoot };
  }

  root.JETSKI_RACE_UI = { version: 'V0.11.0', createRaceUI };
})(typeof window !== 'undefined' ? window : globalThis);
