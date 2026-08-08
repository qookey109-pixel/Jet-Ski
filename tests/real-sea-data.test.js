const assert = require('node:assert/strict');

global.window = global;
require('../src/real-sea-data.js');

const api = global.REAL_SEA_DATA;
assert.ok(api, 'REAL_SEA_DATA should be exported.');

assert.equal(api.fromDirectionToTravel(0), 180);
assert.equal(api.fromDirectionToTravel(90), 270);
assert.deepEqual(api.vectorToSpeedDirection(1, 0), { speed: 1, directionDeg: 90 });

const noaaText = `#YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
#yr mo dy hr mn degT m/s m/s m sec sec degT hPa degC degC degC nmi hPa ft
2026 08 08 06 50 120 5.0 6.0 1.4 8 6.5 45 1016.5 29.3 30.5 24.4 MM +0.3 MM`;

const noaa = api.noaa.parseStandardMet(noaaText, { stationId: 'TEST1' });
assert.equal(noaa.significantWaveHeight, 1.4);
assert.equal(noaa.peakPeriod, 8);
assert.equal(noaa.meanDirectionDeg, 225);
assert.equal(noaa.stationId, 'TEST1');
assert.equal(noaa.observedAt, '2026-08-08T06:50:00.000Z');

const copernicus = api.copernicus.normalizePoint({
  VHM0: 1.2, VTPK: 7.5, VMDR: 90, VSDX: 0.12, VSDY: -0.04, u0: 0.20, v0: 0.00
});
assert.equal(copernicus.significantWaveHeight, 1.2);
assert.equal(copernicus.peakPeriod, 7.5);
assert.equal(copernicus.meanDirectionDeg, 270);
assert.equal(copernicus.stokesDriftX, 0.12);
assert.equal(copernicus.stokesDriftZ, -0.04);
assert.ok(Math.abs(copernicus.currentSpeed - 0.2) < 1e-12);
assert.equal(copernicus.currentDirectionDeg, 90);

const cwa = api.cwa.normalizeRecord({
  StationId: 'CWA001', StationName: '測試浮標', DateTime: '2026-08-08T14:00:00+08:00',
  WaveHeight: 0.9, WavePeriod: 5.8, WaveDirection: 210, CurrentSpeed: 0.3, CurrentDirection: 140
}, { directionConvention: 'to' });
assert.equal(cwa.significantWaveHeight, 0.9);
assert.equal(cwa.peakPeriod, 5.8);
assert.equal(cwa.meanDirectionDeg, 210);
assert.equal(cwa.currentSpeed, 0.3);
assert.equal(cwa.currentDirectionDeg, 140);
assert.equal(cwa.observedAt, '2026-08-08T06:00:00.000Z');

const profile = {};
api.applyToProfile(profile, copernicus);
assert.equal(profile.significantWaveHeight, 1.2);
assert.equal(profile.stokesDriftX, 0.12);
assert.equal(profile.stokesDriftZ, -0.04);

console.log('real-sea-data tests passed');
