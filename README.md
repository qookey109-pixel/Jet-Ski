# Swim Ring Racing — V0.6

3D Web 水上競速 Prototype，手機橫向優先、桌面支援。玩家駕駛程序化 3D 游泳圈。

## V0.6 — Realistic Water Physics Foundation

V0.6 把海面從「幾條正弦波」升級為可校準的即時海洋物理基礎，同時保留 V0.5 的游泳圈、跳浪、落水與水花 FX。

- 方向性 JONSWAP-like 波譜：以 `Hs / Tp / mean direction / spread` 描述海況。
- 使用深水色散關係計算每個波浪分量的波數與角頻率。
- 加入表面 orbital velocity、Stokes drift 與海流平移。
- 游泳圈改用 9 點水面取樣，計算 heave / pitch / roll 的低階水動力反應。
- heave、pitch、roll 使用二階彈簧阻尼系統，不再直接貼住單一水面高度。
- 加入速度造成的 planing lift 與非線性橫向水阻。
- 落水加入 slamming 額外速度損失。
- 重力改為 `9.81 m/s²`。
- HUD 顯示 `Hs`（顯著波高）與 `Tp`（峰值週期）。
- 新增 NVIDIA PhysicsNeMo surrogate adapter 介面；目前預設關閉，不會把任何 API key 寫入 Repository。

> V0.6 是 browser-safe reduced-order hydrodynamics，不宣稱等同 CFD。下一階段會用真實海況資料與 SPH / CFD 結果校準參數。

## 操作

- `W` / `↑`：加速
- `S` / `↓`：煞車
- `A D` / `← →`：轉向
- `1`：Calm
- `2`：Normal
- `3`：Rough

## 執行

Safari / macOS 可直接雙擊 `index.html`；需要網路載入 Three.js。若直接開啟失敗，可雙擊 `start.command`。

## 物理檔案

- `src/ocean.js`：方向性波譜、海流、orbital velocity、Stokes drift。
- `src/hydrodynamics.js`：9 點浮體取樣、heave / pitch / roll、planing、drag、slamming。
- `src/physics-surrogate.js`：未來 NVIDIA PhysicsNeMo / ONNX / WebGPU surrogate 接口。
- `src/v06-runtime.js`：在不重寫 V0.5 `main.js` 的前提下，把新海洋 / 水動力模型接進既有遊戲迴圈。
- `src/config.js`：海況與物理調校參數。
- `docs/REALISTIC_WATER_PHYSICS.md`：校準路線與資料介面。
