# AGENTS.md

## Project direction
Jet Ski Game 是獨立 3D Web 水上競速遊戲，手機橫向優先。

## Current baseline
- Version: V0.4
- 玩家載具已正式改為可駕駛的程序化 3D 游泳圈。
- V0.2 操控核心與 V0.3 海況系統屬於已驗證基線，不應無故重寫。
- V0.4 已加入 jump / airborne / gravity / dynamic-water landing。

## Development rules
- 優先小版本漸進式升級。
- 不要為加入新功能而重做已驗證操控核心。
- 水面視覺與 gameplay sampling 必須共用同一波浪函數。
- 物理調校值集中在 `src/config.js`。
- 保持桌面與手機控制同時可用。
