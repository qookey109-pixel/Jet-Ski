# Swim Ring Racing — V0.9.9.2

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線：

- **V0.9.3 Irregular Infinite Ocean**：12-band deterministic 巨浪、visual/gameplay sync、floating origin。
- **V0.9.4–0.9.7 Real World Water / Coast**：日月潭、七星潭→外海、Waikīkī→Pacific。
- **V0.9.9 9-Point Plus**：以實機手感較好的 9-point footprint 為主線；Base 保留 A/B；Voxel 降為 EXP。
- **V0.9.9.1 Lateral + COM**：Plus-only 水相對側向力、側滑收斂、低重心 roll torque。
- **V0.9.9.2 Planar 3DOF**：把 Plus 的前進 / 側移 / 轉向整合成 Surge `u`、Sway `v`、Yaw-rate `r` 狀態。
- `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js` validated baseline 不重寫。

## V0.9.9.2 — Surge + Sway + Yaw

這版不是完整 6DOF rigid-body，而是 browser-safe 的水平面 reduced-order 3DOF state layer。

- 原 GAS / BRAKE / steering / wave interaction 繼續產生控制命令。
- `u` = Surge，實際前進速度狀態；加入約 12% added-mass proxy。
- `v` = Sway，實際側移速度狀態；加入約 55% added-mass proxy、非線性側向 damping、輕量 `u × r` turn coupling。
- `r` = Yaw rate，轉向角速度狀態；加入約 38% rotational added-mass proxy 與非線性 yaw damping。
- 所有 acceleration / yaw-rate 都有限幅，不允許單幀 lateral/yaw impulse。
- BRAKE 使用更高的 surge response / deceleration cap，避免 added-mass 讓船煞不住。
- 騰空與倒車仍交給原本 controller；3DOF 會同步狀態後退讓，不搶 authority。
- 3DOF runtime 位於 shoreline/world collision 之前，因此海岸碰撞仍可在最外層覆蓋速度與位置。
- Plus COM roll layer會讀取整合後的 `r`，讓 roll torque 與實際船體 yaw-rate 對齊。

HUD 在 9-Point+ 顯示：`u` / `v` / `r`。

## 物理切換

- `⚓ 9-Point+` — 預設主線，包含 V0.9.9.2 planar 3DOF。
- `⚓ Base` — 原 9-Point 可信基準。
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
node tests/real-world-water.test.js
node tests/real-world-coast.test.js
node tests/hawaii-coast.test.js
node tests/reverse-controller.test.js
node tests/marine-physics.test.js
node tests/fast-ocean-sampler.test.js
node tests/v0982-marine-smoothing.test.js
node tests/v0983-water-contact-forces.test.js
```

`v0992-planar-3dof.test.js` 鎖定：Surge 漸進追速、BRAKE authority、Sway/yaw coupling 方向、Yaw acceleration cap、Sway decay，以及 20,000-step finite/stability stress。

## Attribution

- Map data: © OpenStreetMap contributors, ODbL。
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach。
- Voxel research reference: QusaiAlbonni `three-sails` (MIT)。

## Next

先做 Safari **9-Point+ vs Base** A/B，Normal / Rough 觀察 `u/v/r` 是否有質量感但不拖泥帶水。若 V0.9.9.2 通過，下一層把 steering input 改成 **water-authority / yaw moment command**，不再把直接 yaw-angle change 當成最終操舵；之後再擴成 Heave/Pitch/Roll + planar 3DOF 的 browser-safe 6DOF 架構。
