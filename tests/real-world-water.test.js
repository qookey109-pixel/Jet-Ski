const assert = require('assert');
const Geo = require('../src/real-world-water.js');

const origin = { lat: 23.861, lon: 120.9183 };
const p0 = Geo.latLonToLocal(origin.lat, origin.lon, origin.lat, origin.lon);
assert(Math.abs(p0.x) < 1e-9 && Math.abs(p0.z) < 1e-9);

const outer = [
  { x: -10, z: -10 }, { x: 10, z: -10 },
  { x: 10, z: 10 }, { x: -10, z: 10 }, { x: -10, z: -10 }
];
const hole = [
  { x: -2, z: -2 }, { x: 2, z: -2 },
  { x: 2, z: 2 }, { x: -2, z: 2 }, { x: -2, z: -2 }
];
assert(Geo.pointInWater({ x: 7, z: 0 }, outer, [hole]));
assert(!Geo.pointInWater({ x: 0, z: 0 }, outer, [hole]));
assert(!Geo.pointInWater({ x: 20, z: 0 }, outer, [hole]));

const stitched = Geo.stitchSegments([
  [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }],
  [{ lat: 1, lon: 1 }, { lat: 1, lon: 0 }],
  [{ lat: 0, lon: 1 }, { lat: 1, lon: 1 }],
  [{ lat: 1, lon: 0 }, { lat: 0, lon: 0 }]
]);
assert.strictEqual(stitched.length, 1);
assert(stitched[0].length >= 5);

const overpass = {
  elements: [
    {
      type: 'way', id: 1, tags: { natural: 'water', name: 'Small pond' },
      geometry: [
        { lat: 23.8610, lon: 120.9183 }, { lat: 23.8610, lon: 120.9184 },
        { lat: 23.8611, lon: 120.9184 }, { lat: 23.8611, lon: 120.9183 },
        { lat: 23.8610, lon: 120.9183 }
      ]
    },
    {
      type: 'way', id: 2, tags: { natural: 'water', name: '日月潭' },
      geometry: [
        { lat: 23.8600, lon: 120.9170 }, { lat: 23.8600, lon: 120.9190 },
        { lat: 23.8620, lon: 120.9190 }, { lat: 23.8620, lon: 120.9170 },
        { lat: 23.8600, lon: 120.9170 }
      ]
    }
  ]
};
const best = Geo.extractBestWaterPolygon(overpass, origin);
assert(best);
assert.strictEqual(best.sourceId, 2);
assert(best.outer.length >= 5);

const query = Geo.buildOverpassQuery({ south: 1, west: 2, north: 3, east: 4 });
assert(query.includes('natural'));
assert(query.includes('(1,2,3,4)'));
console.log('real-world-water tests PASS');
