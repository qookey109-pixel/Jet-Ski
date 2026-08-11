# Swim Ring Racing — V0.9.8.1

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線由 V0.9.3 海洋核心 + Real World Water / Coastline layers + V0.9.8.1 Marine Physics Lab 組成：

- **V0.9.3 Irregular Infinite Ocean**：12 組 deterministic 不規則巨浪、visual/gameplay surface sync、anti-penetration、floating origin。
- **V0.9.4.x Real World Water**：日月潭 OSM polygon、shoreline collision、倒車、OSM browser cache。
- **V0.9.6 Taiwan Coast**：花蓮七星潭 OSM `natural=coastline` → 台灣東岸 → 太平洋無限外海。
- **V0.9.7 Hawaii Coast**：Waikīkī / Oʻahu OSM `natural=coastline` → 夏威夷南岸 → Pacific Open Sea。
- **V0.9.8 Marine Physics Lab**：保留 9-point hydrodynamics 為預設，新增 24-cell reduced voxel buoyancy，可在瀏覽器即時 A/B 切換。
- **V0.9.8.1 Gravity & Inertia Pass**：Voxel 垂直運動改為顯式重力/浮力/浸水阻尼積分；離水時接近自由落體，防穿模 guard 只處理真正過深的穿透。
- 核心海浪、RealSeaState、world modes 與 coastline 邏輯不重寫；9-Point 行為維持原 baseline。

## V0.9.8.1 — Marine Physics Gravity & Inertia

V0.9.8.1 修正 Voxel 模式「像黏在水面、缺乏重量感」的問題。

### 9-Point（預設）

- 原本已驗證的 9 點 footprint 水面取樣。
- spring-damper heave / pitch / roll。
- planing lift、lateral damping、slamming 維持原本行為。
- 仍是正式 fallback / baseline。

### Voxel 24-cell（實驗）

- 20 個外圈浮力 cell + 4 個內部穩定 cell。
- 每個 cell 獨立取樣當前 gameplay water surface。
- 依浸水比例估算 displacement / buoyancy。
- 重力始終作用；離水時只有極小 air damping，因此可累積真實向下速度。
- 水阻尼改成隨 submerged fraction 增加，不再在空中用水阻把重力抵消。
- 浮力在不同位置產生 pitch / roll torque；角阻尼也跟浸水比例連動。
- Voxel 模式允許約 22cm controlled immersion；anti-penetration 只作 catastrophic fallback，不再把船體每幀釘在 `water + floatClearance`。
- planing / landing / lateral-drive 等非 pose 力仍沿用既有 baseline，避免一次改太多變數。
- Voxel 與 9-Point 切換時同步當前 pose，降低切換跳動。

操作：

- 畫面右上：`⚓ 9-Point` / `🧊 Voxel`
- 鍵盤：`P` 快速切換
- HUD：Voxel 額外顯示 active cells、submerged fraction、`aY` 垂直加速度。

> V0.9.8.1 是 browser-safe reduced-order marine physics，不是 CFD/SPH，也不是完整 6DOF rigid-body replacement。

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
- V0.9.8.1：explicit gravity + immersion-dependent damping + controlled Voxel contact envelope。

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
node tests/ocean-disturbance.test.js
```

`marine-physics.test.js` 驗證 flat-water neutral buoyancy、dry-body 約 `-9.81 m/s²` 重力加速度、前後/左右 wave slope response、12,000-step giant-wave stress、Voxel immersion guard，以及 9-Point / Voxel selector contract。

## Attribution

- Map data: © OpenStreetMap contributors, ODbL（Real World Water / Coast modes）。
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach；詳見 `docs/VIRTOCEAN_ATTRIBUTION.md`。
- Voxel-buoyancy architecture reference: QusaiAlbonni `three-sails` (MIT)；詳見 `docs/MARINE_PHYSICS_ATTRIBUTION.md`。
- MohamedQatish `BoatPhysics3D` 在 V0.9.8 僅作教育/行為參考，未複製其程式或資產。

## Next

先做 Safari 實機 A/B：Calm / Normal / Rough 各跑 9-Point 與 Voxel，確認 Voxel 有明顯重量/下墜/回彈感、巨浪不穿模、heave/pitch/roll 不發散、FPS 可接受。只有 Voxel 證明比 baseline 更自然後，才考慮提升到更完整的 6DOF marine rigid-body / drag model。
