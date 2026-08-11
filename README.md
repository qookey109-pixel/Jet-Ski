# Swim Ring Racing — V0.9.9.1

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線：

- **V0.9.3 Irregular Infinite Ocean**：12-band deterministic 巨浪、visual/gameplay sync、floating origin。
- **V0.9.4–0.9.7 Real World Water / Coast**：日月潭、七星潭→外海、Waikīkī→Pacific。
- **V0.9.9 9-Point Plus**：以實機手感較好的 9-point footprint 為主線；Base 保留 A/B；Voxel 降為 EXP。
- **V0.9.9.1 Lateral + COM**：Plus-only 水相對側向力、側滑收斂、低重心 roll torque。
- `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js` validated baseline 不重寫。

## V0.9.9.1 — Lateral Force + Center of Mass

9-Point+ 仍使用原本 9 個 footprint samples 作水面 authority，不增加 cell 數量。

新增：

- 使用既有 spectral-ocean 的 current / Stokes / orbital velocity，估算 craft 右向水速。
- `relative lateral = lateralSlip - waterRight`。
- Plus-only 連續側向水力把 side-slip 漸進拉回；力量有速度依賴與 acceleration cap，不做 lateral impulse。
- Yaw-rate × forward speed 產生 bounded turn lateral acceleration，供重心 torque 使用。
- CG reference 維持約 `-0.18 m`，搭配 virtual metacentric height 約 `0.58 m`。
- COM roll target 以 reduced-order moment 估算並限制在約 ±0.15 rad；加入原 9-point water/dynamic roll target，而不是覆蓋它。
- Base 9-Point 與 Voxel EXP 完全不套用這層。

HUD 在 Plus 模式顯示：`aY`、water-relative `slip`、`CG` roll target。

## 物理切換

- `⚓ 9-Point+` — 預設主線
- `⚓ Base` — 原 9-Point 可信基準
- `🧊 Voxel EXP` — 24-cell 實驗
- `P` — 只在 9-Point+ / Base 間 A/B

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
node tests/real-world-water.test.js
node tests/real-world-coast.test.js
node tests/hawaii-coast.test.js
node tests/reverse-controller.test.js
node tests/marine-physics.test.js
node tests/fast-ocean-sampler.test.js
node tests/v0982-marine-smoothing.test.js
node tests/v0983-water-contact-forces.test.js
```

`v0991-lateral-com.test.js` 鎖定側向力方向、速度依賴、turn acceleration 方向與最大 acceleration cap。

## Attribution

- Map data: © OpenStreetMap contributors, ODbL。
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach。
- Voxel research reference: QusaiAlbonni `three-sails` (MIT)。

## Next

Safari 實機 A/B：Normal / Rough 下比較 9-Point+ 與 Base。V0.9.9.1 目標不是更靈敏，而是高速轉彎時 side-slip 更有水阻、Yaw/roll 有連續質量感，同時維持 Base 的順暢度。通過後再做 longitudinal COM / surge-sway-yaw 統一狀態，逐步往 5DOF/6DOF 推進。
