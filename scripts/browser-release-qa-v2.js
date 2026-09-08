'use strict';

const fs = require('fs');
const path = require('path');
const { chromium, webkit } = require('playwright');
const { startStaticServer } = require('./static-server.js');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'artifacts', 'browser-release-qa');
const PORT = Number(process.env.BROWSER_QA_PORT) || 4191;
const BASE = `http://127.0.0.1:${PORT}/`;
const VERSION = 'V0.11.16';

function assert(value, message) {
  if (!value) throw new Error(message);
}

function receipt(engine, profile) {
  return {
    engine,
    profile,
    startedAt: new Date().toISOString(),
    assertions: [],
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    screenshots: [],
    status: 'RUNNING'
  };
}

function pass(r, label, detail) {
  r.assertions.push({ label, status: 'PASS', detail: detail == null ? null : detail });
}

function info(r, label, detail) {
  r.assertions.push({ label, status: 'INFO', detail: detail == null ? null : detail });
}

function slug(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
}

async function shot(page, r, label) {
  const file = `${slug(r.engine)}-${slug(r.profile)}-${slug(label)}.png`;
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  r.screenshots.push(file);
}

async function prepare(context) {
  await context.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('swimRing.onboarding.v01112', JSON.stringify({ version: 1, seen: true, opens: 0 }));
      localStorage.setItem('swimRing.graphics.v0114', JSON.stringify({
        mode: 'medium', resolutionScale: 0.85, shadowOverride: null, motionEffects: true
      }));
    } catch (_) {}
  });
}

function captureErrors(page, r) {
  page.on('console', message => {
    if (message.type() === 'error') r.consoleErrors.push(message.text());
  });
  page.on('pageerror', error => r.pageErrors.push(String(error && error.stack || error)));
  page.on('requestfailed', request => {
    if (request.url().startsWith(BASE)) {
      r.requestFailures.push({ url: request.url(), reason: request.failure() && request.failure().errorText || 'failed' });
    }
  });
}

async function ready(page) {
  await page.waitForFunction(() => Boolean(
    window.THREE && window.JETSKI_RELEASE && window.JETSKI_RACE_MANAGER &&
    window.JETSKI_PROGRESSION && window.JETSKI_RACE_AI && window.JETSKI_BOOST &&
    window.JETSKI_AUDIO && window.JETSKI_MOBILE_UX && window.JETSKI_SAVE_RECOVERY
  ), null, { timeout: 30000 });
  await page.waitForTimeout(800);
}

async function bootCheck(page, r) {
  const boot = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    let render = null;
    try {
      render = typeof renderer !== 'undefined' && renderer && renderer.info ? {
        calls: Number(renderer.info.render.calls) || 0,
        triangles: Number(renderer.info.render.triangles) || 0,
        frame: Number(renderer.info.render.frame) || 0
      } : null;
    } catch (_) {}
    return {
      version: document.querySelector('#version') && document.querySelector('#version').textContent.trim(),
      release: window.JETSKI_RELEASE && window.JETSKI_RELEASE.version,
      canvas: canvas ? [canvas.width, canvas.height] : null,
      menu: Boolean(document.querySelector('[data-jr-screen="menu"].show')),
      bootError: Boolean(document.querySelector('#boot-error:not([hidden])')),
      render
    };
  });
  assert(boot.version === VERSION && boot.release === VERSION, `Version mismatch: ${JSON.stringify(boot)}`);
  assert(boot.canvas && boot.canvas[0] > 0 && boot.canvas[1] > 0, 'WebGL canvas did not initialize');
  assert(boot.menu, 'Start menu is not visible');
  assert(!boot.bootError, 'Boot error is visible');
  pass(r, 'boot/version', boot.version);
  pass(r, 'boot/canvas', boot.canvas);
  pass(r, 'boot/start-menu', true);
  info(r, 'renderer/info', boot.render);
}

async function startRace(page) {
  const start = page.locator('[data-jr-screen="menu"] [data-jr-action="start"]').first();
  await start.waitFor({ state: 'visible', timeout: 10000 });
  await start.click();
  await page.waitForFunction(() => window.JETSKI_RACE_MANAGER.state.phase === 'racing', null, { timeout: 12000 });
}

