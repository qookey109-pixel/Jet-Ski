# Swim Ring Racing — V0.10.2

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線：

- **V0.9.3 Irregular Infinite Ocean**：12-band deterministic 巨浪、visual/gameplay sync、floating origin。
- **V0.9.4–0.9.7 Real World Water / Coast**：日月潭、七星潭→外海、Waikīkī→Pacific。
- **V0.9.9 9-Point Plus**：以實機手感較好的 9-point footprint 為主線；Base 保留 A/B；Voxel 降為 EXP。
- **V0.9.9.1 Lateral + COM**：Plus-only 水相對側向力、側滑收斂、低重心 roll torque。
- **V0.9.9.2 Planar 3DOF**：Surge `u`、Sway `v`、Yaw-rate `r` + added-mass proxy。
- **V0.9.9.3 Steering Force + Yaw Moment**：A/D 轉向由 steering force / stern yaw moment `Mz` 驅動。
- **V0.9.9.3.1–.2 Safari Performance**：frame telemetry + Safari GPU budget；實機回報卡頓有改善。
- **V0.10.0 Unified 6DOF Contract**：observer-first 六自由度 state contract；Safari acceptance PASS。
- **V0.10.1 Calibration Contract**：mass / CG / inertia proxy / added-mass proxy / damping / steering lever arm 單一可追溯 catalog；不改 physics authority。
- **V0.10.2 Internal Roll/Pitch Rates**：9-Point+ 正式公開既有 `rollRate / pitchRate`；6DOF `p/q` 優先使用內部 state，不再依賴 render-pose finite difference。
- `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js` validated baseline 不重寫。

## V0.10.2 — Internal Roll/Pitch Rate Exposure

V0.10.2 不新增新的 roll/pitch solver，也不修改任何積分參數。

9-Point+ 原本就有內部：

```text
pitchRate
rollRate
```

過去這兩個值只存在 model closure 內，`V0.10.0` observer 因此需要由最終 render pose 做 finite difference 估算 `p/q`。

現在 `nine-point-plus-hydrodynamics.js` 會在 pose result 與 diagnostics 正式公開：

```text
rollRate  -> 6DOF p
pitchRate -> 6DOF q
```

6DOF 原本已有 internal-rate priority，因此 V0.10.2 不需要新增每幀 wrapper：

- internal `rollRate` 存在 → `p` 使用 internal rate。
- internal `pitchRate` 存在 → `q` 使用 internal rate。
- 若來源缺失 → 保留 final-pose finite-difference fallback。
- planar `r` 仍由 V0.9.9.2 提供。
- Base / Voxel contract 仍 inactive。

### Authority rule

V0.10.2 只改「觀測來源」，不改物理 authority：

- 不改 pitch / roll acceleration equation。
- 不改 pitch / roll damping。
- 不改 `pitchRate / rollRate` 積分。
- 不改 9-Point+ pose authority。
- 不改 Planar 3DOF / steering `Mz`。
- 不改 Base / Voxel / reverse / shoreline / world collision。
- 不改 Safari V0.9.9.3.2 performance baseline。

`src/v0102-internal-pq-rates.js` 只提供版本與 source-status metadata，不包 `updateJetSki`，不參與每幀物理。

## V0.10.1 — Calibration Contract

`src/v0101-calibration-contract.js` 建立 `marine-calibration-v1`。這是 **catalog-first**，不是重新調參，也不是把 proxy 宣稱成真實船舶試驗值。

| 項目 | 目前值 | 狀態 |
|---|---:|---|
| Craft mass | `118 kg` | existing runtime value |
| CG vertical | `-0.18 m` | reduced-order Plus value |
| Yaw inertia `Izz` | `165 kg·m²` | reduced-order proxy |
| Surge added mass | `12%` | proxy |
| Sway added mass | `55%` | proxy |
| Yaw added mass | `38%` | proxy |
| Effective yaw inertia | `227.7 kg·m²` | derived proxy |
| Heave damping | `4.7 s⁻¹` | current Plus tuning |
| Pitch damping ratio | `0.70` | current Plus tuning |
| Roll damping ratio | `0.74` | current Plus tuning |
| Sway nonlinear damping | `0.34` | current planar tuning |
| Yaw linear damping | `0.88` | current planar tuning |
| Yaw nonlinear damping | `0.16` | current planar tuning |
| Steering lever arm | `1.45 m` | existing V0.9.9.3 value |

