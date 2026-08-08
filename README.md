# Swim Ring Racing — V0.9

3D Web 水上競速 Prototype，手機橫向優先、桌面支援。玩家駕駛程序化 3D 游泳圈。

## V0.9 — VirtOcean-inspired GPU Ocean Rebuild

V0.9 把海浪視覺方向直接改成更接近 VirtOcean 的「大片、厚重、連續滾動、海天反光明顯」風格，但使用本專案自己的 clean-room Three.js Shader 實作，不複製 VirtOcean 網站程式或素材。

### 視覺重點

- 6 組 GPU Gerstner / spectral-style waves，主要浪長由 `Tp` 推導。
- `Hs` 直接控制視覺浪幅與 Rough 海況強度。
- 水平 Gerstner displacement 讓浪峰更集中、更有厚度。
- 近場高解析 GPU ocean patch，桌面 128 segments、手機 72 segments。
- Fresnel 海天反射、藍綠深水層次、亮浪峰。
- Broken sun glitter：太陽反光由大量碎亮點構成，不再像塑膠亮面。
- Rough 海況增加 capillary normal detail 與 crest foam。
- GPU V-shaped craft wake，取代 V0.8.1 每個頂點掃 wake event 的 CPU 路徑。

### V0.9 Performance Rebuild

V0.8/V0.8.1 的 CPU FFT 是重要研究原型，但在 Safari / Retina 上會造成週期性卡頓。V0.9 執行時：

- 移除 V0.8.1 CPU FFT patch 的 render/update 路徑。
- 不再每 frame 修改 8k+ 遠海頂點。
- 不再每 frame `computeVertexNormals()`。
- 海浪 displacement / normals / foam / wake 主要交給 GPU shader。
- Retina pixel ratio 上限：桌面 `1.5`、mobile `1.25`。
- V0.8 FFT 與 disturbance 程式保留在 repo 作研究/比較，但 V0.9 視覺 runtime 不使用它們。

> Gameplay 水面仍以 V0.7/V0.6 `getWaveHeight()` / 9-point hydrodynamics 為 authority。V0.9 是高品質 rendering layer；正式讓 GPU 視覺浪與浮力完全一致前，仍需後續低頻校準。

## Real Sea Data

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
- **NOAA NDBC**：`WVHT / DPD / MWD`
- **Copernicus Marine**：`VHM0 / VTPK / VMDR / VSDX / VSDY`，可選 surface current `u/v`

CWA API key 不會寫入 Repository：

```js
REAL_SEA_RUNTIME.setCwaApiKey('YOUR_CWA_KEY')
REAL_SEA_RUNTIME.loadCwa({ stationId: 'YOUR_STATION_ID' })
```

NOAA：

```js
REAL_SEA_RUNTIME.loadNoaa('51002')
```

## 操作

- `W` / `↑`：加速
- `S` / `↓`：煞車
- `A D` / `← →`：轉向
- `1`：Calm
- `2`：Normal
- `3`：Rough

## 執行

Safari / macOS 保留 classic-script direct launch。Three.js 仍由 CDN 載入，因此需要網路。

## 主要檔案

- `src/v09-virtocean-ocean.js`：V0.9 GPU ocean、reflection、foam、GPU wake、performance bypass。
- `src/ocean-visuals.js`：天空 / horizon 基礎層。
- `src/fft-ocean.js`：V0.8 CPU 2D IFFT 研究原型，V0.9 runtime 不使用。
- `src/ocean-disturbance.js`：V0.8.1 CPU disturbance 研究原型，V0.9 GPU wake 已取代主要路徑。
- `src/real-sea-data.js`：CWA / NOAA / Copernicus normalization。
- `src/ocean.js`：方向性 JONSWAP-like gameplay ocean。
- `src/hydrodynamics.js`：9-point reduced-order hydrodynamics。
- `src/physics-surrogate.js`：NVIDIA PhysicsNeMo / ONNX / WebGPU surrogate contract。
- `src/main.js`：已驗證 gameplay baseline。
