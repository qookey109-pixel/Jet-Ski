const assert = require('assert');
const coast = require('../src/real-world-coast.js');

const site = {
  origin: { lat: 21.2767, lon: -157.8271 },
  bounds: { south: 21.245, west: -157.885, north: 21.315, east: -157.775 }
};

assert(site.origin.lat > site.bounds.south && site.origin.lat < site.bounds.north);
assert(site.origin.lon > site.bounds.west && site.origin.lon < site.bounds.east);

const localOrigin = coast.latLonToLocal(
  site.origin.lat,
  site.origin.lon,
  site.origin.lat,
  site.origin.lon
);
assert(Math.abs(localOrigin.x) < 1e-9);
assert(Math.abs(localOrigin.z) < 1e-9);

const east = coast.latLonToLocal(
  site.origin.lat,
  site.origin.lon + 0.01,
  site.origin.lat,
  site.origin.lon
);
assert(east.x > 0, 'eastward longitude must map to +X even in the western hemisphere');

const query = coast.buildOverpassQuery(site.bounds);
assert(query.includes('natural'));
assert(query.includes('coastline'));
assert(query.includes('21.245,-157.885,21.315,-157.775'));

console.log('hawaii-coast tests PASS');
