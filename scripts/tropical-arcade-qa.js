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
    window.JETSKI_RACE_MANAGER && window.JETSKI_TROPICAL_ARCADE && window.JETSKI_TROPICAL_ARCADE_CORE &&
    window.JETSKI_TROPICAL_ISLANDS && window.JETSKI_TROPICAL_ISLAND_CORE &&
    window.JETSKI_TROPICAL_POLISH && window.JETSKI_TROPICAL_POLISH_CORE &&
    window.JETSKI_ARCADE_FEEDBACK && window.JETSKI_ARCADE_FEEDBACK_CORE
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
    const islands = window.JETSKI_TROPICAL_ISLANDS;
    const polish = window.JETSKI_TROPICAL_POLISH;
    const feedback = window.JETSKI_ARCADE_FEEDBACK;
    return manager && arcade && islands && polish && feedback &&
      (manager.state.phase === 'countdown' || manager.state.phase === 'racing') &&
      arcade.state.gateCount > 0 && arcade.state.buoyCount > 0 && arcade.rootGroup.visible &&
      islands.state.islandCount > 0 && islands.state.palmCount > 0 && islands.group.visible &&
      polish.state.rockCount > 0 && polish.state.foamCount > 0 && polish.state.shallowCount > 0 && polish.group.visible &&
      feedback.visualOnly === true;
  }, null, { timeout: 20000 });
  await page.waitForFunction(() => Boolean(document.querySelector('.v01116-arcade-boost')), null, { timeout: 5000 });
  await page.waitForTimeout(700);
}

