# Realistic Water Physics Roadmap

## 1. Runtime model in V0.6

The browser does not run full CFD. V0.6 uses a reduced-order model designed to be calibrated later.

### Ocean state contract

All real-world datasets should be normalized into this contract:

```text
significantWaveHeight   Hs, metres
peakPeriod              Tp, seconds
meanDirectionDeg        wave travel-to direction in game convention
directionalSpreadDeg    directional spread
currentSpeed            m/s
currentDirectionDeg     current travel-to direction
stokesDriftScale        dimensionless calibration factor
```

For external oceanographic feeds that publish wave direction as a meteorological/oceanographic **from** direction, adapters must explicitly convert it to the game's travel-to convention.

### Spectral ocean

`src/ocean.js` uses eight deterministic JONSWAP-like components. Component frequency is derived from Tp; deep-water dispersion uses `omega² = g k`. Component amplitudes are normalized so total variance tracks Hs.

The same `getWaveHeight()` source drives both water mesh rendering and gameplay sampling. V0.6 injects this through `src/v06-runtime.js`, leaving the validated V0.5 `src/main.js` unchanged.

### Inflatable craft hydrodynamics

`src/hydrodynamics.js` samples nine positions across the footprint. The sampled water surface drives second-order heave, pitch and roll response. Current runtime terms include:

- heave spring/damping
- pitch/roll spring/damping
- planing lift
- longitudinal drag
- nonlinear lateral damping
- landing/slamming loss
- current + Stokes/orbital advection

This is a real-time approximation, not a validated naval-architecture solver.

## 2. Calibration path

### Stage A — real sea states
Import CWA / Copernicus / NOAA observations or forecasts and compare generated Hs, Tp, direction and drift against the source state.

### Stage B — SPH / CFD truth cases
Create a compact matrix of offline cases for the swim-ring craft:

- speed
- Hs / Tp
- encounter angle
- pitch / roll at impact
- vertical impact velocity
- rider + craft mass
- current velocity

Record forces / moments / accelerations from DualSPHysics or OpenFOAM.

### Stage C — surrogate model
Train a small surrogate from those truth cases. NVIDIA PhysicsNeMo can be used in the offline training/calibration workflow. The browser should consume a compact exported predictor rather than calling a large remote model every animation frame.

Suggested model input:

```text
speed, lateral_speed, Hs, Tp, wave_angle,
current_x, current_z, pitch, roll,
vertical_velocity, immersion_variance
```

Suggested outputs:

```text
Fx, Fy, Fz, Mx, My, Mz, slamming_impulse
```

`src/physics-surrogate.js` is the integration contract. Do not commit NVIDIA keys or secrets.

## 3. Validation targets

Before calling the water physics calibrated, test at minimum:

- calm idle stability
- constant-speed straight-line drag
- cross-current drift
- beam-sea roll response
- head-sea pitch response
- jump trajectory under 9.81 m/s²
- soft vs hard re-entry
- rough-sea stability at max speed
- mobile frame time / particle + ocean cost
