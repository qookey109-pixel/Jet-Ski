# Changelog

## V0.9
- Rebuilt the visible ocean as a clean-room VirtOcean-inspired GPU rendering layer in `src/v09-virtocean-ocean.js`.
- Added six GPU Gerstner / spectral-style wave bands driven by `Hs`, `Tp` and dominant wave direction.
- Added horizontal Gerstner displacement for thicker, sharper rolling crests without CPU mesh rewriting.
- Added near-field high-tessellation GPU ocean patch plus the existing far ocean mesh for scale and silhouette quality.
- Added Fresnel-like sky reflection, broken sun glitter, crest lighting, capillary normal detail and Hs-driven whitecaps.
- Replaced the expensive CPU per-vertex wake-event scan with a GPU V-shaped craft wake mask.
- Disabled the V0.8/V0.8.1 CPU FFT visual patch at V0.9 runtime while preserving the research code in the repository.
- Stopped per-frame legacy far-ocean vertex mutation and per-frame `computeVertexNormals()` work in the active V0.9 visual path.
- Capped renderer pixel ratio at 1.5 desktop / 1.25 mobile to reduce Retina fill-rate pressure.
- Preserved `src/main.js`, `src/ocean.js`, `src/hydrodynamics.js` and RealSeaState adapters unchanged.

## V0.8.1
- Added horizontal choppy crest displacement derived from FFT surface slopes for sharper near-field wave silhouettes.
- Added mild crest/trough asymmetry that scales with sea roughness without changing gameplay collision water.
- Reworked breaking foam into dominant-wave-aligned streaks using crest, slope and negative-curvature masks.
- Added `src/ocean-disturbance.js` with a fixed event pool for rendering-only swim-ring pressure depressions, spreading rings and V-shaped wake arms.
- Added rendering-only re-entry rings after airborne landings, complementing the existing V0.5 splash particles.
- Hard-capped local disturbance height so wake visuals cannot destabilize the near-field patch.
- Reduced mobile FFT visual update rate to 10 Hz while retaining the 32² grid.
- Added `tests/ocean-disturbance.test.js` for wake/re-entry finite output, lifetime and amplitude bounds.
- Preserved `src/main.js`, `src/hydrodynamics.js`, RealSeaState adapters and V0.7/V0.6 gameplay water authority.

## V0.8
- Added `src/fft-ocean.js` with a browser-safe 2D inverse FFT ocean-detail model.
- Added a JONSWAP + Phillips directional hybrid spectrum driven by Hs, Tp and wave direction.
- Added deterministic Gaussian spectral initialization and deep-water dispersion for FFT components.
- Added per-update Hs RMS normalization so visual spectral displacement cannot drift to unrealistic amplitudes.
- Added `src/v08-ocean-visuals.js` with a dense near-field spectral patch around the player.
- Added adaptive 64² desktop / 32² mobile FFT grids and reduced mobile update rate.
- Added FFT slope / curvature / crest based breaking-foam masks and sun-glitter detail.
- Added edge fading so the FFT detail layer blends into the V0.7.1 far-field ocean shader.
- Added `tests/fft-ocean.test.js` for FFT finite output, periodicity and Hs normalization.
- Preserved `src/main.js`, `src/hydrodynamics.js`, RealSeaState adapters and V0.7/V0.6 gameplay ocean authority.

## V0.7.1
- Added `src/ocean-visuals.js` as a rendering-only ocean upgrade over the V0.7 physics baseline.
- Replaced the visible legacy MeshPhong ocean with a custom shader while preserving the original `waterMat` for sea-state transitions and FX compatibility.
- Added Fresnel sky reflection, sun glints, micro-ripple normal detail, Hs-driven roughness and procedural crest foam.
- Added a gradient sky dome, sun glow and horizon haze for clearer sea/sky separation.
- Enabled sRGB output and ACES filmic tone mapping when supported by the current Three.js renderer.
- Preserved `src/main.js`, `src/hydrodynamics.js`, RealSeaState normalization and V0.7 ocean physics unchanged.

## V0.7
- Added `src/real-sea-data.js` with one normalized RealSeaState contract for CWA, NOAA NDBC and Copernicus Marine.
- Added CWA observation fetch adapter using a locally supplied Authorization token; no credentials are stored in the repository.
- Added NOAA NDBC realtime standard-met parser using WVHT / DPD / MWD and explicit from-direction conversion.
- Added Copernicus point mapping for VHM0 / VTPK / VMDR / VSDX / VSDY plus optional current u/v components.
- Added `src/v07-runtime.js` to blend real sea states into the existing V0.6 sea profile without rewriting V0.6 hydrodynamics.
- Added data-source / stale-state HUD feedback and preset fallback via keys 1 / 2 / 3.
- Updated `src/ocean.js` so external Stokes drift vector components override the spectrum-derived approximation when available.
- Added Node tests for direction conversion, CWA / NOAA / Copernicus normalization, profile application and explicit Stokes-vector ingestion.
- Preserved the validated V0.5 `src/main.js`, V0.6 hydrodynamics and Safari classic-script startup path.

## V0.6
- Replaced the primary wave surface with a deterministic directional JONSWAP-like spectrum driven by Hs, Tp, mean direction and directional spread.
- Added deep-water dispersion, orbital surface velocity, Stokes drift and background current.
- Added 9-point reduced-order hydrodynamics for heave, pitch and roll.
- Added planing lift, nonlinear lateral damping and slamming-dependent landing loss.
- Changed airborne gravity baseline to 9.81 m/s².
- Added `src/ocean.js`, `src/hydrodynamics.js`, `src/physics-surrogate.js` and `src/v06-runtime.js`.
- Added a PhysicsNeMo-compatible surrogate adapter contract without storing credentials.
- Preserved the validated V0.5 `src/main.js`, wake / spray / landing FX and Safari classic-script direct launch.
- Added Hs / Tp live HUD readout and physics calibration documentation.

## V0.5
- Added pooled white-water wake trails behind the swim ring.
- Added continuous rear spray that scales with speed, steering and sea roughness.
- Added landing splash bursts with a larger hard-landing effect.
- Added a short landing foam ring for clearer impact feedback.
- Added centralized VFX tuning under `effects` in `src/config.js`.
- Added V0.5 FX as `src/fx.js` so the validated V0.4.1 gameplay loop remains untouched.
- Preserved V0.4.1 classic-script Safari `file://` startup behavior.

## V0.4.1
- Fixed blank 3D scene when opening `index.html` directly with `file://` in Safari.
- Replaced ES-module startup with classic browser scripts.
- Preserved V0.4 swim-ring craft, sea states, handling and airborne/landing physics.
- Replaced rider CapsuleGeometry with basic primitives for broader Three.js compatibility.
- Corrected HUD version fallback to V0.4.1.

## V0.4
- 將玩家載具由傳統水上摩托改為程序化 3D 充氣游泳圈。
- 新增中央座椅、抓把、後置噴射單元，維持「游泳圈」辨識度與可駕駛性。
- 新增 wave launch：高速迎上陡浪可離水。
- 新增 airborne 狀態、垂直速度與重力。
- 落水以即時波面高度判定，不使用固定海平面。
- 新增普通 / 重落水速度損失。
- 空中轉向權限降低，避免空中像在水面一樣操控。
- HUD 新增 WATER / AIR 狀態。

## V0.3
- Calm / Normal / Rough 三種海況。
- 多層波浪與海況對水阻、方向、側滑的影響。

## V0.2
- Water Handling 2.0。
- 加速曲線、水阻、側滑、抓水、Pitch / Roll。
