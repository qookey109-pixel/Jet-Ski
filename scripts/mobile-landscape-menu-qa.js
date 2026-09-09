'use strict';

const fs = require('fs');
const path = require('path');
const { webkit } = require('playwright');
const { startStaticServer } = require('./static-server.js');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'artifacts', 'zh-hant-ui-qa');
const PORT = Number(process.env.MOBILE_MENU_QA_PORT) || 4193;
const BASE = `http://127.0.0.1:${PORT}/`;
const VIEWPORT = { width: 844, height: 390 };

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const receipt = {
    version: 'V0.11.16',
    profile: 'webkit-mobile-landscape-844x390',
    status: 'RUNNING',
    viewport: VIEWPORT,
    generatedAt: new Date().toISOString()
  };
  const server = startStaticServer(DIST, PORT);
  let browser;
  let page;
  try {
    await new Promise(resolve => setTimeout(resolve, 250));
    browser = await webkit.launch({ headless: true });
    const context = await browser.newContext({ viewport: VIEWPORT, hasTouch: true, isMobile: true });
    await context.addInitScript(() => {
      try {
        localStorage.clear();
        localStorage.setItem('swimRing.onboarding.v01112', JSON.stringify({ version: 1, seen: true, opens: 0 }));
      } catch (_) {}
    });
    page = await context.newPage();
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(
      window.JETSKI_RELEASE && window.JETSKI_RELEASE.version === 'V0.11.16' &&
      window.JETSKI_MOBILE_UX && window.JETSKI_ZH_HANT && window.JETSKI_PROGRESSION &&
      document.body.classList.contains('v01114-compact-landscape') &&
      document.body.dataset.v01114Phase === 'menu'
    ), null, { timeout: 30000 });
    await page.waitForTimeout(500);

    const metrics = await page.evaluate(() => {
      const card = document.querySelector('[data-jr-screen="menu"].show .jr-card');
      const selectors = {
        start: '[data-jr-screen="menu"] [data-jr-action="start"]',
        free: '[data-jr-screen="menu"] [data-jr-action="free"]',
        more: '[data-jr-screen="menu"] .v01114-more-toggle'
      };
      const actions = {};
      for (const [name, selector] of Object.entries(selectors)) {
        const node = document.querySelector(selector);
        if (!node) {
          actions[name] = null;
          continue;
        }
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        actions[name] = {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity
        };
      }
      const cardRect = card && card.getBoundingClientRect();
      return {
        innerWidth,
        innerHeight,
        bodyClasses: document.body.className,
        card: card ? {
          top: cardRect.top,
          bottom: cardRect.bottom,
          clientHeight: card.clientHeight,
          scrollHeight: card.scrollHeight,
          scrollTop: card.scrollTop
        } : null,
        actions
      };
    });
    receipt.metrics = metrics;

    assert(metrics.card, 'Menu card is missing');
    assert(metrics.card.scrollTop === 0, `Menu card was already scrolled: ${metrics.card.scrollTop}`);
    for (const name of ['start', 'free', 'more']) {
      const action = metrics.actions[name];
      assert(action, `${name} action is missing`);
      assert(action.display !== 'none' && action.visibility !== 'hidden' && Number(action.opacity) > 0,
        `${name} action is not visible: ${JSON.stringify(action)}`);
      assert(action.top >= 0 && action.left >= 0 && action.right <= metrics.innerWidth && action.bottom <= metrics.innerHeight,
        `${name} action is outside the 844x390 first fold: ${JSON.stringify(action)}`);
    }

    receipt.screenshot = 'webkit-mobile-landscape-menu-first-fold.png';
    await page.screenshot({ path: path.join(OUT, receipt.screenshot), fullPage: false });
    receipt.status = 'PASS';
    await context.close();
  } catch (error) {
    receipt.status = 'FAIL';
    receipt.failure = String(error && error.stack || error);
    if (page) {
      try {
        receipt.screenshot = 'webkit-mobile-landscape-menu-first-fold-fail.png';
        await page.screenshot({ path: path.join(OUT, receipt.screenshot), fullPage: false });
      } catch (_) {}
    }
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(OUT, 'mobile-landscape-menu-receipt.json'), JSON.stringify(receipt, null, 2));
    if (browser) await browser.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
    console.log(JSON.stringify(receipt, null, 2));
  }
}

main().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
