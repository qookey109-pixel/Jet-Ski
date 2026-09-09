'use strict';

const fs = require('fs');
const path = require('path');
const { chromium, webkit } = require('playwright');
const { startStaticServer } = require('./static-server.js');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'artifacts', 'zh-hant-ui-qa');
const PORT = Number(process.env.ZH_HANT_QA_PORT) || 4192;
const BASE = `http://127.0.0.1:${PORT}/`;
const VERSION = 'V0.11.16';
const LOCALE_VERSION = 'zh-Hant-TW-v3';

const ALLOWED_LATIN = new Set([
  'v', 'v0', 'km', 'h', 'hs', 'tp', 'm', 'api', 'json', 'safari', 'google', 'maps', 'platform',
  'webgl', 'fps', 'hz', 'ms', 'point', 'osm', 'pb', 'x', 'w', 'a', 's', 'd', 'esc', 'start'
]);

function assert(value, message) {
  if (!value) throw new Error(message);
}

function slug(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
}

function latinResidues(text) {
  const words = String(text || '').match(/[A-Za-z][A-Za-z0-9+-]*/g) || [];
  return [...new Set(words.filter(word => !ALLOWED_LATIN.has(word.toLowerCase())))];
}

function cleanText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

async function prepare(context) {
  await context.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('swimRing.onboarding.v01112', JSON.stringify({ version: 1, seen: true, opens: 0 }));
      localStorage.setItem('swimRing.graphics.v0114', JSON.stringify({
        mode: 'auto', resolutionScale: 1, shadowOverride: null, motionEffects: true
      }));
    } catch (_) {}
  });
}

async function ready(page) {
  await page.waitForFunction(expected => Boolean(
    window.JETSKI_RELEASE && window.JETSKI_RELEASE.version === expected.release &&
    window.JETSKI_ZH_HANT && window.JETSKI_ZH_HANT.VERSION === expected.locale &&
    window.JETSKI_RACE_MANAGER && window.JETSKI_PROGRESSION &&
    window.JETSKI_COSMETICS && window.JETSKI_CHALLENGES &&
    window.JETSKI_ONBOARDING && window.JETSKI_QUALITY &&
    window.JETSKI_AUDIO && window.JETSKI_SAVE_RECOVERY
  ), { release: VERSION, locale: LOCALE_VERSION }, { timeout: 30000 });
  await page.waitForTimeout(450);
}

async function shot(page, engine, profile, label) {
  const file = `${slug(engine)}-${slug(profile)}-${slug(label)}.png`;
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  return file;
}

async function panelText(page, selector) {
  await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(90);
  return page.locator(selector).evaluate(node => node.innerText || node.textContent || '');
}

function recordPanel(receipt, label, text) {
  const cleaned = cleanText(text);
  const residues = latinResidues(cleaned);
  receipt.panels.push({ label, text: cleaned, latinResidues: residues });
  assert(!residues.length, `${label} contains untranslated Latin words: ${residues.join(', ')} :: ${cleaned}`);
}

async function verifyIdentity(page, receipt) {
  const identity = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.title,
    release: window.JETSKI_RELEASE && window.JETSKI_RELEASE.version,
    locale: window.JETSKI_ZH_HANT && window.JETSKI_ZH_HANT.VERSION,
    fastPath: Boolean(window.JETSKI_ZH_HANT && window.JETSKI_ZH_HANT.highFrequencyNumericFastPath)
  }));
  assert(identity.lang === 'zh-Hant-TW', `Unexpected lang: ${identity.lang}`);
  assert(identity.title === '泳圈競速 V0.11.16', `Unexpected title: ${identity.title}`);
  assert(identity.release === VERSION && identity.locale === LOCALE_VERSION, `Version mismatch: ${JSON.stringify(identity)}`);
  assert(identity.fastPath, 'Localization numeric fast path is not active');
  receipt.identity = identity;
}

async function verifyMenu(page, receipt, engine, profile) {
  const text = await panelText(page, '[data-jr-screen="menu"].show .jr-card');
  recordPanel(receipt, 'menu', text);
  receipt.screenshots.push(await shot(page, engine, profile, 'menu'));
}

async function verifyControls(page, receipt, engine, profile) {
  await page.locator('[data-jr-screen="menu"] [data-jr-action="controls"]').click();
  const text = await panelText(page, '[data-jr-controls].show');
  recordPanel(receipt, 'controls', text);
  receipt.screenshots.push(await shot(page, engine, profile, 'controls'));
  await page.locator('[data-jr-screen="menu"] [data-jr-action="controls"]').click();
}

async function verifyOnboarding(page, receipt, engine, profile) {
  await page.evaluate(() => window.JETSKI_ONBOARDING.openTutorial());
  const text = await panelText(page, '.jr-onboarding.show .jr-onboarding-card');
  recordPanel(receipt, 'onboarding', text);
  assert(text.includes('駛向') && text.includes('海平線'), `Onboarding title is not localized: ${cleanText(text)}`);
  receipt.screenshots.push(await shot(page, engine, profile, 'onboarding'));
  await page.evaluate(() => window.JETSKI_ONBOARDING.closeTutorial());
}

async function verifyGarage(page, receipt, engine, profile) {
  await page.evaluate(() => window.JETSKI_COSMETICS.openGarage());
  const text = await panelText(page, '.jr-garage-panel.show .jr-garage-card');
  recordPanel(receipt, 'garage', text);
  assert(!/\bin\s+\d+★/i.test(text) && !/required/i.test(text), `Garage unlock copy still contains English: ${cleanText(text)}`);
  receipt.screenshots.push(await shot(page, engine, profile, 'garage'));
  await page.locator('[data-garage-close]').click();
}

