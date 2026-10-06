'use strict';

const fs = require('fs');
const path = require('path');
const { buildSearchUrl, licenseSummary, requestJson } = require('./asset-server-cli.js');

const OUT = path.resolve(__dirname, '..', 'artifacts', 'asset-discovery');
const DEFAULT_QUERIES = [
  { key: 'pwc', label: 'Jet Ski / PWC', query: 'personal watercraft jet ski', type: 'model', limit: 10 },
  { key: 'palm', label: 'Tropical palms', query: 'low poly tropical palm', type: 'model', limit: 10 },
  { key: 'rock', label: 'Coastal rocks', query: 'tropical coastal rock', type: 'model', limit: 10 },
  { key: 'dock', label: 'Pier / dock', query: 'wooden pier dock', type: 'model', limit: 10 },
  { key: 'buoy', label: 'Race buoy', query: 'race buoy', type: 'model', limit: 10 },
  { key: 'hdri', label: 'Tropical sunset HDRI', query: 'tropical sunset beach', type: 'hdri', limit: 8 }
];

function score(asset) {
  const lic = licenseSummary(asset);
  const name = String(lic.name || '').toUpperCase();
  let total = Number(asset && asset.score) || 0;
  if (name.includes('CC0') || name.includes('PUBLIC DOMAIN')) total += 4;
  if (asset && asset.price && asset.price.free) total += 2;
  if (asset && asset.downloadable) total += 2;
  if (lic.commercialUse === true) total += 1;
  if (lic.attributionRequired === false) total += 0.75;
  return total;
}

function acceptable(asset) {
  const lic = licenseSummary(asset);
  return lic.candidate && (!asset.price || asset.price.free !== false);
}

function summarize(asset) {
  const lic = licenseSummary(asset);
  return {
    id: asset.id || null,
    title: asset.title || null,
    type: asset.type || null,
    provider: asset.provider || String(asset.id || '').split(':')[0] || null,
    sourceUrl: asset.url || null,
    downloadable: Boolean(asset.downloadable),
    free: Boolean(asset.price && asset.price.free),
    formats: asset.formats || null,
    resolutions: asset.resolutions || null,
    score: score(asset),
    license: {
      name: lic.name,
      commercialUse: lic.commercialUse,
      attributionRequired: lic.attributionRequired
    }
  };
}

async function searchOne(spec) {
  const directUrl = buildSearchUrl(spec.query, {
    type: spec.type,
    free: 'true',
    downloadable: 'true',
    limit: String(spec.limit)
  });
  let direct = null;
  let fallback = null;
  try {
    direct = await requestJson(directUrl);
  } catch (error) {
    direct = { results: [], error: error.message };
  }

  let results = Array.isArray(direct.results) ? direct.results : [];
  if (results.filter(acceptable).length < 3) {
    const fallbackUrl = buildSearchUrl(spec.query, {
      type: spec.type,
      free: 'true',
      downloadable: 'false',
      limit: String(spec.limit)
    });
    try {
      fallback = await requestJson(fallbackUrl);
      results = results.concat(Array.isArray(fallback.results) ? fallback.results : []);
    } catch (error) {
      fallback = { results: [], error: error.message };
    }
  }

  const dedupe = new Map();
  for (const asset of results) {
    if (!asset || !asset.id || !acceptable(asset)) continue;
    if (!dedupe.has(asset.id)) dedupe.set(asset.id, asset);
  }

  const ranked = [...dedupe.values()]
    .sort((a,b)=>score(b)-score(a))
    .slice(0, 6)
    .map(summarize);

  return {
    key: spec.key,
    label: spec.label,
    query: spec.query,
    type: spec.type,
    candidates: ranked,
    providerReport: (fallback && fallback.providers) || (direct && direct.providers) || [],
    directError: direct && direct.error || null,
    fallbackError: fallback && fallback.error || null
  };
}

function markdown(report) {
  const lines = [
    '# Jet Ski Asset Discovery Pack',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Policy: candidates only. No asset is approved to ship until its exact listing/provider license is recorded in THIRD_PARTY_ASSETS.md.',
    ''
  ];

  for (const section of report.sections) {
    lines.push(`## ${section.label}`, '', `Query: \`${section.query}\``, '');
    if (!section.candidates.length) {
      lines.push('No acceptable free/commercial-use candidate returned.', '');
      continue;
    }
    section.candidates.forEach((a, i) => {
      lines.push(
        `${i + 1}. **${a.title || a.id}** — \`${a.id}\``,
        `   - Provider: ${a.provider || '-'}`,
        `   - License: ${a.license.name} · commercial=${String(a.license.commercialUse)} · attribution=${String(a.license.attributionRequired)}`,
        `   - Free: ${String(a.free)} · Direct download: ${String(a.downloadable)}`,
        a.sourceUrl ? `   - Source: ${a.sourceUrl}` : '   - Source: unavailable',
        ''
      );
    });
  }
  return lines.join('\n');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const sections = [];
  for (const spec of DEFAULT_QUERIES) {
    console.log(`Searching: ${spec.label} / ${spec.query}`);
    sections.push(await searchOne(spec));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    server: process.env.JETSKI_ASSET_SERVER_URL || 'https://3d.shep.bot',
    sections
  };

  fs.writeFileSync(path.join(OUT, 'candidates.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, 'CANDIDATES.md'), markdown(report));
  console.log(markdown(report));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
