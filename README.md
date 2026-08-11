# Swim Ring Racing — V0.9.9.3

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線：

- **V0.9.3 Irregular Infinite Ocean**：12-band deterministic 巨浪、visual/gameplay sync、floating origin。
- **V0.9.4–0.9.7 Real World Water / Coast**：日月潭、七星潭→外海、Waikīkī→Pacific。
- **V0.9.9 9-Point Plus**：以實機手感較好的 9-point footprint 為主線；Base 保留 A/B；Voxel 降為 EXP。
- **V0.9.9.1 Lateral + COM**：Plus-only 水相對側向力、側滑收斂、低重心 roll torque。
- **V0.9.9.2 Planar 3DOF**：Surge `u`、Sway `v`、Yaw-rate `r` + added-mass proxy。
- **V0.9.9.3 Steering Force + Yaw Moment**：A/D 轉向由水中 steering force / stern yaw moment 驅動，不再以直接 yaw-angle change 作 Plus 最終操舵。
- `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js` validated baseline 不重寫。

## V0.9.9.3 — Steering Force + Yaw Moment

這版把 9-Point+ 的水平面轉向再往真正船體動力學推一步。

### Steering load

- A/D / 左右鍵仍是玩家控制輸入，但只形成 steering demand。
- 依 craft 相對水的前進速度計算速度相關 steering force。
- 低速有小量 jet steering authority，避免有油門卻完全無法轉向。
- 高速 hydrodynamic steering force 隨相對水速增加，但有 force cap，不允許單幀暴衝。
- steering force 作用在船尾約 `1.45 m` lever arm，轉成 bounded yaw moment `Mz`。
- hard landing 後短時間降低部分 steering authority，沿用既有 landing inertia 概念。

### Moment-driven yaw

V0.9.9.2 的 `r` 現在新增 moment-authority 分支：

- effective yaw inertia 使用基礎 `Izz` proxy + 38% rotational added mass。
- `Mz / Izz` 產生 yaw angular acceleration。
- 加入 linear + nonlinear yaw damping。
- `r` 經積分後才更新 Plus 的 yaw。
- moment authority 開啟時，即使舊 `commandYawRate` 指向相反方向，也不能蓋過 `Mz`；regression 有鎖定此行為。
- 原本 cross-wave 等非玩家 yaw disturbance 保留，不會為了新操舵把海浪擾動清掉。

### Authority boundaries

- **9-Point Base 完全不套用 V0.9.9.3**。
- **Voxel EXP 完全不套用 V0.9.9.3**。
- 倒車仍交給原 reverse controller。
- 騰空時 steering-moment layer 退讓。
- shoreline / world collision wrappers 仍在更外層，保持最終位置與碰撞 authority。

HUD 在 9-Point+ 顯示：`u / v / r / Mz`。

## 物理切換

- `⚓ 9-Point+` — 預設主線，包含 V0.9.9.3 moment-driven yaw。
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
node tests/v0993-steering-yaw-moment.test.js
node tests/real-world-water.test.js
node tests/real-world-coast.test.js
node tests/hawaii-coast.test.js
node tests/reverse-controller.test.js
node tests/marine-physics.test.js
node tests/fast-ocean-sampler.test.js
node tests/v0982-marine-smoothing.test.js
node tests/v0983-water-contact-forces.test.js
```

V0.9.9.3 regression 鎖定：steering force / yaw moment 正負方向、低速 jet authority、高速 water authority、force/moment caps、landing authority，以及 3DOF moment branch 不得被相反 `commandYawRate` 蓋過。另保留 20,000-step finite/stability stress。

## Attribution

- Map data: © OpenStreetMap contributors, ODbL。
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach。
- Voxel research reference: QusaiAlbonni `three-sails` (MIT)。

## Next

Safari 做 **9-Point+ vs Base** A/B，Normal / Rough 觀察轉向是否變成「施力後船身建立 yaw-rate」而不是直接折方向，同時 BRAKE / reverse / shoreline 不可退步。若通過，下一層把 Heave / Pitch / Roll + Surge / Sway / Yaw 收斂成單一 browser-safe 6DOF state contract，再做 frame-time telemetry 與參數校準。
