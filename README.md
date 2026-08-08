# Swim Ring Racing — V0.7

3D Web 水上競速 Prototype，手機橫向優先、桌面支援。玩家駕駛程序化 3D 游泳圈。

## V0.7 — Real Sea Data Adapter

V0.7 保留 V0.6 的 directional spectral ocean、9-point hydrodynamics、planing、slamming、current / Stokes drift 與 V0.5 FX，新增真實海況資料正規化層。

### 統一 RealSeaState contract

所有外部資料先轉成：

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

遊戲核心只吃這個 contract，不直接依賴任何單一資料供應商。

### 已支援來源

- **CWA**：`O-B0075-001` / `O-B0075-002` 海象浮標資料正規化與 fetch adapter。
- **NOAA NDBC**：Realtime standard meteorological `.txt` 解析；使用 `WVHT / DPD / MWD`。
- **Copernicus Marine**：point record mapping，支援 `VHM0 / VTPK / VMDR / VSDX / VSDY`，以及可選的 surface current `u/v`。
- NOAA / Copernicus 的 wave **from** direction 會明確轉成遊戲的 travel-to direction。
- Copernicus 若提供 `VSDX / VSDY`，V0.7 ocean model 會優先使用外部 Stokes drift vector，而不是 V0.6 的內部估算。

> V0.7 仍是 browser-safe reduced-order hydrodynamics，不宣稱等同 CFD。外部海況資料提高的是 sea-state fidelity；船體受力仍需要後續 SPH / CFD 校準。

## 真實資料操作

### CWA

CWA API key **不會寫入 Repository**。可在瀏覽器 Console 本機儲存：

```js
REAL_SEA_RUNTIME.setCwaApiKey('YOUR_CWA_KEY')
REAL_SEA_RUNTIME.loadCwa({ stationId: 'YOUR_STATION_ID' })
```

移除本機 key：

```js
REAL_SEA_RUNTIME.clearCwaApiKey()
```

### NOAA NDBC

```js
REAL_SEA_RUNTIME.loadNoaa('51002')
```

也可用 query string：

```text
?seaSource=noaa&station=51002
```

### Copernicus Marine

Copernicus 大型網格 / NetCDF 建議在離線或後端先抽出單點，再傳給：

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

按 `1 / 2 / 3` 會退出真實資料模式並回到內建 Calm / Normal / Rough preset。

## 操作

- `W` / `↑`：加速
- `S` / `↓`：煞車
- `A D` / `← →`：轉向
- `1`：Calm preset
- `2`：Normal preset
- `3`：Rough preset

## 執行

Safari / macOS 仍保留 classic-script direct launch。Three.js 需要網路。若遠端資料來源被瀏覽器 CORS / 認證策略阻擋，正式 real-data ingest 建議走同源 backend / cached JSON feed。

## 主要物理檔案

- `src/real-sea-data.js`：CWA / NOAA / Copernicus normalization + fetch/parser。
- `src/v07-runtime.js`：把 normalized real sea state 平滑接入 V0.6 `seaProfile`。
- `src/ocean.js`：方向性 JONSWAP-like ocean；V0.7 可直接使用外部 Stokes drift vector。
- `src/hydrodynamics.js`：9-point reduced-order hydrodynamics。
- `src/physics-surrogate.js`：NVIDIA PhysicsNeMo / ONNX / WebGPU surrogate contract。
- `src/v06-runtime.js`：V0.6 水動力 overlay，保留。
- `src/main.js`：V0.5 已驗證 gameplay baseline，未重寫。
- `docs/REAL_SEA_DATA.md`：資料來源、欄位映射與安全規則。
- `docs/REALISTIC_WATER_PHYSICS.md`：整體校準路線。
