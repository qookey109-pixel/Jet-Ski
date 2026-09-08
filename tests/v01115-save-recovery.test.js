'use strict';

const assert = require('assert');
const Core = require('../src/ui/save-recovery-core.js');

assert.strictEqual(Core.VERSION, 'V0.11.15');
assert.strictEqual(Core.isSensitiveKey('swimRing.googleMaps3d.apiKey'), true);
assert.strictEqual(Core.isSensitiveKey('OPENAI_API_KEY'), true);
assert.strictEqual(Core.isSensitiveKey('swimRing.audio.v0117'), false);
assert.ok(!Core.ALLOWED_KEYS.includes('swimRing.googleMaps3d.apiKey'));

const source = new Map([
  ['swimRing.progression.v0115', '{"stars":{}}'],
  ['swimRing.progression.selectedEvent', 'open-sea-circuit'],
  ['swimRing.ghosts.v0119', '{"open-sea-circuit":{}}'],
  ['swimRing.ghosts.enabled.v0119', '1'],
  ['swimRing.livery.v01110', 'lagoon-cyan'],
  ['swimRing.challenges.v01111', '{"completed":{}}'],
  ['swimRing.onboarding.v01112', '{"seen":true}'],
  ['swimRing.graphics.v0114', '{"mode":"auto"}'],
  ['swimRing.audio.v0117', '{"master":0.8}'],
  ['swimRing.googleMaps3d.enabled', '1'],
  ['swimRing.googleMaps3d.verticalOffsetM', '-1.5'],
  ['swimRing.googleMaps3d.apiKey', 'SHOULD_NOT_EXPORT']
]);

const backup = Core.createBackup(key => source.get(key) ?? null, '2026-09-08T00:00:00.000Z');
assert.strictEqual(backup.app, 'swim-ring-racing');
assert.strictEqual(backup.schemaVersion, 1);
assert.strictEqual(backup.data['swimRing.googleMaps3d.apiKey'], undefined);
assert.strictEqual(backup.data['swimRing.audio.v0117'], '{"master":0.8}');
assert.ok(Core.backupSummary(backup).valid);

const hostile = JSON.parse(JSON.stringify(backup));
hostile.data['swimRing.googleMaps3d.apiKey'] = 'LEAK';
hostile.data['random.secret'] = 'NO';
const sanitized = Core.sanitizeBackup(hostile);
assert.ok(sanitized);
assert.strictEqual(sanitized.data['swimRing.googleMaps3d.apiKey'], undefined);
assert.strictEqual(sanitized.data['random.secret'], undefined);

const entries = Core.restoreEntries(hostile);
assert.ok(entries.every(entry => Core.ALLOWED_KEYS.includes(entry.key)));
assert.ok(entries.every(entry => !Core.isSensitiveKey(entry.key)));

assert.strictEqual(Core.sanitizeBackup(null), null);
assert.strictEqual(Core.sanitizeBackup({ app: 'other', schemaVersion: 1, data: {} }), null);
assert.strictEqual(Core.sanitizeBackup({ app: Core.APP_ID, schemaVersion: 999, data: {} }), null);
assert.deepStrictEqual(Core.progressResetKeys(), Core.PROGRESS_KEYS);
assert.ok(Core.progressResetKeys().every(key => !Core.PREFERENCE_KEYS.includes(key)));

for (let i = 0; i < 20000; i++) {
  const generated = Core.createBackup(key => `${key}:${i}`, `t${i}`);
  const safe = Core.sanitizeBackup(generated);
  assert.ok(safe);
  const plan = Core.restoreEntries(safe);
  assert.ok(plan.length <= Core.ALLOWED_KEYS.length);
  assert.ok(plan.every(item => !Core.isSensitiveKey(item.key)));
}

console.log('V0.11.15 save recovery regression PASS');
