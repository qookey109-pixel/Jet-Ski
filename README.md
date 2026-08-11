# Swim Ring Racing — V0.10.0

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線：

- **V0.9.3 Irregular Infinite Ocean**：12-band deterministic 巨浪、visual/gameplay sync、floating origin。
- **V0.9.4–0.9.7 Real World Water / Coast**：日月潭、七星潭→外海、Waikīkī→Pacific。
- **V0.9.9 9-Point Plus**：以實機手感較好的 9-point footprint 為主線；Base 保留 A/B；Voxel 降為 EXP。
- **V0.9.9.1 Lateral + COM**：Plus-only 水相對側向力、側滑收斂、低重心 roll torque。
- **V0.9.9.2 Planar 3DOF**：Surge `u`、Sway `v`、Yaw-rate `r` + added-mass proxy。
- **V0.9.9.3 Steering Force + Yaw Moment**：A/D 轉向由 steering force / stern yaw moment `Mz` 驅動，不再以 direct yaw-angle change 作 Plus 最終操舵。
- **V0.9.9.3.1–.2 Safari Performance**：frame telemetry、Safari desktop reflection throttle、GPU budget；實機回報卡頓有改善。
- **V0.10.0 Unified 6DOF Contract**：observer-first，把現有已驗證的六自由度狀態收斂到同一 browser-safe contract，不改變既有 authority。
- **V0.10.0 Safari Acceptance：PASS**：實機回報正常，未觀察到 observer layer 造成可感知手感 regression；V0.9.9.3.2 的效能改善亦保留。
- `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js` validated baseline 不重寫。

## V0.10.0 — Unified Browser-Safe 6DOF State Contract

這一版先做「狀態整合」，不是重寫 rigid-body solver。

統一 contract：

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

目前來源：

- `u / v / r`：V0.9.9.2 planar 3DOF。
- `w / wDot`：9-Point+ heave state / diagnostics。
- `p / q`：現有 Plus 內部 rate 尚未公開，因此 V0.10.0 observer 由最外層 final pose 做 shortest-angle finite difference；這只是觀測，不會回寫物理。
- `rDot`：planar yaw acceleration。
- `Mz`：V0.9.9.3 steering yaw moment。
- `position`：使用 final local pose + V0.9.3 floating-origin offset，保持長距離航行座標連續。

### Observer-first authority rule

`src/v010-unified-6dof-state.js` 載在 runtime stack 最後：

- 不寫 `ski.position` / `ski.rotation`。
- 不寫 `speed` / `lateralSlip` / `u/v/r`。
- 不產生 steering force。
- 不搶 reverse authority。
- 不搶 shoreline / world collision authority。
- Base / Voxel 不宣稱為 Plus 6DOF state；切離 9-Point+ 時 contract 會標示 inactive。

因此 V0.10.0 是**統一資料契約**，不是新的物理 authority。

### Force / Moment slots

V0.10.0 已建立 `Fx/Fy/Fz/Mx/My/Mz` contract，但在 mass / inertia calibration 正式建立前：

- `Fx / Fy / Fz = null`
- `Mx / My = null`
- `Mz` 使用已存在且可追溯的 V0.9.9.3 steering moment。

不會用未校準的質量／慣量去捏造牛頓或牛頓米數值。

## Safari Performance Baseline

V0.9.9.3.2 保留為 Safari baseline：

- Safari desktop pixel ratio cap：`1.15x`
- reflective-water render target：`256 × 256`
- shadow refresh budget：`30 Hz`
- mirror reflection budget：`30 FPS`
- gameplay / physics 仍維持完整 `requestAnimationFrame` cadence
- HUD 顯示 FPS / p95 frame time / long-frame count

實機回報：相較 V0.9.9.3 原版，卡頓**有改善**；V0.10.0 observer acceptance 後仍正常。後續每一步都沿用 telemetry 監控 regression，不再盲目降低畫質。

## 物理切換

- `⚓ 9-Point+` — 預設主線；V0.10.0 contract active。
- `⚓ Base` — 原 9-Point 可信 A/B baseline；V0.10.0 contract inactive。
- `🧊 Voxel EXP` — 24-cell 實驗；V0.10.0 contract inactive。
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
node tests/real-world-water.test.js
node tests/real-world-coast.test.js
node tests/hawaii-coast.test.js
node tests/reverse-controller.test.js
node tests/marine-physics.test.js
node tests/fast-ocean-sampler.test.js
node tests/v0982-marine-smoothing.test.js
node tests/v0983-water-contact-forces.test.js
```

V0.10.0 regression 鎖定：6DOF field mapping、floating-origin world position、yaw wrap、Base inactive boundary、observer no-authority contract、未校準 force/moment 不得被虛構，以及 20,000-step finite stress。

## Attribution

- Map data: © OpenStreetMap contributors, ODbL。
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach。
- Voxel research reference: QusaiAlbonni `three-sails` (MIT)。

## Next

1. 建立正式 calibration contract：`mass / CG / Ixx-Iyy-Izz / added mass / damping / steering lever arm`。
2. 正式公開或映射 9-Point+ pitch/roll internal rates，讓 `p/q` 從 observer finite-difference 升級成內部 state source。
3. 校準完成後，才逐軸把 `Fx/Fy/Fz/Mx/My/Mz` 從 observer slots 轉成可追溯的 force/moment authority；每次只遷移一個軸並保留 9-Point Base A/B fallback 與 Safari telemetry。
