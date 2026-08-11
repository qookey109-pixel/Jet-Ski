# Swim Ring Racing — V0.9.8.3

3D Web 水上遊戲 Prototype。手機橫向優先、桌面支援；玩家駕駛程序化 3D 游泳圈。

## Current State

目前正式主線由 V0.9.3 海洋核心 + Real World Water / Coastline layers + V0.9.8.x Marine Physics Lab 組成：

- **V0.9.3 Irregular Infinite Ocean**：12 組 deterministic 不規則巨浪、visual/gameplay surface sync、floating origin。
- **V0.9.4.x Real World Water**：日月潭 OSM polygon、shoreline collision、倒車、OSM browser cache。
- **V0.9.6 Taiwan Coast**：花蓮七星潭 OSM coastline → 台灣東岸 → 太平洋無限外海。
- **V0.9.7 Hawaii Coast**：Waikīkī / Oʻahu OSM coastline → 夏威夷南岸 → Pacific Open Sea。
- **V0.9.8 Marine Physics Lab**：9-point 為預設；24-cell Voxel 可即時 A/B。
- **V0.9.8.1 Gravity & Inertia**：Voxel 改為顯式重力、浮力與浸水阻尼。
- **V0.9.8.2 Smooth Contact**：常態 hard snap 改 catastrophic-only；landing/decel smoothing；V0.9.3 exact-height fast sampler。
- **V0.9.8.3 Water Contact Forces**：24 個 cell 記錄逐幀浸水變化，加入 progressive water-entry / slamming load 與連續接觸水阻。
- `src/main.js`、`src/ocean.js`、`src/hydrodynamics.js` baseline 不重寫；9-Point 維持正式 fallback。

## V0.9.8.3 — Water Contact Forces

這版把 Voxel 從「有浮力的物體」再往船體水接觸推一步，但仍保持 browser-safe reduced-order 架構。

### Per-cell water entry

- 20 個外圈 + 4 個內部 cell 各自保存上一幀 immersion。
- 只有 immersion **增加**時才視為入水，不把持續浸水誤判成撞擊。
- 從 9-Point 切到 Voxel 的第一幀只 prime 24-cell contact state，不產生假的 24-cell 同步 slamming。
- 可診斷 front / rear / left / right 的入水不對稱，供之後 pitch/roll impact model 使用。

### Progressive slamming

- `waterEntry` 由各 cell 的正向 immersion rate 加權取得。
- `slamLoad` 綜合 water-entry、速度比例與向下速度。
- slamming 使用 attack/release smoothing，不是單幀 impulse。
- 少量 slamming lift 加入垂直 force integration，仍受 Voxel acceleration clamp 保護。
- HUD 在 Voxel 模式新增 `slam %`。

### Continuous water-contact drag

`src/v0983-water-contact-forces.js` 將 Voxel diagnostics 轉成連續前進水阻：

- wetness 越高，基礎水阻越大。
- 高速時接觸 drag 非線性增加。
- slamming load 會額外增加短暫水阻，但不是直接砍固定百分比速度。
- 最大額外 contact deceleration 約 6.8 m/s²，仍在 V0.9.8.2 passive smoothing 的安全範圍內。
- BRAKE / reverse / shoreline collision authority 不被削弱。
- 9-Point 不套用這一層。

## 船體物理

### 9-Point（預設）

- 原本已驗證的 9 點 footprint 水面取樣。
- spring-damper heave / pitch / roll。
- planing lift、lateral damping、slamming 維持原行為。
- 正式 fallback / baseline。

### Voxel 24-cell（實驗）

- 每 cell 獨立取樣 gameplay water surface。
- 顯式 gravity / displacement buoyancy / immersion-dependent damping。
- per-cell displacement 產生 heave / pitch / roll torque。
- progressive water-entry / slamming load。
- continuous Voxel-only water-contact drag。
- HUD 顯示 active cells、submerged fraction、`aY`、`slam`。

操作：畫面右上 `⚓ 9-Point` / `🧊 Voxel`，鍵盤 `P` 快速切換。

> V0.9.8.x 仍不是 CFD/SPH，也不是完整 6DOF rigid-body replacement。

## 世界模式

- `🌊 外海`：V0.9.3 infinite ocean。
- `🇹🇼 七星潭→外海`：台灣東岸真實 coastline + 太平洋外海。
- `🌺 Waikīkī→外海`：夏威夷真實 coastline + Pacific Open Sea。
- `🏞️ 日月潭`：OSM 湖泊 polygon + 湖岸碰撞。

## 操作

- `W` / `↑`：加速
- `S` / `↓`：煞車；停住後持續按住倒車
- `A D` / `← →`：轉向
- `P`：9-Point / Voxel
- `1 / 2 / 3`：Calm / Normal / Rough
- Mobile：`GAS`、`BRAKE / REV`、左右方向鍵

## Ocean / Physics Stack

- V0.6：directional spectral ocean、9-point hydrodynamics、planing / slamming / current / Stokes drift。
- V0.7：RealSeaState；CWA / NOAA NDBC / Copernicus normalization。
- V0.9.1：reflective water + water normals。
- V0.9.2.3：5–6 swim-ring-height giant-wave visual target。
- V0.9.2.4：visual/gameplay surface sync / anti-penetration。
- V0.9.3：12-band irregular ocean + floating origin。
- V0.9.6：Taiwan coastline → nearshore/open sea。
- V0.9.7：Hawaii coastline → Waikīkī/Pacific open sea。
- V0.9.8：9-point / Voxel selector。
- V0.9.8.1：gravity + inertia。
- V0.9.8.2：smooth contact + fast sampler。
- V0.9.8.3：per-cell water-entry + progressive slamming + continuous contact drag。

## 啟動

可直接開 `index.html`；Safari `file://` classic-script 啟動仍保留。也可用 `start.command`。

純外海不依賴 OSM；七星潭、Waikīkī、日月潭首次載入需網路取得 Overpass，之後可用 browser cache fallback。

## 測試

```bash
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

V0.9.8.3 regression 特別檢查：切入 Voxel 第一幀不得產生假 slamming、穩態水面 slam load 需衰減、突然升水需產生 bounded progressive load、contact drag 隨 wetness / speed / slam 增加且不超過安全上限。

## Attribution

- Map data: © OpenStreetMap contributors, ODbL。
- VirtOcean visual lineage: XORXOR `2050` (MIT) / Three.js Water approach；詳見 `docs/VIRTOCEAN_ATTRIBUTION.md`。
- Voxel-buoyancy architecture reference: QusaiAlbonni `three-sails` (MIT)；詳見 `docs/MARINE_PHYSICS_ATTRIBUTION.md`。
- MohamedQatish `BoatPhysics3D` 僅作教育/行為參考，未複製程式或資產。

## Next

先做 Safari V0.9.8.3 Voxel 實機驗收：Normal / Rough 下確認接觸水面的阻力與拍浪感是連續的、不恢復成撞隱形牆。如果手感穩定，下一步進入 **yaw inertia / water-relative lateral force / center-of-mass**，逐步走向 browser-safe 6DOF marine rigid-body。
