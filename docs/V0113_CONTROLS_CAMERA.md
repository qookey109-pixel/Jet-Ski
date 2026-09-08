# V0.11.3 — Controls + Dynamic Camera Polish

Status: engineering candidate. Browser/Safari acceptance pending.

## Goal

Close the major control/readability gaps in the V0.11 race slice without touching hydrodynamic authority.

## Inputs

Desktop:
- WASD / arrows: existing movement
- Space: Boost
- Mouse/touch drag on the game canvas: orbit camera
- Mouse wheel: camera distance
- ESC: pause

Gamepad:
- Left stick: steering + forward/brake intent
- RT / LT: gas / brake
- Right stick: camera orbit
- A / button 0: Boost (owned by V0.11.2)
- Start / button 9: pause/resume

## Camera behavior

V0.11.3 replaces only the old camera follow function. It keeps the same player pose and physics state.

Features:
- damped orbit yaw/pitch
- automatic recenter after 1.8 seconds without camera input
- speed-dependent follow distance
- wheel zoom offset
- water-surface clipping guard using the live `getWaveHeight()` sampler
- no camera shake authority added

## Physics boundary

This layer does not write:
- Surge / Sway / Yaw equations
- Planar `u/v/r`
- 9-Point+ heave/roll/pitch
- Ocean or shoreline collision
- disaster event height

Gamepad input is adapted into the existing `input` booleans only for the duration of the current player update, then the original keyboard/touch state is restored.

## Acceptance

CI must pass the complete V0.11 regression chain and production build.

Browser/Safari acceptance should verify:
1. keyboard/touch controls remain unchanged;
2. left stick can steer and accelerate/brake;
3. right stick or mouse drag rotates the camera predictably;
4. camera recenters smoothly after release;
5. wheel zoom stays bounded;
6. camera does not clip below large wave surfaces;
7. Boost still works with keyboard/mobile/gamepad;
8. Start/ESC pause and resume remain correct;
9. no new FPS/p95/long-frame regression.

Until that hands-on check is complete, V0.11.3 is not a new accepted performance baseline.
