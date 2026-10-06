'use strict';

const fs = require('fs');
const path = require('path');
const { buildAssetUrl, requestJson, licenseSummary } = require('./asset-server-cli.js');

const OUT = path.resolve(__dirname, '..', 'artifacts', 'asset-intake');
const PICKS = [
  { id: 'kenney:watercraft-kit', role: 'player/AI craft candidate', format: null, resolution: null },
  { id: 'polyhaven:ocean_buoy', role: 'race buoy / venue prop', format: 'gltf', resolution: '1k' },
  { id: 'polyhaven:modular_wooden_pier', role: 'start/finish venue prop', format: 'gltf', resolution: '1k' },
  { id: 'polyhaven:coast_rocks_05', role: 'tropical shoreline dressing', format: 'gltf', resolution: '1k' }
];

function compact(raw, pick) {
  const lic = licenseSummary(raw);
  return {
    id: pick.id,
    role: pick.role,
    title: raw.title || raw.name || pick.id,
    provider: raw.provider || pick.id.split(':')[0],
    sourceUrl: raw.url || raw.sourceUrl || null,
    description: raw.description || null,
    downloadable: raw.downloadable,
    price: raw.price || null,
    formats: raw.formats || raw.availableFormats || null,
    resolutions: raw.resolutions || raw.availableResolutions || null,
    files: raw.files || raw.downloads || null,
    license: {
      name: lic.name,
      commercialUse: lic.commercialUse,
      attributionRequired: lic.attributionRequired,
      candidate: lic.candidate
    },
    requestedFormat: pick.format,
    requestedResolution: pick.resolution
  };
}

function markdown(items) {
  const lines = [
    '# Jet Ski Asset Intake — Pass 01',
    '',
    'These are metadata-reviewed candidates only. Binary assets are not yet committed.',
    ''
  ];
  for (const item of items) {
    lines.push(
      `## ${item.title}`,
      '',
      `- ID: \`${item.id}\``,
      `- Intended role: ${item.role}`,
      `- Provider: ${item.provider}`,
      `- License: ${item.license.name} · commercial=${String(item.license.commercialUse)} · attribution=${String(item.license.attributionRequired)}`,
      `- Downloadable: ${String(item.downloadable)}`,
      `- Formats: ${JSON.stringify(item.formats)}`,
      `- Resolutions: ${JSON.stringify(item.resolutions)}`,
      item.sourceUrl ? `- Source: ${item.sourceUrl}` : '- Source: unavailable',
      ''
    );
  }
  return lines.join('\n');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const items = [];
  for (const pick of PICKS) {
    console.log('Inspecting', pick.id);
    const raw = await requestJson(buildAssetUrl(pick.id, {
      ...(pick.format ? { format: pick.format } : {}),
      ...(pick.resolution ? { resolution: pick.resolution } : {})
    }));
    fs.writeFileSync(
      path.join(OUT, pick.id.replace(/[^a-z0-9_-]+/gi, '_') + '.json'),
      JSON.stringify(raw, null, 2)
    );
    items.push(compact(raw, pick));
  }
  const report = { generatedAt: new Date().toISOString(), items };
  fs.writeFileSync(path.join(OUT, 'intake.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, 'INTAKE.md'), markdown(items));
  console.log(markdown(items));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
