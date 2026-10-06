'use strict';

const assert = require('assert');
const AssetServer = require('../scripts/asset-server-cli.js');

assert.equal(AssetServer.DEFAULT_SERVER, 'https://3d.shep.bot');
assert.equal(
  AssetServer.serverBase({ JETSKI_ASSET_SERVER_URL: 'https://example.test///' }),
  'https://example.test'
);

const parsed = AssetServer.parseArgs([
  'search', 'low poly palm', '--type', 'model', '--free', 'true', '--downloadable', 'true', '--limit', '12'
]);
assert.equal(parsed.command, 'search');
assert.deepEqual(parsed.positional, ['low poly palm']);
assert.equal(parsed.flags.type, 'model');

const search = AssetServer.buildSearchUrl('tropical buoy', {
  type: 'model',
  free: 'true',
  downloadable: 'true',
  providers: 'polyhaven,kenney',
  limit: '9'
}, { JETSKI_ASSET_SERVER_URL: 'https://assets.example.test' });
assert.equal(search.origin, 'https://assets.example.test');
assert.equal(search.pathname, '/v1/search');
assert.equal(search.searchParams.get('q'), 'tropical buoy');
assert.equal(search.searchParams.get('type'), 'model');
assert.equal(search.searchParams.get('free'), 'true');
assert.equal(search.searchParams.get('downloadable'), 'true');
assert.equal(search.searchParams.get('limit'), '9');

assert.throws(() => AssetServer.buildSearchUrl('', {}, {}), /required/);
assert.throws(() => AssetServer.buildSearchUrl('boat', { type: 'exe' }, {}), /Unsupported/);

const asset = AssetServer.buildAssetUrl('polyhaven:Boat_01', {
  format: 'gltf',
  resolution: '1k'
}, {});
assert.equal(asset.pathname, '/v1/assets/polyhaven%3ABoat_01');
assert.equal(asset.searchParams.get('format'), 'gltf');
assert.equal(asset.searchParams.get('resolution'), '1k');

assert.deepEqual(
  AssetServer.licenseSummary({
    license: { name: 'CC0', commercialUse: true, attributionRequired: false }
  }),
  {
    name: 'CC0',
    commercialUse: true,
    attributionRequired: false,
    candidate: true,
    reason: 'Candidate only — record source/license before shipping.'
  }
);

assert.equal(AssetServer.licenseSummary({ license: { name: 'Custom', commercialUse: false } }).candidate, false);
assert.equal(AssetServer.licenseSummary({}).candidate, false);

console.log('3d-asset-server integration regression PASS');
