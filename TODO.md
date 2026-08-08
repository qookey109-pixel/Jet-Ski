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
- [x] V0.7 real-data runtime overlay
- [x] V0.7.1 Visual Ocean Pass
- [x] V0.8 browser-safe 2D IFFT ocean visual prototype
- [x] V0.8.1 choppy crest / breaking foam / CPU wake prototype
- [x] V0.9 VirtOcean-inspired GPU Gerstner rebuild
- [x] V0.9 performance rebuild / disable active CPU FFT path
- [x] V0.9.1 verify VirtOcean open-source lineage: XORXOR `2050` MIT
- [x] V0.9.1 port mirror-camera reflective-water strategy
- [x] V0.9.1 Three.js water-normal detail / distortionScale 15 / VirtOcean tint
- [x] V0.9.1 remove V0.9 dense stripe field from active runtime
- [x] V0.9.1 broad rolling waves + softer GPU V wake
- [x] V0.9.1 attribution documentation

## 下一階段
- [ ] V0.9.1 Safari 實機畫面驗收：reflection / water normal 是否正常載入
- [ ] V0.9.2 依使用者截圖做第二輪 feel tuning：水色、波高、反射強度、鏡頭高度
- [ ] V0.9.2 GPU visual wave 與 gameplay wave 的低頻相位/高度校準
- [ ] CWA 實站整合測試 + station selector
- [ ] 建立同源 cached real-sea JSON feed，避免瀏覽器 CORS / secret 暴露
- [ ] Copernicus point-extraction pipeline（NetCDF / API -> normalized JSON）
- [ ] CFD/SPH calibration cases（DualSPHysics / OpenFOAM）
- [ ] PhysicsNeMo surrogate dataset schema + offline training pipeline
- [ ] Nitro / Boost（延後，避免先破壞物理基準）
- [ ] 圈數 / Checkpoint / 排名
- [ ] AI 對手
- [ ] 游泳圈顏色選擇
