# Swim Ring Racing — V0.10.3.1

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線：

- **V0.9.3 Irregular Infinite Ocean**：12-band deterministic 巨浪、visual/gameplay sync、floating origin。
- **V0.9.4–0.9.7 Real World Water / Coast**：日月潭、七星潭→外海、Waikīkī→Pacific。
- **V0.9.9 9-Point Plus**：以實機手感較好的 9-point footprint 為主線；Base 保留 A/B；Voxel 降為 EXP。
- **V0.9.9.1 Lateral + COM**：Plus-only 水相對側向力、側滑收斂、低重心 roll torque。
- **V0.9.9.2 Planar 3DOF**：Surge `u`、Sway `v`、Yaw-rate `r`。
- **V0.9.9.3 Steering Force + Yaw Moment**：steering force → stern lever arm → `Mz` → yaw-rate。
- **V0.9.9.3.1–.2 Safari Performance**：frame telemetry + Safari GPU budget；實機回報卡頓有改善。
- **V0.10.0 Unified 6DOF Contract**：observer-first 六自由度 state contract；Safari acceptance PASS。
- **V0.10.1 Calibration Contract**：建立 mass / CG / inertia proxy / added-mass proxy / damping / steering catalog。
- **V0.10.2 Internal Roll/Pitch Rates**：6DOF `p/q` 改用 9-Point+ 內部 `rollRate / pitchRate`。
- **V0.10.3 Yaw Source-of-Truth**：把已驗證的 Yaw baseline 從 Planar / Steering 分散 defaults 收斂到 Calibration Contract；numerical equivalence PASS，但 Safari 實機曾出現卡頓 regression。
- **V0.10.3.1 Safari Yaw Config Cache Hotfix**：migrated Yaw config 改為依 Calibration Contract identity 快取；Safari 實機回報「很正常了」，acceptance PASS。
- `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js` validated baseline 不重寫。

## V0.10.3.1 — Safari Yaw Config Cache Hotfix

V0.10.3 的 Yaw source migration 在 Planar / Steering 兩條每幀 hot path 內重新 resolve calibration config，會建立短命 config 物件。Safari 實機回報因此「變卡了」。

V0.10.3.1 改為：

```text
Calibration Contract identity
        ↓
resolve once
        ↓
cached Planar Yaw config
cached Steering config
        ↓
per-frame direct reuse
```

只有 contract identity 真正改變時才重新解析。

### Hotfix acceptance

- V0.10.3 Safari acceptance：**FAIL — 變卡了**。
- V0.10.3.1 cache regression：stable contract identity 20,000 次查詢，resolver 只執行 1 次。
- contract identity 改變時才新增 1 次 resolution。
- Yaw source-of-truth、Yaw 參數與方程全部保留。
- Safari 實機重新驗收：**PASS —「很正常了」**。

因此目前正式 performance / physics baseline 為 **V0.10.3.1**。

## V0.10.3 — Yaw Source-of-Truth Consolidation

這一版是 **parameter source migration**，不是重新調 Yaw 手感。

V0.10.2 之前，Yaw 參數分散在：

```text
V0992 Planar 3DOF
  Izz
  yaw added-mass ratio
  yaw response
  linear / nonlinear yaw damping
  max yaw acceleration / max yaw-rate

V0993 Steering
  stern lever arm
  hydro steering coefficient
  low-speed jet force
  steering force cap
  Mz cap
  hydro authority range
  landing authority reduction
```

V0.10.3 將上述既有原值固定成 `V0101_CALIBRATION.YAW_BASELINE_V0102`，再由 `marine-calibration-v1` contract 提供給兩個 consumer。

### Canonical accepted Yaw baseline

