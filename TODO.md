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

## 下一階段
- [ ] V0.7.1 CWA 實站整合測試 + station selector
- [ ] 建立同源 cached real-sea JSON feed，避免瀏覽器 CORS / secret 暴露
- [ ] V0.7.2 Copernicus point-extraction pipeline（NetCDF / API -> normalized JSON）
- [ ] V0.8 CFD/SPH calibration cases（DualSPHysics / OpenFOAM）
- [ ] PhysicsNeMo surrogate dataset schema + offline training pipeline
- [ ] V0.6.1/V0.7 實機手感 / 穩定性調校（桌面 + 手機）
- [ ] Nitro / Boost（延後，避免先破壞物理基準）
- [ ] 圈數 / Checkpoint / 排名
- [ ] AI 對手
- [ ] 游泳圈顏色選擇
