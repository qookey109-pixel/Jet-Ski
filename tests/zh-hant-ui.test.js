'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const zh = require('../src/ui/zh-hant-runtime.js');

assert.strictEqual(zh.translateText('Start Race'), '開始比賽');
assert.strictEqual(zh.translateText('Open Sea Circuit'), '外海環形賽');
assert.strictEqual(zh.translateText('P1'), '第 1 名');
assert.strictEqual(zh.translateText('GATE 4 ✓'), '檢查點 4 ✓');
assert.strictEqual(zh.translateText('Ghost: OFF'), '幽靈：關');
assert.strictEqual(zh.translateText('Rotate to Landscape'), '請旋轉為橫向');
assert.strictEqual(zh.translateText('Sunset Orange'), '夕陽橘');
assert.strictEqual(zh.translateText('CHALLENGE COMPLETE · FIRST SPLASH'), '挑戰完成 · 初次破浪');

const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert(index.includes('./src/ui/zh-hant-runtime.js'), 'index.html must load the Traditional Chinese UI runtime');
assert(index.includes('<html lang="zh-Hant-TW">'), 'document language must be zh-Hant-TW');

console.log('zh-Hant UI localization regression: PASS');