仍明確 **UNCALIBRATED / null**：

- Roll inertia `Ixx`
- Pitch inertia `Iyy`
- Heave / Roll / Pitch added mass
- CG longitudinal / lateral offsets
- 真正 SI 制 hydrodynamic damping derivatives

這些值在有 CFD / SPH、實測或 system-identification evidence 前不會被猜測填入。

## Unified 6DOF Contract

```text
position:         x / y / z
body velocity:    u / v / w
orientation:      roll / pitch / yaw
angular velocity: p / q / r
acceleration:     uDot / vDot / wDot
angular accel:    pDot / qDot / rDot
force slots:      Fx / Fy / Fz
moment slots:     Mx / My / Mz
```

V0.10.2 後六個速度 state 的正式來源為：

- `u / v / r`：Planar 3DOF。
- `w`：9-Point+ heave state。
- `p`：9-Point+ internal `rollRate`。
- `q`：9-Point+ internal `pitchRate`。

Observer 仍不寫 pose / velocity / load authority。

## Safari Performance Baseline

V0.9.9.3.2 保留：

- Safari desktop pixel ratio cap `1.15x`
- reflective-water render target `256 × 256`
- shadow refresh `30 Hz`
- mirror reflection `30 FPS`
- gameplay / physics full `requestAnimationFrame`
- HUD：FPS / p95 / long-frame count

V0.10.0 Safari acceptance 已 PASS；V0.10.2 不新增每幀計算迴圈。

## 物理切換

- `⚓ 9-Point+` — 預設主線。
- `⚓ Base` — 原 9-Point 可信 A/B baseline。
- `🧊 Voxel EXP` — 24-cell 實驗。
- `P` — 只在 9-Point+ / Base 間 A/B。

## 世界模式

- `🌊 外海`
- `🇹🇼 七星潭→外海`
- `🌺 Waikīkī→外海`
- `🏞️ 日月潭`

## 操作

- `W` / `↑`：加速
- `S` / `↓`：煞車；停住後倒車
- `A D` / `← →`：轉向
- `P`：9-Point+ / Base
- `1 / 2 / 3`：Calm / Normal / Rough

## 測試

```bash
node tests/nine-point-plus.test.js
node tests/v0991-lateral-com.test.js
node tests/v0992-planar-3dof.test.js
node tests/v0993-steering-yaw-moment.test.js
node tests/v09931-safari-performance.test.js
node tests/v09932-safari-gpu-budget.test.js
node tests/v010-unified-6dof-state.test.js
node tests/v0101-calibration-contract.test.js
node tests/v0102-internal-pq-rates.test.js
node tests/real-world-water.test.js
node tests/real-world-coast.test.js
node tests/hawaii-coast.test.js
node tests/reverse-controller.test.js
node tests/marine-physics.test.js
node tests/fast-ocean-sampler.test.js
node tests/v0982-marine-smoothing.test.js
node tests/v0983-water-contact-forces.test.js
```

V0.10.2 regression 鎖定：Plus diagnostics 必須公開 finite `pitchRate / rollRate`、6DOF internal p/q 必須優先於相反的 pose finite-difference、fallback 仍可用、Base 不得被 Plus contract 認領、metadata 不得取得 physics authority。

## Attribution

- Map data: © OpenStreetMap contributors, ODbL。
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach。
- Voxel research reference: QusaiAlbonni `three-sails` (MIT)。

## Next

1. 選擇第一個正式 force/moment authority migration 軸；優先評估 **Yaw**，因為目前已有可追溯 `Mz + Izz proxy + yaw added mass`，可先做 source-of-truth consolidation 而不改手感。
2. 每次 authority migration 都保留 9-Point Base A/B fallback 與 Safari telemetry。
3. Ixx / Iyy、Heave/Roll/Pitch added mass 等缺口留給 CFD/SPH / system-identification calibration，不先猜值。
