# AGENTS.md

## Project direction
Swim Ring Racing（Repository: Jet-Ski）是獨立 3D Web 水上競速遊戲，手機橫向優先。

## Current baseline
- Version: V0.5
- 玩家載具為可駕駛的程序化 3D 游泳圈，不使用外部模型。
- V0.2 操控核心與 V0.3 海況系統屬於已驗證基線，不應無故重寫。
- V0.4 jump / airborne / gravity / dynamic-water landing 屬於已驗證基線。
- V0.4.1 classic-script Safari `file://` 啟動修正必須保留。
- V0.5 水花 / 尾浪 / 落水 Splash FX 位於 `src/fx.js`，以固定 particle pools 實作。

## Development rules
- 優先小版本漸進式升級。
- 不要為加入新功能而重做已驗證操控核心。
- 水面視覺與 gameplay sampling 必須共用同一波浪函數。
- 物理與 FX 調校值集中在 `src/config.js`。
- 保持桌面與手機控制同時可用。
- 保持 `index.html` 可用 classic scripts 啟動，不恢復本機 ES-module 依賴。
