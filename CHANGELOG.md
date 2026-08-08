# Changelog

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
