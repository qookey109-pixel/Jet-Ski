'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const I18N = require('../src/ui/zh-hant-runtime.js');

assert.strictEqual(I18N.VERSION, 'zh-Hant-TW-v2');
assert.strictEqual(I18N.uiOnly, true);
assert.strictEqual(I18N.physicsUntouched, true);
assert.strictEqual(I18N.gameplayRulesUntouched, true);

const samples = new Map([
  ['Start Race', '開始比賽'],
  ['Waikīkī Offshore Sprint', '威基基外海衝刺賽'],
  ['Rotate to Landscape', '請旋轉為橫向'],
  ['Sound & Atmosphere', '聲音與環境音'],
  ['SAVE & RECOVERY', '儲存與還原'],
  ['Ghost: ON', '幽靈：開'],
  ['BRAKE / REV', '煞車 / 倒車'],
  ['GAS', '油門'],
  ['CHAMPIONSHIP COMPLETE · PACIFIC CROWN', '冠軍賽完成 · 太平洋皇冠'],
  ['LAP 2 · GATE 4', '第 2 圈 · 檢查點 4']
]);
for (const [source, expected] of samples) {
  assert.strictEqual(I18N.translateText(source), expected, source);
}

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(index.includes('<html lang="zh-Hant-TW">'), 'index must declare zh-Hant-TW');
assert(index.includes('<title>泳圈競速 V0.11.16</title>'), 'Traditional Chinese title missing');
assert(index.includes('./src/ui/zh-hant-runtime.js'), 'localization runtime not loaded');
assert(index.includes('瞬間加速'), 'static control help should be Traditional Chinese');
assert(index.includes('煞車 / 倒車'), 'mobile brake label should be Traditional Chinese');
assert(index.includes('油門'), 'mobile gas label should be Traditional Chinese');

console.log('zh-Hant UI regression PASS');