async function collect(page) {
  return page.evaluate(() => {
    const arcade = window.JETSKI_TROPICAL_ARCADE;
    const core = window.JETSKI_TROPICAL_ARCADE_CORE;
    const manager = window.JETSKI_RACE_MANAGER;
    const islands = window.JETSKI_TROPICAL_ISLANDS;
    const islandCore = window.JETSKI_TROPICAL_ISLAND_CORE;
    const polish = window.JETSKI_TROPICAL_POLISH;
    const polishCore = window.JETSKI_TROPICAL_POLISH_CORE;
    const feedback = window.JETSKI_ARCADE_FEEDBACK;
    const feedbackCore = window.JETSKI_ARCADE_FEEDBACK_CORE;
    const ringRoot = arcade && arcade.rootGroup;
    const gateLayer = arcade && arcade.gateLayer;
    const buoyMesh = arcade && arcade.buoyMesh;
    const legacyCourse = typeof scene !== 'undefined' ? scene.getObjectByName('V0115RaceCourse') : null;
    const body = document.body;
    const hud = document.querySelector('.jr-hud');
    const gas = document.querySelector('#gas');
    const boost = document.querySelector('.v01116-arcade-boost');
    const gates = gateLayer ? gateLayer.children : [];
    const activeIndex = manager && manager.state ? Number(manager.state.nextCheckpointIndex) : -1;
    const startGate = [...gates].find(gate => gate.userData && gate.userData.courseIndex === 0) || null;
    const activeGate = [...gates].find(gate => gate.userData && gate.userData.courseIndex === activeIndex) || null;
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
      visibleGateCount: gateLayer ? [...gateLayer.children].filter(gate => gate.visible).length : -1,
      activeIndex,
      startGateVisible: startGate ? startGate.visible : null,
      activeGateVisible: activeGate ? activeGate.visible : null,
      buoyCount: buoyMesh ? buoyMesh.count : -1,
      legacyCourseFound: Boolean(legacyCourse),
      legacyCourseVisible: legacyCourse ? legacyCourse.visible : null,
      hudVisible: hud ? getComputedStyle(hud).display !== 'none' : false,
      gasVisible: gas ? getComputedStyle(gas).display !== 'none' : false,
      boostArcadeClass: Boolean(boost),
      boostLabel: boost ? (boost.getAttribute('aria-label') || boost.textContent || '').trim() : '',
      fov: typeof camera !== 'undefined' ? camera.fov : null,
      cameraDistance: typeof camera !== 'undefined' && typeof ski !== 'undefined' ? camera.position.distanceTo(ski.position) : null,
      cameraHeightDelta: typeof camera !== 'undefined' && typeof ski !== 'undefined' ? camera.position.y - ski.position.y : null,
      islandVersion: islands && islands.version,
      islandVisualOnly: islands && islands.visualOnly,
      islandCollisionAdded: islands && islands.collisionAdded,
      islandPhysicsUntouched: islands && islands.physicsUntouched,
      islandGameplayUntouched: islands && islands.gameplayUntouched,
      islandGoogle3DRespected: islands && islands.google3DRespected,
      islandState: islands && Object.assign({}, islands.state),
      islandDefaults: islandCore && Object.assign({}, islandCore.DEFAULTS),
      islandGroupVisible: Boolean(islands && islands.group && islands.group.visible),
      polishVersion: polish && polish.version,
      polishVisualOnly: polish && polish.visualOnly,
      polishCollisionAdded: polish && polish.collisionAdded,
      polishPhysicsUntouched: polish && polish.physicsUntouched,
      polishGameplayUntouched: polish && polish.gameplayUntouched,
      polishRaceRulesUntouched: polish && polish.raceRulesUntouched,
      polishWaterPhysicsUntouched: polish && polish.waterPhysicsUntouched,
      polishGoogle3DRespected: polish && polish.google3DRespected,
      polishState: polish && Object.assign({}, polish.state),
      polishDefaults: polishCore && Object.assign({}, polishCore.DEFAULTS),
      polishGroupVisible: Boolean(polish && polish.group && polish.group.visible),
      feedbackVersion: feedback && feedback.version,
      feedbackVisualOnly: feedback && feedback.visualOnly,
      feedbackPhysicsUntouched: feedback && feedback.physicsUntouched,
      feedbackGameplayUntouched: feedback && feedback.gameplayUntouched,
      feedbackRaceRulesUntouched: feedback && feedback.raceRulesUntouched,
      feedbackBoostAuthorityUntouched: feedback && feedback.boostAuthorityUntouched,
      feedbackCameraUntouched: feedback && feedback.cameraUntouched,
      feedbackCollisionAdded: feedback && feedback.collisionAdded,
      feedbackState: feedback && Object.assign({}, feedback.state),
      feedbackDefaults: feedbackCore && Object.assign({}, feedbackCore.DEFAULTS)
    };
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const receipt = {
    release: 'V0.11.16',
    feature: 'Tropical Arcade Visual Pass T1 + T2 Islands + T3 Environment/Water Polish + T4 Race Feedback',
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

      await page.waitForFunction(() => window.JETSKI_RACE_MANAGER &&
        window.JETSKI_RACE_MANAGER.state.phase === 'racing', null, { timeout: 5000 });
      await page.waitForTimeout(220);
      const stateBeforePreview = await page.evaluate(() => {
        const manager = window.JETSKI_RACE_MANAGER;
        return manager ? {
          phase: manager.state.phase,
          lap: manager.state.lap,
          nextCheckpointIndex: manager.state.nextCheckpointIndex,
          elapsedMs: manager.state.elapsedMs
        } : null;
      });
      await page.evaluate(() => window.JETSKI_ARCADE_FEEDBACK.preview('checkpoint'));
      await page.waitForTimeout(70);
      const feedbackPreview = await page.evaluate(() => {
        const manager = window.JETSKI_RACE_MANAGER;
        const feedback = window.JETSKI_ARCADE_FEEDBACK;
        const banner = document.querySelector('.v01116-feedback-banner');
        return {
          state: feedback && Object.assign({}, feedback.state),
          bannerText: banner ? banner.textContent : '',
          bannerVisible: banner ? banner.classList.contains('show') && Number(getComputedStyle(banner).opacity) > 0 : false,
          race: manager ? {
            phase: manager.state.phase,
            lap: manager.state.lap,
            nextCheckpointIndex: manager.state.nextCheckpointIndex,
            elapsedMs: manager.state.elapsedMs
          } : null
        };
      });
      const feedbackScreenshot = `${profile.name}-feedback.png`;
      await page.screenshot({ path: path.join(OUT, feedbackScreenshot), fullPage: false });
      receipt.screenshots.push(feedbackScreenshot);

      assert(data.version === 'V0.11.16-T1', `${profile.name}: wrong Tropical Arcade version ${data.version}`);
      assert(data.visualOnly === true && data.physicsUntouched === true && data.raceRulesUntouched === true,
        `${profile.name}: authority boundary changed`);
      assert(data.boostAuthorityUntouched === true && data.state.boostFovWrites === false,
        `${profile.name}: Boost/FOV authority changed`);
      assert(data.state.physicsWrites === false && data.state.gameplayWrites === false && data.state.raceRuleWrites === false,
        `${profile.name}: visual layer reports forbidden writes`);
      assert(data.rootVisible === true, `${profile.name}: tropical course layer not visible`);
      assert(data.gateChildren >= 4, `${profile.name}: too few decorated gates ${data.gateChildren}`);
      assert(data.visibleGateCount >= 3, `${profile.name}: too few visible tropical gates ${data.visibleGateCount}`);
      assert(data.activeGateVisible === true, `${profile.name}: current target gate was hidden`);
      if (data.activeIndex !== 0) {
        assert(data.startGateVisible === false && data.state.nearNonActiveGateSuppressed === true,
          `${profile.name}: nearby non-target start/finish gate still obstructs the launch view`);
      }
      assert(data.buoyCount >= 12, `${profile.name}: too few lane buoys ${data.buoyCount}`);
      assert(data.buoyCount <= (profile.mobile ? 40 : 60), `${profile.name}: lane buoy density exceeded visual budget ${data.buoyCount}`);
      assert(data.coreDefaults.gateRadius <= 6 && data.coreDefaults.buoySpacing >= 16,
        `${profile.name}: first-pass gate/buoy density returned`);
      assert(data.state.lastNearestGateScale >= 0.55 && data.state.lastNearestGateScale <= 0.75,
        `${profile.name}: near gate scale left the guarded readability range ${data.state.lastNearestGateScale}`);
      assert(data.legacyCourseFound === true && data.legacyCourseVisible === false && data.state.legacyGateVisualSuppressed === true,
        `${profile.name}: duplicate legacy gate renderer is still visible`);
      assert(data.state.lastCameraDistanceExtra >= 2.5, `${profile.name}: camera pull-back missing ${data.state.lastCameraDistanceExtra}`);
      assert(data.state.lastCameraHeightExtra >= 0.65, `${profile.name}: camera lift missing ${data.state.lastCameraHeightExtra}`);
      assert(Number.isFinite(data.cameraDistance) && data.cameraDistance < 30,
        `${profile.name}: camera framing drifted too far ${data.cameraDistance}`);
      assert(data.hudVisible === true, `${profile.name}: race HUD hidden`);
      assert(data.boostArcadeClass === true && data.state.boostSkinAttached === true,
        `${profile.name}: localization-safe Boost skin not attached`);

      assert(data.islandVersion === 'V0.11.16-T2', `${profile.name}: wrong T2 island version ${data.islandVersion}`);
      assert(data.islandVisualOnly === true && data.islandCollisionAdded === false &&
        data.islandPhysicsUntouched === true && data.islandGameplayUntouched === true,
        `${profile.name}: island authority boundary changed`);
      assert(data.islandGoogle3DRespected === true && data.islandState.realWorldCoastUntouched === true,
        `${profile.name}: island dressing no longer respects real-world visual authority`);
      assert(data.islandState.physicsWrites === false && data.islandState.gameplayWrites === false &&
        data.islandState.raceRuleWrites === false,
        `${profile.name}: island layer reports forbidden writes`);
      assert(data.islandGroupVisible === true && data.islandState.visible === true,
        `${profile.name}: tropical island group not visible in open-sea race`);
      assert(data.islandState.islandCount >= 2 && data.islandState.islandCount <= (profile.mobile ? 3 : 4),
        `${profile.name}: island count outside visual budget ${data.islandState.islandCount}`);
      assert(data.islandState.palmCount >= data.islandState.islandCount * 2,
        `${profile.name}: too few palms for readable tropical silhouette ${data.islandState.palmCount}`);
      assert(data.islandState.frondCount >= data.islandState.palmCount * 6,
        `${profile.name}: palm frond dressing missing ${data.islandState.frondCount}`);
      assert(data.islandState.drawSurfaces <= 6,
        `${profile.name}: tropical island draw-surface budget exceeded ${data.islandState.drawSurfaces}`);
      assert(data.islandState.minCourseClearance >= data.islandDefaults.minCourseClearance,
        `${profile.name}: island encroached on guarded race corridor ${data.islandState.minCourseClearance}`);

      assert(data.polishVersion === 'V0.11.16-T3', `${profile.name}: wrong T3 polish version ${data.polishVersion}`);
      assert(data.polishVisualOnly === true && data.polishCollisionAdded === false &&
        data.polishPhysicsUntouched === true && data.polishGameplayUntouched === true &&
        data.polishRaceRulesUntouched === true && data.polishWaterPhysicsUntouched === true,
        `${profile.name}: T3 visual authority boundary changed`);
      assert(data.polishGoogle3DRespected === true && data.polishState.realWorldCoastUntouched === true,
        `${profile.name}: T3 no longer respects real-world visual authority`);
      assert(data.polishState.physicsWrites === false && data.polishState.gameplayWrites === false &&
        data.polishState.raceRuleWrites === false && data.polishState.waterPhysicsWrites === false,
        `${profile.name}: T3 reports forbidden writes`);
      assert(data.polishGroupVisible === true && data.polishState.visible === true,
        `${profile.name}: T3 polish group not visible`);
      assert(data.polishState.rockCount >= data.islandState.islandCount * 3,
        `${profile.name}: T3 rock shoreline detail missing ${data.polishState.rockCount}`);
      assert(data.polishState.foamCount === data.islandState.islandCount,
        `${profile.name}: T3 shoreline foam count mismatch ${data.polishState.foamCount}`);
      assert(data.polishState.shallowCount === data.islandState.islandCount,
        `${profile.name}: T3 shallow-water count mismatch ${data.polishState.shallowCount}`);
      assert(data.polishState.distantIslandCount >= (profile.mobile ? 2 : 4),
        `${profile.name}: T3 distant island silhouettes missing ${data.polishState.distantIslandCount}`);
      assert(data.polishState.drawSurfaces <= 4,
        `${profile.name}: T3 draw-surface budget exceeded ${data.polishState.drawSurfaces}`);

      assert(data.feedbackVersion === 'V0.11.16-T4', `${profile.name}: wrong T4 feedback version ${data.feedbackVersion}`);
      assert(data.feedbackVisualOnly === true && data.feedbackPhysicsUntouched === true &&
        data.feedbackGameplayUntouched === true && data.feedbackRaceRulesUntouched === true &&
        data.feedbackBoostAuthorityUntouched === true && data.feedbackCameraUntouched === true &&
        data.feedbackCollisionAdded === false,
        `${profile.name}: T4 feedback authority boundary changed`);
      assert(data.feedbackState.physicsWrites === false && data.feedbackState.gameplayWrites === false &&
        data.feedbackState.raceRuleWrites === false && data.feedbackState.boostWrites === false &&
        data.feedbackState.cameraWrites === false,
        `${profile.name}: T4 feedback reports forbidden writes`);
      assert(data.feedbackDefaults.worldBurstPoolDesktop <= 5 && data.feedbackDefaults.worldBurstPoolMobile <= 3,
        `${profile.name}: T4 world-burst pool exceeded budget`);
      assert(feedbackPreview.state.previewCount >= 1 && feedbackPreview.state.lastType === 'checkpoint',
        `${profile.name}: T4 visual preview did not fire`);
      assert(feedbackPreview.state.activeWorldBursts >= 1,
        `${profile.name}: T4 checkpoint world burst not active`);
      assert(feedbackPreview.bannerVisible === true && feedbackPreview.bannerText === 'CHECKPOINT',
        `${profile.name}: T4 checkpoint banner not visible`);
      assert(stateBeforePreview && feedbackPreview.race &&
        stateBeforePreview.phase === feedbackPreview.race.phase &&
        stateBeforePreview.lap === feedbackPreview.race.lap &&
        stateBeforePreview.nextCheckpointIndex === feedbackPreview.race.nextCheckpointIndex,
        `${profile.name}: T4 preview mutated race progress`);

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