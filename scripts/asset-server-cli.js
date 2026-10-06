'use strict';

/**
 * Optional development-time integration for arielshad/3d-asset-server.
 * No third-party runtime code is bundled into the game.
 *
 * Examples:
 *   npm run asset:search -- "low poly tropical island" --type model --free true --limit 8
 *   npm run asset:get -- polyhaven:WoodenChair_01 --format gltf --resolution 1k
 *   npm run asset:providers
 */

const DEFAULT_SERVER = 'https://3d.shep.bot';
const DEFAULT_TIMEOUT_MS = 15000;
const VALID_TYPES = new Set(['model','texture','material','hdri','sprite','ui','audio','font','pack']);

function serverBase(env = process.env) {
  return String(env.JETSKI_ASSET_SERVER_URL || DEFAULT_SERVER).replace(/\/+$/, '');
}

function parseBoolean(value, fallback) {
  if (value == null) return fallback;
  const v = String(value).toLowerCase();
  if (['1','true','yes','on'].includes(v)) return true;
  if (['0','false','no','off'].includes(v)) return false;
  return fallback;
}

function parseArgs(argv) {
  const args = [...argv];
  const command = args.shift() || 'help';
  const positional = [];
  const flags = {};
  while (args.length) {
    const token = args.shift();
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = args[0];
    if (next != null && !next.startsWith('--')) flags[key] = args.shift();
    else flags[key] = true;
  }
  return { command, positional, flags };
}

function buildSearchUrl(query, flags = {}, env = process.env) {
  if (!String(query || '').trim()) throw new Error('Search query is required.');
  const url = new URL('/v1/search', serverBase(env) + '/');
  url.searchParams.set('q', String(query).trim());

  const type = flags.type && String(flags.type).trim();
  if (type) {
    if (!VALID_TYPES.has(type)) throw new Error(`Unsupported asset type: ${type}`);
    url.searchParams.set('type', type);
  }

  const free = parseBoolean(flags.free, true);
  const downloadable = parseBoolean(flags.downloadable, false);
  url.searchParams.set('free', String(free));
  url.searchParams.set('downloadable', String(downloadable));

  if (flags.providers) url.searchParams.set('providers', String(flags.providers));
  const limit = Math.max(1, Math.min(50, Number(flags.limit) || 8));
  const offset = Math.max(0, Number(flags.offset) || 0);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  return url;
}

function buildAssetUrl(id, flags = {}, env = process.env) {
  if (!String(id || '').trim()) throw new Error('Asset id is required.');
  const url = new URL('/v1/assets/' + encodeURIComponent(String(id).trim()), serverBase(env) + '/');
  if (flags.format) url.searchParams.set('format', String(flags.format));
  if (flags.resolution) url.searchParams.set('resolution', String(flags.resolution));
  return url;
}

function licenseSummary(asset) {
  const lic = asset && asset.license || {};
  const name = String(lic.name || 'UNKNOWN');
  const commercialUse = lic.commercialUse;
  const attributionRequired = lic.attributionRequired;
  const candidate = name !== 'UNKNOWN' && commercialUse !== false;
  return {
    name,
    commercialUse,
    attributionRequired,
    candidate,
    reason: candidate
      ? 'Candidate only — record source/license before shipping.'
      : 'Do not ship until commercial-use/license terms are verified.'
  };
}

async function requestJson(url, env = process.env) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const headers = { accept: 'application/json' };
  if (env.ASSET_SERVER_API_KEY) headers.authorization = `Bearer ${env.ASSET_SERVER_API_KEY}`;

  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(`Asset server HTTP ${response.status}: ${response.statusText}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function printSearch(data) {
  const results = Array.isArray(data && data.results) ? data.results : [];
  if (!results.length) {
    console.log('No asset candidates found.');
    return;
  }

  console.log(`Found ${results.length} candidate(s). Nothing is added to the game automatically.\n`);
  for (let i = 0; i < results.length; i++) {
    const asset = results[i];
    const license = licenseSummary(asset);
    console.log(`${i + 1}. ${asset.title || asset.id || 'Untitled'}`);
    console.log(`   id: ${asset.id || '-'}`);
    console.log(`   type: ${asset.type || '-'}  provider: ${asset.provider || String(asset.id || '').split(':')[0] || '-'}`);
    console.log(`   license: ${license.name}  commercial: ${String(license.commercialUse)}  attribution: ${String(license.attributionRequired)}`);
    console.log(`   downloadable: ${String(Boolean(asset.downloadable))}  free: ${String(Boolean(asset.price && asset.price.free))}`);
    if (asset.url) console.log(`   source: ${asset.url}`);
    console.log(`   policy: ${license.reason}\n`);
  }

  if (Array.isArray(data.providers)) {
    const failed = data.providers.filter(p => p && !['ok','skipped','link'].includes(p.status));
    if (failed.length) console.log('Provider warnings:', failed.map(p => `${p.provider}:${p.status}`).join(', '));
  }
}

function printHelp() {
  console.log(`Jet Ski 3D Asset Discovery

Commands:
  search <query> [--type model] [--free true] [--downloadable false] [--providers polyhaven,kenney] [--limit 8]
  get <provider:id> [--format gltf] [--resolution 1k]
  providers

Environment:
  JETSKI_ASSET_SERVER_URL   Override server (default: ${DEFAULT_SERVER})
  ASSET_SERVER_API_KEY      Optional key for a self-hosted protected server

Policy:
  Discovery only. Never ship an asset until THIRD_PARTY_ASSETS.md records source, author/provider,
  license/commercial-use terms, date checked, modifications and attribution requirements.
`);
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const { command, positional, flags } = parseArgs(argv);
  if (command === 'help' || command === '--help' || command === '-h') return printHelp();

  if (command === 'search') {
    const query = positional.join(' ');
    const data = await requestJson(buildSearchUrl(query, flags, env), env);
    return printSearch(data);
  }

  if (command === 'get') {
    const data = await requestJson(buildAssetUrl(positional[0], flags, env), env);
    console.log(JSON.stringify({
      ...data,
      jetSkiLicenseReview: licenseSummary(data)
    }, null, 2));
    return;
  }

  if (command === 'providers') {
    const url = new URL('/v1/providers', serverBase(env) + '/');
    const data = await requestJson(url, env);
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('[asset-server]', error && error.message ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_SERVER,
  VALID_TYPES,
  serverBase,
  parseBoolean,
  parseArgs,
  buildSearchUrl,
  buildAssetUrl,
  licenseSummary,
  requestJson,
  main
};
