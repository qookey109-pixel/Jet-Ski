# AGENTS.md

## Project direction
Swim Ring Racing（Repository: Jet-Ski）是獨立 3D Web 水上競速遊戲，手機橫向優先；方向為「盡可能真實，但仍能在瀏覽器 / 手機即時運行」。

## Current baseline
- Version: V0.8
- 玩家載具為可駕駛的程序化 3D 游泳圈，不使用外部模型。
- V0.4.1 classic-script Safari `file://` 啟動修正必須保留。
- V0.5 水花 / 尾浪 / 落水 Splash FX 位於 `src/fx.js`。
- V0.6 海面為方向性 JONSWAP-like spectrum，含 current / Stokes drift / orbital velocity。
- V0.6 水上姿態使用 `src/hydrodynamics.js` 的 9-point reduced-order hydrodynamics。
- V0.6 透過 `src/v06-runtime.js` overlay 包裝 V0.5 gameplay functions；`src/main.js` 維持 V0.5 已驗證版本。
- V0.7 新增 `src/real-sea-data.js`，所有 CWA / NOAA / Copernicus 資料必須先正規化後才進物理核心。
- V0.7 新增 `src/v07-runtime.js`，real-data 只覆蓋 sea-state input，不重寫 V0.6 水動力核心。
- V0.7 `src/ocean.js` 可直接使用外部 `stokesDriftX / stokesDriftZ`，沒有資料時才回退 spectrum-derived approximation。
- V0.7.1 新增 `src/ocean-visuals.js` rendering overlay：Fresnel、sun specular、micro-ripples、crest foam、sky/horizon haze。
- V0.8 新增 `src/fft-ocean.js`：browser-safe 2D IFFT ocean detail spectrum。
- V0.8 新增 `src/v08-ocean-visuals.js`：近場 dense FFT patch、Hs-normalized displacement、slope/curvature foam。
- V0.8 FFT visual detail 為高頻視覺層；V0.7/V0.6 gameplay ocean 仍是 authoritative water surface。
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
- 不宣稱 reduced-order model 等同 CFD / SPH；高精度結果必須經 DualSPHysics / OpenFOAM 或可信資料校準。
- gameplay 水面幾何與物理 sampling 仍以 V0.7/V0.6 ocean model 為準；V0.8 FFT 細節不得在未校準前直接取代物理碰撞面。
- FFT visual layer 的振幅必須依 Hs 正規化並於近場 patch 邊緣淡出，避免視覺浪高失控與遠場接縫。
- 桌面與手機需採不同 FFT grid / update rate，避免為視覺升級犧牲 mobile FPS。
- 外部來源的 direction convention 必須在 adapter 明確轉成 game travel-to convention，不可隱含假設。
- CWA / Copernicus / NVIDIA API key、token、secret 不得 commit 到 Repository。
- 正式部署的 real-data ingest 優先用同源 backend / cached normalized JSON，不讓 secret 暴露在前端。
- 物理與資料調校值集中在 `src/config.js`；rendering overlay 必須保持可移除，不綁死物理核心。
- NVIDIA / PhysicsNeMo 先作離線 surrogate / calibration；不要每 frame 呼叫遠端模型。
- 保持桌面與手機控制同時可用。
- 保持 classic scripts direct-launch，不恢復本機 ES-module 依賴。
- 每次改動先延續最新 GitHub `main`，避免覆蓋已驗證成果。
