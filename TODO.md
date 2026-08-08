# TODO

## 已完成
- [x] V0.1 基礎 3D 海面與操控
- [x] V0.2 Water Handling 2.0
- [x] V0.3 Calm / Normal / Rough 海況
- [x] V0.4 游泳圈載具 + jump / airborne / landing
- [x] V0.4.1 Safari `file://` 啟動修正
- [x] V0.5 水花 / 尾浪 / 落水 Splash FX
- [x] V0.6 Directional spectral ocean foundation
- [x] V0.6 9-point hydrodynamics / planing / slamming
- [x] V0.6 current / orbital velocity / Stokes drift
- [x] V0.6 NVIDIA PhysicsNeMo surrogate adapter contract
- [x] V0.7 CWA / NOAA NDBC / Copernicus Real Sea Data normalization
- [x] V0.7 wave-direction convention conversion + explicit Stokes vector support
- [x] V0.7 real-data runtime overlay + source/stale HUD
- [x] V0.7.1 Visual Ocean Pass：Fresnel / sun glint / micro-ripples / crest foam
- [x] V0.7.1 gradient sky / sun glow / horizon haze / ACES tone mapping
- [x] V0.8 browser-safe 2D IFFT ocean detail spectrum
- [x] V0.8 JONSWAP + Phillips directional hybrid visual spectrum
- [x] V0.8 dense near-field ocean patch + Hs-normalized visual displacement
- [x] V0.8 slope / curvature driven breaking-foam mask
- [x] V0.8 desktop 64² / mobile 32² adaptive FFT visual grid
- [x] V0.8 FFT numerical tests
- [x] V0.8.1 choppy crest shaping / sharper wave silhouette
- [x] V0.8.1 breaking-foam streaks aligned with dominant wave direction
- [x] V0.8.1 swim-ring disturbance / V-shaped dynamic wake / re-entry rings
- [x] V0.8.1 disturbance numerical tests + mobile 10 Hz tuning

## 下一階段
- [ ] V0.8.2 FFT spectrum 與 V0.7 physics wave 的低頻/高頻分帶校準
- [ ] V0.8.2 Safari / iPhone 實機 FPS、泡沫門檻與 choppiness 實機調校
- [ ] CWA 實站整合測試 + station selector
- [ ] 建立同源 cached real-sea JSON feed，避免瀏覽器 CORS / secret 暴露
- [ ] Copernicus point-extraction pipeline（NetCDF / API -> normalized JSON）
- [ ] CFD/SPH calibration cases（DualSPHysics / OpenFOAM）
- [ ] PhysicsNeMo surrogate dataset schema + offline training pipeline
- [ ] Nitro / Boost（延後，避免先破壞物理基準）
- [ ] 圈數 / Checkpoint / 排名
- [ ] AI 對手
- [ ] 游泳圈顏色選擇
