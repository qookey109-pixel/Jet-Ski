# Swim Ring Racing — V0.9.8.2

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線由 V0.9.3 海洋核心 + Real World Water / Coastline layers + V0.9.8.x Marine Physics Lab 組成：

- **V0.9.3 Irregular Infinite Ocean**：12 組 deterministic 不規則巨浪、visual/gameplay surface sync、floating origin。
- **V0.9.4.x Real World Water**：日月潭 OSM polygon、shoreline collision、倒車、OSM browser cache。
- **V0.9.6 Taiwan Coast**：花蓮七星潭 OSM `natural=coastline` → 台灣東岸 → 太平洋無限外海。
- **V0.9.7 Hawaii Coast**：Waikīkī / Oʻahu OSM `natural=coastline` → 夏威夷南岸 → Pacific Open Sea。
- **V0.9.8 Marine Physics Lab**：9-point hydrodynamics 為預設，新增 24-cell reduced voxel buoyancy，可即時 A/B 切換。
- **V0.9.8.1 Gravity & Inertia Pass**：Voxel 改為顯式重力/浮力/浸水阻尼積分，離水時保留真實下墜。
- **V0.9.8.2 Smooth Contact Pass**：移除常態硬式水面 snap、降低 landing/巨浪單幀速度 cliff，並加入 V0.9.3 height-only 每幀快取，減少 24-cell 重複浪計算。
- `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js` baseline 不修改；9-Point 維持原行為。

## V0.9.8.2 — Smooth Contact Pass

V0.9.8.2 處理 Voxel 實機測試中偶發「像撞到看不見的東西」的頓挫感。

### Contact / landing smoothing

- Voxel 正常水面接觸交由 24-cell buoyancy 自己處理。
- anti-penetration 的 Voxel hard guard 從常態 22 cm envelope 改成約 **58 cm catastrophic-only fallback**；一般浪峰不再直接把 craft root 硬推回水面。
- 原本 arcade landing 會單幀掉 9% / 18% 速度，且 V0.6 可能再加 slamming loss；Voxel 模式將一次 landing 的速度 cliff 上限收斂到約 **5.5%**，仍保留撞水感但避免像撞牆。
- 非煞車狀態的單幀被動水阻減速度限制在約 **9.5 m/s²**；`BRAKE`、倒車與 shoreline collision 不受這個 limiter 影響。
- 9-Point 完全不套用以上 smoothing。

### 24-cell sampling performance

Voxel 每幀會大量呼叫 `getWaveHeight()`。V0.9.3 原本每次都重新計算 12-band 的方向 wobble、wavenumber、振幅與 gradient。

V0.9.8.2 新增 height-only cache：

- 仍使用完全相同的 12-band V0.9.3 高度公式。
- 每個 animation time 只準備一次 12 組 component 參數。
- 每個 cell 的 hot path 只做預先組好的相位 dot-product + `sin()`。
- 不改 GPU shader、不改波形高度、不改 visual/gameplay sync。
- 目的為降低 Safari 上的重複 trig / temporary object / GC 壓力。

## 船體物理

### 9-Point（預設）

- 原本已驗證的 9 點 footprint 水面取樣。
- spring-damper heave / pitch / roll。
- planing lift、lateral damping、slamming 維持原本行為。
- 正式 fallback / baseline。

### Voxel 24-cell（實驗）

- 20 個外圈浮力 cell + 4 個內部穩定 cell。
- 每個 cell 獨立取樣當前 gameplay water surface。
- 重力始終作用，浸水後浮力與 damping 才增加。
- per-cell displacement 產生 heave / pitch / roll torque。
- HUD 顯示 active cells、submerged fraction、`aY` 垂直加速度。

操作：

- 畫面右上：`⚓ 9-Point` / `🧊 Voxel`
- 鍵盤：`P` 快速切換

> V0.9.8.x 是 browser-safe reduced-order marine physics，不是 CFD/SPH，也不是完整 6DOF rigid-body replacement。

