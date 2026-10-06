'use strict';

const fs = require('fs');
const path = require('path');

const SERVER = String(process.env.JETSKI_ASSET_SERVER_URL || 'https://3d.shep.bot').replace(/\/+$/, '');
const OUT = path.resolve(__dirname, '..', 'artifacts', 'asset-download-preview');

const PICKS = [
  { id: 'kenney:watercraft-kit', slug: 'kenney-watercraft-kit' },
  { id: 'polyhaven:ocean_buoy', slug: 'polyhaven-ocean-buoy-1k-gltf', format: 'gltf', resolution: '1k' }
];

function fileNameFromHeaders(response, fallback) {
  const disposition = response.headers.get('content-disposition') || '';
  const star = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) return decodeURIComponent(star[1]);
  const normal = disposition.match(/filename="?([^";]+)"?/i);
  if (normal) return normal[1];
  const type = response.headers.get('content-type') || '';
  if (type.includes('zip')) return fallback + '.zip';
  if (type.includes('gltf')) return fallback + '.gltf';
  if (type.includes('json')) return fallback + '.json';
  return fallback + '.bin';
}

async function download(pick) {
  const url = new URL('/v1/assets/' + encodeURIComponent(pick.id) + '/download', SERVER + '/');
  if (pick.format) url.searchParams.set('format', pick.format);
  if (pick.resolution) url.searchParams.set('resolution', pick.resolution);

  console.log('Downloading', pick.id, url.toString());
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${pick.id} HTTP ${response.status}: ${response.statusText}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  const filename = fileNameFromHeaders(response, pick.slug);
  const out = path.join(OUT, filename);
  fs.writeFileSync(out, bytes);
  return {
    id: pick.id,
    format: pick.format || null,
    resolution: pick.resolution || null,
    file: filename,
    bytes: bytes.length,
    contentType: response.headers.get('content-type') || null,
    source: url.toString()
  };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const downloads = [];
  for (const pick of PICKS) downloads.push(await download(pick));
  fs.writeFileSync(path.join(OUT, 'download-manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), downloads }, null, 2));
  console.log(JSON.stringify(downloads, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
