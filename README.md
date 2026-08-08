# Swim Ring Racing — V0.9.2

3D Web 水上競速 Prototype，手機橫向優先、桌面支援。玩家駕駛程序化 3D 游泳圈。

## V0.9.2 — XORXOR Atmosphere / Composition Pass

V0.9.2 延續 V0.9.1 的 2050 / Three.js reflective-water 路線，這一版不再增加高頻海浪，而是把整體畫面往 XORXOR / VirtOcean 的「海天一體、柔和鏡面、低角度大海」感覺調整。

- 隱藏舊 V0.7.1 gradient sky / haze，避免 reflection target 同時看到兩套天空。
- 新增 GPU atmosphere sky：zenith / upper sky / horizon / warm sun disk / sun glow。
- 新增薄的 horizon veil，強化海天交界但不做厚重白霧牆。
- 水色改為灰青藍系，Calm / Normal / Rough 依 roughness 平滑切換。
- `distortionScale` 與 normal scale 依海況調整，Calm 不再滿畫面碎紋。
- 鏡頭降低、稍微拉遠並加大視野，讓大尺度 rolling wave 更容易被看成「海浪體積」而不是貼圖。
- V0.5 長尾浪粒子降低尺寸與 opacity，避免再次出現兩條發光雷射線。
- 保留 V0.9.1 mirror-camera reflection、water normals、broad waves 與 mobile performance budget。
- `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js`、RealSeaState adapter 均未重寫。

> V0.9.2 仍是 rendering / composition pass。Gameplay 水面仍以 V0.7/V0.6 `getWaveHeight()` / 9-point hydrodynamics 為 authority。

## V0.9.1 — VirtOcean / 2050 Reflective Water Port

V0.9 的截圖驗收顯示海面仍偏「規則條紋＋深藍塑膠水」，和 VirtOcean 差距明顯。V0.9.1 不再只模仿視覺，而是沿用 VirtOcean Credits 明確標示為 MIT 的開源技術來源：XORXOR 的 **2050** CodePen，以及 Three.js `Water` 的 reflective-water 做法。

- 改用 **mirror-camera render target** 做真正的天空／場景反射。
- 使用 Three.js Water 類型的多層 `waternormals` 取樣。
- 採用 2050 / VirtOcean 的核心調性：`waterColor 0x5b899b`、`distortionScale 15`、暖色 sun specular。
- 海面尺寸 4400 × 4400；桌面 120×120 segments、mobile 72×72。
- 大尺度波浪保留 4 組寬波長 rolling waves。
- reflection texture：desktop 512²、mobile 256²；mobile reflection 最多約 30 Hz。
- Retina pixel ratio 上限：desktop 1.45、mobile 1.20。

### 開源來源與 Attribution

VirtOcean 的公開 Credits 頁面 credit `2050` by XORXOR 並標示 MIT license。Three.js `Water` addon 也是 MIT 專案的一部分。詳細說明：`docs/VIRTOCEAN_ATTRIBUTION.md`。

## Real Sea Data

外部海況統一成：

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

Safari / macOS 保留 classic-script direct launch。Three.js 與 water-normal texture 由網路載入，因此需要網路。

## 主要檔案

- `src/v092-xorxor-atmosphere.js`：V0.9.2 atmosphere、sun、horizon、camera composition、wake tone-down。
- `src/v091-virtocean-water.js`：V0.9.1 reflective water、mirror camera、water normals、broad rolling waves、soft wake。
- `docs/VIRTOCEAN_ATTRIBUTION.md`：VirtOcean / 2050 / Three.js Water 授權與來源。
- `src/ocean-visuals.js`：舊 sky / horizon foundation；V0.9.2 runtime 會隱藏其 sky/haze。
- `src/v09-virtocean-ocean.js`：V0.9 GPU Gerstner 研究版本，runtime 不使用。
- `src/fft-ocean.js`：V0.8 CPU 2D IFFT 研究原型，runtime 不使用。
- `src/ocean-disturbance.js`：V0.8.1 CPU disturbance 研究原型，runtime 不使用。
- `src/real-sea-data.js`：CWA / NOAA / Copernicus normalization。
- `src/ocean.js`：方向性 JONSWAP-like gameplay ocean。
- `src/hydrodynamics.js`：9-point reduced-order hydrodynamics。
- `src/physics-surrogate.js`：NVIDIA PhysicsNeMo / ONNX / WebGPU surrogate contract。
- `src/main.js`：已驗證 gameplay baseline。
