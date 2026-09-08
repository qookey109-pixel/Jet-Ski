// V0.11.15 browser-local save/recovery policy. Pure logic; no DOM/storage writes.
(function (root) {
  'use strict';

  const VERSION = 'V0.11.15';
  const SCHEMA_VERSION = 1;
  const APP_ID = 'swim-ring-racing';
  const MAX_VALUE_CHARS = 1_000_000;
  const MAX_TOTAL_CHARS = 2_000_000;

  const PROGRESS_KEYS = Object.freeze([
    'swimRing.progression.v0115',
    'swimRing.progression.selectedEvent',
    'swimRing.ghosts.v0119',
    'swimRing.livery.v01110',
    'swimRing.challenges.v01111',
    'swimRing.onboarding.v01112'
  ]);

  const PREFERENCE_KEYS = Object.freeze([
    'swimRing.ghosts.enabled.v0119',
    'swimRing.graphics.v0114',
    'swimRing.audio.v0117',
    'swimRing.googleMaps3d.enabled',
    'swimRing.googleMaps3d.verticalOffsetM'
  ]);

  const ALLOWED_KEYS = Object.freeze([...PROGRESS_KEYS, ...PREFERENCE_KEYS]);
  const ALLOWED_SET = new Set(ALLOWED_KEYS);
  const SENSITIVE_KEYS = Object.freeze([
    'swimRing.googleMaps3d.apiKey'
  ]);

  function isSensitiveKey(key) {
    const value = String(key || '');
    return SENSITIVE_KEYS.includes(value) || /(?:api.?key|token|secret|password|credential)/i.test(value);
  }

  function sanitizeValue(value) {
    if (value == null) return null;
    const text = String(value);
    if (text.length > MAX_VALUE_CHARS) return null;
    return text;
  }

  function createBackup(readValue, createdAt) {
    const read = typeof readValue === 'function' ? readValue : (() => null);
    const data = {};
    let totalChars = 0;
    for (const key of ALLOWED_KEYS) {
      if (isSensitiveKey(key)) continue;
      const value = sanitizeValue(read(key));
      if (value == null) continue;
      totalChars += value.length;
      if (totalChars > MAX_TOTAL_CHARS) break;
      data[key] = value;
    }
    return {
      app: APP_ID,
      schemaVersion: SCHEMA_VERSION,
      createdAt: String(createdAt || ''),
      version: VERSION,
      data
    };
  }

  function sanitizeBackup(input) {
    if (!input || typeof input !== 'object') return null;
    if (input.app !== APP_ID || Number(input.schemaVersion) !== SCHEMA_VERSION) return null;
    if (!input.data || typeof input.data !== 'object' || Array.isArray(input.data)) return null;
    const data = {};
    let totalChars = 0;
    for (const [key, raw] of Object.entries(input.data)) {
      if (!ALLOWED_SET.has(key) || isSensitiveKey(key)) continue;
      const value = sanitizeValue(raw);
      if (value == null) continue;
      totalChars += value.length;
      if (totalChars > MAX_TOTAL_CHARS) return null;
      data[key] = value;
    }
    return {
      app: APP_ID,
      schemaVersion: SCHEMA_VERSION,
      createdAt: String(input.createdAt || ''),
      version: String(input.version || ''),
      data
    };
  }

  function restoreEntries(input) {
    const backup = sanitizeBackup(input);
    if (!backup) return null;
    return Object.entries(backup.data).map(([key, value]) => ({ key, value }));
  }

  function progressResetKeys() {
    return PROGRESS_KEYS.slice();
  }

  function backupSummary(input) {
    const backup = sanitizeBackup(input);
    if (!backup) return { valid: false, entries: 0, progressEntries: 0, preferenceEntries: 0 };
    const keys = Object.keys(backup.data);
    return {
      valid: true,
      entries: keys.length,
      progressEntries: keys.filter(key => PROGRESS_KEYS.includes(key)).length,
      preferenceEntries: keys.filter(key => PREFERENCE_KEYS.includes(key)).length
    };
  }

  const api = {
    VERSION,
    SCHEMA_VERSION,
    APP_ID,
    PROGRESS_KEYS,
    PREFERENCE_KEYS,
    ALLOWED_KEYS,
    SENSITIVE_KEYS,
    isSensitiveKey,
    createBackup,
    sanitizeBackup,
    restoreEntries,
    progressResetKeys,
    backupSummary
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JETSKI_SAVE_RECOVERY_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
