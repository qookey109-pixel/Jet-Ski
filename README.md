# Swim Ring Racing — V0.9.6

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線由 V0.9.3 海洋核心 + V0.9.4.x Real World Water + V0.9.6 World Modes 組成：

- **V0.9.3 Irregular Infinite Ocean**：12 組 deterministic 不規則巨浪、visual/gameplay surface sync、anti-penetration、floating origin。
- **V0.9.4.x Real World Water**：日月潭 OSM polygon、自然 shoreline ribbon、shoreline collision、倒車、OSM browser cache。
- **V0.9.5 Open Sea**：無限程序化外海模式。
- **V0.9.6 Taiwan Coast**：花蓮七星潭 OSM `natural=coastline` → 真實海岸線；海側直接接 V0.9.3 infinite ocean，不需要離岸時切場景。
- 核心 `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js` 不重寫；新增功能維持 runtime overlay。

## V0.9.6 — Taiwan Coast → Open Sea

第一個海岸測試點：**花蓮七星潭 Qixingtan**。

```text
OpenStreetMap natural=coastline
        ↓
WGS84 → local meter coordinates
        ↓
OSM directed coastline
        ↓
land-side shoreline / terrain shelf
        ↓
water-side shoreline collision
        ↓
V0.9.3 irregular infinite ocean
        ↓
近岸 → 離岸 → 外海，座標連續
```

重點：

- coastline 保留 OSM 原始方向，不任意 reverse。
- 依 OSM coastline 規則判斷海側 / 陸側；只阻擋玩家進入陸地。
- 往海側航行沒有第二道邊界，可直接進入 floating-origin 無限外海。
- 海岸線與 floating-origin 同步，不會因 recenter 漂移。
- 預設出生在岸外約 180m，方便立刻測試靠岸與離岸。
- 海岸 OSM 使用主 / 備援 Overpass endpoint，成功資料會存 browser localStorage fallback。
- 第一版陸地是低成本 sloped land shelf；DEM 真實高程留到下一階段。

## 世界模式

- `🌊 外海`：純 V0.9.3 infinite ocean。
- `🇹🇼 七星潭→外海`：真實台灣海岸 + 同一張無限外海水面。
- `🏞️ 日月潭`：OSM 湖泊 polygon + 湖岸碰撞。

三個世界各自保存位置；切回原世界時恢復自己的位置狀態。

## 操作

- `W` / `↑`：加速
- `S` / `↓`：前進時煞車；接近停止後持續按住即可倒車
- `A D` / `← →`：轉向；倒車時方向反向作用
- Mobile：`GAS`、`BRAKE / REV`、左右方向鍵
- `1`：Calm
- `2`：Normal
- `3`：Rough

## Ocean Stack

- V0.6：directional spectral-ocean foundation、9-point hydrodynamics、planing / slamming / current / Stokes drift。
- V0.7：RealSeaState contract；CWA / NOAA NDBC / Copernicus normalization。
- V0.9.1：XORXOR `2050` / VirtOcean-inspired reflective water + Three.js water normals。
- V0.9.2.3：5–6 swim-ring-height giant-wave visual target。
- V0.9.2.4：giant-wave gameplay surface sync / anti-penetration。
- V0.9.3：12-band irregular ocean + floating-origin infinite travel。
- V0.9.6：OSM Taiwan coastline + continuous nearshore → open sea world coordinates。

## 啟動

可直接開 `index.html`；Safari `file://` classic-script 啟動方式仍保留。也可使用 `start.command` 啟動本機 server。

純外海不依賴 OSM；七星潭與日月潭首次載入需要網路取得 Overpass 資料，成功後可使用 browser cache fallback。

## 測試

```bash
node tests/real-world-water.test.js
node tests/real-world-coast.test.js
node tests/reverse-controller.test.js
node tests/ocean-disturbance.test.js
```

## Attribution

- Map data: © OpenStreetMap contributors, ODbL（Real World Water / Taiwan Coast 模式）。
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach；詳見 `docs/VIRTOCEAN_ATTRIBUTION.md`。

## Next

Issue #12 下一步：V0.9.6 Safari 實機驗收 → repository 內建 OSM snapshot → coastline chunk/tile streaming → DEM 真實高程 → 沿台灣海岸持續航行。
