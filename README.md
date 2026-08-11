# Swim Ring Racing — V0.9.4

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線由 V0.9.3 海洋核心加上 V0.9.4 Real World Water layer 組成：

- **V0.9.3 Irregular Infinite Ocean**：12 組 deterministic 不規則巨浪、視覺/Gameplay surface sync、anti-penetration、floating origin。
- **V0.9.4 Real World Water MVP**：OpenStreetMap / Overpass → 真實水域 polygon → 日月潭岸線 bank mesh → 岸邊碰撞。
- V0.9.4 不重寫 `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js`；真實世界地圖是獨立 world-generation/runtime layer。

## V0.9.4 — Issue #12 Phase 1

首個固定測試場景為 **日月潭 Sun Moon Lake**。

流程：

```text
OpenStreetMap / Overpass
        ↓
水域 way / multipolygon relation
        ↓
WGS84 lat/lon → local meter coordinates
        ↓
真實 water polygon + holes
        ↓
shoreline bank mesh
        ↓
V0.9.3 ocean renderer / hydrodynamics
        ↓
shoreline collision
```

目前功能：

- 預設日月潭中心與測試 bounding box。
- 主 Overpass endpoint 失敗時自動切換備援 endpoint。
- 支援 OSM `way` 與 `relation` outer/inner geometry stitching。
- 優先辨識 `日月潭 / Sun Moon Lake`，否則選取範圍內最大水域 polygon。
- 岸線會跟 V0.9.3 floating-origin world offset 同步，不會因 recenter 漂移。
- 玩家越過真實 water polygon 時退回最後安全水面位置並降速。
- OSM 載入失敗時保留純 V0.9.3 海洋模式，不讓遊戲整體失效。
- UI 顯示 OSM 載入狀態與來源 feature id。
- 顯示 `© OpenStreetMap contributors` attribution。

### Phase 1 限制

目前岸邊先使用簡單 bank wall mesh 驗證座標與碰撞，不代表最終美術。尚未包含 DEM 高程、自然坡岸、建築、道路或全球 streaming。

## Ocean Stack

- V0.6：directional spectral-ocean foundation、9-point hydrodynamics、planing / slamming / current / Stokes drift。
- V0.7：RealSeaState contract；CWA / NOAA NDBC / Copernicus normalization。
- V0.9.1：XORXOR `2050` / VirtOcean-inspired mirror-camera reflective water + Three.js water normals。
- V0.9.2：atmosphere / sun / horizon / camera composition。
- V0.9.2.3：大型 swell 視覺尺度與 Ocean Focus。
- V0.9.2.4：巨浪 gameplay-surface sync / anti-penetration。
- V0.9.3：12-band irregular ocean + floating-origin infinite travel。

## Real Sea Data Contract

```text
significantWaveHeight   Hs, m
peakPeriod              Tp, s
meanDirectionDeg        wave travel-to direction, deg
directionalSpreadDeg    deg
currentSpeed            m/s
currentDirectionDeg     current travel-to direction, deg
stokesDriftX/Z          optional vector, m/s
observedAt              ISO timestamp
source / stationId      provenance
```

支援 adapter：CWA、NOAA NDBC、Copernicus Marine。API key 不寫入 Repository。

## 操作

- `W` / `↑`：加速
- `S` / `↓`：煞車
- `A D` / `← →`：轉向
- `1`：Calm
- `2`：Normal
- `3`：Rough

## 啟動

可直接開 `index.html`；Safari `file://` classic-script 啟動方式仍保留。也可使用 `start.command` 啟動本機 server。

V0.9.4 Real World Water 需要網路連線取得 OSM / Overpass 資料；若 Overpass 暫時不可用，遊戲會自動退回純海洋模式。

## 測試

目前 repository 內含獨立 Node tests，例如：

```bash
node tests/real-world-water.test.js
node tests/ocean-disturbance.test.js
```

`real-world-water.test.js` 驗證 WGS84/local conversion、polygon holes、relation segment stitching、OSM candidate selection 與 Overpass query generation。

## Attribution

- Map data: © OpenStreetMap contributors, ODbL.
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach；詳見 `docs/VIRTOCEAN_ATTRIBUTION.md`。

## Next

Issue #12 下一步：Safari 實機驗證日月潭岸線 → shoreline/land ribbon → cached OSM snapshot → chunk/tile streaming → DEM 真實高程。
