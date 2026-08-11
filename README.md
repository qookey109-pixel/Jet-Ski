# Swim Ring Racing — V0.9.9

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線：

- **V0.9.3 Irregular Infinite Ocean**：12-band deterministic 巨浪、visual/gameplay sync、floating origin。
- **V0.9.4–0.9.7 Real World Water / Coast**：日月潭、七星潭→外海、Waikīkī→Pacific。
- **V0.9.9 9-Point Plus**：回到實機手感較好的 9-point footprint，保留 Base 供 A/B；Voxel 降為 EXP。
- `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js` 的 validated baseline 不重寫。

## V0.9.9 — 9-Point Plus

V0.9.8.x 的 24-cell Voxel 已證明可行，但 Safari 實機手感不如 9-Point。V0.9.9 因此不再把 cell 數量往上堆，而是把有價值的慣性概念搬回 9 點架構。

### 9-Point+（新主線 / 預設）

- **水面 authority 仍是原本 9 個 footprint samples**，不改成 24-cell。
- 原 baseline 仍負責 9 點平均水面、front/rear、left/right slope、planing lift。
- 垂直方向改為顯式 **gravity → buoyancy proxy → immersion-dependent damping → velocity integration**。
- 平衡點仍鎖在原 9-Point 的 `targetY`；水面突然下降時可以真的往下墜，而不是完全貼著 target。
- Pitch / Roll 仍追原 9-Point wave target，但保留較明顯 angular inertia。
- 加入低重心參數化穩定性（目前 CG reference 約 -0.18 m）；不是完整 6DOF CG solver。
- 新增 **Yaw inertia**：保留原 steering 計算，只把每幀 yaw change 經 rate smoothing，避免方向瞬間折角。
- 落水時建立約 0.12 s 的 landing inertia reservoir；目前只稍微降低短時間 yaw authority，**不額外砍速度**。
- Plus 正常吃水允許約 0.18 m；舊 anti-penetration 核心不修改，Plus 外層只恢復自己的 heave solution，超出安全區才救回。

### 9-Point Base（可信基準）

- 原 V0.6 9-point spring-damper hydrodynamics。
- 完全保留原手感，用來和 Plus 即時 A/B。
- `P` 只在 `9-Point+ ↔ Base` 間切換。

### Voxel EXP

- 24-cell gravity / buoyancy / slamming / contact drag 全部保留做實驗。
- 不再是主線，也不會被 `P` 誤切進去；必須按 `🧊 Voxel EXP`。

## 物理切換

右上角：

- `⚓ 9-Point+` — 預設主線
- `⚓ Base` — 原 9-Point
- `🧊 Voxel EXP` — 24-cell 實驗

鍵盤 `P`：只做 **9-Point+ / Base** A/B。

HUD 在 Plus 顯示 `aY` 與 `yaw rate`；Voxel 仍顯示 submerged / aY / slam。

## 世界模式

- `🌊 外海`：V0.9.3 infinite ocean。
- `🇹🇼 七星潭→外海`：台灣東岸真實 coastline + 太平洋外海。
- `🌺 Waikīkī→外海`：夏威夷真實 coastline + Pacific Open Sea。
- `🏞️ 日月潭`：OSM 湖泊 polygon + 湖岸碰撞。

## 操作

- `W` / `↑`：加速
- `S` / `↓`：煞車；停住後持續按住倒車
- `A D` / `← →`：轉向
- `P`：9-Point+ / Base A/B
- `1 / 2 / 3`：Calm / Normal / Rough
- Mobile：`GAS`、`BRAKE / REV`、左右方向鍵

## Physics Stack

- V0.6：directional spectral ocean + validated 9-point hydrodynamics。
- V0.7：RealSeaState / CWA / NOAA / Copernicus normalization。
- V0.9.1–0.9.3：reflective irregular infinite ocean + giant-wave sync。
- V0.9.6–0.9.7：Taiwan / Hawaii real coastline → open sea。
- V0.9.8.x：Voxel research branch（gravity / contact / slamming / fast sampler）。
- **V0.9.9：9-Point Plus mainline — explicit heave gravity/inertia + angular inertia + yaw inertia + Base A/B。**

## 啟動

可直接開 `index.html`；Safari `file://` classic-script 啟動仍保留。也可用 `start.command`。

純外海不依賴 OSM；七星潭、Waikīkī、日月潭首次載入需網路取得 Overpass，成功後可用 browser cache fallback。

## 測試

```bash
node tests/nine-point-plus.test.js
node tests/real-world-water.test.js
node tests/real-world-coast.test.js
node tests/hawaii-coast.test.js
node tests/reverse-controller.test.js
node tests/marine-physics.test.js
node tests/fast-ocean-sampler.test.js
node tests/v0982-marine-smoothing.test.js
node tests/v0983-water-contact-forces.test.js
node tests/ocean-disturbance.test.js
```

`nine-point-plus.test.js` 鎖定：flat-water equilibrium、下墜重力、上升浮力、Pitch/Roll bounded response、Yaw-rate helper、landing load mapping，以及 selector 預設 Plus / `P` 不會切進 Voxel。

## Attribution

- Map data: © OpenStreetMap contributors, ODbL。
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach；詳見 `docs/VIRTOCEAN_ATTRIBUTION.md`。
- Voxel-buoyancy research reference: QusaiAlbonni `three-sails` (MIT)；詳見 `docs/MARINE_PHYSICS_ATTRIBUTION.md`。
- MohamedQatish `BoatPhysics3D` 僅作教育/行為參考，未複製程式或資產。

## Next

先做 Safari **9-Point+ vs Base** 實機 A/B，Normal / Rough 各測。只有 Plus 至少維持 Base 的順暢度、同時增加重量與轉向慣性，才繼續往 **water-relative lateral force / true COM torque / 5DOF→6DOF** 推進；Voxel 不再阻塞主線。