async function verifyChallenges(page, receipt, engine, profile) {
  await page.evaluate(() => window.JETSKI_CHALLENGES.openBoard());
  const text = await panelText(page, '.jr-challenge-panel.show .jr-challenge-card');
  recordPanel(receipt, 'challenges', text);
  receipt.screenshots.push(await shot(page, engine, profile, 'challenges'));
  await page.evaluate(() => window.JETSKI_CHALLENGES.closeBoard());
}

async function verifyQuality(page, receipt, engine, profile) {
  await page.evaluate(() => window.JETSKI_QUALITY.openPanel());
  const selector = '[aria-label="畫面設定"]';
  const text = await panelText(page, selector);
  recordPanel(receipt, 'quality', text);
  assert(!/\b(AUTO|LOW|MEDIUM|HIGH|ULTRA)\b/.test(text), `Quality status still contains English mode: ${cleanText(text)}`);
  receipt.screenshots.push(await shot(page, engine, profile, 'quality'));
  await page.locator('[data-quality-close]').click();
}

async function verifyAudio(page, receipt, engine, profile) {
  await page.evaluate(() => window.JETSKI_AUDIO.openPanel());
  const text = await panelText(page, '[data-audio-controls]');
  recordPanel(receipt, 'audio-controls', text);
  receipt.screenshots.push(await shot(page, engine, profile, 'audio'));
  await page.locator('[data-audio-close]').click();
}

async function verifySave(page, receipt, engine, profile) {
  await page.evaluate(() => window.JETSKI_SAVE_RECOVERY.openPanel());
  const text = await panelText(page, '.jr-save-panel.show .jr-save-card');
  recordPanel(receipt, 'save-recovery', text);
  receipt.screenshots.push(await shot(page, engine, profile, 'save-recovery'));
  await page.evaluate(() => window.JETSKI_SAVE_RECOVERY.closePanel());
}

async function runDesktop(engine, browserType, fullPanels) {
  const receipt = { engine, profile: 'desktop', status: 'RUNNING', panels: [], screenshots: [], errors: [] };
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await prepare(context);
    const page = await context.newPage();
    page.on('pageerror', error => receipt.errors.push(String(error && error.stack || error)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ready(page);
    await verifyIdentity(page, receipt);
    await verifyMenu(page, receipt, engine, 'desktop');
    await verifyControls(page, receipt, engine, 'desktop');
    await verifyOnboarding(page, receipt, engine, 'desktop');
    await verifyQuality(page, receipt, engine, 'desktop');
    if (fullPanels) {
      await verifyGarage(page, receipt, engine, 'desktop');
      await verifyChallenges(page, receipt, engine, 'desktop');
      await verifyAudio(page, receipt, engine, 'desktop');
      await verifySave(page, receipt, engine, 'desktop');
    }
    assert(!receipt.errors.length, `Page errors: ${receipt.errors.join(' | ')}`);
    receipt.localizationStats = await page.evaluate(() => Object.assign({}, window.JETSKI_ZH_HANT.stats));
    receipt.status = 'PASS';
    await context.close();
  } catch (error) {
    receipt.status = 'FAIL';
    receipt.failure = String(error && error.stack || error);
  } finally {
    await browser.close();
  }
  return receipt;
}

async function runMobile() {
  const receipt = { engine: 'webkit', profile: 'mobile', status: 'RUNNING', panels: [], screenshots: [], errors: [] };
  const browser = await webkit.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    await prepare(context);
    const page = await context.newPage();
    page.on('pageerror', error => receipt.errors.push(String(error && error.stack || error)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ready(page);
    await verifyIdentity(page, receipt);
    await verifyMenu(page, receipt, 'webkit', 'mobile-landscape');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(450);
    const rotateText = await panelText(page, '.v01114-rotate.show');
    recordPanel(receipt, 'portrait-guidance', rotateText);
    assert(rotateText.includes('請旋轉為橫向'), `Portrait guidance title missing: ${cleanText(rotateText)}`);
    receipt.screenshots.push(await shot(page, 'webkit', 'mobile-portrait', 'rotate-guidance'));

    assert(!receipt.errors.length, `Page errors: ${receipt.errors.join(' | ')}`);
    receipt.localizationStats = await page.evaluate(() => Object.assign({}, window.JETSKI_ZH_HANT.stats));
    receipt.status = 'PASS';
    await context.close();
  } catch (error) {
    receipt.status = 'FAIL';
    receipt.failure = String(error && error.stack || error);
  } finally {
    await browser.close();
  }
  return receipt;
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const server = startStaticServer(DIST, PORT);
  try {
    await new Promise(resolve => setTimeout(resolve, 250));
    const receipts = [
      await runDesktop('chromium', chromium, true),
      await runDesktop('webkit', webkit, false),
      await runMobile()
    ];
    const result = {
      version: VERSION,
      localeVersion: LOCALE_VERSION,
      generatedAt: new Date().toISOString(),
      receipts,
      status: receipts.every(item => item.status === 'PASS') ? 'PASS' : 'FAIL'
    };
    fs.writeFileSync(path.join(OUT, 'receipt.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== 'PASS') process.exitCode = 1;
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
