# AGENTS.md

## Project direction
Swim Ring Racing（Repository: Jet-Ski）是獨立 3D Web 水上競速遊戲，手機橫向優先；方向為「盡可能真實，但仍能在瀏覽器 / 手機即時運行」。海面視覺目前以 VirtOcean / XORXOR `2050` 類型的大片、厚重、低角度 reflective sea 為主要美術目標。

## Current baseline
- Version: V0.9.2
- 玩家載具為可駕駛的程序化 3D 游泳圈，不使用外部模型。
- V0.4.1 classic-script Safari `file://` 啟動修正必須保留。
- V0.5 水花 / 尾浪 / 落水 Splash FX 位於 `src/fx.js`。
- V0.6 海面物理為方向性 JONSWAP-like spectrum，含 current / Stokes drift / orbital velocity。
- V0.6 水上姿態使用 `src/hydrodynamics.js` 的 9-point reduced-order hydrodynamics。
- V0.7 `src/real-sea-data.js` 統一 CWA / NOAA / Copernicus 海況資料。
- V0.8 / V0.8.1 CPU FFT 與 disturbance 保留為研究原型，不是 active visual runtime。
- V0.9.1 `src/v091-virtocean-water.js` 為 active reflective-water renderer：mirror camera / render target / water normals / broad waves / soft wake。
- V0.9.2 `src/v092-xorxor-atmosphere.js` 為 active atmosphere/composition overlay：single sky, sun, horizon veil, lower camera, water palette/distortion tuning, legacy wake tone-down。
- V0.9.2 runtime 不載入 V0.8 CPU FFT 或 V0.9 stripe-heavy Gerstner renderer。
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
- VirtOcean / XORXOR 僅可使用已有明確授權的開源 lineage；目前 `2050` / Three.js Water 授權與 attribution 記錄於 `docs/VIRTOCEAN_ATTRIBUTION.md`。
- 沒有明確授權的 CodePen / 網站程式碼、材質、音訊、貼圖不得直接複製進 Repository。
- 不宣稱 reduced-order model 等同 CFD / SPH；高精度結果必須經 DualSPHysics / OpenFOAM 或可信資料校準。
- Gameplay physics 與 rendering layer 分離；reflective visual wave 未校準前不得直接取代碰撞/浮力 sampling。
- 不得恢復 V0.8.1 每 frame 逐頂點 FFT / wake-event scan / normals rebuild 作為預設 runtime。
- 海浪視覺優先放 GPU；CPU 每 frame 工作應維持 O(1) 或小型固定成本。
- 反射 render target、tessellation、pixel ratio 必須有 desktop/mobile 不同 budget。
- 每一輪 VirtOcean feel tuning 優先改善大尺度 silhouette、reflection、sky、camera composition，再考慮加入高頻細節。
- 外部來源 direction convention 必須在 adapter 明確轉成 game travel-to convention。
- CWA / Copernicus / NVIDIA API key、token、secret 不得 commit 到 Repository。
- NVIDIA / PhysicsNeMo 先作離線 surrogate / calibration；不要每 frame 呼叫遠端模型。
- 保持桌面與手機控制同時可用。
- 保持 classic scripts direct-launch，不恢復本機 ES-module 依賴。
- 每次改動先延續最新 GitHub `main`，避免覆蓋已驗證成果。
