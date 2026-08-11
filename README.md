# Swim Ring Racing — V0.9.4.1

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線由 V0.9.3 海洋核心 + V0.9.4.x Real World Water layer 組成：

- **V0.9.3 Irregular Infinite Ocean**：12 組 deterministic 不規則巨浪、visual/gameplay surface sync、anti-penetration、floating origin。
- **V0.9.4 Real World Water MVP**：OpenStreetMap / Overpass → 真實水域 polygon → 日月潭岸線 → shoreline collision。
- **V0.9.4.1 Control / Shoreline Refinement**：S / ↓ 在前進時煞車，停住後倒車；岸線由垂直牆改成 wet-bank + land slope ribbon；成功的 OSM response 會存入 localStorage 作為 fallback。
- 不重寫 `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js`；新增功能維持 late-runtime overlay 架構。

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
- 優先辨識 `日月潭 / Sun Moon Lake`，否則選取範圍內最大水域 polygon。
- 岸線與 V0.9.3 floating-origin world offset 同步。
- 玩家越過 water polygon 時退回最後安全水面位置並降速。
- OSM 完全無資料時仍保留純 V0.9.3 海洋模式。
- 顯示 `© OpenStreetMap contributors` attribution。

## 操作

- `W` / `↑`：加速
- `S` / `↓`：前進時煞車；接近停止後持續按住即可倒車
- `A D` / `← →`：轉向；倒車時方向反向作用
- Mobile：`GAS`、`BRAKE / REV`、左右方向鍵
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

## 啟動

可直接開 `index.html`；Safari `file://` classic-script 啟動方式仍保留。也可使用 `start.command` 啟動本機 server。

Real World Water 首次載入需要網路取得 OSM / Overpass；成功一次後，V0.9.4.1 可使用 browser cache fallback。

## 測試

Repository 內含獨立 Node tests：

```bash
node tests/real-world-water.test.js
node tests/reverse-controller.test.js
node tests/ocean-disturbance.test.js
```

`reverse-controller.test.js` 驗證：前進時 S 只煞車、接近停止後才進入倒車、GAS 先取消倒車、reverse speed cap。

## Attribution

- Map data: © OpenStreetMap contributors, ODbL.
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach；詳見 `docs/VIRTOCEAN_ATTRIBUTION.md`。

## Next

Issue #12 下一步：Safari 實機驗證 V0.9.4.1 → repository 內建 OSM snapshot fallback → chunk/tile streaming → DEM 真實高程與更自然岸邊地形。
