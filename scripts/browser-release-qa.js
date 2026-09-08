const fs = require('fs');
const path = require('path');
const { chromium, webkit } = require('playwright');
const { startStaticServer } = require('./static-server.js');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'artifacts', 'browser-release-qa');
const PORT = Number(process.env.BROWSER_QA_PORT) || 4191;
const BASE_URL = `http://127.0.0.1:${PORT}/`;
const EXPECTED_VERSION = 'V0.11.16';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeName(value) {
  return String(value || 'case').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
}

function makeReceipt(engine, profile) {
  return {
    engine,
    profile,
    startedAt: new Date().toISOString(),
    assertions: [],
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    screenshots: [],
    notes: []
  };
}

function pass(receipt, label, detail) {
  receipt.assertions.push({ label, status: 'PASS', detail: detail == null ? null : detail });
}

function note(receipt, label, detail) {
  receipt.assertions.push({ label, status: 'INFO', detail: detail == null ? null : detail });
}

async function configureContext(context) {
  await context.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('swimRing.onboarding.v01112', JSON.stringify({ version: 1, seen: true, opens: 0 }));
      localStorage.setItem('swimRing.graphics.v0114', JSON.stringify({
        mode: 'medium',
        resolutionScale: 0.85,
        shadowOverride: null,
        motionEffects: true
      }));
    } catch (_) {}
  });
}

function attachIssueCapture(page, receipt) {
  page.on('console', message => {
    if (message.type() === 'error') receipt.consoleErrors.push(message.text());
  });
  page.on('pageerror', error => receipt.pageErrors.push(String(error && error.stack || error)));
  page.on('requestfailed', request => {
    const url = request.url();
    if (url.startsWith(BASE_URL)) {
      receipt.requestFailures.push({ url, error: request.failure() && request.failure().errorText || 'request failed' });
    }
  });
}

async function waitForGameReady(page) {
  await page.waitForFunction(() => {
    return Boolean(
      window.THREE &&
      window.JETSKI_RACE_MANAGER &&
      window.JETSKI_PROGRESSION &&
      window.JETSKI_RACE_AI &&
      window.JETSKI_BOOST &&
      window.JETSKI_AUDIO &&
      window.JETSKI_MOBILE_UX &&
      window.JETSKI_SAVE_RECOVERY
    );
  }, null, { timeout: 30000 });
  await page.waitForTimeout(750);
}

async function screenshot(page, receipt, name) {
  const file = `${safeName(receipt.engine)}-${safeName(receipt.profile)}-${safeName(name)}.png`;
  const target = path.join(OUT, file);
  await page.screenshot({ path: target, fullPage: true });
  receipt.screenshots.push(file);
}

async function verifyBoot(page, receipt) {
  const boot = await page.evaluate(() => {
    const version = document.querySelector('#version') && document.querySelector('#version').textContent.trim();
    const canvas = document.querySelector('canvas');
    let renderInfo = null;
    try {
      if (typeof renderer !== 'undefined' && renderer && renderer.info) {
        renderInfo = {
          calls: Number(renderer.info.render.calls) || 0,
          triangles: Number(renderer.info.render.triangles) || 0,
          frame: Number(renderer.info.render.frame) || 0
        };
      }
    } catch (_) {}
    return {
      version,
      canvas: Boolean(canvas),
      canvasWidth: canvas ? canvas.width : 0,
      canvasHeight: canvas ? canvas.height : 0,
      menuVisible: Boolean(document.querySelector('[data-jr-screen="menu"].show')),
      bootErrorVisible: Boolean(document.querySelector('#boot-error:not([hidden])')),
      renderInfo
    };
  });

  assert(boot.version === EXPECTED_VERSION, `Expected ${EXPECTED_VERSION}, got ${boot.version}`);
  assert(boot.canvas && boot.canvasWidth > 0 && boot.canvasHeight > 0, 'Canvas did not initialize');
  assert(boot.menuVisible, 'Start menu is not visible after boot');
  assert(!boot.bootErrorVisible, 'Boot error is visible');
  pass(receipt, 'boot/version', boot.version);
  pass(receipt, 'boot/canvas', `${boot.canvasWidth}x${boot.canvasHeight}`);
  pass(receipt, 'boot/start-menu', true);
  note(receipt, 'renderer/info', boot.renderInfo);
}

