# AGENTS.md

## Project direction
Swim Ring Racing（Repository: Jet-Ski）是獨立 3D Web 水上競速遊戲，手機橫向優先；方向為「盡可能真實，但仍能在瀏覽器 / 手機即時運行」。海面視覺目前以 VirtOcean 類型的大片、厚重、連續滾動海面為主要美術目標。

## Current baseline
- Version: V0.9
- 玩家載具為可駕駛的程序化 3D 游泳圈，不使用外部模型。
- V0.4.1 classic-script Safari `file://` 啟動修正必須保留。
- V0.5 水花 / 尾浪 / 落水 Splash FX 位於 `src/fx.js`。
- V0.6 海面物理為方向性 JONSWAP-like spectrum，含 current / Stokes drift / orbital velocity。
- V0.6 水上姿態使用 `src/hydrodynamics.js` 的 9-point reduced-order hydrodynamics。
- V0.7 `src/real-sea-data.js` 統一 CWA / NOAA / Copernicus 海況資料。
- V0.7.1 `src/ocean-visuals.js` 保留 sky / horizon rendering foundation。
- V0.8 / V0.8.1 CPU FFT 與 disturbance 保留為研究原型，不是 V0.9 的 active visual runtime。
- V0.9 `src/v09-virtocean-ocean.js` 為 active GPU ocean visual layer：Gerstner/spectral-style displacement、reflection、sun glitter、crest foam、GPU V wake。
- V0.9 執行時移除 CPU FFT patch，停止 legacy far-ocean 每 frame CPU vertex rewrite / `computeVertexNormals()`。
- V0.9 pixel ratio cap：desktop 1.5 / mobile 1.25。
- Gameplay 水面仍以 V0.7/V0.6 `getWaveHeight()` 為 authority。
- 重力基準為 9.81 m/s²。

## RealSeaState contract
- `significantWaveHeight`: Hs, m
- `peakPeriod`: Tp, s
- `meanDirectionDeg`: wave travel-to direction
- `directionalSpreadDeg`: deg
- `currentSpeed`: m/s
- `currentDirectionDeg`: current travel-to direction
- optional `stokesDriftX / stokesDriftZ`: m/s
- `observedAt`, `source`, `stationId`: provenance

## Development rules
- VirtOcean 僅作視覺參考；沒有明確開源授權的網站程式碼、材質、音訊、貼圖不得直接複製進 Repository。
- 優先以本專案自己的 Three.js / GLSL clean-room implementation 重現觀感。
- 不宣稱 reduced-order model 等同 CFD / SPH；高精度結果必須經 DualSPHysics / OpenFOAM 或可信資料校準。
- Gameplay physics 與 rendering layer 分離；V0.9 GPU visual wave 未校準前不得直接取代碰撞/浮力 sampling。
- 不得恢復 V0.8.1 每 frame 逐頂點 FFT / wake-event scan / normals rebuild 作為預設 runtime。
- 海浪視覺優先放 GPU；CPU 每 frame 工作應維持 O(1) 或小型固定成本。
- 桌面與手機需有不同 tessellation / pixel-ratio budget，避免為視覺升級犧牲 mobile FPS。
- 外部來源 direction convention 必須在 adapter 明確轉成 game travel-to convention。
- CWA / Copernicus / NVIDIA API key、token、secret 不得 commit 到 Repository。
- NVIDIA / PhysicsNeMo 先作離線 surrogate / calibration；不要每 frame 呼叫遠端模型。
- 保持桌面與手機控制同時可用。
- 保持 classic scripts direct-launch，不恢復本機 ES-module 依賴。
- 每次改動先延續最新 GitHub `main`，避免覆蓋已驗證成果。
