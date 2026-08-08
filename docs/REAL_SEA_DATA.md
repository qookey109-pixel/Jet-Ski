# Real Sea Data Adapter — V0.7

V0.7 normalizes external sea-state observations / model points into one browser-safe contract before they enter the V0.6 spectral ocean and hydrodynamics layers.

## 1. Normalized contract

```text
source                  provider identifier
stationId / stationName provenance
observedAt              ISO timestamp

significantWaveHeight   Hs, metres
peakPeriod              Tp, seconds
meanDirectionDeg        wave travel-to direction, degrees clockwise from north
directionalSpreadDeg    degrees

currentSpeed            m/s
currentDirectionDeg     current travel-to direction, degrees clockwise from north

stokesDriftX            optional eastward m/s
stokesDriftZ            optional northward m/s
stokesDriftScale        fallback spectrum calibration scalar
```

The game convention is always **travel-to**. Provider-specific adapters must convert any **from** direction before returning a RealSeaState.

## 2. CWA mapping

Primary observation datasets:

- `O-B0075-001`: 48-hour buoy / tide-station monitoring data.
- `O-B0075-002`: 30-day buoy / tide-station monitoring data.

Useful fields include wave height, wave direction, wave period, current direction, current speed, observation time and station metadata.

V0.7 uses `O-B0075-001` by default. CWA access requires the user's authorization token. The runtime accepts the token from local browser storage or an explicit function argument. Never commit it.

```js
REAL_SEA_RUNTIME.setCwaApiKey('YOUR_CWA_KEY')
REAL_SEA_RUNTIME.loadCwa({ stationId: '...' })
```

The CWA direction convention is configurable in `GAME_CONFIG.realSeaData.cwa`. The current project default is `to`; if a future schema/product documents a `from` convention, change the adapter config rather than changing the physics engine.

## 3. NOAA NDBC mapping

Realtime standard meteorological files use:

```text
WVHT -> significantWaveHeight
DPD  -> peakPeriod approximation (dominant period / max-energy period)
MWD  -> dominant-wave FROM direction
```

NDBC realtime timestamps are UTC. `MWD` is converted with:

```text
gameTravelTo = (MWD + 180) mod 360
```

Example:

```js
REAL_SEA_RUNTIME.loadNoaa('51002')
```

NDBC standard-met files do not provide all current / Stokes fields, so missing values fall back to zero/current spectral approximation. Later calibration can ingest ADCP / spectral products separately.

## 4. Copernicus Marine mapping

Point records support:

```text
VHM0  -> Hs
VTPK  -> Tp
VMDR  -> mean wave FROM direction
VSDX  -> eastward Stokes drift
VSDY  -> northward Stokes drift
u0/uo/eastward_sea_water_velocity  -> current east component
v0/vo/northward_sea_water_velocity -> current north component
```

`VMDR` is converted to the game's travel-to convention. If `VTPK` is absent, V0.7 can fall back to `VTM02`, then `VTM10`, while preserving `periodKind` metadata.

Copernicus data are best extracted offline / server-side from the desired product, location and time, then passed as a small point record:

```js
REAL_SEA_RUNTIME.applyCopernicusPoint({
  VHM0: 1.2,
  VTPK: 7.5,
  VMDR: 90,
  VSDX: 0.12,
  VSDY: -0.04,
  u0: 0.20,
  v0: 0.00
})
```

## 5. Stokes drift behavior

V0.6 derived a small Stokes drift approximation from the synthetic spectrum. V0.7 behavior:

1. If `stokesDriftX / stokesDriftZ` exist, use them directly.
2. Otherwise keep the V0.6 spectrum-derived fallback.

This lets Copernicus improve drift fidelity without breaking CWA / NOAA sources that do not publish compatible Stokes components.

## 6. Runtime behavior

`src/v07-runtime.js` overlays V0.6 input state only.

- It does not replace `src/main.js`.
- It does not replace `src/hydrodynamics.js`.
- It blends incoming values instead of snapping the sea instantly.
- HUD shows the active data source and marks stale observations.
- Pressing `1 / 2 / 3` clears real-data mode and returns to deterministic presets.

## 7. Browser/network security

Do not put provider credentials in source files, query strings, public JSON or committed `.env` files.

Preferred production architecture:

```text
CWA / Copernicus / NOAA
        ↓
server / scheduled job
        ↓
normalize + cache
        ↓
small same-origin sea-state JSON
        ↓
browser game
```

This also avoids browser CORS differences and gives the game a deterministic fallback when a provider is temporarily unavailable.

## 8. Tests

Run:

```bash
node tests/real-sea-data.test.js
node tests/ocean-real-data.test.js
```

Coverage includes direction conversion, NDBC parsing, CWA normalization, Copernicus field mapping, current-vector conversion and explicit Stokes drift override.
