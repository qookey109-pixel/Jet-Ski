# Jet Ski Game — V0.4.1

3D Web 水上競速 Prototype，手機橫向優先、桌面支援。

## V0.4.1 重點

- 玩家載具由水上摩托改成「可駕駛游泳圈」造型，不使用圖片或外部 3D 模型。
- 保留 V0.2 Water Handling 2.0 與 V0.3 Sea Conditions。
- 新增跳浪、離水、騰空、重力、動態水面落水。
- 大落差落水會損失更多速度。
- 空中仍保留少量方向修正，但控制力明顯弱於水面。
- HUD 顯示 WATER / AIR 狀態。

## 操作

- `W` / `↑`：加速
- `S` / `↓`：煞車
- `A D` / `← →`：轉向
- `1`：Calm
- `2`：Normal
- `3`：Rough

高速迎上較陡的浪面時，游泳圈會自動離水跳躍。

## 執行

因為使用 ES Modules，請用本機 HTTP Server 啟動，例如：

```bash
python3 -m http.server 8080
```

再開啟 `http://localhost:8080`。


## Safari / macOS direct launch
V0.4.1 no longer uses local ES modules for startup. You can unzip the folder and double-click `index.html` directly in Safari. An internet connection is still required to load Three.js from jsDelivr.

### 如果直接雙擊仍無法載入
macOS 可雙擊 `start.command`，它會啟動本機伺服器並自動開啟遊戲。