async function driveAndBoost(page, r) {
  const before = Number(await page.locator('#speed').textContent()) || 0;
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.down('Space');

  const deadline = Date.now() + 2800;
  let sample = null;
  while (Date.now() < deadline) {
    sample = await page.evaluate(() => {
      let airborneState = null;
      let gasState = null;
      let rawSpeed = null;
      let maxSpeed = null;
      try { airborneState = Boolean(eval('airborne')); } catch (_) {}
      try { gasState = Boolean(eval('input && input.gas')); } catch (_) {}
      try { rawSpeed = Number(eval('speed')); } catch (_) {}
      try { maxSpeed = Number(eval('physics.maxSpeed')); } catch (_) {}
      return {
        requested: Boolean(window.JETSKI_BOOST.state.requested),
        active: Boolean(window.JETSKI_BOOST.state.active),
        activationCount: Number(window.JETSKI_BOOST.state.activationCount) || 0,
        energy: Number(window.JETSKI_BOOST.state.energy) || 0,
        airborne: airborneState,
        gas: gasState,
        speedMps: rawSpeed,
        maxSpeedMps: maxSpeed,
        speedRatio: Number.isFinite(rawSpeed) && Number.isFinite(maxSpeed) && maxSpeed > 0 ? rawSpeed / maxSpeed : null
      };
    });
    if (sample.activationCount >= 1) break;
    await page.waitForTimeout(100);
  }

  const during = Number(await page.locator('#speed').textContent()) || 0;
  await page.keyboard.up('Space');
  await page.keyboard.up('w');

  assert(during > before, `Craft did not accelerate: ${before} -> ${during}`);
  assert(sample && sample.requested, `Space did not reach Boost request state: ${JSON.stringify(sample)}`);
  assert(sample.activationCount >= 1, `Boost never found an eligible window while W+Space were held: ${JSON.stringify(sample)}`);
  pass(r, 'motion/accelerates', `${before} -> ${during} km/h`);
  pass(r, 'motion/boost-keyboard', sample);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.JETSKI_RACE_MANAGER.state.phase === 'paused', null, { timeout: 3000 });
  pass(r, 'race/pause', true);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.JETSKI_RACE_MANAGER.state.phase === 'racing', null, { timeout: 3000 });
  pass(r, 'race/resume', true);

  const audio = await page.evaluate(() => {
    let state = 'unavailable';
    try {
      const runtime = window.JETSKI_AUDIO.ensureAudio();
      state = runtime && runtime.context ? runtime.context.state : 'unavailable';
    } catch (_) {}
    return { state, mix: window.JETSKI_AUDIO.computeCurrentMix() };
  });
  assert(audio && audio.mix, 'Audio runtime did not expose a mix');
  pass(r, 'audio/runtime', audio);
}

async function installCoastFlowStubs(page) {
  await page.evaluate(() => {
    window.V097_WORLD_MODES = {
      mode: 'open-sea',
      pendingCoastMode: null,
      setMode(mode) { this.mode = mode; this.pendingCoastMode = null; return true; }
    };
    const coast = () => ({ state: { loaded: true, coastlines: null }, findSpawn() { return { x: 0, z: 0 }; } });
    window.V097_HAWAII_COAST = coast();
    window.V096_TAIWAN_COAST = coast();
  });
}

async function moveToGate(page) {
  return page.evaluate(() => {
    const manager = window.JETSKI_RACE_MANAGER;
    if (!manager || manager.state.phase !== 'racing') return { ok: false, phase: manager && manager.state.phase };
    const cp = manager.course.checkpoints[manager.state.nextCheckpointIndex];
    let craft = null;
    try { craft = eval('ski'); } catch (_) {}
    if (!cp || !craft || !craft.position) return { ok: false, reason: 'gate-or-craft-unavailable' };
    craft.position.x = cp.x;
    craft.position.z = cp.z;
    return { ok: true, gate: manager.state.nextCheckpointIndex, lap: manager.state.lap };
  });
}

