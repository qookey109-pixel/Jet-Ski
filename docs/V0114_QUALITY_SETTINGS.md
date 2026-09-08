# V0.11.4 — Graphics Settings + Dynamic Quality

Status: engineering candidate. Browser/Safari acceptance pending.

## Purpose

Keep the V0.11 race experience playable across modern Mac/PC browsers without lowering gameplay/physics cadence.

## Presets

- Low: 0.90x cap, reflection 192, shadows off
- Medium: 1.00x cap, reflection 256, shadows on
- High: 1.50x cap, reflection 384, shadows on
- Ultra: 2.00x cap, reflection 512, shadows on
- Auto: starts at a platform-appropriate level and adapts from existing FPS/p95/long-frame telemetry

Resolution Scale multiplies the preset pixel-ratio cap from 60% to 100%.

## Safari hard guard

The accepted Safari GPU baseline remains authoritative:

- effective pixel ratio never exceeds 1.15x
- reflective-water target never exceeds 256
- existing shadow refresh throttling remains untouched
- gameplay/physics still runs at full requestAnimationFrame cadence

Selecting High or Ultra on Safari cannot bypass these hard safety caps.

## Auto-quality policy

Auto only changes one level after sustained evidence:

- downgrade: roughly 5 continuous seconds of low FPS / high p95 / many long frames
- upgrade: roughly 12 continuous seconds of stable 58+ FPS / low p95 / few long frames

This hysteresis is intentional to avoid quality oscillation.

## Settings UI

The Start and Pause menus receive a Settings button.

Implemented controls:

- Auto / Low / Medium / High / Ultra
- Resolution Scale
- Shadows
- UI Motion

UI Motion currently controls menu/countdown/toast CSS motion. It does not claim to disable every 3D particle/VFX system yet.

## Authority boundary

This layer changes renderer budgets only. It does not modify:

- Ocean sampler
- 9-Point+
- Planar Surge/Sway/Yaw
- Steering
- reverse
- shoreline collision
- race logic
- AI logic
- Boost energy/acceleration

## Acceptance

CI must pass V0.11.0–V0.11.4 regressions and production build.

Browser acceptance should verify:

1. all preset buttons apply visibly;
2. resolution scale is bounded and persisted;
3. shadows toggle correctly;
4. Auto can downgrade under sustained load without touching physics cadence;
5. Safari never exceeds 1.15x / reflection 256;
6. Settings opens from Start and Pause menus;
7. UI Motion toggle actually removes UI transitions;
8. no resize or menu transition breaks renderer dimensions;
9. FPS/p95/long-frame behavior improves or remains stable.
