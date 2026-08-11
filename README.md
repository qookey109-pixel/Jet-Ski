# Swim Ring Racing — V0.9.5

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線由 V0.9.3 海洋核心 + V0.9.4.x Real World Water + V0.9.5 World Modes 組成：

- **V0.9.3 Irregular Infinite Ocean**：12 組 deterministic 不規則巨浪、visual/gameplay surface sync、anti-penetration、floating origin。
- **V0.9.4 Real World Water MVP**：OpenStreetMap / Overpass → 真實水域 polygon → 日月潭岸線 → shoreline collision。
- **V0.9.4.1 Control / Shoreline Refinement**：S / ↓ 在前進時煞車，停住後倒車；岸線改成 wet-bank + land slope ribbon；成功的 OSM response 寫入 localStorage fallback。
- **V0.9.5 World Modes**：新增可切換的 `外海 Open Sea` / `日月潭 Sun Moon Lake`。外海模式不套用湖岸碰撞，直接使用 V0.9.3 無限海洋與 floating origin。
- 不重寫 `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js`；新增功能維持 late-runtime overlay 架構。

## V0.9.5 — Open Sea Mode

V0.9.5 預設直接進入 **外海 Open Sea**。

外海模式：

- 無日月潭 shoreline collision。
- 無 OSM 岸線 mesh。
- 保留 V0.9.3 12-band 不規則巨浪。
- 保留 giant-wave surface sync / anti-penetration。
- 保留 floating-origin，可持續往同一方向航行，不受舊 ±310m 世界限制。
- 保留 V0.9.4.1 倒車。
- 日月潭 OSM 可在背景載入 / 快取，但不會把外海玩家強制傳回湖內。

世界模式可直接在畫面按鈕切換：

```text
🌊 外海 Open Sea
🏞️ 日月潭
```

切換世界時會保存各自的位置狀態；回到外海時不需要重新從日月潭開始。

> V0.9.5 的 Open Sea 是「無限程序化外海模式」。下一階段才會把真實台灣海岸線與外海做成可連續航行的同一張世界，而不是目前的模式切換。

## Real World Water — 日月潭 MVP

流程：

```text
OpenStreetMap / Overpass
        ↓
water way / multipolygon relation
        ↓
WGS84 lat/lon → local meter coordinates
        ↓
water polygon + holes
        ↓
sloped shoreline ribbon
        ↓
V0.9.3 ocean renderer / hydrodynamics
        ↓
shoreline collision
```

目前功能：

- 預設日月潭中心與測試 bounding box。
- Overpass 主 endpoint + 備援 endpoint。
- 成功回應寫入 browser localStorage；兩個 endpoint 都失敗時可使用上次成功資料。
- 支援 OSM `way` 與 `relation` outer/inner geometry stitching。
- 岸線與 V0.9.3 floating-origin world offset 同步。
- 玩家越過 water polygon 時退回最後安全水面位置並降速。
- 顯示 `© OpenStreetMap contributors` attribution；外海模式隱藏 OSM-only UI。

## 操作

- `W` / `↑`：加速
- `S` / `↓`：前進時煞車；接近停止後持續按住即可倒車
- `A D` / `← →`：轉向；倒車時方向反向作用
- Mobile：`GAS`、`BRAKE / REV`、左右方向鍵
- 世界模式：`外海 Open Sea` / `日月潭`
- `1`：Calm
- `2`：Normal
- `3`：Rough

倒車上限目前約 8 m/s（約 29 km/h），先以可控、方便離岸為目標。

## Ocean Stack

- V0.6：directional spectral-ocean foundation、9-point hydrodynamics、planing / slamming / current / Stokes drift。
- V0.7：RealSeaState contract；CWA / NOAA NDBC / Copernicus normalization。
- V0.9.1：XORXOR `2050` / VirtOcean-inspired reflective water + Three.js water normals。
- V0.9.2：atmosphere / sun / horizon / camera composition。
- V0.9.2.3：大型 swell 視覺尺度與 Ocean Focus。
- V0.9.2.4：巨浪 gameplay-surface sync / anti-penetration。
- V0.9.3：12-band irregular ocean + floating-origin infinite travel。
- V0.9.5：Open Sea / Sun Moon Lake world-mode switching。

## 啟動

可直接開 `index.html`；Safari `file://` classic-script 啟動方式仍保留。也可使用 `start.command` 啟動本機 server。

Open Sea 本身不依賴 OSM；日月潭 Real World Water 首次載入需要網路取得 OSM / Overpass，成功一次後可使用 browser cache fallback。

## 測試

Repository 內含獨立 Node tests：

```bash
node tests/real-world-water.test.js
node tests/reverse-controller.test.js
node tests/ocean-disturbance.test.js
```

## Attribution

- Map data: © OpenStreetMap contributors, ODbL（僅 Real World Water 模式使用）。
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach；詳見 `docs/VIRTOCEAN_ATTRIBUTION.md`。

## Next

Issue #12 下一步：**台灣真實海岸 → 近岸水域 → 外海連續航行**，再加入 chunk/tile streaming、repository 內建 OSM snapshot、DEM 真實高程與自然岸邊地形。
