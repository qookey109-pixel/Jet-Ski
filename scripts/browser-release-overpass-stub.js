'use strict';

// V0.11.16 Browser Release QA only.
// Prevent external Overpass and water-normal availability/rate limits from deciding
// deterministic Chromium/WebKit product-flow acceptance. Production coastline and
// ocean/rendering runtimes are untouched.
const playwright = require('playwright');

const OVERPASS_HOSTS = new Set(['overpass-api.de', 'overpass.kumi.systems']);
const WATER_NORMAL_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/r152/examples/textures/waternormals.jpg';
// Deterministic 2x2 RGB flat-normal PNG (128,128,255), used only inside Browser Release QA.
const FLAT_NORMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNsaPjPwMDAxMDAwMDAAAAXnwIDVqKEkwAAAABJRU5ErkJggg==',
  'base64'
);

function bboxFromRequest(requestUrl) {
  try {
    const parsed = new URL(requestUrl);
    const query = parsed.searchParams.get('data') || '';
    const match = query.match(/\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)/);
    if (!match) return null;
    const south = Number(match[1]);
    const west = Number(match[2]);
    const north = Number(match[3]);
    const east = Number(match[4]);
    if (![south, west, north, east].every(Number.isFinite)) return null;
    if (!(north > south) || !(east > west)) return null;
    return { south, west, north, east };
  } catch (_) {
    return null;
  }
}

function syntheticCoastline(requestUrl) {
  const bbox = bboxFromRequest(requestUrl) || {
    south: 0,
    west: 0,
    north: 0.01,
    east: 0.01
  };
  const latSpan = bbox.north - bbox.south;
  const lonSpan = bbox.east - bbox.west;
  const centerLat = (bbox.south + bbox.north) * 0.5;
  const centerLon = (bbox.west + bbox.east) * 0.5;

  return {
    version: 0.6,
    generator: 'swim-ring-racing-v0.11.16-browser-qa',
    elements: [{
      type: 'way',
      id: 11001116,
      tags: { natural: 'coastline' },
      geometry: [
        { lat: centerLat - latSpan * 0.28, lon: centerLon - lonSpan * 0.08 },
        { lat: centerLat, lon: centerLon },
        { lat: centerLat + latSpan * 0.28, lon: centerLon + lonSpan * 0.08 }
      ]
    }]
  };
}

async function installBrowserQaIsolation(context) {
  await context.route(/^https:\/\/(?:overpass-api\.de|overpass\.kumi\.systems)\//, async route => {
    const url = route.request().url();
    let hostname = '';
    try { hostname = new URL(url).hostname; } catch (_) {}
    if (!OVERPASS_HOSTS.has(hostname)) return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(syntheticCoastline(url))
    });
  });

  await context.route(WATER_NORMAL_URL, route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: FLAT_NORMAL_PNG
  }));
}

// Backward-compatible export name retained for any focused tests/tools.
const installOverpassIsolation = installBrowserQaIsolation;

// This module is loaded with `node -r` before browser-release-qa-v2.js imports
// Playwright. Patch BrowserType.launch once so every BrowserContext receives the
// deterministic QA-only routes before its first page is created.
const browserTypePrototype = Object.getPrototypeOf(playwright.chromium);
if (browserTypePrototype && !browserTypePrototype.__jetskiBrowserQaIsolationInstalled) {
  const originalLaunch = browserTypePrototype.launch;
  Object.defineProperty(browserTypePrototype, '__jetskiBrowserQaIsolationInstalled', {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });

  browserTypePrototype.launch = async function jetskiBrowserQaLaunch(...args) {
    const browser = await originalLaunch.apply(this, args);
    const browserPrototype = Object.getPrototypeOf(browser);
    if (browserPrototype && !browserPrototype.__jetskiBrowserQaIsolationInstalled) {
      const originalNewContext = browserPrototype.newContext;
      Object.defineProperty(browserPrototype, '__jetskiBrowserQaIsolationInstalled', {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false
      });
      browserPrototype.newContext = async function jetskiBrowserQaNewContext(...contextArgs) {
        const context = await originalNewContext.apply(this, contextArgs);
        await installBrowserQaIsolation(context);
        return context;
      };
    }
    return browser;
  };
}

module.exports = {
  WATER_NORMAL_URL,
  FLAT_NORMAL_PNG,
  bboxFromRequest,
  syntheticCoastline,
  installBrowserQaIsolation,
  installOverpassIsolation
};
