const assert = require('assert');
const { isSafariDesktop, computeFrameStats } = require('../src/v09931-safari-performance.js');

assert.strictEqual(
  isSafariDesktop('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Safari/605.1.15'),
  true
);
assert.strictEqual(
  isSafariDesktop('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'),
  false
);
assert.strictEqual(
  isSafariDesktop('Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Version/19.0 Mobile/15E148 Safari/604.1'),
  false
);

let stats = computeFrameStats([16, 17, 16, 18, 40]);
assert(stats.avgMs > 0);
assert(stats.fps > 0);
assert(stats.p95Ms === 40);
assert(stats.maxMs === 40);
assert(stats.longFrames === 1);

stats = computeFrameStats([]);
assert.deepStrictEqual(stats, { avgMs: 0, p95Ms: 0, maxMs: 0, fps: 0, longFrames: 0 });

console.log('v09931-safari-performance tests PASS');
