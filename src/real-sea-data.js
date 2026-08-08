// V0.7 Real Sea Data normalization layer.
// Converts CWA / NOAA NDBC / Copernicus point data into one game-facing contract.
// No credentials are stored in this file or the repository.
(function () {
  const DEFAULT_SPREAD = 28;

  function finiteNumber(value) {
    if (value == null) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || /^(MM|M|NA|N\/A|null|undefined|-+)$/i.test(trimmed)) return null;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof value === 'object') {
      for (const key of ['value', 'Value', 'elementValue', 'ElementValue', 'data', 'Data']) {
        if (key in value) {
          const parsed = finiteNumber(value[key]);
          if (parsed != null) return parsed;
        }
      }
    }
    return null;
  }

  function normalizeDegrees(deg) {
    const n = finiteNumber(deg);
    if (n == null) return null;
    return ((n % 360) + 360) % 360;
  }

  function fromDirectionToTravel(directionFromDeg) {
    const d = normalizeDegrees(directionFromDeg);
    return d == null ? null : (d + 180) % 360;
  }

  function vectorToSpeedDirection(east, north) {
    const x = finiteNumber(east);
    const z = finiteNumber(north);
    if (x == null || z == null) return { speed: null, directionDeg: null };
    const speed = Math.hypot(x, z);
    const directionDeg = speed < 1e-9 ? 0 : normalizeDegrees(Math.atan2(x, z) * 180 / Math.PI);
    return { speed, directionDeg };
  }

  function normalizeKey(key) {
    return String(key).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
  }

  function getDirect(obj, aliases) {
    if (!obj || typeof obj !== 'object') return undefined;
    const wanted = new Set(aliases.map(normalizeKey));
    for (const [key, value] of Object.entries(obj)) {
      if (wanted.has(normalizeKey(key))) return value;
    }
    return undefined;
  }

  function deepFind(obj, aliases, maxDepth = 8) {
    const wanted = new Set(aliases.map(normalizeKey));
    const seen = new Set();
    function walk(value, depth) {
      if (!value || typeof value !== 'object' || depth > maxDepth || seen.has(value)) return undefined;
      seen.add(value);
      for (const [key, child] of Object.entries(value)) {
        if (wanted.has(normalizeKey(key))) return child;
      }
      for (const child of Object.values(value)) {
        if (child && typeof child === 'object') {
          const hit = walk(child, depth + 1);
          if (hit !== undefined) return hit;
        }
      }
      return undefined;
    }
    return walk(obj, 0);
  }

  function firstNumber(obj, aliases, deep = false) {
    const value = deep ? deepFind(obj, aliases) : getDirect(obj, aliases);
    return finiteNumber(value);
  }

  function firstText(obj, aliases, deep = false) {
    const value = deep ? deepFind(obj, aliases) : getDirect(obj, aliases);
    if (value == null) return null;
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      for (const key of ['value', 'Value', 'name', 'Name', 'text', 'Text']) {
        if (value[key] != null) return String(value[key]);
      }
    }
    return null;
  }

  function parseTime(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function validateAndNormalize(state) {
    if (!state || typeof state !== 'object') throw new Error('Sea state must be an object.');
    const hs = finiteNumber(state.significantWaveHeight);
    const tp = finiteNumber(state.peakPeriod);
    if (hs == null || hs < 0 || hs > 30) throw new Error('Invalid significantWaveHeight.');
    if (tp == null || tp < 1 || tp > 35) throw new Error('Invalid peakPeriod.');

    const waveDirection = normalizeDegrees(state.meanDirectionDeg);
    const currentSpeed = finiteNumber(state.currentSpeed);
    const currentDirection = normalizeDegrees(state.currentDirectionDeg);
    const stokesX = finiteNumber(state.stokesDriftX);
    const stokesZ = finiteNumber(state.stokesDriftZ);
    const spread = finiteNumber(state.directionalSpreadDeg);

    return {
      source: state.source || 'unknown',
      sourceDetail: state.sourceDetail || null,
      stationId: state.stationId || null,
      stationName: state.stationName || null,
      observedAt: parseTime(state.observedAt) || state.observedAt || null,
      significantWaveHeight: hs,
      peakPeriod: tp,
      meanDirectionDeg: waveDirection == null ? 0 : waveDirection,
      directionalSpreadDeg: spread == null ? DEFAULT_SPREAD : Math.max(2, Math.min(80, spread)),
      currentSpeed: currentSpeed == null ? 0 : Math.max(0, Math.min(8, currentSpeed)),
      currentDirectionDeg: currentDirection == null ? 0 : currentDirection,
      stokesDriftX: stokesX,
      stokesDriftZ: stokesZ,
      stokesDriftScale: finiteNumber(state.stokesDriftScale) ?? 1,
      periodKind: state.periodKind || 'peak',
      directionConvention: 'travel-to',
      quality: state.quality || 'normalized',
      raw: state.raw || null
    };
  }

  function applyToProfile(profile, state) {
    const normalized = validateAndNormalize(state);
    for (const field of ['significantWaveHeight','peakPeriod','meanDirectionDeg','directionalSpreadDeg','currentSpeed','currentDirectionDeg','stokesDriftScale']) {
      profile[field] = normalized[field];
    }
    if (normalized.stokesDriftX != null && normalized.stokesDriftZ != null) {
      profile.stokesDriftX = normalized.stokesDriftX;
      profile.stokesDriftZ = normalized.stokesDriftZ;
    } else {
      delete profile.stokesDriftX;
      delete profile.stokesDriftZ;
    }
    return normalized;
  }

  const CWA_ALIASES = {
    hs: ['WaveHeight', 'SignificantWaveHeight', 'wave_height', '浪高', '示性波高'],
    tp: ['WavePeriod', 'PeakPeriod', 'Period', 'wave_period', '波浪週期', '週期'],
    waveDir: ['WaveDirection', 'WaveDir', 'wave_direction', '浪向', '波向'],
    currentSpeed: ['CurrentSpeed', 'CurrentVelocity', 'current_speed', '海流流速', '流速'],
    currentDir: ['CurrentDirection', 'CurrentDir', 'current_direction', '海流流向', '流向'],
    time: ['DateTime', 'DataTime', 'ObsTime', 'ObservationTime', 'time', '資料觀測時間', '時間'],
    stationId: ['StationId', 'StationID', 'StationCode', 'station_id', '測站代碼', '站號'],
    stationName: ['StationName', 'StationNameZH', 'station_name', '測站名稱', '站名']
  };

  function normalizeCwaRecord(record, options = {}) {
    const convention = options.directionConvention || 'to';
    const deep = options.deep !== false;
    const hs = firstNumber(record, CWA_ALIASES.hs, deep);
    const tp = firstNumber(record, CWA_ALIASES.tp, deep);
    const rawWaveDirection = firstNumber(record, CWA_ALIASES.waveDir, deep);
    const rawCurrentDirection = firstNumber(record, CWA_ALIASES.currentDir, deep);
    const waveDirection = convention === 'from' ? fromDirectionToTravel(rawWaveDirection) : normalizeDegrees(rawWaveDirection);
    const currentDirection = options.currentDirectionConvention === 'from' ? fromDirectionToTravel(rawCurrentDirection) : normalizeDegrees(rawCurrentDirection);

    return validateAndNormalize({
      source: 'CWA', sourceDetail: options.dataId || 'O-B0075-001',
      stationId: options.stationId || firstText(record, CWA_ALIASES.stationId, deep),
      stationName: firstText(record, CWA_ALIASES.stationName, deep),
      observedAt: firstText(record, CWA_ALIASES.time, deep),
      significantWaveHeight: hs, peakPeriod: tp, meanDirectionDeg: waveDirection,
      directionalSpreadDeg: options.directionalSpreadDeg ?? DEFAULT_SPREAD,
      currentSpeed: firstNumber(record, CWA_ALIASES.currentSpeed, deep) ?? 0,
      currentDirectionDeg: currentDirection ?? 0,
      periodKind: 'CWA wave period', quality: 'observation', raw: options.keepRaw ? record : null
    });
  }

  function collectCwaCandidates(payload) {
    const candidates = [];
    const seen = new Set();
    function walk(value, depth) {
      if (!value || typeof value !== 'object' || depth > 10 || seen.has(value)) return;
      seen.add(value);
      const hs = firstNumber(value, CWA_ALIASES.hs, false);
      const tp = firstNumber(value, CWA_ALIASES.tp, false);
      if (hs != null || tp != null) candidates.push(value);
      if (Array.isArray(value)) for (const item of value) walk(item, depth + 1);
      else for (const child of Object.values(value)) walk(child, depth + 1);
    }
    walk(payload, 0);
    return candidates;
  }

  function normalizeCwaPayload(payload, options = {}) {
    const normalized = [];
    for (const candidate of collectCwaCandidates(payload)) {
      try {
        const state = normalizeCwaRecord(candidate, { ...options, deep: true });
        if (options.stationId && state.stationId && String(state.stationId) !== String(options.stationId)) continue;
        normalized.push(state);
      } catch (_) {}
    }
    if (!normalized.length) return normalizeCwaRecord(payload, { ...options, deep: true });
    normalized.sort((a, b) => (b.observedAt ? Date.parse(b.observedAt) : 0) - (a.observedAt ? Date.parse(a.observedAt) : 0));
    return normalized[0];
  }

  async function fetchCwa(options = {}) {
    const apiKey = options.apiKey;
    if (!apiKey) throw new Error('CWA API key is required.');
    const dataId = options.dataId || 'O-B0075-001';
    const base = options.baseUrl || 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';
    const response = await fetch(`${base}/${encodeURIComponent(dataId)}?format=JSON`, {
      headers: { Authorization: apiKey }, cache: 'no-store'
    });
    if (!response.ok) throw new Error(`CWA request failed: HTTP ${response.status}`);
    return normalizeCwaPayload(await response.json(), { ...options, dataId });
  }

  function parseNdbcStandardMet(text, options = {}) {
    if (typeof text !== 'string') throw new Error('NDBC payload must be text.');
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    let headers = null;
    const rows = [];
    for (const line of lines) {
      if (line.startsWith('#')) {
        const tokens = line.replace(/^#+/, '').trim().split(/\s+/);
        if (tokens.includes('WVHT') && tokens.includes('DPD')) headers = tokens;
        continue;
      }
      if (!headers) continue;
      const tokens = line.split(/\s+/);
      if (tokens.length < headers.length) continue;
      const row = {};
      headers.forEach((name, index) => { row[name] = tokens[index]; });
      rows.push(row);
    }

    for (const row of rows) {
      const hs = finiteNumber(row.WVHT);
      const tp = finiteNumber(row.DPD);
      if (hs == null || tp == null) continue;
      const mwdFrom = finiteNumber(row.MWD);
      const year = finiteNumber(row.YY ?? row.YYYY), month = finiteNumber(row.MM), day = finiteNumber(row.DD), hour = finiteNumber(row.hh), minute = finiteNumber(row.mm) ?? 0;
      const observedAt = [year, month, day, hour].some(v => v == null) ? null : new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString();
      return validateAndNormalize({
        source: 'NOAA-NDBC', sourceDetail: 'realtime2 standard meteorological', stationId: options.stationId || null,
        observedAt, significantWaveHeight: hs, peakPeriod: tp,
        meanDirectionDeg: mwdFrom == null ? 0 : fromDirectionToTravel(mwdFrom),
        directionalSpreadDeg: options.directionalSpreadDeg ?? DEFAULT_SPREAD,
        currentSpeed: options.currentSpeed ?? 0, currentDirectionDeg: options.currentDirectionDeg ?? 0,
        periodKind: 'dominant-wave-period', quality: mwdFrom == null ? 'partial-no-wave-direction' : 'realtime-qc',
        raw: options.keepRaw ? row : null
      });
    }
    throw new Error('No valid NDBC wave observation found.');
  }

  async function fetchNdbc(options = {}) {
    const stationId = String(options.stationId || '').trim();
    if (!stationId) throw new Error('NDBC stationId is required.');
    if (!/^[A-Za-z0-9_-]+$/.test(stationId)) throw new Error('Invalid NDBC stationId.');
    const base = options.baseUrl || 'https://www.ndbc.noaa.gov/data/realtime2';
    const response = await fetch(`${base}/${encodeURIComponent(stationId)}.txt`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`NDBC request failed: HTTP ${response.status}`);
    return parseNdbcStandardMet(await response.text(), { ...options, stationId });
  }

  function normalizeCopernicusPoint(record, options = {}) {
    if (!record || typeof record !== 'object') throw new Error('Copernicus point must be an object.');
    const hs = firstNumber(record, ['VHM0', 'sea_surface_wave_significant_height'], true);
    const vTpk = firstNumber(record, ['VTPK', 'sea_surface_wave_period_at_variance_spectral_density_maximum'], true);
    const vTm02 = firstNumber(record, ['VTM02', 'sea_surface_wave_mean_period_from_variance_spectral_density_second_frequency_moment'], true);
    const vTm10 = firstNumber(record, ['VTM10', 'sea_surface_wave_mean_period_from_variance_spectral_density_inverse_frequency_moment'], true);
    const tp = vTpk ?? vTm02 ?? vTm10;
    const periodKind = vTpk != null ? 'VTPK' : (vTm02 != null ? 'VTM02 fallback' : 'VTM10 fallback');
    const waveFrom = firstNumber(record, ['VMDR', 'sea_surface_wave_from_direction'], true);
    const stokesX = firstNumber(record, ['VSDX', 'sea_surface_wave_stokes_drift_x_velocity'], true);
    const stokesZ = firstNumber(record, ['VSDY', 'sea_surface_wave_stokes_drift_y_velocity'], true);
    const currentX = firstNumber(record, ['u0', 'uo', 'eastward_sea_water_velocity'], true);
    const currentZ = firstNumber(record, ['v0', 'vo', 'northward_sea_water_velocity'], true);
    const currentVector = vectorToSpeedDirection(currentX, currentZ);
    return validateAndNormalize({
      source: 'Copernicus-Marine', sourceDetail: options.productId || null, stationId: options.pointId || null,
      observedAt: options.observedAt || firstText(record, ['time', 'datetime', 'valid_time'], true),
      significantWaveHeight: hs, peakPeriod: tp,
      meanDirectionDeg: waveFrom == null ? 0 : fromDirectionToTravel(waveFrom),
      directionalSpreadDeg: options.directionalSpreadDeg ?? firstNumber(record, ['directionalSpreadDeg', 'VSPR'], true) ?? DEFAULT_SPREAD,
      currentSpeed: currentVector.speed ?? options.currentSpeed ?? 0,
      currentDirectionDeg: currentVector.directionDeg ?? options.currentDirectionDeg ?? 0,
      stokesDriftX: stokesX, stokesDriftZ: stokesZ, stokesDriftScale: 1,
      periodKind, quality: 'model-or-analysis-point', raw: options.keepRaw ? record : null
    });
  }

  function ageMinutes(state, now = Date.now()) {
    if (!state || !state.observedAt) return null;
    const timestamp = Date.parse(state.observedAt);
    return Number.isFinite(timestamp) ? (now - timestamp) / 60000 : null;
  }

  function isStale(state, maxAgeMinutes, now = Date.now()) {
    const age = ageMinutes(state, now);
    return age == null ? false : age > maxAgeMinutes;
  }

  window.REAL_SEA_DATA = {
    contractVersion: 1, normalize: validateAndNormalize, applyToProfile, finiteNumber,
    normalizeDegrees, fromDirectionToTravel, vectorToSpeedDirection, ageMinutes, isStale,
    cwa: { normalizeRecord: normalizeCwaRecord, normalizePayload: normalizeCwaPayload, fetch: fetchCwa },
    noaa: { parseStandardMet: parseNdbcStandardMet, fetch: fetchNdbc },
    copernicus: { normalizePoint: normalizeCopernicusPoint }
  };
})();
