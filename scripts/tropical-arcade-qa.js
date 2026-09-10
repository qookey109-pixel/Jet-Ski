'use strict';

const fs = require('fs');
const path = require('path');
const { webkit } = require('playwright');
const { startStaticServer } = require('./static-server.js');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'artifacts', 'tropical-arcade-qa');
const PORT = Number(process.env.TROPICAL_ARCADE_QA_PORT) || 4195;
const BASE = `http://127.0.0.1:${PORT}/`;

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function preparePage(context, viewport) {
  const page = await context.newPage();
  if (viewport) await page.setViewportSize(viewport);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Boolean(
    window.JETSKI_RELEASE && window.JETSKI_RELEASE.version === 'V0.11.16' &&
    window.JETSKI_RACE_MANAGER && window.JETSKI_TROPICAL_ARCADE && window.JETSKI_TROPICAL_ARCADE_CORE
  ), null, { timeout: 30000 });
  return page;
}

async function startOpenSeaRace(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem('swimRing.onboarding.v01112', JSON.stringify({ version: 1, seen: true, opens: 0 }));
    } catch (_) {}
    window.JETSKI_RACE_MANAGER.selectEvent('open-sea-circuit');
    window.JETSKI_RACE_MANAGER.startRace();
  });
  await page.waitForFunction(() => {
    const manager = window.JETSKI_RACE_MANAGER;
    const arcade = window.JETSKI_TROPICAL_ARCADE;
    return manager && arcade &&
      (manager.state.phase === 'countdown' || manager.state.phase === 'racing') &&
      arcade.state.gateCount > 0 && arcade.state.buoyCount > 0 && arcade.rootGroup.visible;
  }, null, { timeout: 20000 });
  await page.waitForFunction(() => Boolean(document.querySelector('.v01116-arcade-boost')), null, { timeout: 5000 });
  await page.waitForTimeout(700);
}