async function finishRace(page, r, label) {
  for (let i = 0; i < 90; i++) {
    const phase = await page.evaluate(() => window.JETSKI_RACE_MANAGER.state.phase);
    if (phase === 'finished') break;
    assert(phase === 'racing', `${label}: unexpected phase ${phase}`);
    const moved = await moveToGate(page);
    assert(moved.ok, `${label}: ${JSON.stringify(moved)}`);
    await page.waitForTimeout(120);
  }
  const state = await page.evaluate(() => ({
    phase: window.JETSKI_RACE_MANAGER.state.phase,
    elapsedMs: window.JETSKI_RACE_MANAGER.state.elapsedMs,
    gates: window.JETSKI_RACE_MANAGER.state.checkpointsPassed,
    eventId: window.JETSKI_RACE_MANAGER.selectedEvent.id
  }));
  assert(state.phase === 'finished', `${label}: did not finish`);
  await page.waitForSelector('[data-jr-screen="results"].show', { timeout: 5000 });
  pass(r, `${label}/finish`, state);
}

async function nextRace(page) {
  const button = page.locator('[data-jr-screen="results"] button[data-next-event-id]:not([data-next-event-id=""])').first();
  await button.waitFor({ state: 'visible', timeout: 5000 });
  await button.click();
  await page.waitForFunction(() => window.JETSKI_RACE_MANAGER.state.phase === 'racing', null, { timeout: 12000 });
}

async function championship(page, r) {
  await installCoastFlowStubs(page);
  const ids = ['open-sea-circuit', 'waikiki-offshore', 'qixingtan-bluewater', 'pacific-crown-final'];
  for (let i = 0; i < ids.length; i++) {
    const selected = await page.evaluate(() => window.JETSKI_RACE_MANAGER.selectedEvent.id);
    assert(selected === ids[i], `Championship selection mismatch: ${selected} != ${ids[i]}`);
    await finishRace(page, r, `championship/${ids[i]}`);
    await shot(page, r, `result-${i + 1}-${ids[i]}`);
    if (i < ids.length - 1) await nextRace(page);
  }
  await page.waitForSelector('.jr-ending.show', { timeout: 5000 });
  const result = await page.evaluate(() => {
    const p = window.JETSKI_PROGRESSION.profile;
    return {
      stars: Object.values(p.stars || {}).reduce((sum, v) => sum + (Number(v) || 0), 0),
      finishes: Number(p.totalFinishes) || 0,
      ending: document.querySelector('.jr-ending.show').textContent.replace(/\s+/g, ' ').trim()
    };
  });
  assert(result.stars === 12 && result.finishes === 4, `Championship progression mismatch: ${JSON.stringify(result)}`);
  assert(/PACIFIC\s*CROWN/i.test(result.ending), 'Pacific Crown ending missing');
  pass(r, 'championship/complete', result);
  await shot(page, r, 'championship-ending');
}

async function saveCheck(page, r) {
  const result = await page.evaluate(() => {
    localStorage.setItem('swimRing.googleMaps3d.apiKey', 'qa-secret-must-not-export');
    const backup = window.JETSKI_SAVE_RECOVERY.backupObject();
    const json = JSON.stringify(backup);
    return {
      hasData: Boolean(backup && backup.data),
      leakedValue: json.includes('qa-secret-must-not-export'),
      leakedKey: json.includes('swimRing.googleMaps3d.apiKey')
    };
  });
  assert(result.hasData && !result.leakedValue && !result.leakedKey, `Save security failure: ${JSON.stringify(result)}`);
  pass(r, 'save/api-key-excluded', result);
}

async function runDesktop(engine, browserType) {
  const r = receipt(engine, 'desktop');
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await prepare(context);
    const page = await context.newPage();
    captureErrors(page, r);
    await page.goto(`${BASE}?qa=desktop`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ready(page);
    await bootCheck(page, r);
    await shot(page, r, 'menu');
    await startRace(page);
    await driveAndBoost(page, r);
    await shot(page, r, 'race-motion');
    await championship(page, r);
    await saveCheck(page, r);
    assert(!r.consoleErrors.length, `Console errors: ${r.consoleErrors.join(' | ')}`);
    assert(!r.pageErrors.length, `Page errors: ${r.pageErrors.join(' | ')}`);
    assert(!r.requestFailures.length, `Local requests failed: ${JSON.stringify(r.requestFailures)}`);
    pass(r, 'console/no-errors', true);
    pass(r, 'network/local-assets', true);
    r.status = 'PASS';
    await context.close();
  } catch (error) {
    r.status = 'FAIL';
    r.failure = String(error && error.stack || error);
  } finally {
    r.finishedAt = new Date().toISOString();
    await browser.close();
  }
  return r;
}

