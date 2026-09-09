'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(process.argv[2] || '.');
const expectedVersion = process.argv[3] || 'V0.11.16';
const indexPath = path.join(rootDir, 'index.html');

function fail(message) {
  console.error(`RELEASE SMOKE FAIL: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(indexPath)) {
  fail(`missing ${indexPath}`);
  process.exit(1);
}

const html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes(expectedVersion)) fail(`index.html does not contain ${expectedVersion}`);
if (!html.includes('viewport-fit=cover')) fail('viewport-fit=cover missing');
if (!html.includes('./src/ui/save-recovery-core.js')) fail('save-recovery core script missing from index');
if (!html.includes('./src/ui/save-recovery-runtime.js')) fail('save-recovery runtime script missing from index');
if (!html.includes('./src/ui/release-marker-runtime.js')) fail('release marker script missing from index');

const refs = [];
for (const match of html.matchAll(/<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+)["']/gi)) {
  const ref = match[1];
  if (!ref || /^(?:https?:|data:|blob:|#)/i.test(ref)) continue;
  refs.push(ref.split(/[?#]/)[0]);
}

const duplicates = refs.filter((value, index) => refs.indexOf(value) !== index);
if (duplicates.length) fail(`duplicate local asset refs: ${[...new Set(duplicates)].join(', ')}`);

for (const ref of refs) {
  const normalized = ref.replace(/^\.\//, '');
  const target = path.resolve(rootDir, normalized);
  if (!target.startsWith(rootDir + path.sep) && target !== rootDir) {
    fail(`asset escapes root: ${ref}`);
    continue;
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) fail(`missing local asset: ${ref}`);
}

const coreIndex = html.indexOf('./src/ui/save-recovery-core.js');
const runtimeIndex = html.indexOf('./src/ui/save-recovery-runtime.js');
const releaseIndex = html.indexOf('./src/ui/release-marker-runtime.js');
if (coreIndex < 0 || runtimeIndex < 0 || coreIndex > runtimeIndex) fail('save recovery script order is invalid');
if (releaseIndex < runtimeIndex) fail('release marker must load after save recovery runtime');

if (/swimRing\.googleMaps3d\.apiKey\s*[=:]\s*["'][^"']+/i.test(html)) {
  fail('possible Google API key literal found in index');
}

if (!process.exitCode) {
  console.log(`Release smoke PASS · ${expectedVersion} · ${refs.length} local assets · root ${rootDir}`);
}
