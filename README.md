# Swim Ring Racing — V0.5

3D Web 水上競速 Prototype，手機橫向優先、桌面支援。玩家駕駛的是程序化 3D 游泳圈。

## V0.5 重點

- 保留 V0.2 Water Handling 2.0、V0.3 Sea Conditions、V0.4 jump/airborne/landing 與 V0.4.1 Safari direct-launch 修正。
- 新增高速行駛的雙股白色尾浪。
- 新增後方水花噴濺，速度越快、轉向越大時越明顯。
- Rough 海況會增加水花密度。
- 新增落水 Splash Burst；重落水會產生更大的濺水與泡沫圈。
- FX 使用固定大小 particle pool，避免遊戲進行中持續建立大量物件。
- V0.5 FX 獨立在 `src/fx.js`，不重寫已驗證的 V0.4.1 駕駛核心。

## 操作

- `W` / `↑`：加速
- `S` / `↓`：煞車
- `A D` / `← →`：轉向
- `1`：Calm
- `2`：Normal
- `3`：Rough

高速迎上較陡的浪面時，游泳圈會自動離水跳躍。

## 執行

V0.5 保留 V0.4.1 的 classic-script 啟動方式。在 Safari / macOS 可直接雙擊 `index.html`；仍需要網路載入 Three.js。

若直接雙擊無法載入，可雙擊 `start.command`，或在資料夾執行：

```bash
python3 -m http.server 8080
```

再開啟 `http://localhost:8080`。
