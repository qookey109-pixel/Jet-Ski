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
- [x] V0.9 VirtOcean-inspired GPU ocean rebuild / disable active CPU FFT path
- [x] V0.9.1 XORXOR `2050` / mirror-camera reflective water / water normals
- [x] V0.9.2 atmosphere / sun / horizon / camera composition pass
- [x] V0.9.2.3 5–6 swim-ring-height giant-wave visual target + obstacle removal
- [x] V0.9.2.4 giant visual/gameplay surface sync + anti-penetration guard
- [x] V0.9.3 12-band irregular giant ocean + floating-origin infinite travel
- [x] Issue #12 Phase 1 foundation: WGS84 → local game coordinates / OSM polygon parser
- [x] V0.9.4 日月潭 OSM runtime：Overpass 載入 / 真實岸線 / shoreline collision
- [x] V0.9.4 OSM attribution + primary/fallback Overpass endpoints
- [x] V0.9.4 real-world geometry Node regression test
- [x] V0.9.4.1 S / ↓：前進時煞車、停止後倒車；mobile BRAKE / REV
- [x] V0.9.4.1 reverse-controller Node regression test
- [x] V0.9.4.1 shoreline wall → wet-bank + land slope ribbon
- [x] V0.9.4.1 successful OSM response localStorage cache fallback

## 下一階段
- [ ] V0.9.4.1 Safari 實機驗收：倒車、岸線斜坡、OSM CACHE
- [ ] 將 browser localStorage cache 升級成 repository 內建 OSM snapshot fallback
- [ ] Issue #12 Phase 2：chunk / tile streaming + 前方預載 + 遠方卸載
- [ ] DEM 高程資料 + 真實岸邊地形
- [ ] 湖岸 vegetation / rock material pass（先保持低成本）
- [ ] GPU visual wave 與 gameplay wave 的低頻相位/高度校準
- [ ] CWA 實站整合測試 + station selector
- [ ] 建立同源 cached real-sea JSON feed，避免瀏覽器 CORS / secret 暴露
- [ ] Copernicus point-extraction pipeline（NetCDF / API -> normalized JSON）
- [ ] CFD/SPH calibration cases（DualSPHysics / OpenFOAM）
- [ ] PhysicsNeMo surrogate dataset schema + offline training pipeline
- [ ] Nitro / Boost（延後，避免先破壞物理基準）
- [ ] 圈數 / Checkpoint / 排名
- [ ] AI 對手
- [ ] 游泳圈顏色選擇
