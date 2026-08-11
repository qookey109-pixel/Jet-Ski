# Swim Ring Racing — V0.9.7

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線由 V0.9.3 海洋核心 + Real World Water / Coastline layers + V0.9.7 World Modes 組成：

- **V0.9.3 Irregular Infinite Ocean**：12 組 deterministic 不規則巨浪、visual/gameplay surface sync、anti-penetration、floating origin。
- **V0.9.4.x Real World Water**：日月潭 OSM polygon、shoreline collision、倒車、OSM browser cache。
- **V0.9.6 Taiwan Coast**：花蓮七星潭 OSM `natural=coastline` → 台灣東岸 → 太平洋無限外海。
- **V0.9.7 Hawaii Coast**：Waikīkī / Oʻahu OSM `natural=coastline` → 夏威夷南岸 → Pacific Open Sea。
- 核心 `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js` 不重寫；Real World 功能維持 runtime overlay。

## V0.9.7 — Hawaii → Pacific Open Sea

第一個夏威夷測試區：**Waikīkī / Oʻahu 南岸**。

```text
OpenStreetMap natural=coastline
        ↓
WGS84 → local meter coordinates
        ↓
OSM directed coastline
        ↓
local beach / land shelf + land-side collision
        ↓
V0.9.3 irregular infinite ocean
        ↓
Waikīkī 近岸 → 離岸 → Pacific Open Sea
```

重點：

- 夏威夷與台灣共用 `src/real-world-coast.js` 的 coastline direction / sea-land side 判斷。
- 只阻擋玩家進入陸地，海側不建立第二道邊界。
- Waikīkī 預設出生在岸外約 220m。
- local coastline collision authority 約 1.4km；更遠外海完全交回 floating-origin infinite ocean，避免局部 OSM bbox 端點變成假牆。
- OSM 使用主 / 備援 Overpass endpoint，成功資料寫入 browser localStorage fallback。
- 第一版島上地形仍是低成本 sand/land shelf；DEM、建築、植被後續再加。

## 世界模式

- `🌊 外海`：純 V0.9.3 infinite ocean。
- `🇹🇼 七星潭→外海`：台灣東岸真實 coastline + 太平洋外海。
- `🌺 Waikīkī→外海`：夏威夷真實 coastline + Pacific Open Sea。
- `🏞️ 日月潭`：OSM 湖泊 polygon + 湖岸碰撞。

四個世界各自保存位置；切回原世界時恢復自己的位置狀態。

## 操作

- `W` / `↑`：加速
- `S` / `↓`：前進時煞車；接近停止後持續按住即可倒車
- `A D` / `← →`：轉向；倒車時方向反向作用
- Mobile：`GAS`、`BRAKE / REV`、左右方向鍵
- `1`：Calm
- `2`：Normal
- `3`：Rough

## Ocean Stack

- V0.6：directional spectral ocean foundation、9-point hydrodynamics、planing / slamming / current / Stokes drift。
- V0.7：RealSeaState contract；CWA / NOAA NDBC / Copernicus normalization。
- V0.9.1：XORXOR `2050` / VirtOcean-inspired reflective water + Three.js water normals。
- V0.9.2.3：5–6 swim-ring-height giant-wave visual target。
- V0.9.2.4：giant-wave gameplay surface sync / anti-penetration。
- V0.9.3：12-band irregular ocean + floating-origin infinite travel。
- V0.9.6：Taiwan coastline → continuous nearshore/open sea。
- V0.9.7：Hawaii coastline → continuous Waikīkī/Pacific open sea。

## 啟動

可直接開 `index.html`；Safari `file://` classic-script 啟動方式仍保留。也可使用 `start.command` 啟動本機 server。

純外海不依賴 OSM；七星潭、Waikīkī、日月潭首次載入需要網路取得 Overpass 資料，成功後可使用 browser cache fallback。

## 測試

```bash
node tests/real-world-water.test.js
node tests/real-world-coast.test.js
node tests/hawaii-coast.test.js
node tests/reverse-controller.test.js
node tests/ocean-disturbance.test.js
```

## Attribution

- Map data: © OpenStreetMap contributors, ODbL（Real World Water / Coast modes）。
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach；詳見 `docs/VIRTOCEAN_ATTRIBUTION.md`。

## Next

Issue #12 下一步：V0.9.7 Safari 實機驗收 → repository 內建 OSM snapshots → coastline chunk/tile streaming → DEM 真實高程 → 從單一海岸窗擴成可沿 Oʻahu / 台灣海岸長距離航行。