async function collect(page) {
  return page.evaluate(() => {
    const arcade = window.JETSKI_TROPICAL_ARCADE;
    const core = window.JETSKI_TROPICAL_ARCADE_CORE;
    const manager = window.JETSKI_RACE_MANAGER;
    const ringRoot = arcade && arcade.rootGroup;
    const gateLayer = arcade && arcade.gateLayer;
    const buoyMesh = arcade && arcade.buoyMesh;
    const body = document.body;
    const hud = document.querySelector('.jr-hud');
    const gas = document.querySelector('#gas');
    const boost = document.querySelector('.v01116-arcade-boost');
    return {
      phase: manager && manager.state && manager.state.phase,
      version: arcade && arcade.version,
      bodyClass: body.className,
      visualOnly: arcade && arcade.visualOnly,
      physicsUntouched: arcade && arcade.physicsUntouched,
      raceRulesUntouched: arcade && arcade.raceRulesUntouched,
      boostAuthorityUntouched: arcade && arcade.boostAuthorityUntouched,
      state: arcade && Object.assign({}, arcade.state),
      coreDefaults: core && Object.assign({}, core.DEFAULTS),
      rootVisible: Boolean(ringRoot && ringRoot.visible),
      gateChildren: gateLayer ? gateLayer.children.length : -1,
      buoyCount: buoyMesh ? buoyMesh.count : -1,
      hudVisible: hud ? getComputedStyle(hud).display !== 'none' : false,
      gasVisible: gas ? getComputedStyle(gas).display !== 'none' : false,
      boostArcadeClass: Boolean(boost),
      boostLabel: boost ? (boost.getAttribute('aria-label') || boost.textContent || '').trim() : '',
      fov: typeof camera !== 'undefined' ? camera.fov : null,
      cameraDistance: typeof camera !== 'undefined' && typeof ski !== 'undefined' ? camera.position.distanceTo(ski.position) : null,
      cameraHeightDelta: typeof camera !== 'undefined' && typeof ski !== 'undefined' ? camera.position.y - ski.position.y : null
    };
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const receipt = {
    release: 'V0.11.16',
    feature: 'Tropical Arcade Visual Pass T1',
    status: 'RUNNING',
    generatedAt: new Date().toISOString(),
    profiles: [],
    screenshots: []
  };
  const server = startStaticServer(DIST, PORT);
  let browser;
  try {
    await new Promise(resolve => setTimeout(resolve, 250));
    browser = await webkit.launch({ headless: true });

    const profiles = [
      { name: 'webkit-desktop-1280x720', viewport: { width: 1280, height: 720 }, mobile: false },
      { name: 'webkit-mobile-landscape-844x390', viewport: { width: 844, height: 390 }, mobile: true }
    ];

    for (const profile of profiles) {
      const context = await browser.newContext({
        viewport: profile.viewport,
        hasTouch: profile.mobile,
        isMobile: profile.mobile,
        userAgent: profile.mobile
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
          : undefined
      });
      await context.addInitScript(() => {
        try {
          localStorage.clear();
          localStorage.setItem('swimRing.onboarding.v01112', JSON.stringify({ version: 1, seen: true, opens: 0 }));
        } catch (_) {}
      });
      const page = await preparePage(context);
      await startOpenSeaRace(page);
      const data = await collect(page);

      const screenshot = `${profile.name}.png`;
      await page.screenshot({ path: path.join(OUT, screenshot), fullPage: false });
      receipt.screenshots.push(screenshot);

      assert(data.version === 'V0.11.16-T1', `${profile.name}: wrong Tropical Arcade version ${data.version}`);
      assert(data.visualOnly === true && data.physicsUntouched === true && data.raceRulesUntouched === true,
        `${profile.name}: authority boundary changed`);
      assert(data.boostAuthorityUntouched === true && data.state.boostFovWrites === false,
        `${profile.name}: Boost/FOV authority changed`);
      assert(data.state.physicsWrites === false && data.state.gameplayWrites === false && data.state.raceRuleWrites === false,
        `${profile.name}: visual layer reports forbidden writes`);
      assert(data.rootVisible === true, `${profile.name}: tropical course layer not visible`);
      assert(data.gateChildren >= 4, `${profile.name}: too few decorated gates ${data.gateChildren}`);
      assert(data.buoyCount >= 12, `${profile.name}: too few lane buoys ${data.buoyCount}`);
      assert(data.buoyCount <= (profile.mobile ? 40 : 60), `${profile.name}: lane buoy density exceeded visual budget ${data.buoyCount}`);
      assert(data.coreDefaults.gateRadius <= 6 && data.coreDefaults.buoySpacing >= 16,
        `${profile.name}: first-pass gate/buoy density returned`);
      assert(data.state.lastNearestGateScale >= 0.55 && data.state.lastNearestGateScale <= 0.75,
        `${profile.name}: near gate still obstructs forward view ${data.state.lastNearestGateScale}`);
      assert(data.state.lastCameraDistanceExtra >= 2.5, `${profile.name}: camera pull-back missing ${data.state.lastCameraDistanceExtra}`);
      assert(data.state.lastCameraHeightExtra >= 0.65, `${profile.name}: camera lift missing ${data.state.lastCameraHeightExtra}`);
      assert(Number.isFinite(data.cameraDistance) && data.cameraDistance < 30,
        `${profile.name}: camera framing drifted too far ${data.cameraDistance}`);
      assert(data.hudVisible === true, `${profile.name}: race HUD hidden`);
      assert(data.boostArcadeClass === true && data.state.boostSkinAttached === true,
        `${profile.name}: localization-safe Boost skin not attached`);

      receipt.profiles.push({ name: profile.name, status: 'PASS', metrics: data });
      await context.close();
    }

    receipt.status = 'PASS';
  } catch (error) {
    receipt.status = 'FAIL';
    receipt.failure = String(error && error.stack || error);
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(OUT, 'receipt.json'), JSON.stringify(receipt, null, 2));
    if (browser) await browser.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
    console.log(JSON.stringify(receipt, null, 2));
  }
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