async function startRace(page) {
  const start = page.locator('[data-jr-screen="menu"] [data-jr-action="start"]').first();
  await start.waitFor({ state: 'visible', timeout: 10000 });
  await start.click();
  await page.waitForFunction(() => window.JETSKI_RACE_MANAGER && window.JETSKI_RACE_MANAGER.state.phase === 'racing', null, { timeout: 12000 });
}

async function exerciseMotionAndPause(page, receipt) {
  const before = Number(await page.locator('#speed').textContent()) || 0;
  await page.keyboard.down('w');
  await page.waitForTimeout(1150);
  const during = Number(await page.locator('#speed').textContent()) || 0;
  await page.keyboard.down('Space');
  await page.waitForTimeout(420);
  const boost = await page.evaluate(() => ({
    active: Boolean(window.JETSKI_BOOST && window.JETSKI_BOOST.state.active),
    activationCount: Number(window.JETSKI_BOOST && window.JETSKI_BOOST.state.activationCount) || 0,
    energy: Number(window.JETSKI_BOOST && window.JETSKI_BOOST.state.energy)
  }));
  await page.keyboard.up('Space');
  await page.keyboard.up('w');

  assert(during > before, `Craft did not accelerate: ${before} -> ${during}`);
  assert(boost.activationCount >= 1, 'Boost did not activate during forward input');
  pass(receipt, 'motion/accelerates', `${before} -> ${during} km/h`);
  pass(receipt, 'motion/boost', boost);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.JETSKI_RACE_MANAGER.state.phase === 'paused', null, { timeout: 3000 });
  pass(receipt, 'race/pause', true);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.JETSKI_RACE_MANAGER.state.phase === 'racing', null, { timeout: 3000 });
  pass(receipt, 'race/resume', true);

  const audio = await page.evaluate(() => {
    const api = window.JETSKI_AUDIO;
    if (!api) return null;
    let state = 'unavailable';
    try {
      const runtime = api.ensureAudio();
      state = runtime && runtime.context ? runtime.context.state : 'unavailable';
    } catch (_) {}
    return { contextState: state, mix: api.computeCurrentMix() };
  });
  assert(audio && audio.mix, 'Audio runtime did not expose a mix');
  pass(receipt, 'audio/runtime', audio);
}

async function teleportToNextGate(page) {
  return page.evaluate(() => {
    const manager = window.JETSKI_RACE_MANAGER;
    if (!manager || !manager.state || manager.state.phase !== 'racing') return { moved: false, phase: manager && manager.state && manager.state.phase };
    const cp = manager.course.checkpoints[manager.state.nextCheckpointIndex];
    if (!cp) return { moved: false, phase: manager.state.phase };
    let craft = null;
    try { craft = eval('ski'); } catch (_) {}
    if (!craft || !craft.position) return { moved: false, phase: manager.state.phase, reason: 'ski lexical binding unavailable' };
    craft.position.x = cp.x;
    craft.position.z = cp.z;
    return { moved: true, phase: manager.state.phase, target: manager.state.nextCheckpointIndex, x: cp.x, z: cp.z };
  });
}

async function finishCurrentRaceThroughRuntime(page, receipt, label) {
  let steps = 0;
  while (steps < 80) {
    const phase = await page.evaluate(() => window.JETSKI_RACE_MANAGER.state.phase);
    if (phase === 'finished') break;
    assert(phase === 'racing', `${label}: unexpected phase ${phase}`);
    const moved = await teleportToNextGate(page);
    assert(moved.moved, `${label}: could not move craft to gate (${moved.reason || moved.phase})`);
    steps += 1;
    await page.waitForTimeout(110);
  }
  const finalState = await page.evaluate(() => ({
    phase: window.JETSKI_RACE_MANAGER.state.phase,
    elapsedMs: window.JETSKI_RACE_MANAGER.state.elapsedMs,
    checkpointsPassed: window.JETSKI_RACE_MANAGER.state.checkpointsPassed,
    eventId: window.JETSKI_RACE_MANAGER.selectedEvent.id
  }));
  assert(finalState.phase === 'finished', `${label}: race did not finish after ${steps} gate moves`);
  await page.waitForSelector('[data-jr-screen="results"].show', { timeout: 5000 });
  pass(receipt, `${label}/finish-runtime`, finalState);
  return finalState;
}

