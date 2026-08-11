const assert = require('assert');
const coast = require('../src/real-world-coast.js');

const origin = { lat: 24.0, lon: 121.6 };
const overpass = {
  elements: [
    {
      type: 'way',
      id: 42,
      tags: { natural: 'coastline' },
      geometry: [
        { lat: 24.0, lon: 121.59 },
        { lat: 24.0, lon: 121.61 }
      ]
    },
    { type: 'way', id: 99, tags: { natural: 'beach' }, geometry: [] }
  ]
};

const lines = coast.extractCoastlines(overpass, origin);
assert.strictEqual(lines.length, 1);
assert.strictEqual(lines[0].sourceId, 42);

// Eastward geographic way: OSM land is north/left, water is south/right.
// Since local north = -Z, south/water becomes +Z and must report positive signed distance.
const water = coast.nearestCoast({ x: 0, z: 100 }, lines);
const land = coast.nearestCoast({ x: 0, z: -100 }, lines);
assert(water.signedDistance > 0);
assert(land.signedDistance < 0);
assert.strictEqual(coast.isWaterSide({ x: 0, z: 100 }, lines, 0), true);
assert.strictEqual(coast.isWaterSide({ x: 0, z: -100 }, lines, 0), false);

// A finite coastline bbox must not become an infinite fake wall. Once outside the
// nearshore guard range, local coastline collision has no authority.
assert.strictEqual(coast.isWaterSide({ x: 0, z: -5000 }, lines, 0, 1200), true);

const q = coast.buildOverpassQuery({ south: 23.9, west: 121.5, north: 24.1, east: 121.7 });
assert(q.includes('natural'));
assert(q.includes('coastline'));
assert(q.includes('23.9,121.5,24.1,121.7'));

console.log('real-world-coast tests PASS');
