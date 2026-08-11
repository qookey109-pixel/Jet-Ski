const assert = require('assert');
const { isSafariDesktop, chooseBudget } = require('../src/v09932-safari-gpu-budget.js');

const safariMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.6 Safari/605.1.15';
const chromeMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36';
const safariIphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Version/19.0 Mobile/15E148 Safari/604.1';

assert.strictEqual(isSafariDesktop(safariMac), true);
assert.strictEqual(isSafariDesktop(chromeMac), false);
assert.strictEqual(isSafariDesktop(safariIphone), false);

const safariBudget = chooseBudget(safariMac, 2);
assert.strictEqual(safariBudget.safariDesktop, true);
assert.strictEqual(safariBudget.pixelRatioCap, 1.15);
assert.strictEqual(safariBudget.reflectionTargetSize, 256);
assert.strictEqual(safariBudget.shadowTargetFps, 30);

const chromeBudget = chooseBudget(chromeMac, 2);
assert.strictEqual(chromeBudget.safariDesktop, false);
assert.strictEqual(chromeBudget.pixelRatioCap, 2);
assert.strictEqual(chromeBudget.reflectionTargetSize, null);
assert.strictEqual(chromeBudget.shadowTargetFps, null);

console.log('v09932-safari-gpu-budget tests PASS');