async function installDeterministicCoastQaProviders(page) {
  await page.evaluate(() => {
    const world = {
      mode: 'open-sea',
      pendingCoastMode: null,
      setMode(mode) { this.mode = mode; this.pendingCoastMode = null; return true; }
    };
    const fakeCoast = () => ({
      state: { loaded: true, coastlines: null },
      findSpawn() { return { x: 0, z: 0 }; }
    });
    window.V097_WORLD_MODES = world;
    window.V097_HAWAII_COAST = fakeCoast();
    window.V096_TAIWAN_COAST = fakeCoast();
  });
}

async function clickNextRace(page) {
  const next = page.locator('[data-jr-screen="results"] button[data-next-event-id]:not([data-next-event-id=""])').first();
  await next.waitFor({ state: 'visible', timeout: 5000 });
  await next.click();
  await page.waitForFunction(() => window.JETSKI_RACE_MANAGER.state.phase === 'racing', null, { timeout: 12000 });
}

async function runChampionshipFlow(page, receipt) {
  await installDeterministicCoastQaProviders(page);
  const expected = ['open-sea-circuit', 'waikiki-offshore', 'qixingtan-bluewater', 'pacific-crown-final'];

  for (let index = 0; index < expected.length; index++) {
    const selected = await page.evaluate(() => window.JETSKI_RACE_MANAGER.selectedEvent.id);
    assert(selected === expected[index], `Expected event ${expected[index]}, got ${selected}`);
    await finishCurrentRaceThroughRuntime(page, receipt, `championship/${selected}`);
    await screenshot(page, receipt, `results-${index + 1}-${selected}`);
    if (index < expected.length - 1) await clickNextRace(page);
  }

  await page.waitForSelector('.jr-ending.show', { timeout: 5000 });
  const career = await page.evaluate(() => {
    const profile = window.JETSKI_PROGRESSION.profile;
    const stars = Object.values(profile.stars || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
    return {
      stars,
      totalFinishes: profile.totalFinishes,
      unlocked: profile.unlocked.slice(),
      endingText: document.querySelector('.jr-ending.show') && document.querySelector('.jr-ending.show').textContent.replace(/\s+/g, ' ').trim()
    };
  });
  assert(career.stars === 12, `Expected 12 championship stars, got ${career.stars}`);
  assert(career.totalFinishes === 4, `Expected 4 finishes, got ${career.totalFinishes}`);
  assert(/PACIFIC\s*CROWN/i.test(career.endingText || ''), 'Pacific Crown ending not visible');
  pass(receipt, 'championship/complete', career);
  await screenshot(page, receipt, 'championship-ending');
}

async function verifySaveRecovery(page, receipt) {
  const result = await page.evaluate(() => {
    localStorage.setItem('swimRing.googleMaps3d.apiKey', 'qa-secret-must-not-export');
    const backup = window.JETSKI_SAVE_RECOVERY.backupObject();
    const json = JSON.stringify(backup);
    return {
      hasBackup: Boolean(backup && backup.data),
      containsSecret: json.includes('qa-secret-must-not-export'),
      containsApiKeyName: json.includes('swimRing.googleMaps3d.apiKey')
    };
  });
  assert(result.hasBackup, 'Save backup object missing');
  assert(!result.containsSecret && !result.containsApiKeyName, 'API key leaked into backup');
  pass(receipt, 'save/api-key-excluded', result);
}

async function runDesktop(engineName, browserType) {
  const receipt = makeReceipt(engineName, 'desktop');
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await configureContext(context);
    const page = await context.newPage();
    attachIssueCapture(page, receipt);
    await page.goto(`${BASE_URL}?qa=browser-release`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForGameReady(page);
    await verifyBoot(page, receipt);
    await screenshot(page, receipt, 'menu');
    await startRace(page);
    await exerciseMotionAndPause(page, receipt);
    await screenshot(page, receipt, 'race-motion');
    await runChampionshipFlow(page, receipt);
    await verifySaveRecovery(page, receipt);

    assert(receipt.consoleErrors.length === 0, `Console errors: ${receipt.consoleErrors.join(' | ')}`);
    assert(receipt.pageErrors.length === 0, `Page errors: ${receipt.pageErrors.join(' | ')}`);
    assert(receipt.requestFailures.length === 0, `Local request failures: ${JSON.stringify(receipt.requestFailures)}`);
    pass(receipt, 'console/no-errors', true);
    pass(receipt, 'network/local-assets', true);
    await context.close();
    receipt.status = 'PASS';
    return receipt;
  } catch (error) {
    receipt.status = 'FAIL';
    receipt.failure = String(error && error.stack || error);
    return receipt;
  } finally {
    await browser.close();
    receipt.finishedAt = new Date().toISOString();
  }
}

async function runMobileLandscape(engineName, browserType) {
  const receipt = makeReceipt(engineName, 'mobile-landscape');
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 844, height: 390 },
      hasTouch: true,
      isMobile: true
    });
    await configureContext(context);
    const page = await context.newPage();
    attachIssueCapture(page, receipt);
    await page.goto(`${BASE_URL}?qa=mobile-release`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForGameReady(page);
    await verifyBoot(page, receipt);

    const mobileProfile = await page.evaluate(() => ({
      classes: document.body.className,
      profile: window.JETSKI_MOBILE_UX.profile,
      rotateVisible: document.querySelector('.v01114-rotate').classList.contains('show')
    }));
    assert(mobileProfile.profile.landscape, 'Mobile viewport not classified as landscape');
    assert(mobileProfile.profile.phoneLandscape, 'Mobile viewport not classified as phone landscape');
    assert(!mobileProfile.rotateVisible, 'Rotate overlay should not show in landscape');
    pass(receipt, 'mobile/landscape-profile', mobileProfile);

    await startRace(page);
    await page.waitForTimeout(350);
    const layout = await page.evaluate(() => {
      const hidden = selector => getComputedStyle(document.querySelector(selector)).display === 'none';
      const rects = Array.from(document.querySelectorAll('.mobile-controls button')).map(button => {
        const rect = button.getBoundingClientRect();
        return { id: button.id || button.textContent.trim(), width: rect.width, height: rect.height };
      });
      return {
        raceFocus: document.body.classList.contains('v01114-race-focus'),
        worldHidden: hidden('.world-controls'),
        seaHidden: hidden('.sea-controls'),
        physicsHidden: hidden('.physics-controls'),
        raceHudVisible: getComputedStyle(document.querySelector('.jr-hud')).display !== 'none',
        touchTargets: rects
      };
    });
    assert(layout.raceFocus && layout.worldHidden && layout.seaHidden && layout.physicsHidden, 'Race-focus controls did not collapse on mobile');
    assert(layout.raceHudVisible, 'Race HUD is not visible on mobile');
    assert(layout.touchTargets.every(item => item.height >= 48), `Touch target below 48px: ${JSON.stringify(layout.touchTargets)}`);
    pass(receipt, 'mobile/race-focus-layout', layout);
    await screenshot(page, receipt, 'mobile-race');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    const portrait = await page.evaluate(() => ({
      profile: window.JETSKI_MOBILE_UX.profile,
      rotateVisible: document.querySelector('.v01114-rotate').classList.contains('show')
    }));
    assert(portrait.profile.portrait, 'Portrait viewport not classified as portrait');
    assert(portrait.rotateVisible, 'Rotate-to-landscape overlay did not appear');
    pass(receipt, 'mobile/portrait-guidance', portrait);
    await screenshot(page, receipt, 'mobile-portrait-guidance');

    assert(receipt.consoleErrors.length === 0, `Console errors: ${receipt.consoleErrors.join(' | ')}`);
    assert(receipt.pageErrors.length === 0, `Page errors: ${receipt.pageErrors.join(' | ')}`);
    assert(receipt.requestFailures.length === 0, `Local request failures: ${JSON.stringify(receipt.requestFailures)}`);
    pass(receipt, 'console/no-errors', true);
    await context.close();
    receipt.status = 'PASS';
    return receipt;
  } catch (error) {
    receipt.status = 'FAIL';
    receipt.failure = String(error && error.stack || error);
    return receipt;
  } finally {
    await browser.close();
    receipt.finishedAt = new Date().toISOString();
  }
}

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    throw new Error('dist/index.html missing. Run npm run build first.');
  }
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const server = startStaticServer(DIST, PORT);
  await sleep(250);
  const results = [];
  try {
    for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
      results.push(await runDesktop(name, type));
      results.push(await runMobileLandscape(name, type));
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  const summary = {
    version: EXPECTED_VERSION,
    generatedAt: new Date().toISOString(),
    playwright: require('playwright/package.json').version,
    results
  };
  fs.writeFileSync(path.join(OUT, 'receipt.json'), JSON.stringify(summary, null, 2));
  for (const result of results) {
    console.log(`${result.engine} ${result.profile}: ${result.status}`);
    if (result.failure) console.error(result.failure);
  }
  if (results.some(result => result.status !== 'PASS')) process.exitCode = 1;
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
