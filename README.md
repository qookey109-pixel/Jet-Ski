# Swim Ring Racing — V0.8.1

3D Web 水上競速 Prototype，手機橫向優先、桌面支援。玩家駕駛程序化 3D 游泳圈。

## V0.8.1 — Choppy Crests + Breaking Foam + Dynamic Wake

V0.8.1 專門精修 V0.8 的近場 FFT 海面，讓肉眼看到的浪更接近真正風浪，而不改 V0.7/V0.6 gameplay 水面。

- FFT slope 驅動 horizontal choppy displacement：浪峰會被壓縮、輪廓更尖，不再只有上下起伏。
- 正浪峰會有輕度 crest asymmetry，Rough 海況更明顯。
- breaking foam 改為同時看 crest / slope / crest curvature，再沿主波峰方向拉成不連續白沫 streak。
- 新增 `src/ocean-disturbance.js`：固定大小事件池，模擬游泳圈高速壓水造成的局部凹陷、擴散波與 V-shaped wake arms。
- 騰空落水會產生 rendering-only re-entry ring，與 V0.5 splash 粒子互補。
- disturbance 高度有硬上限，不會反向污染 gameplay 物理或把視覺網格推到失控。
- 手機 FFT 更新頻率由 12 Hz 調整為 10 Hz，保留 32² grid，降低新增互動水波的 CPU 成本。
- `src/main.js`、`src/hydrodynamics.js`、RealSeaState adapter 均未重寫。

> V0.8.1 的 choppy crest / wake disturbance 仍屬視覺層。正式把它接進碰撞與浮力前，必須先做 V0.8.2 的低頻/高頻分帶與 CFD/SPH 校準。

## V0.8 — FFT Ocean Visual Foundation

V0.8 參考 PeriDyno `OceanPatch` 的 FFT height-field 思路，把「看得到的近場海浪」從單純 shader 微波紋升級成真正的 2D IFFT 頻譜高度場。V0.7/V0.6 的真實海況與水動力仍是 gameplay authority，FFT 目前先作視覺高頻細節層。

- `src/fft-ocean.js`：browser-safe 2D inverse FFT。
- 頻譜使用 JONSWAP + Phillips directional hybrid，受 `Hs / Tp / meanDirectionDeg` 驅動。
- FFT 高度振幅每次更新都按 Hs 正規化，避免視覺浪高失控。
- 桌面採 64×64 FFT grid；手機採 32×32。
- 112 m（手機 84 m）近場高解析 patch 跟著玩家移動。
- FFT detail 往 patch 邊緣淡出，遠場由 V0.7.1 ocean shader 接手。
- 保留 Fresnel、sun glitter、天空、horizon haze 與 V0.5 wake/spray FX。

## V0.7 — Real Sea Data Adapter

所有外部海況先統一成：

```text
significantWaveHeight   Hs, m
peakPeriod              Tp, s
meanDirectionDeg        wave travel-to direction, deg
directionalSpreadDeg    deg
currentSpeed            m/s
currentDirectionDeg     current travel-to direction, deg
stokesDriftX/Z          optional measured/modelled vector, m/s
observedAt              ISO timestamp
source / stationId      provenance
```

已支援：

- **CWA**：`O-B0075-001` / `O-B0075-002`
- **NOAA NDBC**：Realtime standard meteorological `.txt`，使用 `WVHT / DPD / MWD`
- **Copernicus Marine**：`VHM0 / VTPK / VMDR / VSDX / VSDY` 與可選 surface current `u/v`

CWA API key 不會寫入 Repository：

```js
REAL_SEA_RUNTIME.setCwaApiKey('YOUR_CWA_KEY')
REAL_SEA_RUNTIME.loadCwa({ stationId: 'YOUR_STATION_ID' })
```

NOAA：

```js
REAL_SEA_RUNTIME.loadNoaa('51002')
```

Copernicus point record：

```js
REAL_SEA_RUNTIME.applyCopernicusPoint({
  VHM0: 1.2,
  VTPK: 7.5,
  VMDR: 90,
  VSDX: 0.12,
  VSDY: -0.04,
  u0: 0.20,
  v0: 0.00
})
```

## 操作

- `W` / `↑`：加速
- `S` / `↓`：煞車
- `A D` / `← →`：轉向
- `1`：Calm preset
- `2`：Normal preset
- `3`：Rough preset

## 執行

Safari / macOS 保留 classic-script direct launch。Three.js 需要網路。若遠端資料來源被瀏覽器 CORS / 認證策略阻擋，正式 real-data ingest 建議走同源 backend / cached JSON feed。

## 主要檔案

- `src/fft-ocean.js`：2D IFFT + directional hybrid spectrum。
- `src/ocean-disturbance.js`：V0.8.1 dynamic wake / re-entry ripple event pool。
- `src/v08-ocean-visuals.js`：V0.8.1 near-field FFT patch、choppy crests、breaking foam streak、wake interaction。
- `src/ocean-visuals.js`：遠場海面 Shader、天空、太陽與 horizon haze。
- `src/real-sea-data.js`：CWA / NOAA / Copernicus normalization + fetch/parser。
- `src/v07-runtime.js`：normalized real sea state → V0.6 seaProfile。
- `src/ocean.js`：方向性 JONSWAP-like gameplay ocean。
- `src/hydrodynamics.js`：9-point reduced-order hydrodynamics。
- `src/physics-surrogate.js`：NVIDIA PhysicsNeMo / ONNX / WebGPU surrogate contract。
- `src/v06-runtime.js`：V0.6 水動力 overlay。
- `src/main.js`：V0.5 已驗證 gameplay baseline。
- `tests/fft-ocean.test.js`：FFT 數值與 Hs normalization。
- `tests/ocean-disturbance.test.js`：wake / re-entry disturbance 數值測試。
- `docs/REAL_SEA_DATA.md`：資料來源、欄位映射與安全規則。
- `docs/REALISTIC_WATER_PHYSICS.md`：整體校準路線。
