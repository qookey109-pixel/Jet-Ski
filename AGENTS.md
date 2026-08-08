# AGENTS.md

## Project direction
Swim Ring Racing（Repository: Jet-Ski）是獨立 3D Web 水上競速遊戲，手機橫向優先；目前方向為「盡可能真實，但仍能在瀏覽器 / 手機即時運行」。

## Current baseline
- Version: V0.6
- 玩家載具為可駕駛的程序化 3D 游泳圈，不使用外部模型。
- V0.4.1 classic-script Safari `file://` 啟動修正必須保留。
- V0.5 水花 / 尾浪 / 落水 Splash FX 位於 `src/fx.js`。
- V0.6 將海面升級為方向性 JONSWAP-like spectrum，並加入 current / Stokes drift / orbital velocity。
- V0.6 水上姿態使用 `src/hydrodynamics.js` 的 9-point reduced-order hydrodynamics。
- V0.6 透過 `src/v06-runtime.js` overlay 包裝 V0.5 gameplay functions，`src/main.js` 維持 V0.5 已驗證版本。
- V0.6 重力基準為 9.81 m/s²。

## Development rules
- 不宣稱 reduced-order model 等同 CFD / SPH；高精度結果必須經 DualSPHysics / OpenFOAM 或可信資料校準。
- 水面視覺與 gameplay sampling 必須共用相同 ocean model。
- 真實海況資料統一轉成 `Hs / Tp / direction / spread / current` 後才進遊戲核心。
- 物理調校值集中在 `src/config.js`。
- NVIDIA / PhysicsNeMo 先作離線 surrogate / calibration；不得把 API key、token、secret commit 到 Repository。
- 保持桌面與手機控制同時可用。
- 保持 classic scripts direct-launch，不恢復本機 ES-module 依賴。
- 每次改動先延續最新 GitHub `main`，避免覆蓋已驗證成果。