| 項目 | Source value |
|---|---:|
| Yaw inertia `Izz` | `165 kg·m²` |
| Yaw added mass | `38%` |
| Effective yaw inertia | `227.7 kg·m²` |
| Yaw response | `5.0` |
| Yaw linear damping | `0.88` |
| Yaw nonlinear damping | `0.16` |
| Max yaw acceleration | `3.2 rad/s²` |
| Max yaw-rate | `1.55 rad/s` |
| Stern lever arm | `1.45 m` |
| Hydro steering coefficient | `1.05` |
| Low-speed jet force | `82 N` |
| Max steering force | `360 N` |
| Max `Mz` | `520 N·m` |
| Hydro authority | `1.2 → 12.0 m/s` |
| Landing steering loss | `14% max` |

這些全部都是 V0.10.2 已使用的數字；V0.10.3 / V0.10.3.1 都沒有加入新的 calibration value。

### Numerical equivalence gate

- steering deterministic grid：legacy source 與 calibration source 完全一致。
- Planar 3DOF：20,000-step deterministic stress，同時覆蓋 moment-authority 與 command-yaw fallback。
- 等價 harness：`maxDiff = 0`。
- `max |r| = 1.55 rad/s`。
- effective `Izz = 227.7 kg·m²`。

目前 sandbox 無法直接 clone GitHub，因此這是等價 Node regression，不宣稱完整 repository 原檔 test suite 已在本環境執行。

## V0.10.2 — Internal Roll/Pitch Rates

9-Point+ 正式公開既有：

```text
rollRate  -> 6DOF p
pitchRate -> 6DOF q
```

若 internal rate 缺失，finite-difference fallback 仍保留。沒有改 pitch / roll solver、damping 或 integration。

## Unified 6DOF Contract

目前六個 velocity state：

- `u / v / r`：Planar 3DOF。
- `w`：9-Point+ heave state。
- `p`：9-Point+ internal `rollRate`。
- `q`：9-Point+ internal `pitchRate`。

Force / Moment contract：

```text
Fx / Fy / Fz
Mx / My / Mz
```

目前只有 `Mz` 有既有、可追溯 reduced-order authority；Ixx / Iyy、Heave/Roll/Pitch added mass 等仍不猜值。

## Calibration gaps — still UNCALIBRATED

- Roll inertia `Ixx`
- Pitch inertia `Iyy`
- Heave / Roll / Pitch added mass
- CG longitudinal / lateral offsets
- 真正 SI 制 hydrodynamic damping derivatives

這些要等 CFD / SPH、實測或 system-identification evidence。

## Safari Performance Baseline

目前保留：

- Safari desktop pixel ratio cap `1.15x`
- reflective-water render target `256 × 256`
- shadow refresh `30 Hz`
- mirror reflection `30 FPS`
- gameplay / physics full `requestAnimationFrame`
- HUD：FPS / p95 / long-frame count
- immutable migrated config：identity cache / pre-resolve，避免 per-frame allocation

V0.10.3.1 Safari acceptance 已 PASS。

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
node tests/v0103-yaw-source-of-truth.test.js
node tests/v01031-yaw-config-cache.test.js
node tests/real-world-water.test.js
node tests/real-world-coast.test.js
node tests/hawaii-coast.test.js
node tests/reverse-controller.test.js
node tests/marine-physics.test.js
node tests/fast-ocean-sampler.test.js
node tests/v0982-marine-smoothing.test.js
node tests/v0983-water-contact-forces.test.js
```

## Attribution

- Map data: © OpenStreetMap contributors, ODbL。
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach。
- Voxel research reference: QusaiAlbonni `three-sails` (MIT)。

## Next

1. 下一個單軸 authority migration 繼續採 **numerical-equivalence-first / no-feel-change**。
2. immutable runtime config 必須 cache / pre-resolve，不再放進 per-frame allocation hot path。
3. 每次 migration 都保留 Base A/B fallback 與 Safari FPS / p95 / long-frame telemetry。
4. Ixx / Iyy、Heave/Roll/Pitch added mass 等缺口繼續等 CFD/SPH / system-identification evidence，不先猜值。
