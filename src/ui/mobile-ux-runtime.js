// V0.11.14 mobile landscape / HUD / menu polish. UI observer only.
(function (root) {
  'use strict';

  const Core = root.JETSKI_MOBILE_UX_CORE;
  const Manager = root.JETSKI_RACE_MANAGER;
  if (!Core || typeof document === 'undefined') return;

  const VERSION = 'V0.11.14';
  const body = document.body;
  let profile = Core.viewportProfile(root.innerWidth, root.innerHeight, false);
  let lastPhase = '';

  const style = document.createElement('style');
  style.textContent = `
    :root{--jr-safe-top:env(safe-area-inset-top,0px);--jr-safe-right:env(safe-area-inset-right,0px);--jr-safe-bottom:env(safe-area-inset-bottom,0px);--jr-safe-left:env(safe-area-inset-left,0px)}
    body.v01114-ux .hud{top:calc(12px + var(--jr-safe-top));left:calc(12px + var(--jr-safe-left));max-width:min(300px,42vw)}
    body.v01114-ux .help{top:calc(12px + var(--jr-safe-top));right:calc(12px + var(--jr-safe-right));max-width:48vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    body.v01114-ux .physics-controls{right:calc(12px + var(--jr-safe-right))}
    body.v01114-ux .world-controls{max-width:calc(100vw - var(--jr-safe-left) - var(--jr-safe-right) - 24px)}
    body.v01114-ux .mobile-controls{left:var(--jr-safe-left);right:var(--jr-safe-right);bottom:calc(12px + var(--jr-safe-bottom));padding-left:12px;padding-right:12px}
    body.v01114-ux .mobile-controls button{touch-action:none;-webkit-tap-highlight-color:transparent}

    body.v01114-race-focus .physics-controls,
    body.v01114-race-focus .world-controls,
    body.v01114-race-focus .sea-controls,
    body.v01114-race-focus .help,
    body.v01114-race-focus .v01114-dev-overlay{display:none!important}
    body[data-v01114-phase="menu"] .v01114-dev-overlay{display:none!important}
    body.v01114-race-focus .hud{padding:7px 10px;border-radius:999px;line-height:1.2;background:rgba(2,18,31,.58);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
    body.v01114-race-focus .hud>div{display:none}
    body.v01114-race-focus .hud>div:nth-child(2){display:block;font-size:12px;font-weight:900;white-space:nowrap}

    body.v01114-ux .jr-hud{top:calc(10px + var(--jr-safe-top));max-width:calc(100vw - var(--jr-safe-left) - var(--jr-safe-right) - 132px)}
    body.v01114-ux .jr-screen{padding-left:calc(18px + var(--jr-safe-left));padding-right:calc(18px + var(--jr-safe-right));padding-bottom:calc(18px + var(--jr-safe-bottom))}
    body.v01114-ux .jr-card{max-height:calc(100dvh - var(--jr-safe-top) - var(--jr-safe-bottom) - 28px);overflow:auto;overscroll-behavior:contain}
    body.v01114-ux .jr-btn{min-height:46px}
    body.v01114-ux .v01114-action-main{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    body.v01114-ux .v01114-more{position:relative;display:inline-flex}
    body.v01114-ux .v01114-more-panel{display:none;width:100%;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px solid rgba(255,255,255,.09)}
    body.v01114-ux .v01114-more-panel.show{display:flex}
    body.v01114-ux .v01114-more-panel .jr-btn{background:rgba(255,255,255,.055);font-size:12px;padding-inline:14px}
    body.v01114-ux .v01114-more-toggle::after{content:' ···';opacity:.65}
    body.v01114-ux .v01114-more-toggle[aria-expanded="true"]::after{content:' ×'}
    body.v01114-ux .v01114-hud-secondary{transition:.16s opacity}

    .v01114-rotate{position:fixed;inset:0;z-index:120;display:none;align-items:center;justify-content:center;padding:28px;background:radial-gradient(circle at 50% 38%,rgba(8,77,113,.94),rgba(1,9,18,.98) 68%);color:#fff;text-align:center;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .v01114-rotate.show{display:flex}.v01114-rotate-card{max-width:390px}.v01114-rotate-icon{font-size:58px;margin-bottom:12px}.v01114-rotate-title{font-size:26px;font-weight:950}.v01114-rotate-copy{font-size:13px;line-height:1.6;opacity:.75;margin-top:9px}

    body.v01114-compact-landscape .hud{top:calc(7px + var(--jr-safe-top));left:calc(7px + var(--jr-safe-left))}
    body.v01114-compact-landscape .jr-hud{top:calc(6px + var(--jr-safe-top));gap:8px;padding:6px 9px;max-width:calc(100vw - var(--jr-safe-left) - var(--jr-safe-right) - 118px)}
    body.v01114-compact-landscape .jr-hud-label{display:none}
    body.v01114-compact-landscape .jr-hud-value{font-size:11px}
    body.v01114-phone-landscape .v01114-hud-secondary{display:none!important}
    body.v01114-compact-landscape .jr-screen{align-items:flex-start;padding-top:calc(8px + var(--jr-safe-top));overflow:auto}
    body.v01114-compact-landscape .jr-card{width:min(760px,94vw);padding:18px 18px 16px;border-radius:20px;max-height:calc(100dvh - var(--jr-safe-top) - var(--jr-safe-bottom) - 16px)}
    body.v01114-compact-landscape .jr-title{font-size:clamp(30px,8vh,48px)}
    body.v01114-compact-landscape .jr-sub{font-size:12px;margin:10px 0 14px;line-height:1.45}
    body.v01114-compact-landscape .jr-actions{gap:7px}
    body.v01114-compact-landscape .jr-btn{min-height:40px;padding:8px 13px;font-size:12px}
    body.v01114-compact-landscape .jr-result-grid{margin:10px 0 14px;gap:6px}.v01114-compact-landscape .jr-stat{padding:9px}.v01114-compact-landscape .jr-stat strong{font-size:14px}
    body.v01114-compact-landscape .mobile-controls{bottom:calc(7px + var(--jr-safe-bottom));padding-left:7px;padding-right:7px}
    body.v01114-compact-landscape .mobile-controls button{min-width:58px;min-height:48px;border-radius:16px;font-size:14px}
    body.v01114-touch .mobile-controls button{min-height:52px}

    @media(orientation:landscape) and (max-height:520px){
      body.v01114-ux .world-controls{bottom:calc(102px + var(--jr-safe-bottom))}
      body.v01114-ux .sea-controls{bottom:calc(62px + var(--jr-safe-bottom))}
    }
  `;
  document.head.appendChild(style);

  const rotateOverlay = document.createElement('div');
  rotateOverlay.className = 'v01114-rotate';
  rotateOverlay.setAttribute('aria-live', 'polite');
  rotateOverlay.innerHTML = '<div class="v01114-rotate-card"><div class="v01114-rotate-icon">↻</div><div class="v01114-rotate-title">Rotate to Landscape</div><div class="v01114-rotate-copy">Swim Ring Racing is designed mobile-landscape first. Rotate your device for clear race HUD, steering and throttle space.</div></div>';
  document.body.appendChild(rotateOverlay);

  function coarsePointer() {
    try { return Boolean(root.matchMedia && root.matchMedia('(pointer: coarse)').matches); } catch (_) { return false; }
  }

  function tagHudItems() {
    const mappings = [
      ['[data-jr-best]', 'v01114-hud-secondary'],
      ['[data-jr-ghost-delta]', 'v01114-hud-secondary']
    ];
    for (const [selector, className] of mappings) {
      const value = document.querySelector(selector);
      const item = value && value.closest && value.closest('.jr-hud-item');
      if (item) item.classList.add(className);
    }
  }

  function tagDeveloperOverlays() {
    const disasterPanel = document.querySelector('[aria-label="natural disaster experimental controls"]');
    if (disasterPanel) disasterPanel.classList.add('v01114-dev-overlay');
    for (const node of Array.from(document.body.children)) {
      if (!node || node === rotateOverlay || node.classList.contains('v01114-dev-overlay')) continue;
      const text = String(node.textContent || '');
      const hasCapture = /Capture 8s/.test(text) && /Capture/.test(text);
      const hasGuided = /Guided Test/.test(text) && /Guided/.test(text);
      if (hasCapture || hasGuided) node.classList.add('v01114-dev-overlay');
    }
  }

  function upgradeActionGroup(screen) {
    const actions = document.querySelector(`[data-jr-screen="${screen}"] .jr-actions`);
    if (!actions || actions.dataset.v01114Upgraded === '1') return;
    actions.dataset.v01114Upgraded = '1';
    actions.classList.add('v01114-action-main');

    const secondary = document.createElement('div');
    secondary.className = 'v01114-more-panel';
    secondary.dataset.v01114MorePanel = screen;

    const candidates = Array.from(actions.children).filter(node => node.tagName === 'BUTTON');
    for (const button of candidates) {
      const nativeAction = button.dataset && button.dataset.jrAction;
      const tier = Core.actionTier(nativeAction, Boolean(nativeAction));
      if (tier === 'secondary') secondary.appendChild(button);
    }
    if (!secondary.children.length) return;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'jr-btn v01114-more-toggle';
    toggle.textContent = 'More';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      secondary.classList.toggle('show', !expanded);
    });
    actions.appendChild(toggle);
    actions.insertAdjacentElement('afterend', secondary);
  }

  function refreshActions() {
    upgradeActionGroup('menu');
    upgradeActionGroup('pause');
  }

  function currentPhase() {
    return Manager && Manager.state ? String(Manager.state.phase || '') : 'menu';
  }

  function applyPhase() {
    const phase = currentPhase();
    if (phase === lastPhase) return;
    lastPhase = phase;
    body.classList.toggle('v01114-race-focus', Core.isRaceFocusedPhase(phase));
    body.dataset.v01114Phase = phase;
  }

  function applyViewport() {
    profile = Core.viewportProfile(root.innerWidth, root.innerHeight, coarsePointer());
    const hud = Core.compactHudPolicy(profile);
    body.classList.add('v01114-ux');
    body.classList.toggle('v01114-compact-landscape', profile.compactHeight && profile.landscape);
    body.classList.toggle('v01114-phone-landscape', profile.phoneLandscape);
    body.classList.toggle('v01114-touch', profile.touchFirst);
    rotateOverlay.classList.toggle('show', profile.shouldSuggestRotate);
    document.documentElement.style.setProperty('--jr-touch-target', `${hud.touchTargetsPx}px`);
    tagHudItems();
    tagDeveloperOverlays();
  }

  applyViewport();
  tagDeveloperOverlays();
  applyPhase();
  refreshActions();
  root.addEventListener('resize', applyViewport, { passive: true });
  root.addEventListener('orientationchange', () => setTimeout(applyViewport, 120), { passive: true });
  root.addEventListener('jetski:race-ready', applyPhase);
  root.addEventListener('jetski:race-finished', applyPhase);
  root.addEventListener('jetski:race-selected', refreshActions);

  // Race Manager does not currently emit every phase transition. A low-frequency UI-only
  // observer keeps the layout in sync without touching the gameplay/physics RAF path.
  const phaseTimer = root.setInterval(() => {
    tagDeveloperOverlays();
    applyPhase();
    refreshActions();
    tagHudItems();
  }, 250);

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_MOBILE_UX = {
    version: VERSION,
    get profile() { return profile; },
    applyViewport,
    applyPhase,
    refreshActions,
    tagDeveloperOverlays,
    phasePollMs: 250,
    uiObserverOnly: true,
    physicsUntouched: true,
    gameplayRulesUntouched: true,
    dispose() { root.clearInterval(phaseTimer); }
  };
})(typeof window !== 'undefined' ? window : globalThis);