async function runMobile(engine, browserType) {
  const r = receipt(engine, 'mobile-landscape');
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    await prepare(context);
    const page = await context.newPage();
    captureErrors(page, r);
    await page.goto(`${BASE}?qa=mobile`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ready(page);
    await bootCheck(page, r);

    const profile = await page.evaluate(() => ({
      profile: window.JETSKI_MOBILE_UX.profile,
      rotate: document.querySelector('.v01114-rotate').classList.contains('show')
    }));
    assert(profile.profile.landscape && profile.profile.phoneLandscape && !profile.rotate, `Landscape profile failed: ${JSON.stringify(profile)}`);
    pass(r, 'mobile/landscape-profile', profile);

    await startRace(page);
    await page.waitForTimeout(450);
    const layout = await page.evaluate(() => {
      const hidden = selector => {
        const node = document.querySelector(selector);
        return Boolean(node) && getComputedStyle(node).display === 'none';
      };
      const dev = Array.from(document.querySelectorAll('.v01114-dev-overlay')).map(node => ({
        text: String(node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        hidden: getComputedStyle(node).display === 'none'
      }));
      const targets = Array.from(document.querySelectorAll('.mobile-controls button')).map(node => {
        const rect = node.getBoundingClientRect();
        return { id: node.id || node.textContent.trim(), width: rect.width, height: rect.height };
      });
      return {
        raceFocus: document.body.classList.contains('v01114-race-focus'),
        worldHidden: hidden('.world-controls'), seaHidden: hidden('.sea-controls'), physicsHidden: hidden('.physics-controls'),
        hudVisible: getComputedStyle(document.querySelector('.jr-hud')).display !== 'none',
        dev,
        targets
      };
    });
    assert(layout.raceFocus && layout.worldHidden && layout.seaHidden && layout.physicsHidden && layout.hudVisible, `Race focus layout failed: ${JSON.stringify(layout)}`);
    assert(layout.dev.length >= 3 && layout.dev.every(item => item.hidden), `EXP QA overlays still cover race view: ${JSON.stringify(layout.dev)}`);
    assert(layout.targets.every(item => item.height >= 48), `Touch target too small: ${JSON.stringify(layout.targets)}`);
    pass(r, 'mobile/race-focus-layout', layout);
    await shot(page, r, 'mobile-race');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(450);
    const portrait = await page.evaluate(() => ({
      profile: window.JETSKI_MOBILE_UX.profile,
      rotate: document.querySelector('.v01114-rotate').classList.contains('show')
    }));
    assert(portrait.profile.portrait && portrait.rotate, `Portrait guidance failed: ${JSON.stringify(portrait)}`);
    pass(r, 'mobile/portrait-guidance', portrait);
    await shot(page, r, 'mobile-portrait-guidance');

    assert(!r.consoleErrors.length, `Console errors: ${r.consoleErrors.join(' | ')}`);
    assert(!r.pageErrors.length, `Page errors: ${r.pageErrors.join(' | ')}`);
    assert(!r.requestFailures.length, `Local requests failed: ${JSON.stringify(r.requestFailures)}`);
    pass(r, 'console/no-errors', true);
    r.status = 'PASS';
    await context.close();
  } catch (error) {
    r.status = 'FAIL';
    r.failure = String(error && error.stack || error);
  } finally {
    r.finishedAt = new Date().toISOString();
    await browser.close();
  }
  return r;
}

async function main() {
  assert(fs.existsSync(path.join(DIST, 'index.html')), 'dist/index.html missing; run npm run build first');
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const server = startStaticServer(DIST, PORT);
  await new Promise(resolve => setTimeout(resolve, 250));
  const results = [];
  try {
    for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
      results.push(await runDesktop(engine, type));
      results.push(await runMobile(engine, type));
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
  const summary = { version: VERSION, generatedAt: new Date().toISOString(), playwright: require('playwright/package.json').version, results };
  fs.writeFileSync(path.join(OUT, 'receipt.json'), JSON.stringify(summary, null, 2));
  for (const r of results) {
    console.log(`${r.engine} ${r.profile}: ${r.status}`);
    if (r.failure) console.error(r.failure);
  }
  if (results.some(r => r.status !== 'PASS')) process.exitCode = 1;
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
