'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const p = path.resolve(__dirname, '..', 'scripts', 'asset-discovery-pack.js');
const src = fs.readFileSync(p, 'utf8');

for (const needle of [
  'personal watercraft jet ski',
  'low poly tropical palm',
  'tropical coastal rock',
  'wooden pier dock',
  'race buoy',
  'tropical sunset beach'
]) assert(src.includes(needle), `missing discovery query: ${needle}`);

assert(src.includes("downloadable: 'true'"));
assert(src.includes('licenseSummary'));
assert(src.includes('THIRD_PARTY_ASSETS.md'));
assert(src.includes('.slice(0, 6)'));

console.log('Asset discovery pack static regression PASS');