## 世界模式

- `🌊 外海`：純 V0.9.3 infinite ocean。
- `🇹🇼 七星潭→外海`：台灣東岸真實 coastline + 太平洋外海。
- `🌺 Waikīkī→外海`：夏威夷真實 coastline + Pacific Open Sea。
- `🏞️ 日月潭`：OSM 湖泊 polygon + 湖岸碰撞。

四個世界各自保存位置；Marine Physics Lab 在所有世界共用同一套切換。

## 操作

- `W` / `↑`：加速
- `S` / `↓`：前進時煞車；接近停止後持續按住即可倒車
- `A D` / `← →`：轉向；倒車時方向反向作用
- `P`：9-Point / Voxel hydrodynamics 切換
- Mobile：`GAS`、`BRAKE / REV`、左右方向鍵
- `1`：Calm
- `2`：Normal
- `3`：Rough

## Ocean / Physics Stack

- V0.6：directional spectral ocean foundation、9-point hydrodynamics、planing / slamming / current / Stokes drift。
- V0.7：RealSeaState contract；CWA / NOAA NDBC / Copernicus normalization。
- V0.9.1：XORXOR `2050` / VirtOcean-inspired reflective water + Three.js water normals。
- V0.9.2.3：5–6 swim-ring-height giant-wave visual target。
- V0.9.2.4：giant-wave gameplay surface sync / anti-penetration。
- V0.9.3：12-band irregular ocean + floating-origin infinite travel。
- V0.9.6：Taiwan coastline → continuous nearshore/open sea。
- V0.9.7：Hawaii coastline → continuous Waikīkī/Pacific open sea。
- V0.9.8：9-point / 24-cell voxel buoyancy A/B selector。
- V0.9.8.1：explicit gravity + immersion-dependent damping。
- V0.9.8.2：smooth contact / landing cliff cap / cached exact-height sampler。

## 啟動

可直接開 `index.html`；Safari `file://` classic-script 啟動方式仍保留。也可使用 `start.command` 啟動本機 server。

純外海不依賴 OSM；七星潭、Waikīkī、日月潭首次載入需要網路取得 Overpass 資料，成功後可使用 browser cache fallback。

## 測試

```bash
node tests/real-world-water.test.js
node tests/real-world-coast.test.js
node tests/hawaii-coast.test.js
node tests/reverse-controller.test.js
node tests/marine-physics.test.js
node tests/fast-ocean-sampler.test.js
node tests/v0982-marine-smoothing.test.js
node tests/ocean-disturbance.test.js
```

重點 regression：

- `marine-physics.test.js`：neutral buoyancy、dry-body gravity、wave slope、giant-wave stress、selector contract。
- `fast-ocean-sampler.test.js`：cached sampler 與 V0.9.3 參考高度公式逐點一致，且同一 animation time 只 prepare 一次。
- `v0982-marine-smoothing.test.js`：Voxel landing/decel cliff 被限制；BRAKE 與 9-Point 不受影響。

## Attribution

- Map data: © OpenStreetMap contributors, ODbL（Real World Water / Coast modes）。
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach；詳見 `docs/VIRTOCEAN_ATTRIBUTION.md`。
- Voxel-buoyancy architecture reference: QusaiAlbonni `three-sails` (MIT)；詳見 `docs/MARINE_PHYSICS_ATTRIBUTION.md`。
- MohamedQatish `BoatPhysics3D` 在 V0.9.8 僅作教育/行為參考，未複製其程式或資產。

## Next

先做 Safari 實機 Voxel 驗收：確認「撞隱形物」式頓挫是否消失，同時保留重量、下墜、回彈感。若仍有規律性 frame hitch，再加入 lightweight frame-time telemetry，分離 rendering / physics / GC spikes；若物理已穩定，再往 water-relative per-cell drag、continuous slamming 與完整 6DOF marine rigid-body 推進。
