// V0.11.10 championship rewards + visual-only Garage/livery runtime.
(function (root) {
  'use strict';

  const Core = root.JETSKI_COSMETICS_CORE;
  const ProgressionCore = root.JETSKI_PROGRESSION_CORE;
  const THREE = root.THREE;
  if (!Core || !THREE || typeof document === 'undefined' || typeof ski === 'undefined') return;

  const VERSION = 'V0.11.10';
  const STORAGE = 'swimRing.livery.v01110';

  function totalStars() {
    const progression = root.JETSKI_PROGRESSION;
    const profile = progression && progression.profile;
    if (ProgressionCore && typeof ProgressionCore.totalStars === 'function') return ProgressionCore.totalStars(profile);
    if (!profile || !profile.stars) return 0;
    return Object.values(profile.stars).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  }

  let selectedId = Core.LIVERIES[0].id;
  try { selectedId = Core.sanitizeSelection(localStorage.getItem(STORAGE), totalStars()); } catch (_) {}
  let previousUnlockedCount = Core.unlockedLiveries(totalStars()).length;

  // main.js defines these as classic-script lexical bindings. Recolor the existing
  // craft materials directly so liveries do not add a second overlapping ring mesh.
  const craftPrimaryMaterial = typeof inflatableMat !== 'undefined' ? inflatableMat : null;
  const craftAccentMaterial = typeof stripeMat !== 'undefined' ? stripeMat : null;

  // A tiny badge is the only additional craft geometry. It appears only for the
  // championship livery and has no collision/shadow/gameplay role.
  const crownMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff0a3,
    emissive: 0x6b3a00,
    emissiveIntensity: 0.30,
    roughness: 0.32,
    metalness: 0.05
  });
  const crownBadge = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), crownMaterial);
  crownBadge.name = 'V01110PacificCrownBadge';
  crownBadge.position.set(0, 1.10, -1.54);
  crownBadge.rotation.z = Math.PI / 4;
  crownBadge.castShadow = false;
  crownBadge.receiveShadow = false;
  crownBadge.visible = false;
  ski.add(crownBadge);

  function persist() {
    try { localStorage.setItem(STORAGE, selectedId); } catch (_) {}
  }

  function currentLivery() {
    return Core.BY_ID[selectedId] || Core.LIVERIES[0];
  }

  function applyMaterial(material, color, emissive, emissiveIntensity) {
    if (!material) return;
    if (material.color && typeof material.color.setHex === 'function') material.color.setHex(color);
    if (material.emissive && typeof material.emissive.setHex === 'function') {
      material.emissive.setHex(emissive);
      material.emissiveIntensity = emissiveIntensity;
    }
    material.needsUpdate = true;
  }

  function applyLivery(id) {
    const stars = totalStars();
    selectedId = Core.sanitizeSelection(id, stars);
    const livery = currentLivery();
    const crown = livery.id === 'pacific-crown';

    applyMaterial(craftPrimaryMaterial, livery.primary, livery.emissive, crown ? 0.26 : 0.08);
    applyMaterial(craftAccentMaterial, livery.accent, livery.emissive, crown ? 0.18 : 0.04);
    crownMaterial.color.setHex(livery.accent);
    crownMaterial.emissive.setHex(livery.emissive);
    crownBadge.visible = crown;

    persist();
    renderGarage();
    return livery;
  }

  const style = document.createElement('style');
  style.textContent = `
    .jr-garage-panel{position:fixed;inset:0;z-index:76;display:none;align-items:center;justify-content:center;background:rgba(1,8,16,.76);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
    .jr-garage-panel.show{display:flex}.jr-garage-card{width:min(700px,90vw);max-height:82vh;overflow:auto;padding:26px;border:1px solid rgba(255,255,255,.18);border-radius:24px;background:linear-gradient(145deg,rgba(5,28,45,.97),rgba(3,17,31,.95));box-shadow:0 30px 90px rgba(0,0,0,.44)}
    .jr-garage-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin:18px 0}.jr-livery-card{appearance:none;min-height:118px;padding:11px;border-radius:16px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.045);color:#fff;text-align:left;cursor:pointer}.jr-livery-card.selected{border-color:#8ff3ff;box-shadow:inset 0 0 0 1px rgba(143,243,255,.18)}.jr-livery-card:disabled{opacity:.38;cursor:not-allowed}.jr-livery-swatch{height:34px;border-radius:10px;margin-bottom:9px;border:1px solid rgba(255,255,255,.18)}.jr-livery-name{font-size:11px;font-weight:950;line-height:1.25}.jr-livery-meta{font-size:9px;opacity:.6;margin-top:5px}.jr-garage-status{font-size:12px;line-height:1.6;opacity:.74}@media(max-width:720px){.jr-garage-grid{grid-template-columns:1fr 1fr}.jr-garage-card{padding:20px}.jr-livery-card{min-height:96px}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'jr-garage-panel';
  panel.innerHTML = `
    <div class="jr-garage-card">
      <div style="font-size:11px;font-weight:900;letter-spacing:.24em;color:#8fe9ff;margin-bottom:8px">CHAMPIONSHIP REWARDS</div>
      <div style="font-size:clamp(30px,6vw,48px);font-weight:950;line-height:1">GARAGE</div>
      <div class="jr-garage-status" data-garage-status style="margin-top:10px"></div>
      <div class="jr-garage-grid" data-garage-grid></div>
      <div style="display:flex;justify-content:flex-end"><button class="jr-btn primary" data-garage-close>Done</button></div>
    </div>`;
  document.body.appendChild(panel);

  const grid = panel.querySelector('[data-garage-grid]');
  const status = panel.querySelector('[data-garage-status]');

  function hex(value) {
    return `#${Number(value).toString(16).padStart(6, '0')}`;
  }

  function renderGarage() {
    if (!grid || !status) return;
    const stars = totalStars();
    const reward = Core.rewardState(stars);
    if (!Core.isUnlocked(selectedId, stars)) selectedId = Core.LIVERIES[0].id;
    grid.innerHTML = '';
    for (const livery of Core.LIVERIES) {
      const unlocked = Core.isUnlocked(livery, stars);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `jr-livery-card${livery.id === selectedId ? ' selected' : ''}`;
      button.disabled = !unlocked;
      button.innerHTML = `<div class="jr-livery-swatch" style="background:linear-gradient(135deg,${hex(livery.primary)},${hex(livery.accent)})"></div><div class="jr-livery-name">${unlocked ? '' : '🔒 '}${livery.name}</div><div class="jr-livery-meta">${livery.requiredStars === 0 ? 'DEFAULT' : `${livery.requiredStars}★ required`}</div>`;
      button.addEventListener('click', () => { if (unlocked) applyLivery(livery.id); });
      grid.appendChild(button);
    }
    const next = reward.nextUnlockId ? Core.BY_ID[reward.nextUnlockId] : null;
    status.textContent = reward.complete
      ? `${stars} / 12 stars · All liveries unlocked · Selected: ${currentLivery().name}`
      : `${stars} / 12 stars · ${reward.unlockedCount} / ${reward.totalCount} liveries unlocked · Next: ${next.name} in ${reward.starsToNext}★`;
  }

  function openGarage() {
    renderGarage();
    panel.classList.add('show');
  }
  function closeGarage() { panel.classList.remove('show'); }
  panel.querySelector('[data-garage-close]').addEventListener('click', closeGarage);
  panel.addEventListener('click', event => { if (event.target === panel) closeGarage(); });

  function installGarageButtons() {
    const targets = [
      document.querySelector('[data-jr-screen="menu"] .jr-actions'),
      document.querySelector('[data-jr-screen="pause"] .jr-actions')
    ];
    for (const target of targets) {
      if (!target || target.querySelector('[data-garage-open]')) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'jr-btn';
      button.dataset.garageOpen = '1';
      button.textContent = 'Garage';
      button.addEventListener('click', openGarage);
      target.appendChild(button);
    }
  }

  function showUnlockToast() {
    const toast = document.querySelector('.jr-toast');
    if (!toast) return;
    toast.textContent = 'NEW LIVERY UNLOCKED · GARAGE';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1600);
  }

  root.addEventListener('jetski:race-finished', () => {
    setTimeout(() => {
      const unlockedCount = Core.unlockedLiveries(totalStars()).length;
      if (unlockedCount > previousUnlockedCount) showUnlockToast();
      previousUnlockedCount = unlockedCount;
      renderGarage();
    }, 30);
  });

  installGarageButtons();
  applyLivery(selectedId);

  const versionNode = document.querySelector('#version');
  if (versionNode) versionNode.textContent = VERSION;
  document.title = `Swim Ring Racing ${VERSION}`;

  root.JETSKI_COSMETICS = {
    version: VERSION,
    get selectedId() { return selectedId; },
    get livery() { return currentLivery(); },
    applyLivery,
    openGarage,
    renderGarage,
    storageKey: STORAGE,
    visualOnly: true,
    geometryReplaced: false,
    collisionAdded: false,
    massChanged: false,
    cgChanged: false,
    physicsUntouched: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
