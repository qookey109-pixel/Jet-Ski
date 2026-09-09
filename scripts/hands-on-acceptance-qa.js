'use strict';

const fs = require('fs');
const path = require('path');
const { webkit } = require('playwright');
const { startStaticServer } = require('./static-server');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'hands-on-acceptance-qa');
const PORT = 4194;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function overlaps(a, b) {
  if (!a || !b) return false;
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}

async function helperState(page) {
  return page.evaluate(() => {
    const api = window.JETSKI_HANDS_ON_ACCEPTANCE;
    const panel = document.querySelector('#hands-on-acceptance');
    return {
      available: Boolean(api && api.available),
      observerOnly: Boolean(api && api.observerOnly),
      physicsWrites: api && api.physicsWrites,
      gameplayWrites: api && api.gameplayWrites,
      storageWrites: api && api.storageWrites,
      mode: api && api.context && api.context.mode,
      orientation: api && api.context && api.context.orientation,
      collapsed: Boolean(api && api.collapsed),
      panelPresent: Boolean(panel)
    };
  });
}

async function waitForGame(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.JETSKI_RELEASE && window.JETSKI_RACE_MANAGER, null, { timeout: 30000 });
  await page.waitForTimeout(400);
}

async function run() {
  fs.rmSync(ARTIFACT_DIR, { recursive: true, force: true });
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const server = startStaticServer(DIST, PORT);
  let browser;
  const receipt = {
    release: 'V0.11.16',
    helper: 'V0.11.16-A1',
    normalUrlInactive: false,
    desktop: null,
    mobile: null,
    mobileCaptureCollapsedNoControlOverlap: false,
    screenshots: []
  };

  try {
    await new Promise(resolve => setTimeout(resolve, 250));
    browser = await webkit.launch({ headless: true });

    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Safari/605.1.15'
    });

    const normalPage = await desktop.newPage();
    await waitForGame(normalPage, `${BASE_URL}/`);
    const normal = await helperState(normalPage);
    assert(normal.available === false, 'normal URL must keep hands-on helper inactive');
    assert(normal.panelPresent === false, 'normal URL must not create hands-on panel');
    receipt.normalUrlInactive = true;
    await normalPage.close();

    const desktopPage = await desktop.newPage();
    await waitForGame(desktopPage, `${BASE_URL}/?accept=1`);
    await desktopPage.waitForSelector('#hands-on-acceptance', { state: 'visible' });
    const desktopState = await helperState(desktopPage);
    assert(desktopState.available === true, 'desktop accept URL helper unavailable');
    assert(desktopState.mode === 'SAFARI_DESKTOP', `desktop mode expected SAFARI_DESKTOP, got ${desktopState.mode}`);
    assert(desktopState.observerOnly === true, 'desktop helper must be observer-only');
    assert(desktopState.physicsWrites === false && desktopState.gameplayWrites === false && desktopState.storageWrites === false, 'helper authority boundary changed');
    receipt.desktop = desktopState;
    const desktopShot = path.join(ARTIFACT_DIR, 'webkit-desktop-acceptance-panel.png');
    await desktopPage.screenshot({ path: desktopShot, fullPage: true });
    receipt.screenshots.push(path.basename(desktopShot));
    await desktop.close();

    const mobile = await browser.newContext({
      viewport: { width: 844, height: 390 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 3
    });
    await mobile.addInitScript(() => {
      try {
        localStorage.clear();
        localStorage.setItem('swimRing.onboarding.v01112', JSON.stringify({ version: 1, seen: true, opens: 0 }));
      } catch (_) {}
    });
    const mobilePage = await mobile.newPage();
    await waitForGame(mobilePage, `${BASE_URL}/?accept=1`);
    await mobilePage.waitForSelector('#hands-on-acceptance', { state: 'visible' });
    const mobileState = await helperState(mobilePage);
    assert(mobileState.available === true, 'mobile accept URL helper unavailable');
    assert(mobileState.mode === 'MOBILE', `mobile mode expected MOBILE, got ${mobileState.mode}`);
    assert(mobileState.orientation === 'landscape', `mobile orientation expected landscape, got ${mobileState.orientation}`);
    receipt.mobile = mobileState;

    const mobileExpandedShot = path.join(ARTIFACT_DIR, 'webkit-mobile-acceptance-expanded.png');
    await mobilePage.screenshot({ path: mobileExpandedShot, fullPage: true });
    receipt.screenshots.push(path.basename(mobileExpandedShot));

    await mobilePage.evaluate(() => window.JETSKI_RACE_MANAGER.startRace());
    await mobilePage.waitForFunction(() => document.body.classList.contains('v01114-race-focus'), null, { timeout: 10000 });
    await mobilePage.evaluate(() => window.JETSKI_HANDS_ON_ACCEPTANCE.startCapture());
    await mobilePage.waitForFunction(() => window.JETSKI_HANDS_ON_ACCEPTANCE && window.JETSKI_HANDS_ON_ACCEPTANCE.collapsed === true);

    const boxes = await mobilePage.evaluate(() => {
      function rect(selector) {
        const el = document.querySelector(selector);
        if (!el) return null;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }
      return {
        panel: rect('#hands-on-acceptance'),
        throttle: rect('.throttle-group'),
        steer: rect('.steer-group'),
        physics: rect('.physics-controls'),
        raceHud: rect('.jr-hud'),
        compactHud: rect('.hud')
      };
    });
    assert(boxes.panel, 'collapsed acceptance panel missing');
    assert(boxes.throttle, 'mobile throttle controls missing');
    assert(boxes.steer, 'mobile steering controls missing');
    assert(boxes.physics === null, 'physics controls must be hidden in race-focus phase');
    assert(!overlaps(boxes.panel, boxes.throttle), 'collapsed acceptance panel overlaps throttle controls');
    assert(!overlaps(boxes.panel, boxes.steer), 'collapsed acceptance panel overlaps steering controls');
    assert(!overlaps(boxes.panel, boxes.raceHud), 'collapsed acceptance panel overlaps race HUD');
    assert(!overlaps(boxes.panel, boxes.compactHud), 'collapsed acceptance panel overlaps compact speed HUD');
    assert(boxes.panel.y < 120, `collapsed mobile panel expected near top safe area, got y=${boxes.panel.y}`);
    receipt.mobileCaptureCollapsedNoControlOverlap = true;
    receipt.mobileBoxes = boxes;

    const mobileCollapsedShot = path.join(ARTIFACT_DIR, 'webkit-mobile-acceptance-capture-collapsed.png');
    await mobilePage.screenshot({ path: mobileCollapsedShot, fullPage: true });
    receipt.screenshots.push(path.basename(mobileCollapsedShot));

    await mobilePage.evaluate(() => window.JETSKI_HANDS_ON_ACCEPTANCE.stopCapture());
    const afterStop = await helperState(mobilePage);
    assert(afterStop.collapsed === false, 'mobile helper must expand after capture stops');
    await mobile.close();

    fs.writeFileSync(path.join(ARTIFACT_DIR, 'receipt.json'), JSON.stringify(receipt, null, 2));
    console.log('V0.11.16 hands-on acceptance browser QA: PASS');
  } catch (error) {
    receipt.failure = String(error && error.stack || error);
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'receipt.json'), JSON.stringify(receipt, null, 2));
    console.error('V0.11.16 hands-on acceptance browser QA: FAIL');
    console.error(error && error.stack || error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
  }
}

run().catch(error => {
  console.error('V0.11.16 hands-on acceptance browser QA: FAIL');
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
