const assert = require('assert');
const preview = require('../src/v01051-real-world-3d-preview.js');

assert.equal(preview.VERSION, 'V0.10.5.1');
assert.equal(preview.RENDERER_VERSION, '0.3.36');
assert.equal(preview.THREE_VERSION, '0.152.2');

assert.equal(preview.isCoastMode('taiwan-coast'), true);
assert.equal(preview.isCoastMode('hawaii-coast'), true);
assert.equal(preview.isCoastMode('open-sea'), false);
assert.equal(preview.isCoastMode('sun-moon-lake'), false);

const taiwan = preview.resolveSiteForMode('taiwan-coast');
assert.equal(taiwan.id, 'qixingtan-hualien');
assert.equal(taiwan.lat, 24.031426);
assert.equal(taiwan.lon, 121.62717);
const hawaii = preview.resolveSiteForMode('hawaii-coast');
assert.equal(hawaii.id, 'waikiki-oahu');
assert.equal(hawaii.lat, 21.2767);
assert.equal(hawaii.lon, -157.8271);
assert.equal(preview.resolveSiteForMode('open-sea'), null);

// Renderer local X+ = north, Z+ = east. Game X+ = east, Z+ = south.
assert.deepEqual(preview.tileLocalToGameLocal({ x: 1, y: 2, z: 0 }), { x: 0, y: 2, z: -1 });
assert.deepEqual(preview.tileLocalToGameLocal({ x: 0, y: 2, z: 1 }), { x: 1, y: 2, z: 0 });
assert.deepEqual(preview.tileLocalToGameLocal({ x: 4, y: 3, z: -7 }), { x: -7, y: 3, z: -4 });

assert.equal(preview.normalizeApiKey('  abc123  '), 'abc123');
assert.equal(preview.normalizeApiKey(null), '');

assert.equal(preview.isNetwork3DSupported('https:'), true);
assert.equal(preview.isNetwork3DSupported('http:'), true);
assert.equal(preview.isNetwork3DSupported('file:'), false);

const safari = preview.getPerformanceBudget('Mozilla/5.0 Version/26.0 Safari/605.1.15', 900);
assert.equal(safari.updateHz, 10);
assert.equal(safari.errorTarget, 22);
const chrome = preview.getPerformanceBudget('Mozilla/5.0 Chrome/140.0 Safari/537.36', 900);
assert.equal(chrome.updateHz, 15);
assert.equal(chrome.errorTarget, 18);
const mobile = preview.getPerformanceBudget('Mozilla/5.0 iPhone Version/26.0 Mobile Safari/605.1.15', 390);
assert.equal(mobile.updateHz, 8);
assert.equal(mobile.errorTarget, 26);

console.log('V0.10.5.1 real-world 3D preview configuration regression PASS');
