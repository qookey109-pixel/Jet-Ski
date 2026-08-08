# Changelog

## V0.4.1
- Fixed blank 3D scene when opening `index.html` directly with `file://` in Safari.
- Replaced ES-module startup with classic browser scripts.
- Preserved V0.4 swim-ring craft, sea states, handling and airborne/landing physics.
- Replaced rider CapsuleGeometry with basic primitives for broader Three.js compatibility.
- Corrected HUD version fallback to V0.4.1.

## V0.4
- 將玩家載具由傳統水上摩托改為程序化 3D 充氣游泳圈。
- 新增中央座椅、抓把、後置噴射單元，維持「游泳圈」辨識度與可駕駛性。
- 新增 wave launch：高速迎上陡浪可離水。
- 新增 airborne 狀態、垂直速度與重力。
- 落水以即時波面高度判定，不使用固定海平面。
- 新增普通 / 重落水速度損失。
- 空中轉向權限降低，避免空中像在水面一樣操控。
- HUD 新增 WATER / AIR 狀態。

## V0.3
- Calm / Normal / Rough 三種海況。
- 多層波浪與海況對水阻、方向、側滑的影響。

## V0.2
- Water Handling 2.0。
- 加速曲線、水阻、側滑、抓水、Pitch / Roll。
